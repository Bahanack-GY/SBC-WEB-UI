import { useState } from 'react';
import { sbcApiService } from '../../services/SBCApiService';

/**
 * Fallback avatar, inline.
 *
 * The app pointed at /default-avatar.png, which does not exist — every user
 * without a photo produced a 404, dozens per screen. A data URI cannot 404 and
 * costs no request at all.
 */
export const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="32" fill="#E5E7EB"/>
            <circle cx="32" cy="25" r="11" fill="#9CA3AF"/>
            <path d="M12 60c0-11 9-19 20-19s20 8 20 19z" fill="#9CA3AF"/>
        </svg>`.replace(/\s+/g, ' '),
    );

type AvatarProps = {
    src?: string | null;
    alt?: string;
    /** Rendered size in CSS pixels. The image is fetched at 2x for sharpness. */
    size?: number;
    className?: string;
};

/**
 * A profile picture, fetched at the size it is actually drawn.
 *
 * Avatars are stored full size — 1.8 MB is typical — and were loaded in full for
 * 32 px circles, a dozen at a time. Every screen that shows people should use
 * this rather than an <img> so that can't come back one component at a time.
 */
export default function Avatar({ src, alt = '', size = 40, className = '' }: AvatarProps) {
    const [failed, setFailed] = useState(false);

    // 2x for retina, and never below a sane floor.
    const requested = Math.max(32, Math.round(size * 2));
    const resolved = !src || failed
        ? DEFAULT_AVATAR
        : sbcApiService.generateThumbnailUrl(src, requested) || DEFAULT_AVATAR;

    return (
        <img
            src={resolved}
            alt={alt}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`object-cover ${className}`}
        />
    );
}
