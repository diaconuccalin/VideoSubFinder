# VideoSubFinder Web

Browser-based subtitle extraction tool for hardcoded subtitles.

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **OpenCV.js** - Image processing (to be added)
- **Tesseract.js** - OCR engine

## Project Structure

```
web-app/
├── src/
│   ├── components/       # React components
│   │   ├── common/      # Reusable UI components
│   │   ├── steps/       # 8-step workflow components
│   │   ├── video/       # Video player components
│   │   ├── image/       # Image editor components
│   │   └── layout/      # Layout components
│   ├── core/            # Core algorithms (ported from C++)
│   ├── workers/         # Web Workers for parallel processing
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── config/          # Configuration settings
│   ├── hooks/           # React custom hooks
│   └── context/         # React Context providers
├── public/              # Static assets
└── dist/                # Production build (generated)
```

## 8-Step Workflow

1. **Select Video** - Load video file from local storage
2. **Auto-Detect Position** - Automatically detect subtitle region
3. **Manual Adjustment** - Fine-tune detection boundaries
4. **Search Subtitles** - Scan entire video for subtitle frames
5. **Clear Images** - Remove background using K-means clustering
6. **Manual Cleanup** - Review and edit cleared images
7. **Apply OCR** - Recognize text using Tesseract.js
8. **Generate Subtitles** - Create SRT/VTT/ASS subtitle file

## Development Status

- [x] Project setup
- [x] Basic layout and navigation
- [x] Step 1: Video selection
- [ ] Step 2: Auto-detection (in progress)
- [ ] Step 3: Manual adjustment
- [ ] Step 4: Subtitle search
- [ ] Step 5: Image clearing
- [ ] Step 6: Manual cleanup
- [ ] Step 7: OCR
- [ ] Step 8: Subtitle generation

## License

GPL v2 (same as VideoSubFinder C++ application)
