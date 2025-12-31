
import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, XCircle } from 'lucide-react';
import { Button } from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isScanning, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const animationRef = useRef<number>(0);

  const scan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      setLoading(false);
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        onScan(code.data);
        return; // Stop scanning loop on success
      }
    }
    animationRef.current = requestAnimationFrame(scan);
  }, [isScanning, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setLoading(true);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS/Android to play inline
          videoRef.current.setAttribute("playsinline", "true"); 
          videoRef.current.play().then(() => {
             animationRef.current = requestAnimationFrame(scan);
          });
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Please ensure you have granted permissions.");
        setLoading(false);
      }
    };

    if (isScanning) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scan]);

  if (!isScanning) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-gray-800">
        <div className="bg-gray-900/90 backdrop-blur-md p-4 flex justify-between items-center text-white border-b border-gray-800 z-10 relative">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Camera className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-wide">Scan QR Code</span>
          </div>
          <button onClick={onClose} className="hover:bg-gray-800 p-2 rounded-full transition-colors">
            <XCircle className="h-6 w-6 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>

        <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-white text-center p-6 z-20">
              <p className="mb-6 text-red-400 font-medium">{error}</p>
              <Button variant="secondary" onClick={onClose}>Close Scanner</Button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover" 
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Enhanced Scan Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 {/* Darkened Background Mask */}
                 <div className="absolute inset-0 shadow-[0_0_0_999px_rgba(0,0,0,0.6)]"></div>

                 {/* Active Scan Area Container */}
                 <div className="relative w-64 h-64 z-10">
                     {/* 1. Corner Brackets */}
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-indigo-500 rounded-tl-xl shadow-sm drop-shadow-md"></div>
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-indigo-500 rounded-tr-xl shadow-sm drop-shadow-md"></div>
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-indigo-500 rounded-bl-xl shadow-sm drop-shadow-md"></div>
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-indigo-500 rounded-br-xl shadow-sm drop-shadow-md"></div>

                     {/* 2. Pulsing Border & Inner Glow */}
                     <div className="absolute inset-0 border-2 border-indigo-400/30 rounded-xl animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.2)]"></div>
                     <div className="absolute inset-0 bg-indigo-500/5 rounded-xl"></div>
                     
                     {/* 3. Subtle Center Crosshair */}
                     <div className="absolute top-1/2 left-1/2 w-4 h-[2px] bg-white/30 -translate-x-1/2 -translate-y-1/2"></div>
                     <div className="absolute top-1/2 left-1/2 w-[2px] h-4 bg-white/30 -translate-x-1/2 -translate-y-1/2"></div>
                 </div>
              </div>

              {/* Loading Indicator */}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20 backdrop-blur-sm">
                  <RefreshCw className="h-10 w-10 animate-spin text-indigo-500 mb-3" />
                  <span className="font-bold text-sm tracking-widest uppercase">Initializing Camera...</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-6 bg-gray-900 text-center border-t border-gray-800">
          <p className="text-sm font-medium text-gray-400">
            Align the Student QR code within the frame
          </p>
        </div>
      </div>
    </div>
  );
};
