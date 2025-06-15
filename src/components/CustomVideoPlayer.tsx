import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, BackwardIcon, ForwardIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';

interface CustomVideoPlayerProps {
    src: string;
    poster: string;
    title: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ src, poster, title }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
            if (isMuted) {
                videoRef.current.volume = volume === 0 ? 0.5 : volume; // Restore volume if it was 0 when muted
            }
        }
    }, [isMuted, volume]);

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    }, []);

    const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newTime = (parseFloat(e.target.value) / 100) * duration;
            videoRef.current.currentTime = newTime;
            setProgress(parseFloat(e.target.value));
        }
    }, [duration]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const skip = useCallback((seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('ended', () => setIsPlaying(false));
            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('ended', () => setIsPlaying(false));
            };
        }
    }, [handleTimeUpdate, handleLoadedMetadata]);

    return (
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black group">
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                title={title}
                className="w-full aspect-video object-contain"
                onClick={togglePlay}
            />

            {/* Overlay controls */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Central Play/Pause Button - always show in overlay for better UX */}
                <button
                    onClick={togglePlay}
                    className="p-3 rounded-full bg-white bg-opacity-80 text-gray-900 shadow-lg hover:bg-opacity-100 transition-colors"
                >
                    {isPlaying ? (
                        <PauseIcon className="w-7 h-7" />
                    ) : (
                        <PlayIcon className="w-7 h-7" />
                    )}
                </button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleProgressChange}
                    className="w-full h-2 bg-green-500 rounded-lg appearance-none cursor-pointer mb-2"
                    style={{
                        background: `linear-gradient(to right, #2ecc40 ${progress}%, #d1d5db ${progress}%)`
                    }}
                />
                <div className="flex items-center justify-between text-white text-sm mb-2">
                    <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                    {/* Play/Pause Button */}
                    <button onClick={togglePlay} className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white">
                        {isPlaying ? (
                            <PauseIcon className="w-5 h-5" />
                        ) : (
                            <PlayIcon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Skip buttons */}
                    <div className="flex gap-2">
                        <button onClick={() => skip(-10)} className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white">
                            <BackwardIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => skip(10)} className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white">
                            <ForwardIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2 flex-grow">
                        <button onClick={toggleMute} className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white">
                            {isMuted || volume === 0 ? (
                                <SpeakerXMarkIcon className="w-5 h-5" />
                            ) : (
                                <SpeakerWaveIcon className="w-5 h-5" />
                            )}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #2ecc40 ${isMuted ? 0 : volume * 100}%, #d1d5db ${isMuted ? 0 : volume * 100}%)`
                            }}
                        />
                    </div>

                    {/* Fullscreen Button */}
                    <button onClick={toggleFullscreen} className="p-1 rounded-full hover:bg-gray-700 transition-colors text-white">
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer; 