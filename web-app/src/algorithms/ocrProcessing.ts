/**
 * OCR Processing
 *
 * Batch OCR processing using Tesseract.js with corner noise filtering
 * and text corrections.
 *
 * Ported from ocr_batch.py
 */

import Tesseract, { Word } from 'tesseract.js';
import { restoreApostrophes, fixOcrErrors } from './textCorrections';

export interface OcrOptions {
  filterCornerNoise?: boolean;
  topRightThreshold?: number;
  sizeThreshold?: number;
}

export interface OcrResult {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
}

export interface OcrProgress {
  currentImage: number;
  totalImages: number;
  percentage: number;
  status: string;
}

const DEFAULT_OPTIONS: Required<OcrOptions> = {
  filterCornerNoise: false,
  topRightThreshold: 0.25,
  sizeThreshold: 0.15,
};

/**
 * Filter out small text in the top right corner using bounding box analysis.
 *
 * @param words - Array of word objects from Tesseract
 * @param imgWidth - Image width
 * @param imgHeight - Image height
 * @param topRightThreshold - Proportion of width/height that defines "top right corner" (0.25 = top 25%, right 25%)
 * @param sizeThreshold - Maximum size ratio for noise (0.15 = 15% of image dimensions)
 * @returns Filtered text string
 */
function filterCornerNoise(
  words: Word[],
  imgWidth: number,
  imgHeight: number,
  topRightThreshold: number,
  sizeThreshold: number
): string {
  // Build list of text blocks to keep
  const filteredBlocks: Array<{
    line: number;
    text: string;
  }> = [];

  for (const word of words) {
    // Skip empty text
    if (!word.text.trim()) {
      continue;
    }

    // Skip low confidence detections
    if (word.confidence < 0) {
      continue;
    }

    // Get bounding box info
    const x = word.bbox.x0;
    const y = word.bbox.y0;
    const w = word.bbox.x1 - word.bbox.x0;
    const h = word.bbox.y1 - word.bbox.y0;

    // Calculate if this box is in top-right corner
    const isInTopRight =
      x > imgWidth * (1 - topRightThreshold) && y < imgHeight * topRightThreshold;

    // Calculate if this box is small (noise-sized)
    const isSmall = h < imgHeight * sizeThreshold || w < imgWidth * sizeThreshold;

    // Filter out small text in the top right corner
    if (isInTopRight && isSmall) {
      continue; // Skip this text block (it's likely noise)
    }

    // Keep this text block
    filteredBlocks.push({
      line: word.line.text ? word.line.bbox.y0 : 0, // Use line Y position for grouping
      text: word.text,
    });
  }

  // Reconstruct text from filtered blocks, maintaining line structure
  if (filteredBlocks.length === 0) {
    return '';
  }

  // Sort by line position (Y coordinate)
  filteredBlocks.sort((a, b) => a.line - b.line);

  // Group words by line with tolerance for Y position
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let prevLineY = filteredBlocks[0].line;
  const lineHeightTolerance = imgHeight * 0.02; // 2% tolerance for line grouping

  for (const block of filteredBlocks) {
    if (Math.abs(block.line - prevLineY) > lineHeightTolerance) {
      // New line detected
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [block.text];
      prevLineY = block.line;
    } else {
      currentLine.push(block.text);
    }
  }

  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Join words in each line with spaces, and lines with newlines
  return lines.map((line) => line.join(' ')).join('\n');
}

/**
 * Process a single image with OCR
 */
async function processImage(
  imageData: ImageData,
  options: Required<OcrOptions>
): Promise<{ text: string; confidence: number }> {
  // Create a canvas to convert ImageData to image format
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });

  // Perform OCR
  const result = await Tesseract.recognize(blob, 'eng', {
    logger: () => {}, // Disable Tesseract's internal logging
  });

  let text: string;
  let confidence = result.data.confidence;

  if (options.filterCornerNoise) {
    // Use filtered OCR to ignore small corner noise
    text = filterCornerNoise(
      result.data.words,
      imageData.width,
      imageData.height,
      options.topRightThreshold,
      options.sizeThreshold
    );
  } else {
    // Use standard OCR text
    text = result.data.text;
  }

  // Restore missing apostrophes in contractions
  text = restoreApostrophes(text);

  // Fix common OCR errors
  text = fixOcrErrors(text);

  return { text, confidence };
}

/**
 * Process all images with OCR
 */
export async function processAllImages(
  images: Array<{ id: string; clearedImageData: ImageData; timestamp: number }>,
  options: OcrOptions = {},
  onProgress?: (progress: OcrProgress) => void,
  shouldStop?: () => boolean
): Promise<OcrResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: OcrResult[] = [];
  const totalImages = images.length;

  for (let i = 0; i < totalImages; i++) {
    if (shouldStop && shouldStop()) {
      break;
    }

    const image = images[i];

    try {
      // Report progress
      if (onProgress) {
        onProgress({
          currentImage: i + 1,
          totalImages,
          percentage: ((i + 1) / totalImages) * 100,
          status: `Processing ${image.id}...`,
        });
      }

      const { text, confidence } = await processImage(image.clearedImageData, opts);

      results.push({
        id: image.id,
        text,
        timestamp: image.timestamp,
        confidence,
      });
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      // Add empty result for failed images
      results.push({
        id: image.id,
        text: '',
        timestamp: image.timestamp,
        confidence: 0,
      });
    }

    // Yield to event loop to allow UI updates
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
