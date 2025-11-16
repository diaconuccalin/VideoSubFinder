/**
 * Auto-Detect Subtitle Bounds Algorithm
 *
 * TypeScript/OpenCV.js port of CMainFrame::AutoDetectSubtitleBounds
 * from YellowSubtitles branch (MainFrm.cpp lines 921-1431)
 *
 * This algorithm automatically detects subtitle regions using:
 * 1. Temporal sampling across 3 intervals (25%, 50%, 75% marks)
 * 2. OpenCV contour detection on grayscale thresholded frames
 * 3. Filtering by area and aspect ratio
 * 4. Temporal filtering to track consistent subtitle positions
 */

import cv from '@techstark/opencv-js';
import { BoundingBox } from '../types/video.types';

export interface AutoDetectParams {
  /** Sample interval in milliseconds (default: 1500ms = 1.5 seconds) */
  sampleIntervalMs: number;

  /** Margin to add to detected bounds (default: 0.005 = 0.5%) */
  margin: number;

  /** Start of search region (0.5 = bottom 50% of frame) */
  lowerHalfStart: number;

  /** Binary threshold value (default: 150) */
  thresholdValue: number;

  /** Minimum contour area (default: 7) */
  minContourArea: number;

  /** Maximum contour area as fraction of image area (default: 0.0004) */
  maxContourAreaFraction: number;

  /** Maximum aspect ratio for valid contours (default: 1.5) */
  maxAspectRatio: number;

  /** Minimum contours required per frame (default: 4) */
  minContoursPerFrame: number;

  /** Number of recent frames to track for temporal filtering (default: 5) */
  temporalBufferSize: number;

  /** Y-position threshold multiplier (default: 2.5x average height) */
  yThresholdMultiplier: number;
}

export const DEFAULT_AUTO_DETECT_PARAMS: AutoDetectParams = {
  sampleIntervalMs: 1500,
  margin: 0.005,
  lowerHalfStart: 0.5,
  thresholdValue: 150,
  minContourArea: 7,
  maxContourAreaFraction: 0.0004,
  maxAspectRatio: 1.5,
  minContoursPerFrame: 4,
  temporalBufferSize: 5,
  yThresholdMultiplier: 2.5,
};

interface ContourInfo {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DetectionResult {
  bounds: BoundingBox | null;
  framesProcessed: number;
  contoursFound: number;
}

/**
 * Auto-detect subtitle bounds from a video element
 *
 * Matches CMainFrame::AutoDetectSubtitleBounds algorithm exactly
 */
export async function autoDetectSubtitleBounds(
  video: HTMLVideoElement,
  duration: number,
  params: AutoDetectParams = DEFAULT_AUTO_DETECT_PARAMS,
  onProgress?: (current: number, total: number) => void
): Promise<DetectionResult> {

  const width = video.videoWidth;
  const height = video.videoHeight;

  // Define three 1-minute sampling intervals
  const intervalDurationMs = 60000; // 1 minute
  const quarterDurationMs = duration * 1000 / 4;

  const samplingIntervals: Array<{ start: number; end: number }> = [
    // Interval 1: After first quarter (25% mark)
    {
      start: quarterDurationMs,
      end: Math.min(quarterDurationMs + intervalDurationMs, duration * 1000),
    },
    // Interval 2: After second quarter (50% mark)
    {
      start: 2 * quarterDurationMs,
      end: Math.min(2 * quarterDurationMs + intervalDurationMs, duration * 1000),
    },
    // Interval 3: After third quarter (75% mark)
    {
      start: 3 * quarterDurationMs,
      end: Math.min(3 * quarterDurationMs + intervalDurationMs, duration * 1000),
    },
  ];

  // Calculate total number of samples
  let numSamples = 0;
  for (const interval of samplingIntervals) {
    const intervalDuration = interval.end - interval.start;
    numSamples += Math.floor(intervalDuration / params.sampleIntervalMs) + 1;
  }

  // Only search bottom half of frame (where subtitles typically appear)
  const searchStartY = Math.floor(height * params.lowerHalfStart);
  const lowerHalfHeight = height - searchStartY;

  // Temporal filtering: store contours from recent frames with detected subtitles
  const recentSubsFrames: ContourInfo[][] = [];

  // Final bounds (initialized to invalid values)
  let topLimit = -1;
  let bottomLimit = -1;
  let leftLimit = -1;
  let rightLimit = -1;

  let totalFramesProcessed = 0;
  let currentSample = 0;
  let totalContoursFound = 0;

  // Sample frames at regular intervals across the three intervals
  for (const interval of samplingIntervals) {
    const intervalDuration = interval.end - interval.start;
    const intervalSamples = Math.floor(intervalDuration / params.sampleIntervalMs) + 1;

    for (let i = 0; i < intervalSamples; i++) {
      const samplePos = interval.start + i * params.sampleIntervalMs;

      // Skip if we've gone past the interval end
      if (samplePos > interval.end) {
        break;
      }

      currentSample++;

      // Update progress
      if (onProgress) {
        onProgress(currentSample, numSamples);
      }

      // Seek to sample position and wait for frame
      await seekToTime(video, samplePos / 1000);

      // Extract frame from video
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, width, height);

      // Convert to OpenCV Mat
      const frame = cv.imread(canvas);

      // Only process the lower half of the frame
      const lowerHalfRect = new cv.Rect(0, searchStartY, width, lowerHalfHeight);
      const frameLower = frame.roi(lowerHalfRect);

      // Convert to grayscale
      const gray = new cv.Mat();
      cv.cvtColor(frameLower, gray, cv.COLOR_BGR2GRAY);

      // Apply binary thresholding
      const thresh = new cv.Mat();
      cv.threshold(gray, thresh, params.thresholdValue, 255, cv.THRESH_BINARY_INV);

      // Invert threshold (findContours expects white objects on black background)
      cv.bitwise_not(thresh, thresh);

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Filter contours based on area and aspect ratio
      const subsContours: ContourInfo[] = [];
      const imgArea = lowerHalfHeight * width;

      for (let j = 0; j < contours.size(); j++) {
        const contour = contours.get(j);
        const rect = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        const aspectRatio = rect.width / rect.height;

        // Filter: area > 7 && area < 0.0004 * image_area && aspect_ratio < 1.5
        if (
          area > params.minContourArea &&
          area < params.maxContourAreaFraction * imgArea &&
          aspectRatio < params.maxAspectRatio
        ) {
          subsContours.push({
            x: rect.x,
            y: rect.y,
            w: rect.width,
            h: rect.height,
          });
          totalContoursFound++;
        }

        contour.delete();
      }

      // If less than 4 contours found, discard all (subtitles usually have multiple characters)
      if (subsContours.length < params.minContoursPerFrame) {
        subsContours.length = 0;
      }

      // Store most recent frames with detected subtitles
      if (subsContours.length > 0) {
        recentSubsFrames.push(subsContours);
      }

      // Temporal filter based on vertical position distribution
      if (recentSubsFrames.length > params.temporalBufferSize - 1) {
        // Calculate average y position of contours across all recent frames
        const yPositions: number[] = [];
        const heights: number[] = [];

        for (const frameContours of recentSubsFrames) {
          for (const cnt of frameContours) {
            yPositions.push(cnt.y + cnt.h / 2);
            heights.push(cnt.h);
          }
        }

        if (yPositions.length > 0) {
          // Calculate average y position
          const avgY = yPositions.reduce((sum, y) => sum + y, 0) / yPositions.length;

          // Calculate y threshold as 2.5x average height
          const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
          const yThreshold = params.yThresholdMultiplier * avgHeight;

          // Filter contours in all recent frames based on average y position
          for (let frameIdx = 0; frameIdx < recentSubsFrames.length; frameIdx++) {
            const filteredContours: ContourInfo[] = [];

            for (const cnt of recentSubsFrames[frameIdx]) {
              const centerY = cnt.y + cnt.h / 2;
              if (Math.abs(centerY - avgY) < yThreshold) {
                filteredContours.push(cnt);
              }
            }

            // If less than 4 contours remain after filtering, clear the frame
            if (filteredContours.length < params.minContoursPerFrame) {
              recentSubsFrames[frameIdx] = [];
            } else {
              recentSubsFrames[frameIdx] = filteredContours;
            }
          }

          // Update limits based on the oldest frame (to keep worst-case scenario)
          const oldestFrameContours = recentSubsFrames.shift()!;

          for (const cnt of oldestFrameContours) {
            // Adjust coordinates to full frame (add search_start_y offset for y only)
            const fullY = searchStartY + cnt.y;
            const fullBottom = searchStartY + cnt.y + cnt.h;

            if (topLimit === -1 || fullY < topLimit) {
              topLimit = fullY;
            }
            if (bottomLimit === -1 || fullBottom > bottomLimit) {
              bottomLimit = fullBottom;
            }
            if (leftLimit === -1 || cnt.x < leftLimit) {
              leftLimit = cnt.x;
            }
            if (rightLimit === -1 || cnt.x + cnt.w > rightLimit) {
              rightLimit = cnt.x + cnt.w;
            }
          }
        }
      }

      // Clean up OpenCV resources
      frame.delete();
      frameLower.delete();
      gray.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();

      totalFramesProcessed++;
    }
  }

  // Check if we found any subtitle regions
  if (topLimit !== -1 && bottomLimit !== -1 && leftLimit !== -1 && rightLimit !== -1) {
    // Convert to percentages
    let topBound = topLimit / height;
    let bottomBound = bottomLimit / height;
    let leftBound = leftLimit / width;
    let rightBound = rightLimit / width;

    // Add margin for safety
    topBound = Math.max(0, topBound - params.margin);
    bottomBound = Math.min(1, bottomBound + params.margin);
    leftBound = Math.max(0, leftBound - params.margin);
    rightBound = Math.min(1, rightBound + params.margin);

    return {
      bounds: {
        xmin: Math.floor(leftBound * width),
        xmax: Math.floor(rightBound * width),
        ymin: Math.floor(topBound * height),
        ymax: Math.floor(bottomBound * height),
      },
      framesProcessed: totalFramesProcessed,
      contoursFound: totalContoursFound,
    };
  }

  // No text detected, return null
  return {
    bounds: null,
    framesProcessed: totalFramesProcessed,
    contoursFound: totalContoursFound,
  };
}

/**
 * Seek video to specific time and wait for it to load
 */
function seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };

    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Failed to seek to time'));
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    video.currentTime = time;
  });
}

/**
 * Visualization version that shows detected bounds on the frame
 */
export async function autoDetectWithVisualization(
  video: HTMLVideoElement,
  duration: number,
  params: AutoDetectParams = DEFAULT_AUTO_DETECT_PARAMS,
  onProgress?: (current: number, total: number) => void
): Promise<{
  result: DetectionResult;
  visualization: ImageData | null;
}> {
  const result = await autoDetectSubtitleBounds(video, duration, params, onProgress);

  if (!result.bounds) {
    return { result, visualization: null };
  }

  // Create visualization showing the detected bounds
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const { bounds } = result;

  // Draw semi-transparent red overlay on detected region
  for (let y = bounds.ymin; y <= bounds.ymax; y++) {
    for (let x = bounds.xmin; x <= bounds.xmax; x++) {
      const idx = (y * canvas.width + x) * 4;
      data[idx] = Math.min(255, data[idx] * 0.5 + 255 * 0.5); // R
      data[idx + 1] = Math.min(255, data[idx + 1] * 0.5); // G
      data[idx + 2] = Math.min(255, data[idx + 2] * 0.5); // B
    }
  }

  // Draw bounding box border (2px thick, red)
  const drawBorder = (x1: number, y1: number, x2: number, y2: number) => {
    for (let x = x1; x <= x2; x++) {
      for (let dy = 0; dy < 2; dy++) {
        const y = y1 + dy;
        if (y >= 0 && y < canvas.height) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = 255; // R
          data[idx + 1] = 0; // G
          data[idx + 2] = 0; // B
        }
      }

      for (let dy = 0; dy < 2; dy++) {
        const y = y2 - dy;
        if (y >= 0 && y < canvas.height) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = 255; // R
          data[idx + 1] = 0; // G
          data[idx + 2] = 0; // B
        }
      }
    }

    for (let y = y1; y <= y2; y++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = x1 + dx;
        if (x >= 0 && x < canvas.width) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = 255; // R
          data[idx + 1] = 0; // G
          data[idx + 2] = 0; // B
        }
      }

      for (let dx = 0; dx < 2; dx++) {
        const x = x2 - dx;
        if (x >= 0 && x < canvas.width) {
          const idx = (y * canvas.width + x) * 4;
          data[idx] = 255; // R
          data[idx + 1] = 0; // G
          data[idx + 2] = 0; // B
        }
      }
    }
  };

  drawBorder(bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax);

  return { result, visualization: imageData };
}
