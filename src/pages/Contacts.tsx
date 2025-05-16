import { useState, useMemo } from 'react';
import BackButton from "../components/common/BackButton";
import { motion, AnimatePresence } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { FiDownload, FiFilter } from 'react-icons/fi';
import { Index } from 'flexsearch';

const professions = ["Médecin", "Ingénieur", "Enseignant", "Commerçant", "Étudiant"];
const interests = ["Sport", "Musique", "Voyage", "Lecture", "Technologie"];
const sexes = ["Homme", "Femme", "Autre"];

const westAfricanCountries = [
  { name: 'Bénin', flag: '🇧🇯' },
  { name: 'Burkina Faso', flag: '🇧🇫' },
  { name: 'Cap-Vert', flag: '🇨🇻' },
  { name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { name: 'Gambie', flag: '🇬🇲' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Guinée', flag: '🇬🇳' },
  { name: 'Guinée-Bissau', flag: '🇬🇼' },
  { name: 'Libéria', flag: '🇱🇷' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'Niger', flag: '🇳🇪' },
  { name: 'Nigéria', flag: '🇳🇬' },
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: 'Sierra Leone', flag: '🇸🇱' },
  { name: 'Togo', flag: '🇹🇬' },
];

interface Criteria {
  country: string;
  age: string;
  sex: string;
  professions: string[];
  interests: string[];
}

const contacts = [
  { name: 'Nicholas Gordon', phone: '+22990001111', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { name: 'Bradley Malone', phone: '+22990002222', avatar: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { name: 'Janie Todd', phone: '+22990003333', avatar: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { name: 'Marvin Lambert', phone: '+22990004444', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { name: 'Teresa Lloyd', phone: '+22990005555', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { name: 'Fred Haynes', phone: '+22990006666', avatar: 'https://randomuser.me/api/portraits/men/4.jpg' },
  { name: 'Rose Peters', phone: '+22990007777', avatar: 'https://randomuser.me/api/portraits/women/3.jpg' },
  { name: 'Jose Stone', phone: '+22990008888', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', highlight: true },
];

function Contacts() {
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [filterDownloadModalOpen, setFilterDownloadModalOpen] = useState(false);
    const [criteria, setCriteria] = useState<Criteria>({
        country: "",
        age: "",
        sex: "",
        professions: [],
        interests: [],
    });
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const handleMultiSelect = (key: 'professions' | 'interests', value: string) => {
        setCriteria(prev => {
            const arr = prev[key];
            return {
                ...prev,
                [key]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value]
            };
        });
    };

    const handleWhatsapp = (phone: string) => {
        window.open(`https://wa.me/${phone.replace(/[^\d]/g, '')}`, '_blank');
    };

    const handleDownloadAll = () => {
        // Dummy handler for downloading all contacts
        alert('Téléchargement de tous les contacts...');
        setDownloadModalOpen(false);
    };
    const handleDownloadRange = () => {
        // Dummy handler for downloading contacts in date range
        alert(`Téléchargement des contacts du ${dateRange.from} au ${dateRange.to}`);
        setDownloadModalOpen(false);
    };
    const handleDownloadFiltered = () => {
        // Dummy handler for downloading filtered contacts
        alert('Téléchargement des contacts selon le filtre courant.');
        setFilterDownloadModalOpen(false);
    };

    // FlexSearch index for fast fuzzy search
    const flexIndex = useMemo(() => {
        const index = new Index({ tokenize: 'forward', preset: 'match', cache: true });
        contacts.forEach((c, i) => {
            index.add(i, c.name + ' ' + c.phone);
        });
        return index;
    }, []);

    const filteredContacts = useMemo(() => {
        if (!search.trim()) return contacts;
        const results = flexIndex.search(search.trim()) as string[];
        return results.map(i => contacts[Number(i)]);
    }, [search, flexIndex]);

    return (
        <div className="p-3 h-screen bg-white">
            <div className="flex items-center mb-3">
            <BackButton />
            <h3 className="text-xl font-medium text-center w-full">Fiche de contact</h3>
        </div>
            {/* Search Bar */}
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full mb-3 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 text-gray-700"
            />
            {/* Sort, Download & Modal Trigger */}
            <div className="flex items-center gap-2 mb-4">
                <button
                    className="bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200"
                    onClick={() => setModalOpen(true)}
                >
                    <span className="font-bold">Trier</span> <span className="ml-1 text-[#22334d]">▼</span>
                </button>
                <span className="text-gray-500">A-Z</span>
                <button
                    className="ml-auto bg-gray-100 px-3 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200 hover:bg-gray-200"
                    onClick={() => setDownloadModalOpen(true)}
                    title="Télécharger les contacts"
                >
                    <FiDownload size={18} />
                </button>
                <button
                    className="bg-gray-100 px-3 py-2 rounded-lg text-gray-700 font-semibold flex items-center gap-2 border border-gray-200 hover:bg-gray-200"
                    onClick={() => setFilterDownloadModalOpen(true)}
                    title="Télécharger les contacts filtrés"
                >
                    <FiFilter size={18} />
                </button>
            </div>
            {/* Download Modal */}
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
                                >
                                    Télécharger tous les contacts
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
                                        disabled={!dateRange.from || !dateRange.to}
                                    >
                                        Télécharger la sélection
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
            {/* Download Filtered Modal */}
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
                                Vous allez télécharger les contacts selon les critères de filtre actuels.<br />
                                <span className="font-semibold">Résumé du filtre :</span><br />
                                Pays : {criteria.country || 'Tous'}<br />
                                Âge : {criteria.age || 'Tous'}<br />
                                Sexe : {criteria.sex || 'Tous'}<br />
                                Professions : {criteria.professions.length ? criteria.professions.join(', ') : 'Toutes'}<br />
                                Intérêts : {criteria.interests.length ? criteria.interests.join(', ') : 'Tous'}
                            </div>
                            <button
                                className="w-full bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors mb-2"
                                onClick={handleDownloadFiltered}
                            >
                                Télécharger les contacts filtrés
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
            {/* Modal for Sorting Criteria */}
            <AnimatePresence>
                {modalOpen && (
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
                            <h4 className="text-lg font-bold mb-4">Trier par critères</h4>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Pays</label>
                                <select
                                    value={criteria.country}
                                    onChange={e => setCriteria(c => ({ ...c, country: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
                                >
                                    <option value="">Sélectionner</option>
                                    {westAfricanCountries.map(c => (
                                        <option key={c.name} value={c.name}>
                                            {c.flag} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Âge</label>
                                <input
                                    type="number"
                                    value={criteria.age}
                                    onChange={e => setCriteria(c => ({ ...c, age: e.target.value }))}
                                    placeholder="Entrer l'âge"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Sexe</label>
                                <select
                                    value={criteria.sex}
                                    onChange={e => setCriteria(c => ({ ...c, sex: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
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
                                    {interests.map(int => (
                                        <button
                                            key={int}
                                            type="button"
                                            className={`px-3 py-1 rounded-full border text-xs font-medium ${criteria.interests.includes(int) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                                            onClick={() => handleMultiSelect('interests', int)}
                                        >
                                            {int}
                                        </button>
                                    ))}
                                </div>
                            </div>
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
            <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-xl shadow">
                {filteredContacts.map((c) => (
                    <div key={c.phone} className="flex items-center px-3 py-3 gap-3">
                        <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div className="flex-1 min-w-0">
                            <div className={`font-semibold text-sm truncate ${c.highlight ? 'text-blue-600' : 'text-gray-900'}`}>{c.name}</div>
                            <div className="text-xs text-gray-400 truncate">{c.phone}</div>
                        </div>
                        <button
                            className="ml-2 text-green-600 hover:bg-green-50 rounded-full p-2 transition-colors"
                            onClick={() => handleWhatsapp(c.phone)}
                            title="Discuter sur WhatsApp"
                        >
                            <FaWhatsapp size={20} />
                        </button>
                    </div>
                ))}
        </div>
        </div>
    )
}

export default Contacts;
