/**
 * Video Frame Extraction Utilities
 *
 * Provides functions for extracting frames from HTML5 video elements
 * and converting them to ImageData for processing.
 */

export interface ExtractedFrame {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
}

/**
 * Extract a single frame from a video element at the current playback position
 */
export function extractVideoFrame(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): ImageData {
  const width = video.videoWidth;
  const height = video.videoHeight;

  // Create or reuse canvas
  const ctx = canvas
    ? canvas.getContext('2d', { willReadFrequently: true })
    : document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.canvas.width = width;
  ctx.canvas.height = height;

  // Draw current video frame to canvas
  ctx.drawImage(video, 0, 0, width, height);

  // Extract image data
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Extract a frame at a specific timestamp
 */
export async function extractFrameAtTime(
  video: HTMLVideoElement,
  timestamp: number,
  canvas?: HTMLCanvasElement
): Promise<ExtractedFrame> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);

      try {
        const imageData = extractVideoFrame(video, canvas);
        const frameRate = 25; // Default, will be updated from metadata
        const frameNumber = Math.floor(timestamp * frameRate);

        resolve({
          imageData,
          timestamp,
          frameNumber,
        });
      } catch (error) {
        reject(error);
      }
    };

    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Failed to seek to timestamp'));
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Seek to timestamp
    video.currentTime = timestamp;
  });
}

/**
 * Extract multiple frames at specified timestamps
 */
export async function extractMultipleFrames(
  video: HTMLVideoElement,
  timestamps: number[],
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  const canvas = document.createElement('canvas');

  for (let i = 0; i < timestamps.length; i++) {
    const frame = await extractFrameAtTime(video, timestamps[i], canvas);
    frames.push(frame);

    if (onProgress) {
      onProgress(i + 1, timestamps.length);
    }
  }

  return frames;
}

/**
 * Sample frames at regular intervals throughout the video
 */
export function generateSampleTimestamps(
  duration: number,
  interval: number = 1.0, // Sample every second by default
  startTime: number = 0,
  endTime?: number
): number[] {
  const end = endTime ?? duration;
  const timestamps: number[] = [];

  for (let t = startTime; t < end; t += interval) {
    timestamps.push(t);
  }

  // Always include the end time if it's not already included
  if (timestamps[timestamps.length - 1] !== end && end <= duration) {
    timestamps.push(end);
  }

  return timestamps;
}

/**
 * Convert ImageData from RGBA to RGB (drop alpha channel)
 */
export function imageDataToRGB(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const rgb = new Uint8Array(width * height * 3);

  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i];         // R
    rgb[j + 1] = data[i + 1]; // G
    rgb[j + 2] = data[i + 2]; // B
  }

  return rgb;
}

/**
 * Convert RGB data back to ImageData (add alpha channel)
 */
export function rgbToImageData(
  rgb: Uint8Array,
  width: number,
  height: number
): ImageData {
  const imageData = new ImageData(width, height);
  const { data } = imageData;

  for (let i = 0, j = 0; j < rgb.length; i += 4, j += 3) {
    data[i] = rgb[j];         // R
    data[i + 1] = rgb[j + 1]; // G
    data[i + 2] = rgb[j + 2]; // B
    data[i + 3] = 255;        // A (fully opaque)
  }

  return imageData;
}
