import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video as VideoIcon, Trash2, Send, Edit3 } from 'lucide-react';
import type { StatusCategory } from '../../types/chat';
import { CATEGORY_CONFIG, USER_CATEGORIES } from '../../types/chat';
import { sbcApiService } from '../../services/SBCApiService';
import { ImageEditor } from './editors/ImageEditor';
import { VideoEditor } from './editors/VideoEditor';

interface StoryComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type EditorMode = 'compose' | 'edit-image' | 'edit-video';

const StoryComposer = ({ isOpen, onClose, onSuccess }: StoryComposerProps) => {
  const [category, setCategory] = useState<StatusCategory | ''>('');
  const [textContent, setTextContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('compose');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Cleanup preview URL when component unmounts or media changes
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // Auto-play video preview
  useEffect(() => {
    if (videoPreviewRef.current && mediaType === 'video') {
      videoPreviewRef.current.play().catch(console.error);
    }
  }, [mediaPreviewUrl, mediaType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCategory('');
    setTextContent('');
    setSelectedMedia(null);
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl(null);
    setMediaType(null);
    setError(null);
    setIsUploading(false);
    setEditorMode('compose');
  };

  // Validate video duration
  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;

        if (duration > 30) {
          setError('La vidéo ne peut pas dépasser 30 secondes');
          resolve(false);
        } else {
          resolve(true);
        }
      };

      video.onerror = () => {
        setError('Impossible de lire la vidéo');
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('L\'image ne peut pas dépasser 10 MB');
      return;
    }

    // Clear previous media
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setSelectedMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaType('image');
  };

  // Handle video selection
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner une vidéo valide');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('La vidéo ne peut pas dépasser 50 MB');
      return;
    }

    // Validate video duration
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
      return;
    }

    // Clear previous media
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setSelectedMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setMediaType('video');
  };

  // Remove selected media
  const handleRemoveMedia = () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setSelectedMedia(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Open media editor
  const handleEditMedia = () => {
    if (!selectedMedia || !mediaType) return;

    if (mediaType === 'image') {
      setEditorMode('edit-image');
    } else if (mediaType === 'video') {
      setEditorMode('edit-video');
    }
  };

  // Handle media editor save
  const handleMediaEditorSave = (editedFile: File) => {
    // Replace the current media with edited version
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setSelectedMedia(editedFile);
    setMediaPreviewUrl(URL.createObjectURL(editedFile));
    setEditorMode('compose');
  };

  // Handle share story
  const handleShareStory = async () => {
    if (!category) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    if (!textContent.trim() && !selectedMedia) {
      setError('Veuillez ajouter du texte ou des médias');
      return;
    }

    if (textContent.length > 500) {
      setError('Le texte ne peut pas dépasser 500 caractères');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const contentType = selectedMedia
        ? mediaType === 'video'
          ? 'video'
          : 'image'
        : 'text';

      await sbcApiService.createStatus({
        category: category as string,
        contentType,
        content: textContent.trim() || undefined,
        media: selectedMedia || undefined,
      });

      // Success - call callback and close
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create status:', err);
      setError(
        err instanceof Error ? err.message : 'Échec de la création du statut'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Can share if category is selected AND (text or media is present)
  const canShare =
    category &&
    (textContent.trim().length > 0 || selectedMedia !== null) &&
    !isUploading;

  if (!isOpen) return null;

  // Show editor overlays
  if (editorMode === 'edit-image' && mediaPreviewUrl) {
    return (
      <ImageEditor
        imageUrl={mediaPreviewUrl}
        onSave={handleMediaEditorSave}
        onCancel={() => setEditorMode('compose')}
      />
    );
  }

  if (editorMode === 'edit-video' && mediaPreviewUrl) {
    return (
      <VideoEditor
        videoUrl={mediaPreviewUrl}
        onSave={handleMediaEditorSave}
        onCancel={() => setEditorMode('compose')}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background/Media Preview */}
        <div className="absolute inset-0 bg-black">
          {mediaPreviewUrl && mediaType === 'video' ? (
            <video
              ref={videoPreviewRef}
              src={mediaPreviewUrl}
              className="w-full h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : mediaPreviewUrl && mediaType === 'image' ? (
            <img
              src={mediaPreviewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          ) : (
            // Gradient background for text-only stories
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-green-600 to-orange-500" />
          )}
        </div>

        {/* Text Overlay Preview (Real-time) - Only show if NO media */}
        {textContent && !mediaPreviewUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <p
              className="text-white text-center font-bold drop-shadow-lg text-3xl md:text-5xl"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {textContent}
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-6 right-6 z-30 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Category Selector (Top) */}
        <div className="absolute top-6 left-6 right-24 z-30">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StatusCategory)}
            disabled={isUploading}
            className="w-full bg-black/50 backdrop-blur-sm text-white border-2 border-white/30 rounded-full px-6 py-3 focus:outline-none focus:border-white/60 transition-colors disabled:opacity-50"
          >
            <option value="">Sélectionner une catégorie</option>
            {USER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-24 left-6 right-6 z-30">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-center font-semibold"
            >
              {error}
            </motion.div>
          </div>
        )}

        {/* Bottom Controls (Glassmorphism) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6">
          <div className="bg-black/50 backdrop-blur-md rounded-3xl p-6 space-y-4">
            {/* Text Input */}
            <textarea
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                setError(null);
              }}
              placeholder="Ajoutez du texte à votre story..."
              disabled={isUploading}
              maxLength={500}
              className="w-full bg-white/10 text-white placeholder-white/60 border-2 border-white/20 rounded-2xl px-4 py-3 focus:outline-none focus:border-white/40 transition-colors resize-none disabled:opacity-50"
              rows={3}
            />

            {/* Character Count */}
            {textContent.length > 0 && (
              <div className="text-right text-white/60 text-sm">
                {textContent.length} / 500
              </div>
            )}

            {/* Media Upload and Action Buttons */}
            <div className="flex items-center gap-3">
              {!selectedMedia ? (
                <>
                  {/* Photo Upload Button */}
                  <label className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
                    <ImageIcon className="w-5 h-5" />
                    <span>Photo</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  {/* Video Upload Button */}
                  <label className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
                    <VideoIcon className="w-5 h-5" />
                    <span>Vidéo</span>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </>
              ) : (
                <>
                  {/* Edit Media Button */}
                  <button
                    onClick={handleEditMedia}
                    disabled={isUploading}
                    className="flex-1 bg-blue-500/80 hover:bg-blue-600/90 text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span>Éditer</span>
                  </button>

                  {/* Remove Media Button */}
                  <button
                    onClick={handleRemoveMedia}
                    disabled={isUploading}
                    className="flex-1 bg-red-500/80 hover:bg-red-600/90 text-white font-semibold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Supprimer</span>
                  </button>
                </>
              )}

              {/* Share Button */}
              <button
                onClick={handleShareStory}
                disabled={!canShare}
                className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Partage...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Partager</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryComposer;
