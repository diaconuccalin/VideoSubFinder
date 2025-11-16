/**
 * Step 3: Search Subtitles
 *
 * Implements the FastSearchSubtitles algorithm from C++ codebase
 * (SSAlgorithms.cpp lines 1128-2013) to detect and extract subtitle frames.
 *
 * Searches video frame-by-frame for subtitle text regions using:
 * - Sobel edge detection
 * - Frame sequence intersection (ISA images)
 * - Connected component analysis for text detection
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  searchSubtitles,
  SearchParams,
  SearchProgress,
  DEFAULT_SEARCH_PARAMS,
} from '../../algorithms/searchSubtitles';
import {
  searchSubtitlesWebCodecs,
  isWebCodecsSupported,
} from '../../algorithms/searchSubtitlesWebCodecs';
import { SubtitleFrame } from '../../types/subtitle.types';

export function Step3_SearchSubtitles() {
  const { state, dispatch, completeStep, goToStep } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState('00:00:00');
  const [endTimeInput, setEndTimeInput] = useState('00:00:00');
  const [isStartTimeValid, setIsStartTimeValid] = useState(true);
  const [isEndTimeValid, setIsEndTimeValid] = useState(true);
  const [results, setResults] = useState<SubtitleFrame[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPausedByTabSwitch, setIsPausedByTabSwitch] = useState(false);
  const [lastPausedPosition, setLastPausedPosition] = useState<number | null>(null);
  const useWebCodecs = isWebCodecsSupported();
  const shouldStopRef = useRef(false);
  const wasPausedRef = useRef(false);
  const lastProgressTimeRef = useRef<number>(0);
  const existingResultsCountRef = useRef<number>(0);

  // Get detected region from state (Step 2 result)
  const detectedRegion = state.detectedRegion || state.adjustedRegion;

  // Initialize time range from video metadata
  useEffect(() => {
    if (state.videoMetadata && endTime === 0) {
      setStartTime(0);
      setEndTime(state.videoMetadata.duration);
      setStartTimeInput('00:00:00');
      setEndTimeInput(formatTime(state.videoMetadata.duration));
    }
  }, [state.videoMetadata]);

  // Restore search results from state
  useEffect(() => {
    if (state.subtitleFrames.length > 0 && results.length === 0) {
      setResults(state.subtitleFrames);
    }
  }, [state.subtitleFrames]);

  // Page Visibility API: Pause search when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden
        if (isSearching && !wasPausedRef.current) {
          console.log('Tab hidden - pausing subtitle search');
          // Save the current position before pausing
          setLastPausedPosition(lastProgressTimeRef.current);
          setIsPausedByTabSwitch(true);
          shouldStopRef.current = true;
          wasPausedRef.current = true;
        }
      } else {
        // Tab is now visible
        if (wasPausedRef.current) {
          console.log('Tab visible again - search was paused. User can continue from last position.');
          // Keep isPausedByTabSwitch true to show the alert
          // It will be cleared when user clicks "Continue Search"
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSearching]);

  // Handle search button click
  const handleRunSearch = async () => {
    if (!state.videoUrl || !detectedRegion) {
      return;
    }

    // Determine if we're resuming from a paused position
    const isResuming = isPausedByTabSwitch && lastPausedPosition !== null;
    const effectiveStartTime = isResuming ? lastPausedPosition : startTime;

    // Save existing results count for progress display and merging
    const existingResults = isResuming ? [...results] : [];
    existingResultsCountRef.current = existingResults.length;

    console.log(
      isResuming
        ? `Resuming search from ${effectiveStartTime.toFixed(2)}s (${existingResults.length} existing results)`
        : `Starting new search from ${effectiveStartTime.toFixed(2)}s`
    );

    setIsSearching(true);
    shouldStopRef.current = false;
    setIsPausedByTabSwitch(false);
    wasPausedRef.current = false;

    // Keep existing results if resuming, otherwise clear them
    if (!isResuming) {
      setResults([]);
      existingResultsCountRef.current = 0;
    }
    setProgress(null);
    lastProgressTimeRef.current = effectiveStartTime;

    try {
      let subtitleFrames: SubtitleFrame[];

      // Determine which approach to use based on time range
      const videoDuration = videoRef.current?.duration || 0;
      const searchDuration = endTime - effectiveStartTime;
      const searchPercentage = videoDuration > 0 ? (searchDuration / videoDuration) * 100 : 100;

      // Use WebCodecs only for large time ranges (> 30% of video)
      // For smaller ranges, seeking is actually faster since we don't need to process the entire file
      const shouldUseWebCodecs =
        useWebCodecs &&
        state.videoFile &&
        isWebCodecsSupported() &&
        searchPercentage > 30;

      if (shouldUseWebCodecs && state.videoFile) {
        console.log(
          `Using WebCodecs API for fast frame decoding (${searchPercentage.toFixed(1)}% of video)`
        );
        subtitleFrames = await searchSubtitlesWebCodecs(
          state.videoFile,
          detectedRegion,
          effectiveStartTime,
          endTime,
          searchParams,
          (progressData) => {
            lastProgressTimeRef.current = progressData.currentTime;
            // Adjust progress to show time relative to original search, not resume point
            // Add existing results count when resuming
            setProgress({
              ...progressData,
              totalTime: endTime - startTime, // Total from original start
              percentage: ((progressData.currentTime - startTime) / (endTime - startTime)) * 100,
              subtitlesFound: progressData.subtitlesFound + existingResultsCountRef.current,
            });
          },
          () => shouldStopRef.current
        );
      } else {
        // Use seeking-based approach for small/medium ranges
        console.log(
          `Using video seeking for frame extraction (${searchPercentage.toFixed(1)}% of video)`
        );
        if (!videoRef.current) {
          throw new Error('Video element not available');
        }
        subtitleFrames = await searchSubtitles(
          videoRef.current,
          detectedRegion,
          effectiveStartTime,
          endTime,
          searchParams,
          (progressData) => {
            lastProgressTimeRef.current = progressData.currentTime;
            // Adjust progress to show time relative to original search, not resume point
            // Add existing results count when resuming
            setProgress({
              ...progressData,
              totalTime: endTime - startTime, // Total from original start
              percentage: ((progressData.currentTime - startTime) / (endTime - startTime)) * 100,
              subtitlesFound: progressData.subtitlesFound + existingResultsCountRef.current,
            });
          },
          () => shouldStopRef.current
        );
      }

      // Merge with existing results if resuming (use saved existingResults, not state)
      const finalResults = isResuming ? [...existingResults, ...subtitleFrames] : subtitleFrames;
      setResults(finalResults);

      // Save to global state
      dispatch({ type: 'SET_SUBTITLE_FRAMES', payload: finalResults });
      dispatch({ type: 'UPDATE_SEARCH_PROGRESS', payload: 100 });

      // Mark step as complete if we found subtitles
      if (finalResults.length > 0) {
        completeStep('search-subtitles');
      }

      // Clear the paused position on successful completion
      setLastPausedPosition(null);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`An error occurred during subtitle search:\n\n${errorMessage}\n\nCheck the console for more details.`);
    } finally {
      setIsSearching(false);
      shouldStopRef.current = false;
    }
  };

  // Handle stop
  const handleStop = () => {
    shouldStopRef.current = true;
    setIsSearching(false);
  };

  // Handle reset
  const handleReset = () => {
    setResults([]);
    setProgress(null);
    setIsPausedByTabSwitch(false);
    setLastPausedPosition(null);
    wasPausedRef.current = false;
    lastProgressTimeRef.current = 0;
    dispatch({ type: 'SET_SUBTITLE_FRAMES', payload: [] });
    dispatch({ type: 'UPDATE_SEARCH_PROGRESS', payload: 0 });
  };

  // Handle continue to next step
  const handleContinue = () => {
    completeStep('search-subtitles');
    goToStep('clear-images');
  };

  // Parse time from HH:MM:SS format to seconds
  const parseTime = (timeStr: string): number | null => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;

    return hours * 3600 + minutes * 60 + seconds;
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format time with milliseconds as HH:MM:SS.mmm
  const formatTimeWithMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Handle start time input change
  const handleStartTimeChange = (value: string) => {
    setStartTimeInput(value);
    const parsed = parseTime(value);
    if (parsed !== null) {
      const clampedTime = Math.max(0, Math.min(parsed, endTime));
      setStartTime(clampedTime);
      setIsStartTimeValid(true);

      // Clear paused state if user manually changes search parameters
      if (isPausedByTabSwitch) {
        setIsPausedByTabSwitch(false);
        setLastPausedPosition(null);
        wasPausedRef.current = false;
      }
    } else {
      setIsStartTimeValid(false);
    }
  };

  // Handle end time input change
  const handleEndTimeChange = (value: string) => {
    setEndTimeInput(value);
    const parsed = parseTime(value);
    if (parsed !== null) {
      const maxDuration = state.videoMetadata?.duration || 0;
      const clampedTime = Math.max(startTime, Math.min(parsed, maxDuration));
      setEndTime(clampedTime);
      setIsEndTimeValid(true);

      // Clear paused state if user manually changes search parameters
      if (isPausedByTabSwitch) {
        setIsPausedByTabSwitch(false);
        setLastPausedPosition(null);
        wasPausedRef.current = false;
      }
    } else {
      setIsEndTimeValid(false);
    }
  };

  // Format duration as readable string
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper to update search params and clear paused state
  const updateSearchParams = (newParams: SearchParams) => {
    setSearchParams(newParams);
    // Clear paused state when advanced parameters change
    if (isPausedByTabSwitch) {
      setIsPausedByTabSwitch(false);
      setLastPausedPosition(null);
      wasPausedRef.current = false;
    }
  };

  if (!state.videoUrl) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">No video loaded. Please select a video first.</p>
          <button
            onClick={() => goToStep('video-select')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Video Selection
          </button>
        </div>
      </div>
    );
  }

  if (!detectedRegion) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">No subtitle region detected. Please detect bounds first.</p>
          <button
            onClick={() => goToStep('auto-detect')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Detect Bounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Search Subtitles</h2>
          <p className="text-gray-600">
            Automatically search and extract subtitle frames from the video within the detected bounds.
          </p>
        </div>

        {/* Tab Visibility Warning */}
        {isSearching && (
          <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-yellow-800">
                  ⚠️ Keep this tab active during subtitle search
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Switching to another tab or window may pause or slow down the search process. For best results, please keep this tab in focus until the search completes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Paused by Tab Switch Alert */}
        {isPausedByTabSwitch && (
          <div className="mb-4 bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-orange-800">
                  🔔 Search paused - tab was switched
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  The subtitle search was automatically paused because you switched to another tab.
                  {lastPausedPosition !== null && (
                    <> Paused at {formatTime(lastPausedPosition)}.</>
                  )}
                  {' '}Click "Continue Search" to resume from where it left off.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={state.videoUrl}
        className="hidden"
        crossOrigin="anonymous"
      />

      {/* Search Controls */}
      {!isSearching && (results.length === 0 || isPausedByTabSwitch) && (
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Configuration</h3>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={startTimeInput}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  placeholder="00:00:00"
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono ${
                    isStartTimeValid
                      ? 'border-gray-300 focus:ring-blue-500'
                      : 'border-red-500 focus:ring-red-500'
                  }`}
                />
                <span className={`text-xs ${isStartTimeValid ? 'text-gray-500' : 'text-red-500'}`}>
                  {isStartTimeValid ? `${startTime.toFixed(2)}s` : 'Invalid format (use HH:MM:SS)'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={endTimeInput}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  placeholder="00:00:00"
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent font-mono ${
                    isEndTimeValid
                      ? 'border-gray-300 focus:ring-blue-500'
                      : 'border-red-500 focus:ring-red-500'
                  }`}
                />
                <span className={`text-xs ${isEndTimeValid ? 'text-gray-500' : 'text-red-500'}`}>
                  {isEndTimeValid ? `${endTime.toFixed(2)}s` : 'Invalid format (use HH:MM:SS)'}
                </span>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </button>

            {/* Advanced Settings Panel */}
            {showAdvanced && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frame Sequence Length
                    </label>
                    <input
                      type="number"
                      value={searchParams.frameSequenceLength}
                      onChange={(e) =>
                        updateSearchParams({
                          ...searchParams,
                          frameSequenceLength: Math.max(2, parseInt(e.target.value) || 3),
                        })
                      }
                      min="2"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-xs text-gray-500">Frames to intersect (2-10)</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text % Threshold
                    </label>
                    <input
                      type="number"
                      value={searchParams.textPercentageThreshold}
                      onChange={(e) =>
                        updateSearchParams({
                          ...searchParams,
                          textPercentageThreshold: Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.25)),
                        })
                      }
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-xs text-gray-500">Detection sensitivity (0.0-1.0)</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Text Width
                    </label>
                    <input
                      type="number"
                      value={searchParams.minTextWidth}
                      onChange={(e) =>
                        updateSearchParams({
                          ...searchParams,
                          minTextWidth: Math.max(10, parseInt(e.target.value) || 40),
                        })
                      }
                      min="10"
                      max="200"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-xs text-gray-500">Pixels</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Text Height
                    </label>
                    <input
                      type="number"
                      value={searchParams.minTextHeight}
                      onChange={(e) =>
                        updateSearchParams({
                          ...searchParams,
                          minTextHeight: Math.max(4, parseInt(e.target.value) || 8),
                        })
                      }
                      min="4"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="text-xs text-gray-500">Pixels</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchParams.useILAImages}
                      onChange={(e) =>
                        updateSearchParams({ ...searchParams, useILAImages: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Use ILA Images</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchParams.useEdgeDetection}
                      onChange={(e) =>
                        updateSearchParams({ ...searchParams, useEdgeDetection: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Use Edge Detection</span>
                  </label>
                </div>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleRunSearch}
              disabled={isSearching || !isStartTimeValid || !isEndTimeValid}
              className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {isPausedByTabSwitch ? '▶️ Continue Search' : '🔍 Run Search'}
            </button>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {isSearching && progress && (
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Progress</h3>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
              <div
                className="bg-green-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              >
                {progress.percentage.toFixed(1)}%
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">{formatTime(progress.currentTime)}</div>
                <div className="text-sm text-gray-600">Current Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{progress.subtitlesFound}</div>
                <div className="text-sm text-gray-600">Subtitles Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{formatDuration(progress.elapsedTime)}</div>
                <div className="text-sm text-gray-600">Elapsed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatDuration(progress.estimatedTimeRemaining)}
                </div>
                <div className="text-sm text-gray-600">ETA</div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleStop}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                ⏹ Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {!isSearching && results.length > 0 && !isPausedByTabSwitch && (
        <div className="mb-6 flex-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Search Complete!</h3>
              <div className="text-green-600 font-semibold">✓ Found {results.length} subtitle frames</div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
              <p className="text-sm text-green-800">
                <strong>Success!</strong> Detected {results.length} subtitle frames from{' '}
                {formatTimeWithMs(results[0]?.startTime || 0)} to{' '}
                {formatTimeWithMs(results[results.length - 1]?.endTime || 0)}.
              </p>
            </div>

            {/* Preview Grid */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">Preview (first 12 results):</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.slice(0, 12).map((frame) => (
                  <div
                    key={frame.id}
                    className="border border-gray-300 rounded-lg p-2 hover:shadow-lg transition-shadow"
                  >
                    <canvas
                      ref={(canvas) => {
                        if (canvas && frame.imageData) {
                          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                          canvas.width = frame.imageData.width;
                          canvas.height = frame.imageData.height;
                          ctx.putImageData(frame.imageData, 0, 0);
                        }
                      }}
                      className="w-full h-auto border border-gray-200 rounded"
                    />
                    <div className="text-xs text-gray-700 mt-2 text-center">
                      <div className="font-medium">{formatTimeWithMs(frame.startTime)} - {formatTimeWithMs(frame.endTime)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReset}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                🔄 Reset Search
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Continue to Clear Images →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!isSearching && results.length === 0 && progress && progress.percentage === 100 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-800">
            <strong>No subtitles found.</strong> Try adjusting the search parameters or time range.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-auto pt-6">
        <button
          onClick={() => goToStep('auto-detect')}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Back
        </button>
        {results.length > 0 && !isPausedByTabSwitch && (
          <button
            onClick={handleContinue}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
