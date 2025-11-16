/**
 * Workflow State Caching
 *
 * Persists workflow state to localStorage with support for ImageData serialization.
 * Allows resuming work on previously processed videos across browser sessions.
 */

import { WorkflowState } from '../types/workflow.types';
import { ClearedImage, OcrResult } from '../types/subtitle.types';

const CACHE_PREFIX = 'vsf_cache_';
const CACHE_VERSION = 1;

/**
 * Generate cache key from video file metadata
 */
function getCacheKey(videoFile: File | null, videoMetadata: any): string | null {
  if (!videoFile) return null;

  // Use file name, size, and last modified as unique identifier
  const identifier = `${videoFile.name}_${videoFile.size}_${videoFile.lastModified}`;
  return `${CACHE_PREFIX}${identifier}`;
}

/**
 * Convert ImageData to base64 data URL for storage
 */
function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Convert base64 data URL back to ImageData
 */
async function dataURLToImageData(dataURL: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image from data URL'));
    img.src = dataURL;
  });
}

/**
 * Serialize workflow state for storage
 */
async function serializeState(state: WorkflowState): Promise<any> {
  // Serialize subtitle frames (with ImageData)
  const serializedFrames = await Promise.all(
    state.subtitleFrames.map(async (frame) => ({
      id: frame.id,
      startTime: frame.startTime,
      endTime: frame.endTime,
      imageData: imageDataToDataURL(frame.imageData),
    }))
  );

  // Serialize cleared images
  const serializedClearedImages = await Promise.all(
    state.clearedImages.map(async (image) => ({
      id: image.id,
      originalImageData: imageDataToDataURL(image.originalImageData),
      clearedImageData: imageDataToDataURL(image.clearedImageData),
      timestamp: image.timestamp,
    }))
  );

  return {
    version: CACHE_VERSION,
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    visitedSteps: state.visitedSteps,
    detectedRegion: state.detectedRegion,
    adjustedRegion: state.adjustedRegion,
    subtitleFrames: serializedFrames,
    clearedImages: serializedClearedImages,
    ocrResults: state.ocrResults,
    subtitleContent: state.subtitleContent,
    detectionSettings: state.detectionSettings,
    clusteringSettings: state.clusteringSettings,
    ocrSettings: state.ocrSettings,
  };
}

/**
 * Deserialize workflow state from storage
 */
async function deserializeState(serialized: any): Promise<Partial<WorkflowState>> {
  // Deserialize subtitle frames
  const subtitleFrames = await Promise.all(
    (serialized.subtitleFrames || []).map(async (frame: any) => ({
      id: frame.id,
      startTime: frame.startTime,
      endTime: frame.endTime,
      imageData: await dataURLToImageData(frame.imageData),
    }))
  );

  // Deserialize cleared images
  const clearedImages: ClearedImage[] = await Promise.all(
    (serialized.clearedImages || []).map(async (image: any) => ({
      id: image.id,
      originalImageData: await dataURLToImageData(image.originalImageData),
      clearedImageData: await dataURLToImageData(image.clearedImageData),
      timestamp: image.timestamp,
    }))
  );

  return {
    currentStep: serialized.currentStep,
    completedSteps: serialized.completedSteps || [],
    visitedSteps: serialized.visitedSteps || [],
    detectedRegion: serialized.detectedRegion || null,
    adjustedRegion: serialized.adjustedRegion || null,
    subtitleFrames,
    clearedImages,
    ocrResults: serialized.ocrResults || [],
    subtitleContent: serialized.subtitleContent || null,
    detectionSettings: serialized.detectionSettings,
    clusteringSettings: serialized.clusteringSettings,
    ocrSettings: serialized.ocrSettings,
  };
}

/**
 * Save workflow state to cache
 */
export async function saveWorkflowState(state: WorkflowState): Promise<void> {
  const cacheKey = getCacheKey(state.videoFile, state.videoMetadata);
  if (!cacheKey) return;

  try {
    const serialized = await serializeState(state);
    localStorage.setItem(cacheKey, JSON.stringify(serialized));
    console.log('Workflow state saved to cache:', cacheKey);
  } catch (error) {
    console.error('Failed to save workflow state:', error);
    // If quota exceeded, clear old caches
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCaches();
    }
  }
}

/**
 * Load workflow state from cache
 */
export async function loadWorkflowState(
  videoFile: File,
  videoMetadata: any
): Promise<Partial<WorkflowState> | null> {
  const cacheKey = getCacheKey(videoFile, videoMetadata);
  if (!cacheKey) return null;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const serialized = JSON.parse(cached);

    // Check version compatibility
    if (serialized.version !== CACHE_VERSION) {
      console.warn('Cache version mismatch, ignoring cached state');
      return null;
    }

    const deserialized = await deserializeState(serialized);
    console.log('Workflow state loaded from cache:', cacheKey);
    return deserialized;
  } catch (error) {
    console.error('Failed to load workflow state:', error);
    return null;
  }
}

/**
 * Clear cache for a specific video
 */
export function clearVideoCache(videoFile: File | null, videoMetadata: any): void {
  const cacheKey = getCacheKey(videoFile, videoMetadata);
  if (!cacheKey) return;

  localStorage.removeItem(cacheKey);
  console.log('Cleared cache:', cacheKey);
}

/**
 * Clear old caches to free up space
 */
export function clearOldCaches(): void {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

  // Remove oldest caches (simple strategy: remove half)
  const toRemove = Math.ceil(cacheKeys.length / 2);
  for (let i = 0; i < toRemove; i++) {
    localStorage.removeItem(cacheKeys[i]);
  }

  console.log(`Cleared ${toRemove} old caches`);
}

/**
 * Get all cached video identifiers
 */
export function getCachedVideos(): string[] {
  const keys = Object.keys(localStorage);
  return keys
    .filter((key) => key.startsWith(CACHE_PREFIX))
    .map((key) => key.substring(CACHE_PREFIX.length));
}
