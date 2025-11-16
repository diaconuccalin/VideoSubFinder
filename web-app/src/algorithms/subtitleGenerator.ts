/**
 * Subtitle Generator
 *
 * Generates subtitle files in SRT format from OCR results.
 */

import { OcrResult } from '../types/subtitle.types';
import { SubtitleFrame } from '../types/subtitle.types';

/**
 * Format time in SRT format: HH:MM:SS,mmm
 */
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`;
}

/**
 * Generate SRT subtitle file content from OCR results
 *
 * @param ocrResults - OCR results with recognized text
 * @param subtitleFrames - Original subtitle frames with timing information
 * @returns SRT file content as string
 */
export function generateSrtFile(
  ocrResults: OcrResult[],
  subtitleFrames: SubtitleFrame[]
): string {
  // Create a map of subtitle frames by ID for quick lookup
  const frameMap = new Map<string, SubtitleFrame>();
  subtitleFrames.forEach((frame) => {
    frameMap.set(frame.id, frame);
  });

  // Filter out empty text results and match with frames
  const validEntries = ocrResults
    .filter((result) => result.text.trim().length > 0)
    .map((result) => {
      const frame = frameMap.get(result.id);
      if (!frame) {
        console.warn(`No frame found for OCR result ${result.id}`);
        return null;
      }

      return {
        id: result.id,
        startTime: frame.startTime,
        endTime: frame.endTime,
        text: result.text.trim(),
      };
    })
    .filter((entry) => entry !== null) as Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;

  // Sort by start time
  validEntries.sort((a, b) => a.startTime - b.startTime);

  // Generate SRT content
  const srtLines: string[] = [];

  validEntries.forEach((entry, index) => {
    // Index (1-based)
    srtLines.push((index + 1).toString());

    // Timing line
    const startTime = formatSrtTime(entry.startTime);
    const endTime = formatSrtTime(entry.endTime);
    srtLines.push(`${startTime} --> ${endTime}`);

    // Text (can be multi-line)
    srtLines.push(entry.text);

    // Blank line separator
    srtLines.push('');
  });

  return srtLines.join('\n');
}

/**
 * Download SRT file to user's computer
 */
export function downloadSrtFile(content: string, filename: string = 'subtitles.srt'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate statistics about the subtitle file
 */
export function generateSubtitleStats(
  ocrResults: OcrResult[],
  subtitleFrames: SubtitleFrame[]
): {
  totalSubtitles: number;
  validSubtitles: number;
  emptySubtitles: number;
  averageConfidence: number;
  totalDuration: number;
} {
  const frameMap = new Map<string, SubtitleFrame>();
  subtitleFrames.forEach((frame) => {
    frameMap.set(frame.id, frame);
  });

  const validResults = ocrResults.filter((result) => result.text.trim().length > 0);
  const emptyResults = ocrResults.filter((result) => result.text.trim().length === 0);
  const averageConfidence =
    ocrResults.length > 0
      ? ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length
      : 0;

  // Calculate total duration (from first to last subtitle)
  let totalDuration = 0;
  if (validResults.length > 0) {
    const times = validResults
      .map((result) => {
        const frame = frameMap.get(result.id);
        return frame ? { start: frame.startTime, end: frame.endTime } : null;
      })
      .filter((t) => t !== null) as Array<{ start: number; end: number }>;

    if (times.length > 0) {
      const firstStart = Math.min(...times.map((t) => t.start));
      const lastEnd = Math.max(...times.map((t) => t.end));
      totalDuration = lastEnd - firstStart;
    }
  }

  return {
    totalSubtitles: ocrResults.length,
    validSubtitles: validResults.length,
    emptySubtitles: emptyResults.length,
    averageConfidence,
    totalDuration,
  };
}
