
import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onCapture: (base64: string, stepLabel: string) => void;
  onFinish: (images: {data: string, label: string}[]) => void;
  onClose: () => void;
}

const CAPTURE_STEPS = [
  { id: 'front', label: 'Frontal View', guide: 'Look directly at the camera with a neutral expression.', icon: '👤' },
  { id: 'left', label: 'Left Profile', guide: 'Turn your head 45 degrees to the left.', icon: '◀️' },
  { id: 'right', label: 'Right Profile', guide: 'Turn your head 45 degrees to the right.', icon: '▶️' },
  { id: 'expression', label: 'Expression Check', guide: 'Give a slight natural smile.', icon: '😊' }
];

const CameraModal: React.FC<Props> = ({ onCapture, onFinish, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isFlashActive, setIsFlashActive] = useState(false);
  
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [capturedImages, setCapturedImages] = useState<{data: string, label: string}[]>([]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setIsStarting(true);
    setError(null);
    stopStream();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(err.message || "Could not access camera. Please check permissions.");
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      
      const currentStep = CAPTURE_STEPS[currentStepIdx];
      const newCapture = { data: base64, label: currentStep.label };
      const updatedCaptures = [...capturedImages, newCapture];
      setCapturedImages(updatedCaptures);

      if (currentStepIdx < CAPTURE_STEPS.length - 1) {
        setCurrentStepIdx(prev => prev + 1);
      } else {
        onFinish(updatedCaptures);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const currentStep = CAPTURE_STEPS[currentStepIdx];

  return (
    <div className="fixed inset-0 z-[1000] bg-neo-black flex flex-col items-center justify-center p-2 sm:p-4">
      {isFlashActive && <div className="fixed inset-0 z-[1100] bg-white animate-pulse" />}

      <div className="relative w-full max-w-lg bg-black border-4 border-white shadow-neo-lg rounded-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
        
        {/* Step Progress Bar */}
        <div className="bg-neo-black border-b-2 border-white/20 p-2 flex gap-1">
          {CAPTURE_STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 flex-1 transition-all duration-500 ${idx <= currentStepIdx ? 'bg-neo-pink' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <div className="absolute top-8 inset-x-0 p-4 flex justify-between items-center z-20">
          <button 
            onClick={onClose} 
            className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full border-2 border-white/20 hover:bg-neo-pink hover:text-black transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="bg-neo-cyan text-black px-4 py-1 rounded-full font-black text-[10px] uppercase shadow-neo-sm">
             Step {currentStepIdx + 1}/{CAPTURE_STEPS.length}
          </div>
          <button 
            onClick={toggleCamera} 
            className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white border-2 border-white/20 hover:bg-neo-cyan hover:text-black transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Video Viewport */}
        <div className="flex-1 relative bg-gray-950 flex items-center justify-center overflow-hidden">
          {isStarting && (
            <div className="absolute inset-0 z-10 bg-neo-black flex flex-col items-center justify-center gap-4 text-white">
              <div className="w-10 h-10 border-4 border-neo-pink border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-xs uppercase tracking-widest">Calibrating Lens...</p>
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-opacity duration-500 ${isStarting ? 'opacity-0' : 'opacity-100'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Guided Silhouette Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
             <div className="w-3/4 aspect-[3/4] border-4 border-neo-cyan/30 rounded-[60px] flex flex-col items-center justify-center p-8 bg-neo-cyan/5">
                <div className="text-6xl mb-4 opacity-40">{currentStep.icon}</div>
                <div className="text-center">
                   <p className="text-white font-black text-xs uppercase tracking-widest mb-2 bg-black/60 px-2 py-1">{currentStep.label}</p>
                   <p className="text-white/60 text-[10px] font-medium leading-tight max-w-[150px]">{currentStep.guide}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 sm:p-8 bg-black border-t-4 border-white flex flex-col items-center gap-4 shrink-0 z-20">
          <button 
            onClick={handleCapture}
            disabled={isStarting}
            className="relative w-24 h-24 rounded-full bg-white border-8 border-gray-300 active:scale-90 transition-all flex items-center justify-center shadow-neo group disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full border-4 border-black group-hover:bg-neo-pink transition-colors flex items-center justify-center text-2xl">
               📸
            </div>
          </button>
          <div className="flex flex-col items-center">
             <span className="text-neo-pink text-xs font-black uppercase tracking-[0.2em] mb-1">
               Capture {currentStep.id}
             </span>
             <p className="text-white/40 text-[9px] font-bold uppercase">Hold steady for perfect mapping</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
