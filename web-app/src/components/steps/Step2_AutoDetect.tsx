/**
 * Step 2: Auto-Detect Subtitle Position
 *
 * Automatically detects subtitle regions using the ColorFiltration algorithm
 * from the C++ codebase (Components/IPAlgorithms/IPAlgorithms.cpp).
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { extractFrameAtTime } from '../../utils/videoExtraction';
import {
  colorFiltrationWithVisualization,
  ColorFiltrationParams,
  DEFAULT_COLOR_FILTRATION_PARAMS,
} from '../../algorithms/colorFiltration';
import { BoundingBox } from '../../types/video.types';

export function Step2_AutoDetect() {
  const { state, setDetectedRegion, completeStep, goToStep } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedRegions, setDetectedRegions] = useState<BoundingBox[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<BoundingBox | null>(null);
  const [visualization, setVisualization] = useState<ImageData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detection parameters (can be adjusted by user)
  const [params, setParams] = useState<ColorFiltrationParams>(DEFAULT_COLOR_FILTRATION_PARAMS);

  // Auto-detect on component mount
  useEffect(() => {
    if (state.videoUrl && !isDetecting && detectedRegions.length === 0) {
      runAutoDetection();
    }
  }, [state.videoUrl]);

  const runAutoDetection = async () => {
    if (!state.videoUrl || !state.videoMetadata) {
      return;
    }

    setIsDetecting(true);

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

      // Extract frame at 10% of video duration (where subtitles are likely present)
      const sampleTime = state.videoMetadata.duration * 0.1;
      const frame = await extractFrameAtTime(video, sampleTime);

      // Run ColorFiltration algorithm
      const { regions, visualization: viz } = colorFiltrationWithVisualization(
        frame.imageData,
        params
      );

      setDetectedRegions(regions);
      setVisualization(viz);

      // Auto-select the bottommost region (most likely subtitle position)
      if (regions.length > 0) {
        const bottomRegion = regions.reduce((bottom, current) =>
          current.ymax > bottom.ymax ? current : bottom
        );
        setSelectedRegion(bottomRegion);
      }

      // Draw visualization on canvas
      if (canvasRef.current && viz) {
        const canvas = canvasRef.current;
        canvas.width = frame.imageData.width;
        canvas.height = frame.imageData.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(viz, 0, 0);
        }
      }
    } catch (error) {
      console.error('Auto-detection failed:', error);
      alert('Auto-detection failed. Please try adjusting the parameters.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleRedetect = () => {
    setDetectedRegions([]);
    setSelectedRegion(null);
    setVisualization(null);
    runAutoDetection();
  };

  const handleContinue = () => {
    if (selectedRegion) {
      setDetectedRegion(selectedRegion);
      completeStep('auto-detect');
      goToStep('manual-adjust');
    }
  };

  const handleParamChange = (key: keyof ColorFiltrationParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-submarine-deep-blue mb-4">
          Auto-Detect Subtitle Position
        </h2>

        <p className="text-gray-700 mb-6">
          The algorithm will automatically scan the video frame to detect regions where
          subtitles are likely to appear. This uses the ColorFiltration algorithm from
          the original VideoSubFinder C++ codebase.
        </p>

        {/* Visualization Canvas */}
        <div className="mb-6">
          <div className="border-2 border-submarine-sky rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {isDetecting ? (
              <div className="py-32 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-submarine-ocean mx-auto mb-4"></div>
                <p className="text-white font-semibold">Analyzing video frame...</p>
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
        {detectedRegions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-submarine-deep-blue mb-3">
              Detected Regions ({detectedRegions.length})
            </h3>

            <div className="space-y-2">
              {detectedRegions.map((region, index) => {
                const isSelected = selectedRegion === region;
                const width = region.xmax - region.xmin + 1;
                const height = region.ymax - region.ymin + 1;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedRegion(region)}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg border-2 transition-colors
                      ${isSelected
                        ? 'border-submarine-ocean bg-submarine-sky/20'
                        : 'border-gray-300 hover:border-submarine-sky'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-submarine-deep-blue">
                          Region {index + 1}
                        </span>
                        <span className="text-sm text-gray-600 ml-3">
                          {width}×{height} px at y={region.ymin}-{region.ymax}
                        </span>
                      </div>
                      {isSelected && (
                        <svg className="w-6 h-6 text-submarine-ocean" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {detectedRegions.length === 0 && !isDetecting && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <p className="text-yellow-800 font-semibold">
              No subtitle regions detected. Try adjusting the detection parameters below.
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
                  Segment Width (px)
                </label>
                <input
                  type="number"
                  value={params.segmentWidth}
                  onChange={(e) => handleParamChange('segmentWidth', Number(e.target.value))}
                  className="input-field w-full"
                  min="4"
                  max="32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Width of horizontal segments for analysis (default: 8)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Min Segments Count
                </label>
                <input
                  type="number"
                  value={params.minSegmentsCount}
                  onChange={(e) => handleParamChange('minSegmentsCount', Number(e.target.value))}
                  className="input-field w-full"
                  min="2"
                  max="20"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum consecutive segments to detect text (default: 6)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Min Sum Color Diff
                </label>
                <input
                  type="number"
                  value={params.minSumColorDiff}
                  onChange={(e) => handleParamChange('minSumColorDiff', Number(e.target.value))}
                  className="input-field w-full"
                  min="200"
                  max="2000"
                  step="50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Color consistency threshold (default: 800)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Min Height (px)
                </label>
                <input
                  type="number"
                  value={params.minHeight}
                  onChange={(e) => handleParamChange('minHeight', Number(e.target.value))}
                  className="input-field w-full"
                  min="4"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum region height to keep (default: 8)
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleRedetect}
                  className="btn-secondary"
                  disabled={isDetecting}
                >
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

          <button
            onClick={handleContinue}
            disabled={!selectedRegion}
            className="btn-primary"
          >
            Continue to Manual Adjustment →
          </button>
        </div>
      </div>
    </div>
  );
}
