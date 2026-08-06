import React from 'react';
import { 
  Info, 
  Cpu, 
  Layers, 
  Database, 
  BookOpen, 
  Settings,
  GitPullRequest
} from 'lucide-react';

export default function About() {
  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">About Semiconductor RestoreAI</h2>
        <p className="text-xs md:text-sm text-gray-500">
          Learn about the deep learning architecture, neural network pipeline, dataset splits, and industrial application context.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Description (Left Column 2/3 wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Objectives */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-primary-blue" />
              Project Objectives
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              During the photolithography and chemical mechanical planarization (CMP) phases of semiconductor fabrication, optical and electron-microscope wafer inspection scans frequently suffer from low contrast, electronic noise, and visual blur. These distortions obscure micro-scale defects (e.g. bridging, voids, and particle contaminations) which directly impact silicon die yield. 
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong>Semiconductor RestoreAI</strong> implements a state-of-the-art deep learning restoration model to denoise and super-resolve noisy wafer scans. By reconstructing sharp spatial boundaries, the pipeline facilitates downstream automated defect inspection (ADC) and wafer inspection analytics.
            </p>
          </div>

          {/* Deep Learning Architecture */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu size={16} className="text-accent-cyan" />
              SwinIR: Swin Transformer for Image Restoration
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              The restoration algorithm is built on <strong>SwinIR</strong>, which applies shifted window self-attention mechanisms to spatial restoration tasks. Compared to traditional Convolutional Neural Networks (CNNs), SwinIR benefits from:
            </p>
            
            <ul className="list-disc pl-5 text-xs text-gray-400 space-y-1.5">
              <li><strong>Long-range Dependency Modeling:</strong> Self-attention captures non-local spatial features across the entire wafer die.</li>
              <li><strong>Shifted Window Partitioning:</strong> Restricts self-attention computation to local windows while enabling cross-window connections, maintaining computational efficiency.</li>
              <li><strong>Residual Connections:</strong> Residual Swin Transformer Blocks (RSTB) stabilize deep network training and preserve high-frequency layout grids.</li>
            </ul>

            <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-3 font-mono text-[10px] text-gray-400 select-none">
              <div className="text-white font-bold mb-1">Deep Learning Pipeline Flow:</div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10">Noisy Input [B, 1, H, W]</div>
                <div className="text-gray-600 hidden md:block">&rarr;</div>
                <div className="px-2 py-1 rounded bg-primary-blue/10 border border-primary-blue/20 text-white">Shallow Feature Extraction</div>
                <div className="text-gray-600 hidden md:block">&rarr;</div>
                <div className="px-2 py-1 rounded bg-secondary-purple/10 border border-secondary-purple/20 text-white">Deep Feature Extraction (SwinIR)</div>
                <div className="text-gray-600 hidden md:block">&rarr;</div>
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10">Reconstruction [B, 1, H, W]</div>
              </div>
            </div>
          </div>

          {/* Dataset split */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database size={16} className="text-secondary-purple" />
              Inspection Dataset Specs
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              The model was trained on a proprietary semiconductor defect inspection dataset structured as paired float32 array directories:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-1.5">
                <div className="font-bold text-gray-300">Input: NoisyLR/</div>
                <div className="text-gray-500 text-[10px]">Low-contrast, noisy scanning electron microscope (SEM) matrices saved as <strong>.npy</strong> NumPy float32 format. Size: 256x256.</div>
              </div>
              <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-1.5">
                <div className="font-bold text-gray-300">Target: GT/ (Ground Truth)</div>
                <div className="text-gray-500 text-[10px]">Clean reference spatial wafer layouts showing pristine, noise-free layout tracks and grid contacts. Size: 256x256.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology Stack Sidebar (Right Column 1/3 wide) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Settings size={16} className="text-primary-blue" />
              Technology Stack
            </h3>

            <div className="space-y-4 text-xs">
              {/* Frontend */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-300">Frontend Dashboard</h4>
                <div className="text-gray-500 text-[10px] leading-relaxed">
                  React.js, Vite bundler, Tailwind CSS design system, Framer Motion transitions, Axios API clients, and Recharts analytics.
                </div>
              </div>

              {/* Backend */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-300">Inference Server</h4>
                <div className="text-gray-500 text-[10px] leading-relaxed">
                  FastAPI backend, PyTorch neural networks, NumPy matrix loaders, Uvicorn, and Python static mounts.
                </div>
              </div>

              {/* Deep learning */}
              <div className="space-y-1">
                <h4 className="font-bold text-gray-300">AI Framework</h4>
                <div className="text-gray-500 text-[10px] leading-relaxed">
                  PyTorch deep learning model checkpoints, SwinIR model layers, and custom evaluation metric functions (PSNR / SSIM).
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <GitPullRequest size={16} className="text-accent-cyan" />
              Model Parameters
            </h3>

            <div className="space-y-3 font-mono text-[10px] text-gray-400">
              <div className="flex justify-between"><span>patch_size:</span><span className="text-white">128</span></div>
              <div className="flex justify-between"><span>in_chans:</span><span className="text-white">1</span></div>
              <div className="flex justify-between"><span>embed_dim:</span><span className="text-white">60</span></div>
              <div className="flex justify-between"><span>depths:</span><span className="text-white">[2, 2, 2, 2]</span></div>
              <div className="flex justify-between"><span>num_heads:</span><span className="text-white">[2, 2, 2, 2]</span></div>
              <div className="flex justify-between"><span>window_size:</span><span className="text-white">8</span></div>
              <div className="flex justify-between"><span>upscale:</span><span className="text-white">1</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
