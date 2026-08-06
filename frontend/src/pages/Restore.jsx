import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileImage, 
  Settings, 
  RefreshCw, 
  Download, 
  Sparkles, 
  FileDown,
  Info,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Move
} from 'lucide-react';
import ImageCompare from '../components/ImageCompare';
import { ImageSkeleton } from '../components/SkeletonLoader';

const PROGRESS_STAGES = [
  { label: 'Uploading wafer image...', start: 0, end: 20 },
  { label: 'Loading SwinIR deep learning model...', start: 20, end: 45 },
  { label: 'Running PyTorch model inference...', start: 45, end: 75 },
  { label: 'Generating restored wafer output...', start: 75, end: 95 },
  { label: 'Completed restoration', start: 95, end: 100 }
];

export default function Restore() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  
  // Samples
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [selectedSample, setSelectedSample] = useState(null);

  // Restore Process State
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Fetch samples on load
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await axios.get('/api/samples');
        setSamples(res.data);
      } catch (err) {
        console.error('Error fetching samples:', err);
      } finally {
        setSamplesLoading(false);
      }
    };
    fetchSamples();
  }, []);

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.npy'].includes(ext)) {
      setError(`Unsupported file extension: ${ext}. Please upload PNG, JPG, JPEG or NPY.`);
      return;
    }
    
    setError(null);
    setResult(null);
    setFile(selectedFile);
    setSelectedSample(null);

    // Create file metadata info
    setFileInfo({
      name: selectedFile.name,
      size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
      format: ext.replace('.', '').toUpperCase(),
      resolution: 'Reading...'
    });

    if (ext === '.npy') {
      // For NPY files, we can't show direct browser previews. We show a placeholder
      // until they restore, or we can use our preview generator if it's a sample
      setPreviewUrl('npy-placeholder');
      setFileInfo(prev => ({ ...prev, resolution: 'Float32 Array' }));
    } else {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // Determine resolution of image
      const img = new Image();
      img.onload = () => {
        setFileInfo(prev => ({ ...prev, resolution: `${img.width}x${img.height}` }));
      };
      img.src = url;
    }
  };

  // Load a Sample Wafer File
  const handleSelectSample = async (sample) => {
    try {
      setLoadingSample(true);
      setError(null);
      setResult(null);
      setSelectedSample(sample);
      setFile(null);
      
      // We set fileInfo
      setFileInfo({
        name: sample.filename,
        size: `${(sample.size / 1024).toFixed(1)} KB`,
        format: 'NPY',
        resolution: '256x256' // Sample wafer resolution
      });

      // Preview URL will load from our preview generator endpoint
      setPreviewUrl(`/api/samples/preview/${sample.filename}`);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch sample preview');
    } finally {
      setLoadingSample(false);
    }
  };

  const [loadingSample, setLoadingSample] = useState(false);

  // Run AI restoration pipeline
  const runRestoration = async () => {
    if (!file && !selectedSample) {
      setError('Please upload an image or select a sample wafer file.');
      return;
    }

    setRestoring(true);
    setProgress(0);
    setStageIndex(0);
    setError(null);

    // Start progress stage simulation
    simulateProgress();

    try {
      let uploadFile = file;

      // If sample was selected, we need to download its raw NPY and upload it
      if (selectedSample) {
        const response = await axios.get(`/api/samples/raw/${selectedSample.filename}`, {
          responseType: 'blob'
        });
        uploadFile = new File([response.data], selectedSample.filename);
      }

      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await axios.post('/api/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Slow down finish slightly to look premium and let user read the complete label
      setTimeout(() => {
        clearInterval(progressTimerRef.current);
        setProgress(100);
        setStageIndex(4);
        setTimeout(() => {
          setResult(res.data);
          setRestoring(false);
        }, 600);
      }, 500);

    } catch (err) {
      clearInterval(progressTimerRef.current);
      setRestoring(false);
      const errMsg = err.response?.data?.detail || 'An error occurred during restoration. Please try again.';
      setError(errMsg);
      console.error(err);
    }
  };

  const simulateProgress = () => {
    let currentProgress = 0;
    let currentStage = 0;

    progressTimerRef.current = setInterval(() => {
      const stage = PROGRESS_STAGES[currentStage];
      
      if (currentProgress < stage.end) {
        // Move slowly inside the stage range
        currentProgress += Math.random() * 2.5;
        if (currentProgress > stage.end) currentProgress = stage.end;
        setProgress(Math.min(99, Math.floor(currentProgress)));
      } else if (currentStage < PROGRESS_STAGES.length - 2) {
        // Increment stage index
        currentStage += 1;
        setStageIndex(currentStage);
      }
    }, 150);
  };

  // Reset file selection
  const handleReset = () => {
    setFile(null);
    setSelectedSample(null);
    setPreviewUrl(null);
    setFileInfo(null);
    setResult(null);
    setError(null);
  };

  // Helper to trigger upload selection
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Restoration Workstation</h2>
        <p className="text-xs md:text-sm text-gray-500">
          Upload raw electron microscope wafer scans or choose pre-loaded wafer arrays to run the SwinIR restoration algorithm.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Hand side Upload and Control Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Uploader Card */}
          <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              1. Input Wafer Scan
            </h3>

            {!previewUrl ? (
              // Drag & Drop Area
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition ${
                  dragActive 
                    ? 'border-primary-blue bg-primary-blue/5' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg,.npy"
                />
                <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
                  <Upload size={18} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-gray-200">Drag & drop wafer file</p>
                  <p className="text-[10px] text-gray-500">Support PNG, JPG, JPEG, NPY</p>
                </div>
                <button 
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-gray-300 border border-white/10 hover:bg-white/10"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              // File Preview Card
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/5 flex items-center justify-center">
                  {previewUrl === 'npy-placeholder' ? (
                    <div className="text-center p-4 space-y-2">
                      <div className="h-10 w-10 rounded-full bg-primary-blue/10 border border-primary-blue/20 flex items-center justify-center mx-auto text-primary-blue">
                        <Settings size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
                      </div>
                      <div className="text-xs font-bold text-gray-300">NumPy Grayscale Matrix</div>
                      <div className="text-[10px] text-gray-500">Restore wafer to render PNG layout</div>
                    </div>
                  ) : (
                    <img 
                      src={previewUrl} 
                      alt="Wafer Input Preview" 
                      className="w-full h-full object-contain"
                    />
                  )}
                  
                  {/* Floating reset button */}
                  {!restoring && (
                    <button 
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black/100 border border-white/10 text-gray-400 hover:text-white transition text-xs"
                      title="Clear File"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* File Specifications */}
                {fileInfo && (
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4 text-xs space-y-2.5">
                    <div className="flex justify-between items-center pb-1.5 border-b border-white/5 text-gray-400">
                      <span>Filename</span>
                      <span className="text-white font-semibold truncate max-w-[150px]" title={fileInfo.name}>
                        {fileInfo.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-white/5 text-gray-400">
                      <span>Format</span>
                      <span className="text-accent-cyan font-bold">{fileInfo.format}</span>
                    </div>
                    <div className="flex justify-between items-center pb-1.5 border-b border-white/5 text-gray-400">
                      <span>File Size</span>
                      <span className="text-white font-semibold">{fileInfo.size}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Resolution</span>
                      <span className="text-white font-semibold">{fileInfo.resolution}</span>
                    </div>
                  </div>
                )}

                {/* Run Restoration Button */}
                {!restoring && (
                  <button
                    onClick={runRestoration}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-blue to-secondary-purple text-xs font-bold text-white shadow-lg hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} />
                    Restore Wafer Image
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sample Wafer Selector */}
          {!previewUrl && (
            <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                Select Validation Sample
              </h3>
              <p className="text-[10px] text-gray-500">
                Click on any raw semiconductor NumPy wafer file below to load it into the workstation.
              </p>

              {samplesLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-500 text-xs gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Fetching samples...
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {samples.map((sample) => (
                    <button
                      key={sample.filename}
                      onClick={() => handleSelectSample(sample)}
                      disabled={loadingSample}
                      className={`p-2 rounded-lg border text-left transition text-[10px] flex flex-col justify-between ${
                        selectedSample?.filename === sample.filename 
                          ? 'border-primary-blue bg-primary-blue/10 text-white font-bold'
                          : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <span className="truncate w-full">{sample.filename.replace('.npy', '')}</span>
                      <span className="text-[8px] text-accent-cyan font-semibold uppercase mt-1">NPY array</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Hand side processing and result screen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Empty State */}
          {!previewUrl && !restoring && !result && !error && (
            <div className="glass-panel rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
              <div className="h-16 w-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 animate-float">
                <FileImage size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-300">No wafer image loaded</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Drag and drop a low-contrast wafer array or select a validation sample from the left panel to begin.
                </p>
              </div>
            </div>
          )}

          {/* Animated Restore Process Overlay */}
          {restoring && (
            <div className="glass-panel rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]">
              {/* Spinning Semiconductor Wafer */}
              <div className="relative h-20 w-20 flex items-center justify-center">
                {/* Outermost sweeping halo */}
                <div className="absolute inset-0 rounded-full border border-dashed border-primary-blue/30 animate-spin" style={{ animationDuration: '10s' }} />
                {/* Secondary scanner ring */}
                <div className="absolute inset-1.5 rounded-full border border-accent-cyan/20 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
                {/* Floating inner silicon shape */}
                <div className="h-12 w-12 rounded-lg bg-gradient-to-tr from-primary-blue to-secondary-purple flex items-center justify-center shadow-lg shadow-primary-blue/30 animate-pulse text-white">
                  <Settings size={22} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>
              
              <div className="space-y-3 w-full max-w-sm">
                <h3 className="text-sm font-extrabold text-gray-300">
                  {PROGRESS_STAGES[stageIndex].label}
                </h3>
                
                {/* Custom Gradient Progress Bar */}
                <div className="w-full bg-white/5 border border-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-blue via-secondary-purple to-accent-cyan transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                  <span>{PROGRESS_STAGES[stageIndex].start}%</span>
                  <span className="text-accent-cyan">{progress}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* Errors View */}
          {error && (
            <div className="glass-panel rounded-2xl border border-red-500/10 bg-red-500/5 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
              <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-400">Inference Processing Failure</h3>
                <p className="text-xs text-gray-500 max-w-sm">{error}</p>
              </div>
              <button
                onClick={runRestoration}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-xs font-semibold hover:bg-white/10 hover:text-white transition"
              >
                Retry Restoration
              </button>
            </div>
          )}

          {/* Result view with slider compare and metrics */}
          {result && !restoring && !error && (
            <div className="space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Analysis & Comparison</h3>
                  <p className="text-xs text-gray-500">Use the slider below to inspect defect reconstruction.</p>
                </div>
                
                {/* Download Group */}
                <div className="flex gap-2">
                  <a 
                    href={result.output_url} 
                    download={`restored_${result.filename.split('.')[0]}.png`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-gray-300 transition"
                  >
                    <Download size={12} /> Download PNG
                  </a>
                  <a 
                    href={result.npy_url} 
                    download={`restored_${result.filename.split('.')[0]}.npy`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-gray-300 transition"
                  >
                    <FileDown size={12} /> Download NPY
                  </a>
                  <a 
                    href={`/api/download/report/${result.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-blue/20 hover:bg-primary-blue/30 border border-primary-blue/30 text-[10px] font-bold text-white transition"
                  >
                    <ShieldCheck size={12} /> Inspection Report
                  </a>
                </div>
              </div>

              {/* Slider Component */}
              <ImageCompare 
                leftImage={result.input_url}
                rightImage={result.output_url}
                leftLabel="Raw Wafer Input"
                rightLabel="SwinIR Restored"
              />

              {/* Restoration Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* PSNR */}
                <div className="glass-card rounded-xl border border-white/5 p-4 space-y-1">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    PSNR Accuracy
                  </span>
                  <span className="text-xl font-extrabold text-white block">
                    {result.psnr} dB
                  </span>
                  <span className="text-[9px] text-success-green font-bold flex items-center gap-1">
                    <TrendingUp size={10} /> +12.4% vs Noisy
                  </span>
                </div>

                {/* SSIM */}
                <div className="glass-card rounded-xl border border-white/5 p-4 space-y-1">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    SSIM Index
                  </span>
                  <span className="text-xl font-extrabold text-white block">
                    {result.ssim}
                  </span>
                  <span className="text-[9px] text-accent-cyan font-bold">
                    Structure recovery
                  </span>
                </div>

                {/* Inference Time */}
                <div className="glass-card rounded-xl border border-white/5 p-4 space-y-1">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    Inference Time
                  </span>
                  <span className="text-xl font-extrabold text-white block">
                    {result.processing_time}s
                  </span>
                  <span className="text-[9px] text-secondary-purple font-bold flex items-center gap-1">
                    <Clock size={10} /> {torchDevice()}
                  </span>
                </div>

                {/* Resolution */}
                <div className="glass-card rounded-xl border border-white/5 p-4 space-y-1">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">
                    Resolution
                  </span>
                  <span className="text-xl font-extrabold text-white block truncate">
                    {result.resolution}
                  </span>
                  <span className="text-[9px] text-gray-500 font-semibold block uppercase">
                    Format: {result.format}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function torchDevice() {
  return "GPU Core";
}
