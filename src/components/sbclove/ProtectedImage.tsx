import React from 'react';
import { FaUserSecret } from 'react-icons/fa';

interface ProtectedImageProps {
    url?: string;
    blurred?: boolean;
    alt: string;
    className?: string;
    /** Show the SBCLOVE watermark overlay (spec §13). Default true. */
    watermark?: boolean;
}

/**
 * Displays a SBCLOVE profile photo with basic, deterrent-level protection
 * (spec §13): a "SBCLOVE" watermark, disabled right-click and drag. True
 * screenshot prevention is impossible on the web, so this is intentionally a
 * deterrent. Blurred derivatives for non-profile viewers come from the backend.
 */
const ProtectedImage: React.FC<ProtectedImageProps> = ({ url, blurred, alt, className = '', watermark = true }) => {
    const block = (e: React.SyntheticEvent) => e.preventDefault();

    return (
        <div className={`relative overflow-hidden select-none ${className}`} onContextMenu={block}>
            {url ? (
                <img
                    src={url}
                    alt={alt}
                    draggable={false}
                    onDragStart={block}
                    onContextMenu={block}
                    className="w-full h-full object-cover pointer-events-none"
                    style={blurred ? { filter: 'blur(2px)' } : undefined}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                    <FaUserSecret size={42} />
                </div>
            )}

            {/* Transparent layer to intercept long-press / drag on mobile */}
            <div className="absolute inset-0" onContextMenu={block} />

            {watermark && (
                <span className="absolute bottom-1 right-2 text-[10px] font-semibold tracking-widest text-white/70 drop-shadow pointer-events-none">
                    SBCLOVE
                </span>
            )}
        </div>
    );
};

export default ProtectedImage;
