/**
 * Step 5: Manual Cleanup
 *
 * Allows users to manually review cleared images and delete ones that don't
 * contain actual text or are false positives.
 */

import { useEffect, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

export function Step5_ManualCleanup() {
  const { state, dispatch, completeStep, goToStep } = useWorkflow();

  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [displayedImages, setDisplayedImages] = useState(state.clearedImages);

  // Sync with state when clearedImages change
  useEffect(() => {
    setDisplayedImages(state.clearedImages);
  }, [state.clearedImages]);

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImageIds);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImageIds(newSelection);
  };

  // Select all images
  const handleSelectAll = () => {
    if (selectedImageIds.size === displayedImages.length) {
      // Deselect all
      setSelectedImageIds(new Set());
    } else {
      // Select all
      setSelectedImageIds(new Set(displayedImages.map((img) => img.id)));
    }
  };

  // Delete selected images
  const handleDelete = () => {
    if (selectedImageIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedImageIds.size} image(s)? This action cannot be undone.`
    );

    if (confirmed) {
      // Remove selected images from displayed list
      const updatedImages = displayedImages.filter((img) => !selectedImageIds.has(img.id));
      setDisplayedImages(updatedImages);

      // Update global state
      dispatch({ type: 'SET_CLEARED_IMAGES', payload: updatedImages });

      // Clear selection
      setSelectedImageIds(new Set());

      console.log(`Deleted ${selectedImageIds.size} images. ${updatedImages.length} images remaining.`);
    }
  };

  // Handle continue to next step
  const handleContinue = () => {
    if (displayedImages.length === 0) {
      alert('No images remaining. Please go back and run the clearing process again.');
      return;
    }

    completeStep('manual-cleanup');
    // TODO: Add next step navigation
    // goToStep('ocr');
  };

  // Format time with milliseconds
  const formatTimeWithMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  if (state.clearedImages.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">No cleared images found. Please run image clearing first.</p>
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Manual Cleanup</h2>
          <p className="text-gray-600">
            Review cleared images and delete any that don't contain actual text or are false positives.
          </p>
        </div>

        {/* Main Content */}
        <div className="mb-6 flex-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
            {/* Stats and Controls Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="text-lg font-semibold text-gray-800">
                  {displayedImages.length} image{displayedImages.length !== 1 ? 's' : ''} remaining
                </div>
                {selectedImageIds.size > 0 && (
                  <div className="text-sm text-blue-600 font-medium">
                    ({selectedImageIds.size} selected)
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  {selectedImageIds.size === displayedImages.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={selectedImageIds.size === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  🗑️ Delete Selected ({selectedImageIds.size})
                </button>
              </div>
            </div>

            {/* Instruction */}
            {displayedImages.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Review each cleared image and select any that don't contain actual
                  text or are false positives (images with no text should be deleted). Selected images will have a blue
                  border. Use the "Delete Selected" button to remove the selected images. Click "Continue" when you're
                  done reviewing.
                </p>
              </div>
            )}

            {/* Image Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedImages.map((image) => {
                  const isSelected = selectedImageIds.has(image.id);
                  return (
                    <div
                      key={image.id}
                      onClick={() => toggleImageSelection(image.id)}
                      className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
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

                      {/* Timestamp */}
                      <div className="text-xs text-gray-700 mt-2 text-center">
                        <div className="font-medium">{formatTimeWithMs(image.timestamp)}</div>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="mt-2 flex items-center justify-center">
                          <div className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                            ✓ Selected
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleContinue}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Continue to Next Step →
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-6">
          <button
            onClick={() => goToStep('clear-images')}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
