import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Columns, HelpCircle, Activity, Info, RefreshCw } from 'lucide-react';
import ImageCompare from '../components/ImageCompare';

export default function Comparison() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftSelection, setLeftSelection] = useState('');
  const [rightSelection, setRightSelection] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/history');
        setHistory(res.data);
        if (res.data.length > 0) {
          setLeftSelection(res.data[0].id);
          if (res.data.length > 1) {
            setRightSelection(res.data[1].id);
          } else {
            setRightSelection(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching history for comparison:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getSelectedItem = (id) => {
    return history.find(item => item.id === id);
  };

  const leftItem = getSelectedItem(leftSelection);
  const rightItem = getSelectedItem(rightSelection);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500 text-xs gap-2">
        <RefreshCw size={14} className="animate-spin" /> Loading comparison history...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Restoration Comparison Workbench</h2>
        <p className="text-xs md:text-sm text-gray-500">
          Load and compare different restored wafer layouts from your historical log side-by-side to cross-examine defect locations.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
          <div className="h-12 w-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-500">
            <Columns size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-300">No comparison data available</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Please restore at least one wafer image in the workstation before using the comparison workbench.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Item Selector Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 border border-white/5 p-4 rounded-2xl">
            {/* Left Selector */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Source Image A
              </label>
              <select
                value={leftSelection}
                onChange={(e) => setLeftSelection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-white/10 text-xs text-white focus:outline-none focus:border-primary-blue"
              >
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.filename} ({item.timestamp})
                  </option>
                ))}
              </select>
            </div>

            {/* Right Selector */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Source Image B
              </label>
              <select
                value={rightSelection}
                onChange={(e) => setRightSelection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#09090B] border border-white/10 text-xs text-white focus:outline-none focus:border-primary-blue"
              >
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.filename} ({item.timestamp})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison View */}
          {leftItem && rightItem && (
            <div className="space-y-6">
              <ImageCompare
                leftImage={leftItem.output_url}
                rightImage={rightItem.output_url}
                leftLabel={`Image A: ${leftItem.filename}`}
                rightLabel={`Image B: ${rightItem.filename}`}
              />

              {/* Info Cards comparing both files side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left details */}
                <div className="glass-panel border border-white/5 p-5 rounded-2xl text-xs space-y-3">
                  <h4 className="font-bold text-primary-blue">Source Image A Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <div>Filename:</div><div className="text-white font-semibold truncate">{leftItem.filename}</div>
                    <div>PSNR Accuracy:</div><div className="text-white font-semibold">{leftItem.psnr} dB</div>
                    <div>SSIM Value:</div><div className="text-white font-semibold">{leftItem.ssim}</div>
                    <div>Inference Time:</div><div className="text-white font-semibold">{leftItem.processing_time}s</div>
                    <div>Resolution:</div><div className="text-white font-semibold">{leftItem.resolution}</div>
                  </div>
                </div>

                {/* Right details */}
                <div className="glass-panel border border-white/5 p-5 rounded-2xl text-xs space-y-3">
                  <h4 className="font-bold text-accent-cyan">Source Image B Specifications</h4>
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <div>Filename:</div><div className="text-white font-semibold truncate">{rightItem.filename}</div>
                    <div>PSNR Accuracy:</div><div className="text-white font-semibold">{rightItem.psnr} dB</div>
                    <div>SSIM Value:</div><div className="text-white font-semibold">{rightItem.ssim}</div>
                    <div>Inference Time:</div><div className="text-white font-semibold">{rightItem.processing_time}s</div>
                    <div>Resolution:</div><div className="text-white font-semibold">{rightItem.resolution}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
