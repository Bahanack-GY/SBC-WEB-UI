import { useState, useEffect } from 'react';
import { FiUser, FiMapPin, FiHeart, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAffiliation } from '../contexts/AffiliationContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../utils/apiHelpers';
import { ApiResponse } from '../services/ApiResponse';

interface SignupData {
  nom: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  whatsapp: string;
  ville: string;
  region: string;
  naissance: string;
  sexe: string;
  pays: string;
  profession: string;
  langue: string;
  interets: string[];
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
  general?: string;
  emailExists?: string;
  whatsappExists?: string;
  parrain?: string;
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
  interets: [],
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
  { value: 'Côte d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire', code: '+225' },
  { value: 'Sénégal', label: '🇸🇳 Sénégal', code: '+221' },
  { value: 'Togo', label: '🇹🇬 Togo', code: '+228' },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso', code: '+226' },
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
  { value: 'Côte d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire', code: '+225' },
  { value: 'Sénégal', label: '🇸🇳 Sénégal', code: '+221' },
  { value: 'Togo', label: '🇹🇬 Togo', code: '+228' },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso', code: '+226' },
];

const DEBOUNCE_DELAY = 3000;
const STORAGE_KEY_DATA = 'signupFormData';
const STORAGE_KEY_STEP = 'signupFormStep';

function Signup() {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<SignupData>(initialData);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(countryCodes[0]);
  const [loading, setLoading] = useState(false);
  const [checkingExistence, setCheckingExistence] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [isAffiliationCodeDisabled, setIsAffiliationCodeDisabled] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();
  const location = useLocation();
  const { affiliationCode } = useAffiliation();

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP);
      console.log('Attempting to load from localStorage...');
      console.log('Saved data:', savedData);
      console.log('Saved step:', savedStep);

      if (savedData) {
        const parsedData: SignupData = JSON.parse(savedData);
        console.log('Loaded and parsed data:', parsedData);
        setData(prev => ({ ...initialData, ...prev, ...parsedData }));
        if (parsedData.whatsapp) {
          const matchedCode = countryCodes.find(c => parsedData.whatsapp.startsWith(c.code));
          if (matchedCode) {
            setSelectedCode(matchedCode);
            setData(prev => ({ ...prev, whatsapp: parsedData.whatsapp.replace(matchedCode.code, '') }));
          } else {
            setSelectedCode(countryCodes[0]);
          }
        }
      }

      if (savedStep) {
        setStep(parseInt(savedStep, 10));
        console.log('Loaded step:', parseInt(savedStep, 10));
      }
      console.log('Finished loading from localStorage.');
    } catch (error) {
      console.error('Failed to load signup form data from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (affiliationCode) {
      setData(prev => ({ ...prev, parrain: affiliationCode }));
      setIsAffiliationCodeDisabled(true);
      const fetchAffiliateInfo = async () => {
        setAffiliateLoading(true);
        try {
          const response = await sbcApiService.getAffiliationInfo(affiliationCode);
          const result = handleApiResponse(response);
          if (result && result.name) {
            setAffiliateName(result.name);
            setErrors(prev => ({ ...prev, parrain: undefined }));
          } else {
            setAffiliateName(null);
          }
        } catch (error) {
          console.error('Error fetching affiliate info (deep link):', error);
          setAffiliateName(null);
        } finally {
          setAffiliateLoading(false);
        }
      };
      fetchAffiliateInfo();
    } else if (!localStorage.getItem(STORAGE_KEY_DATA)) {
      setIsAffiliationCodeDisabled(false);
      setData(prev => ({ ...prev, parrain: '' }));
      setAffiliateName(null);
    }
  }, [affiliationCode, localStorage.getItem(STORAGE_KEY_DATA)]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!isAffiliationCodeDisabled && data.parrain) {
        setAffiliateLoading(true);
        setErrors(prev => ({ ...prev, parrain: undefined }));
        sbcApiService.getAffiliationInfo(data.parrain)
          .then(response => {
            const result = handleApiResponse(response);
            if (result && result.name) {
              setAffiliateName(result.name);
              setErrors(prev => ({ ...prev, parrain: undefined }));
            } else {
              setAffiliateName(null);
              if (data.parrain) {
                setErrors(prev => ({ ...prev, parrain: 'Code parrain invalide.' }));
              }
            }
          })
          .catch(error => {
            console.error('Error fetching affiliate info (manual input):', error);
            setAffiliateName(null);
            let errorMessage = 'Erreur lors de la vérification du code parrain.';
            if (error instanceof Error) { errorMessage = error.message; }
            else if (error instanceof ApiResponse && error.body?.message) { errorMessage = error.body.message; }
            if (data.parrain) {
              setErrors(prev => ({ ...prev, parrain: errorMessage }));
            }
          })
          .finally(() => {
            setAffiliateLoading(false);
          });
      } else if (!data.parrain && !isAffiliationCodeDisabled) {
        setAffiliateName(null);
        setErrors(prev => ({ ...prev, parrain: undefined }));
        setAffiliateLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [data.parrain, isAffiliationCodeDisabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    if (name === 'interets') {
      return;
    }
    if (name === 'countryCodeSelect') {
      const code = countryCodes.find(c => c.value === value) || countryCodes[0];
      setSelectedCode(code);
      const whatsappNumber = data.whatsapp;
      setData(prev => ({ ...prev, whatsapp: whatsappNumber }));
      return;
    }
    setData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

    if (step === 0 && (name === 'email' || name === 'whatsapp' || name === 'parrain')) {
      setApiError(null);
      const updatedErrors = { ...errors, general: undefined, emailExists: undefined, whatsappExists: undefined };
      if (name === 'parrain') {
        updatedErrors.parrain = undefined;
        setAffiliateName(null);
        setAffiliateLoading(false);
      }
      setErrors(updatedErrors);
    }

    if (errors[name as keyof SignupErrors] && name !== 'parrain') {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInterestClick = (interest: string) => {
    setData(prev => ({
      ...prev,
      interets: prev.interets.includes(interest)
        ? prev.interets.filter(i => i !== interest)
        : [...prev.interets, interest]
    }));
    setErrors(prev => ({ ...prev, interets: undefined }));
  };

  const validateStep = async (): Promise<boolean> => {
    let valid = true;
    const newErrors: SignupErrors = {};
    setApiError(null);
    setErrors(prev => ({ ...prev, general: undefined, emailExists: undefined, whatsappExists: undefined, parrain: undefined }));

    if (step === 0) {
      if (!data.nom) { newErrors.nom = 'Nom complet requis'; valid = false; }
      if (!/\S+@\S+\.\S+$/.test(data.email)) { newErrors.email = 'Email invalide'; valid = false; }
      if (!data.password || data.password.length < 8) { newErrors.password = 'Mot de passe doit avoir au moins 8 caractères.'; valid = false; }
      if (data.password !== data.confirmPassword) { newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'; valid = false; }
      if (!data.whatsapp) { newErrors.whatsapp = 'Numéro WhatsApp requis'; valid = false; }

      if (valid && data.email && data.whatsapp && /\S+@\S+\.\S+$/.test(data.email)) {
        setCheckingExistence(true);
        let emailExists = false;
        let whatsappExists = false;
        let checkGeneralError = false;

        try {
          const emailResponse = await sbcApiService.checkUserExistence({ email: data.email });
          const emailResult = handleApiResponse(emailResponse);
          if (emailResult?.exists) {
            newErrors.emailExists = 'Cet email est déjà utilisé.';
            emailExists = true;
          }
        } catch (error) {
          console.error('Error checking email existence:', error);
          let errorMessage = 'Erreur lors de la vérification de l\'email.';
          if (error instanceof Error) { errorMessage = error.message; }
          else if (error instanceof ApiResponse && error.body?.message) { errorMessage = error.body.message; }
          newErrors.general = errorMessage;
          checkGeneralError = true;
        }

        try {
          const phoneNumber = `${selectedCode.code}${data.whatsapp}`;
          const whatsappResponse = await sbcApiService.checkUserExistence({ phoneNumber: phoneNumber });
          const whatsappResult = handleApiResponse(whatsappResponse);
          if (whatsappResult?.exists) {
            newErrors.whatsappExists = 'Ce numéro WhatsApp est déjà utilisé.';
            whatsappExists = true;
          }
        } catch (error) {
          console.error('Error checking phone number existence:', error);
          let errorMessage = 'Erreur lors de la vérification du numéro WhatsApp.';
          if (error instanceof Error) { errorMessage = error.message; }
          else if (error instanceof ApiResponse && error.body?.message) { errorMessage = error.body.message; }
          if (!newErrors.general) {
            newErrors.general = errorMessage;
            checkGeneralError = true;
          }
        } finally {
          setCheckingExistence(false);
        }

        if (emailExists || whatsappExists || checkGeneralError) {
          valid = false;
        }
      }
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
      if (!data.interets || data.interets.length === 0) { newErrors.interets = 'Au moins un centre d\'intérêt requis'; valid = false; }
      if (data.parrain && !isAffiliationCodeDisabled && !affiliateName) {
        newErrors.parrain = 'Code parrain invalide ou non vérifié.';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateStep();
    if (isValid) {
      const dataToSave = { ...data };
      const fullWhatsapp = `${selectedCode.code}${data.whatsapp}`;
      dataToSave.whatsapp = fullWhatsapp;
      try {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(dataToSave));
        localStorage.setItem(STORAGE_KEY_STEP, (step + 1).toString());
        console.log('Saved signup data and step to localStorage', dataToSave, step + 1);
      } catch (error) {
        console.error('Failed to save signup form data to localStorage:', error);
      }
      setStep((s) => s + 1);
    }
  };
  const handlePrev = (e: React.FormEvent) => {
    e.preventDefault();
    setStep((s) => s - 1);
  };
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateStep();
    if (isValid) {
      setLoading(true);
      setErrors({});
      try {
        const userData = {
          email: data.email,
          password: data.password,
          name: data.nom,
          phoneNumber: `${selectedCode.code}${data.whatsapp}`,
          referralCode: data.parrain || undefined,
          city: data.ville,
          region: data.region,
          country: data.pays,
          birthDate: data.naissance,
          sex: data.sexe,
          profession: data.profession ? removeAccents(data.profession) : undefined,
          language: data.langue,
          interests: data.interets.length > 0 ? data.interets.map(i => removeAccents(i)).join(',') : undefined,
        };
        console.log('Attempting registration with userData:', userData);

        const result = await register(userData);

        localStorage.removeItem(STORAGE_KEY_DATA);
        localStorage.removeItem(STORAGE_KEY_STEP);

        navigate('/otp', {
          state: {
            userId: result.userId,
            email: data.email,
            fromRegistration: true
          }
        });
      } catch (error) {
        setLoading(false);
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed.';
        if (error instanceof Error) { errorMessage = error.message; }
        else if (error instanceof ApiResponse && error.body?.message) { errorMessage = error.body.message; }
        setErrors({ general: errorMessage });
      }
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
                <input name="email" value={data.email} onChange={handleChange} placeholder="Ex: Jeanpierre@gmail.com" className={`w-full border ${errors.email || errors.emailExists ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.email && <div className="text-red-500 text-xs">{errors.email}</div>}
                {errors.emailExists && <div className="text-red-500 text-xs">{errors.emailExists}</div>}
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
                    name="countryCodeSelect"
                    value={selectedCode.value}
                    onChange={handleChange}
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
                    className={`flex-1 border ${errors.whatsapp || errors.whatsappExists ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}
                    style={{ minWidth: 0 }}
                  />
                </div>
                {errors.whatsapp && <div className="text-red-500 text-xs">{errors.whatsapp}</div>}
                {errors.whatsappExists && <div className="text-red-500 text-xs">{errors.whatsappExists}</div>}
              </div>
              {errors.general && <div className="text-red-500 text-xs text-center mt-2">{errors.general}</div>}
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
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                  <option value="other">Autre</option>
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
                <label className="block text-gray-700 mb-1">Centres d\'intérêt</label>
                <div className="flex flex-wrap gap-2">
                  {interetOptions.map(interest => (
                    <button
                      key={interest}
                      type="button"
                      className={`px-3 py-1 rounded-full border text-xs font-medium ${data.interets.includes(interest) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                      onClick={() => handleInterestClick(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                {errors.interets && <div className="text-red-500 text-xs">{errors.interets}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Code parrain</label>
                <input
                  name="parrain"
                  value={data.parrain}
                  onChange={handleChange}
                  placeholder="Code du parrain"
                  className={`w-full border ${errors.parrain ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none ${isAffiliationCodeDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={isAffiliationCodeDisabled}
                />
                {affiliateLoading && <div className="text-gray-500 text-xs mt-1">Vérification du code parrain...</div>}
                {affiliateName && !affiliateLoading && <div className="text-green-600 text-sm mt-1">Parrain: {affiliateName}</div>}
                {errors.parrain && <div className="text-red-500 text-xs">{errors.parrain}</div>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="cgu" checked={data.cgu} onChange={handleChange} className="accent-[#115CF6]" />
                <span>J'accepte les <button type="button" onClick={() => setShowModal(true)} className="text-[#115CF6] underline bg-transparent">conditions d'utilisation</button></span>
              </div>
              {errors.general && <div className="text-red-500 text-xs text-center mt-2">{errors.general}</div>}
            </>
          )}
          <div className="flex justify-between mt-6 gap-2">
            {step > 0 && (
              <button onClick={handlePrev} className="bg-gray-200 text-gray-700 font-bold rounded-xl px-6 py-2">Précédent</button>
            )}
            {step < 2 && (
              <button
                onClick={handleNext}
                disabled={checkingExistence || loading || !data.email || !data.whatsapp}
                className="bg-[#115CF6] text-white font-bold rounded-xl px-6 py-2 ml-auto disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {checkingExistence ? 'Vérification...' : 'Suivant'}
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleRegister}
                disabled={loading || !data.cgu}
                className="bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-2 ml-auto"
              >
                {loading ? 'Inscription...' : "S'inscrire"}
              </button>
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