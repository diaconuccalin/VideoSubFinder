/**
 * Video-related type definitions
 */

export interface VideoMetadata {
  duration: number;         // Duration in seconds
  width: number;            // Video width in pixels
  height: number;           // Video height in pixels
  frameRate: number;        // Frames per second
  fileName: string;         // Original file name
  fileSize: number;         // File size in bytes
  format: string;           // Video format (mp4, webm, etc.)
}

export interface VideoFrame {
  timestamp: number;        // Time in seconds
  frameNumber: number;      // Frame index
  imageData: ImageData;     // Canvas ImageData
}

export interface BoundingBox {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}
