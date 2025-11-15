/**
 * Search Subtitles Algorithm
 *
 * TypeScript/OpenCV.js port of FastSearchSubtitles from C++ codebase
 * (SSAlgorithms.cpp lines 1128-2013)
 *
 * This algorithm detects and extracts subtitle frames by:
 * 1. Processing video frames in the specified time range
 * 2. Applying edge detection (Sobel gradients)
 * 3. Intersecting frame sequences to find consistent text regions
 * 4. Analyzing for text presence using connected component analysis
 * 5. Saving detected subtitle images with timing information
 */

import cv from '@techstark/opencv-js';
import { BoundingBox } from '../types/video.types';
import { SubtitleFrame } from '../types/subtitle.types';

export interface SearchParams {
  /** Frame sequence length for intersection (default: 3) */
  frameSequenceLength: number;

  /** Text percentage threshold (0.0-1.0, default: 0.25) */
  textPercentageThreshold: number;

  /** Use ILA (Illuminance Analysis) images (default: true) */
  useILAImages: boolean;

  /** Use edge detection with Sobel gradients (default: true) */
  useEdgeDetection: boolean;

  /** Minimum text width in pixels (default: 40) */
  minTextWidth: number;

  /** Minimum text height in pixels (default: 8) */
  minTextHeight: number;

  /** Text alignment: 0=Center, 1=Left, 2=Right, 3=Any (default: 0) */
  textAlignment: 0 | 1 | 2 | 3;

  /** Frame sampling interval - 1=every frame, 2=every 2nd frame, etc. (default: 1) */
  samplingInterval: number;
}

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  frameSequenceLength: 3,
  textPercentageThreshold: 0.25,
  useILAImages: true,
  useEdgeDetection: true,
  minTextWidth: 40,
  minTextHeight: 8,
  textAlignment: 0,
  samplingInterval: 1,
};

export interface SearchProgress {
  /** Current video position in seconds */
  currentTime: number;

  /** Total time to search in seconds */
  totalTime: number;

  /** Progress percentage (0-100) */
  percentage: number;

  /** Total frames processed */
  framesProcessed: number;

  /** Number of subtitles found */
  subtitlesFound: number;

  /** Elapsed time in milliseconds */
  elapsedTime: number;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
}

interface FrameBuffer {
  /** Video timestamp in seconds */
  timestamp: number;

  /** Original RGB image */
  rgb: cv.Mat;

  /** Gradient/edge-detected image */
  gradient: cv.Mat;

  /** Luminance (Y-channel) image */
  luminance: cv.Mat;
}

/**
 * Convert image to gradient using Sobel edge detection
 * Mimics ConvertImage() from SSAlgorithms.cpp
 */
function convertImageToGradient(src: cv.Mat, params: SearchParams): cv.Mat {
  const gray = new cv.Mat();
  const gradX = new cv.Mat();
  const gradY = new cv.Mat();
  const absGradX = new cv.Mat();
  const absGradY = new cv.Mat();
  const gradient = new cv.Mat();

  try {
    // Convert to grayscale if needed
    if (src.channels() === 3 || src.channels() === 4) {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }

    if (params.useEdgeDetection) {
      // Apply Sobel operator to compute gradients
      // X-direction gradient (vertical edges)
      cv.Sobel(gray, gradX, cv.CV_16S, 1, 0, 3);
      cv.convertScaleAbs(gradX, absGradX);

      // Y-direction gradient (horizontal edges)
      cv.Sobel(gray, gradY, cv.CV_16S, 0, 1, 3);
      cv.convertScaleAbs(gradY, absGradY);

      // Combine gradients: gradient = |gradX| + |gradY|
      cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, gradient);
    } else {
      // Use grayscale image directly without edge detection
      gray.copyTo(gradient);
    }

    // Apply threshold to create binary image
    const threshold = 50; // Moderate threshold for edge detection
    cv.threshold(gradient, gradient, threshold, 255, cv.THRESH_BINARY);

    return gradient;
  } finally {
    gray.delete();
    gradX.delete();
    gradY.delete();
    absGradX.delete();
    absGradY.delete();
  }
}

/**
 * Extract luminance (Y-channel) from RGB image
 * Used for ILA image generation
 */
function extractLuminance(src: cv.Mat): cv.Mat {
  const yuv = new cv.Mat();
  const yChannel = new cv.Mat();

  try {
    // Convert to YUV color space
    cv.cvtColor(src, yuv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(yuv, yuv, cv.COLOR_RGB2YUV);

    // Extract Y channel (luminance)
    const channels = new cv.MatVector();
    cv.split(yuv, channels);
    channels.get(0).copyTo(yChannel);
    channels.delete();

    return yChannel;
  } finally {
    yuv.delete();
  }
}

/**
 * Intersect two images using pixel-wise MIN operation
 * Mimics IntersectTwoImages() from SSAlgorithms.cpp:1302
 */
function intersectFrames(img1: cv.Mat, img2: cv.Mat): cv.Mat {
  const result = new cv.Mat();

  // Pixel-wise minimum (intersection)
  cv.min(img1, img2, result);

  return result;
}

/**
 * Intersect Y-channel (luminance) images
 * Mimics IntersectYImages() from SSAlgorithms.cpp
 */
function intersectLuminance(img1: cv.Mat, img2: cv.Mat): cv.Mat {
  const result = new cv.Mat();

  // Pixel-wise minimum for luminance channels
  cv.min(img1, img2, result);

  return result;
}

/**
 * Analyze image for text presence using connected component analysis
 * Mimics AnalyseImage() from SSAlgorithms.cpp:1316
 */
function analyzeImageForText(
  img: cv.Mat,
  params: SearchParams,
  imgWidth: number,
  imgHeight: number
): boolean {
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  const labels = new cv.Mat();

  try {
    // Find connected components
    const numComponents = cv.connectedComponentsWithStats(
      img,
      labels,
      stats,
      centroids,
      8,
      cv.CV_32S
    );

    // Analyze each component (skip background component 0)
    let validTextRegions = 0;
    let totalTextArea = 0;

    for (let i = 1; i < numComponents; i++) {
      // Access stats using data32S array
      const width = stats.data32S[i * 5 + cv.CC_STAT_WIDTH];
      const height = stats.data32S[i * 5 + cv.CC_STAT_HEIGHT];
      const area = stats.data32S[i * 5 + cv.CC_STAT_AREA];

      // Validate component as potential text
      if (
        width >= params.minTextWidth &&
        height >= params.minTextHeight &&
        area > 0
      ) {
        // Check aspect ratio (text is usually wider than tall)
        const aspectRatio = width / height;
        if (aspectRatio > 0.5 && aspectRatio < 20) {
          validTextRegions++;
          totalTextArea += area;
        }
      }
    }

    // Check if we have enough text
    const imageArea = imgWidth * imgHeight;
    const textPercentage = totalTextArea / imageArea;

    // Need at least some valid regions and sufficient text coverage
    return validTextRegions > 0 && textPercentage >= params.textPercentageThreshold / 100;
  } finally {
    stats.delete();
    centroids.delete();
    labels.delete();
  }
}

/**
 * Extract a video frame at the specified timestamp
 */
async function extractFrame(
  video: HTMLVideoElement,
  timestamp: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<cv.Mat> {
  // Seek to timestamp
  video.currentTime = timestamp;

  // Wait for frame to be ready
  await new Promise<void>((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
  });

  // Draw frame to canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get image data and convert to OpenCV Mat
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mat = cv.matFromImageData(imageData);

  return mat;
}

/**
 * Crop image to subtitle region
 */
function cropToRegion(src: cv.Mat, region: BoundingBox): cv.Mat {
  const width = region.xmax - region.xmin;
  const height = region.ymax - region.ymin;
  const rect = new cv.Rect(region.xmin, region.ymin, width, height);
  const cropped = src.roi(rect);
  const result = cropped.clone();
  cropped.delete();
  return result;
}

/**
 * Convert OpenCV Mat to ImageData
 */
function matToImageData(mat: cv.Mat): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext('2d')!;

  // Convert mat to canvas
  cv.imshow(canvas, mat);

  // Get ImageData
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return imageData;
}

/**
 * Check if two subtitle frames are similar (same subtitle)
 */
function areSimilarSubtitles(
  frame1: SubtitleFrame,
  frame2: SubtitleFrame
): boolean {
  // Simple time-based check: if frames are very close in time, likely same subtitle
  const timeDiff = Math.abs(frame1.startTime - frame2.startTime);
  return timeDiff < 1.0; // Within 1 second = same subtitle
}

/**
 * Main search algorithm
 * Mimics FastSearchSubtitles() from SSAlgorithms.cpp:1128-2013
 */
export async function searchSubtitles(
  video: HTMLVideoElement,
  detectedRegion: BoundingBox,
  startTime: number,
  endTime: number,
  params: SearchParams = DEFAULT_SEARCH_PARAMS,
  onProgress?: (progress: SearchProgress) => void,
  shouldStop?: () => boolean
): Promise<SubtitleFrame[]> {
  const results: SubtitleFrame[] = [];
  const frameBuffer: FrameBuffer[] = [];
  const DL = params.frameSequenceLength;

  // Create canvas for frame extraction
  const canvas = document.createElement('canvas');
  const regionWidth = detectedRegion.xmax - detectedRegion.xmin;
  const regionHeight = detectedRegion.ymax - detectedRegion.ymin;
  canvas.width = regionWidth;
  canvas.height = regionHeight;
  const ctx = canvas.getContext('2d')!;

  // Calculate frame rate and total frames
  const fps = 25; // Default assumption, could be extracted from video metadata
  const totalDuration = endTime - startTime;
  const frameInterval = 1 / fps;
  const startTimeMs = performance.now();

  let currentTime = startTime;
  let framesProcessed = 0;
  let isaAccumulator: cv.Mat | null = null;
  let ilaAccumulator: cv.Mat | null = null;
  let lastSubtitle: SubtitleFrame | null = null;
  let currentSequenceStart: number | null = null;

  try {
    while (currentTime < endTime) {
      // Check if we should stop
      if (shouldStop && shouldStop()) {
        break;
      }

      // Sample frames based on sampling interval
      if (framesProcessed % params.samplingInterval !== 0) {
        currentTime += frameInterval;
        framesProcessed++;
        continue;
      }

      // Extract frame from video
      const fullFrame = await extractFrame(video, currentTime, canvas, ctx);

      // Crop to subtitle region
      const rgbCropped = cropToRegion(fullFrame, detectedRegion);
      fullFrame.delete();

      // Convert to gradient
      const gradient = convertImageToGradient(rgbCropped, params);

      // Extract luminance if using ILA images
      let luminance: cv.Mat | null = null;
      if (params.useILAImages) {
        luminance = extractLuminance(rgbCropped);
      }

      // Add to frame buffer
      frameBuffer.push({
        timestamp: currentTime,
        rgb: rgbCropped,
        gradient: gradient,
        luminance: luminance || new cv.Mat(),
      });

      // Keep only DL frames in buffer
      if (frameBuffer.length > DL) {
        const removed = frameBuffer.shift()!;
        removed.rgb.delete();
        removed.gradient.delete();
        removed.luminance.delete();
      }

      // Process when we have DL frames
      if (frameBuffer.length === DL) {
        // Intersect all gradient frames to create ISA image
        isaAccumulator = frameBuffer[0].gradient.clone();
        for (let i = 1; i < DL; i++) {
          const newAccumulator = intersectFrames(isaAccumulator, frameBuffer[i].gradient);
          isaAccumulator.delete();
          isaAccumulator = newAccumulator;
        }

        // Intersect luminance frames to create ILA image
        if (params.useILAImages && frameBuffer[0].luminance.rows > 0) {
          ilaAccumulator = frameBuffer[0].luminance.clone();
          for (let i = 1; i < DL; i++) {
            const newAccumulator = intersectLuminance(ilaAccumulator, frameBuffer[i].luminance);
            ilaAccumulator.delete();
            ilaAccumulator = newAccumulator;
          }
        }

        // Analyze ISA image for text
        const hasText = analyzeImageForText(
          isaAccumulator,
          params,
          regionWidth,
          regionHeight
        );

        if (hasText) {
          // Text detected - check if this is a new subtitle or continuation
          if (currentSequenceStart === null) {
            // Start of new subtitle sequence
            currentSequenceStart = frameBuffer[0].timestamp;
          }

          // Update end time to current frame
          const sequenceEnd = frameBuffer[DL - 1].timestamp;

          // Create subtitle frame (we'll save it when sequence ends)
          const subtitleFrame: SubtitleFrame = {
            id: `sub_${results.length}_${Math.floor(currentSequenceStart * 1000)}`,
            startTime: currentSequenceStart,
            endTime: sequenceEnd,
            imageData: matToImageData(frameBuffer[0].rgb),
          };

          lastSubtitle = subtitleFrame;
        } else if (currentSequenceStart !== null && lastSubtitle !== null) {
          // No text detected, but we had a sequence - save it

          // Check if similar to previous subtitle (avoid duplicates)
          const isDuplicate = results.length > 0 &&
            areSimilarSubtitles(lastSubtitle, results[results.length - 1]);

          if (!isDuplicate) {
            results.push(lastSubtitle);
          }

          currentSequenceStart = null;
          lastSubtitle = null;
        }

        // Clean up accumulator
        if (isaAccumulator) {
          isaAccumulator.delete();
          isaAccumulator = null;
        }
        if (ilaAccumulator) {
          ilaAccumulator.delete();
          ilaAccumulator = null;
        }
      }

      // Update progress
      framesProcessed++;
      const elapsed = performance.now() - startTimeMs;
      const percentage = ((currentTime - startTime) / totalDuration) * 100;
      const estimatedTotal = (elapsed / percentage) * 100;
      const estimatedRemaining = estimatedTotal - elapsed;

      if (onProgress && framesProcessed % 10 === 0) {
        onProgress({
          currentTime,
          totalTime: totalDuration,
          percentage,
          framesProcessed,
          subtitlesFound: results.length,
          elapsedTime: elapsed,
          estimatedTimeRemaining: Math.max(0, estimatedRemaining),
        });
      }

      // Move to next frame
      currentTime += frameInterval;
    }

    // Save last subtitle if sequence was ongoing
    if (currentSequenceStart !== null && lastSubtitle !== null) {
      const isDuplicate = results.length > 0 &&
        areSimilarSubtitles(lastSubtitle, results[results.length - 1]);

      if (!isDuplicate) {
        results.push(lastSubtitle);
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        currentTime: endTime,
        totalTime: totalDuration,
        percentage: 100,
        framesProcessed,
        subtitlesFound: results.length,
        elapsedTime: performance.now() - startTimeMs,
        estimatedTimeRemaining: 0,
      });
    }

    return results;
  } finally {
    // Clean up frame buffer
    for (const frame of frameBuffer) {
      frame.rgb.delete();
      frame.gradient.delete();
      frame.luminance.delete();
    }

    // Clean up accumulators
    if (isaAccumulator) isaAccumulator.delete();
    if (ilaAccumulator) ilaAccumulator.delete();
  }
}
