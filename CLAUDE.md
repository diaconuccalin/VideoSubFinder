# CLAUDE.md - AI Assistant Guide for VideoSubFinder

> **Purpose**: This document provides comprehensive guidance for AI assistants (like Claude) working on the VideoSubFinder codebase. It covers project structure, development workflows, conventions, and best practices.

**Last Updated**: 2025-11-15
**Project**: VideoSubFinder - Hardcoded Subtitle Extraction Tool
**Primary Language**: C++17
**License**: GPL v2

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Project Overview](#project-overview)
3. [Codebase Structure](#codebase-structure)
4. [Development Workflows](#development-workflows)
5. [Code Conventions](#code-conventions)
6. [Build System](#build-system)
7. [Key Components Reference](#key-components-reference)
8. [Common Tasks](#common-tasks)
9. [Configuration System](#configuration-system)
10. [Testing & Debugging](#testing--debugging)
11. [Dependencies](#dependencies)
12. [Contribution Guidelines](#contribution-guidelines)

---

## Quick Reference

### Essential File Paths

```
Components/IPAlgorithms/        # Core image processing algorithms
Components/FFMPEGVideo/         # Video decoding (FFMPEG backend)
Components/OCVVideo/            # Video decoding (OpenCV backend)
Components/CUDAKernels/         # GPU acceleration (optional)
Interfaces/VideoSubFinderWXW/   # GUI application
Settings/general.cfg            # Main configuration file
Docs/build.txt                  # Build instructions (512 lines)
Docs/readme_eng.txt            # User manual (600+ lines)
```

### Quick Commands

```bash
# Build (Linux)
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)

# Build with CUDA
cmake -DCMAKE_BUILD_TYPE=Release -DUSE_CUDA=ON ..

# Build (Windows - from Developer Command Prompt)
mkdir build && cd build
cmake -G "Visual Studio 17 2022" -A x64 ..
cmake --build . --config Release

# Run application
./VideoSubFinderWXW

# Run with CLI mode
./VideoSubFinderWXW -i video.mp4 -r -ccti
```

### Common File Patterns

- **Core Algorithms**: `Components/IPAlgorithms/*.cpp`
- **GUI Components**: `Interfaces/VideoSubFinderWXW/*.cpp`
- **Headers**: All `.h` files (no `.hpp` used)
- **CUDA Kernels**: `Components/CUDAKernels/**/*.cu`
- **Config Files**: `Settings/**/*.cfg`

---

## Project Overview

### What is VideoSubFinder?

VideoSubFinder is a specialized tool for extracting hardcoded (burned-in) subtitles from video files. It provides:

1. **Automatic detection** of frames containing hardcoded text with timing information
2. **Background removal** to generate cleaned text images suitable for OCR
3. **Integration** with OCR tools (FineReader, Subtitle Edit, Google Drive OCR)

### Key Features

- **Dual video backends**: OpenCV (compatibility) or FFMPEG (performance + HW acceleration)
- **GPU acceleration**: Optional CUDA support (~2x speedup for image processing)
- **Parallel processing**: Intel TBB, C++17 execution policies, Windows PPL
- **Hardware decoding**: CUDA, DXVA2, QSV, and other FFMPEG HW decoders
- **Cross-platform**: Windows (x86/x64) and Linux (x64)
- **Command-line automation**: Full CLI support for batch processing
- **Internationalization**: English, Russian, Chinese

### Project Context

- **Primary Repository**: SourceForge (git.code.sf.net/p/videosubfinder/src)
- **Mirrors**: GitHub, Gitee (auto-synced monthly)
- **Author**: Simeon Kosnitsky (skosnits@gmail.com)
- **Codebase Size**: ~26,200 lines of C++ across 61 source files
- **Development Status**: Actively maintained, stable

---

## Codebase Structure

### Top-Level Organization

```
VideoSubFinder/
├── Components/              # Static libraries (core logic)
│   ├── CUDAKernels/        # GPU acceleration kernels (optional)
│   ├── FFMPEGVideo/        # FFMPEG video decoder implementation
│   ├── IPAlgorithms/       # Image processing & subtitle algorithms
│   ├── OCVVideo/           # OpenCV video decoder implementation
│   └── Include/            # Shared headers (DataTypes.h, Video.h)
│
├── Interfaces/             # Executable applications
│   └── VideoSubFinderWXW/  # wxWidgets GUI application (main executable)
│
├── Settings/               # Runtime configuration
│   ├── Localization/       # Language files (eng/rus/chn)
│   │   ├── eng/locale.cfg
│   │   ├── rus/locale.cfg
│   │   └── chn/locale.cfg
│   └── general.cfg         # Main settings (127 parameters)
│
├── Data/                   # Application resources
│   └── bitmaps/           # UI icons and graphics
│
├── Docs/                   # Comprehensive documentation
│   ├── build.txt          # Platform-specific build guide
│   ├── readme_eng.txt     # English user manual
│   ├── readme_rus.txt     # Russian documentation
│   └── readme_chn.txt     # Chinese documentation
│
├── .github/workflows/      # CI/CD automation
│   ├── SyncFromSourceforge.yml
│   └── SyncToGitee.yml
│
└── CMakeLists.txt         # Root build configuration
```

### Component Dependency Graph

```
VideoSubFinderWXW (executable)
    ├─> IPAlgorithms (static lib)
    │   └─> CUDAKernels (static lib, optional)
    ├─> OCVVideo (static lib)
    │   └─> IPAlgorithms
    └─> FFMPEGVideo (static lib)
        └─> IPAlgorithms

External Dependencies:
    ├─> wxWidgets 3.2.1 (GUI framework)
    ├─> OpenCV 4.7.0 (computer vision)
    ├─> FFMPEG 5.1 (video processing)
    ├─> CUDA 12.0+ (optional GPU acceleration)
    └─> Intel TBB (parallel processing)
```

---

## Development Workflows

### Git Strategy

**Branch Model**:
- **main**: Stable releases (synced from SourceForge monthly)
- **claude/**: AI assistant development branches (naming: `claude/*-<session-id>`)

**Synchronization**:
- **Source of Truth**: SourceForge repository
- **Auto-Sync**: GitHub Actions runs monthly (1st of month)
- **Mirror**: Gitee receives all push events

**When Making Changes**:
1. Work on designated `claude/*` branch (never push to main)
2. Commit with descriptive messages
3. Push with: `git push -u origin <branch-name>`
4. Branch name must start with 'claude/' and match session ID

### CI/CD Pipelines

**SyncFromSourceforge.yml**:
- **Trigger**: Monthly cron, manual dispatch
- **Actions**: Fetch SourceForge → Merge → Push to GitHub

**SyncToGitee.yml**:
- **Trigger**: All branch pushes
- **Actions**: Mirror GitHub → Gitee

**Note**: No automated build/test CI. All builds are manual/local.

### Release Process

This project follows SourceForge-based releases:
1. Changes are tested locally (Windows + Linux)
2. Committed to SourceForge repository
3. Monthly sync propagates to GitHub/Gitee
4. Manual builds distributed via SourceForge

---

## Code Conventions

### Naming Conventions

**Classes**:
```cpp
// Class names: Prefix with 'C'
class CVideo { };
class CPopupHelpWindow { };
class CMainFrame { };

// Structs: No prefix
struct color_range { };
struct custom_buffer { };

// Thread classes: ThreadXxx pattern
class ThreadRunVideo { };
class FFMPEGThreadRunVideo { };
```

**Variables**:
```cpp
// Member variables: m_ prefix
int m_Width, m_Height;
wxString m_FileName;
CVideo* m_pVideo;

// Global variables: g_ prefix
extern int g_use_cuda_gpu;
extern custom_mutex g_mthr;

// Pointers: p prefix
CVideo* pVideoWindow;
unsigned char* pBuffer;

// Simple types: lowercase/short names
int w, h;    // width, height
int x, y;    // coordinates
int i, j, k; // loop counters
```

**Constants**:
```cpp
// Preprocessor defines: UPPERCASE
#define CUSTOM_DEBUG 1
#define DEFAULT_FONT_SIZE 10

// Global settings: lowercase with underscores
extern int moderate_threshold_min_lvl;
extern wxString hw_device;
```

**Files**:
```cpp
// Component headers/implementations: CapitalCase
IPAlgorithms.h / IPAlgorithms.cpp
FFMPEGVideo.h / FFMPEGVideo.cpp

// CUDA kernels: lowercase_with_underscores
cuda_kernels.cu
cuda_kmeans.cu
```

### Architectural Patterns

**1. Inheritance Hierarchy**:
```cpp
// Abstract base class
class CVideo {
    virtual void OpenMovie(...) = 0;
    virtual void SetPos(s64 Pos) = 0;
    // ... pure virtual methods
};

// Concrete implementations
class OCVVideo : public CVideo { };
class FFMPEGVideo : public CVideo { };
```

**2. Template-Heavy Design**:
```cpp
// Generic buffers for type safety
template<typename T>
class simple_buffer {
    T* m_pData;
    size_t m_size;
};

// Used for different pixel types
simple_buffer<u8> buffer8;
simple_buffer<int> bufferInt;
```

**3. Buffer Management**:
```cpp
// Custom buffer class (manual memory management)
simple_buffer<u8> ImRGB;
ImRGB.m_pData = new u8[w * h * 3];
// ... use buffer
delete[] ImRGB.m_pData;

// No RAII in older code, but newer code uses smart pointers
```

**4. Algorithm Organization**:
```
Detection (SSAlgorithms.cpp)
    → FastSearchSubtitles()      # Find subtitle frames
    → SaveRGBImageToGlobalBuffer()

Processing (IPAlgorithms.cpp)
    → GetTransformedImage()       # Edge detection, filtering
    → FilterImage()               # Color filtering in LAB/RGB
    → ClearImageByTextColor()     # Remove background via K-means
```

**5. Threading Models**:
```cpp
// Video playback: wxThread
class ThreadRunVideo : public wxThread { };

// Parallel algorithms: TBB/execution policies
std::for_each(std::execution::par, begin, end, lambda);

// Thread pools: Custom implementation
custom_thread_pool pool(num_threads);
```

### Code Quality Practices

**Assertions**:
```cpp
// Custom assertion macro (used extensively)
custom_assert(condition, "error message");
```

**Logging**:
```cpp
// Report logging
SaveToReportLog(str);

// Error logging
SaveError(str);

// Debug modes
#ifdef CUSTOM_DEBUG
    // Debug code
#endif
```

**Error Handling**:
```cpp
// Exception handling with custom filters
try {
    // Code
} catch (...) {
    // Custom exception filter
}
```

---

## Build System

### CMake Structure

**Root Configuration** (`CMakeLists.txt`):
```cmake
cmake_minimum_required(VERSION 3.13)
project(VideoSubFinder)

# Build options
option(USE_CUDA "Enable CUDA support" ON)  # Default ON for x64
option(WIN64 "Windows 64-bit build" ON)

# Subdirectories (in build order)
add_subdirectory(Components/CUDAKernels)    # Optional
add_subdirectory(Components/IPAlgorithms)
add_subdirectory(Components/OCVVideo)
add_subdirectory(Components/FFMPEGVideo)
add_subdirectory(Interfaces/VideoSubFinderWXW)
```

**Component CMakeLists**:
- Each component has its own `CMakeLists.txt`
- Builds static libraries (.a / .lib)
- Links against dependencies
- Exports include directories

### Build Options

**USE_CUDA** (ON/OFF):
- Default: ON for x64, OFF for x86
- Builds CUDAKernels component
- Requires CUDA Toolkit 12.0+
- ~2x performance improvement for image clearing

**CMAKE_BUILD_TYPE**:
- Release: Optimized builds
- Debug: Debug symbols, assertions enabled

**Platform-Specific**:
- Windows: WIN64=ON for x64, OFF for x86
- Linux: Automatically detects x64

### Environment Variables

Required for dependency discovery:

```bash
# Linux example
export WX_WIDGETS_PATH=/usr/local/wxWidgets-3.2.1
export OPENCV_BUILD_PATH=/usr/local/opencv-4.7.0

# Windows example
set WX_WIDGETS_PATH=C:\wxWidgets-3.2.1
set OPENCV_BUILD_PATH=C:\opencv-4.7.0
```

Full list:
- `WX_WIDGETS_PATH`: wxWidgets installation
- `OPENCV_BUILD_PATH`: OpenCV build directory
- `FFMPEG_PATH`: FFMPEG libraries (Windows)
- `TBB_PATH`: Intel TBB (optional)

### Build Instructions

**Linux (Ubuntu 20.04 / Arch)**:
```bash
# Install dependencies (see Docs/build.txt for complete list)
sudo apt-get install cmake g++ libgtk-3-dev libavcodec-dev \
    libavformat-dev libswscale-dev libavfilter-dev libtbb-dev

# Build wxWidgets (see Docs/build.txt for details)
# Build OpenCV (see Docs/build.txt for details)

# Build VideoSubFinder
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)

# Install
sudo make install
```

**Windows (Visual Studio 2022)**:
```cmd
REM Open "x64 Native Tools Command Prompt for VS 2022"
mkdir build
cd build
cmake -G "Visual Studio 17 2022" -A x64 ..
cmake --build . --config Release

REM Or open build/VideoSubFinder.sln in Visual Studio
```

**Detailed Instructions**: See `/home/user/VideoSubFinder/Docs/build.txt` (512 lines, platform-specific)

---

## Key Components Reference

### 1. IPAlgorithms Component

**Location**: `Components/IPAlgorithms/`
**Purpose**: Core image processing and subtitle detection algorithms

**Key Files**:

- **IPAlgorithms.cpp/h** (8,349 lines)
  - Image transformations: edge detection, Sobel operators
  - Filtering: color filtering in LAB/RGB color spaces
  - K-means clustering for text/background separation
  - Moderate thresholding algorithms
  - Entry points: `GetTransformedImage()`, `FilterImage()`, `ClearImageByTextColor()`

- **SSAlgorithms.cpp/h** (4,267 lines)
  - Main subtitle search: `FastSearchSubtitles()`
  - Multi-frame subtitle area detection (ISA/ILA images)
  - Frame comparison and timing analysis
  - Output: RGBImages/, ISAImages/, ILAImages/, TXTImages/

- **MyClosedFigure.cpp/h**
  - Geometric shape analysis
  - Closed figure detection
  - Boundary calculations

**Key Algorithms**:
```cpp
// Main subtitle search workflow
FastSearchSubtitles(start_time, end_time)
    → Find frames with text (edge detection + thresholding)
    → Generate ISA images (intersect multiple frames)
    → Generate ILA images (luminance analysis)
    → Save RGB images of subtitle regions

// Image cleaning workflow
ClearImageByTextColor(ImRGB, ImFF, ImVE, w, h)
    → K-means clustering (2-3 clusters)
    → Identify text cluster
    → Remove background pixels
```

**Important Settings** (from general.cfg):
- `moderate_threshold`: Detection sensitivity (0.0-1.0)
- `text_alignment`: 0=Center, 1=Left, 2=Right, 3=Any
- `min_text_area_width/height`: Minimum subtitle dimensions
- `use_ILA_images_for_search_subtitles`: Use luminance analysis

### 2. Video Components (OCVVideo & FFMPEGVideo)

**OCVVideo** (`Components/OCVVideo/`):
- **Purpose**: OpenCV-based video decoding (cv::VideoCapture)
- **Best for**: Compatibility, simple videos
- **Files**: `OCVVideo.cpp/h`, `OCVVideoLoader.cpp/h`
- **Features**: Frame-by-frame navigation, threaded playback

**FFMPEGVideo** (`Components/FFMPEGVideo/`):
- **Purpose**: FFMPEG-based decoding with HW acceleration
- **Best for**: HD video (720p+), performance
- **Files**: `FFMPEGVideo.cpp/h`, `FFMPEGVideoLoader.cpp/h`
- **Features**:
  - Hardware decoding: CUDA, DXVA2, QSV, VAAPI, etc.
  - Video filter graphs (FFMPEG filters, AviSynth+)
  - Better performance and codec support

**Video Backend Selection**:
```cpp
// Settings in general.cfg
open_video_opencv = 0        // Use FFMPEG by default
open_video_ffmpeg = 1

// Command-line override
-ovocv     // Force OpenCV
-ovffmpeg  // Force FFMPEG
```

**Common Video Interface**:
```cpp
class CVideo {
    virtual void OpenMovie(...) = 0;
    virtual void SetPos(s64 Pos) = 0;
    virtual void OneStep() = 0;
    virtual void GetRGBImage(...) = 0;
    // ... 20+ pure virtual methods
};
```

### 3. CUDAKernels Component (Optional)

**Location**: `Components/CUDAKernels/`
**Purpose**: GPU-accelerated computational kernels

**Key Files**:
- **cuda_kernels.cu/h**: CUDA utility functions, memory management
- **kmeans/cuda_kmeans.cu**: K-means clustering on GPU
- **kmeans/kmeans.h**: K-means interface (CPU/GPU dispatch)

**Performance**:
- ~2x speedup for `ClearImageByTextColor()` (K-means clustering)
- Supports CUDA architectures: sm_50 to sm_90 (Maxwell → Hopper)

**Build Configuration**:
```cmake
# Enabled by default for x64, disabled for x86
option(USE_CUDA "Enable CUDA support" ON)

# CUDA architectures compiled
set(CMAKE_CUDA_ARCHITECTURES 50 52 60 61 62 70 72 75 80 86 87 89 90)
```

**Runtime Control**:
```cpp
// Settings in general.cfg
use_cuda_gpu = 1             // Enable GPU acceleration

// Command-line override
-uc, --use_cuda
```

### 4. VideoSubFinderWXW GUI Application

**Location**: `Interfaces/VideoSubFinderWXW/`
**Purpose**: wxWidgets-based GUI application (main executable)

**Main Components** (23 .h/.cpp pairs):

**Core Application**:
- **VideoSubFinderWXW.cpp/h**: Application entry point, CLI parser
- **MainFrm.cpp/h**: Main window, workflow orchestration (3,481 lines)

**UI Panels**:
- **VideoBox.cpp/h**: Video preview and navigation panel
- **ImageBox.cpp/h**: Subtitle image preview and editing
- **SearchPanel.cpp/h**: Subtitle search controls and parameters
- **OCRPanel.cpp/h**: OCR workflow, image generation controls
- **SettingsPanel.cpp/h**: Algorithm parameter configuration (127 settings)
- **EditPanel.cpp/h**: Image editing tools (crop, adjust brightness)

**Dialogs**:
- **SSOWnd.cpp/h**: Settings and Search Orchestration Window
- **AboutWnd.cpp/h**: About dialog
- **DIPanelFRPT.cpp/h**: FRPT (FineReader Processing Time) dialog

**Custom Controls** (17 custom widgets):
- BitmapButton, Button, CheckBox, Choice, DataGrid
- ScrollBar, StaticText, TextCtrl, ResizableWindow, SeparatingLine

**Workflow Entry Points**:
```cpp
// Main window methods
CMainFrame::OnOpenVideoOpenCVClick()      // Open video (OpenCV)
CMainFrame::OnOpenVideoFFMPEGClick()      // Open video (FFMPEG)
CMainFrame::OnRunSearchClick()            // Start subtitle search
CMainFrame::OnCreateClearedTextImagesClick()  // Generate cleaned images
CMainFrame::OnJoinImages()                // Join images for OCR

// Command-line entry
wxApp::OnRun() → ProcessCmdLine() → RunSearch()
```

---

## Common Tasks

### Task 1: Modifying Detection Parameters

**Scenario**: Adjust subtitle detection sensitivity

**Files to Edit**:
1. `Settings/general.cfg` - Runtime settings
2. `Interfaces/VideoSubFinderWXW/SettingsPanel.cpp` - UI controls
3. `Components/IPAlgorithms/SSAlgorithms.cpp` - Algorithm implementation

**Example**:
```cpp
// Settings/general.cfg
moderate_threshold = 0.25     // Lower = more sensitive (0.0-1.0)
min_text_area_width = 40      // Minimum subtitle width
min_text_area_height = 8      // Minimum subtitle height

// Access in code (SSAlgorithms.cpp)
extern int g_moderate_threshold_min_lvl;  // Set from general.cfg
int threshold = g_moderate_threshold_min_lvl;
```

### Task 2: Adding New Image Processing Algorithm

**Steps**:
1. Add function to `Components/IPAlgorithms/IPAlgorithms.h`
2. Implement in `IPAlgorithms.cpp`
3. (Optional) Add CUDA version in `CUDAKernels/`
4. Expose in GUI: `Interfaces/VideoSubFinderWXW/SettingsPanel.cpp`
5. Add setting to `Settings/general.cfg`

**Template**:
```cpp
// IPAlgorithms.h
void MyNewAlgorithm(simple_buffer<u8>& ImRGB, int w, int h);

// IPAlgorithms.cpp
void MyNewAlgorithm(simple_buffer<u8>& ImRGB, int w, int h) {
    custom_assert(ImRGB.m_pData != nullptr, "Buffer is null");

    // Algorithm implementation
    for (int i = 0; i < w * h; i++) {
        // Process pixels
    }
}

// For parallel version:
#include <execution>
std::for_each(std::execution::par, begin, end, [](auto& pixel) {
    // Parallel processing
});
```

### Task 3: Adding New Configuration Setting

**Files**:
1. `Settings/general.cfg` - Add default value
2. `Interfaces/VideoSubFinderWXW/MainFrm.h` - Declare extern variable
3. `Interfaces/VideoSubFinderWXW/MainFrm.cpp` - Load/save setting
4. `Interfaces/VideoSubFinderWXW/SettingsPanel.cpp` - Add UI control

**Example**:
```cpp
// 1. Settings/general.cfg
my_new_setting = 42

// 2. MainFrm.h (or appropriate header)
extern int g_my_new_setting;

// 3. MainFrm.cpp - LoadSettings()
g_my_new_setting = cfg.ReadInt("my_new_setting", 42);  // default: 42

// 3. MainFrm.cpp - SaveSettings()
cfg.WriteInt("my_new_setting", g_my_new_setting);

// 4. SettingsPanel.cpp - Add wxSpinCtrl/wxTextCtrl/etc.
```

### Task 4: Testing Video Decoding Changes

**Test Videos** (not in repo, user-provided):
```bash
# Test with OpenCV backend
./VideoSubFinderWXW -i test_video.mp4 -ovocv

# Test with FFMPEG backend
./VideoSubFinderWXW -i test_video.mp4 -ovffmpeg

# Test with hardware decoding (FFMPEG)
# Edit Settings/general.cfg:
hw_device = cuda          # or: dxva2, qsv, vaapi
./VideoSubFinderWXW -i test_video.mp4 -ovffmpeg
```

**Debug Logging**:
```cpp
// Enable in code
#define CUSTOM_DEBUG 1

// Check log files (generated during run)
// Location: [output_dir]/VideoSubFinderCLI.log
```

### Task 5: Adding Localization String

**Files**:
- `Settings/Localization/eng/locale.cfg`
- `Settings/Localization/rus/locale.cfg`
- `Settings/Localization/chn/locale.cfg`

**Example**:
```ini
# Settings/Localization/eng/locale.cfg
[MY_NEW_BUTTON]
en = My New Button
hint = This button does something useful

# Settings/Localization/rus/locale.cfg
[MY_NEW_BUTTON]
ru = Моя новая кнопка
hint = Эта кнопка делает что-то полезное

# Settings/Localization/chn/locale.cfg
[MY_NEW_BUTTON]
zh = 我的新按钮
hint = 这个按钮做了一些有用的事情
```

**Usage in Code**:
```cpp
#include "locale_include.h"

wxString label = wxGetTranslation("MY_NEW_BUTTON");
wxButton* btn = new wxButton(panel, wxID_ANY, label);
btn->SetToolTip(wxGetTranslation("MY_NEW_BUTTON_hint"));
```

---

## Configuration System

### general.cfg Structure

**Location**: `Settings/general.cfg`
**Format**: INI-style key-value pairs (127 settings)

**Categories**:

**1. UI Settings** (28 settings):
```ini
# Window position and size
main_window_pos_x = -1
main_window_pos_y = -1
main_window_size_w = 1200
main_window_size_h = 900

# Fonts and colors
font_name = Arial
font_size = 10
text_color = (0,0,0)
background_color = (255,255,255)
```

**2. Algorithm Parameters** (50+ settings):
```ini
# Detection sensitivity
moderate_threshold = 0.25                     # 0.0-1.0
moderate_threshold_min_lvl = 90              # 0-255
use_ILA_images_for_search_subtitles = 0      # 0=off, 1=on

# Text properties
text_alignment = 0                            # 0=Center, 1=Left, 2=Right, 3=Any
min_text_area_width = 40
min_text_area_height = 8
text_color_diff_threshold = 100

# K-means clustering
num_clusters = 2                              # 2-3 clusters
kmeans_max_iterations = 100
```

**3. Performance Settings**:
```ini
# Threading
process_affinity_mask = -1                    # -1=auto, or CPU affinity mask
num_threads = 4                               # Thread pool size

# GPU acceleration
use_cuda_gpu = 0                              # 0=off, 1=on

# Video decoding
hw_device = cpu                               # cpu, cuda, dxva2, qsv, vaapi
```

**4. Workflow Settings**:
```ini
# Video backend
open_video_opencv = 0
open_video_ffmpeg = 1

# Output directories
output_dir = ./output
clear_output_dirs = 1                         # Clear on new search

# OCR integration
ocr_engine = 0                                # 0=None, 1=FineReader, 2=Tesseract
```

### Loading Configuration

**Code** (`MainFrm.cpp:LoadSettings()`):
```cpp
void CMainFrame::LoadSettings() {
    wxFileConfig cfg("VideoSubFinder", wxEmptyString,
                     "Settings/general.cfg");

    // Read with defaults
    g_moderate_threshold = cfg.ReadDouble("moderate_threshold", 0.25);
    g_text_alignment = cfg.ReadInt("text_alignment", 0);
    g_hw_device = cfg.Read("hw_device", "cpu");

    // Apply to global variables
    // ...
}
```

### Saving Configuration

**Code** (`MainFrm.cpp:SaveSettings()`):
```cpp
void CMainFrame::SaveSettings() {
    wxFileConfig cfg("VideoSubFinder", wxEmptyString,
                     "Settings/general.cfg");

    cfg.WriteDouble("moderate_threshold", g_moderate_threshold);
    cfg.WriteInt("text_alignment", g_text_alignment);
    cfg.Write("hw_device", g_hw_device);

    cfg.Flush();
}
```

---

## Testing & Debugging

### Debug Builds

**Enable Debug Mode**:
```bash
# Linux
cmake -DCMAKE_BUILD_TYPE=Debug ..
make

# Windows
cmake --build . --config Debug
```

**Debug Macros** (in code):
```cpp
#define CUSTOM_DEBUG 1         // General debug logging
#define CUSTOM_DEBUG2 1        // Extended debug logging
#define CUSTOM_TA 1            // Timing analysis

#ifdef CUSTOM_DEBUG
    SaveToReportLog("Debug info: " + str);
#endif
```

### Logging System

**Log Functions**:
```cpp
// Report log (detailed workflow)
void SaveToReportLog(const wxString& str);

// Error log
void SaveError(const wxString& str);

// Image saving (for debugging)
void SaveGreyscaleImage(simple_buffer<u8>& Im, wxString name, int w, int h);
void SaveRGBImage(simple_buffer<u8>& Im, wxString name, int w, int h);
```

**Log Location**:
```
[output_dir]/VideoSubFinderCLI.log     # CLI mode
[output_dir]/VideoSubFinderGUI.log     # GUI mode
```

### Testing Workflows

**Manual Testing Checklist**:

1. **Video Loading**:
   - OpenCV backend: `-ovocv`
   - FFMPEG backend: `-ovffmpeg`
   - Hardware decoding: Set `hw_device` in general.cfg

2. **Subtitle Search**:
   - Run search: `-r` or click "Run Search" in GUI
   - Check output directories: RGBImages/, ISAImages/, ILAImages/
   - Verify timing file: output.txt

3. **Image Clearing**:
   - Generate cleared images: `-ccti` or click "Create Cleared Text Images"
   - Check TXTImages/ directory
   - Verify text quality

4. **CUDA Acceleration** (if enabled):
   - Set `use_cuda_gpu = 1` in general.cfg
   - Compare performance: CUDA on vs. CUDA off
   - Check for visual differences (should be minimal)

5. **CLI Mode**:
   - Full workflow: `./VideoSubFinderWXW -i video.mp4 -r -ccti -ji`
   - Check exit code: 0 = success, non-zero = error

**Performance Profiling**:
```cpp
// Built-in timing (when CUSTOM_TA defined)
// Logs processing times for each stage
// Check log file for: "[TIME] Section: XXXms"
```

### Common Issues

**Issue 1: Video won't open**
- **Cause**: Missing FFMPEG codecs, incompatible format
- **Solution**: Try different backend (`-ovocv` vs `-ovffmpeg`)
- **Debug**: Check log file for FFMPEG errors

**Issue 2: No subtitles detected**
- **Cause**: Threshold too high, wrong text alignment
- **Solution**: Lower `moderate_threshold` (try 0.15-0.20)
- **Solution**: Set `text_alignment = 3` (any position)

**Issue 3: Too many false positives**
- **Cause**: Threshold too low, noisy video
- **Solution**: Increase `moderate_threshold` (try 0.30-0.35)
- **Solution**: Increase `min_text_area_width/height`

**Issue 4: CUDA errors**
- **Cause**: Incompatible GPU, CUDA not installed
- **Solution**: Disable CUDA: `use_cuda_gpu = 0` in general.cfg
- **Solution**: Rebuild without CUDA: `cmake -DUSE_CUDA=OFF ..`

**Issue 5: Build errors on Linux**
- **Cause**: Missing dependencies
- **Solution**: See `Docs/build.txt` for complete dependency list
- **Solution**: Check CMake output for specific missing libraries

---

## Dependencies

### Required Dependencies

**wxWidgets 3.2.1** (GUI framework):
```bash
# Linux build from source
wget https://github.com/wxWidgets/wxWidgets/releases/download/v3.2.1/wxWidgets-3.2.1.tar.bz2
tar -xjf wxWidgets-3.2.1.tar.bz2
cd wxWidgets-3.2.1
mkdir build_gtk3 && cd build_gtk3
../configure --with-gtk=3 --enable-unicode --disable-shared
make -j$(nproc)
sudo make install

# Windows: Download pre-built binaries
# https://www.wxwidgets.org/downloads/
```

**OpenCV 4.7.0** (computer vision):
```bash
# Linux build from source
wget https://github.com/opencv/opencv/archive/4.7.0.tar.gz
tar -xzf 4.7.0.tar.gz
cd opencv-4.7.0
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_opencv_world=ON \
      -DBUILD_EXAMPLES=OFF \
      -DBUILD_TESTS=OFF \
      ..
make -j$(nproc)
sudo make install

# Windows: Download pre-built binaries or build with CMake
```

**FFMPEG 5.1** (video processing):
```bash
# Linux (Ubuntu/Debian)
sudo apt-get install libavcodec-dev libavformat-dev libavutil-dev \
                     libswscale-dev libavfilter-dev

# Linux (Arch)
sudo pacman -S ffmpeg

# Windows: Download pre-built shared libraries
# https://ffmpeg.org/download.html (Shared builds)
```

### Optional Dependencies

**CUDA Toolkit 12.0+** (GPU acceleration):
```bash
# Linux
wget https://developer.download.nvidia.com/compute/cuda/12.0.0/local_installers/cuda_12.0.0_525.60.13_linux.run
sudo sh cuda_12.0.0_525.60.13_linux.run

# Windows: Download installer
# https://developer.nvidia.com/cuda-downloads

# Verify installation
nvcc --version
```

**Intel TBB / oneTBB** (threading):
```bash
# Linux (Ubuntu/Debian)
sudo apt-get install libtbb-dev

# Linux (Arch)
sudo pacman -S intel-tbb

# Windows: Included with Intel oneAPI compiler
```

### System Dependencies (Linux)

**Ubuntu 20.04**:
```bash
sudo apt-get install build-essential cmake git
sudo apt-get install libgtk-3-dev libX11-dev
sudo apt-get install libavcodec-dev libavformat-dev libavutil-dev \
                     libswscale-dev libavfilter-dev
sudo apt-get install libtbb-dev
```

**Arch Linux**:
```bash
sudo pacman -S base-devel cmake git
sudo pacman -S gtk3 libx11
sudo pacman -S ffmpeg
sudo pacman -S intel-tbb
```

### Dependency Version Matrix

| Dependency | Minimum | Recommended | Platform |
|------------|---------|-------------|----------|
| CMake | 3.13 | 3.20+ | All |
| GCC | 9.4 | 12.2+ | Linux |
| Visual Studio | 2022 | 2022 | Windows |
| wxWidgets | 3.2.1 | 3.2.1 | All |
| OpenCV | 4.7.0 | 4.7.0 | All |
| FFMPEG | 5.1 | 5.1+ | All |
| CUDA | 12.0 | 12.0+ | Optional |
| Intel TBB | Any | Latest | Optional |

**Important**: See `/home/user/VideoSubFinder/Docs/build.txt` for complete platform-specific build instructions (512 lines).

---

## Contribution Guidelines

### For AI Assistants Working on This Codebase

**General Principles**:
1. **Understand before modifying**: Read existing code and comments
2. **Match existing style**: Follow naming conventions strictly
3. **Test thoroughly**: Manual testing required (no automated tests)
4. **Document changes**: Update comments, documentation files
5. **Preserve cross-platform**: Test on Windows + Linux if possible

### Code Modification Rules

**DO**:
- Use existing patterns (e.g., `simple_buffer<T>`, `custom_assert()`)
- Add logging with `SaveToReportLog()` for new features
- Respect memory management patterns (manual vs. RAII)
- Update `Settings/general.cfg` for new settings
- Add localization strings to all three language files
- Preserve backward compatibility with existing .cfg files

**DON'T**:
- Change naming conventions (stick with `m_`, `g_`, `C` prefix)
- Remove or modify author attribution in file headers
- Break cross-platform compatibility
- Add dependencies without documentation
- Modify core algorithms without understanding them
- Skip manual testing

### Specific Coding Guidelines

**Adding New Features**:
1. Plan the feature (which components affected?)
2. Add settings to `general.cfg` if needed
3. Implement in appropriate component (IPAlgorithms, etc.)
4. Add UI controls in appropriate panel
5. Add localization strings (eng/rus/chn)
6. Test manually with real videos
7. Update documentation (comments, Docs/)

**Modifying Algorithms**:
1. Read academic references (see Docs/readme_eng.txt)
2. Understand current implementation
3. Test before/after with same test videos
4. Preserve performance (use profiling)
5. Document algorithm changes in comments
6. Consider CUDA implementation for compute-heavy code

**Fixing Bugs**:
1. Reproduce the bug
2. Add debug logging to narrow down issue
3. Fix root cause (not symptoms)
4. Test fix with original bug case + other scenarios
5. Add comments explaining the fix

### Git Commit Guidelines

**Commit Message Format**:
```
<type>: <short description>

<detailed explanation if needed>

<affected files/components>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `perf`: Performance improvement
- `docs`: Documentation update
- `build`: Build system changes
- `style`: Code formatting (no logic change)

**Examples**:
```
feat: Add support for VP9 codec in FFMPEGVideo

Implements VP9 decoding using FFMPEG libvpx.
Adds hw_device support for VP9 hardware acceleration.

Components/FFMPEGVideo/FFMPEGVideo.cpp
Settings/general.cfg (new setting: vp9_hw_decode)
```

```
fix: Incorrect K-means clustering with 3 clusters

Fixed off-by-one error in cluster assignment loop.
Bug caused incorrect background removal with 3 clusters.

Components/IPAlgorithms/IPAlgorithms.cpp:2341
```

### Testing Checklist

Before committing changes:

- [ ] Code compiles without warnings (Linux + Windows if possible)
- [ ] Application runs and opens videos
- [ ] Subtitle search works (test with sample video)
- [ ] Image clearing works (check TXTImages/)
- [ ] Settings are saved/loaded correctly
- [ ] UI controls work (no crashes)
- [ ] Localization strings added for all languages
- [ ] No memory leaks (check with Valgrind/Dr. Memory)
- [ ] Performance not degraded (compare before/after)
- [ ] Documentation updated (comments, Docs/ if needed)

### Documentation Updates

**When to Update Documentation**:
- New features: Update Docs/readme_eng.txt (and rus/chn if possible)
- New settings: Document in comments + Docs/readme_eng.txt
- Build changes: Update Docs/build.txt
- Algorithm changes: Update inline comments with explanations
- This file (CLAUDE.md): Update when structure/workflow changes

**Documentation Locations**:
- User documentation: `Docs/readme_*.txt`
- Build documentation: `Docs/build.txt`
- Code documentation: Inline comments in .h/.cpp files
- AI assistant guide: This file (`CLAUDE.md`)

---

## Additional Resources

### Academic References

The codebase implements algorithms from these papers:

1. **"A NEW APPROACH FOR VIDEO TEXT DETECTION"**
   Min Cai, Jiqiang Song, Michael R. Lyu
   Chinese University of Hong Kong
   (Basis for edge detection and text region identification)

2. **"Automatic Image Segmentation by Integrating Color-Edge Extraction and Seeded Region Growing"**
   IEEE Transactions on Image Processing, 2001
   (K-means clustering, color-based segmentation)

3. **"Automatic Location of Text in Video Frames"**
   Microsoft Research China
   (Multi-frame analysis for subtitle detection)

4. **"EFFICIENT VIDEO TEXT RECOGNITION USING MULTIPLE FRAME INTEGRATION"**
   Microsoft Research Asia
   (ISA/ILA image generation algorithms)

See `Docs/readme_eng.txt` for full citations and explanations.

### External Tools Integration

**OCR Engines** (user-configured):
- **ABBYY FineReader**: High accuracy commercial OCR
- **Subtitle Edit**: Free, built-in OCR for subtitles
- **Google Drive OCR**: Cloud-based OCR (upload images)
- **Baidu OCR**: Chinese text recognition
- **Tesseract**: Open-source OCR engine

**Video Processing**:
- **AviSynth+**: Video filtering scripts (FFMPEG integration)
- **FFMPEG filters**: Built-in video processing (blur, denoise, etc.)

### Support Channels

**Official Support**:
- **SourceForge Forum**: https://sourceforge.net/p/videosubfinder/discussion/
- **Bug Tracker**: https://sourceforge.net/p/videosubfinder/bugs/
- **Author Contact**: skosnits@gmail.com, https://vk.com/skosnits

**Project Links**:
- **Primary Repository**: https://sourceforge.net/p/videosubfinder/
- **GitHub Mirror**: https://github.com/[username]/VideoSubFinder
- **Gitee Mirror**: https://gitee.com/[username]/VideoSubFinder

---

## Appendix: File Reference

### Component File Breakdown

**IPAlgorithms Component** (13 files):
```
Components/IPAlgorithms/
├── IPAlgorithms.cpp            (8,349 lines - core algorithms)
├── IPAlgorithms.h              (Function declarations)
├── SSAlgorithms.cpp            (4,267 lines - subtitle search)
├── SSAlgorithms.h
├── MyClosedFigure.cpp
├── MyClosedFigure.h
└── ... (other supporting files)
```

**VideoSubFinderWXW Application** (46 files):
```
Interfaces/VideoSubFinderWXW/
├── MainFrm.cpp                 (3,481 lines - main window)
├── MainFrm.h
├── VideoBox.cpp/h              (Video display panel)
├── ImageBox.cpp/h              (Image display panel)
├── SearchPanel.cpp/h           (Search controls)
├── OCRPanel.cpp/h              (OCR controls)
├── SettingsPanel.cpp/h         (Settings UI)
├── EditPanel.cpp/h             (Image editing)
├── SSOWnd.cpp/h                (Settings orchestration)
└── ... (17 custom controls)
```

**Total Codebase**: 61 source files, ~26,200 lines of C++ code

---

## Document Maintenance

**Version**: 1.0
**Last Updated**: 2025-11-15
**Updated By**: Claude (AI Assistant)
**Next Review**: When major architectural changes occur

**Update Triggers**:
- New component added
- Build system changes
- Major algorithm modifications
- New dependencies required
- Development workflow changes

**How to Update**:
1. Edit this file (`CLAUDE.md`)
2. Update "Last Updated" date
3. Increment version number
4. Commit with message: `docs: Update CLAUDE.md - [brief description]`

---

## Quick Navigation

**Jump to Section**:
- [Quick Reference](#quick-reference) - Commands and file paths
- [Project Overview](#project-overview) - What is VideoSubFinder?
- [Codebase Structure](#codebase-structure) - Directory layout
- [Code Conventions](#code-conventions) - Naming and patterns
- [Key Components Reference](#key-components-reference) - Component details
- [Common Tasks](#common-tasks) - How-to guides
- [Build System](#build-system) - Compilation instructions
- [Testing & Debugging](#testing--debugging) - Debug and test
- [Configuration System](#configuration-system) - Settings management
- [Dependencies](#dependencies) - Required libraries

---

**END OF CLAUDE.MD**
