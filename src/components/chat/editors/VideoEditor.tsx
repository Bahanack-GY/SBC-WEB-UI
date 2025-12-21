import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Check, X, Scissors } from 'lucide-react';

interface VideoEditorProps {
  videoUrl: string;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

export const VideoEditor = ({ videoUrl, onSave, onCancel }: VideoEditorProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      setEndTime(Math.min(dur, 30)); // Max 30 seconds
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Auto-pause when reaching end trim point
      if (video.currentTime >= endTime) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = startTime;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [endTime, startTime]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start from trim start if at the beginning
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle timeline click for seeking
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    // Clamp to trim boundaries
    const clampedTime = Math.max(startTime, Math.min(endTime, time));
    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  // Handle trim handle drag
  const handleTrimDrag = (_e: React.MouseEvent<HTMLDivElement>, isStart: boolean) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const updateTrim = (clientX: number) => {
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const time = percentage * duration;

      if (isStart) {
        const newStart = Math.max(0, Math.min(time, endTime - 1));
        setStartTime(newStart);
        if (videoRef.current && currentTime < newStart) {
          videoRef.current.currentTime = newStart;
        }
      } else {
        const newEnd = Math.max(startTime + 1, Math.min(time, Math.min(duration, 30)));
        setEndTime(newEnd);
        if (videoRef.current && currentTime > newEnd) {
          videoRef.current.currentTime = newEnd;
        }
      }
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateTrim(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (isStart) {
      setIsDraggingStart(true);
    } else {
      setIsDraggingEnd(true);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Save trimmed video
  const handleSave = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);

    try {
      // Fetch the original video
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      // Create a new file with the same data
      // Note: Actual video trimming would require FFmpeg or similar
      // For now, we'll pass metadata about trim points with the file
      const file = new File([blob], 'trimmed-video.mp4', {
        type: 'video/mp4',
        lastModified: Date.now(),
      });

      // Add trim metadata (the backend would need to handle this)
      (file as any).trimStart = startTime;
      (file as any).trimEnd = endTime;

      onSave(file);
    } catch (error) {
      console.error('Failed to process video:', error);
      alert('Échec de l\'édition de la vidéo');
    } finally {
      setIsProcessing(false);
    }
  };

  const trimDuration = endTime - startTime;
  const isValidTrim = trimDuration > 0 && trimDuration <= 30;

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
          disabled={isProcessing}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 text-white">
          <Scissors className="w-5 h-5" />
          <span className="text-sm font-medium">
            Durée: {formatTime(trimDuration)}
            {trimDuration > 30 && (
              <span className="ml-2 text-red-400">(Max 30s)</span>
            )}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={isProcessing || !isValidTrim}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Video preview */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="max-w-full max-h-full object-contain"
          playsInline
        />

        {/* Play/Pause overlay button */}
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </div>
        </button>
      </div>

      {/* Timeline and controls */}
      <div className="bg-black/80 backdrop-blur-sm p-6 space-y-4">
        {/* Timeline */}
        <div className="space-y-2">
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            className="relative h-16 bg-white/10 rounded-lg overflow-hidden cursor-pointer"
          >
            {/* Dimmed areas (trimmed out) */}
            <div
              className="absolute top-0 bottom-0 bg-black/60"
              style={{
                left: 0,
                right: `${(1 - startTime / duration) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-black/60"
              style={{
                left: `${(endTime / duration) * 100}%`,
                right: 0,
              }}
            />

            {/* Active area */}
            <div
              className="absolute top-0 bottom-0 bg-blue-500/20 border-y-2 border-blue-500"
              style={{
                left: `${(startTime / duration) * 100}%`,
                right: `${(1 - endTime / duration) * 100}%`,
              }}
            />

            {/* Start trim handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleTrimDrag(e, true);
              }}
              className={`absolute top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors ${
                isDraggingStart ? 'bg-blue-400' : ''
              }`}
              style={{
                left: `${(startTime / duration) * 100}%`,
              }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </div>

            {/* End trim handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleTrimDrag(e, false);
              }}
              className={`absolute top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors ${
                isDraggingEnd ? 'bg-blue-400' : ''
              }`}
              style={{
                left: `${(endTime / duration) * 100}%`,
              }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </div>

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{
                left: `${(currentTime / duration) * 100}%`,
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
            </div>
          </div>

          {/* Time labels */}
          <div className="flex justify-between text-sm text-white/60">
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(endTime)}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-white/60">
          Glissez les poignées bleues pour découper la vidéo (max 30s)
        </div>
      </div>
    </motion.div>
  );
};
