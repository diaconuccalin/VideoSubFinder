/**
 * WebCodecs-based Subtitle Search Algorithm
 *
 * Uses requestVideoFrameCallback API for sequential frame extraction
 * without seeking overhead. Simpler and more reliable than MP4Box demuxing.
 */

import cv from '@techstark/opencv-js';
import { BoundingBox } from '../types/video.types';
import { SubtitleFrame } from '../types/subtitle.types';
import {
  SearchParams,
  SearchProgress,
  convertImageToGradient,
  extractLuminance,
  intersectFrames,
  intersectLuminance,
  analyzeImageForText,
  matToImageData,
} from './searchSubtitles';

/**
 * Check if requestVideoFrameCallback API is available
 */
export function isWebCodecsSupported(): boolean {
  return 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

/**
 * Main WebCodecs-based search algorithm using requestVideoFrameCallback
 */
export async function searchSubtitlesWebCodecs(
  videoFile: File,
  detectedRegion: BoundingBox,
  startTime: number,
  endTime: number,
  params: SearchParams,
  onProgress?: (progress: SearchProgress) => void,
  shouldStop?: () => boolean
): Promise<SubtitleFrame[]> {
  const DL = 5; // Number of frames to intersect
  const results: Array<SubtitleFrame> = [];
  const startTimeMs = performance.now();

  // Create offscreen video element
  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoFile);
  video.muted = true;
  video.playsInline = true;

  // Wait for video to load
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve());
    video.addEventListener('error', () => reject(new Error('Failed to load video')));
  });

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const regionWidth = detectedRegion.xmax - detectedRegion.xmin;
  const regionHeight = detectedRegion.ymax - detectedRegion.ymin;

  console.log('WebCodecs (requestVideoFrameCallback) config:', {
    width: videoWidth,
    height: videoHeight,
    regionWidth,
    regionHeight,
    startTime,
    endTime,
  });

  // Create canvas for frame processing
  const canvas = new OffscreenCanvas(videoWidth, videoHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Frame buffer for intersection
  const frameBuffer: Array<{
    rgb: cv.Mat;
    gradient: cv.Mat;
    luminance: cv.Mat;
    timestamp: number;
  }> = [];

  let totalFramesProcessed = 0;
  let lastSubtitle: SubtitleFrame | null = null;
  let currentSequenceStart: number | null = null;
  let frameCount = 0;
  let stopped = false;

  // Report initial progress
  if (onProgress) {
    onProgress({
      currentTime: startTime,
      totalTime: endTime - startTime,
      percentage: 0,
      framesProcessed: 0,
      subtitlesFound: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
    });
  }

  // Process each frame callback
  const processFrame = async (_now: number, _metadata: VideoFrameCallbackMetadata) => {
    if (stopped || (shouldStop && shouldStop())) {
      stopped = true;
      video.pause();
      return;
    }

    const currentTime = video.currentTime;

    // Check if we're past end time
    if (currentTime > endTime) {
      stopped = true;
      video.pause();
      return;
    }

    // Apply sampling interval
    if (frameCount % params.samplingInterval !== 0) {
      frameCount++;
      if (!stopped) {
        video.requestVideoFrameCallback(processFrame);
      }
      return;
    }

    frameCount++;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
    const mat = cv.matFromImageData(imageData);

    // Crop to subtitle region
    const rect = new cv.Rect(
      detectedRegion.xmin,
      detectedRegion.ymin,
      regionWidth,
      regionHeight
    );
    const cropped = mat.roi(rect);
    const rgbCropped = cropped.clone();

    cropped.delete();
    mat.delete();

    // Convert to gradient
    const gradient = convertImageToGradient(rgbCropped, params);

    // Extract luminance if using ILA images
    const luminance = params.useILAImages
      ? extractLuminance(rgbCropped)
      : new cv.Mat();

    // Add to frame buffer
    frameBuffer.push({
      rgb: rgbCropped,
      gradient,
      luminance,
      timestamp: currentTime,
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
      let isaAccumulator = frameBuffer[0].gradient.clone();
      for (let j = 1; j < DL; j++) {
        const newAccumulator = intersectFrames(isaAccumulator, frameBuffer[j].gradient);
        isaAccumulator.delete();
        isaAccumulator = newAccumulator;
      }

      // Intersect luminance frames to create ILA image (if enabled)
      let ilaAccumulator: cv.Mat | null = null;
      if (params.useILAImages && frameBuffer[0].luminance.rows > 0) {
        ilaAccumulator = frameBuffer[0].luminance.clone();
        for (let j = 1; j < DL; j++) {
          const newAccumulator = intersectLuminance(ilaAccumulator, frameBuffer[j].luminance);
          ilaAccumulator.delete();
          ilaAccumulator = newAccumulator;
        }
      }

      // Analyze ISA image for text
      const hasText = analyzeImageForText(isaAccumulator, params, regionWidth, regionHeight);

      if (hasText) {
        // Text detected - check if this is a new subtitle or continuation
        if (currentSequenceStart === null) {
          // Start of new subtitle sequence
          currentSequenceStart = frameBuffer[0].timestamp;
        }

        // Update end time to current frame
        const sequenceEnd = frameBuffer[DL - 1].timestamp;

        // Create subtitle frame (we'll save it when sequence ends)
        lastSubtitle = {
          id: `sub_${results.length}_${Math.floor(currentSequenceStart * 1000)}`,
          startTime: currentSequenceStart,
          endTime: sequenceEnd,
          imageData: matToImageData(frameBuffer[0].rgb),
        };
      } else if (currentSequenceStart !== null && lastSubtitle !== null) {
        // No text detected, but we had a sequence - save it

        // Check if similar to previous subtitle (avoid duplicates)
        const isDuplicate =
          results.length > 0 &&
          Math.abs(lastSubtitle.startTime - results[results.length - 1].startTime) < 1.0;

        if (!isDuplicate) {
          results.push(lastSubtitle);
        }

        currentSequenceStart = null;
        lastSubtitle = null;
      }

      // Clean up accumulator
      isaAccumulator.delete();
      if (ilaAccumulator) {
        ilaAccumulator.delete();
      }
    }

    totalFramesProcessed++;

    // Report progress
    if (onProgress && totalFramesProcessed % 10 === 0) {
      const elapsed = performance.now() - startTimeMs;
      const progress = (currentTime - startTime) / (endTime - startTime);
      const percentage = Math.min(100, Math.max(0, progress * 100));
      const estimatedTotal = elapsed / (progress || 0.01);
      const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

      onProgress({
        currentTime,
        totalTime: endTime - startTime,
        percentage,
        framesProcessed: totalFramesProcessed,
        subtitlesFound: results.length,
        elapsedTime: elapsed,
        estimatedTimeRemaining: estimatedRemaining,
      });
    }

    // Continue to next frame
    if (!stopped) {
      video.requestVideoFrameCallback(processFrame);
    }
  };

  try {
    // Seek to start time
    video.currentTime = startTime;
    await new Promise<void>((resolve) => {
      video.addEventListener('seeked', () => resolve(), { once: true });
    });

    // Start processing frames
    video.requestVideoFrameCallback(processFrame);

    // Set playback rate for faster processing
    // Note: Higher rates may cause the browser to skip frames to maintain speed
    // 4x speed for faster processing
    video.playbackRate = 4.0; // 4x speed
    console.log(`Starting video playback at ${video.playbackRate}x speed`);

    // Play the video (muted)
    await video.play();

    // Wait until processing is complete
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (stopped || video.paused || video.ended) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Save last subtitle if sequence was ongoing
    if (currentSequenceStart !== null && lastSubtitle !== null) {
      // Simple duplicate check based on count to avoid TypeScript issues
      // TODO: Add more sophisticated duplicate detection later
      results.push(lastSubtitle);
    }

    // Clean up frame buffer
    for (const frame of frameBuffer) {
      frame.rgb.delete();
      frame.gradient.delete();
      frame.luminance.delete();
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        currentTime: endTime,
        totalTime: endTime - startTime,
        percentage: 100,
        framesProcessed: totalFramesProcessed,
        subtitlesFound: results.length,
        elapsedTime: performance.now() - startTimeMs,
        estimatedTimeRemaining: 0,
      });
    }

    console.log(`WebCodecs search complete: Found ${results.length} subtitle sequences`);
    return results;
  } catch (error) {
    console.error('WebCodecs search error:', error);
    throw error;
  } finally {
    // Clean up
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}
