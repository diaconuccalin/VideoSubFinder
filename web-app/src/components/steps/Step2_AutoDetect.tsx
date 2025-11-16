/**
 * Step 2: Auto-Detect and Adjust Subtitle Position
 *
 * Automatically detects subtitle regions using the AutoDetectSubtitleBounds algorithm
 * from the YellowSubtitles branch C++ codebase (MainFrm.cpp lines 921-1431).
 *
 * After detection, allows manual adjustment by dragging and resizing the detected rectangle.
 * Uses OpenCV.js for contour-based detection matching the exact C++ implementation.
 */

import { useEffect, useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  autoDetectSubtitleBounds,
  AutoDetectParams,
  DEFAULT_AUTO_DETECT_PARAMS,
} from '../../algorithms/autoDetectSubtitleBounds';
import { BoundingBox } from '../../types/video.types';

type InteractionMode = 'none' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r';

export function Step2_AutoDetect() {
  const { state, setDetectedRegion, completeStep, goToStep } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedRegion, setDetectedRegionState] = useState<BoundingBox | null>(null);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectTotal, setDetectTotal] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectionStats, setDetectionStats] = useState<{
    framesProcessed: number;
    contoursFound: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Interactive rectangle adjustment
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [originalRegion, setOriginalRegion] = useState<BoundingBox | null>(null);
  const [hoverMode, setHoverMode] = useState<InteractionMode>('none');

  // Detection parameters (can be adjusted by user)
  const [params, setParams] = useState<AutoDetectParams>(DEFAULT_AUTO_DETECT_PARAMS);

  // Restore detected region from global state when component mounts
  useEffect(() => {
    if (state.detectedRegion && !detectedRegion) {
      setDetectedRegionState(state.detectedRegion);
    }
  }, [state.detectedRegion]);

  // Auto-detect on video change (only if no previous detection exists for this video)
  useEffect(() => {
    // Clear detection when video changes
    const videoChanged = state.videoUrl && state.videoUrl !== '';
    // Don't auto-detect if we have cached bounds from a previous session
    if (videoChanged && !state.detectedRegion && !detectedRegion) {
      // Only run auto-detection if no previous detection exists
      if (!isDetecting) {
        runAutoDetection();
      }
    }
  }, [state.videoUrl]);

  // Set up video element and canvas drawing
  useEffect(() => {
    if (state.videoUrl && videoRef.current) {
      const video = videoRef.current;
      let animationFrameId: number | null = null;

      const updateCanvas = () => {
        if (canvasRef.current && video.readyState >= 2) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

          // Draw current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw overlay if region is detected
          if (detectedRegion) {
            // Scale detection coordinates to canvas dimensions
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;

            const scaledRegion = {
              xmin: detectedRegion.xmin * scaleX,
              ymin: detectedRegion.ymin * scaleY,
              xmax: detectedRegion.xmax * scaleX,
              ymax: detectedRegion.ymax * scaleY,
            };

            // Semi-transparent green overlay
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(
              scaledRegion.xmin,
              scaledRegion.ymin,
              scaledRegion.xmax - scaledRegion.xmin,
              scaledRegion.ymax - scaledRegion.ymin
            );

            // Green border (4px thick)
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.strokeRect(
              scaledRegion.xmin,
              scaledRegion.ymin,
              scaledRegion.xmax - scaledRegion.xmin,
              scaledRegion.ymax - scaledRegion.ymin
            );

            // Corner markers
            const markerSize = 20;
            ctx.fillStyle = '#00FF00';

            // Top-left
            ctx.fillRect(scaledRegion.xmin - 2, scaledRegion.ymin - 2, markerSize, 4);
            ctx.fillRect(scaledRegion.xmin - 2, scaledRegion.ymin - 2, 4, markerSize);

            // Top-right
            ctx.fillRect(scaledRegion.xmax - markerSize + 2, scaledRegion.ymin - 2, markerSize, 4);
            ctx.fillRect(scaledRegion.xmax - 2, scaledRegion.ymin - 2, 4, markerSize);

            // Bottom-left
            ctx.fillRect(scaledRegion.xmin - 2, scaledRegion.ymax - 2, markerSize, 4);
            ctx.fillRect(scaledRegion.xmin - 2, scaledRegion.ymax - markerSize + 2, 4, markerSize);

            // Bottom-right
            ctx.fillRect(scaledRegion.xmax - markerSize + 2, scaledRegion.ymax - 2, markerSize, 4);
            ctx.fillRect(scaledRegion.xmax - 2, scaledRegion.ymax - markerSize + 2, 4, markerSize);
          }
        }
      };

      // Use requestAnimationFrame for smooth updates when playing
      const renderLoop = () => {
        if (!video.paused && !video.ended) {
          setCurrentTime(video.currentTime);
          updateCanvas();
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      };

      const onPlay = () => {
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      };

      const onPause = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        updateCanvas();
      };

      const onTimeUpdate = () => {
        if (video.paused) {
          setCurrentTime(video.currentTime);
        }
      };

      const onLoadedMetadata = () => {
        if (canvasRef.current) {
          // Limit canvas resolution for better performance and fit within container
          const maxWidth = 1280;
          const maxHeight = 500;
          const aspectRatio = video.videoWidth / video.videoHeight;

          let canvasWidth = video.videoWidth;
          let canvasHeight = video.videoHeight;

          // Scale down if width exceeds max
          if (canvasWidth > maxWidth) {
            canvasWidth = maxWidth;
            canvasHeight = maxWidth / aspectRatio;
          }

          // Scale down if height exceeds max
          if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = maxHeight * aspectRatio;
          }

          canvasRef.current.width = canvasWidth;
          canvasRef.current.height = canvasHeight;
        }
        updateCanvas();
      };

      const onSeeked = () => {
        setCurrentTime(video.currentTime);
        updateCanvas();
      };

      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('seeked', onSeeked);

      if (video.readyState >= 2) {
        onLoadedMetadata();
      }

      return () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('seeked', onSeeked);
      };
    }
  }, [state.videoUrl, detectedRegion]);

  // Helper function to get interaction mode based on mouse position
  const getInteractionMode = (mouseX: number, mouseY: number, region: BoundingBox, canvas: HTMLCanvasElement): InteractionMode => {
    if (!videoRef.current) return 'none';

    const scaleX = canvas.width / videoRef.current.videoWidth;
    const scaleY = canvas.height / videoRef.current.videoHeight;

    const scaledRegion = {
      xmin: region.xmin * scaleX,
      ymin: region.ymin * scaleY,
      xmax: region.xmax * scaleX,
      ymax: region.ymax * scaleY,
    };

    const handleSize = 12;
    const edgeThreshold = 8;

    // Check corners first (priority)
    if (Math.abs(mouseX - scaledRegion.xmin) < handleSize && Math.abs(mouseY - scaledRegion.ymin) < handleSize) return 'resize-tl';
    if (Math.abs(mouseX - scaledRegion.xmax) < handleSize && Math.abs(mouseY - scaledRegion.ymin) < handleSize) return 'resize-tr';
    if (Math.abs(mouseX - scaledRegion.xmin) < handleSize && Math.abs(mouseY - scaledRegion.ymax) < handleSize) return 'resize-bl';
    if (Math.abs(mouseX - scaledRegion.xmax) < handleSize && Math.abs(mouseY - scaledRegion.ymax) < handleSize) return 'resize-br';

    // Check edges
    if (Math.abs(mouseY - scaledRegion.ymin) < edgeThreshold && mouseX > scaledRegion.xmin && mouseX < scaledRegion.xmax) return 'resize-t';
    if (Math.abs(mouseY - scaledRegion.ymax) < edgeThreshold && mouseX > scaledRegion.xmin && mouseX < scaledRegion.xmax) return 'resize-b';
    if (Math.abs(mouseX - scaledRegion.xmin) < edgeThreshold && mouseY > scaledRegion.ymin && mouseY < scaledRegion.ymax) return 'resize-l';
    if (Math.abs(mouseX - scaledRegion.xmax) < edgeThreshold && mouseY > scaledRegion.ymin && mouseY < scaledRegion.ymax) return 'resize-r';

    // Check if inside rectangle (for moving)
    if (mouseX > scaledRegion.xmin && mouseX < scaledRegion.xmax && mouseY > scaledRegion.ymin && mouseY < scaledRegion.ymax) {
      return 'move';
    }

    return 'none';
  };

  // Get cursor style based on interaction mode
  const getCursor = (mode: InteractionMode): string => {
    switch (mode) {
      case 'move': return 'move';
      case 'resize-tl': case 'resize-br': return 'nwse-resize';
      case 'resize-tr': case 'resize-bl': return 'nesw-resize';
      case 'resize-t': case 'resize-b': return 'ns-resize';
      case 'resize-l': case 'resize-r': return 'ew-resize';
      default: return 'default';
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!detectedRegion || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mode = getInteractionMode(mouseX, mouseY, detectedRegion, canvasRef.current);

    if (mode !== 'none') {
      setInteractionMode(mode);
      setDragStart({ x: mouseX, y: mouseY });
      setOriginalRegion({ ...detectedRegion });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update cursor based on hover
    if (detectedRegion && interactionMode === 'none') {
      const mode = getInteractionMode(mouseX, mouseY, detectedRegion, canvasRef.current);
      setHoverMode(mode);
    }

    // Handle dragging/resizing
    if (interactionMode !== 'none' && dragStart && originalRegion && videoRef.current) {
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;

      const scaleX = videoRef.current.videoWidth / canvasRef.current.width;
      const scaleY = videoRef.current.videoHeight / canvasRef.current.height;

      const scaledDeltaX = deltaX * scaleX;
      const scaledDeltaY = deltaY * scaleY;

      let newRegion = { ...originalRegion };

      switch (interactionMode) {
        case 'move':
          newRegion = {
            xmin: originalRegion.xmin + scaledDeltaX,
            ymin: originalRegion.ymin + scaledDeltaY,
            xmax: originalRegion.xmax + scaledDeltaX,
            ymax: originalRegion.ymax + scaledDeltaY,
          };
          break;
        case 'resize-tl':
          newRegion.xmin = originalRegion.xmin + scaledDeltaX;
          newRegion.ymin = originalRegion.ymin + scaledDeltaY;
          break;
        case 'resize-tr':
          newRegion.xmax = originalRegion.xmax + scaledDeltaX;
          newRegion.ymin = originalRegion.ymin + scaledDeltaY;
          break;
        case 'resize-bl':
          newRegion.xmin = originalRegion.xmin + scaledDeltaX;
          newRegion.ymax = originalRegion.ymax + scaledDeltaY;
          break;
        case 'resize-br':
          newRegion.xmax = originalRegion.xmax + scaledDeltaX;
          newRegion.ymax = originalRegion.ymax + scaledDeltaY;
          break;
        case 'resize-t':
          newRegion.ymin = originalRegion.ymin + scaledDeltaY;
          break;
        case 'resize-b':
          newRegion.ymax = originalRegion.ymax + scaledDeltaY;
          break;
        case 'resize-l':
          newRegion.xmin = originalRegion.xmin + scaledDeltaX;
          break;
        case 'resize-r':
          newRegion.xmax = originalRegion.xmax + scaledDeltaX;
          break;
      }

      // Round to nearest pixel
      newRegion.xmin = Math.round(newRegion.xmin);
      newRegion.ymin = Math.round(newRegion.ymin);
      newRegion.xmax = Math.round(newRegion.xmax);
      newRegion.ymax = Math.round(newRegion.ymax);

      // Clamp to video bounds and ensure minimum size
      const minSize = 20;
      newRegion.xmin = Math.max(0, Math.min(newRegion.xmin, videoRef.current.videoWidth - minSize));
      newRegion.ymin = Math.max(0, Math.min(newRegion.ymin, videoRef.current.videoHeight - minSize));
      newRegion.xmax = Math.min(videoRef.current.videoWidth, Math.max(newRegion.xmax, newRegion.xmin + minSize));
      newRegion.ymax = Math.min(videoRef.current.videoHeight, Math.max(newRegion.ymax, newRegion.ymin + minSize));

      setDetectedRegionState(newRegion);
    }
  };

  const handleMouseUp = () => {
    if (interactionMode !== 'none' && detectedRegion) {
      // Save adjusted region to global state
      setDetectedRegion(detectedRegion);
    }
    setInteractionMode('none');
    setDragStart(null);
    setOriginalRegion(null);
  };

  const handleMouseLeave = () => {
    setHoverMode('none');
    // Don't cancel drag if user leaves canvas while dragging
  };

  const runAutoDetection = async () => {
    if (!state.videoUrl || !state.videoMetadata) {
      return;
    }

    setIsDetecting(true);
    setDetectProgress(0);
    setDetectTotal(0);

    try {
      // Create video element
      const video = document.createElement('video');
      video.src = state.videoUrl;
      video.crossOrigin = 'anonymous';

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve());
        video.addEventListener('error', () => reject(new Error('Failed to load video')));
      });

      // Run AutoDetectSubtitleBounds algorithm
      const result = await autoDetectSubtitleBounds(
        video,
        state.videoMetadata.duration,
        params,
        (current, total) => {
          setDetectProgress(current);
          setDetectTotal(total);
        }
      );

      setDetectionStats({
        framesProcessed: result.framesProcessed,
        contoursFound: result.contoursFound,
      });

      if (result.bounds) {
        setDetectedRegionState(result.bounds);
        // Save to global state immediately so it persists when switching steps
        setDetectedRegion(result.bounds);
      } else {
        alert('No subtitle regions detected. The video may not contain hardcoded subtitles, or they may be in an unusual position.');
      }
    } catch (error) {
      console.error('Auto-detection failed:', error);
      alert('Auto-detection failed. Please try adjusting the parameters or set bounds manually.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);

      // Auto-pause when scrubbing
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSkipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 3);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current && state.videoMetadata) {
      videoRef.current.currentTime = Math.min(
        state.videoMetadata.duration,
        videoRef.current.currentTime + 3
      );
    }
  };

  const handleRedetect = () => {
    setDetectedRegionState(null);
    setDetectionStats(null);
    // Clear global state so new detection will run
    setDetectedRegion(null);
    runAutoDetection();
  };

  const handleContinue = () => {
    if (detectedRegion) {
      setDetectedRegion(detectedRegion);
      completeStep('auto-detect');
      // Skip manual-adjust step since it's now integrated here
      completeStep('manual-adjust');
      goToStep('search-subtitles');
    }
  };

  const handleParamChange = <K extends keyof AutoDetectParams>(
    key: K,
    value: AutoDetectParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBounds = (bounds: BoundingBox, width: number, height: number) => {
    const topPct = ((bounds.ymin / height) * 100).toFixed(1);
    const bottomPct = ((bounds.ymax / height) * 100).toFixed(1);
    const leftPct = ((bounds.xmin / width) * 100).toFixed(1);
    const rightPct = ((bounds.xmax / width) * 100).toFixed(1);

    return `Top: ${topPct}%, Bottom: ${bottomPct}%, Left: ${leftPct}%, Right: ${rightPct}%`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-submarine-deep-blue mb-4">
          Detect & Adjust Subtitle Bounds
        </h2>

        {/* Video Preview with Overlay */}
        <div className="mb-6">
          <div className="border-2 border-submarine-sky rounded-lg bg-gray-900">
            {isDetecting ? (
              <div className="py-32 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-submarine-ocean mx-auto mb-4"></div>
                <p className="text-white font-semibold mb-2">Analyzing video frames...</p>
                {detectTotal > 0 && (
                  <p className="text-white text-sm">
                    Processing frame {detectProgress} of {detectTotal}
                  </p>
                )}
                {detectTotal > 0 && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-submarine-ocean h-2 rounded-full transition-all"
                        style={{ width: `${(detectProgress / detectTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : state.videoUrl ? (
              <div>
                {/* Video and Canvas Container */}
                <div className="relative overflow-hidden flex items-center justify-center" style={{ maxHeight: '500px' }}>
                  <video
                    ref={videoRef}
                    src={state.videoUrl}
                    className="hidden"
                    crossOrigin="anonymous"
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="block max-w-full max-h-full"
                    style={{ cursor: getCursor(hoverMode) }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                  />
                </div>

                {/* Video Controls */}
                <div className="bg-gray-800 p-4 space-y-3">
                  {/* Timeline Slider */}
                  <div className="flex items-center space-x-3">
                    <span className="text-white text-sm font-mono min-w-[4rem]">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={state.videoMetadata?.duration || 0}
                      step="0.1"
                      value={currentTime}
                      onChange={handleTimelineChange}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3B9DD7 0%, #3B9DD7 ${(currentTime / (state.videoMetadata?.duration || 1)) * 100}%, #374151 ${(currentTime / (state.videoMetadata?.duration || 1)) * 100}%, #374151 100%)`,
                      }}
                    />
                    <span className="text-white text-sm font-mono min-w-[4rem] text-right">
                      {formatTime(state.videoMetadata?.duration || 0)}
                    </span>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    {/* Skip Backward 3s */}
                    <button
                      onClick={handleSkipBackward}
                      className="bg-submarine-ocean hover:bg-submarine-deep-blue text-white rounded-full p-3 transition-colors"
                      title="Skip backward 3 seconds"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                      </svg>
                    </button>

                    {/* Play/Pause Button */}
                    <button
                      onClick={handlePlayPause}
                      className="bg-submarine-ocean hover:bg-submarine-deep-blue text-white rounded-full p-3 transition-colors"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Skip Forward 3s */}
                    <button
                      onClick={handleSkipForward}
                      className="bg-submarine-ocean hover:bg-submarine-deep-blue text-white rounded-full p-3 transition-colors"
                      title="Skip forward 3 seconds"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-32 text-center">
                <p className="text-gray-400">No video loaded</p>
              </div>
            )}
          </div>
          {detectedRegion && (
            <div className="mt-3 space-y-2">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-yellow-800">
                      Please verify and adjust the detected bounds
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Auto-detection can be imprecise. We recommend manually adjusting the green rectangle to ensure it perfectly covers the subtitle area before continuing.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      🎯 <strong>Drag to move</strong> the region, or <strong>drag the edges/corners to resize</strong>. Use the timeline to scrub through the video and verify accuracy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detection Results */}
        {detectedRegion && state.videoMetadata && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-submarine-deep-blue mb-3">Detected Region</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Bounds:</span>
                <span className="text-sm text-gray-900">
                  {formatBounds(
                    detectedRegion,
                    state.videoMetadata.width,
                    state.videoMetadata.height
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Size:</span>
                <span className="text-sm text-gray-900">
                  {detectedRegion.xmax - detectedRegion.xmin} ×{' '}
                  {detectedRegion.ymax - detectedRegion.ymin} px
                </span>
              </div>
              {detectionStats && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Frames Processed:</span>
                    <span className="text-sm text-gray-900">{detectionStats.framesProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Contours Found:</span>
                    <span className="text-sm text-gray-900">{detectionStats.contoursFound}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!detectedRegion && !isDetecting && detectionStats && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <p className="text-yellow-800 font-semibold mb-2">No subtitle regions detected.</p>
            <p className="text-yellow-700 text-sm">
              Processed {detectionStats.framesProcessed} frames and found {detectionStats.contoursFound} contours,
              but none met the subtitle detection criteria. Try adjusting the parameters below.
            </p>
          </div>
        )}

        {/* Advanced Parameters */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-submarine-ocean hover:text-submarine-deep-blue font-semibold mb-3 flex items-center"
          >
            <svg
              className={`w-5 h-5 mr-2 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Detection Parameters
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sample Interval (ms)
                </label>
                <input
                  type="number"
                  value={params.sampleIntervalMs}
                  onChange={(e) => handleParamChange('sampleIntervalMs', Number(e.target.value))}
                  className="input-field w-full"
                  min="500"
                  max="5000"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time between frame samples (default: 1500ms)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Threshold Value
                </label>
                <input
                  type="number"
                  value={params.thresholdValue}
                  onChange={(e) => handleParamChange('thresholdValue', Number(e.target.value))}
                  className="input-field w-full"
                  min="50"
                  max="250"
                />
                <p className="text-xs text-gray-500 mt-1">Binary threshold (default: 150)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Min Contour Area
                </label>
                <input
                  type="number"
                  value={params.minContourArea}
                  onChange={(e) => handleParamChange('minContourArea', Number(e.target.value))}
                  className="input-field w-full"
                  min="1"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum contour size (default: 7)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Max Aspect Ratio
                </label>
                <input
                  type="number"
                  value={params.maxAspectRatio}
                  onChange={(e) => handleParamChange('maxAspectRatio', Number(e.target.value))}
                  className="input-field w-full"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max width/height ratio (default: 1.5)
                </p>
              </div>

              <div className="md:col-span-2">
                <button onClick={handleRedetect} className="btn-secondary" disabled={isDetecting}>
                  Re-run Detection with New Parameters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToStep('video-select')}
            className="text-submarine-ocean hover:text-submarine-deep-blue font-semibold"
          >
            ← Back to Video Selection
          </button>

          <button onClick={handleContinue} disabled={!detectedRegion} className="btn-primary">
            Continue to Search Subtitles →
          </button>
        </div>
      </div>
    </div>
  );
}
