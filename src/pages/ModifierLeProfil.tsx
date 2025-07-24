import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiEdit2, FiPhone, FiSave, FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';

export const countryOptions = [
  { value: 'Cameroun', label: '🇨🇲 Cameroun', code: 'CM' },
  { value: 'Bénin', label: '🇧🇯 Bénin', code: 'BJ' },
  { value: 'Congo-Brazzaville', label: '🇨🇬 Congo-Brazzaville', code: 'CG' },
  { value: 'Congo-Kinshasa', label: '🇨🇩 Congo-Kinshasa', code: 'CD' },
  { value: 'Ghana', label: '🇬🇭 Ghana', code: 'GH' },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire', code: 'CI' },
  { value: 'Sénégal', label: '🇸🇳 Sénégal', code: 'SN' },
  { value: 'Togo', label: '🇹🇬 Togo', code: 'TG' },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso', code: 'BF' },
  { value: 'Mali', label: '🇲🇱 Mali', code: 'ML' },
  { value: 'Niger', label: '🇳🇪 Niger', code: 'NE' },
  { value: 'Guinée', label: '🇬🇳 Guinée', code: 'GN' },
  { value: 'Gabon', label: '🇬🇦 Gabon', code: 'GA' },
  { value: 'Kenya', label: '🇰🇪 Kenya', code: 'KE' },
];
export const professionOptions = [
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
export const baseInterestOptions = [
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
export const predefinedInterestOptions = [
  '⚽ Football', '🏀 Basketball', '🏃 Course à pied', '🏊 Natation', '🧘 Yoga', '🥾 Randonnée', '🚴 Cyclisme',
  '🎵 Musique (instruments, chant)', '💃 Danse', '🎨 Peinture et dessin', '📸 Photographie', '🎭 Théâtre', '🎬 Cinéma',
  '💻 Programmation', '🤖 Robotique', '🔬 Sciences de la vie', '🌌 Astronomie', '⚡ Électronique',
  '🌍 Découverte de nouvelles cultures', '🌿 Randonnées en nature', '✈️ Tourisme local et international',
  '🍽️ Cuisine du monde', '🧁 Pâtisserie', '🍷 Dégustation de vins', '🤝 Aide aux personnes défavorisées',
  '🌱 Protection de l\'environnement', '❤️ Participation à des événements caritatifs', '📚 Lecture', '🧘‍♀️ Méditation',
  '🗣️ Apprentissage de nouvelles langues', '🎮 Jeux vidéo', '🎲 Jeux de société', '🧩 Énigmes et casse-têtes',
  '👗 Stylisme', '🏠 Décoration d\'intérieur', '🎨 Artisanat', '💪 Fitness', '🥗 Nutrition', '🌿 Médecine alternative',
];

// Helper function to get display value with emoji
export const getInterestDisplayValue = (baseValue: string): string => {
  const index = baseInterestOptions.indexOf(baseValue);
  return index !== -1 ? predefinedInterestOptions[index] : baseValue;
};

// Helper function to get base value without emoji
export const getInterestBaseValue = (displayValue: string): string => {
  const index = predefinedInterestOptions.indexOf(displayValue);
  return index !== -1 ? baseInterestOptions[index] : displayValue.replace(/^[^\w\s]+\s*/, ''); // Remove emoji prefix
};

// New: countryCodes array from Signup.tsx
const countryCodes = [
  { value: 'Cameroun', label: '🇨🇲 +237', code: '237' },
  { value: 'Bénin', label: '🇧🇯 +229', code: '229' },
  { value: 'Congo-Brazzaville', label: '🇨🇬 +242', code: '242' },
  { value: 'Congo-Kinshasa', label: '🇨🇩 +243', code: '243' },
  { value: 'Ghana', label: '🇬🇭 +233', code: '233' },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 +225', code: '225' },
  { value: 'Sénégal', label: '🇸🇳 +221', code: '221' },
  { value: 'Togo', label: '🇹🇬 +228', code: '228' },
  { value: 'Burkina Faso', label: '🇧🇫 +226', code: '226' },
  { value: 'Mali', label: '🇲🇱 +223', code: '223' },
  { value: 'Niger', label: '🇳🇪 +227', code: '227' },
  { value: 'Guinée', label: '🇬🇳 +224', code: '224' },
  { value: 'Gabon', label: '🇬🇦 +241', code: '241' },
  { value: 'Kenya', label: '🇰🇪 +254', code: '254' },
];

// New: Define interfaces for the correspondents object structure
interface CorrespondentData {
  operators: string[];
  currencies: string[];
}

interface CorrespondentsMap {
  [key: string]: CorrespondentData;
}

// New: correspondents data with type assertion
export const correspondents: CorrespondentsMap = {
  'BJ': {
    'operators': ['MTN_MOMO_BEN', 'MOOV_BEN'], // Benin
    'currencies': ['XOF']
  },
  'CM': {
    'operators': ['MTN_MOMO_CMR', 'ORANGE_CMR'], // Cameroon
    'currencies': ['XAF']
  },
  'BF': {
    'operators': ['MOOV_BFA', 'ORANGE_BFA'], // Burkina Faso
    'currencies': ['XOF']
  },
  'CD': {
    'operators': ['VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD'], // DRC
    'currencies': ['CDF']
  },
  'KE': {
    'operators': ['MPESA_KEN'], // Kenya
    'currencies': ['KES']
  },
  'NG': {
    'operators': ['MTN_MOMO_NGA', 'AIRTEL_NGA'], // Nigeria
    'currencies': ['NGN']
  },
  'SN': {
    'operators': ['FREE_SEN', 'ORANGE_SEN'], // Senegal
    'currencies': ['XOF']
  },
  'CG': {
    'operators': ['AIRTEL_COG', 'MTN_MOMO_COG'], // Republic of the Congo
    'currencies': ['XAF']
  },
  'GA': {
    'operators': ['AIRTEL_GAB'], // Gabon
    'currencies': ['XAF']
  },
  'CI': {
    'operators': ['MTN_MOMO_CIV', 'ORANGE_CIV'], // Côte d'Ivoire
    'currencies': ['XOF']
  },
  'ML': {
    'operators': ['ORANGE_MLI', 'MOOV_MLI'], // Mali
    'currencies': ['XOF']
  },
  'NE': {
    'operators': ['ORANGE_NER', 'MOOV_NER'], // Niger
    'currencies': ['XOF']
  },
  'GH': {
    'operators': ['MTN_MOMO_GHA', 'VODAFONE_GHA'], // Ghana
    'currencies': ['GHS']
  },
  'TG': {
    'operators': ['TOGOCOM_TG', 'MOOV_TG'], // Togo
    'currencies': ['XOF']
  },
};

// New: Helper function to map operator values to display labels
const getMomoOperatorDisplayName = (operatorValue: string) => {
  switch (operatorValue) {
    case 'MTN_MOMO_BEN': return 'MTN MoMo Bénin';
    case 'MOOV_BEN': return 'Moov Bénin';
    case 'MTN_MOMO_CMR': return 'MTN MoMo Cameroun';
    case 'ORANGE_CMR': return 'Orange Money Cameroun';
    case 'MOOV_BFA': return 'Moov Burkina Faso';
    case 'ORANGE_BFA': return 'Orange Burkina Faso';
    case 'VODACOM_MPESA_COD': return 'Vodacom M-Pesa RDC';
    case 'AIRTEL_COD': return 'Airtel RDC';
    case 'ORANGE_COD': return 'Orange RDC';
    case 'MPESA_KEN': return 'M-Pesa Kenya';
    case 'MTN_MOMO_NGA': return 'MTN MoMo Nigeria';
    case 'AIRTEL_NGA': return 'Airtel Nigeria';
    case 'FREE_SEN': return 'Free Money Sénégal';
    case 'ORANGE_SEN': return 'Orange Money Sénégal';
    case 'AIRTEL_COG': return 'Airtel Congo';
    case 'MTN_MOMO_COG': return 'MTN MoMo Congo';
    case 'AIRTEL_GAB': return 'Airtel Gabon';
    case 'MTN_MOMO_CIV': return 'MTN MoMo Côte d\'Ivoire';
    case 'ORANGE_CIV': return 'Orange Money Côte d\'Ivoire';
    case 'ORANGE_MLI': return 'Orange Money Mali';
    case 'MOOV_MLI': return 'Moov Mali';
    case 'ORANGE_NER': return 'Orange Money Niger';
    case 'MOOV_NER': return 'Moov Niger';
    case 'MTN_MOMO_GHA': return 'MTN MoMo Ghana';
    case 'VODAFONE_GHA': return 'Vodafone Ghana';
    case 'TOGOCOM_TG': return 'Togocom';
    case 'MOOV_TG': return 'Moov Togo';
    default: return operatorValue.replace(/_/g, ' '); // Fallback for new operators
  }
};

function ModifierLeProfil() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '', // This will now store the local part of the phone number
    city: '',
    country: '',
    profession: '',
    interests: [] as string[],
    avatar: 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360',
    birthDate: '',
    sex: '',
    momoNumber: '',
    momoOperator: '',
    referralCode: '',
    notificationPreference: 'email' as 'email' | 'whatsapp',
  });
  // New state for the selected phone country code
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState(countryCodes[0]);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [displayedInterests, setDisplayedInterests] = useState<string[]>(predefinedInterestOptions);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData((prev) => {
        const countryName = countryOptions.find((c: { value: string; code: string; }) => c.code === user.country)?.value || user.country || '';
        const birthDate = user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '';
        const initialMomoOperator = user.momoOperator || '';

        // Determine the country code from the country name
        const currentCountryCode = countryOptions.find((c: { value: string; }) => c.value === countryName)?.code;
        const validOperatorsForCurrentCountry = currentCountryCode && correspondents[currentCountryCode]
          ? correspondents[currentCountryCode].operators
          : [];

        // Only set momoOperator if it's valid for the current country
        const momoOperatorToSet = validOperatorsForCurrentCountry.includes(initialMomoOperator)
          ? initialMomoOperator
          : ''; // Clear if invalid or country has no operators

        // New: Parse existing phone number to set selectedPhoneCountryCode and local phoneNumber
        let localPhoneNumber = user.phoneNumber || '';
        let matchedCode = countryCodes[0]; // Default to the first code if no match
        for (const c of countryCodes) {
          if (user.phoneNumber && user.phoneNumber.startsWith(c.code)) {
            matchedCode = c;
            localPhoneNumber = user.phoneNumber.substring(c.code.length);
            break;
          }
        }
        setSelectedPhoneCountryCode(matchedCode); // Update the separate state for country code

        return {
          ...prev, // Keep other previous state values
          name: user.name || '',
          phoneNumber: localPhoneNumber, // Set the local part of the phone number
          city: user.city || user.region || '',
          country: countryName,
          profession: user.profession || '',
          interests: user.interests || [],
          avatar: user.avatar ? user.avatar : user.avatarId ? sbcApiService.generateSettingsFileUrl(user.avatarId) : 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360',
          birthDate: birthDate,
          sex: user.sex || '',
          momoNumber: user.momoNumber || '',
          momoOperator: momoOperatorToSet,
          referralCode: user.referralCode || '',
          notificationPreference: user.notificationPreference || 'email',
        };
      });

      if (user.interests) {
        const allInterests = Array.from(new Set([...predefinedInterestOptions, ...user.interests]));
        setDisplayedInterests(allInterests);
      }
    }
  }, [user]); // Depend on user

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'countryCodeSelect') { // Handle country code select for phone number
      const code = countryCodes.find(c => c.value === value);
      if (code) {
        setSelectedPhoneCountryCode(code);
      }
      return; // Don't update formData directly for this select
    }

    setFormData((prev) => {
      if (name === 'country') {
        // Reset momoOperator when country changes to force re-selection of a valid operator
        return { ...prev, [name]: value, momoOperator: '' };
      }
      return { ...prev, [name]: value };
    });
    if (feedback) setFeedback(null);
  };

  const handleInterestClick = (displayInterest: string) => {
    // Convert display value (with emoji) to base value (without emoji) for storage
    const baseInterest = getInterestBaseValue(displayInterest);
    
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(baseInterest)
        ? prev.interests.filter(i => i !== baseInterest)
        : [...prev.interests, baseInterest]
    }));
    if (feedback) setFeedback(null);
  };

  const handleAvatarButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5 MB in bytes
        setModalContent({ type: 'error', message: `L'image "${file.name}" dépasse la taille maximale autorisée de 5 Mo et ne sera pas ajoutée.` });
        setShowModal(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear the input field
        }
        return;
      }

      setAvatarUploading(true);
      setFeedback(null);
      try {
        const response = await sbcApiService.uploadAvatar(file);
        const result = handleApiResponse(response);
        if (result.fileId) {
          const newAvatarUrl = sbcApiService.generateSettingsFileUrl(result.fileId);
          setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
          setFeedback({ type: 'success', message: 'Avatar mis à jour avec succès!' });
          await refreshUser(); // Refresh user context
        }
      } catch (error) {
        console.error('Avatar upload failed', error);
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'envoi de l'avatar.";
        setFeedback({ type: 'error', message: errorMessage });
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const countryCode = countryOptions.find(c => c.value === formData.country)?.code || formData.country;
      const fullPhoneNumber = `${selectedPhoneCountryCode.code}${formData.phoneNumber}`; // Reconstruct full phone number
      const updates = {
        name: formData.name,
        phoneNumber: fullPhoneNumber, // Use the reconstructed full phone number
        city: formData.city,
        country: countryCode,
        profession: formData.profession ? removeAccents(formData.profession) : '',
        interests: formData.interests.map(i => removeAccents(i)),
        birthDate: formData.birthDate,
        sex: formData.sex,
        momoNumber: formData.momoNumber,
        momoOperator: formData.momoOperator,
        referralCode: formData.referralCode,
        notificationPreference: formData.notificationPreference,
      };
      await sbcApiService.updateUserProfile(updates);
      await refreshUser(); // Refresh user in context
      setFeedback({ type: 'success', message: 'Profil sauvegardé avec succès!' });
    } catch (error) {
      console.error('Profile update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'La sauvegarde a échoué.';
      setFeedback({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // New: Dynamically compute available MoMo operators based on selected country
  const availableMomoOperators = useMemo(() => {
    const selectedCountryCode = countryOptions.find((c: { value: string; code: string; }) => c.value === formData.country)?.code;
    if (selectedCountryCode && correspondents[selectedCountryCode]) {
      return [
        { value: '', label: 'Sélectionner un opérateur MoMo' }, // Default option
        ...correspondents[selectedCountryCode].operators.map(opValue => ({
          value: opValue,
          label: getMomoOperatorDisplayName(opValue)
        }))
      ];
    }
    // If no country selected or no operators for the country, provide only a default option
    return [{ value: '', label: 'Sélectionner un opérateur MoMo' }];
  }, [formData.country, countryOptions]); // Re-run when country or country options change

  if (authLoading || !user) {
    return <div>Chargement du profil...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-center bg-[#f8fafc] p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center mb-4">
            <BackButton />
            <h3 className="text-xl font-medium text-center w-full">Modifier le Profil</h3>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-md bg-white rounded-3xl p-8"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-2">
              <img src={formData.avatar} alt="avatar" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow" />
              <button
                type="button"
                onClick={handleAvatarButtonClick}
                className="absolute bottom-2 right-2 bg-[#115CF6] p-2 rounded-full border-2 border-white shadow text-white hover:bg-blue-800 transition-colors disabled:bg-gray-400"
                disabled={avatarUploading}
              >
                {avatarUploading ? <FiLoader className="animate-spin" /> : <FiEdit2 size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>
          <form className="flex flex-col gap-4" onSubmit={handleSave}>
            <div>
              <label className="block text-gray-700 mb-1">👤 Nom complet</label>
              <input name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">📞 Téléphone</label>
              <div className="relative flex gap-2"> {/* Added flex and gap */}
                <select
                  className="border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
                  name="countryCodeSelect" // Unique name for this select
                  value={selectedPhoneCountryCode.value}
                  onChange={handleChange}
                >
                  {countryCodes.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  name="phoneNumber" // Name remains phoneNumber for the local part
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none pr-10"
                  placeholder="Ex: 675080477" // Example placeholder
                />
                <FiPhone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">🔗 Code de parrainage</label>
              <input
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">🎂 Date de naissance</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">⚧️ Sexe</label>
              <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white">
                <option value="">Sélectionner</option>
                <option value="male">👨 Homme</option>
                <option value="female">👩 Femme</option>
                <option value="other">🧑 Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">🏙️ Ville</label>
              <input name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">🌍 Pays</label>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white">
                <option value="">Sélectionner le pays</option>
                {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">💼 Profession</label>
              <select name="profession" value={formData.profession} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white">
                <option value="">Sélectionner la profession</option>
                {professionOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">💳 Numéro MoMo</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-500 font-medium z-10">
                  {countryCodes.find(c => c.value === formData.country)?.code || '+237'}
                </span>
                <input 
                  name="momoNumber" 
                  value={formData.momoNumber} 
                  onChange={handleChange} 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 pl-16 focus:outline-none" 
                  placeholder="675080477" 
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                💡 Le code pays est automatiquement ajouté selon votre pays sélectionné
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">📱 Opérateur MoMo</label>
              <select name="momoOperator" value={formData.momoOperator} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white">
                {availableMomoOperators.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">❤️ Centres d'intérêt</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-xl">
                {displayedInterests.map((displayInterest) => {
                  const baseInterest = getInterestBaseValue(displayInterest);
                  const isSelected = formData.interests.includes(baseInterest);
                  return (
                    <button
                      key={displayInterest}
                      type="button"
                      onClick={() => handleInterestClick(displayInterest)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium ${isSelected ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      {displayInterest}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* NEW: Notification Preference Section */}
            <div>
              <label className="block text-gray-700 mb-1">📬 Préférences de notification</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationPreference"
                    value="email"
                    checked={formData.notificationPreference === 'email'}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📧</span>
                    <div>
                      <div className="font-medium text-gray-700">Email</div>
                      <div className="text-sm text-gray-500">Recevoir les codes OTP par email</div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="notificationPreference"
                    value="whatsapp"
                    checked={formData.notificationPreference === 'whatsapp'}
                    onChange={handleChange}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📱</span>
                    <div>
                      <div className="font-medium text-gray-700">WhatsApp</div>
                      <div className="text-sm text-gray-500">Recevoir les codes OTP via WhatsApp</div>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                💡 Vous pouvez modifier cette préférence pour des demandes individuelles
              </div>
            </div>
            {feedback && (
              <div className={`p-3 rounded-lg text-center text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {feedback.message}
              </div>
            )}
            <footer className="px-4 py-4 mt-6">
              <button
                onClick={handleSave}
                disabled={loading || avatarUploading}
                className="w-full bg-[#115CF6] hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-lg shadow flex items-center justify-center gap-2 disabled:bg-blue-400"
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiSave />}
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </footer>
          </form>

          {showModal && modalContent && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2 }}
              >
                <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {modalContent.type === 'success' ? 'Succès' : 'Erreur'}
                </h4>
                <p className="text-sm text-gray-700 text-center mb-4">
                  {modalContent.message}
                </p>
                <button
                  type="button"
                  className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold shadow hover:bg-blue-600 transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

export default ModifierLeProfil;