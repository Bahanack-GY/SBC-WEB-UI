import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import BackButton from "../components/common/BackButton";
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp, FaFilter } from 'react-icons/fa';
import { FiDownload, FiFilter, FiLoader } from 'react-icons/fi';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, getBaseUrl, removeAccents } from '../utils/apiHelpers';
import type { User } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { countryOptions } from '../utils/countriesData';

const professions = [
    'Étudiant(e)', 'Sans emploi',
    'Médecin', 'Infirmier/Infirmière', 'Pharmacien', 'Chirurgien', 'Psychologue', 'Dentiste', 'Kinésithérapeute',
    'Ingénieur civil', 'Ingénieur en informatique', 'Développeur de logiciels', 'Architecte', 'Technicien en électronique', 'Scientifique des données',
    'Enseignant', 'Professeur d\'université', 'Formateur professionnel', 'Éducateur spécialisé', 'Conseiller pédagogique',
    'Artiste (peintre, sculpteur)', 'Designer graphique', 'Photographe', 'Musicien', 'Écrivain', 'Réalisateur',
    'Responsable marketing', 'Vendeur/Vendeuse', 'Gestionnaire de produit', 'Analyste de marché', 'Consultant en stratégie',
    'Avocat', 'Notaire', 'Juge', 'Huissier de justice',
    'Chercheur scientifique', 'Biologiste', 'Chimiste', 'Physicien', 'Statisticien',
    'Travailleur social', 'Conseiller en orientation', 'Animateur socioculturel', 'Médiateur familial',
    'Maçon', 'Électricien', 'Plombier', 'Charpentier', 'Architecte d\'intérieur',
    'Chef cuisinier', 'Serveur/Serveuse', 'Gestionnaire d\'hôtel', 'Barman/Barmane',
    'Conducteur de train', 'Pilote d\'avion', 'Logisticien', 'Gestionnaire de chaîne d\'approvisionnement',
    'Administrateur système', 'Spécialiste en cybersécurité', 'Ingénieur réseau', 'Consultant en technologies de l\'information',
    'Journaliste', 'Rédacteur web', 'Chargé de communication', 'Gestionnaire de communauté',
    'Comptable', 'Analyste financier', 'Auditeur interne', 'Conseiller fiscal',
    'Agriculteur/Agricultrice', 'Ingénieur agronome', 'Écologiste', 'Gestionnaire de ressources naturelles',
];
// Base interest options without emojis (for data storage)
const baseInterests = [
    'Football', 'Basketball', 'Course à pied', 'Natation', 'Yoga', 'Randonnée', 'Cyclisme',
    'Musique (instruments, chant)', 'Danse', 'Peinture et dessin', 'Photographie', 'Théâtre', 'Cinéma',
    'Programmation', 'Robotique', 'Sciences de la vie', 'Astronomie', 'Électronique',
    'Découverte de nouvelles cultures', 'Randonnées en nature', 'Tourisme local et international',
    'Cuisine du monde', 'Pâtisserie', 'Dégustation de vins', 'Aide aux personnes défavorisées',
    'Protection de l\'environnement', 'Participation à des événements caritatifs', 'Lecture', 'Méditation',
    'Apprentissage de nouvelles langues', 'Jeux vidéo', 'Jeux de société', 'Énigmes et casse-têtes',
    'Stylisme', 'Décoration d\'intérieur', 'Artisanat', 'Fitness', 'Nutrition', 'Médecine alternative',
];

// Display interest options with emojis (for UI display)
const interests = [
    '⚽ Football', '🏀 Basketball', '🏃 Course à pied', '🏊 Natation', '🧘 Yoga', '🥾 Randonnée', '🚴 Cyclisme',
    '🎵 Musique (instruments, chant)', '💃 Danse', '🎨 Peinture et dessin', '📸 Photographie', '🎭 Théâtre', '🎬 Cinéma',
    '💻 Programmation', '🤖 Robotique', '🔬 Sciences de la vie', '🌌 Astronomie', '⚡ Électronique',
    '🌍 Découverte de nouvelles cultures', '🌿 Randonnées en nature', '✈️ Tourisme local et international',
    '🍽️ Cuisine du monde', '🧁 Pâtisserie', '🍷 Dégustation de vins', '🤝 Aide aux personnes défavorisées',
    '🌱 Protection de l\'environnement', '❤️ Participation à des événements caritatifs', '📚 Lecture', '🧘‍♀️ Méditation',
    '🗣️ Apprentissage de nouvelles langues', '🎮 Jeux vidéo', '🎲 Jeux de société', '🧩 Énigmes et casse-têtes',
    '👗 Stylisme', '🏠 Décoration d\'intérieur', '🎨 Artisanat', '💪 Fitness', '🥗 Nutrition', '🌿 Médecine alternative',
];

// Helper function to get base value without emoji
const getInterestBaseValue = (displayValue: string): string => {
    const index = interests.indexOf(displayValue);
    return index !== -1 ? baseInterests[index] : displayValue.replace(/^[^\w\s]+\s*/, ''); // Remove emoji prefix
};

const sexes = ["Homme", "Femme", "Autre"];

// Using all African countries from the centralized data
const africanCountries = countryOptions.map(country => ({
    name: country.label,
    flag: country.code
}));

interface Criteria {
    country: string;
    minAge?: string;
    maxAge?: string;
    sex: string;
    professions: string[];
    interests: string[];
    search: string;
}

const PAGE_SIZE = 20;

function Contacts() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isRestrictedToBasicFilters = user?.activeSubscriptions?.includes('CLASSIQUE') && !user.activeSubscriptions.includes('CIBLE');

    const [modalOpen, setModalOpen] = useState(false);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [filterDownloadModalOpen, setFilterDownloadModalOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [criteria, setCriteria] = useState<Criteria>({
        country: "",
        minAge: "",
        maxAge: "",
        sex: "",
        professions: [],
        interests: [],
        search: ""
    });
    const [debouncedCriteria, setDebouncedCriteria] = useState(criteria);
    const [filterModalDateRange, setFilterModalDateRange] = useState({ from: '', to: '' });

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedCriteria(criteria), 500);
        return () => clearTimeout(handler);
    }, [criteria]);

    const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [dateRange, setDateRange] = useState({
        from: formatDateForInput(sevenDaysAgo),
        to: formatDateForInput(today),
    });
    useEffect(() => {
        if (!filterDownloadModalOpen) {
            setFilterModalDateRange({ from: '', to: '' });
        }
    }, [filterDownloadModalOpen]);

    useEffect(() => {
        if (modalOpen && isRestrictedToBasicFilters) {
            setCriteria(prev => ({
                ...prev,
                minAge: "",
                maxAge: "",
                sex: "",
                professions: [],
                interests: [],
            }));
        }
    }, [modalOpen, isRestrictedToBasicFilters]);

    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery<
        { contacts: User[]; hasMore: boolean },
        Error
    >({
        queryKey: ['contacts', debouncedCriteria, isRestrictedToBasicFilters],
        queryFn: async ({ pageParam = 1 }) => {
            const apiSex = debouncedCriteria.sex === 'Homme' ? 'male' :
                debouncedCriteria.sex === 'Femme' ? 'female' :
                    debouncedCriteria.sex === 'Autre' ? 'other' : '';

            const filters: Record<string, string | number> = {
                search: debouncedCriteria.search,
                country: debouncedCriteria.country,
                page: Number(pageParam),
                limit: PAGE_SIZE,
            };

            if (!isRestrictedToBasicFilters) {
                if (debouncedCriteria.minAge) filters.minAge = debouncedCriteria.minAge;
                if (debouncedCriteria.maxAge) filters.maxAge = debouncedCriteria.maxAge;
                if (apiSex) filters.sex = apiSex;
                if (debouncedCriteria.professions.length > 0) filters.professions = debouncedCriteria.professions.map(p => removeAccents(p)).join(',');
                if (debouncedCriteria.interests.length > 0) filters.interests = debouncedCriteria.interests.map(i => removeAccents(i)).join(',');
            }

            try {
                const response = await sbcApiService.searchContacts(filters);
                const result = handleApiResponse(response);
                return {
                    contacts: result?.contacts || result?.users || result || [],
                    hasMore: result?.paginationInfo ? result.paginationInfo.currentPage < result.paginationInfo.totalPages :
                        result?.totalPages ? result.page < result.totalPages :
                            (result?.contacts?.length === PAGE_SIZE || result?.users?.length === PAGE_SIZE)
                };
            } catch (error) {
                // Handle subscription validation errors specifically
                if (error instanceof Error) {
                    if (error.message.includes('subscription') || error.message.includes('contact plan')) {
                        throw new Error('Votre abonnement ne permet pas d\'accéder aux contacts. Veuillez mettre à niveau vers l\'abonnement CIBLÉ.');
                    }
                    if (error.message.includes('Advanced filtering')) {
                        throw new Error('Les filtres avancés nécessitent un abonnement CIBLÉ.');
                    }
                }
                throw error;
            }
        },
        getNextPageParam: (lastPage: { contacts: User[]; hasMore: boolean }, allPages) => {
            if (lastPage.hasMore) {
                return allPages.length + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    const contacts = data?.pages.flatMap((page: { contacts: User[] }) => page.contacts) || [];

    useEffect(() => {
        if (!hasNextPage || isLoading || isFetchingNextPage) return;
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const docHeight = document.body.scrollHeight;
            const scrollPercent = (scrollY + windowHeight) / docHeight;
            if (scrollPercent > 0.8 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasNextPage, isLoading, isFetchingNextPage, fetchNextPage]);

    const handleCriteriaChange = (key: keyof Criteria, value: string | string[]) => {
        if (isRestrictedToBasicFilters && ['minAge', 'maxAge', 'sex', 'professions', 'interests'].includes(key)) {
            return;
        }
        setCriteria(prev => ({ ...prev, [key]: value }));
    };

    const handleMultiSelect = (key: 'professions' | 'interests', value: string) => {
        if (isRestrictedToBasicFilters) {
            return;
        }
        setCriteria(prev => {
            const arr = prev[key];
            const newArr = arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value];
            return { ...prev, [key]: newArr };
        });
    };

    const RelanceMessage = `🚀 Rejoins la Révolution Entrepreneuriale avec le Sniper Business Center ! 🌍

Tu es à un clic de faire partie de la meilleure communauté d'Afrique, où les opportunités d'affaires abondent et où ton succès est notre priorité!

Voici ce que tu vas gagner en nous rejoignant dès maintenant:

✨ Visibilité Maximale: Partage ton flyer ou affiche publicitaire dans nos groupes chaque samedi, atteignant ainsi des milliers de potentiels clients!

📈 Accès à un Réseau Énorme:
Profite de plus de 30 000 contacts WhatsApp ciblés qui verront tes produits et services.Ton succès commence ici!

🎓 Formations Exclusives et Gratuites:
Bénéficie de 5 formations complètes, accompagnées d'un suivi personnalisé chaque semaine sur Google Meet :

   • Deviens expert en trading

   • Maîtrise l'importation depuis la Chine

   • Domine le marketing digital

   • Excelle en art oratoire

   • Crée des bots WhatsApp pour booster ton business

🛒 Marketplace à Ta Disposition:
 Mets en avant tes produits et services sur notre plateforme dédiée!

💰 Gagne de l'Argent Facilement :
Avec notre système de parrainage rémunéré:

   • Niveau 1 : Parrainage direct = 1000 FCFA

   • Niveau 2 : Ton filleul parraine = 500 FCFA

   • Niveau 3 : Le filleul de ton filleul inscrit = 250 FCFA

Je suis ton parrain à la SBC et je suis là pour t'accompagner vers le succès ! J'ai remarqué que tu as créé ton compte, mais que tu n'as pas encore finalisé ton abonnement. Ne laisse pas passer cette chance incroyable !

👉 Prends ta décision aujourd'hui et transforme ta vie avec nous !

    https://sniperbuisnesscenter.com/ `;

    const handleWhatsapp = (phone: string) => {
        if (phone) window.open(`https://wa.me/${phone.replace(/[^\d]/g, '')}/?text=${RelanceMessage}`, '_blank');
    };

    const downloadFile = async (url: string, filename: string = 'contacts.vcf') => {
        setDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur de téléchargement: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let suggestedFilename = filename;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    try {
                        suggestedFilename = decodeURIComponent(filenameMatch[1].trim().replace(/^"|"$/g, ''));
                    } catch (e) {
                        console.warn("Could not decode filename from Content-Disposition, using default.", e);
                        suggestedFilename = filenameMatch[1].trim().replace(/^"|"$/g, '');
                    }
                }
            }

            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = suggestedFilename;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(urlBlob);
            alert('Téléchargement réussi!');
        } catch (err) {
            console.error("Failed to download contacts:", err);
            alert('Échec du téléchargement des contacts.');
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadAll = async () => {
        const baseUrl = getBaseUrl();
        await downloadFile(`${baseUrl}/contacts/export`, `tous_contacts.vcf`);
        setDownloadModalOpen(false);
    };

    const handleDownloadRange = async () => {
        if (!dateRange.from || !dateRange.to) {
            alert("Veuillez sélectionner les deux dates.");
            return;
        }
        const baseUrl = getBaseUrl();
        const queryParams = new URLSearchParams({
            startDate: dateRange.from,
            endDate: dateRange.to,
        }).toString();
        await downloadFile(`${baseUrl}/contacts/export?${queryParams}`, `contacts_du_${dateRange.from}_au_${dateRange.to}.vcf`);
        setDownloadModalOpen(false);
    };

    const handleDownloadFiltered = async () => {
        const baseUrl = getBaseUrl();
        const apiSex = criteria.sex === 'Homme' ? 'male' :
            criteria.sex === 'Femme' ? 'female' :
                criteria.sex === 'Autre' ? 'other' : '';

        const filters: Record<string, string | string[]> = {
            search: criteria.search,
            country: criteria.country,
        };

        if (!isRestrictedToBasicFilters) {
            if (criteria.minAge) filters.minAge = criteria.minAge;
            if (criteria.maxAge) filters.maxAge = criteria.maxAge;
            if (apiSex) filters.sex = apiSex;
            if (criteria.professions.length > 0) filters.professions = criteria.professions.map(p => removeAccents(p)).join(',');
            if (criteria.interests.length > 0) filters.interests = criteria.interests.map(i => removeAccents(i)).join(',');
        }

        if (filterModalDateRange.from) filters.startDate = filterModalDateRange.from;
        if (filterModalDateRange.to) filters.endDate = filterModalDateRange.to;

        const queryParams = Object.entries(filters)
            .filter(([, value]) => value !== null && value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true))
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
            .join('&');

        await downloadFile(`${baseUrl}/contacts/export?${queryParams}`, `contacts_filtres.vcf`);
        setFilterDownloadModalOpen(false);
    };

    return (
        <ProtectedRoute>
            <div className="p-3 h-screen bg-white">
                <div className="flex items-center mb-3">
                    <BackButton />
                    <h3 className="text-xl font-medium text-center w-full">Fiche de contact</h3>
                </div>
                <input
                    type="text"
                    value={criteria.search}
                    onChange={e => handleCriteriaChange('search', e.target.value)}
                    placeholder="Rechercher par nom, téléphone..."
                    className="w-full mb-3 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 text-gray-700"
                />
                <div className="flex items-center gap-2 mb-4">
                    <button
                        className="bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200"
                        onClick={() => setModalOpen(true)}
                    >
                        <FaFilter className="text-green-700" />
                        <span className="font-bold">Trier</span>
                    </button>
                    <span className="text-gray-500">A-Z</span>
                    <button
                        className="ml-auto bg-gray-100 px-3 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200 hover:bg-gray-200"
                        onClick={() => setDownloadModalOpen(true)}
                        title="Télécharger les contacts"
                        disabled={downloading}
                    >
                        <FiDownload size={18} />
                    </button>
                    <button
                        className="bg-gray-100 px-3 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200 hover:bg-gray-200"
                        onClick={() => setFilterDownloadModalOpen(true)}
                        title="Télécharger les contacts filtrés"
                        disabled={downloading}
                    >
                        <FiFilter size={18} />
                    </button>
                </div>
                <AnimatePresence>
                    {downloadModalOpen && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.2 }}
                            >
                                <h4 className="text-lg font-bold mb-4">Télécharger les contacts</h4>
                                <div className="flex flex-col gap-4">
                                    <button
                                        className="w-full bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors"
                                        onClick={handleDownloadAll}
                                        disabled={downloading}
                                    >
                                        {downloading ? 'Téléchargement...' : 'Télécharger tous les contacts'}
                                    </button>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Ou sélectionner une période :</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={dateRange.from}
                                                onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
                                                className="rounded-lg border border-gray-200 px-3 py-2"
                                            />
                                            <input
                                                type="date"
                                                value={dateRange.to}
                                                onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
                                                className="rounded-lg border border-gray-200 px-3 py-2"
                                            />
                                        </div>
                                        <button
                                            className="w-full bg-green-700 text-white rounded-xl py-2 font-bold shadow hover:bg-green-800 transition-colors"
                                            onClick={handleDownloadRange}
                                            disabled={!dateRange.from || !dateRange.to || downloading}
                                        >
                                            {downloading ? 'Téléchargement...' : 'Télécharger la sélection'}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    className="w-full mt-4 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                                    onClick={() => setDownloadModalOpen(false)}
                                >
                                    Annuler
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {filterDownloadModalOpen && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.2 }}
                            >
                                <h4 className="text-lg font-bold mb-4">Télécharger les contacts filtrés</h4>
                                <div className="mb-4 text-sm text-gray-700">
                                    <span className="font-semibold">Résumé du filtre :</span><br />
                                    Pays : {africanCountries.find(c => c.flag === criteria.country)?.name || 'Tous'}<br />
                                    {isRestrictedToBasicFilters ? (
                                        <p className="text-orange-600 font-medium">Les filtres avancés (âge, sexe, professions, intérêts) sont réservés aux abonnés CIBLÉ.</p>
                                    ) : (
                                        <>
                                            Âge : {criteria.minAge && criteria.maxAge ? `${criteria.minAge} - ${criteria.maxAge}` : criteria.minAge ? `Min ${criteria.minAge}` : criteria.maxAge ? `Max ${criteria.maxAge}` : 'Tous'}<br />
                                            Sexe : {criteria.sex || 'Tous'}<br />
                                            Professions : {criteria.professions.length ? criteria.professions.join(', ') : 'Toutes'}<br />
                                            Intérêts : {criteria.interests.length ? criteria.interests.join(', ') : 'Tous'}
                                        </>
                                    )}
                                </div>
                                {isRestrictedToBasicFilters && (
                                    <button
                                        onClick={() => {
                                            navigate('/abonnement');
                                            setFilterDownloadModalOpen(false);
                                        }}
                                        className="w-full bg-gradient-to-r from-[#F68F0F] to-orange-400 text-white rounded-xl py-2 font-bold shadow hover:bg-green-800 transition-colors mb-4"
                                    >
                                        Mettre à niveau vers l'abonnement CIBLÉ
                                    </button>
                                )}
                                <div className="flex flex-col gap-2 mb-4">
                                    <label className="text-sm font-medium">Ou sélectionner une période :</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={filterModalDateRange.from}
                                            onChange={e => setFilterModalDateRange(r => ({ ...r, from: e.target.value }))}
                                            className="rounded-lg border border-gray-200 px-3 py-2"
                                        />
                                        <input
                                            type="date"
                                            value={filterModalDateRange.to}
                                            onChange={e => setFilterModalDateRange(r => ({ ...r, to: e.target.value }))}
                                            className="rounded-lg border border-gray-200 px-3 py-2"
                                        />
                                    </div>
                                </div>
                                <button
                                    className="w-full bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors mb-2"
                                    onClick={handleDownloadFiltered}
                                    disabled={downloading}
                                >
                                    {downloading ? 'Téléchargement...' : 'Télécharger les contacts filtrés'}
                                </button>
                                <button
                                    className="w-full bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                                    onClick={() => setFilterDownloadModalOpen(false)}
                                >
                                    Annuler
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {modalOpen && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg overflow-y-auto max-h-[80vh]"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.2 }}
                            >
                                <h4 className="text-lg font-bold mb-4">Trier par critères</h4>
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1">Pays</label>
                                    <select
                                        value={criteria.country}
                                        onChange={e => handleCriteriaChange('country', e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2 bg-white"
                                    >
                                        <option value="">Sélectionner</option>
                                        {africanCountries.map(c => (
                                            <option key={c.flag} value={c.flag}>
                                                {c.name} ({c.flag})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {isRestrictedToBasicFilters ? (
                                    <>
                                        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm text-center mb-4">
                                            Les filtres par âge, sexe, profession et centres d'intérêt sont une fonctionnalité exclusive pour les abonnés **CIBLÉ**.
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigate('/changer-abonnement');
                                                setModalOpen(false); // Close the modal
                                            }}
                                            className="w-full bg-gradient-to-r from-[#F68F0F] to-orange-400 text-white rounded-xl py-2 font-bold shadow hover:bg-green-800 transition-colors mb-2"
                                        >
                                            Mettre à niveau vers l'abonnement CIBLÉ
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Âge minimum</label>
                                            <input
                                                type="number"
                                                value={criteria.minAge}
                                                onChange={e => handleCriteriaChange('minAge', e.target.value)}
                                                placeholder="Min. âge"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Âge maximum</label>
                                            <input
                                                type="number"
                                                value={criteria.maxAge}
                                                onChange={e => handleCriteriaChange('maxAge', e.target.value)}
                                                placeholder="Max. âge"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Sexe</label>
                                            <select
                                                name="sex"
                                                value={criteria.sex}
                                                onChange={e => handleCriteriaChange('sex', e.target.value)}
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2 bg-white"
                                            >
                                                <option value="">Sélectionner</option>
                                                {sexes.map(sex => <option key={sex} value={sex}>{sex}</option>)}
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Profession</label>
                                            <div className="flex flex-wrap gap-2">
                                                {professions.map(prof => (
                                                    <button
                                                        key={prof}
                                                        type="button"
                                                        className={`px-3 py-1 rounded-full border text-xs font-medium ${criteria.professions.includes(prof) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                                                        onClick={() => handleMultiSelect('professions', prof)}
                                                    >
                                                        {prof}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Intérêt</label>
                                            <div className="flex flex-wrap gap-2">
                                                {interests.map(displayInterest => {
                                                    const baseInterest = getInterestBaseValue(displayInterest);
                                                    const isSelected = criteria.interests.includes(baseInterest);
                                                    return (
                                                        <button
                                                            key={displayInterest}
                                                            type="button"
                                                            className={`px-3 py-1 rounded-full border text-xs font-medium ${isSelected ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                                                            onClick={() => handleMultiSelect('interests', baseInterest)}
                                                        >
                                                            {displayInterest}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex gap-3 mt-4">
                                    <button
                                        className="flex-1 bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Appliquer
                                    </button>
                                    <button
                                        className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                                        onClick={() => setModalOpen(false)}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {isLoading ? (
                    <div className="flex justify-center items-center p-10">
                        <FiLoader className="animate-spin text-4xl text-green-700" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">
                        {error instanceof Error ? error.message : error}
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl shadow">
                        {contacts.map((c: User) => (
                            <div key={c._id} className="flex items-center px-3 py-3 gap-3">
                                <img
                                    src={
                                        c.avatar ? c.avatar : c.avatarId
                                            ? sbcApiService.generateSettingsFileUrl(c.avatarId)
                                            : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360'}
                                    alt={c.name}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm truncate text-gray-900`}>{c.name}</div>
                                    <div className="text-xs text-gray-400 truncate">{c.phoneNumber}</div>
                                </div>
                                <button
                                    className="ml-2 text-green-600 hover:bg-green-50 rounded-full p-2 transition-colors"
                                    onClick={() => handleWhatsapp(c.phoneNumber || '')}
                                    title="Discuter sur WhatsApp"
                                >
                                    <FaWhatsapp size={20} />
                                </button>
                            </div>
                        ))}
                        {contacts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun contact trouvé pour ces critères.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}

export default Contacts;