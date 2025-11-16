/**
 * Workflow state management types
 */

import { VideoMetadata, BoundingBox } from './video.types';
import { SubtitleFrame, DetectionSettings, ClusteringSettings, OCRSettings, ClearedImage, OcrResult } from './subtitle.types';

export type WorkflowStep =
  | 'video-select'
  | 'auto-detect'
  | 'manual-adjust'
  | 'search-subtitles'
  | 'clear-images'
  | 'manual-cleanup'
  | 'ocr'
  | 'generate-subs';

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  visitedSteps: WorkflowStep[];  // Tracks all steps that have been visited

  // Step 1: Video Selection
  videoFile: File | null;
  videoMetadata: VideoMetadata | null;
  videoUrl: string | null;

  // Step 2: Auto Detection
  detectedRegion: BoundingBox | null;

  // Step 3: Manual Adjustment
  adjustedRegion: BoundingBox | null;

  // Step 4: Search Subtitles
  subtitleFrames: SubtitleFrame[];
  searchProgress: number;
  isSearching: boolean;

  // Step 5: Clear Images
  clearedImages: ClearedImage[];
  clearProgress: number;
  isClearing: boolean;

  // Step 6: Manual Cleanup
  acceptedFrames: Set<string>;
  rejectedFrames: Set<string>;

  // Step 7: OCR
  ocrResults: OcrResult[];
  ocrProgress: number;
  isProcessingOCR: boolean;

  // Step 8: Generate Subtitles
  subtitleContent: string | null;

  // Settings
  detectionSettings: DetectionSettings;
  clusteringSettings: ClusteringSettings;
  ocrSettings: OCRSettings;
}

export interface WorkflowAction {
  type: string;
  payload?: any;
}

export interface ProcessingProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
  estimatedTimeRemaining?: number;  // seconds
}
