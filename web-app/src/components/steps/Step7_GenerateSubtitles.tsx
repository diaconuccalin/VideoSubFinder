/**
 * Step 7: Generate Subtitles
 *
 * Generates subtitle file in SRT format from OCR results and allows download.
 */

import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  generateSrtFile,
  downloadSrtFile,
  generateSubtitleStats,
} from '../../algorithms/subtitleGenerator';

export function Step7_GenerateSubtitles() {
  const { state, dispatch, goToStep, completeStep } = useWorkflow();

  const [srtContent, setSrtContent] = useState<string>('');
  const [stats, setStats] = useState<{
    totalSubtitles: number;
    validSubtitles: number;
    emptySubtitles: number;
    averageConfidence: number;
    totalDuration: number;
  } | null>(null);

  // Generate SRT file when component loads
  useEffect(() => {
    if (state.ocrResults.length > 0 && state.subtitleFrames.length > 0) {
      const content = generateSrtFile(state.ocrResults, state.subtitleFrames);
      setSrtContent(content);

      const statistics = generateSubtitleStats(state.ocrResults, state.subtitleFrames);
      setStats(statistics);

      // Save to workflow state
      dispatch({ type: 'SET_SUBTITLE_CONTENT', payload: content });

      // Mark this step as completed
      completeStep('generate-subs');
    }
  }, [state.ocrResults, state.subtitleFrames, dispatch, completeStep]);

  // Download SRT file
  const handleDownload = () => {
    if (srtContent) {
      const filename = state.videoFile
        ? state.videoFile.name.replace(/\.[^/.]+$/, '') + '.srt'
        : 'subtitles.srt';
      downloadSrtFile(srtContent, filename);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  if (state.ocrResults.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-gray-600 mb-4">No OCR results found. Please run OCR processing first.</p>
          <button
            onClick={() => goToStep('ocr')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Apply OCR
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Generate Subtitles</h2>
          <p className="text-gray-600">
            Your subtitle file has been generated and is ready for download.
          </p>
        </div>

        {/* Main Content */}
        <div className="mb-6 flex-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
            {/* Success Message */}
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-6">
              <div className="flex items-center">
                <div className="text-green-800">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-semibold">Subtitle file generated successfully!</span>
                  </div>
                  <p className="text-sm mt-2">
                    Your SRT subtitle file is ready. Click the download button below to save it.
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.validSubtitles}</div>
                    <div className="text-sm text-gray-600 mt-1">Valid Subtitles</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-600">{stats.emptySubtitles}</div>
                    <div className="text-sm text-gray-600 mt-1">Empty Subtitles</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.totalSubtitles}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Processed</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.averageConfidence.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Avg Confidence</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatDuration(stats.totalDuration)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Duration</div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-4 overflow-y-auto">
                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                  {srtContent || 'No content generated'}
                </pre>
              </div>
            </div>

            {/* Download Button */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleDownload}
                disabled={!srtContent}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download SRT File
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-6">
          <button
            onClick={() => goToStep('ocr')}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => goToStep('video-select')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Process Another Video
          </button>
        </div>
      </div>
    </div>
  );
}
