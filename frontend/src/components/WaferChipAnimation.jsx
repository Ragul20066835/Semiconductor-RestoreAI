import React from 'react';
import { motion } from 'framer-motion';

export default function WaferChipAnimation() {
  // Generate a grid of semiconductor wafer dies (8x8)
  const dies = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      // Calculate circular distance from center to represent a circular silicon wafer
      const dx = i - 3.5;
      const dy = j - 3.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isWafer = dist <= 4.0; // Wafer is circular
      
      if (isWafer) {
        dies.push({ id: `${i}-${j}`, x: i, y: j, delay: (i + j) * 0.1 });
      }
    }
  }

  return (
    <div className="relative w-full aspect-square max-w-[420px] mx-auto flex items-center justify-center">
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-blue/20 to-accent-cyan/10 blur-[40px] animate-pulse pointer-events-none" />

      {/* SVG Canvas */}
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full relative z-10 filter drop-shadow-[0_0_15px_rgba(37,99,235,0.35)]"
      >
        <defs>
          <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="laserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
            <stop offset="10%" stopColor="#2563eb" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="waferGrad" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#111827" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#374151" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Wafer Silhouette (Circular Disk) */}
        <circle 
          cx="100" 
          cy="100" 
          r="80" 
          fill="url(#waferGrad)" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="1.5" 
        />
        
        {/* Wafer Flat edge alignment key (industry standard wafer notch) */}
        <path 
          d="M 90 180 Q 100 178 110 180 L 90 180" 
          fill="#111827" 
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
        />

        {/* Circuit Interconnects */}
        <motion.path
          d="M20 100 H180 M100 20 V180 M43 43 L157 157 M157 43 L43 157"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.5"
          fill="none"
        />

        {/* Wafer grid lines */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.5">
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={`v-${i}`} x1={20 + i * 10} y1="20" x2={20 + i * 10} y2="180" />
          ))}
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={`h-${i}`} x1="20" y1={20 + i * 10} x2="180" y2={20 + i * 10} />
          ))}
        </g>

        {/* Dynamic Wafer Dies */}
        {dies.map((die) => {
          // Map x,y coordinates (0..7) to SVG coordinate space (40..160)
          const svgX = 35 + die.x * 16;
          const svgY = 35 + die.y * 16;
          
          return (
            <motion.rect
              key={die.id}
              x={svgX}
              y={svgY}
              width="14"
              height="14"
              rx="1.5"
              fill="rgba(37,99,235,0.05)"
              stroke="rgba(37,99,235,0.15)"
              strokeWidth="0.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.6, 1, 0.6],
                fill: [
                  "rgba(37, 99, 235, 0.05)",
                  "rgba(6, 182, 212, 0.15)",
                  "rgba(37, 99, 235, 0.05)"
                ]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                delay: die.delay,
                ease: "easeInOut" 
              }}
              whileHover={{ 
                scale: 1.1, 
                fill: "rgba(6, 182, 212, 0.4)", 
                stroke: "#06b6d4" 
              }}
              className="cursor-pointer"
            />
          );
        })}

        {/* Holographic Restoration Beam (Scanner Sweep) */}
        <motion.polygon
          points="40,20 160,20 180,180 20,180"
          fill="url(#laserGrad)"
          initial={{ opacity: 0.15, y: -80 }}
          animate={{ 
            opacity: [0.1, 0.45, 0.1],
            y: [-70, 70, -70]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          style={{ mixBlendMode: 'screen', originX: 0.5, originY: 0.5 }}
          className="pointer-events-none"
        />

        {/* Laser Sweep line */}
        <motion.line
          x1="20"
          y1="100"
          x2="180"
          y2="100"
          stroke="#06b6d4"
          strokeWidth="1.5"
          filter="url(#glow)"
          initial={{ y: -80 }}
          animate={{ y: [-70, 70, -70] }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="pointer-events-none"
        />

        {/* Floating AI Particles */}
        <motion.circle
          cx="60"
          cy="70"
          r="1.5"
          fill="#06b6d4"
          animate={{ y: [-5, 5, -5], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.circle
          cx="140"
          cy="120"
          r="1.2"
          fill="#7c3aed"
          animate={{ y: [5, -5, 5], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
        />
        <motion.circle
          cx="90"
          cy="140"
          r="1"
          fill="#22c55e"
          animate={{ y: [-3, 3, -3], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
        />
        
        {/* Core Chip at the center of the wafer */}
        <rect 
          x="88" 
          y="88" 
          width="24" 
          height="24" 
          rx="3" 
          fill="#09090b" 
          stroke="url(#gradientStroke)" 
          strokeWidth="1" 
        />
        <circle cx="100" cy="100" r="4" fill="#06b6d4" className="animate-pulse" />
        <path d="M94 94 H106 V106 H94 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        
        {/* Defs filter glow */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="gradientStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </svg>
    </div>
  );
}
