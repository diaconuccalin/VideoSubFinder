/**
 * Color Filtration Algorithm
 *
 * JavaScript/TypeScript port of the ColorFiltration algorithm from
 * Components/IPAlgorithms/IPAlgorithms.cpp (lines 755-892)
 *
 * This algorithm detects potential subtitle regions by analyzing horizontal
 * lines for consistent color patterns, which typically indicate text areas.
 *
 * Algorithm Overview:
 * 1. Phase 1: Scan each horizontal line, divide into segments, calculate color differences
 * 2. Phase 2: Group consecutive marked lines into regions
 * 3. Phase 3: Filter, merge, and refine detected regions
 */

import { BoundingBox } from '../types/video.types';

export interface ColorFiltrationParams {
  /** Segment width in pixels (default: 8) */
  segmentWidth: number;

  /** Minimum number of consecutive segments with similar colors (default: 6) */
  minSegmentsCount: number;

  /** Minimum sum of color differences across segments (default: 800) */
  minSumColorDiff: number;

  /** Minimum region height in pixels (default: 8) */
  minHeight: number;

  /** Vertical padding to add to detected regions (default: 5) */
  yPadding: number;

  /** Horizontal padding to add to detected regions (default: 10) */
  xPadding: number;

  /** Minimum gap between regions to keep them separate (default: 10) */
  minGap: number;
}

export const DEFAULT_COLOR_FILTRATION_PARAMS: ColorFiltrationParams = {
  segmentWidth: 8,
  minSegmentsCount: 6,
  minSumColorDiff: 800,
  minHeight: 8,
  yPadding: 5,
  xPadding: 10,
  minGap: 10,
};

interface LineAnalysis {
  y: number;
  hasText: boolean;
  xmin: number;
  xmax: number;
}

/**
 * Calculate color difference between two pixels (simplified BGR distance)
 */
function colorDiff(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.abs(dr) + Math.abs(dg) + Math.abs(db);
}

/**
 * Analyze a single horizontal line for text-like patterns
 *
 * Divides the line into segments and checks if there are enough consecutive
 * segments with consistent colors (indicating text).
 */
function analyzeLine(
  imageData: ImageData,
  y: number,
  params: ColorFiltrationParams
): LineAnalysis {
  const { width } = imageData;
  const { data } = imageData;
  const { segmentWidth, minSegmentsCount, minSumColorDiff } = params;

  const numSegments = Math.floor(width / segmentWidth);
  const segmentMarks: boolean[] = new Array(numSegments).fill(false);

  // Phase 1: Analyze each segment
  for (let seg = 0; seg < numSegments; seg++) {
    const xStart = seg * segmentWidth;
    const xEnd = xStart + segmentWidth;

    // Calculate average color for this segment
    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;

    for (let x = xStart; x < xEnd && x < width; x++) {
      const idx = (y * width + x) * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      count++;
    }

    if (count === 0) continue;

    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;

    // Calculate color variance within segment
    let sumColorDiff = 0;
    for (let x = xStart; x < xEnd && x < width; x++) {
      const idx = (y * width + x) * 4;
      sumColorDiff += colorDiff(
        data[idx], data[idx + 1], data[idx + 2],
        avgR, avgG, avgB
      );
    }

    // Mark segment if it has consistent colors (low variance)
    // Text typically has consistent foreground color
    segmentMarks[seg] = sumColorDiff < minSumColorDiff;
  }

  // Phase 2: Find longest sequence of consecutive marked segments
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let bestStart = -1;
  let currentStart = -1;

  for (let seg = 0; seg < numSegments; seg++) {
    if (segmentMarks[seg]) {
      if (currentConsecutive === 0) {
        currentStart = seg;
      }
      currentConsecutive++;
    } else {
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
        bestStart = currentStart;
      }
      currentConsecutive = 0;
      currentStart = -1;
    }
  }

  // Check final sequence
  if (currentConsecutive > maxConsecutive) {
    maxConsecutive = currentConsecutive;
    bestStart = currentStart;
  }

  // Determine if this line contains text
  const hasText = maxConsecutive >= minSegmentsCount;

  let xmin = 0;
  let xmax = width - 1;

  if (hasText && bestStart >= 0) {
    xmin = bestStart * segmentWidth;
    xmax = Math.min((bestStart + maxConsecutive) * segmentWidth, width - 1);
  }

  return { y, hasText, xmin, xmax };
}

/**
 * Main ColorFiltration algorithm
 *
 * Detects potential subtitle regions by analyzing horizontal scan lines
 * for text-like color patterns.
 */
export function colorFiltration(
  imageData: ImageData,
  params: ColorFiltrationParams = DEFAULT_COLOR_FILTRATION_PARAMS
): BoundingBox[] {
  const { width, height } = imageData;

  // Phase 1: Analyze all lines (can be parallelized with Web Workers)
  const lineAnalyses: LineAnalysis[] = [];
  for (let y = 0; y < height; y++) {
    lineAnalyses.push(analyzeLine(imageData, y, params));
  }

  // Phase 2: Group consecutive lines with text into regions
  const rawRegions: BoundingBox[] = [];
  let currentRegion: BoundingBox | null = null;

  for (const analysis of lineAnalyses) {
    if (analysis.hasText) {
      if (currentRegion === null) {
        // Start new region
        currentRegion = {
          ymin: analysis.y,
          ymax: analysis.y,
          xmin: analysis.xmin,
          xmax: analysis.xmax,
        };
      } else {
        // Extend current region
        currentRegion.ymax = analysis.y;
        currentRegion.xmin = Math.min(currentRegion.xmin, analysis.xmin);
        currentRegion.xmax = Math.max(currentRegion.xmax, analysis.xmax);
      }
    } else {
      if (currentRegion !== null) {
        // End current region
        rawRegions.push(currentRegion);
        currentRegion = null;
      }
    }
  }

  // Don't forget the last region
  if (currentRegion !== null) {
    rawRegions.push(currentRegion);
  }

  // Phase 3: Filter by minimum height
  const filteredRegions = rawRegions.filter(
    region => (region.ymax - region.ymin + 1) >= params.minHeight
  );

  // Phase 4: Add padding
  const paddedRegions = filteredRegions.map(region => ({
    ymin: Math.max(0, region.ymin - params.yPadding),
    ymax: Math.min(height - 1, region.ymax + params.yPadding),
    xmin: Math.max(0, region.xmin - params.xPadding),
    xmax: Math.min(width - 1, region.xmax + params.xPadding),
  }));

  // Phase 5: Merge close regions
  if (paddedRegions.length === 0) {
    return [];
  }

  const mergedRegions: BoundingBox[] = [paddedRegions[0]];

  for (let i = 1; i < paddedRegions.length; i++) {
    const current = paddedRegions[i];
    const last = mergedRegions[mergedRegions.length - 1];

    // Check if regions are close enough to merge
    const gap = current.ymin - last.ymax;

    if (gap <= params.minGap) {
      // Merge with last region
      last.ymax = current.ymax;
      last.xmin = Math.min(last.xmin, current.xmin);
      last.xmax = Math.max(last.xmax, current.xmax);
    } else {
      // Keep as separate region
      mergedRegions.push(current);
    }
  }

  return mergedRegions;
}

/**
 * Apply color filtration with visualization
 *
 * Returns both the detected regions and a visualization ImageData
 * showing the detected areas highlighted.
 */
export function colorFiltrationWithVisualization(
  imageData: ImageData,
  params: ColorFiltrationParams = DEFAULT_COLOR_FILTRATION_PARAMS
): { regions: BoundingBox[]; visualization: ImageData } {
  // Detect regions
  const regions = colorFiltration(imageData, params);

  // Create visualization
  const visualization = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const { data, width } = visualization;

  // Draw semi-transparent overlay on detected regions
  for (const region of regions) {
    for (let y = region.ymin; y <= region.ymax; y++) {
      for (let x = region.xmin; x <= region.xmax; x++) {
        const idx = (y * width + x) * 4;

        // Add red overlay with 50% transparency
        data[idx] = Math.min(255, data[idx] * 0.5 + 255 * 0.5);     // R
        data[idx + 1] = Math.min(255, data[idx + 1] * 0.5);         // G
        data[idx + 2] = Math.min(255, data[idx + 2] * 0.5);         // B
      }
    }

    // Draw bounding box border (2px thick)
    const borderColor = { r: 255, g: 0, b: 0, a: 255 }; // Red

    // Top border
    for (let x = region.xmin; x <= region.xmax; x++) {
      for (let dy = 0; dy < 2; dy++) {
        const y = region.ymin + dy;
        if (y >= 0 && y < visualization.height) {
          const idx = (y * width + x) * 4;
          data[idx] = borderColor.r;
          data[idx + 1] = borderColor.g;
          data[idx + 2] = borderColor.b;
        }
      }
    }

    // Bottom border
    for (let x = region.xmin; x <= region.xmax; x++) {
      for (let dy = 0; dy < 2; dy++) {
        const y = region.ymax - dy;
        if (y >= 0 && y < visualization.height) {
          const idx = (y * width + x) * 4;
          data[idx] = borderColor.r;
          data[idx + 1] = borderColor.g;
          data[idx + 2] = borderColor.b;
        }
      }
    }

    // Left border
    for (let y = region.ymin; y <= region.ymax; y++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = region.xmin + dx;
        if (x >= 0 && x < width) {
          const idx = (y * width + x) * 4;
          data[idx] = borderColor.r;
          data[idx + 1] = borderColor.g;
          data[idx + 2] = borderColor.b;
        }
      }
    }

    // Right border
    for (let y = region.ymin; y <= region.ymax; y++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = region.xmax - dx;
        if (x >= 0 && x < width) {
          const idx = (y * width + x) * 4;
          data[idx] = borderColor.r;
          data[idx + 1] = borderColor.g;
          data[idx + 2] = borderColor.b;
        }
      }
    }
  }

  return { regions, visualization };
}
