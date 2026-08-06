import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History as HistoryIcon, 
  Download, 
  Trash2, 
  FileDown, 
  FileText, 
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import Toast from '../components/Toast';
import { TableRowSkeleton } from '../components/SkeletonLoader';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notification states
  const [toast, setToast] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      showToast('Failed to fetch history logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the restoration log for ${name}? This will permanently remove its restored image and array files from disk.`)) {
      try {
        await axios.delete(`/api/history/${id}`);
        setHistory(prev => prev.filter(item => item.id !== id));
        showToast(`Successfully deleted ${name} from history.`, 'success');
      } catch (err) {
        console.error('Error deleting history item:', err);
        showToast('Failed to delete item from database.', 'error');
      }
    }
  };

  // Filter history based on search
  const filteredHistory = history.filter(item => 
    item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.format.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Toast Alert popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Inspection History</h2>
          <p className="text-xs md:text-sm text-gray-500">
            View past image restoration passes, download outputs, or delete records from the workspace.
          </p>
        </div>
        
        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition shrink-0"
        >
          <RefreshCw size={12} /> Refresh Data
        </button>
      </div>

      {/* Filter and Table Panel */}
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
        {/* Search Bar header */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/2 select-none">
          <Search size={16} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by filename or format..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-white focus:outline-none w-full max-w-sm"
          />
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/2 select-none">
                <th className="p-4">Date</th>
                <th className="p-4">Filename</th>
                <th className="p-4">Metrics</th>
                <th className="p-4">Inference Time</th>
                <th className="p-4">Resolution</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-300 divide-y divide-white/5">
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={20} className="text-gray-600" />
                      <span>{searchQuery ? 'No matching history records found.' : 'No recent restorations recorded.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/2 transition duration-150">
                    {/* Timestamp */}
                    <td className="p-4 text-gray-400 font-mono">
                      {item.timestamp}
                    </td>
                    
                    {/* File Info */}
                    <td className="p-4">
                      <div className="font-semibold text-white truncate max-w-[180px]" title={item.filename}>
                        {item.filename}
                      </div>
                      <div className="text-[9px] text-accent-cyan font-bold uppercase mt-0.5">
                        {item.format} Array ({(item.file_size / 1024).toFixed(1)} KB)
                      </div>
                    </td>
                    
                    {/* Quality Metrics */}
                    <td className="p-4 space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-gray-500 font-medium text-[10px]">PSNR:</span>
                        {item.psnr} dB
                      </div>
                      <div className="font-medium text-gray-400 flex items-center gap-1.5">
                        <span className="text-gray-500 text-[10px]">SSIM:</span>
                        {item.ssim}
                      </div>
                    </td>
                    
                    {/* Inference Latency */}
                    <td className="p-4 font-semibold text-gray-400">
                      {item.processing_time}s
                    </td>
                    
                    {/* Resolution */}
                    <td className="p-4 text-gray-400">
                      {item.resolution}
                    </td>
                    
                    {/* Actions Grid */}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download PNG */}
                        <a 
                          href={item.output_url}
                          download={`restored_${item.filename.split('.')[0]}.png`}
                          className="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white text-gray-400 transition"
                          title="Download PNG image"
                        >
                          <Download size={14} />
                        </a>
                        
                        {/* Download NPY */}
                        <a 
                          href={item.npy_url}
                          download={`restored_${item.filename.split('.')[0]}.npy`}
                          className="p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white text-gray-400 transition"
                          title="Download raw NumPy array"
                        >
                          <FileDown size={14} />
                        </a>

                        {/* Download PDF report */}
                        <a 
                          href={`/api/download/report/${item.id}`}
                          className="p-1.5 rounded bg-primary-blue/10 border border-primary-blue/20 hover:bg-primary-blue/20 hover:text-white text-primary-blue transition"
                          title="Get Inspection Report"
                        >
                          <FileText size={14} />
                        </a>

                        {/* Delete Log */}
                        <button 
                          onClick={() => handleDelete(item.id, item.filename)}
                          className="p-1.5 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
