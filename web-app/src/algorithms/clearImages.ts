/**
 * Clear Images Algorithm
 *
 * Implements K-means clustering to separate text from background,
 * mimicking the desktop app's "Create Cleared Text Images" functionality
 * (OCRPanel.cpp:FindTextLines, IPAlgorithms.cpp:ClearImageLogical)
 */

import cv from '@techstark/opencv-js';

export interface ClearImagesParams {
  numClusters: number; // 2-3 clusters for K-means
  maxIterations: number; // Max K-means iterations
  epsilon: number; // K-means convergence criteria
  useCUDA: boolean; // GPU acceleration (not available in web)
}

export const DEFAULT_CLEAR_PARAMS: ClearImagesParams = {
  numClusters: 2, // Desktop default (text + background)
  maxIterations: 100,
  epsilon: 0.1,
  useCUDA: false, // Not available in browser
};

export interface ClearProgress {
  currentImage: number;
  totalImages: number;
  percentage: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
}

export interface ClearedImage {
  id: string;
  originalImageData: ImageData;
  clearedImageData: ImageData;
  timestamp: number;
}

/**
 * Clear a single image using K-means clustering
 * Separates text from background by clustering colors
 */
export function clearImageByKMeans(
  imageData: ImageData,
  params: ClearImagesParams = DEFAULT_CLEAR_PARAMS
): ImageData {
  const src = cv.matFromImageData(imageData);

  try {
    // Convert to LAB color space for better clustering
    const lab = new cv.Mat();
    cv.cvtColor(src, lab, cv.COLOR_RGBA2RGB);
    cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);

    // Prepare data for K-means: reshape to (width * height) x 3
    const totalPixels = lab.rows * lab.cols;
    const samples = new cv.Mat(totalPixels, 3, cv.CV_32F);

    // Copy LAB data into samples matrix
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 3;
      samples.data32F[i * 3] = lab.data[idx];       // L channel
      samples.data32F[i * 3 + 1] = lab.data[idx + 1]; // a channel
      samples.data32F[i * 3 + 2] = lab.data[idx + 2]; // b channel
    }

    // K-means clustering
    const labels = new cv.Mat();
    const centers = new cv.Mat();
    const criteria = new cv.TermCriteria(
      cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER,
      params.maxIterations,
      params.epsilon
    );

    cv.kmeans(
      samples,
      params.numClusters,
      labels,
      criteria,
      3, // attempts
      0 // KMEANS_RANDOM_CENTERS
    );

    // Identify text cluster (darkest cluster in L channel)
    let textClusterIdx = 0;
    let minLuminance = 255;

    for (let i = 0; i < params.numClusters; i++) {
      // Access centers data directly (3 channels: L, a, b)
      const L = centers.data32F[i * 3]; // L channel
      if (L < minLuminance) {
        minLuminance = L;
        textClusterIdx = i;
      }
    }

    // Create cleared image: keep text cluster, remove others
    const cleared = new cv.Mat(lab.rows, lab.cols, cv.CV_8UC3, new cv.Scalar(255, 255, 255));

    for (let i = 0; i < labels.rows; i++) {
      const label = labels.data32S[i];

      if (label === textClusterIdx) {
        // Keep original pixel (text)
        const idx = i * 3;
        cleared.data[idx] = lab.data[idx];
        cleared.data[idx + 1] = lab.data[idx + 1];
        cleared.data[idx + 2] = lab.data[idx + 2];
      }
      // else: leave as white background
    }

    // Convert back to RGB
    const rgb = new cv.Mat();
    cv.cvtColor(cleared, rgb, cv.COLOR_Lab2RGB);

    // Convert to grayscale for final output
    const gray = new cv.Mat();
    cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);

    // Threshold to binary (text = black, background = white)
    const binary = new cv.Mat();
    cv.threshold(gray, binary, 128, 255, cv.THRESH_BINARY);

    // Convert to RGBA for ImageData
    const rgba = new cv.Mat();
    cv.cvtColor(binary, rgba, cv.COLOR_GRAY2RGBA);

    // Create ImageData
    const clearedImageData = new ImageData(
      new Uint8ClampedArray(rgba.data),
      rgba.cols,
      rgba.rows
    );

    // Clean up
    src.delete();
    lab.delete();
    samples.delete();
    labels.delete();
    centers.delete();
    cleared.delete();
    rgb.delete();
    gray.delete();
    binary.delete();
    rgba.delete();

    return clearedImageData;
  } catch (error) {
    src.delete();
    throw error;
  }
}

/**
 * Clear all subtitle images using K-means clustering
 * Processes images in parallel for better performance
 */
export async function clearAllImages(
  images: { id: string; imageData: ImageData; timestamp: number }[],
  params: ClearImagesParams = DEFAULT_CLEAR_PARAMS,
  onProgress?: (progress: ClearProgress) => void,
  shouldStop?: () => boolean
): Promise<ClearedImage[]> {
  const results: ClearedImage[] = [];
  const startTime = performance.now();
  const totalImages = images.length;

  for (let i = 0; i < totalImages; i++) {
    if (shouldStop && shouldStop()) {
      break;
    }

    const image = images[i];

    try {
      // Clear the image using K-means
      const clearedImageData = clearImageByKMeans(image.imageData, params);

      results.push({
        id: image.id,
        originalImageData: image.imageData,
        clearedImageData,
        timestamp: image.timestamp,
      });
    } catch (error) {
      console.error(`Failed to clear image ${image.id}:`, error);
      // Skip failed images but continue processing
    }

    // Report progress
    if (onProgress) {
      const elapsed = performance.now() - startTime;
      const percentage = ((i + 1) / totalImages) * 100;
      const estimatedTotal = (elapsed / (i + 1)) * totalImages;
      const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

      onProgress({
        currentImage: i + 1,
        totalImages,
        percentage,
        elapsedTime: elapsed,
        estimatedTimeRemaining: estimatedRemaining,
      });
    }
  }

  return results;
}
