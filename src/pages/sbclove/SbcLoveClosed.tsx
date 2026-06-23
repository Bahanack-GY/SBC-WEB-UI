import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegClock } from 'react-icons/fa';

interface Props {
    nextOpenAt: string | null;
}

const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const formatNextOpen = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const day = WEEKDAYS_FR[d.getDay()];
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${day} à ${time}`;
};

/**
 * Shown when SBC Love is outside its weekly session window. The entry button is
 * normally hidden when closed, so this is the fallback for a direct visit/bookmark.
 */
const SbcLoveClosed: React.FC<Props> = ({ nextOpenAt }) => {
    const navigate = useNavigate();
    const next = formatNextOpen(nextOpenAt);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                <FaHeart className="text-[#115CF6]" size={36} />
            </div>
            <h1 className="text-2xl font-bold mb-2">SBC Love est fermé</h1>
            <p className="text-gray-600 max-w-sm mb-4">
                Le module SBC Love est ouvert une fois par semaine, chaque mercredi de 18h00 à 21h00.
            </p>
            {next && (
                <p className="flex items-center gap-2 text-[#115CF6] font-medium mb-6">
                    <FaRegClock /> Prochaine ouverture : {next}
                </p>
            )}
            <button
                onClick={() => navigate('/')}
                className="rounded-xl bg-[#115CF6] hover:bg-blue-700 px-6 py-2.5 font-medium text-white"
            >
                Retour à l'accueil
            </button>
        </div>
    );
};

export default SbcLoveClosed;
