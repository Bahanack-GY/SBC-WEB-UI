import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, Check, X } from 'lucide-react';

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
}

interface TextOverlayEditorProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  existingOverlays?: TextOverlay[];
  onSave: (overlays: TextOverlay[]) => void;
  onCancel: () => void;
}

const TEXT_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
];

export const TextOverlayEditor = ({
  mediaUrl,
  mediaType,
  existingOverlays = [],
  onSave,
  onCancel,
}: TextOverlayEditorProps) => {
  const [overlays, setOverlays] = useState<TextOverlay[]>(existingOverlays);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState<number | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOverlay = selectedOverlayIndex !== null ? overlays[selectedOverlayIndex] : null;

  // Add new text overlay
  const handleAddText = () => {
    if (!newText.trim()) return;

    const newOverlay: TextOverlay = {
      text: newText.trim(),
      x: 50, // Center
      y: 50, // Center
      fontSize: 32,
      color: '#FFFFFF',
      align: 'center',
      fontWeight: 'bold',
    };

    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayIndex(overlays.length);
    setNewText('');
    setShowTextInput(false);
  };

  // Update selected overlay
  const updateSelectedOverlay = (updates: Partial<TextOverlay>) => {
    if (selectedOverlayIndex === null) return;

    setOverlays(
      overlays.map((overlay, index) =>
        index === selectedOverlayIndex ? { ...overlay, ...updates } : overlay
      )
    );
  };

  // Delete selected overlay
  const deleteSelectedOverlay = () => {
    if (selectedOverlayIndex === null) return;

    setOverlays(overlays.filter((_, index) => index !== selectedOverlayIndex));
    setSelectedOverlayIndex(null);
  };

  // Handle drag start
  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    index: number
  ) => {
    e.stopPropagation();
    setSelectedOverlayIndex(index);
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragStart({ x: clientX, y: clientY });
  };

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || dragStart === null || selectedOverlayIndex === null || !containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;

    const currentOverlay = overlays[selectedOverlayIndex];
    const newX = Math.max(0, Math.min(100, currentOverlay.x + deltaXPercent));
    const newY = Math.max(0, Math.min(100, currentOverlay.y + deltaYPercent));

    updateSelectedOverlay({ x: newX, y: newY });
    setDragStart({ x: clientX, y: clientY });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Handle save
  const handleSave = () => {
    onSave(overlays);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 text-white">
          <Type className="w-5 h-5" />
          <span className="text-sm font-medium">Ajouter du texte</span>
        </div>

        <button
          onClick={handleSave}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Media preview with text overlays */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Text overlays */}
        {overlays.map((overlay, index) => (
          <div
            key={index}
            onMouseDown={(e) => handleDragStart(e, index)}
            onTouchStart={(e) => handleDragStart(e, index)}
            className={`absolute cursor-move select-none ${
              selectedOverlayIndex === index ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black/50' : ''
            }`}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: 'translate(-50%, -50%)',
              color: overlay.color,
              fontSize: `${overlay.fontSize}px`,
              fontWeight: overlay.fontWeight,
              textAlign: overlay.align,
              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {overlay.text}
          </div>
        ))}

        {/* Tap to add text hint */}
        {overlays.length === 0 && !showTextInput && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm">
            Appuyez sur le bouton + pour ajouter du texte
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-4 space-y-4">
        {/* Text input */}
        {showTextInput ? (
          <div className="space-y-3">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              placeholder="Entrez votre texte..."
              autoFocus
              className="w-full bg-white/10 text-white placeholder-white/60 border-2 border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:border-white/40 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setNewText('');
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddText}
                disabled={!newText.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        ) : selectedOverlay ? (
          <div className="space-y-3">
            {/* Text controls */}
            <div className="flex items-center gap-2">
              {/* Font size */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-white/60 text-sm">Taille:</span>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={selectedOverlay.fontSize}
                  onChange={(e) => updateSelectedOverlay({ fontSize: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-white text-sm w-8">{selectedOverlay.fontSize}</span>
              </div>

              {/* Delete */}
              <button
                onClick={deleteSelectedOverlay}
                className="w-10 h-10 bg-red-500/80 hover:bg-red-600/90 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm">Alignement:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => updateSelectedOverlay({ align: 'left' })}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    selectedOverlay.align === 'left'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <AlignLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => updateSelectedOverlay({ align: 'center' })}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    selectedOverlay.align === 'center'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <AlignCenter className="w-5 h-5" />
                </button>
                <button
                  onClick={() => updateSelectedOverlay({ align: 'right' })}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    selectedOverlay.align === 'right'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <AlignRight className="w-5 h-5" />
                </button>
              </div>

              {/* Font weight */}
              <button
                onClick={() =>
                  updateSelectedOverlay({
                    fontWeight: selectedOverlay.fontWeight === 'bold' ? 'normal' : 'bold',
                  })
                }
                className={`px-4 h-10 rounded-lg font-bold transition-colors ${
                  selectedOverlay.fontWeight === 'bold'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                B
              </button>
            </div>

            {/* Color palette */}
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-white/60" />
              <div className="flex gap-2 flex-wrap">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateSelectedOverlay({ color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      selectedOverlay.color === color
                        ? 'border-white scale-110'
                        : 'border-white/30 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedOverlayIndex(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Désélectionner
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTextInput(true)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Type className="w-5 h-5" />
            <span>Ajouter du texte</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
