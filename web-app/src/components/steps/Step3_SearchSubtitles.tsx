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
import { SubtitleFrame } from '../../types/subtitle.types';

export function Step3_SearchSubtitles() {
  const { state, dispatch, completeStep, goToStep } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [results, setResults] = useState<SubtitleFrame[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const shouldStopRef = useRef(false);

  // Get detected region from state (Step 2 result)
  const detectedRegion = state.detectedRegion || state.adjustedRegion;

  // Initialize time range from video metadata
  useEffect(() => {
    if (state.videoMetadata && endTime === 0) {
      setStartTime(0);
      setEndTime(state.videoMetadata.duration);
    }
  }, [state.videoMetadata]);

  // Restore search results from state
  useEffect(() => {
    if (state.subtitleFrames.length > 0 && results.length === 0) {
      setResults(state.subtitleFrames);
    }
  }, [state.subtitleFrames]);

  // Set up video canvas drawing
  useEffect(() => {
    if (state.videoUrl && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      const updateCanvas = () => {
        if (video.readyState >= 2) {
          // Draw current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw detected region overlay
          if (detectedRegion) {
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;

            const scaledRegion = {
              xmin: detectedRegion.xmin * scaleX,
              ymin: detectedRegion.ymin * scaleY,
              xmax: detectedRegion.xmax * scaleX,
              ymax: detectedRegion.ymax * scaleY,
            };

            // Semi-transparent green overlay
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(
              scaledRegion.xmin,
              scaledRegion.ymin,
              scaledRegion.xmax - scaledRegion.xmin,
              scaledRegion.ymax - scaledRegion.ymin
            );

            // Green border
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
              scaledRegion.xmin,
              scaledRegion.ymin,
              scaledRegion.xmax - scaledRegion.xmin,
              scaledRegion.ymax - scaledRegion.ymin
            );
          }
        }
      };

      // Update canvas when video time changes
      const onTimeUpdate = () => updateCanvas();
      const onSeeked = () => updateCanvas();
      const onLoadedData = () => updateCanvas();

      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('loadeddata', onLoadedData);

      updateCanvas();

      return () => {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('loadeddata', onLoadedData);
      };
    }
  }, [state.videoUrl, detectedRegion]);

  // Handle search button click
  const handleRunSearch = async () => {
    if (!state.videoUrl || !detectedRegion || !videoRef.current) {
      return;
    }

    setIsSearching(true);
    shouldStopRef.current = false;
    setResults([]);
    setProgress(null);

    try {
      const subtitleFrames = await searchSubtitles(
        videoRef.current,
        detectedRegion,
        startTime,
        endTime,
        searchParams,
        (progressData) => {
          setProgress(progressData);
        },
        () => shouldStopRef.current
      );

      setResults(subtitleFrames);

      // Save to global state
      dispatch({ type: 'SET_SUBTITLE_FRAMES', payload: subtitleFrames });
      dispatch({ type: 'UPDATE_SEARCH_PROGRESS', payload: 100 });

      // Mark step as complete if we found subtitles
      if (subtitleFrames.length > 0) {
        completeStep('search-subtitles');
      }
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

  // Handle continue to next step
  const handleContinue = () => {
    completeStep('search-subtitles');
    goToStep('clear-images');
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

      {/* Video Preview */}
      <div className="mb-6">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={state.videoUrl}
            className="hidden"
            crossOrigin="anonymous"
          />
          <canvas
            ref={canvasRef}
            className="block max-w-full max-h-96 mx-auto"
            width={state.videoMetadata?.width || 640}
            height={state.videoMetadata?.height || 480}
          />
          {isSearching && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
              <div className="animate-pulse mr-2">●</div>
              Searching...
            </div>
          )}
        </div>
      </div>

      {/* Search Controls */}
      {!isSearching && results.length === 0 && (
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search Configuration</h3>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="number"
                  value={startTime}
                  onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  max={endTime}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">{formatTime(startTime)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="number"
                  value={endTime}
                  onChange={(e) =>
                    setEndTime(Math.min(state.videoMetadata?.duration || 0, parseFloat(e.target.value) || 0))
                  }
                  min={startTime}
                  max={state.videoMetadata?.duration || 0}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">{formatTime(endTime)}</span>
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
                        setSearchParams({
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
                        setSearchParams({
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
                        setSearchParams({
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
                        setSearchParams({
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
                        setSearchParams({ ...searchParams, useILAImages: e.target.checked })
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
                        setSearchParams({ ...searchParams, useEdgeDetection: e.target.checked })
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
              disabled={isSearching}
              className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              🔍 Run Search
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
      {!isSearching && results.length > 0 && (
        <div className="mb-6 flex-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Search Complete!</h3>
              <div className="text-green-600 font-semibold">✓ Found {results.length} subtitle frames</div>
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
              <p className="text-sm text-green-800">
                <strong>Success!</strong> Detected {results.length} subtitle frames from{' '}
                {formatTime(results[0]?.startTime || 0)} to{' '}
                {formatTime(results[results.length - 1]?.endTime || 0)}.
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
                          const ctx = canvas.getContext('2d')!;
                          canvas.width = frame.imageData.width;
                          canvas.height = frame.imageData.height;
                          ctx.putImageData(frame.imageData, 0, 0);
                        }
                      }}
                      className="w-full h-auto border border-gray-200 rounded"
                    />
                    <div className="text-xs text-gray-600 mt-1 text-center">
                      {formatTime(frame.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="w-full mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue to Clear Images →
            </button>
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
        {results.length > 0 && (
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
