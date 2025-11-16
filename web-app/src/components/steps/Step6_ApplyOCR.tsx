/**
 * Step 6: Apply OCR
 *
 * Processes cleared images with Tesseract OCR to extract subtitle text.
 * Includes corner noise filtering and text corrections.
 */

import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { processAllImages, OcrProgress } from '../../algorithms/ocrProcessing';
import { OcrResult } from '../../types/subtitle.types';

export function Step6_ApplyOCR() {
  const { state, dispatch, completeStep, goToStep } = useWorkflow();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [filterCornerNoise, setFilterCornerNoise] = useState(false);
  const [results, setResults] = useState<OcrResult[]>(state.ocrResults);

  // Sync with state when ocrResults change
  useEffect(() => {
    setResults(state.ocrResults);
  }, [state.ocrResults]);

  // Start OCR processing
  const handleStartOCR = async () => {
    if (state.clearedImages.length === 0) {
      alert('No cleared images found. Please complete image clearing first.');
      return;
    }

    setIsProcessing(true);
    setProgress(null);

    try {
      const ocrResults = await processAllImages(
        state.clearedImages,
        { filterCornerNoise },
        (prog) => setProgress(prog)
      );

      setResults(ocrResults);
      dispatch({ type: 'SET_OCR_RESULTS', payload: ocrResults });
      console.log(`OCR completed. Processed ${ocrResults.length} images.`);
    } catch (error) {
      console.error('OCR processing failed:', error);
      alert('OCR processing failed. Please check the console for details.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Reset OCR results
  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset OCR results and start over?'
    );

    if (confirmed) {
      setResults([]);
      dispatch({ type: 'SET_OCR_RESULTS', payload: [] });
      setProgress(null);
    }
  };

  // Continue to next step
  const handleContinue = () => {
    if (results.length === 0) {
      alert('No OCR results found. Please run OCR processing first.');
      return;
    }

    completeStep('ocr');
    goToStep('generate-subs');
  };

  // Format time with milliseconds
  const formatTimeWithMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Calculate average confidence
  const averageConfidence =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

  if (state.clearedImages.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">
            No cleared images found. Please complete image clearing first.
          </p>
          <button
            onClick={() => goToStep('clear-images')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Clear Images
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Apply OCR</h2>
          <p className="text-gray-600">
            Extract text from cleared subtitle images using Tesseract OCR.
          </p>
        </div>

        {/* Main Content */}
        <div className="mb-6 flex-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
            {/* Instructions */}
            {results.length === 0 && !isProcessing && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Click "Start OCR Processing" to extract text from
                  all cleared images. The process may take several minutes depending on the number
                  of images. Optionally enable corner noise filtering to ignore small text elements
                  in the top-right corner (useful for removing frame numbers or other noise).
                </p>
              </div>
            )}

            {/* OCR Options */}
            {!isProcessing && results.length === 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">OCR Options</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterCornerNoise}
                      onChange={(e) => setFilterCornerNoise(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Filter corner noise (remove small text in top-right corner)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Progress Display */}
            {isProcessing && progress && (
              <div className="mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">OCR Progress</h3>

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
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{progress.currentImage}</div>
                      <div className="text-sm text-gray-600">Current Image</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{progress.totalImages}</div>
                      <div className="text-sm text-gray-600">Total Images</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-4 text-center text-gray-600 text-sm">{progress.status}</div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results.length > 0 && !isProcessing && (
              <div className="flex-1 flex flex-col">
                <div className="mb-4 flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-semibold text-gray-800">
                      {results.length} subtitle{results.length !== 1 ? 's' : ''} processed
                    </div>
                    <div className="text-sm text-gray-600">
                      Average confidence: {averageConfidence.toFixed(1)}%
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 border border-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Timestamp */}
                          <div className="flex-shrink-0 text-sm font-medium text-gray-700">
                            {formatTimeWithMs(result.timestamp)}
                          </div>

                          {/* Text */}
                          <div className="flex-1">
                            {result.text ? (
                              <p className="text-gray-800 whitespace-pre-wrap">{result.text}</p>
                            ) : (
                              <p className="text-gray-400 italic">No text detected</p>
                            )}
                          </div>

                          {/* Confidence */}
                          <div className="flex-shrink-0 text-right">
                            <div className="text-xs text-gray-500">Confidence</div>
                            <div
                              className={`text-sm font-semibold ${
                                result.confidence >= 80
                                  ? 'text-green-600'
                                  : result.confidence >= 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {result.confidence.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Start Button */}
            {!isProcessing && results.length === 0 && (
              <div className="flex gap-3 mt-auto pt-4 border-t border-gray-200">
                <button
                  onClick={handleStartOCR}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Start OCR Processing
                </button>
              </div>
            )}

            {/* Continue Button */}
            {results.length > 0 && !isProcessing && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Continue to Next Step →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-6">
          <button
            onClick={() => goToStep('manual-cleanup')}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
