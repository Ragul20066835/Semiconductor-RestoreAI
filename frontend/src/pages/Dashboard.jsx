import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  Settings, 
  Activity, 
  TrendingUp, 
  Clock, 
  UploadCloud, 
  History, 
  LayoutGrid 
} from 'lucide-react';
import axios from 'axios';
import { CardSkeleton } from '../components/SkeletonLoader';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h2>
          <p className="text-xs text-gray-500">Retrieving hardware and model diagnostics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Model Status',
      value: stats?.model_status || 'Offline',
      desc: 'SwinIR PyTorch Inference Backend',
      icon: Activity,
      color: stats?.model_status === 'Active' ? 'text-success-green' : 'text-red-500',
      bg: stats?.model_status === 'Active' ? 'bg-success-green/10 border-success-green/20' : 'bg-red-500/10 border-red-500/20'
    },
    {
      title: 'GPU Status',
      value: stats?.gpu_available ? 'ONLINE' : 'CPU MODE',
      desc: stats?.gpu_name || 'No GPU Detected',
      icon: Cpu,
      color: stats?.gpu_available ? 'text-accent-cyan' : 'text-warning-amber',
      bg: stats?.gpu_available ? 'bg-accent-cyan/10 border-accent-cyan/20' : 'bg-warning-amber/10 border-warning-amber/20'
    },
    {
      title: 'Current Model',
      value: 'SwinIR',
      desc: `Params: ${stats?.model_parameters || 'N/A'}`,
      icon: LayoutGrid,
      color: 'text-primary-blue',
      bg: 'bg-primary-blue/10 border-primary-blue/20'
    },
    {
      title: 'Avg Inference Time',
      value: stats?.average_inference_time > 0 ? `${stats.average_inference_time}s` : '0.00s',
      desc: 'Execution overhead per wafer tile',
      icon: Clock,
      color: 'text-secondary-purple',
      bg: 'bg-secondary-purple/10 border-secondary-purple/20'
    },
    {
      title: 'Latest Accuracy',
      value: stats?.average_psnr > 0 ? `${stats.average_psnr} dB` : 'N/A',
      desc: stats?.average_ssim > 0 ? `SSIM: ${stats.average_ssim}` : 'Ground truth evaluation metric',
      icon: TrendingUp,
      color: 'text-success-green',
      bg: 'bg-success-green/10 border-success-green/20'
    },
    {
      title: 'Training Epoch',
      value: stats?.training_epoch || '0',
      desc: 'Deep learning training model checkpoint',
      icon: Settings,
      color: 'text-warning-amber',
      bg: 'bg-warning-amber/10 border-warning-amber/20'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">System Dashboard</h2>
        <p className="text-xs md:text-sm text-gray-500">
          Real-time hardware utilization, model validation metrics, and dataset restoration overview.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="glass-card rounded-2xl border border-white/5 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${kpi.bg}`}>
                  <Icon size={16} className={kpi.color} />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-2xl font-extrabold tracking-tight text-white">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-gray-500 font-medium truncate">
                  {kpi.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Center & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Quick Launch Panel */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Restoration Workstation</h3>
            <p className="text-xs text-gray-500">Run restoration passes or view history logs.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/restore')}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary-blue/30 text-sm font-semibold transition"
            >
              <UploadCloud size={18} className="text-primary-blue" />
              Upload Wafer Image
            </button>
            
            <button
              onClick={() => navigate('/history')}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-secondary-purple/30 text-sm font-semibold transition"
            >
              <History size={18} className="text-secondary-purple" />
              View Run History
            </button>
          </div>
        </div>

        {/* Model Spec Summary */}
        <div className="glass-panel rounded-2xl border border-white/5 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-200">SwinIR Model Specifications</h3>
            <p className="text-xs text-gray-500">Model architecture parameters loaded from checkpoint.</p>
          </div>
          
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Checkpoint Name</span>
              <span className="text-gray-300 font-bold">best.pt</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Architecture</span>
              <span className="text-gray-300 font-bold">Swin Transformer Image Restoration</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="text-gray-500">Trainable Parameters</span>
              <span className="text-gray-300 font-bold">585.33K (0.59M)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">Checkpoint Metrics</span>
              <span className="text-accent-cyan font-bold">
                {stats?.checkpoint_metrics?.psnr ? `PSNR: ${stats.checkpoint_metrics.psnr.toFixed(2)} dB` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
