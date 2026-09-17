import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

type Outcome = 'IDLE' | 'SCANNING' | 'VALID' | 'ALREADY_USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'WRONG_EVENT' | 'EVENT_NOT_OPEN' | 'ERROR';

interface Feedback {
    outcome: Outcome;
    message: string;
    serial?: string;
    holderName?: string;
}

export default function OrganizerScanner() {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const scanningLockRef = useRef(false);
    const [feedback, setFeedback] = useState<Feedback>({ outcome: 'IDLE', message: 'Autorisez la caméra pour commencer.' });
    const [streamError, setStreamError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setFeedback({ outcome: 'SCANNING', message: 'Pointez la caméra vers un QR code.' });
                    tick();
                }
            } catch (e: any) {
                setStreamError(e?.message || 'Caméra inaccessible.');
                setFeedback({ outcome: 'ERROR', message: 'Impossible d\'accéder à la caméra.' });
            }
        })();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            stream?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tick = () => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;
        if (v.readyState === v.HAVE_ENOUGH_DATA && !scanningLockRef.current) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext('2d');
            if (ctx) {
                ctx.drawImage(v, 0, 0, c.width, c.height);
                const img = ctx.getImageData(0, 0, c.width, c.height);
                const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
                if (code?.data) {
                    scanningLockRef.current = true;
                    validate(code.data);
                }
            }
        }
        rafRef.current = requestAnimationFrame(tick);
    };

    const validate = async (qrToken: string) => {
        setFeedback({ outcome: 'SCANNING', message: 'Vérification en cours...' });
        try {
            const res = await sbcApiService.scanTicketQr({ qrToken, expectedEventId: eventId, deviceInfo: navigator.userAgent });
            if (res.apiReportedSuccess && res.body?.data) {
                setFeedback({
                    outcome: res.body?.data.outcome,
                    message: res.body?.data.message,
                    serial: res.body?.data.ticket?.serial,
                    holderName: res.body?.data.ticket?.holderName,
                });
            } else {
                setFeedback({ outcome: 'ERROR', message: res.message || 'Erreur' });
            }
        } catch (e: any) {
            setFeedback({ outcome: 'ERROR', message: e?.message || 'Erreur réseau' });
        }
        // Unlock after a short pause so the same code doesn't retrigger immediately
        setTimeout(() => { scanningLockRef.current = false; setFeedback((f) => f.outcome === 'VALID' || f.outcome === 'ALREADY_USED' ? f : { outcome: 'SCANNING', message: 'Pointez la caméra vers un QR code.' }); }, 2500);
    };

    const colors: Record<Outcome, string> = {
        IDLE: 'bg-gray-100 text-gray-700',
        SCANNING: 'bg-blue-100 text-blue-700',
        VALID: 'bg-emerald-100 text-emerald-800',
        ALREADY_USED: 'bg-amber-100 text-amber-800',
        INVALID: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-red-100 text-red-800',
        REFUNDED: 'bg-red-100 text-red-800',
        WRONG_EVENT: 'bg-red-100 text-red-800',
        EVENT_NOT_OPEN: 'bg-amber-100 text-amber-800',
        ERROR: 'bg-red-100 text-red-800',
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="p-4 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Scanner de billets</h1>
            </div>

            <div className="relative w-full aspect-square bg-black overflow-hidden">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {/* viewfinder */}
                <div className="absolute inset-6 border-2 border-white/60 rounded-2xl pointer-events-none" />
            </div>

            <div className={`m-4 rounded-2xl p-4 text-center ${colors[feedback.outcome]}`}>
                <div className="font-semibold uppercase text-xs tracking-wider">{feedback.outcome}</div>
                <div className="text-base mt-1">{feedback.message}</div>
                {feedback.serial && <div className="text-xs mt-2 opacity-80">Billet {feedback.serial} · {feedback.holderName}</div>}
            </div>

            {streamError && <div className="mx-4 text-sm text-red-300">{streamError}</div>}
        </div>
    );
}
