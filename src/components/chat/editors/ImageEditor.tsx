import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCw, ZoomIn, ZoomOut, Crop, Check, X } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageEditor = ({ imageUrl, onSave, onCancel }: ImageEditorProps) => {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
      }
    };
  }, [imageUrl]);

  // Handle rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  // Handle crop mode toggle
  const toggleCropMode = () => {
    setIsCropping(!isCropping);
    setCropArea(null);
    setCropStart(null);
  };

  // Handle crop start
  const handleCropStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isCropping || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setCropStart({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  // Handle crop move
  const handleCropMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isCropping || !cropStart || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const width = x - cropStart.x;
    const height = y - cropStart.y;

    setCropArea({
      x: width < 0 ? x : cropStart.x,
      y: height < 0 ? y : cropStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  // Handle crop end
  const handleCropEnd = () => {
    setCropStart(null);
  };

  // Apply edits and save
  const handleSave = async () => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = imageRef.current;

      // Calculate dimensions based on rotation
      const rotRad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotRad));
      const sin = Math.abs(Math.sin(rotRad));

      const rotatedWidth = img.naturalWidth * cos + img.naturalHeight * sin;
      const rotatedHeight = img.naturalWidth * sin + img.naturalHeight * cos;

      // Set canvas size
      if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
        // Calculate crop dimensions relative to actual image size
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        canvas.width = cropArea.width * scaleX;
        canvas.height = cropArea.height * scaleY;

        // Draw cropped and transformed image
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotRad);
        ctx.scale(scale, scale);
        ctx.drawImage(
          img,
          (cropArea.x * scaleX - img.naturalWidth / 2),
          (cropArea.y * scaleY - img.naturalHeight / 2),
          img.naturalWidth,
          img.naturalHeight
        );
        ctx.restore();
      } else {
        // No crop - just rotate and scale
        canvas.width = rotatedWidth * scale;
        canvas.height = rotatedHeight * scale;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotRad);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
      }

      // Convert canvas to blob then to file
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }

        const file = new File([blob], 'edited-image.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        onSave(file);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Échec de l\'édition de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header with tools */}
      <div className="bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {/* Rotation */}
          <button
            onClick={handleRotate}
            disabled={isProcessing}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-50"
            title="Rotation"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* Crop toggle */}
          <button
            onClick={toggleCropMode}
            disabled={isProcessing}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 ${
              isCropping ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Recadrer"
          >
            <Crop className="w-5 h-5" />
          </button>

          {/* Zoom out */}
          <button
            onClick={handleZoomOut}
            disabled={isProcessing || scale <= 0.5}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-50"
            title="Zoom arrière"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          {/* Zoom in */}
          <button
            onClick={handleZoomIn}
            disabled={isProcessing || scale >= 3}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-50"
            title="Zoom avant"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isProcessing}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Image preview area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4"
        onMouseDown={handleCropStart}
        onMouseMove={handleCropMove}
        onMouseUp={handleCropEnd}
        onMouseLeave={handleCropEnd}
        onTouchStart={handleCropStart}
        onTouchMove={handleCropMove}
        onTouchEnd={handleCropEnd}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Edit preview"
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transition: 'transform 0.3s ease',
          }}
        />

        {/* Crop overlay */}
        {isCropping && cropArea && cropArea.width > 0 && cropArea.height > 0 && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10"
            style={{
              left: cropArea.x,
              top: cropArea.y,
              width: cropArea.width,
              height: cropArea.height,
              pointerEvents: 'none',
            }}
          >
            <div className="absolute inset-0 border border-white/50" />
          </div>
        )}

        {/* Crop instruction */}
        {isCropping && !cropArea && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm">
            Glissez pour sélectionner la zone à recadrer
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Rotation indicator */}
      {rotation !== 0 && (
        <div className="absolute bottom-4 left-20 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
          {rotation}°
        </div>
      )}
    </motion.div>
  );
};
