import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FaBullhorn } from 'react-icons/fa';
import BackButton from '../common/BackButton';
import illustration from '../../assets/icon/ads-share.jpg';

/**
 * Shown in place of the network until it opens.
 *
 * Deliberately says nothing about what the network does: Rufus reveals it
 * himself during the launch presentation, and a page that explains it first
 * spends the surprise.
 *
 * The feature ships days before the launch so it can be rehearsed on the real
 * thing; this is what everyone else sees in the meantime. The backend refuses
 * the same requests, so this is the polite face of a real gate, not the gate.
 */
const two = (n: number) => String(n).padStart(2, '0');

export default function AdsLaunchCountdown({ launchAt }: { launchAt: string | null }) {
    const target = launchAt ? new Date(launchAt).getTime() : null;
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const left = target ? Math.max(0, target - now) : null;
    const days = left !== null ? Math.floor(left / 86_400_000) : 0;
    const hours = left !== null ? Math.floor((left % 86_400_000) / 3_600_000) : 0;
    const minutes = left !== null ? Math.floor((left % 3_600_000) / 60_000) : 0;
    const seconds = left !== null ? Math.floor((left % 60_000) / 1000) : 0;

    const when = target
        ? new Date(target).toLocaleString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="px-4 pt-4 pb-8 text-white bg-gradient-to-br from-[#115CF6] to-blue-500"
            >
                <div className="max-w-2xl mx-auto">
                    <div className="[&_button]:text-white [&_svg]:text-white">
                        <BackButton />
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold">SBC Ads Network</h1>
                        </div>
                        <img
                            src={illustration}
                            alt=""
                            className="w-24 h-24 object-cover rounded-2xl shadow-lg ring-2 ring-white/30 shrink-0"
                        />
                    </div>
                </div>
            </motion.div>

            <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center"
                >
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-[#115CF6] flex items-center justify-center mx-auto">
                        <FaBullhorn size={22} />
                    </div>

                    {left !== null && left > 0 ? (
                        <>
                            <p className="text-sm text-gray-500 mt-4">Ouverture dans</p>
                            <div className="flex justify-center gap-2 mt-3">
                                {[
                                    { v: days, l: 'jours' },
                                    { v: hours, l: 'heures' },
                                    { v: minutes, l: 'min' },
                                    { v: seconds, l: 'sec' },
                                ].map(u => (
                                    <div key={u.l} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 min-w-[62px]">
                                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{two(u.v)}</p>
                                        <p className="text-[11px] text-gray-500">{u.l}</p>
                                    </div>
                                ))}
                            </div>
                            {when && (
                                <p className="text-sm text-gray-600 mt-4">
                                    Rendez-vous le <strong>{when}</strong>.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-700 mt-4">
                            L'ouverture est imminente. Rechargez la page dans un instant.
                        </p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
