/**
 * Step 2: Auto-Detect Subtitle Position
 *
 * Automatically detects subtitle regions using the AutoDetectSubtitleBounds algorithm
 * from the YellowSubtitles branch C++ codebase (MainFrm.cpp lines 921-1431).
 *
 * Uses OpenCV.js for contour-based detection matching the exact C++ implementation.
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  autoDetectSubtitleBounds,
  AutoDetectParams,
  DEFAULT_AUTO_DETECT_PARAMS,
} from '../../algorithms/autoDetectSubtitleBounds';
import { BoundingBox } from '../../types/video.types';

export function Step2_AutoDetect() {
  const { state, setDetectedRegion, completeStep, goToStep } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedRegion, setDetectedRegionState] = useState<BoundingBox | null>(null);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectTotal, setDetectTotal] = useState(0);
  const [visualization, setVisualization] = useState<ImageData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectionStats, setDetectionStats] = useState<{
    framesProcessed: number;
    contoursFound: number;
  } | null>(null);

  // Detection parameters (can be adjusted by user)
  const [params, setParams] = useState<AutoDetectParams>(DEFAULT_AUTO_DETECT_PARAMS);

  // Auto-detect on component mount
  useEffect(() => {
    if (state.videoUrl && !isDetecting && !detectedRegion) {
      runAutoDetection();
    }
  }, [state.videoUrl]);

  const runAutoDetection = async () => {
    if (!state.videoUrl || !state.videoMetadata) {
      return;
    }

    setIsDetecting(true);
    setDetectProgress(0);
    setDetectTotal(0);

    try {
      // Create video element
      const video = document.createElement('video');
      video.src = state.videoUrl;
      video.crossOrigin = 'anonymous';

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve());
        video.addEventListener('error', () => reject(new Error('Failed to load video')));
      });

      videoRef.current = video;

      // Run AutoDetectSubtitleBounds algorithm
      const result = await autoDetectSubtitleBounds(
        video,
        state.videoMetadata.duration,
        params,
        (current, total) => {
          setDetectProgress(current);
          setDetectTotal(total);
        }
      );

      setDetectionStats({
        framesProcessed: result.framesProcessed,
        contoursFound: result.contoursFound,
      });

      if (result.bounds) {
        setDetectedRegionState(result.bounds);

        // Create visualization
        await createVisualization(video, result.bounds);
      } else {
        alert('No subtitle regions detected. The video may not contain hardcoded subtitles, or they may be in an unusual position.');
      }
    } catch (error) {
      console.error('Auto-detection failed:', error);
      alert('Auto-detection failed. Please try adjusting the parameters or set bounds manually.');
    } finally {
      setIsDetecting(false);
    }
  };

  const createVisualization = async (video: HTMLVideoElement, bounds: BoundingBox) => {
    // Seek to 10% of video for visualization frame
    const vizTime = state.videoMetadata!.duration * 0.1;
    await seekToTime(video, vizTime);

    // Create canvas and draw video frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    // Draw semi-transparent overlay on detected region
    for (let y = bounds.ymin; y <= bounds.ymax; y++) {
      for (let x = bounds.xmin; x <= bounds.xmax; x++) {
        const idx = (y * canvas.width + x) * 4;
        data[idx] = Math.min(255, data[idx] * 0.5 + 255 * 0.5); // R
        data[idx + 1] = Math.min(255, data[idx + 1] * 0.5); // G
        data[idx + 2] = Math.min(255, data[idx + 2] * 0.5); // B
      }
    }

    // Draw border
    const drawBorder = (x1: number, y1: number, x2: number, y2: number) => {
      for (let x = x1; x <= x2; x++) {
        for (let dy = 0; dy < 2; dy++) {
          [y1 + dy, y2 - dy].forEach((y) => {
            if (y >= 0 && y < canvas.height) {
              const idx = (y * canvas.width + x) * 4;
              data[idx] = 255;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
            }
          });
        }
      }

      for (let y = y1; y <= y2; y++) {
        for (let dx = 0; dx < 2; dx++) {
          [x1 + dx, x2 - dx].forEach((x) => {
            if (x >= 0 && x < canvas.width) {
              const idx = (y * canvas.width + x) * 4;
              data[idx] = 255;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
            }
          });
        }
      }
    };

    drawBorder(bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax);

    setVisualization(imageData);

    // Draw visualization on canvas
    if (canvasRef.current) {
      canvasRef.current.width = canvas.width;
      canvasRef.current.height = canvas.height;
      const canvasCtx = canvasRef.current.getContext('2d')!;
      canvasCtx.putImageData(imageData, 0, 0);
    }
  };

  const seekToTime = (video: HTMLVideoElement, time: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to seek'));
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = time;
    });
  };

  const handleRedetect = () => {
    setDetectedRegionState(null);
    setVisualization(null);
    setDetectionStats(null);
    runAutoDetection();
  };

  const handleContinue = () => {
    if (detectedRegion) {
      setDetectedRegion(detectedRegion);
      completeStep('auto-detect');
      goToStep('manual-adjust');
    }
  };

  const handleParamChange = <K extends keyof AutoDetectParams>(
    key: K,
    value: AutoDetectParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const formatBounds = (bounds: BoundingBox, width: number, height: number) => {
    const topPct = ((bounds.ymin / height) * 100).toFixed(1);
    const bottomPct = ((bounds.ymax / height) * 100).toFixed(1);
    const leftPct = ((bounds.xmin / width) * 100).toFixed(1);
    const rightPct = ((bounds.xmax / width) * 100).toFixed(1);

    return `Top: ${topPct}%, Bottom: ${bottomPct}%, Left: ${leftPct}%, Right: ${rightPct}%`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-submarine-deep-blue mb-4">
          Auto-Detect Subtitle Position
        </h2>

        <p className="text-gray-700 mb-6">
          The algorithm will automatically scan the video to detect regions where subtitles appear.
          This uses OpenCV.js with the exact algorithm from the C++ codebase (AutoDetectSubtitleBounds).
        </p>

        {/* Visualization Canvas */}
        <div className="mb-6">
          <div className="border-2 border-submarine-sky rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {isDetecting ? (
              <div className="py-32 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-submarine-ocean mx-auto mb-4"></div>
                <p className="text-white font-semibold mb-2">Analyzing video frames...</p>
                {detectTotal > 0 && (
                  <p className="text-white text-sm">
                    Processing frame {detectProgress} of {detectTotal}
                  </p>
                )}
                {detectTotal > 0 && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-submarine-ocean h-2 rounded-full transition-all"
                        style={{ width: `${(detectProgress / detectTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : visualization ? (
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            ) : (
              <div className="py-32 text-center">
                <p className="text-gray-400">No visualization available</p>
              </div>
            )}
          </div>
        </div>

        {/* Detection Results */}
        {detectedRegion && state.videoMetadata && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-submarine-deep-blue mb-3">Detected Region</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Bounds:</span>
                <span className="text-sm text-gray-900">
                  {formatBounds(
                    detectedRegion,
                    state.videoMetadata.width,
                    state.videoMetadata.height
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Size:</span>
                <span className="text-sm text-gray-900">
                  {detectedRegion.xmax - detectedRegion.xmin} ×{' '}
                  {detectedRegion.ymax - detectedRegion.ymin} px
                </span>
              </div>
              {detectionStats && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Frames Processed:</span>
                    <span className="text-sm text-gray-900">{detectionStats.framesProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Contours Found:</span>
                    <span className="text-sm text-gray-900">{detectionStats.contoursFound}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!detectedRegion && !isDetecting && detectionStats && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <p className="text-yellow-800 font-semibold mb-2">No subtitle regions detected.</p>
            <p className="text-yellow-700 text-sm">
              Processed {detectionStats.framesProcessed} frames and found {detectionStats.contoursFound} contours,
              but none met the subtitle detection criteria. Try adjusting the parameters below.
            </p>
          </div>
        )}

        {/* Advanced Parameters */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-submarine-ocean hover:text-submarine-deep-blue font-semibold mb-3 flex items-center"
          >
            <svg
              className={`w-5 h-5 mr-2 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Detection Parameters
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sample Interval (ms)
                </label>
                <input
                  type="number"
                  value={params.sampleIntervalMs}
                  onChange={(e) => handleParamChange('sampleIntervalMs', Number(e.target.value))}
                  className="input-field w-full"
                  min="500"
                  max="5000"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time between frame samples (default: 1500ms)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Threshold Value
                </label>
                <input
                  type="number"
                  value={params.thresholdValue}
                  onChange={(e) => handleParamChange('thresholdValue', Number(e.target.value))}
                  className="input-field w-full"
                  min="50"
                  max="250"
                />
                <p className="text-xs text-gray-500 mt-1">Binary threshold (default: 150)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Min Contour Area
                </label>
                <input
                  type="number"
                  value={params.minContourArea}
                  onChange={(e) => handleParamChange('minContourArea', Number(e.target.value))}
                  className="input-field w-full"
                  min="1"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum contour size (default: 7)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Max Aspect Ratio
                </label>
                <input
                  type="number"
                  value={params.maxAspectRatio}
                  onChange={(e) => handleParamChange('maxAspectRatio', Number(e.target.value))}
                  className="input-field w-full"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max width/height ratio (default: 1.5)
                </p>
              </div>

              <div className="md:col-span-2">
                <button onClick={handleRedetect} className="btn-secondary" disabled={isDetecting}>
                  Re-run Detection with New Parameters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToStep('video-select')}
            className="text-submarine-ocean hover:text-submarine-deep-blue font-semibold"
          >
            ← Back to Video Selection
          </button>

          <button onClick={handleContinue} disabled={!detectedRegion} className="btn-primary">
            Continue to Manual Adjustment →
          </button>
        </div>
      </div>
    </div>
  );
}
