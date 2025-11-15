/**
 * Default settings (ported from Settings/general.cfg)
 */

import { DetectionSettings, ClusteringSettings, OCRSettings } from '../types/subtitle.types';

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  // ColorFiltration parameters
  moderateThreshold: 0.25,              // Detection sensitivity (0.0-1.0)
  segmentWidth: 8,                      // Color gradient segment size
  minSegmentsCount: 2,                  // Minimum consecutive segments
  minSumColorDiff: 800,                 // BGR diff threshold
  minHeight: 12,                        // Minimum region height

  // Subtitle search parameters
  numFramesToIntersect: 6,              // DL - frames to intersect (ISA)
  textAlignment: 0,                     // 0=Center, 1=Left, 2=Right, 3=Any
};

export const DEFAULT_CLUSTERING_SETTINGS: ClusteringSettings = {
  numClusters: 2,                       // K-means clusters (2 or 3)
  maxIterations: 30,                    // K-means iterations
  imageScale: 4,                        // Scale for OCR (4x default)
};

export const DEFAULT_OCR_SETTINGS: OCRSettings = {
  language: 'eng',                      // English only for now
  mode: 'accurate',                     // 'fast' or 'accurate'
};

/**
 * Video processing constraints
 */
export const VIDEO_CONSTRAINTS = {
  maxDuration: 3 * 60 * 60,            // 3 hours in seconds
  maxWidth: 3840,                       // 4K width
  maxHeight: 2160,                      // 4K height
  supportedFormats: [
    'video/mp4',
    'video/webm',
    'video/quicktime',                  // MOV
    'video/x-matroska',                 // MKV
    'video/avi',
    'video/x-msvideo',
  ],
};

/**
 * Performance settings
 */
export const PERFORMANCE_SETTINGS = {
  maxWorkers: navigator.hardwareConcurrency || 4,
  frameExtractionBatchSize: 10,
  indexedDBName: 'VideoSubFinderDB',
  indexedDBVersion: 1,
};

/**
 * UI settings
 */
export const UI_SETTINGS = {
  thumbnailSize: 200,                   // Thumbnail width
  maxThumbnailsPerPage: 50,
  progressUpdateInterval: 100,          // ms
};
