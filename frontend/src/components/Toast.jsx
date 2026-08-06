import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-success-green" size={18} />,
    warning: <AlertTriangle className="text-warning-amber" size={18} />,
    error: <AlertCircle className="text-red-500" size={18} />,
    info: <Info className="text-primary-blue" size={18} />
  };

  const borders = {
    success: 'border-success-green/20 bg-success-green/5',
    warning: 'border-warning-amber/20 bg-warning-amber/5',
    error: 'border-red-500/20 bg-red-500/5',
    info: 'border-primary-blue/20 bg-primary-blue/5'
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg animate-fade-in ${borders[type]} max-w-sm`}>
      {icons[type]}
      <div className="text-sm font-medium text-gray-200 flex-1">{message}</div>
      <button 
        onClick={onClose}
        className="text-gray-500 hover:text-white transition p-0.5 rounded hover:bg-white/5"
      >
        <X size={14} />
      </button>
    </div>
  );
}
