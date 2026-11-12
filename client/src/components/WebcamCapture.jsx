import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, Upload, AlertCircle } from 'lucide-react';

export default function WebcamCapture({ onCapture, capturedImage = null }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [image, setImage] = useState(capturedImage);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Webcam access error:', err);
      setCameraError('Camera stream is unavailable. You can click "Upload Photo" below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!image) {
      startCamera();
    }
    return () => stopCamera();
  }, [image]);

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 250);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImage(dataUrl);
    stopCamera();
    if (onCapture) onCapture(dataUrl);
  };

  const retakeSelfie = () => {
    setImage(null);
    if (onCapture) onCapture(null);
    startCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      stopCamera();
      if (onCapture) onCapture(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-3 shadow-xs">
      <canvas ref={canvasRef} className="hidden" />

      {flash && <div className="absolute inset-0 bg-white z-30 opacity-80 pointer-events-none transition-opacity duration-200" />}

      {image ? (
        // Preview state
        <div className="relative flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm group bg-white">
            <img src={image} alt="Selfie Preview" className="w-full h-full object-cover" />
            <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Check className="w-3.5 h-3.5" />
              <span>Selfie Verified</span>
            </div>
          </div>

          <button
            type="button"
            onClick={retakeSelfie}
            className="mt-3 text-xs text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1.5 bg-white border border-slate-300 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span>Retake Selfie</span>
          </button>
        </div>
      ) : cameraActive ? (
        // Live camera view
        <div className="flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Oval Face Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-56 rounded-full border-2 border-dashed border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center">
                <span className="text-[11px] text-white font-medium bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  Fit face inside frame
                </span>
              </div>
            </div>

            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-md text-[11px] text-white backdrop-blur-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Sensor</span>
            </div>
          </div>

          <button
            type="button"
            onClick={captureSelfie}
            className="mt-3 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Capture Live Selfie</span>
          </button>
        </div>
      ) : (
        // Camera fallback
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-2.5 text-amber-700">
            <Camera className="w-6 h-6" />
          </div>

          <p className="text-xs text-slate-700 font-semibold mb-1">
            {cameraError || 'Camera stream is loading...'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <button
              type="button"
              onClick={startCamera}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>Retry Camera</span>
            </button>

            <label className="cursor-pointer px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
