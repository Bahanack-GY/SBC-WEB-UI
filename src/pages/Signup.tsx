import { useState } from 'react';
import { FiUser, FiMapPin, FiHeart, FiX } from 'react-icons/fi';

interface SignupData {
  nom: string;
  email: string;
  password: string;
  confirmPassword: string;
  whatsapp: string;
  ville: string;
  region: string;
  naissance: string;
  sexe: string;
  pays: string;
  profession: string;
  langue: string;
  interets: string;
  parrain: string;
  cgu: boolean;
}

interface SignupErrors {
  nom?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  whatsapp?: string;
  ville?: string;
  region?: string;
  naissance?: string;
  sexe?: string;
  pays?: string;
  profession?: string;
  langue?: string;
  interets?: string;
  cgu?: string;
}

const initialData: SignupData = {
  nom: '',
  email: '',
  password: '',
  confirmPassword: '',
  whatsapp: '',
  ville: '',
  region: '',
  naissance: '',
  sexe: '',
  pays: '',
  profession: '',
  langue: '',
  interets: '',
  parrain: '',
  cgu: false,
};

const icons = [<FiUser size={48} className="text-[#115CF6] mx-auto" />, <FiMapPin size={48} className="text-[#115CF6] mx-auto" />, <FiHeart size={48} className="text-[#115CF6] mx-auto" />];

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

const interetOptions = [
  'Football', 'Basketball', 'Course à pied', 'Natation', 'Yoga', 'Randonnée', 'Cyclisme',
  'Musique (instruments, chant)', 'Danse', 'Peinture et dessin', 'Photographie', 'Théâtre', 'Cinéma',
  'Programmation', 'Robotique', 'Sciences de la vie', 'Astronomie', 'Électronique',
  'Découverte de nouvelles cultures', 'Randonnées en nature', 'Tourisme local et international',
  'Cuisine du monde', 'Pâtisserie', 'Dégustation de vins', 'Aide aux personnes défavorisées',
  'Protection de l\'environnement', 'Participation à des événements caritatifs', 'Lecture', 'Méditation',
  'Apprentissage de nouvelles langues', 'Jeux vidéo', 'Jeux de société', 'Énigmes et casse-têtes',
  'Stylisme', 'Décoration d\'intérieur', 'Artisanat', 'Fitness', 'Nutrition', 'Médecine alternative',
];

const countryCodes = [
  { value: 'Cameroun', label: '🇨🇲 +237', code: '+237' },
  { value: 'Bénin', label: '🇧🇯 +229', code: '+229' },
  { value: 'Congo-Brazzaville', label: '🇨🇬 +242', code: '+242' },
  { value: 'Congo-Kinshasa', label: '🇨🇩 +243', code: '+243' },
  { value: 'Ghana', label: '🇬🇭 +233', code: '+233' },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 +225', code: '+225' },
  { value: 'Sénégal', label: '🇸🇳 +221', code: '+221' },
  { value: 'Togo', label: '🇹🇬 +228', code: '+228' },
  { value: 'Burkina Faso', label: '🇧🇫 +226', code: '+226' },
];

function Signup() {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<SignupData>(initialData);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(countryCodes[0]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validateStep = () => {
    let valid = true;
    const newErrors: SignupErrors = {};
    if (step === 0) {
      if (!data.nom) { newErrors.nom = 'Nom requis'; valid = false; }
      if (!/^\S+@\S+\.\S+$/.test(data.email)) { newErrors.email = 'Email invalide'; valid = false; }
      if (data.password.length < 8) { newErrors.password = '8 caractères min.'; valid = false; }
      if (data.password !== data.confirmPassword) { newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'; valid = false; }
      if (!data.whatsapp) { newErrors.whatsapp = 'Numéro requis'; valid = false; }
    }
    if (step === 1) {
      if (!data.ville) { newErrors.ville = 'Ville requise'; valid = false; }
      if (!data.region) { newErrors.region = 'Région requise'; valid = false; }
      if (!data.naissance) { newErrors.naissance = 'Date requise'; valid = false; }
      if (!data.sexe) { newErrors.sexe = 'Sexe requis'; valid = false; }
      if (!data.pays) { newErrors.pays = 'Pays requis'; valid = false; }
      if (!data.profession) { newErrors.profession = 'Profession requise'; valid = false; }
    }
    if (step === 2) {
      if (!data.langue) { newErrors.langue = 'Langue requise'; valid = false; }
      if (!data.interets) { newErrors.interets = 'Centres d\'intérêt requis'; valid = false; }
      if (!data.cgu) { newErrors.cgu = 'Vous devez accepter les conditions'; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) setStep((s) => s + 1);
  };
  const handlePrev = (e: React.FormEvent) => {
    e.preventDefault();
    setStep((s) => s - 1);
  };
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      alert('Inscription réussie!\n' + JSON.stringify(data, null, 2));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">
        <div className="mb-4">{icons[step]}</div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Créer un compte</h2>
        <p className="text-center text-gray-500 mb-6">Créez un compte pour développer votre réseau et augmenter vos revenus</p>
        <form className="flex flex-col gap-4">
          {step === 0 && (
            <>
              <div>
                <label className="block text-gray-700 mb-1">Nom complet</label>
                <input name="nom" value={data.nom} onChange={handleChange} placeholder="Ex: Jean Paul" className={`w-full border ${errors.nom ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.nom && <div className="text-red-500 text-xs">{errors.nom}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Email</label>
                <input name="email" value={data.email} onChange={handleChange} placeholder="Ex: Jeanpierre@gmail.com" className={`w-full border ${errors.email ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.email && <div className="text-red-500 text-xs">{errors.email}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Mot de passe</label>
                <input name="password" type="password" value={data.password} onChange={handleChange} placeholder="Mot de passe" className={`w-full border ${errors.password ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.password && <div className="text-red-500 text-xs">{errors.password}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Confirmer le mot de passe</label>
                <input name="confirmPassword" type="password" value={data.confirmPassword} onChange={handleChange} placeholder="Confirmer mot de passe" className={`w-full border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.confirmPassword && <div className="text-red-500 text-xs">{errors.confirmPassword}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Numéro WhatsApp</label>
                <div className="flex gap-2">
                  <select
                    className="border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
                    value={selectedCode.value}
                    onChange={e => setSelectedCode(countryCodes.find(c => c.value === e.target.value) || countryCodes[0])}
                  >
                    {countryCodes.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    name="whatsapp"
                    value={data.whatsapp}
                    onChange={handleChange}
                    placeholder="Ex: 675090755"
                    className={`flex-1 border ${errors.whatsapp ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}
                    style={{ minWidth: 0 }}
                  />
                </div>
                {errors.whatsapp && <div className="text-red-500 text-xs">{errors.whatsapp}</div>}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="block text-gray-700 mb-1">Ville</label>
                <input name="ville" value={data.ville} onChange={handleChange} placeholder="Ex: Douala" className={`w-full border ${errors.ville ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.ville && <div className="text-red-500 text-xs">{errors.ville}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Région</label>
                <input name="region" value={data.region} onChange={handleChange} placeholder="Entrer la région" className={`w-full border ${errors.region ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.region && <div className="text-red-500 text-xs">{errors.region}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Date de naissance</label>
                <input name="naissance" type="date" value={data.naissance} onChange={handleChange} className={`w-full border ${errors.naissance ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.naissance && <div className="text-red-500 text-xs">{errors.naissance}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Sexe</label>
                <select name="sexe" value={data.sexe} onChange={handleChange} className={`w-full border ${errors.sexe ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                  <option value="Autre">Autre</option>
                </select>
                {errors.sexe && <div className="text-red-500 text-xs">{errors.sexe}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Pays</label>
                <select name="pays" value={data.pays} onChange={handleChange} className={`w-full border ${errors.pays ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner le pays</option>
                  {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {errors.pays && <div className="text-red-500 text-xs">{errors.pays}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Profession</label>
                <select name="profession" value={data.profession} onChange={handleChange} className={`w-full border ${errors.profession ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner la profession</option>
                  {professionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.profession && <div className="text-red-500 text-xs">{errors.profession}</div>}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="block text-gray-700 mb-1">Langue</label>
                <select name="langue" value={data.langue} onChange={handleChange} className={`w-full border ${errors.langue ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner la langue</option>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
                {errors.langue && <div className="text-red-500 text-xs">{errors.langue}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Centres d'intérêt</label>
                <select name="interets" value={data.interets} onChange={handleChange} className={`w-full border ${errors.interets ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner les centres d'intérêt</option>
                  {interetOptions.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                {errors.interets && <div className="text-red-500 text-xs">{errors.interets}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Code parrain</label>
                <input name="parrain" value={data.parrain} onChange={handleChange} placeholder="Code du parrain" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="cgu" checked={data.cgu} onChange={handleChange} className="accent-[#115CF6]" />
                <span>J'accepte les <button type="button" onClick={() => setShowModal(true)} className="text-[#115CF6] underline bg-transparent">conditions d'utilisation</button></span>
              </div>
              {errors.cgu && <div className="text-red-500 text-xs">{errors.cgu}</div>}
            </>
          )}
          <div className="flex justify-between mt-6 gap-2">
            {step > 0 && (
              <button onClick={handlePrev} className="bg-gray-200 text-gray-700 font-bold rounded-xl px-6 py-2">Précédent</button>
            )}
            {step < 2 && (
              <button onClick={handleNext} className="bg-[#115CF6] text-white font-bold rounded-xl px-6 py-2 ml-auto">Suivant</button>
            )}
            {step === 2 && (
              <button onClick={handleRegister} className="bg-[#115CF6] text-white font-bold rounded-xl px-6 py-2 ml-auto">S'inscrire</button>
            )}
          </div>
        </form>
        <div className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ? <a href="/connexion" className="text-[#115CF6] font-semibold hover:underline">Connexion</a>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 relative animate-fadeIn">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"><FiX /></button>
            <h3 className="text-xl font-bold mb-4 text-center">Conditions d'utilisation</h3>
            <div className="text-gray-700 text-sm max-h-[60vh] overflow-y-auto px-1">
              <p><strong>Bienvenue sur SBC !</strong></p>
              <p className="mt-2">En créant un compte, vous acceptez les conditions suivantes :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Vous devez fournir des informations exactes et à jour lors de votre inscription.</li>
                <li>Votre mot de passe doit rester confidentiel et ne pas être partagé.</li>
                <li>Vous êtes responsable de toute activité effectuée depuis votre compte.</li>
                <li>Vous vous engagez à respecter les lois en vigueur et à ne pas utiliser la plateforme à des fins frauduleuses ou illicites.</li>
                <li>Vos données personnelles sont protégées conformément à notre politique de confidentialité.</li>
                <li>Vous pouvez demander la suppression de votre compte à tout moment.</li>
                <li>L'équipe SBC se réserve le droit de suspendre ou supprimer un compte en cas de non-respect des conditions.</li>
              </ul>
              <p className="mt-4">Pour toute question, contactez notre support.</p>
              <p className="mt-2">Merci de faire partie de notre communauté !</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;