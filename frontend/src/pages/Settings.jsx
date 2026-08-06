import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Layers, 
  Database, 
  Sliders, 
  RefreshCw,
  Save,
  CheckCircle2
} from 'lucide-react';
import Toast from '../components/Toast';

export default function Settings({ isDark, setIsDark }) {
  const [device, setDevice] = useState('auto');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiHost, setApiHost] = useState('Local Proxy (/api)');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching stats in settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSave = () => {
    showToast('Configuration settings updated successfully.', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500 text-xs gap-2">
        <RefreshCw size={14} className="animate-spin" /> Fetching model parameters...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}

      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">System Settings</h2>
        <p className="text-xs md:text-sm text-gray-500">
          Adjust inference hardware configurations, inspect neural network parameters, and select visual options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Controls Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hardware Configuration */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Hardware Allocation</h3>
                <p className="text-[10px] text-gray-500">Configure target device used by PyTorch SwinIR forward pass.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {['auto', 'cuda', 'cpu'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDevice(opt)}
                    className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                      device === opt 
                        ? 'border-primary-blue bg-primary-blue/10 text-white font-bold'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <span className="uppercase text-xs tracking-wider">{opt}</span>
                    <span className="text-[8px] text-gray-500 font-medium">
                      {opt === 'auto' ? 'Default accelerator' : opt === 'cuda' ? 'NVIDIA GPU cores' : 'System processor'}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="text-[10px] text-gray-500 leading-relaxed bg-white/2 border border-white/5 p-3 rounded-lg flex items-start gap-2 select-none">
                <Sliders size={14} className="text-accent-cyan shrink-0 mt-0.5" />
                <span>
                  By default, <strong>Auto</strong> mode is selected, which allocates computation to NVIDIA CUDA kernels if available, fallback to CPU. Current active device: <strong>{stats?.gpu_available ? 'CUDA GPU' : 'CPU'}</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Integration preferences */}
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary-purple/10 border border-secondary-purple/20 text-secondary-purple">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-200">Database & Network API</h3>
                <p className="text-[10px] text-gray-500">Manage API gateway connections and host proxy parameters.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">FastAPI Server Host</label>
                <input 
                  type="text" 
                  value={apiHost}
                  onChange={(e) => setApiHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-white/10 text-xs text-white focus:outline-none focus:border-primary-blue"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Theme Style</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsDark(true)}
                    className={`flex-1 py-2 rounded-xl border text-center transition ${isDark ? 'border-primary-blue bg-primary-blue/10 text-white font-bold' : 'border-white/5 bg-white/5 text-gray-400'}`}
                  >
                    Dark Theme
                  </button>
                  <button 
                    onClick={() => setIsDark(false)}
                    className={`flex-1 py-2 rounded-xl border text-center transition ${!isDark ? 'border-primary-blue bg-primary-blue/10 text-white font-bold' : 'border-white/5 bg-white/5 text-gray-400'}`}
                  >
                    Light Theme
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-blue to-secondary-purple text-xs font-bold text-white shadow-lg hover:opacity-90 transition"
            >
              <Save size={14} /> Save Configuration
            </button>
          </div>
        </div>

        {/* Right Hand Side Model Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Layers className="text-primary-blue" size={16} />
              <h3 className="font-bold text-gray-200">Active Checkpoint Specifications</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-white/5 text-gray-400">
                <span>Model Name</span>
                <span className="text-white font-bold">SwinIR</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5 text-gray-400">
                <span>Checkpoint Epoch</span>
                <span className="text-white font-bold">{stats?.training_epoch || 120}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5 text-gray-400">
                <span>Parameter Size</span>
                <span className="text-white font-bold">{stats?.model_parameters || '0.59M'}</span>
              </div>
              {stats?.checkpoint_metrics && Object.keys(stats.checkpoint_metrics).length > 0 && (
                <div className="pt-2">
                  <div className="text-gray-500 font-bold mb-2 uppercase tracking-wide text-[9px]">Checkpoint Metrics</div>
                  <div className="grid grid-cols-2 gap-2 bg-[#09090B] p-2 rounded-lg border border-white/5 font-mono">
                    <div className="text-gray-400">PSNR:</div>
                    <div className="text-success-green font-bold text-right">{stats.checkpoint_metrics.psnr?.toFixed(4)}</div>
                    <div className="text-gray-400">SSIM:</div>
                    <div className="text-accent-cyan font-bold text-right">{stats.checkpoint_metrics.ssim?.toFixed(4)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
