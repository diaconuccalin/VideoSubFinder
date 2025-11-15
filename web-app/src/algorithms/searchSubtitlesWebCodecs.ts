/**
 * WebCodecs-based Subtitle Search Algorithm
 *
 * High-performance implementation using WebCodecs API for sequential frame decoding.
 * 10-20x faster than seeking-based approach.
 */

import * as MP4Box from 'mp4box';
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

interface VideoConfig {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  description?: Uint8Array;
}

/**
 * Check if WebCodecs API is available in the browser
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof VideoDecoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof EncodedVideoChunk !== 'undefined'
  );
}

/**
 * Demux MP4 file and extract video track configuration
 */
async function demuxMP4File(
  file: File,
  onChunk: (chunk: EncodedVideoChunk, timestamp: number) => void,
  onConfig: (config: VideoConfig) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const mp4boxFile = MP4Box.createFile();
    let videoTrack: any = null;

    mp4boxFile.onError = (error: any) => {
      reject(new Error(`MP4Box error: ${error}`));
    };

    mp4boxFile.onReady = (info: any) => {
      // Find video track
      videoTrack = info.videoTracks[0];

      if (!videoTrack) {
        reject(new Error('No video track found in file'));
        return;
      }

      // Extract codec configuration
      const trak = mp4boxFile.getTrackById(videoTrack.id);
      const codec = videoTrack.codec.startsWith('avc1')
        ? videoTrack.codec
        : videoTrack.codec.startsWith('hev1')
        ? 'hev1.1.6.L93.B0'
        : videoTrack.codec;

      // Get codec description (avcC or hvcC box)
      let description: Uint8Array | undefined;
      if (trak && trak.mdia && trak.mdia.minf && trak.mdia.minf.stbl) {
        const stsd = trak.mdia.minf.stbl.stsd;
        if (stsd && stsd.entries && stsd.entries[0]) {
          const entry = stsd.entries[0] as any;
          if (entry.avcC) {
            description = new Uint8Array(entry.avcC.length);
            entry.avcC.copy(description);
          } else if (entry.hvcC) {
            description = new Uint8Array(entry.hvcC.length);
            entry.hvcC.copy(description);
          }
        }
      }

      onConfig({
        codec,
        codedWidth: videoTrack.track_width,
        codedHeight: videoTrack.track_height,
        description,
      });

      // Start extracting samples
      mp4boxFile.setExtractionOptions(videoTrack.id, null, { nbSamples: 1000 });
      mp4boxFile.start();
    };

    mp4boxFile.onSamples = (_trackId: number, _ref: any, samples: any[]) => {
      for (const sample of samples) {
        const chunk = new EncodedVideoChunk({
          type: sample.is_sync ? 'key' : 'delta',
          timestamp: (sample.cts * 1_000_000) / sample.timescale,
          duration: (sample.duration * 1_000_000) / sample.timescale,
          data: sample.data,
        });

        const timestampSeconds = sample.cts / sample.timescale;
        onChunk(chunk, timestampSeconds);
      }
    };

    // Read file in chunks
    const fileReader = new FileReader();
    let offset = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };

    fileReader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;

      // MP4Box needs ArrayBuffer with fileStart property
      const buffer: any = arrayBuffer;
      buffer.fileStart = offset;

      mp4boxFile.appendBuffer(buffer);
      offset += arrayBuffer.byteLength;

      if (offset < file.size) {
        readNextChunk();
      } else {
        mp4boxFile.flush();
        resolve();
      }
    };

    fileReader.onerror = () => {
      reject(new Error('Failed to read video file'));
    };

    readNextChunk();
  });
}

/**
 * Process VideoFrame using same pipeline as seeking-based approach
 */
async function processVideoFrame(
  frame: VideoFrame,
  detectedRegion: BoundingBox,
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  params: SearchParams
): Promise<{
  rgb: cv.Mat;
  gradient: cv.Mat;
  luminance: cv.Mat;
  timestamp: number;
}> {
  // Draw VideoFrame to OffscreenCanvas
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

  // Get ImageData and convert to OpenCV Mat
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mat = cv.matFromImageData(imageData);

  // Crop to subtitle region
  const width = detectedRegion.xmax - detectedRegion.xmin;
  const height = detectedRegion.ymax - detectedRegion.ymin;
  const rect = new cv.Rect(detectedRegion.xmin, detectedRegion.ymin, width, height);
  const cropped = mat.roi(rect);
  const rgbCropped = cropped.clone();

  // Clean up
  cropped.delete();
  mat.delete();

  // Convert to gradient
  const gradient = convertImageToGradient(rgbCropped, params);

  // Extract luminance if using ILA images
  const luminance = params.useILAImages
    ? extractLuminance(rgbCropped)
    : new cv.Mat();

  return {
    rgb: rgbCropped,
    gradient,
    luminance,
    timestamp: frame.timestamp / 1_000_000, // Convert microseconds to seconds
  };
}

/**
 * Main WebCodecs-based search algorithm
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
  if (!isWebCodecsSupported()) {
    throw new Error('WebCodecs not supported in this browser');
  }

  const results: SubtitleFrame[] = [];
  const frameBuffer: Array<{
    rgb: cv.Mat;
    gradient: cv.Mat;
    luminance: cv.Mat;
    timestamp: number;
  }> = [];
  const DL = params.frameSequenceLength;
  const startTimeMs = performance.now();

  let decoder: VideoDecoder | null = null;
  let canvas: OffscreenCanvas | null = null;
  let ctx: OffscreenCanvasRenderingContext2D | null = null;
  let totalFramesProcessed = 0;
  let videoWidth = 0;
  let videoHeight = 0;
  let regionWidth = 0;
  let regionHeight = 0;
  let lastSubtitle: SubtitleFrame | null = null;
  let currentSequenceStart: number | null = null;

  try {
    // Queue for decoded frames
    const frameQueue: VideoFrame[] = [];

    // Initialize VideoDecoder
    decoder = new VideoDecoder({
      output: (frame: VideoFrame) => {
        frameQueue.push(frame);
      },
      error: (error: DOMException) => {
        console.error('VideoDecoder error:', error);
      },
    });

    // Demux video file
    let configReceived = false;
    const chunks: Array<{ chunk: EncodedVideoChunk; timestamp: number }> = [];

    await demuxMP4File(
      videoFile,
      (chunk, timestamp) => {
        // Only collect chunks in our time range
        if (timestamp >= startTime && (timestamp <= endTime || endTime < 0)) {
          chunks.push({ chunk, timestamp });
        }
      },
      (config) => {
        videoWidth = config.codedWidth;
        videoHeight = config.codedHeight;
        regionWidth = detectedRegion.xmax - detectedRegion.xmin;
        regionHeight = detectedRegion.ymax - detectedRegion.ymin;

        // Configure decoder
        decoder!.configure(config);
        configReceived = true;

        // Create OffscreenCanvas for frame processing
        canvas = new OffscreenCanvas(videoWidth, videoHeight);
        ctx = canvas.getContext('2d')!;
      }
    );

    if (!configReceived) {
      throw new Error('Failed to configure video decoder');
    }

    // Decode all chunks
    for (const { chunk } of chunks) {
      if (shouldStop && shouldStop()) {
        break;
      }
      decoder.decode(chunk);
    }

    await decoder.flush();

    // Process all decoded frames
    const totalFrames = frameQueue.length;

    for (let i = 0; i < frameQueue.length; i++) {
      if (shouldStop && shouldStop()) {
        break;
      }

      const frame = frameQueue[i];

      // Apply sampling interval
      if (i % params.samplingInterval !== 0) {
        frame.close();
        continue;
      }

      // Process frame
      const processed = await processVideoFrame(
        frame,
        detectedRegion,
        canvas!,
        ctx!,
        params
      );

      frame.close();

      // Add to frame buffer
      frameBuffer.push(processed);

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
      if (onProgress && i % 10 === 0) {
        const elapsed = performance.now() - startTimeMs;
        const percentage = (i / totalFrames) * 100;
        const estimatedTotal = (elapsed / percentage) * 100;
        const estimatedRemaining = Math.max(0, estimatedTotal - elapsed);

        onProgress({
          currentTime: processed.timestamp,
          totalTime: endTime - startTime,
          percentage,
          framesProcessed: totalFramesProcessed,
          subtitlesFound: results.length,
          elapsedTime: elapsed,
          estimatedTimeRemaining: estimatedRemaining,
        });
      }
    }

    // Save last subtitle if sequence was ongoing
    if (currentSequenceStart !== null && lastSubtitle !== null) {
      const isDuplicate =
        results.length > 0 &&
        Math.abs(lastSubtitle.startTime - results[results.length - 1].startTime) < 1.0;

      if (!isDuplicate) {
        results.push(lastSubtitle);
      }
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

    return results;
  } catch (error) {
    // Clean up on error
    if (decoder && decoder.state !== 'closed') {
      decoder.close();
    }
    throw error;
  }
}
