import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, BookOpen, GitFork, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import WaferChipAnimation from '../components/WaferChipAnimation';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 py-6 md:py-12">
      {/* Hero Content */}
      <div className="flex-1 space-y-8 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-blue/10 border border-primary-blue/20 text-xs font-semibold text-primary-blue">
          <Sparkles size={13} className="animate-pulse" />
          AI Super-Resolution SwinIR Engine
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Semiconductor <br />
            <span className="bg-gradient-to-r from-primary-blue via-secondary-purple to-accent-cyan bg-clip-text text-transparent">
              RestoreAI
            </span>
          </h1>
          <h2 className="text-lg md:text-xl font-semibold text-gray-400">
            AI-Powered Semiconductor Image Restoration using Deep Learning
          </h2>
          <p className="text-sm md:text-base text-gray-500 max-w-xl leading-relaxed">
            Restore semiconductor wafer images using an advanced AI restoration model. Denoise and enhance low-resolution scans to detect micro-scale defect signatures on silicon substrates with sub-pixel accuracy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate('/restore')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-blue to-secondary-purple text-sm font-semibold hover:opacity-90 active:scale-95 transition shadow-lg shadow-primary-blue/25"
          >
            <UploadCloud size={16} />
            Restore Image
          </button>
          
          <button
            onClick={() => navigate('/about')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition text-gray-300"
          >
            <BookOpen size={16} />
            Documentation
          </button>
          
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 text-sm font-semibold hover:text-white transition text-gray-500"
          >
            <GitFork size={16} />
            GitHub
          </a>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5 max-w-2xl">
          <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
            <Cpu className="text-accent-cyan shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-xs font-bold text-gray-300">SwinIR Model</h3>
              <p className="text-[10px] text-gray-500">Transformer-based deep learning architecture</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
            <ShieldAlert className="text-secondary-purple shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-xs font-bold text-gray-300">Wafer Inspection</h3>
              <p className="text-[10px] text-gray-500">Enhance low-contrast sub-micron layout lines</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-card flex items-start gap-3">
            <Sparkles className="text-success-green shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-xs font-bold text-gray-300">Real-time Metrics</h3>
              <p className="text-[10px] text-gray-500">Instant calculations of PSNR & SSIM metrics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wafer Illustration */}
      <div className="flex-1 w-full flex justify-center lg:justify-end">
        <WaferChipAnimation />
      </div>
    </div>
  );
}
