import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiEdit2, FiPhone } from 'react-icons/fi';

const countryOptions = [
  { value: 'Cameroun', label: '🇨🇲 Cameroun' },
  { value: 'Bénin', label: '🇧🇯 Bénin' },
  { value: 'Congo-Brazzaville', label: '🇨🇬 Congo-Brazzaville' },
  { value: 'Congo-Kinshasa', label: '🇨🇩 Congo-Kinshasa' },
  { value: 'Ghana', label: '🇬🇭 Ghana' },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire' },
  { value: 'Sénégal', label: '🇸🇳 Sénégal' },
  { value: 'Togo', label: '🇹🇬 Togo' },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso' },
];
const professionOptions = [
  'Médecin', 'Infirmier/Infirmière', 'Pharmacien', 'Chirurgien', 'Psychologue', 'Dentiste', 'Kinésithérapeute',
  'Ingénieur civil', 'Ingénieur en informatique', 'Développeur de logiciels', 'Architecte', 'Technicien en électronique', 'Data scientist',
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
  'Journaliste', 'Rédacteur web', 'Chargé de communication', 'Community manager',
  'Comptable', 'Analyste financier', 'Auditeur interne', 'Conseiller fiscal',
  'Agriculteur/Agricultrice', 'Ingénieur agronome', 'Écologiste', 'Gestionnaire de ressources naturelles',
];

const initialUser = {
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  nom: 'Michael B Murina',
  telephone: '',
  ville: '',
  pays: '',
  profession: '',
  parrainage: '',
  interet: '',
};

const interestOptions = [
  'Sport', 'Musique', 'Lecture', 'Voyage', 'Technologie', 'Art', 'Cuisine', 'Cinéma', 'Jeux vidéo', 'Photographie', 'Mode', 'Danse', 'Écriture', 'Bricolage', 'Jardinage', 'Fitness', 'Animaux', 'Science', 'Histoire', 'Politique', 'Finance', 'Entrepreneuriat', 'Bénévolat', 'Autre'
];

function ModifierLeProfil() {
  const [user, setUser] = useState(initialUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };
  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUser((prev) => ({ ...prev, avatar: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save logic here
  };
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#f8fafc] px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md bg-white rounded-3xl p-8"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-2">
            <img src={user.avatar} alt="avatar" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow" />
            <button
              type="button"
              onClick={handleAvatarButtonClick}
              className="absolute bottom-2 right-2 bg-[#115CF6] p-2 rounded-full border-2 border-white shadow text-white hover:bg-blue-800 transition-colors"
            >
              <FiEdit2 size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="text-lg font-bold text-gray-800">Modifier le profil</div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div>
            <label className="block text-gray-700 mb-1">Nom complet</label>
            <input name="nom" value={user.nom} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Téléphone</label>
            <div className="relative">
              <input name="telephone" value={user.telephone} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none pr-10" />
              <FiPhone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Ville</label>
            <input name="ville" value={user.ville} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Pays</label>
            <select name="pays" value={user.pays} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none">
              <option value="">Sélectionner le pays</option>
              {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Profession</label>
            <select name="profession" value={user.profession} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none">
              <option value="">Sélectionner la profession</option>
              {professionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Code de parrainage</label>
            <input name="parrainage" value={user.parrainage} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Intérêt</label>
            <select
              name="interet"
              value={user.interet}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
            >
              <option value="">Sélectionner un intérêt</option>
              {interestOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-[#115CF6] hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow">Sauvegarder</button>
        </form>
      </motion.div>
    </div>
  );
}

export default ModifierLeProfil;