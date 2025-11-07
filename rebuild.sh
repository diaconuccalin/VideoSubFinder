#!/bin/bash
# Quick rebuild script for VideoSubFinder (MSYS2 UCRT64)
# Use this after initial build when you've made code changes
# Usage: ./rebuild.sh

set -e  # Exit on any error

echo "Quick rebuild of VideoSubFinder..."

cd build_msys2
cmake --build . -j $(nproc)

echo ""
echo "Rebuild complete! Running application..."
echo ""

cd Interfaces/VideoSubFinderWXW
./VideoSubFinderWXW.exe
