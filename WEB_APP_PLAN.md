# VideoSubFinder Web Application - Implementation Plan

**Target**: Browser-based subtitle extraction tool hosted on GitHub Pages
**Computation**: 100% client-side (no server required)
**Technology**: Modern JavaScript, OpenCV.js, Tesseract.js

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Implementation Phases](#implementation-phases)
5. [Algorithm Porting Strategy](#algorithm-porting-strategy)
6. [UI/UX Design](#uiux-design)
7. [Performance Optimization](#performance-optimization)
8. [Deployment Strategy](#deployment-strategy)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Application                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   UI Layer   │  │ Worker Pool  │  │  IndexedDB   │ │
│  │  (React +    │  │ (Parallel    │  │  (Storage)   │ │
│  │  Tailwind)   │  │  Processing) │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────┴──────────────────┴──────────────────┴──────┐ │
│  │          VideoSubFinder Core Engine                │ │
│  │  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │  OpenCV.js   │  │ Tesseract.js │              │ │
│  │  │  (Image      │  │  (OCR        │              │ │
│  │  │  Processing) │  │  Engine)     │              │ │
│  │  └──────────────┘  └──────────────┘              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Video File (local) → HTML5 Video API
   ↓
2. Frame Extraction → Canvas API → ImageData
   ↓
3. Subtitle Detection → OpenCV.js (Edge Detection, Thresholding)
   ↓
4. Position Autodetection → Custom Algorithm (ported from C++)
   ↓
5. User Adjustment → Interactive Canvas Overlay
   ↓
6. Full Video Search → Web Worker Pool (parallel processing)
   ↓
7. Image Clearing → K-means Clustering (OpenCV.js)
   ↓
8. Manual Cleanup → Canvas Image Editor
   ↓
9. OCR Processing → Tesseract.js
   ↓
10. Subtitle Generation → SRT/VTT formatter
```

---

## Technology Stack

### Core Technologies

**Frontend Framework**: **React 18** with TypeScript
- Component-based architecture
- React Hooks for state management
- TypeScript for type safety
- Fast refresh for development

**Build Tool**: **Vite**
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- ES modules support
- GitHub Pages deployment plugin

**UI Framework**: **Tailwind CSS** + **shadcn/ui**
- Modern, responsive design
- Dark mode support
- Accessible components
- Customizable theming

### Image Processing & Computer Vision

**OpenCV.js** (v4.8.0)
- WebAssembly-based OpenCV for JavaScript
- Core functions: cvtColor, Sobel, kmeans, threshold, findContours
- Performance: ~70-80% of native OpenCV speed

**Custom Algorithms** (ported from C++)
- Custom Sobel implementation (ImprovedSobelMEdge)
- Multi-frame intersection logic
- Subtitle region detection
- Frame comparison algorithms

### OCR Engine

**Tesseract.js** (v4.1.0)
- Browser-based OCR (WebAssembly)
- Multiple language support
- Configurable recognition modes
- Progress tracking

### Video Processing

**HTML5 Video API**
- Video playback and seeking
- Frame extraction via Canvas
- No external dependencies

**Web Workers** (Parallel Processing)
- Offload heavy computation from main thread
- Process multiple frames simultaneously
- Progress reporting

### Storage

**IndexedDB**
- Store intermediate results (frames, images)
- Resume interrupted sessions
- Export/import project data

**LocalStorage**
- User preferences
- Configuration settings

### Additional Libraries

**File Handling**:
- FileSaver.js - Save generated subtitle files

**Progress Tracking**:
- React Context API - Global state management

**Notifications**:
- React Hot Toast - User feedback

---

## Project Structure

```
web-app/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── opencv.js                    # OpenCV.js WASM
│   └── tesseract-core.wasm.js       # Tesseract WASM
│
├── src/
│   ├── components/                  # React Components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── FileInput.tsx
│   │   │   └── Canvas.tsx
│   │   │
│   │   ├── steps/                   # 8-Step Workflow Components
│   │   │   ├── Step1_VideoSelect.tsx
│   │   │   ├── Step2_AutoDetection.tsx
│   │   │   ├── Step3_ManualAdjust.tsx
│   │   │   ├── Step4_SearchSubtitles.tsx
│   │   │   ├── Step5_ClearImages.tsx
│   │   │   ├── Step6_ManualCleanup.tsx
│   │   │   ├── Step7_OCR.tsx
│   │   │   └── Step8_GenerateSubtitles.tsx
│   │   │
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VideoControls.tsx
│   │   │   └── FrameExtractor.tsx
│   │   │
│   │   ├── image/
│   │   │   ├── ImageViewer.tsx
│   │   │   ├── ImageEditor.tsx
│   │   │   └── ImageGallery.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── WorkflowStepper.tsx
│   │
│   ├── core/                        # Core Algorithm Implementations
│   │   ├── VideoProcessor.ts
│   │   │   ├── extractFrame()
│   │   │   ├── extractFrameRange()
│   │   │   └── getVideoMetadata()
│   │   │
│   │   ├── SubtitleDetector.ts      # Ported from SSAlgorithms.cpp
│   │   │   ├── autoDetectPosition()
│   │   │   ├── searchSubtitles()
│   │   │   ├── compareSubtitles()
│   │   │   └── generateTimings()
│   │   │
│   │   ├── ImageProcessor.ts        # Ported from IPAlgorithms.cpp
│   │   │   ├── getTransformedImage()
│   │   │   ├── improvedSobelEdge()
│   │   │   ├── applyModerateThreshold()
│   │   │   ├── colorFiltration()
│   │   │   ├── kmeansClustering()
│   │   │   ├── clearImageByTextColor()
│   │   │   └── findTextLines()
│   │   │
│   │   ├── FrameAnalyzer.ts
│   │   │   ├── intersectFrames()
│   │   │   ├── generateISAImage()
│   │   │   └── generateILAImage()
│   │   │
│   │   ├── OCREngine.ts
│   │   │   ├── recognizeText()
│   │   │   ├── batchRecognize()
│   │   │   └── configureEngine()
│   │   │
│   │   └── SubtitleGenerator.ts
│   │       ├── generateSRT()
│   │       ├── generateVTT()
│   │       └── generateASS()
│   │
│   ├── workers/                     # Web Workers
│   │   ├── frame-extraction.worker.ts
│   │   ├── subtitle-search.worker.ts
│   │   ├── image-processing.worker.ts
│   │   └── ocr.worker.ts
│   │
│   ├── utils/
│   │   ├── opencv-utils.ts          # OpenCV.js helpers
│   │   ├── image-utils.ts
│   │   ├── file-utils.ts
│   │   └── validation.ts
│   │
│   ├── types/
│   │   ├── video.types.ts
│   │   ├── subtitle.types.ts
│   │   ├── image.types.ts
│   │   └── workflow.types.ts
│   │
│   ├── config/
│   │   └── settings.ts              # Default settings (from general.cfg)
│   │
│   ├── hooks/                       # React Custom Hooks
│   │   ├── useVideoProcessor.ts
│   │   ├── useSubtitleDetector.ts
│   │   ├── useImageEditor.ts
│   │   └── useIndexedDB.ts
│   │
│   ├── context/
│   │   ├── WorkflowContext.tsx
│   │   └── SettingsContext.tsx
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── docs/
│   ├── API.md
│   ├── ALGORITHMS.md
│   └── DEPLOYMENT.md
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Implementation Phases

### Phase 1: Project Setup (Day 1)

**Tasks**:
- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS
- [x] Set up ESLint + Prettier
- [x] Install core dependencies (OpenCV.js, Tesseract.js)
- [x] Create basic project structure
- [x] Set up GitHub repository

**Deliverables**:
- Working development environment
- Basic React app running locally

---

### Phase 2: Video Handling & Frame Extraction (Days 2-3)

**Tasks**:
- [ ] Implement VideoProcessor.ts
  - File input handling
  - Video metadata extraction
  - Frame extraction to Canvas
  - Seek to specific timestamps
- [ ] Create VideoPlayer component
  - Playback controls
  - Frame-by-frame navigation
  - Timeline display
- [ ] Build FrameExtractor utility
  - Extract single frame
  - Extract frame range
  - Convert to ImageData/Mat
- [ ] Test with various video formats (MP4, WebM, MKV)

**Deliverables**:
- Step 1: Video selection UI
- Working video player with frame extraction

---

### Phase 3: Subtitle Position Autodetection (Days 4-6)

**Tasks**:
- [ ] Port ColorFiltration algorithm from IPAlgorithms.cpp
  ```typescript
  function colorFiltration(
    imageData: ImageData,
    threshold: number = 800
  ): { ymin: number; ymax: number; xmin: number; xmax: number }
  ```
- [ ] Implement horizontal gradient detection
- [ ] Implement vertical region grouping
- [ ] Create interactive ROI selector
- [ ] Add preview overlay on video

**Deliverables**:
- Step 2: Autodetection working
- Visual feedback of detected region

---

### Phase 4: Manual Adjustment UI (Day 7)

**Tasks**:
- [ ] Create draggable bounding box overlay
- [ ] Implement corner/edge resize handles
- [ ] Add coordinate display
- [ ] Save adjusted bounds to state
- [ ] Add reset to auto-detected values

**Deliverables**:
- Step 3: Manual adjustment UI
- Smooth, intuitive interaction

---

### Phase 5: Core Image Processing Algorithms (Days 8-12)

**Tasks**:
- [ ] Port ImprovedSobelMEdge algorithm
  ```typescript
  function improvedSobelEdge(
    src: cv.Mat,
    dst: cv.Mat,
    w: number,
    h: number
  ): void
  ```
- [ ] Implement GetTransformedImage (YUV conversion + Sobel)
- [ ] Port ApplyModerateThreshold
- [ ] Implement multi-frame intersection
  ```typescript
  function intersectFrames(frames: cv.Mat[], numFrames: number): cv.Mat
  ```
- [ ] Create ISA image generator
- [ ] Create ILA image generator (optional)
- [ ] Test algorithms against C++ outputs

**Deliverables**:
- Parity with C++ edge detection
- Working frame intersection

---

### Phase 6: Subtitle Search Implementation (Days 13-17)

**Tasks**:
- [ ] Port FastSearchSubtitles main loop
  ```typescript
  async function searchSubtitles(
    video: HTMLVideoElement,
    bounds: BoundingBox,
    startTime: number,
    endTime: number,
    onProgress: (progress: number) => void
  ): Promise<SubtitleFrame[]>
  ```
- [ ] Implement Web Worker for parallel frame processing
- [ ] Add progress tracking
- [ ] Implement frame comparison (CompareTwoSubsOptimal)
- [ ] Generate timing data (output.txt equivalent)
- [ ] Save subtitle images to IndexedDB
- [ ] Create results visualization

**Deliverables**:
- Step 4: Working subtitle search
- Progress bar, estimated time
- Searchable results gallery

---

### Phase 7: Image Clearing (K-means) (Days 18-21)

**Tasks**:
- [ ] Implement K-means wrapper for OpenCV.js
  ```typescript
  function kmeansClustering(
    image: cv.Mat,
    numClusters: number,
    iterations: number
  ): { labels: cv.Mat; centers: cv.Mat }
  ```
- [ ] Port GetMainColorImage logic
- [ ] Implement text cluster identification
- [ ] Port FindTextLines algorithm
- [ ] Implement connected component analysis
- [ ] Add image scaling (4x for OCR)
- [ ] Create Web Worker for batch processing
- [ ] Store cleared images in IndexedDB

**Deliverables**:
- Step 5: Cleared text images
- Batch processing with progress

---

### Phase 8: Manual Image Cleanup UI (Days 22-23)

**Tasks**:
- [ ] Create ImageEditor component
  - Canvas-based pixel editor
  - Brush tool (erase artifacts)
  - Brightness/contrast adjustment
  - Crop tool
  - Undo/redo functionality
- [ ] Build ImageGallery for batch review
- [ ] Add "accept/reject" workflow
- [ ] Implement image export

**Deliverables**:
- Step 6: Image editing interface
- Keyboard shortcuts for efficiency

---

### Phase 9: OCR Integration (Days 24-26)

**Tasks**:
- [ ] Configure Tesseract.js
  ```typescript
  async function recognizeText(
    image: ImageData,
    language: string = 'eng'
  ): Promise<string>
  ```
- [ ] Implement batch OCR processing
- [ ] Create OCR progress tracking
- [ ] Add language selection
- [ ] Implement OCR result review/editing
- [ ] Use Web Worker for OCR
- [ ] Add confidence scoring

**Deliverables**:
- Step 7: Working OCR
- Editable results with confidence indicators

---

### Phase 10: Subtitle File Generation (Days 27-28)

**Tasks**:
- [ ] Implement SRT formatter
  ```typescript
  function generateSRT(
    subtitles: { text: string; start: number; end: number }[]
  ): string
  ```
- [ ] Implement VTT formatter
- [ ] Implement ASS/SSA formatter (optional)
- [ ] Add timing adjustment UI
- [ ] Implement merge/split functionality
- [ ] Create subtitle preview player
- [ ] Add download functionality

**Deliverables**:
- Step 8: Subtitle file generation
- Multiple format support

---

### Phase 11: UI/UX Polish (Days 29-31)

**Tasks**:
- [ ] Design modern landing page
- [ ] Create workflow stepper/progress indicator
- [ ] Add dark mode toggle
- [ ] Implement responsive design (mobile-friendly)
- [ ] Add keyboard shortcuts
- [ ] Create help/tutorial tooltips
- [ ] Add settings panel (algorithm parameters)
- [ ] Implement project save/load (IndexedDB)
- [ ] Add error handling & user-friendly messages
- [ ] Create demo video/GIF

**Deliverables**:
- Polished, professional UI
- Excellent user experience

---

### Phase 12: Testing & Optimization (Days 32-35)

**Tasks**:
- [ ] Performance profiling
- [ ] Optimize Web Worker communication
- [ ] Implement memory management (release cv.Mat objects)
- [ ] Add browser compatibility checks
- [ ] Test with various video sizes (480p, 720p, 1080p, 4K)
- [ ] Test with different subtitle styles
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS, Android)
- [ ] Create test suite for algorithms

**Deliverables**:
- Performance benchmarks
- Bug fixes
- Compatibility matrix

---

### Phase 13: Documentation & Deployment (Days 36-38)

**Tasks**:
- [ ] Write comprehensive README.md
- [ ] Create user guide
- [ ] Document algorithm differences from C++ version
- [ ] Set up GitHub Pages deployment
- [ ] Configure custom domain (optional)
- [ ] Add analytics (optional, privacy-respecting)
- [ ] Create landing page with examples
- [ ] Submit to relevant communities (Reddit, Hacker News)

**Deliverables**:
- Live application on GitHub Pages
- Complete documentation

---

## Algorithm Porting Strategy

### Priority Algorithms (Must Port Exactly)

#### 1. ColorFiltration (Step 2: Autodetection)

**C++ Source**: `Components/IPAlgorithms/IPAlgorithms.cpp:755-892`

**JavaScript Implementation**:
```typescript
interface ColorFiltrationResult {
  ymin: number;
  ymax: number;
  xmin: number;
  xmax: number;
}

function colorFiltration(
  imageData: ImageData,
  config: {
    segmentWidth: number;        // default: 8
    minSegmentsCount: number;    // default: 2
    minSumColorDiff: number;     // default: 800
    minHeight: number;           // default: 12
  }
): ColorFiltrationResult {
  const { width, height, data } = imageData;
  const { segmentWidth, minSegmentsCount, minSumColorDiff, minHeight } = config;

  const lines: number[] = [];  // Lines with text

  // Process each horizontal line
  for (let y = 0; y < height; y++) {
    let consecutiveSegments = 0;

    // Divide line into segments
    for (let x = 0; x < width - segmentWidth; x += segmentWidth) {
      let segmentDiff = 0;

      // Compare consecutive pixels in segment
      for (let dx = 0; dx < segmentWidth - 1; dx++) {
        const idx1 = (y * width + x + dx) * 4;
        const idx2 = (y * width + x + dx + 1) * 4;

        // BGR color difference
        const diffB = Math.abs(data[idx1] - data[idx2]);
        const diffG = Math.abs(data[idx1 + 1] - data[idx2 + 1]);
        const diffR = Math.abs(data[idx1 + 2] - data[idx2 + 2]);

        segmentDiff += diffB + diffG + diffR;
      }

      // Check if segment has high color variance (text edge)
      if (segmentDiff >= minSumColorDiff) {
        consecutiveSegments++;
      } else {
        consecutiveSegments = 0;
      }

      // Mark line if enough consecutive segments found
      if (consecutiveSegments >= minSegmentsCount) {
        lines.push(y);
        break;  // Move to next line
      }
    }
  }

  // Group consecutive lines into regions
  const regions: Array<{ start: number; end: number }> = [];
  let regionStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (regionStart === -1) {
      regionStart = lines[i];
    }

    // Check if next line is consecutive
    if (i === lines.length - 1 || lines[i + 1] !== lines[i] + 1) {
      const regionEnd = lines[i];
      const regionHeight = regionEnd - regionStart + 1;

      // Filter by minimum height
      if (regionHeight >= minHeight) {
        regions.push({
          start: Math.max(0, regionStart - 12),  // Expand by 12px
          end: Math.min(height - 1, regionEnd + 12)
        });
      }

      regionStart = -1;
    }
  }

  // Return largest region (likely subtitle area)
  if (regions.length === 0) {
    return { ymin: 0, ymax: height - 1, xmin: 0, xmax: width - 1 };
  }

  const largestRegion = regions.reduce((max, region) =>
    (region.end - region.start) > (max.end - max.start) ? region : max
  );

  return {
    ymin: largestRegion.start,
    ymax: largestRegion.end,
    xmin: 0,
    xmax: width - 1
  };
}
```

---

#### 2. ImprovedSobelMEdge (Step 4: Edge Detection)

**C++ Source**: `Components/IPAlgorithms/IPAlgorithms.cpp:894-951`

**JavaScript Implementation**:
```typescript
function improvedSobelEdge(
  src: cv.Mat,
  dst: cv.Mat
): void {
  const width = src.cols;
  const height = src.rows;

  // Create output matrix
  dst.create(height, width, cv.CV_8UC1);

  const srcData = src.data;
  const dstData = dst.data;

  // Process each pixel (skip border)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Get 8 surrounding pixels
      const topLeft = srcData[(y - 1) * width + (x - 1)];
      const topCenter = srcData[(y - 1) * width + x];
      const topRight = srcData[(y - 1) * width + (x + 1)];
      const midLeft = srcData[y * width + (x - 1)];
      const midRight = srcData[y * width + (x + 1)];
      const botLeft = srcData[(y + 1) * width + (x - 1)];
      const botCenter = srcData[(y + 1) * width + x];
      const botRight = srcData[(y + 1) * width + (x + 1)];

      // Calculate gradients
      const val1 = topLeft - botRight;
      const val2 = topRight - botLeft;
      const val3 = topCenter - botCenter;
      const val4 = midLeft - midRight;

      // Four directional gradients
      const grad1 = Math.abs(3 * (val1 + val2) + 10 * val3);  // Vertical
      const grad2 = Math.abs(3 * (val1 - val2) + 10 * val4);  // Horizontal
      const grad3 = Math.abs(3 * (val3 + val4) + 10 * val1);  // Diagonal 1
      const grad4 = Math.abs(3 * (val3 - val4) + 10 * val2);  // Diagonal 2

      // Take maximum gradient
      const maxGrad = Math.max(grad1, grad2, grad3, grad4);

      // Normalize to 0-255
      dstData[idx] = Math.min(255, maxGrad / 16);
    }
  }
}
```

---

#### 3. ApplyModerateThreshold (Step 4: Thresholding)

**C++ Source**: `Components/IPAlgorithms/IPAlgorithms.cpp:1371-1400`

**JavaScript Implementation**:
```typescript
function applyModerateThreshold(
  src: cv.Mat,
  dst: cv.Mat,
  threshold: number = 0.25  // 0.0 - 1.0
): void {
  const width = src.cols;
  const height = src.rows;

  dst.create(height, width, cv.CV_8UC1);

  const srcData = src.data;
  const dstData = dst.data;

  // Find max value in image
  let maxVal = 0;
  for (let i = 0; i < srcData.length; i++) {
    if (srcData[i] > maxVal) maxVal = srcData[i];
  }

  const thresholdVal = maxVal * threshold;

  // Apply threshold
  for (let i = 0; i < srcData.length; i++) {
    dstData[i] = srcData[i] > thresholdVal ? 255 : 0;
  }
}
```

---

#### 4. IntersectFrames (Step 4: Multi-frame Analysis)

**C++ Source**: `Components/IPAlgorithms/SSAlgorithms.cpp:1200+`

**JavaScript Implementation**:
```typescript
function intersectFrames(frames: cv.Mat[]): cv.Mat {
  if (frames.length === 0) {
    throw new Error('No frames to intersect');
  }

  const result = frames[0].clone();

  for (let i = 1; i < frames.length; i++) {
    cv.bitwise_and(result, frames[i], result);
  }

  return result;
}
```

---

#### 5. KMeansClustering (Step 5: Image Clearing)

**C++ Source**: `Components/IPAlgorithms/IPAlgorithms.cpp:2494-2780`

**JavaScript Implementation**:
```typescript
interface KMeansResult {
  labels: cv.Mat;
  centers: cv.Mat;
  textClusterId: number;
}

function kmeansClustering(
  image: cv.Mat,
  edgeMask: cv.Mat,
  numClusters: number = 2,
  iterations: number = 30
): KMeansResult {
  const width = image.cols;
  const height = image.rows;

  // Step 1: Collect pixels from edge-detected areas only
  const samples: number[] = [];
  const sampleIndices: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      if (edgeMask.data[idx] !== 0) {
        // Get BGR values
        const b = image.data[idx * 3];
        const g = image.data[idx * 3 + 1];
        const r = image.data[idx * 3 + 2];

        samples.push(b, g, r);
        sampleIndices.push(idx);
      }
    }
  }

  const numSamples = samples.length / 3;

  // Create samples matrix for OpenCV
  const samplesMat = cv.matFromArray(numSamples, 1, cv.CV_32FC3, samples);

  // Prepare output matrices
  const labels = new cv.Mat();
  const centers = new cv.Mat();
  const criteria = new cv.TermCriteria(
    cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER,
    iterations,
    0.001
  );

  // Run K-means
  cv.kmeans(
    samplesMat,
    numClusters,
    labels,
    criteria,
    1,  // attempts
    cv.KMEANS_PP_CENTERS
  );

  // Step 2: Create color → cluster lookup table
  const colorToCluster = new Map<string, number>();

  for (let i = 0; i < numSamples; i++) {
    const b = Math.round(samples[i * 3]);
    const g = Math.round(samples[i * 3 + 1]);
    const r = Math.round(samples[i * 3 + 2]);
    const key = `${b},${g},${r}`;
    const clusterId = labels.data32S[i];

    colorToCluster.set(key, clusterId);
  }

  // Step 3: Apply clustering to all pixels
  const allLabels = new cv.Mat(height, width, cv.CV_32S);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const b = image.data[idx * 3];
      const g = image.data[idx * 3 + 1];
      const r = image.data[idx * 3 + 2];
      const key = `${b},${g},${r}`;

      allLabels.data32S[idx] = colorToCluster.get(key) ?? 0;
    }
  }

  // Step 4: Identify text cluster (highest edge overlap)
  const clusterEdgeCounts = new Array(numClusters).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      if (edgeMask.data[idx] !== 0) {
        const clusterId = allLabels.data32S[idx];
        clusterEdgeCounts[clusterId]++;
      }
    }
  }

  const textClusterId = clusterEdgeCounts.indexOf(Math.max(...clusterEdgeCounts));

  // Cleanup
  samplesMat.delete();

  return {
    labels: allLabels,
    centers,
    textClusterId
  };
}
```

---

### Simplified Algorithms (Close Approximation OK)

#### 1. Frame Comparison (CompareTwoSubsOptimal)

- **C++**: Complex line-by-line pixel comparison with tolerance
- **JS**: Simpler structural similarity (SSIM) or histogram comparison

#### 2. Connected Component Analysis (FindTextLines)

- **C++**: Custom flood-fill implementation
- **JS**: Use OpenCV.js `cv.connectedComponentsWithStats()`

---

## UI/UX Design

### Design Principles

1. **Progressive Disclosure**: Show only relevant controls for current step
2. **Visual Feedback**: Clear progress indicators, real-time previews
3. **Error Recovery**: Allow users to go back and adjust
4. **Performance Transparency**: Show processing time estimates
5. **Accessibility**: Keyboard shortcuts, ARIA labels, high contrast

### Wireframe: Main Application Layout

```
┌─────────────────────────────────────────────────────────────┐
│  VideoSubFinder Web                            [Dark Mode ⚫]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 1. Select   │→ │ 2. Detect   │→ │ 3. Adjust   │→ ...    │
│  │    Video    │  │    Position │  │    Region   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │              Video Preview / Image Viewer               ││
│  │                                                          ││
│  │                  [Large Canvas Area]                    ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Controls Panel                                         ││
│  │  [Step-specific controls and settings]                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [Progress Bar: ████████░░░░░░░░░░ 45%]  [Cancel] [Next]   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step UI Mockups

#### Step 1: Video Selection
```
┌─────────────────────────────────────────┐
│  Drop video file here                   │
│  or click to browse                     │
│                                          │
│  📁 Supported: MP4, WebM, MKV, AVI     │
│                                          │
│  [Browse Files]                         │
└─────────────────────────────────────────┘

Once selected:
┌─────────────────────────────────────────┐
│  my_video.mp4                           │
│  Duration: 01:23:45                     │
│  Resolution: 1920x1080                  │
│  Size: 245 MB                           │
│                                          │
│  [Change File]  [Next: Detect Position]│
└─────────────────────────────────────────┘
```

#### Step 2: Autodetection
```
┌─────────────────────────────────────────┐
│  [Video Frame Preview]                  │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │         Video Content             │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ Detected Subtitle Region    │ │ │ ← Highlighted box
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
│                                          │
│  Detected Region: X: 0-1920, Y: 900-1040│
│                                          │
│  [Re-detect]  [Accept & Continue]      │
└─────────────────────────────────────────┘
```

#### Step 3: Manual Adjustment
```
┌─────────────────────────────────────────┐
│  Drag corners/edges to adjust region    │
│  ┌───────────────────────────────────┐ │
│  │         Video Content             │ │
│  │  ●─────────────────────────────● │ │ ← Draggable corners
│  │  │ Subtitle Area              │ │ │
│  │  ●─────────────────────────────● │ │
│  └───────────────────────────────────┘ │
│                                          │
│  X: [0    ] - [1920  ]                  │
│  Y: [900  ] - [1040  ]                  │
│                                          │
│  [Reset]  [Next: Search Subtitles]     │
└─────────────────────────────────────────┘
```

#### Step 4: Subtitle Search
```
┌─────────────────────────────────────────┐
│  Searching for subtitles...             │
│                                          │
│  ████████████░░░░░░░░░░ 60% (1234/2000) │
│                                          │
│  Frames processed: 1234 / 2000          │
│  Subtitles found: 87                    │
│  Elapsed: 00:03:21                      │
│  Remaining: ~00:02:15                   │
│                                          │
│  [Pause]  [Cancel]                      │
└─────────────────────────────────────────┘

After completion:
┌─────────────────────────────────────────┐
│  Found 87 subtitle frames               │
│                                          │
│  [Image Gallery - Grid View]            │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐        │
│  │Img│ │Img│ │Img│ │Img│ │Img│ ...    │
│  └───┘ └───┘ └───┘ └───┘ └───┘        │
│                                          │
│  [Next: Clear Images]                   │
└─────────────────────────────────────────┘
```

#### Step 5: Image Clearing
```
┌─────────────────────────────────────────┐
│  Removing background from images...     │
│                                          │
│  ████████████████████░░ 85% (74/87)     │
│                                          │
│  [Preview: Before/After]                │
│  ┌─────────┐     ┌─────────┐           │
│  │ Before  │  →  │ After   │           │
│  │ (noisy) │     │ (clean) │           │
│  └─────────┘     └─────────┘           │
│                                          │
│  Settings:                               │
│  Clusters: ○2 ●3                        │
│  Iterations: [30]                       │
│                                          │
│  [Cancel]                               │
└─────────────────────────────────────────┘
```

#### Step 6: Manual Cleanup
```
┌─────────────────────────────────────────┐
│  Image 1 / 87                           │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │                                  │   │
│  │   Cleaned Text Image             │   │
│  │   [Canvas Editor]                │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Tools: [Brush] [Eraser] [Crop]        │
│  Brush Size: ░░●░░                      │
│                                          │
│  [← Prev]  [Accept]  [Reject]  [Next →]│
└─────────────────────────────────────────┘
```

#### Step 7: OCR
```
┌─────────────────────────────────────────┐
│  Recognizing text...                    │
│                                          │
│  ████████████░░░░░░░░░░ 63% (55/87)     │
│                                          │
│  Language: [English ▼]                  │
│                                          │
│  [Preview: Image + Recognized Text]     │
│  ┌─────────┐  "Hello, world!"          │
│  │  Image  │  Confidence: 95%           │
│  └─────────┘                            │
│                                          │
│  [Edit Text] [Next: Generate Subtitles]│
└─────────────────────────────────────────┘
```

#### Step 8: Generate Subtitles
```
┌─────────────────────────────────────────┐
│  Subtitle Preview                       │
│                                          │
│  Format: ●SRT ○VTT ○ASS                │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 1                                │   │
│  │ 00:00:10,500 --> 00:00:13,000   │   │
│  │ Hello, world!                    │   │
│  │                                  │   │
│  │ 2                                │   │
│  │ 00:00:15,000 --> 00:00:18,500   │   │
│  │ This is a subtitle.              │   │
│  └─────────────────────────────────┘   │
│                                          │
│  [Edit Timings] [Download Subtitle]    │
│                                          │
│  🎉 Success! Subtitle file ready.       │
└─────────────────────────────────────────┘
```

### Color Scheme

**Light Mode**:
- Background: `#FFFFFF`
- Surface: `#F9FAFB`
- Primary: `#3B82F6` (Blue)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)
- Text: `#111827`

**Dark Mode**:
- Background: `#0F172A`
- Surface: `#1E293B`
- Primary: `#60A5FA` (Light Blue)
- Success: `#34D399` (Light Green)
- Warning: `#FBBF24` (Light Amber)
- Error: `#F87171` (Light Red)
- Text: `#F1F5F9`

---

## Performance Optimization

### Strategies

1. **Web Workers**:
   - Offload frame extraction to worker thread
   - Parallel subtitle search (multiple workers)
   - Background OCR processing

2. **Memory Management**:
   - Release cv.Mat objects after use
   - Use object pooling for frequently created objects
   - Implement garbage collection hints

3. **Progressive Processing**:
   - Process video in chunks
   - Stream results to IndexedDB
   - Allow resuming interrupted sessions

4. **Lazy Loading**:
   - Load OpenCV.js and Tesseract.js on demand
   - Lazy load language data for OCR

5. **Caching**:
   - Cache processed frames
   - Cache detection results
   - Use IndexedDB for persistence

6. **Optimization Techniques**:
   - Use TypedArrays for pixel manipulation
   - Minimize Canvas operations
   - Batch similar operations
   - Use requestAnimationFrame for UI updates

### Performance Targets

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| Frame extraction | < 100ms | < 200ms | 1080p frame |
| Edge detection | < 50ms | < 100ms | Per frame |
| K-means (single image) | < 500ms | < 1000ms | 2 clusters |
| OCR (single image) | < 2s | < 5s | Tesseract.js |
| Full workflow (30min video) | < 10min | < 20min | User CPU |

---

## Deployment Strategy

### GitHub Pages Setup

**Repository Structure**:
```
VideoSubFinder/
├── web-app/              # React app (this project)
│   ├── src/
│   ├── public/
│   └── dist/             # Built files (for GitHub Pages)
│
└── (existing C++ files)
```

**Deployment Configuration**:

1. **Vite Config** (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/VideoSubFinder/',  // GitHub Pages subdirectory
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

2. **GitHub Actions Workflow** (`.github/workflows/deploy-web-app.yml`):
```yaml
name: Deploy Web App to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'web-app/**'
  workflow_dispatch:

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: web-app/package-lock.json

      - name: Install dependencies
        working-directory: web-app
        run: npm ci

      - name: Build
        working-directory: web-app
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./web-app/dist
```

3. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from branch `gh-pages`
   - Will be available at: `https://[username].github.io/VideoSubFinder/`

### Custom Domain (Optional)

- Add CNAME file to `web-app/public/`
- Configure DNS records
- Example: `vsf-web.example.com`

---

## Browser Compatibility

### Minimum Requirements

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| ES2020 | 91+ | 89+ | 14.1+ | 91+ |
| WebAssembly | ✓ | ✓ | ✓ | ✓ |
| Web Workers | ✓ | ✓ | ✓ | ✓ |
| IndexedDB | ✓ | ✓ | ✓ | ✓ |
| HTML5 Video | ✓ | ✓ | ✓ | ✓ |
| File API | ✓ | ✓ | ✓ | ✓ |

### Fallbacks

- Display compatibility warning for unsupported browsers
- Recommend Chrome/Edge for best performance
- Provide downloadable desktop app as alternative

---

## Next Steps

### Immediate Actions (User Approval Required)

Before proceeding with implementation, please confirm:

1. **Technology Stack**: Approve React + TypeScript + Vite + Tailwind
2. **Deployment**: Confirm GitHub Pages hosting
3. **Scope**: Approve 8-step workflow as outlined
4. **Timeline**: 38-day development cycle acceptable?
5. **Algorithm Parity**: Understand some algorithms will be approximations
6. **Browser Support**: Chrome/Firefox/Edge (Safari limited)

### Questions for Clarification

1. **Target Audience**: Who will use this? (General users, developers, researchers?)
2. **Video Size Limits**: Max video duration/file size to support?
3. **Language Support**: Which OCR languages are priority? (English, Spanish, Chinese?)
4. **Additional Features**: Any specific features not in original app?
5. **Analytics**: Do you want usage analytics (privacy-respecting)?

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenCV.js performance slower than C++ | High | High | Optimize algorithms, use Web Workers |
| Browser memory limits with large videos | High | Medium | Process in chunks, implement streaming |
| Tesseract.js accuracy lower than commercial OCR | Medium | Medium | Allow manual correction, multi-language support |
| K-means clustering differences from C++ | Medium | Low | Port exact algorithm, test extensively |

### Dependency Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| OpenCV.js | Breaking changes | Lock to specific version (4.8.0) |
| Tesseract.js | Large bundle size | Lazy load, CDN hosting |
| React | Ecosystem changes | Use stable version (18.x) |

---

## Success Metrics

### Functionality

- [ ] Successfully processes 480p video
- [ ] Successfully processes 1080p video
- [ ] Detection accuracy > 90% vs. C++ version
- [ ] OCR accuracy > 85% (English text)
- [ ] Complete workflow < 15 minutes for 30-min video

### User Experience

- [ ] Intuitive UI (user testing)
- [ ] Responsive design (mobile-friendly)
- [ ] < 5 second initial load time
- [ ] Zero crashes during normal usage
- [ ] Clear error messages

### Code Quality

- [ ] TypeScript strict mode enabled
- [ ] ESLint with no errors
- [ ] Comprehensive inline documentation
- [ ] Algorithm parity documented
- [ ] README with usage examples

---

**Ready to Begin?**

Please review this plan and provide feedback. Once approved, I'll proceed with Phase 1: Project Setup.

Key decision points:
1. Approve technology stack
2. Approve UI design direction
3. Confirm algorithm porting strategy
4. Set priority for features
5. Agree on timeline

Let me know if you'd like any changes or have questions about the implementation approach!
