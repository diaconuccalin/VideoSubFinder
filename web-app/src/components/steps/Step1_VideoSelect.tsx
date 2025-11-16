/**
 * Step 1: Video Selection
 */

import { useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { VideoMetadata } from '../../types/video.types';
import { VIDEO_CONSTRAINTS } from '../../config/settings';

export function Step1_VideoSelect() {
  const { state, dispatch, goToStep, loadCachedState } = useWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      // Validate file type
      if (!VIDEO_CONSTRAINTS.supportedFormats.includes(file.type)) {
        throw new Error(`Unsupported file format: ${file.type}`);
      }

      // Create video element to extract metadata
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = videoUrl;
      });

      // Extract metadata
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        frameRate: 30, // Default, will be refined during processing
        fileName: file.name,
        fileSize: file.size,
        format: file.type,
      };

      // Validate constraints
      if (metadata.duration > VIDEO_CONSTRAINTS.maxDuration) {
        throw new Error(`Video duration exceeds ${VIDEO_CONSTRAINTS.maxDuration / 3600} hours`);
      }

      // Store video info in state (this also marks step as completed and resets any previous detection)
      dispatch({
        type: 'SET_VIDEO_FILE',
        payload: { file, metadata, url: videoUrl },
      });

      // Try to load cached state for this video
      const hasCachedState = await loadCachedState(file, metadata);

      if (hasCachedState) {
        console.log('Loaded cached workflow state for this video');
        // Stay on current step (let the user navigate from there)
      } else {
        // Navigate to auto-detect step for new video
        goToStep('auto-detect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Select Video File</h2>

        {!state.videoFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-lg text-gray-600">
              Drop video file here or click to browse
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Supported formats: MP4, WebM, MOV, MKV, AVI
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Max duration: 3 hours | Max resolution: 4K
            </p>

            {isLoading && (
              <div className="mt-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading video...</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-green-800">Video loaded successfully!</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">File:</span>
                <span className="text-sm text-gray-900">{state.videoMetadata?.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Duration:</span>
                <span className="text-sm text-gray-900">
                  {formatDuration(state.videoMetadata?.duration || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Resolution:</span>
                <span className="text-sm text-gray-900">
                  {state.videoMetadata?.width} × {state.videoMetadata?.height}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Size:</span>
                <span className="text-sm text-gray-900">
                  {formatFileSize(state.videoMetadata?.fileSize || 0)}
                </span>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  // Clear video and reset workflow (this will also clear Step 2 detection results)
                  dispatch({ type: 'CLEAR_VIDEO' });
                  setError(null);
                }}
                className="btn-secondary"
              >
                Change File
              </button>
              <button
                onClick={() => goToStep('auto-detect')}
                className="btn-primary flex-1"
              >
                Next: Detect Subtitle Position →
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={VIDEO_CONSTRAINTS.supportedFormats.join(',')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
