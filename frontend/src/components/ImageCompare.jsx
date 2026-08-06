import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

export default function ImageCompare({ 
  leftImage, 
  rightImage, 
  leftLabel = "Noisy Wafer", 
  rightLabel = "Restored AI" 
}) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 2 = 200%...
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // Handle slider movement
  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleTouchMove = (e) => {
    if (isPanning) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleMove(e.clientX);
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.slider-bar')) {
      setIsDragging(true);
      e.preventDefault();
    } else if (zoomLevel > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsPanning(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Reset zoom and pan
  const handleZoomReset = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!isFullscreen) {
      if (viewerRef.current.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={viewerRef}
      className={`flex flex-col rounded-2xl overflow-hidden glass-panel border border-white/5 ${
        isFullscreen ? 'w-screen h-screen bg-[#09090B] p-4 justify-center' : 'w-full'
      }`}
    >
      {/* Visual Controls Header */}
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
        <div className="flex gap-2">
          <span className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400">
            BEFORE
          </span>
          <span className="px-2.5 py-1 rounded bg-success-green/10 border border-success-green/20 text-[10px] font-bold text-success-green-400">
            AFTER (restored)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoomLevel(prev => Math.min(4, prev + 1))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          {zoomLevel > 1 && (
            <button 
              onClick={handleZoomReset}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs transition"
            >
              Reset {zoomLevel}x
            </button>
          )}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            title="Fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Image Slider Viewport */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onTouchMove={handleTouchMove}
        className={`relative overflow-hidden aspect-video select-none bg-black ${
          zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        style={{
          maxHeight: isFullscreen ? 'calc(100vh - 80px)' : 'none'
        }}
      >
        {/* Render both original (left) and restored (right) layers */}
        <div 
          className="w-full h-full relative"
          style={{
            transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Right Image (Restored AI - Background layer) */}
          <img 
            src={rightImage} 
            alt={rightLabel}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable="false"
          />
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/70 text-[10px] text-gray-300 font-bold uppercase tracking-wider">
            {rightLabel}
          </div>

          {/* Left Image (Noisy Image - Clipped foreground layer) */}
          <div 
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
          >
            <img 
              src={leftImage} 
              alt={leftLabel}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable="false"
            />
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 text-[10px] text-gray-300 font-bold uppercase tracking-wider">
              {leftLabel}
            </div>
          </div>
        </div>

        {/* Sliding Divider Bar overlay */}
        <div 
          className="slider-bar absolute top-0 bottom-0 w-1 bg-primary-blue cursor-ew-resize z-20 shadow-[0_0_10px_#2563eb]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-blue border border-white/20 shadow-lg flex items-center justify-center pointer-events-none">
            <Move size={14} className="text-white rotate-90" />
          </div>
        </div>

        {/* Zoom Instructions Overlay */}
        {zoomLevel > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/5 text-[10px] text-gray-400 font-medium flex items-center gap-1.5 pointer-events-none">
            <Move size={11} className="text-accent-cyan" /> Drag mouse to pan wafer surface
          </div>
        )}
      </div>
    </div>
  );
}
