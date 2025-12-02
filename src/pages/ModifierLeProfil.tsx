import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiEdit2, FiPhone, FiSave, FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { 
  countryOptions, 
  africanCountryCodes, 
  momoCorrespondents, 
  getMomoOperatorDisplayName,
  countrySupportsMomo 
} from '../utils/countriesData';

// Supported crypto currencies for withdrawal
export const supportedCryptoCurrencies = [
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'LTC', name: 'Litecoin' },
  { code: 'XRP', name: 'Ripple' },
  { code: 'TRX', name: 'TRON' },
  { code: 'USDTSOL', name: 'USDT (Solana)' },
  { code: 'USDTBSC', name: 'USDT (BSC-BEP20)' },
  { code: 'BNBBSC', name: 'BNB (BSC-BEP20)' },
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


// New: Define interfaces for the correspondents object structure



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
    cryptoWalletAddress: '',
    cryptoWalletCurrency: '',
    referralCode: '',
    notificationPreference: 'email' as 'email' | 'whatsapp',
  });
  // New state for the selected phone country code
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState(africanCountryCodes[0]);
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
        const validOperatorsForCurrentCountry = currentCountryCode && momoCorrespondents[currentCountryCode]
          ? momoCorrespondents[currentCountryCode].operators
          : [];

        // Only set momoOperator if it's valid for the current country
        const momoOperatorToSet = validOperatorsForCurrentCountry.includes(initialMomoOperator)
          ? initialMomoOperator
          : ''; // Clear if invalid or country has no operators

        // New: Parse existing phone number to set selectedPhoneCountryCode and local phoneNumber
        let localPhoneNumber = user.phoneNumber || '';
        let matchedCode = africanCountryCodes[0]; // Default to the first code if no match

        if (user.phoneNumber) {
          // Normalize phone number - remove spaces, dashes, and handle + prefix
          let normalizedPhone = user.phoneNumber.replace(/[\s\-()]/g, '');

          // Sort country codes by length (longest first) to match correctly (e.g., +233 before +23)
          const sortedCodes = [...africanCountryCodes].sort((a, b) => b.code.length - a.code.length);

          for (const c of sortedCodes) {
            const codeWithPlus = c.code; // e.g., "+237"
            const codeWithoutPlus = c.code.replace('+', ''); // e.g., "237"

            // Check if phone starts with +237 or 237
            if (normalizedPhone.startsWith(codeWithPlus)) {
              matchedCode = c;
              localPhoneNumber = normalizedPhone.substring(codeWithPlus.length);
              break;
            } else if (normalizedPhone.startsWith(codeWithoutPlus)) {
              matchedCode = c;
              localPhoneNumber = normalizedPhone.substring(codeWithoutPlus.length);
              break;
            }
          }
        }
        setSelectedPhoneCountryCode(matchedCode); // Update the separate state for country code

        // Parse MoMo number to strip country code (based on selected country)
        let localMomoNumber = user.momoNumber || '';
        if (user.momoNumber) {
          // Get the phone code for the user's country
          const userCountryData = countryOptions.find((c: { value: string; code: string; }) => c.code === user.country || c.value === countryName);
          const countryPhoneCode = userCountryData?.phoneCode || '';

          if (countryPhoneCode) {
            let normalizedMomo = user.momoNumber.replace(/[\s\-()]/g, '');
            const codeWithPlus = countryPhoneCode; // e.g., "+237"
            const codeWithoutPlus = countryPhoneCode.replace('+', ''); // e.g., "237"

            // Strip country code from MoMo number
            if (normalizedMomo.startsWith(codeWithPlus)) {
              localMomoNumber = normalizedMomo.substring(codeWithPlus.length);
            } else if (normalizedMomo.startsWith(codeWithoutPlus)) {
              localMomoNumber = normalizedMomo.substring(codeWithoutPlus.length);
            }
          }
        }

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
          momoNumber: localMomoNumber, // Set the local part of the MoMo number (without country code)
          momoOperator: momoOperatorToSet,
          cryptoWalletAddress: user.cryptoWalletAddress || '',
          cryptoWalletCurrency: user.cryptoWalletCurrency || '',
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
      const code = africanCountryCodes.find(c => c.value === value);
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
      const fullPhoneNumber = `${selectedPhoneCountryCode.code.replace('+', '')}${formData.phoneNumber}`; // Reconstruct full phone number

      // Reconstruct full MoMo number with country code
      const countryPhoneCode = countryOptions.find(c => c.value === formData.country)?.phoneCode || '';
      const fullMomoNumber = formData.momoNumber
        ? `${countryPhoneCode.replace('+', '')}${formData.momoNumber}`
        : '';

      const updates = {
        name: formData.name,
        phoneNumber: fullPhoneNumber, // Use the reconstructed full phone number
        city: formData.city,
        country: countryCode,
        profession: formData.profession ? removeAccents(formData.profession) : '',
        interests: formData.interests.map(i => removeAccents(i)),
        birthDate: formData.birthDate,
        sex: formData.sex,
        momoNumber: fullMomoNumber, // Use the reconstructed full MoMo number with country code
        momoOperator: formData.momoOperator,
        referralCode: formData.referralCode,
        notificationPreference: formData.notificationPreference,
      };
      
      // Update regular profile
      await sbcApiService.updateUserProfile(updates);
      
      // Update crypto wallet separately if provided
      if (formData.cryptoWalletAddress && formData.cryptoWalletCurrency) {
        try {
          await sbcApiService.updateCryptoWallet({
            cryptoWalletAddress: formData.cryptoWalletAddress,
            cryptoWalletCurrency: formData.cryptoWalletCurrency
          });
        } catch (cryptoError) {
          // Don't fail the entire update if crypto wallet update fails
        }
      }
      
      await refreshUser(); // Refresh user in context
      setFeedback({ type: 'success', message: 'Profil sauvegardé avec succès!' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'La sauvegarde a échoué.';
      setFeedback({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // New: Dynamically compute available MoMo operators based on selected country
  const availableMomoOperators = useMemo(() => {
    const selectedCountryCode = countryOptions.find((c: { value: string; code: string; }) => c.value === formData.country)?.code;
    if (selectedCountryCode && momoCorrespondents[selectedCountryCode]) {
      return [
        { value: '', label: 'Sélectionner un opérateur MoMo' }, // Default option
        ...momoCorrespondents[selectedCountryCode].operators.map(opValue => ({
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
                  {africanCountryCodes.map((c) => (
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
            {/* Mobile Money Section with Country Restrictions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                💳 Mobile Money
                {formData.country && !countrySupportsMomo(countryOptions.find(c => c.value === formData.country)?.code || '') && (
                  <span className="text-xs font-normal text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    Non disponible
                  </span>
                )}
              </h3>
              
              {formData.country && countrySupportsMomo(countryOptions.find(c => c.value === formData.country)?.code || '') ? (
                // Show MoMo fields for supported countries
                <div className="space-y-4">
                  <div className="text-sm text-yellow-700 mb-4">
                    💡 Mobile Money disponible pour votre pays : {formData.country}
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-1">💳 Numéro MoMo</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-gray-500 font-medium z-10">
                        {countryOptions.find(c => c.value === formData.country)?.phoneCode || '+237'}
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
                </div>
              ) : (
                // Show message for unsupported countries
                <div className="text-center py-6">
                  <div className="text-6xl mb-4">🚫</div>
                  <div className="text-lg font-medium text-gray-800 mb-2">
                    Mobile Money non disponible
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {formData.country ? (
                      `Mobile Money n'est pas encore pris en charge pour ${formData.country}.`
                    ) : (
                      'Sélectionnez d\'abord votre pays pour voir les options disponibles.'
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800 font-medium mb-1">✅ Alternative disponible :</div>
                    <div className="text-sm text-blue-700">
                      Vous pouvez toujours utiliser les <strong>retraits crypto</strong> pour convertir votre solde USD en cryptomonnaies.
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Crypto Wallet Section - Available for ALL countries */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                🪙 Portefeuille Crypto
                <span className="text-xs font-normal text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  ✅ Disponible partout
                </span>
              </h3>
              <div className="text-sm text-purple-700 mb-4">
                💡 Les retraits crypto sont disponibles pour <strong>tous les pays africains</strong>. Configurez votre portefeuille pour effectuer des retraits en USD.
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1">🪙 Cryptomonnaie préférée</label>
                  <select 
                    name="cryptoWalletCurrency" 
                    value={formData.cryptoWalletCurrency} 
                    onChange={handleChange} 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none bg-white"
                  >
                    <option value="">Sélectionner une cryptomonnaie</option>
                    {supportedCryptoCurrencies.map((crypto) => (
                      <option key={crypto.code} value={crypto.code}>
                        {crypto.name} ({crypto.code})
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    🔹 Choisissez la cryptomonnaie dans laquelle vous souhaitez recevoir vos retraits USD
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-1">📋 Adresse du portefeuille</label>
                  <input 
                    name="cryptoWalletAddress" 
                    value={formData.cryptoWalletAddress} 
                    onChange={handleChange} 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none font-mono text-sm" 
                    placeholder={formData.cryptoWalletCurrency ? `Adresse ${formData.cryptoWalletCurrency}` : "Sélectionnez d'abord une cryptomonnaie"}
                    disabled={!formData.cryptoWalletCurrency}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    ⚠️ Vérifiez bien votre adresse. Les transactions crypto sont irréversibles.
                  </div>
                </div>
                
                {formData.cryptoWalletAddress && formData.cryptoWalletCurrency && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-800 font-medium mb-1">✅ Configuration actuelle:</div>
                    <div className="text-xs text-green-700">
                      <div><strong>Crypto:</strong> {supportedCryptoCurrencies.find(c => c.code === formData.cryptoWalletCurrency)?.name}</div>
                      <div><strong>Adresse:</strong> {formData.cryptoWalletAddress.substring(0, 10)}...{formData.cryptoWalletAddress.substring(formData.cryptoWalletAddress.length - 6)}</div>
                    </div>
                  </div>
                )}
              </div>
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