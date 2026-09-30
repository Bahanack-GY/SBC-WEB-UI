import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { TONE_CLASS, type Tone } from '../lib/eventStatus';

type Outcome = 'IDLE' | 'SCANNING' | 'VALID' | 'ALREADY_USED' | 'INVALID' | 'CANCELLED' | 'REFUNDED' | 'WRONG_EVENT' | 'EVENT_NOT_OPEN' | 'ERROR';

interface Feedback {
    outcome: Outcome;
    message: string;
    serial?: string;
    holderName?: string;
}

/** Title + tint per outcome. Green passes, orange warns, red refuses. */
const OUTCOME: Record<Outcome, { title: string; tone: Tone; icon: string }> = {
    IDLE: { title: 'Caméra', tone: 'muted', icon: '📷' },
    SCANNING: { title: 'Lecture…', tone: 'primary', icon: '🔍' },
    VALID: { title: 'Entrée validée', tone: 'success', icon: '✅' },
    ALREADY_USED: { title: 'Billet déjà utilisé', tone: 'accent', icon: '⚠️' },
    INVALID: { title: 'Billet invalide', tone: 'danger', icon: '⛔' },
    CANCELLED: { title: 'Billet annulé', tone: 'danger', icon: '⛔' },
    REFUNDED: { title: 'Billet remboursé', tone: 'danger', icon: '⛔' },
    WRONG_EVENT: { title: 'Autre événement', tone: 'danger', icon: '⛔' },
    EVENT_NOT_OPEN: { title: 'Événement non ouvert', tone: 'accent', icon: '⚠️' },
    ERROR: { title: 'Erreur', tone: 'danger', icon: '⛔' },
};

/** Outcomes that stop the scanner until the operator asks for the next ticket. */
const TERMINAL: Outcome[] = ['VALID', 'ALREADY_USED', 'INVALID', 'CANCELLED', 'REFUNDED', 'WRONG_EVENT', 'EVENT_NOT_OPEN', 'ERROR'];

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
        // The scanner stays locked on a result: the operator reads it, then
        // explicitly asks for the next ticket. No auto-resume that could flash
        // a green "validé" the person at the door never saw.
    };

    const scanNext = () => {
        setFeedback({ outcome: 'SCANNING', message: 'Pointez la caméra vers un QR code.' });
        scanningLockRef.current = false;
    };

    const o = OUTCOME[feedback.outcome] ?? OUTCOME.ERROR;
    const showNext = TERMINAL.includes(feedback.outcome) && !streamError;

    return (
        <div className="min-h-screen bg-ink">
            <div className="p-4 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold text-white">Scanner de billets</h1>
            </div>

            <div className="relative w-full aspect-square bg-ink overflow-hidden">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {/* viewfinder */}
                <div className="absolute inset-6 border-2 border-white/60 rounded-card pointer-events-none" />
            </div>

            <div className="p-4 space-y-3">
                <div className={`rounded-card p-5 text-center ${TONE_CLASS[o.tone]}`}>
                    <div className="text-3xl" aria-hidden>{o.icon}</div>
                    <div className="text-xl font-bold mt-1">{o.title}</div>
                    <div className="text-sm mt-1 opacity-90">{feedback.message}</div>
                    {feedback.outcome === 'VALID' && feedback.holderName && (
                        <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-lg font-semibold">{feedback.holderName}</div>
                            {feedback.serial && <div className="text-xs mt-0.5 opacity-80">Billet n° {feedback.serial}</div>}
                        </div>
                    )}
                    {feedback.outcome !== 'VALID' && feedback.serial && (
                        <div className="text-xs mt-2 opacity-80">Billet n° {feedback.serial}{feedback.holderName ? ` · ${feedback.holderName}` : ''}</div>
                    )}
                </div>

                {showNext && (
                    <button
                        onClick={scanNext}
                        className="w-full bg-primary hover:bg-primary-hover text-white text-lg font-bold py-5 rounded-card transition-colors"
                    >
                        Scanner le billet suivant
                    </button>
                )}

                {streamError && <div className="text-sm text-white/80">{streamError}</div>}
            </div>
        </div>
    );
}
