/**
 * Subtitle-related type definitions
 */

export interface SubtitleFrame {
  id: string;               // Unique identifier
  startTime: number;        // Start time in seconds
  endTime: number;          // End time in seconds
  imageData: ImageData;     // Original subtitle image
  clearedImageData?: ImageData;  // Cleared/processed image
  text?: string;            // Recognized text (after OCR)
  confidence?: number;      // OCR confidence (0-100)
}

export interface ClearedImage {
  id: string;               // Matches SubtitleFrame id
  originalImageData: ImageData;
  clearedImageData: ImageData;
  timestamp: number;        // Time in seconds
}

export interface OcrResult {
  id: string;               // Matches ClearedImage id
  text: string;             // Recognized text
  timestamp: number;        // Time in seconds
  confidence: number;       // OCR confidence (0-100)
}

export interface SubtitleEntry {
  index: number;            // Subtitle number (1, 2, 3, ...)
  startTime: number;        // Start time in seconds
  endTime: number;          // End time in seconds
  text: string;             // Subtitle text
}

export interface SubtitleFile {
  format: 'SRT' | 'VTT' | 'ASS';
  entries: SubtitleEntry[];
  content: string;          // Formatted subtitle file content
}

export interface DetectionSettings {
  moderateThreshold: number;       // 0.0 - 1.0
  segmentWidth: number;            // Pixels
  minSegmentsCount: number;        // Minimum consecutive segments
  minSumColorDiff: number;         // Color difference threshold
  minHeight: number;               // Minimum region height
  numFramesToIntersect: number;    // DL parameter (default: 6)
  textAlignment: 0 | 1 | 2 | 3;   // 0=Center, 1=Left, 2=Right, 3=Any
}

export interface ClusteringSettings {
  numClusters: 2 | 3;              // K-means cluster count
  maxIterations: number;           // K-means iterations
  imageScale: number;              // Scale for OCR (default: 4)
}

export interface OCRSettings {
  language: string;                // Tesseract language code
  mode: 'fast' | 'accurate';       // OCR mode
}
