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
  frameSequenceLength: 6, // g_DL = 6 from desktop (SSAlgorithms.cpp:44)
  textPercentageThreshold: 0.30, // g_tp = 0.3 from desktop (SSAlgorithms.cpp:45)
  useILAImages: true, // g_use_ILA_images_for_search_subtitles = true (SSAlgorithms.cpp:51)
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
export function convertImageToGradient(src: cv.Mat, params: SearchParams): cv.Mat {
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
export function extractLuminance(src: cv.Mat): cv.Mat {
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
export function intersectFrames(img1: cv.Mat, img2: cv.Mat): cv.Mat {
  const result = new cv.Mat();

  // Pixel-wise minimum (intersection)
  cv.min(img1, img2, result);

  return result;
}

/**
 * Intersect Y-channel (luminance) images
 * Mimics IntersectYImages() from SSAlgorithms.cpp
 */
export function intersectLuminance(img1: cv.Mat, img2: cv.Mat): cv.Mat {
  const result = new cv.Mat();

  // Pixel-wise minimum for luminance channels
  cv.min(img1, img2, result);

  return result;
}

/**
 * Analyze image for text presence using connected component analysis
 * Mimics AnalyseImage() from SSAlgorithms.cpp:1316
 */
export function analyzeImageForText(
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

  // Wait for frame to be ready (with timeout)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error(`Timeout waiting for video to seek to ${timestamp}s`));
    }, 5000); // 5 second timeout

    const onSeeked = () => {
      clearTimeout(timeout);
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
export function matToImageData(mat: cv.Mat): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

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
 * Extract and process a single frame at specific time position
 * Returns the processed frame buffer or null if extraction fails
 */
async function extractAndProcessFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  time: number,
  detectedRegion: BoundingBox,
  params: SearchParams
): Promise<FrameBuffer | null> {
  try {
    // Extract frame
    const fullFrame = await extractFrame(video, time, canvas, ctx);

    // Crop to subtitle region
    const rgbCropped = cropToRegion(fullFrame, detectedRegion);
    fullFrame.delete();

    // Convert to gradient
    const gradient = convertImageToGradient(rgbCropped, params);

    // Extract luminance if using ILA images
    const luminance = params.useILAImages
      ? extractLuminance(rgbCropped)
      : new cv.Mat();

    return {
      timestamp: time,
      rgb: rgbCropped,
      gradient,
      luminance,
    };
  } catch (error) {
    console.error(`Failed to extract frame at ${time}s:`, error);
    return null;
  }
}

/**
 * Phase 1: Quick check with only 2 edge frames
 * Returns true if text is suspected (requires Phase 2 verification)
 */
function quickCheckTwoFrames(
  frame1: FrameBuffer,
  frame2: FrameBuffer,
  params: SearchParams,
  regionWidth: number,
  regionHeight: number
): boolean {
  // Intersect the two gradient frames
  const isaQuick = intersectFrames(frame1.gradient, frame2.gradient);

  // Quick text analysis
  const hasText = analyzeImageForText(isaQuick, params, regionWidth, regionHeight);

  // Clean up
  isaQuick.delete();

  return hasText;
}

/**
 * Main search algorithm with two-phase detection
 * Mimics FastSearchSubtitles() from SSAlgorithms.cpp:1128-2013
 *
 * Phase 1: Jump by DL/2 frames, quick check with 2 edge frames only
 * Phase 2: If text suspected, extract all DL frames for detailed verification
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
  // Validate video is ready
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Video dimensions not available. Video may not be loaded properly.');
  }

  if (video.readyState < 2) {
    throw new Error('Video not ready. Please wait for video to load.');
  }

  const results: SubtitleFrame[] = [];
  const DL = params.frameSequenceLength;
  const ddl = Math.floor(DL / 2); // Half of DL for stride/jumping

  // Create canvas for frame extraction (full video size)
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Calculate region dimensions
  const regionWidth = detectedRegion.xmax - detectedRegion.xmin;
  const regionHeight = detectedRegion.ymax - detectedRegion.ymin;

  // Calculate frame rate and timing
  const fps = 25; // Default assumption
  const totalDuration = endTime - startTime;
  const frameInterval = 1 / fps;
  const startTimeMs = performance.now();

  let fn = 0; // Frame number
  let currentTime = startTime;
  let lastSubtitle: SubtitleFrame | null = null;
  let currentSequenceStart: number | null = null;
  let framesProcessed = 0;

  console.log(`Starting two-phase search: DL=${DL}, stride=${ddl}, range=${startTime}s-${endTime}s`);

  try {
    // Main loop: jump forward by ddl (DL/2) frames
    while (currentTime < endTime) {
      if (shouldStop && shouldStop()) {
        console.log('Seek-based search stopped at', currentTime);
        // Report final position before stopping
        if (onProgress) {
          const elapsed = performance.now() - searchStartTime;
          const percentage = ((currentTime - startTime) / totalDuration) * 100;
          onProgress({
            currentTime,
            totalTime: totalDuration,
            percentage: Math.min(100, percentage),
            framesProcessed,
            subtitlesFound: results.length,
            elapsedTime: elapsed,
            estimatedTimeRemaining: 0,
          });
        }
        break;
      }

      // Calculate positions for Phase 1 edge frames
      const edge1Time = currentTime + (ddl - 1) * frameInterval; // fn + (DL/2) - 1
      const edge2Time = currentTime + (DL - 1) * frameInterval;  // fn + DL - 1

      // Skip if beyond end time
      if (edge2Time > endTime) {
        break;
      }

      // **PHASE 1: Quick Check with 2 Edge Frames**
      const edge1 = await extractAndProcessFrame(video, canvas, ctx, edge1Time, detectedRegion, params);
      const edge2 = await extractAndProcessFrame(video, canvas, ctx, edge2Time, detectedRegion, params);

      if (!edge1 || !edge2) {
        // Frame extraction failed, skip this position
        currentTime += ddl * frameInterval;
        fn += ddl;
        continue;
      }

      // Quick check: intersect just these 2 frames
      const textSuspected = quickCheckTwoFrames(edge1, edge2, params, regionWidth, regionHeight);

      if (textSuspected) {
        // **PHASE 2: Detailed Verification with All DL Frames**
        console.log(`Phase 2 verification at ${currentTime.toFixed(2)}s (text suspected in phase 1)`);

        // Extract all DL frames
        const allFrames: (FrameBuffer | null)[] = [];
        for (let i = 0; i < DL; i++) {
          const frameTime = currentTime + i * frameInterval;
          // Reuse edge frames if we already have them
          if (i === ddl - 1) {
            allFrames.push(edge1);
          } else if (i === DL - 1) {
            allFrames.push(edge2);
          } else {
            allFrames.push(await extractAndProcessFrame(video, canvas, ctx, frameTime, detectedRegion, params));
          }
        }

        // Filter out null frames
        const validFrames = allFrames.filter((f): f is FrameBuffer => f !== null);

        if (validFrames.length === DL) {
          // Intersect all DL gradient frames
          let isaFull = validFrames[0].gradient.clone();
          for (let i = 1; i < DL; i++) {
            const newIsa = intersectFrames(isaFull, validFrames[i].gradient);
            isaFull.delete();
            isaFull = newIsa;
          }

          // Intersect all DL luminance frames (if enabled)
          let ilaFull: cv.Mat | null = null;
          if (params.useILAImages && validFrames[0].luminance.rows > 0) {
            ilaFull = validFrames[0].luminance.clone();
            for (let i = 1; i < DL; i++) {
              const newIla = intersectLuminance(ilaFull, validFrames[i].luminance);
              ilaFull.delete();
              ilaFull = newIla;
            }
          }

          // Detailed text analysis
          const hasText = analyzeImageForText(isaFull, params, regionWidth, regionHeight);

          if (hasText) {
            // Text confirmed! Save subtitle
            if (currentSequenceStart === null) {
              currentSequenceStart = validFrames[0].timestamp;
            }

            const sequenceEnd = validFrames[DL - 1].timestamp;
            lastSubtitle = {
              id: `sub_${results.length}_${Math.floor(currentSequenceStart * 1000)}`,
              startTime: currentSequenceStart,
              endTime: sequenceEnd,
              imageData: matToImageData(validFrames[0].rgb),
            };

            console.log(`Subtitle detected: ${currentSequenceStart.toFixed(2)}s - ${sequenceEnd.toFixed(2)}s`);
          } else if (currentSequenceStart !== null && lastSubtitle !== null) {
            // Text sequence ended, save previous subtitle
            const isDuplicate = results.length > 0 &&
              areSimilarSubtitles(lastSubtitle, results[results.length - 1]);

            if (!isDuplicate) {
              results.push(lastSubtitle);
            }

            currentSequenceStart = null;
            lastSubtitle = null;
          }

          // Clean up
          isaFull.delete();
          if (ilaFull) ilaFull.delete();
        }

        // Clean up all extracted frames
        for (const frame of validFrames) {
          frame.rgb.delete();
          frame.gradient.delete();
          frame.luminance.delete();
        }
      } else {
        // No text in phase 1, clean up edge frames
        edge1.rgb.delete();
        edge1.gradient.delete();
        edge1.luminance.delete();
        edge2.rgb.delete();
        edge2.gradient.delete();
        edge2.luminance.delete();
      }

      // Jump forward by DL/2 frames
      currentTime += ddl * frameInterval;
      fn += ddl;
      framesProcessed += textSuspected ? DL : 2; // Count frames actually processed

      // Update progress
      const elapsed = performance.now() - startTimeMs;
      const percentage = ((currentTime - startTime) / totalDuration) * 100;
      const estimatedTotal = (elapsed / percentage) * 100;
      const estimatedRemaining = estimatedTotal - elapsed;

      if (onProgress && fn % 10 === 0) {
        onProgress({
          currentTime,
          totalTime: totalDuration,
          percentage: Math.min(100, percentage),
          framesProcessed,
          subtitlesFound: results.length,
          elapsedTime: elapsed,
          estimatedTimeRemaining: Math.max(0, estimatedRemaining),
        });
      }
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

    console.log(`Two-phase search complete: Found ${results.length} subtitles, processed ${framesProcessed} frames`);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
