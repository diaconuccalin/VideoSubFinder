/**
 * Step 4: Clear Images
 *
 * Implements the "Create Cleared Text Images" functionality from the desktop app.
 * Uses K-means clustering to separate text from background, creating cleaned
 * images suitable for OCR processing.
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  clearAllImages,
  ClearImagesParams,
  ClearProgress,
  ClearedImage,
  DEFAULT_CLEAR_PARAMS,
} from '../../algorithms/clearImages';

export function Step4_ClearImages() {
  const { state, dispatch, completeStep, goToStep } = useWorkflow();

  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<ClearProgress | null>(null);
  const [clearParams, setClearParams] = useState<ClearImagesParams>(DEFAULT_CLEAR_PARAMS);
  const [results, setResults] = useState<ClearedImage[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const shouldStopRef = useRef(false);

  // Restore cleared images from state
  useEffect(() => {
    if (state.clearedImages.length > 0 && results.length === 0) {
      setResults(state.clearedImages);
    }
  }, [state.clearedImages]);

  // Handle clear button click
  const handleRunClear = async () => {
    if (state.subtitleFrames.length === 0) {
      return;
    }

    setIsClearing(true);
    shouldStopRef.current = false;
    setResults([]);
    setProgress(null);

    try {
      // Prepare images for clearing
      const imagesToClear = state.subtitleFrames.map((frame) => ({
        id: frame.id,
        imageData: frame.imageData,
        timestamp: frame.startTime,
      }));

      console.log(`Clearing ${imagesToClear.length} subtitle images...`);

      // Clear all images
      const clearedImages = await clearAllImages(
        imagesToClear,
        clearParams,
        (progressData) => {
          setProgress(progressData);
        },
        () => shouldStopRef.current
      );

      setResults(clearedImages);

      // Save to global state
      dispatch({ type: 'SET_CLEARED_IMAGES', payload: clearedImages });

      // Mark step as complete
      if (clearedImages.length > 0) {
        completeStep('clear-images');
      }

      console.log(`Successfully cleared ${clearedImages.length} images`);
    } catch (error) {
      console.error('Image clearing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`An error occurred during image clearing:\n\n${errorMessage}\n\nCheck the console for more details.`);
    } finally {
      setIsClearing(false);
      shouldStopRef.current = false;
    }
  };

  // Handle stop
  const handleStop = () => {
    shouldStopRef.current = true;
    setIsClearing(false);
  };

  // Handle reset
  const handleReset = () => {
    setResults([]);
    setProgress(null);
    dispatch({ type: 'SET_CLEARED_IMAGES', payload: [] });
  };

  // Handle continue to next step
  const handleContinue = () => {
    completeStep('clear-images');
    // TODO: Add next step (OCR or export)
    // goToStep('ocr');
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

  if (state.subtitleFrames.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">No subtitle frames found. Please run subtitle search first.</p>
          <button
            onClick={() => goToStep('search-subtitles')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Search Subtitles
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Clear Images</h2>
          <p className="text-gray-600">
            Use K-means clustering to separate text from background, creating cleaned images suitable for OCR.
          </p>
        </div>

        {/* Clear Controls */}
        {!isClearing && results.length === 0 && (
          <div className="mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Image Clearing Configuration</h3>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Ready:</strong> {state.subtitleFrames.length} subtitle frames loaded from previous step.
                </p>
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
                        Number of Clusters
                      </label>
                      <input
                        type="number"
                        value={clearParams.numClusters}
                        onChange={(e) =>
                          setClearParams({
                            ...clearParams,
                            numClusters: Math.max(2, Math.min(3, parseInt(e.target.value) || 2)),
                          })
                        }
                        min="2"
                        max="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <span className="text-xs text-gray-500">K-means clusters (2-3)</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Iterations
                      </label>
                      <input
                        type="number"
                        value={clearParams.maxIterations}
                        onChange={(e) =>
                          setClearParams({
                            ...clearParams,
                            maxIterations: Math.max(10, parseInt(e.target.value) || 100),
                          })
                        }
                        min="10"
                        max="500"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <span className="text-xs text-gray-500">K-means iterations</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={handleRunClear}
                disabled={isClearing}
                className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                🧹 Clear Images
              </button>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {isClearing && progress && (
          <div className="mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Clearing Progress</h3>

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
                  <div className="text-2xl font-bold text-gray-800">{progress.currentImage}</div>
                  <div className="text-sm text-gray-600">Current Image</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{progress.totalImages}</div>
                  <div className="text-sm text-gray-600">Total Images</div>
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
        {!isClearing && results.length > 0 && (
          <div className="mb-6 flex-1">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Image Clearing Complete!</h3>
                <div className="text-green-600 font-semibold">✓ Cleared {results.length} images</div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-4">
                <p className="text-sm text-green-800">
                  <strong>Success!</strong> Successfully cleared {results.length} subtitle images using K-means clustering.
                </p>
              </div>

              {/* Preview Grid */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-3">Preview (first 12 results, showing cleared images):</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.slice(0, 12).map((image) => (
                    <div
                      key={image.id}
                      className="border border-gray-300 rounded-lg p-2 hover:shadow-lg transition-shadow"
                    >
                      {/* Cleared Image */}
                      <canvas
                        ref={(canvas) => {
                          if (canvas && image.clearedImageData) {
                            const ctx = canvas.getContext('2d')!;
                            canvas.width = image.clearedImageData.width;
                            canvas.height = image.clearedImageData.height;
                            ctx.putImageData(image.clearedImageData, 0, 0);
                          }
                        }}
                        className="w-full h-auto border border-gray-200 rounded"
                      />
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        Cleared Image
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
                  🔄 Reset
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!isClearing && results.length === 0 && progress && progress.percentage === 100 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-800">
              <strong>No images cleared.</strong> This should not happen. Please try again.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-6">
          <button
            onClick={() => goToStep('search-subtitles')}
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
