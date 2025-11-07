#!/bin/bash
# Build and run script for VideoSubFinder (MSYS2 UCRT64)
# Usage: ./build_and_run.sh

set -e  # Exit on any error

echo "=================================="
echo "VideoSubFinder Build Script"
echo "=================================="
echo ""

# Check if we're in MSYS2 UCRT64 environment
if [[ "$MSYSTEM" != "UCRT64" ]]; then
    echo "ERROR: This script must be run in MSYS2 UCRT64 terminal!"
    echo "Please open 'MSYS2 UCRT64' from the Start Menu and run this script again."
    exit 1
fi

# Check and install dependencies
echo "Checking dependencies..."
MISSING_DEPS=()

if ! pacman -Qs mingw-w64-ucrt-x86_64-toolchain > /dev/null; then
    MISSING_DEPS+=("mingw-w64-ucrt-x86_64-toolchain")
fi

if ! pacman -Qs mingw-w64-ucrt-x86_64-cmake > /dev/null; then
    MISSING_DEPS+=("mingw-w64-ucrt-x86_64-cmake")
fi

if ! pacman -Qs mingw-w64-ucrt-x86_64-wxwidgets3.2-msw > /dev/null; then
    MISSING_DEPS+=("mingw-w64-ucrt-x86_64-wxwidgets3.2-msw")
fi

if ! pacman -Qs mingw-w64-ucrt-x86_64-opencv > /dev/null; then
    MISSING_DEPS+=("mingw-w64-ucrt-x86_64-opencv")
fi

if ! pacman -Qs mingw-w64-ucrt-x86_64-ffmpeg > /dev/null; then
    MISSING_DEPS+=("mingw-w64-ucrt-x86_64-ffmpeg")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "Missing dependencies detected. Installing..."
    echo "Packages to install: ${MISSING_DEPS[@]}"
    pacman -S --needed --noconfirm "${MISSING_DEPS[@]}"
    echo "Dependencies installed successfully!"
else
    echo "All dependencies are already installed."
fi

echo ""
echo "Building VideoSubFinder..."
echo ""

# Clean previous build
rm -rf build_msys2
mkdir build_msys2
cd build_msys2

# Configure with CMake
# CMakeLists.txt now auto-detects MSYS2 and uses find_package for libraries
echo "Configuring with CMake..."
echo ""
echo "Note: CUDA is not supported with MSYS2 (nvcc requires Visual Studio)."
echo "Building without CUDA - perfect for development!"
echo ""

cmake -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release ..

# Build
echo ""
echo "Building project..."
cmake --build . -j $(nproc)

echo ""
echo "=================================="
echo "Build completed successfully!"
echo "=================================="
echo ""

# Copy necessary files to build directory for running
echo "Setting up runtime environment..."
mkdir -p Interfaces/VideoSubFinderWXW/settings

# Copy general.cfg
if [ -f "../Settings/general.cfg" ]; then
    cp ../Settings/general.cfg Interfaces/VideoSubFinderWXW/settings/
    echo "Copied general.cfg"
fi

# Copy localization settings
if [ -d "../Settings/Localization" ]; then
    cp -r ../Settings/Localization/* Interfaces/VideoSubFinderWXW/settings/ 2>/dev/null || true
    echo "Copied localization files"
fi

# Copy bitmaps if they exist
if [ -d "../Data/bitmaps" ]; then
    mkdir -p Interfaces/VideoSubFinderWXW/bitmaps
    cp -r ../Data/bitmaps/* Interfaces/VideoSubFinderWXW/bitmaps/ 2>/dev/null || true
    echo "Copied bitmaps"
fi

echo ""
echo "Running VideoSubFinderWXW..."
echo ""

# Run the application from build directory
cd Interfaces/VideoSubFinderWXW
./VideoSubFinderWXW.exe
