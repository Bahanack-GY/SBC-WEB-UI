import { useState, useEffect, useCallback } from 'react';
import { FiUser, FiMapPin, FiHeart, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAffiliation } from '../contexts/AffiliationContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse, removeAccents } from '../utils/apiHelpers';
import { ApiResponse } from '../services/ApiResponse';
import { useQuery } from '@tanstack/react-query';
import { clearSignupCache } from '../utils/signupHelpers';
import { safeRecoveryApiCall, debounce } from '../utils/recoveryHelpers';
import RecoveryCompletedNotification from '../components/RecoveryCompletedNotification';
import { countryOptions, africanCountryCodes } from '../utils/countriesData';

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
  notificationPreference: 'email' | 'whatsapp';
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

interface SettingsData {
  termsAndConditionsPdf?: {
    fileId: string;
    fileName: string;
    mimeType: string;
  };
  [key: string]: unknown;
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
  notificationPreference: 'email',
};

const icons = [<FiUser size={48} className="text-[#115CF6] mx-auto" />, <FiMapPin size={48} className="text-[#115CF6] mx-auto" />, <FiHeart size={48} className="text-[#115CF6] mx-auto" />];


// Regions and cities data per country
const regionsPerCountry: Record<string, string[]> = {
  CM: ['Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral', 'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'],
  SN: ['Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack', 'Kédougou', 'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 'Thiès', 'Ziguinchor'],
  CI: ['Abidjan', 'Bas-Sassandra', 'Comoé', 'Denguélé', 'Gôh-Djiboua', 'Lacs', 'Lagunes', 'Montagnes', 'Sassandra-Marahoué', 'Savanes', 'Vallée du Bandama', 'Woroba', 'Yamoussoukro', 'Zanzan'],
  GA: ['Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngounié', 'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'],
  CG: ['Bouenza', 'Brazzaville', 'Cuvette', 'Cuvette-Ouest', 'Kouilou', 'Lékoumou', 'Likouala', 'Niari', 'Plateaux', 'Pointe-Noire', 'Pool', 'Sangha'],
  CD: ['Bas-Uele', 'Équateur', 'Haut-Katanga', 'Haut-Lomami', 'Haut-Uele', 'Ituri', 'Kasaï', 'Kasaï-Central', 'Kasaï-Oriental', 'Kinshasa', 'Kongo-Central', 'Kwango', 'Kwilu', 'Lomami', 'Lualaba', 'Mai-Ndombe', 'Maniema', 'Mongala', 'Nord-Kivu', 'Nord-Ubangi', 'Sankuru', 'Sud-Kivu', 'Sud-Ubangi', 'Tanganyika', 'Tshopo', 'Tshuapa'],
  BJ: ['Alibori', 'Atacora', 'Atlantique', 'Borgou', 'Collines', 'Couffo', 'Donga', 'Littoral', 'Mono', 'Ouémé', 'Plateau', 'Zou'],
  TG: ['Centrale', 'Kara', 'Maritime', 'Plateaux', 'Savanes'],
  BF: ['Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Est', 'Centre-Nord', 'Centre-Ouest', 'Centre-Sud', 'Est', 'Hauts-Bassins', 'Nord', 'Plateau-Central', 'Sahel', 'Sud-Ouest'],
  ML: ['Bamako', 'Gao', 'Kayes', 'Kidal', 'Koulikoro', 'Mopti', 'Ségou', 'Sikasso', 'Tombouctou'],
  GN: ['Boké', 'Conakry', 'Faranah', 'Kankan', 'Kindia', 'Labé', 'Mamou', 'Nzérékoré'],
  NE: ['Agadez', 'Diffa', 'Dosso', 'Maradi', 'Niamey', 'Tahoua', 'Tillabéri', 'Zinder'],
  TD: ['Batha', 'Borkou', 'Chari-Baguirmi', 'Ennedi-Est', 'Ennedi-Ouest', 'Guéra', 'Hadjer-Lamis', 'Kanem', 'Lac', 'Logone Occidental', 'Logone Oriental', 'Mandoul', 'Mayo-Kebbi Est', 'Mayo-Kebbi Ouest', 'Moyen-Chari', 'N\'Djamena', 'Ouaddaï', 'Salamat', 'Sila', 'Tandjilé', 'Tibesti', 'Wadi Fira'],
  CF: ['Bamingui-Bangoran', 'Bangui', 'Basse-Kotto', 'Haute-Kotto', 'Haut-Mbomou', 'Kémo', 'Lobaye', 'Mambéré-Kadéï', 'Mbomou', 'Nana-Grébizi', 'Nana-Mambéré', 'Ombella-M\'Poko', 'Ouaka', 'Ouham', 'Ouham-Pendé', 'Sangha-Mbaéré', 'Vakaga'],
  GQ: ['Annobón', 'Bioko Norte', 'Bioko Sur', 'Centro Sur', 'Djibloho', 'Kié-Ntem', 'Litoral', 'Wele-Nzas'],
  RW: ['Est', 'Kigali', 'Nord', 'Ouest', 'Sud'],
  BI: ['Bubanza', 'Bujumbura Mairie', 'Bujumbura Rural', 'Bururi', 'Cankuzo', 'Cibitoke', 'Gitega', 'Karuzi', 'Kayanza', 'Kirundo', 'Makamba', 'Muramvya', 'Muyinga', 'Mwaro', 'Ngozi', 'Rumonge', 'Rutana', 'Ruyigi'],
  MG: ['Antananarivo', 'Antsiranana', 'Fianarantsoa', 'Mahajanga', 'Toamasina', 'Toliara'],
  MU: ['Black River', 'Flacq', 'Grand Port', 'Moka', 'Pamplemousses', 'Plaines Wilhems', 'Port Louis', 'Rivière du Rempart', 'Savanne'],
  SC: ['Anse aux Pins', 'Anse Boileau', 'Anse Etoile', 'Anse Royale', 'Baie Lazare', 'Baie Sainte Anne', 'Beau Vallon', 'Bel Air', 'Bel Ombre', 'Cascade', 'Glacis', 'Grand Anse Mahe', 'Grand Anse Praslin', 'La Digue', 'La Rivière Anglaise', 'Les Mamelles', 'Mont Buxton', 'Mont Fleuri', 'Plaisance', 'Pointe La Rue', 'Port Glaud', 'Roche Caïman', 'Saint Louis', 'Takamaka'],
  KM: ['Anjouan', 'Grande Comore', 'Mohéli'],
  DJ: ['Ali Sabieh', 'Arta', 'Dikhil', 'Djibouti', 'Obock', 'Tadjourah'],
};

const citiesPerCountry: Record<string, string[]> = {
  CM: ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Buea', 'Limbe', 'Kribi', 'Kumba', 'Nkongsamba', 'Edéa', 'Dschang', 'Foumban', 'Loum', 'Kumbo', 'Mbalmayo'],
  SN: ['Dakar', 'Pikine', 'Touba', 'Thiès', 'Rufisque', 'Kaolack', 'Saint-Louis', 'Mbour', 'Ziguinchor', 'Diourbel', 'Louga', 'Tambacounda', 'Richard-Toll', 'Kolda', 'Mbacké'],
  CI: ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Man', 'Divo', 'Gagnoa', 'Abengourou', 'Anyama', 'Agboville', 'Grand-Bassam', 'Dabou', 'Séguéla'],
  GA: ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda', 'Mouila', 'Lambaréné', 'Tchibanga', 'Koulamoutou', 'Makokou'],
  CG: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Impfondo', 'Ouésso', 'Madingou', 'Owando', 'Sibiti', 'Loutété'],
  CD: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani', 'Bukavu', 'Tshikapa', 'Kolwezi', 'Likasi', 'Goma', 'Kikwit', 'Uvira', 'Bunia', 'Kalemie', 'Matadi'],
  BJ: ['Cotonou', 'Porto-Novo', 'Parakou', 'Djougou', 'Bohicon', 'Kandi', 'Abomey', 'Natitingou', 'Lokossa', 'Ouidah'],
  TG: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé', 'Bassar', 'Tsévié', 'Aného', 'Mango', 'Dapaong'],
  BF: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Pouytenga', 'Kaya', 'Tenkodogo', 'Fada N\'Gourma', 'Dédougou'],
  ML: ['Bamako', 'Sikasso', 'Mopti', 'Koutiala', 'Kayes', 'Ségou', 'Gao', 'Kati', 'San', 'Kolokani'],
  GN: ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé', 'Guéckédou', 'Kissidougou', 'Mamou', 'Kamsar', 'Siguiri'],
  NE: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua', 'Dosso', 'Diffa', 'Arlit', 'Tessaoua', 'Gaya'],
  TD: ['N\'Djamena', 'Moundou', 'Abéché', 'Sarh', 'Kélo', 'Koumra', 'Pala', 'Am Timan', 'Bongor', 'Mongo'],
  CF: ['Bangui', 'Bimbo', 'Berbérati', 'Carnot', 'Bambari', 'Bouar', 'Bossangoa', 'Bria', 'Bangassou', 'Nola'],
  GQ: ['Malabo', 'Bata', 'Ebebiyín', 'Aconibe', 'Añisok', 'Luba', 'Evinayong', 'Mongomo', 'Micomeseng'],
  RW: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Cyangugu', 'Nyanza', 'Kibungo', 'Kibuye'],
  BI: ['Bujumbura', 'Gitega', 'Muyinga', 'Ngozi', 'Ruyigi', 'Bururi', 'Makamba', 'Kayanza', 'Muramvya', 'Cibitoke'],
  MG: ['Antananarivo', 'Toamasina', 'Antsirabe', 'Fianarantsoa', 'Mahajanga', 'Toliara', 'Antsiranana', 'Ambovombe', 'Ihosy', 'Morondava'],
  MU: ['Port Louis', 'Beau Bassin-Rose Hill', 'Vacoas-Phoenix', 'Curepipe', 'Quatre Bornes', 'Triolet', 'Goodlands', 'Centre de Flacq', 'Mahébourg', 'Saint Pierre'],
  SC: ['Victoria', 'Anse Boileau', 'Beau Vallon', 'Anse Royale', 'Cascade', 'Takamaka', 'Baie Lazare', 'Port Glaud', 'Grand Anse Mahe'],
  KM: ['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni', 'Tsimbeo', 'Sima', 'Ouani', 'Mirontsi', 'Mkazi'],
  DJ: ['Djibouti', 'Ali Sabieh', 'Tadjoura', 'Obock', 'Dikhil', 'Arta'],
};

const professionOptions = [
  'Étudiant·e', 'Sans emploi',
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
const baseInteretOptions = [
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
const interetOptions = [
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
  const index = interetOptions.indexOf(displayValue);
  return index !== -1 ? baseInteretOptions[index] : displayValue.replace(/^[^\w\s]+\s*/, ''); // Remove emoji prefix
};


const DEBOUNCE_DELAY = 3000;
const STORAGE_KEY_DATA = 'signupFormData';
const STORAGE_KEY_STEP = 'signupFormStep';

function Signup() {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<SignupData>(initialData);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(africanCountryCodes[0]);
  const [loading, setLoading] = useState(false);
  const [checkingExistence, setCheckingExistence] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [isAffiliationCodeDisabled, setIsAffiliationCodeDisabled] = useState(false);
  
  // Recovery-related state
  const [pendingRecovery, setPendingRecovery] = useState<any>(null);
  const [showRecoveryPreview, setShowRecoveryPreview] = useState(false);
  const [showRecoveryCompletedNotification, setShowRecoveryCompletedNotification] = useState(false);
  const [recoveryCompletedData, setRecoveryCompletedData] = useState<any>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<{
    email?: 'checking' | 'recoverable' | 'none';
    phone?: 'checking' | 'recoverable' | 'none';
  }>({});
  const [conflictStatus, setConflictStatus] = useState<{
    email?: string;
    phone?: string;
    conflictType?: string;
    message?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();
  const { affiliationCode } = useAffiliation();

  const { data: settingsData, isLoading: settingsLoading, error: settingsError } = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await sbcApiService.getAppSettings();
      return handleApiResponse(response);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const termsAndConditionsUrl = settingsData?.termsAndConditionsPdf?.fileId
    ? sbcApiService.generateSettingsFileUrl(settingsData.termsAndConditionsPdf.fileId)
    : undefined;

  const handleOpenTerms = () => {
    if (termsAndConditionsUrl) {
      window.open(termsAndConditionsUrl, '_blank');
    } else {
    }
  };

  useEffect(() => {
    try {
      // Pre-fill from URL parameters (from recovery redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      const phoneFromUrl = urlParams.get('phone');
      const countryFromUrl = urlParams.get('country');
      
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP);
      
      let dataToSet = { ...initialData };

      if (savedData) {
        const parsedData: SignupData = JSON.parse(savedData);
        dataToSet = { ...dataToSet, ...parsedData };
      }
      
      // URL parameters override saved data
      const passwordFromUrl = urlParams.get('password');
      if (emailFromUrl || phoneFromUrl || countryFromUrl || passwordFromUrl) {
        dataToSet = {
          ...dataToSet,
          email: emailFromUrl || dataToSet.email,
          pays: countryFromUrl || dataToSet.pays,
          password: passwordFromUrl || dataToSet.password,
          confirmPassword: passwordFromUrl || dataToSet.confirmPassword
        };
        
        if (phoneFromUrl) {
          // Extract country code from phone number - handle different formats
          
          // Normalize phone number by removing spaces, hyphens, and ensuring it starts with +
          let normalizedPhone = phoneFromUrl.replace(/[\s\-()]/g, '');
          if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
          }
          
          
          // Find matching country code
          const matchedCode = africanCountryCodes.find(c => normalizedPhone.startsWith(c.code));
          if (matchedCode) {
            setSelectedCode(matchedCode);
            // Remove the country code (including +) from the phone number
            const phoneWithoutCode = normalizedPhone.replace(matchedCode.code, '');
            dataToSet.whatsapp = phoneWithoutCode;
          } else {
            dataToSet.whatsapp = phoneFromUrl;
          }
        }
      }

      setData(dataToSet);
      
      // Handle phone number parsing for saved data (if not from URL)
      if (dataToSet.whatsapp && !phoneFromUrl) {
        
        // Normalize saved phone number
        let normalizedSavedPhone = dataToSet.whatsapp.replace(/[\s\-()]/g, '');
        if (!normalizedSavedPhone.startsWith('+')) {
          normalizedSavedPhone = '+' + normalizedSavedPhone;
        }
        
        const matchedCode = africanCountryCodes.find(c => normalizedSavedPhone.startsWith(c.code));
        if (matchedCode) {
          setSelectedCode(matchedCode);
          const phoneWithoutCode = normalizedSavedPhone.replace(matchedCode.code, '');
          setData(prev => ({ ...prev, whatsapp: phoneWithoutCode }));
        } else {
          setSelectedCode(africanCountryCodes[0]);
        }
      } else if (!phoneFromUrl) {
        // Set default country code if no phone number
        setSelectedCode(africanCountryCodes[0]);
      }

      if (savedStep) {
        setStep(parseInt(savedStep, 10));
      }
    } catch (error) {
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

  // Check for pending recoveries when email/phone changes
  const checkPendingRecoveries = useCallback(
    debounce(async (email: string, phoneNumber?: string) => {
      if (email || phoneNumber) {
        // Set checking status
        setRecoveryStatus(prev => ({
          ...prev,
          email: email ? 'checking' : prev.email,
          phone: phoneNumber ? 'checking' : prev.phone
        }));

        try {
          const fullPhoneNumber = phoneNumber ? `${selectedCode.code}${phoneNumber}` : undefined;

          const recoveryResponse = await safeRecoveryApiCall(
            () => sbcApiService.checkRecoveryRegistration(email, fullPhoneNumber)
          );


          if (recoveryResponse) {

            // First check if it's a 409 Conflict error
            const conflictError = sbcApiService.parseConflictError(recoveryResponse);

            if (conflictError) {

              // Handle conflict error - set conflict status for display below fields
              const newConflictStatus = {
                conflictType: conflictError.conflictType,
                message: conflictError.message,
                email: conflictError.conflictType === 'EMAIL_TAKEN' || conflictError.conflictType === 'BOTH_TAKEN' ? 'conflict' : undefined,
                phone: conflictError.conflictType === 'PHONE_TAKEN' || conflictError.conflictType === 'BOTH_TAKEN' ? 'conflict' : undefined
              };

              setConflictStatus(newConflictStatus);

              // Set none status for recovery
              setRecoveryStatus(prev => ({
                ...prev,
                email: email ? 'none' : prev.email,
                phone: phoneNumber ? 'none' : prev.phone
              }));
              setPendingRecovery(null);
              return;
            }

            // If no conflict error, proceed with normal recovery check
            const recoveryData = handleApiResponse(recoveryResponse);

            if (recoveryData && recoveryData.hasPendingRecoveries) {
              setPendingRecovery(recoveryData);
              // Clear any previous conflict status
              setConflictStatus({});
              // Set recoverable status
              setRecoveryStatus(prev => ({
                ...prev,
                email: email ? 'recoverable' : prev.email,
                phone: phoneNumber ? 'recoverable' : prev.phone
              }));
            } else {
              setPendingRecovery(null);
              // Clear any previous conflict status
              setConflictStatus({});
              // Set none status
              setRecoveryStatus(prev => ({
                ...prev,
                email: email ? 'none' : prev.email,
                phone: phoneNumber ? 'none' : prev.phone
              }));
            }
          } else {
            setPendingRecovery(null);
            // Clear any previous conflict status
            setConflictStatus({});
            // Set none status
            setRecoveryStatus(prev => ({
              ...prev,
              email: email ? 'none' : prev.email,
              phone: phoneNumber ? 'none' : prev.phone
            }));
          }
        } catch (error) {
          // Set none status on error
          setPendingRecovery(null);
          // Clear any previous conflict status
          setConflictStatus({});
          setRecoveryStatus(prev => ({
            ...prev,
            email: email ? 'none' : prev.email,
            phone: phoneNumber ? 'none' : prev.phone
          }));
        }
      } else {
        // Reset status when fields are empty
        setRecoveryStatus({});
        setPendingRecovery(null);
        // Clear any conflict status
        setConflictStatus({});
      }
    }, 800), // Increased delay to avoid too many API calls
    [selectedCode.code]
  );

  useEffect(() => {
    if (data.email || data.whatsapp) {
      checkPendingRecoveries(data.email, data.whatsapp);
    } else {
      setPendingRecovery(null);
      setShowRecoveryPreview(false);
    }
  }, [data.email, data.whatsapp, checkPendingRecoveries]);

  // Check recovery completion after registration
  const checkRecoveryCompletion = async (email: string, phoneNumber?: string) => {
    try {
      const fullPhoneNumber = phoneNumber ? `${selectedCode.code}${phoneNumber}` : undefined;
      const recoveryResponse = await safeRecoveryApiCall(
        () => sbcApiService.getRecoveryNotification(email, fullPhoneNumber)
      );

      if (recoveryResponse) {
        const recoveryData = handleApiResponse(recoveryResponse);
        if (recoveryData && recoveryData.hasRecoveries) {
          setRecoveryCompletedData(recoveryData);
          setShowRecoveryCompletedNotification(true);
        }
      }
    } catch (error) {
      // Silently fail - don't show notification if there's an error
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    if (name === 'interets') {
      return;
    }
    if (name === 'countryCodeSelect') {
      const code = africanCountryCodes.find(c => c.value === value) || africanCountryCodes[0];
      setSelectedCode(code);
      const whatsappNumber = data.whatsapp;
      setData(prev => ({ ...prev, whatsapp: whatsappNumber }));
      return;
    }
    setData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

    if (step === 0 && (name === 'email' || name === 'whatsapp' || name === 'parrain')) {
      setErrors(prev => {
        const updated = { ...prev, general: undefined, emailExists: undefined, whatsappExists: undefined };
        if (name === 'parrain') {
          updated.parrain = undefined;
          setAffiliateName(null);
          setAffiliateLoading(false);
        }
        return updated;
      });
    }

    if (errors[name as keyof SignupErrors] && name !== 'parrain') {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleInterestClick = (displayInterest: string) => {
    // Convert display value (with emoji) to base value (without emoji) for storage
    const baseInterest = getInterestBaseValue(displayInterest);

    setData(prev => ({
      ...prev,
      interets: prev.interets.includes(baseInterest)
        ? prev.interets.filter(i => i !== baseInterest)
        : [...prev.interets, baseInterest]
    }));
    setErrors(prev => ({ ...prev, interets: undefined }));
  };

  // Helper function to render recovery status message
  const renderRecoveryStatusMessage = (type: 'email' | 'phone') => {
    const status = recoveryStatus[type];

    if (!status) return null;

    switch (status) {
      case 'checking':
        return (
          <div className="text-blue-500 text-xs mt-1 flex items-center">
            <span className="animate-spin mr-1">⟲</span>
            Vérification de récupération...
          </div>
        );
      case 'recoverable':
        // Simple, concise message with transaction info
        const transactionCount = pendingRecovery?.recoveryDetails?.totalTransactions || 0;
        const totalAmount = pendingRecovery?.recoveryDetails?.totalAmount || 0;

        return (
          <div className="text-green-600 text-xs mt-1 flex items-center">
            <span className="mr-1">✓</span>
            Compte récupérable détecté ({transactionCount} transaction{transactionCount > 1 ? 's' : ''}, {totalAmount} XAF)
          </div>
        );
      case 'none':
        return null; // Don't show anything for no recovery
      default:
        return null;
    }
  };

  // Helper function to render conflict status message
  const renderConflictStatusMessage = (type: 'email' | 'phone') => {
    const hasConflict = conflictStatus[type] === 'conflict';

    if (!hasConflict) return null;

    return (
      <div className="text-red-500 text-xs mt-1 flex items-center">
        <span className="mr-1">⚠️</span>
        {conflictStatus.message}
      </div>
    );
  };

  const validateStep = async (): Promise<boolean> => {
    let valid = true;
    const newErrors: SignupErrors = {};
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
      if (!data.parrain) { newErrors.parrain = 'Code parrain requis.'; valid = false; }
      else if (!isAffiliationCodeDisabled && !affiliateName) {
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
      } catch (error) {
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
        const countryCode = countryOptions.find(c => c.value === data.pays)?.code || data.pays;
        const userData = {
          email: data.email,
          password: data.password,
          name: data.nom,
          phoneNumber: `${selectedCode.code}${data.whatsapp}`,
          referrerCode: data.parrain || undefined,
          city: data.ville,
          region: data.region,
          country: countryCode,
          birthDate: data.naissance,
          sex: data.sexe,
          profession: data.profession ? removeAccents(data.profession) : undefined,
          language: data.langue,
          interests: data.interets.length > 0 ? data.interets.map(i => removeAccents(i)) : undefined,
          notificationPreference: data.notificationPreference,
        };

        const result = await register(userData);

        // Check for recovery completion after successful registration
        setTimeout(async () => {
          await checkRecoveryCompletion(data.email, data.whatsapp);
        }, 2000); // Wait 2 seconds for backend recovery processing

        // Clear all signup cache including URL parameters
        clearSignupCache();

        navigate('/otp', {
          state: {
            userId: result.userId,
            email: data.email,
            fromRegistration: true
          }
        });
      } catch (error) {
        setLoading(false);
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
                <label className="block text-gray-700 mb-1">👤 Nom complet</label>
                <input name="nom" value={data.nom} onChange={handleChange} placeholder="Ex: Jean Paul" className={`w-full border ${errors.nom ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.nom && <div className="text-red-500 text-xs">{errors.nom}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">📧 Email</label>
                <input name="email" value={data.email} onChange={handleChange} placeholder="Ex: Jeanpierre@gmail.com" className={`w-full border ${errors.email || errors.emailExists ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.email && <div className="text-red-500 text-xs">{errors.email}</div>}
                {errors.emailExists && <div className="text-red-500 text-xs">{errors.emailExists}</div>}
                {renderRecoveryStatusMessage('email')}
                {renderConflictStatusMessage('email')}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">🔒 Mot de passe</label>
                <div className="relative">
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={data.password} 
                    onChange={handleChange} 
                    placeholder="Mot de passe" 
                    className={`w-full border ${errors.password ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 pr-12 focus:outline-none`} 
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.password && <div className="text-red-500 text-xs">{errors.password}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">🔐 Confirmer le mot de passe</label>
                <div className="relative">
                  <input 
                    name="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={data.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="Confirmer mot de passe" 
                    className={`w-full border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 pr-12 focus:outline-none`} 
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <div className="text-red-500 text-xs">{errors.confirmPassword}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">📱 Numéro WhatsApp</label>
                <div className="flex gap-2">
                  <select
                    className="border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#115CF6] bg-white"
                    name="countryCodeSelect"
                    value={selectedCode.value}
                    onChange={handleChange}
                  >
                    {africanCountryCodes.map((c) => (
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
                {renderRecoveryStatusMessage('phone')}
                {renderConflictStatusMessage('phone')}
              </div>
              {errors.general && <div className="text-red-500 text-xs text-center mt-2">{errors.general}</div>}
            </>
          )}
          {step === 1 && (
            <>
              <div>
                <label className="block text-gray-700 mb-1">🌍 Pays</label>
                <select name="pays" value={data.pays} onChange={(e) => {
                  handleChange(e);
                  // Reset city and region when country changes
                  setData(prev => ({ ...prev, ville: '', region: '' }));
                }} className={`w-full border ${errors.pays ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner le pays</option>
                  {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {errors.pays && <div className="text-red-500 text-xs">{errors.pays}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">🗺️ Région</label>
                <select
                  name="region"
                  value={data.region}
                  onChange={handleChange}
                  disabled={!data.pays}
                  className={`w-full border ${errors.region ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none ${!data.pays ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Sélectionner la région</option>
                  {data.pays && regionsPerCountry[countryOptions.find(c => c.value === data.pays)?.code || '']?.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {errors.region && <div className="text-red-500 text-xs">{errors.region}</div>}
                {!data.pays && <div className="text-gray-500 text-xs mt-1">Veuillez d'abord sélectionner un pays</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">🏙️ Ville</label>
                <select
                  name="ville"
                  value={data.ville}
                  onChange={handleChange}
                  disabled={!data.pays}
                  className={`w-full border ${errors.ville ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none ${!data.pays ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Sélectionner la ville</option>
                  {data.pays && citiesPerCountry[countryOptions.find(c => c.value === data.pays)?.code || '']?.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.ville && <div className="text-red-500 text-xs">{errors.ville}</div>}
                {!data.pays && <div className="text-gray-500 text-xs mt-1">Veuillez d'abord sélectionner un pays</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">🎂 Date de naissance</label>
                <input name="naissance" type="date" value={data.naissance} onChange={handleChange} className={`w-full border ${errors.naissance ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`} />
                {errors.naissance && <div className="text-red-500 text-xs">{errors.naissance}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">⚧️ Sexe</label>
                <select name="sexe" value={data.sexe} onChange={handleChange} className={`w-full border ${errors.sexe ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner</option>
                  <option value="male">👨 Homme</option>
                  <option value="female">👩 Femme</option>
                </select>
                {errors.sexe && <div className="text-red-500 text-xs">{errors.sexe}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">💼 Profession</label>
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
                <label className="block text-gray-700 mb-1">🗣️ Langue</label>
                <select name="langue" value={data.langue} onChange={handleChange} className={`w-full border ${errors.langue ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-2 focus:outline-none`}>
                  <option value="">Sélectionner la langue</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇬🇧 Anglais</option>
                </select>
                {errors.langue && <div className="text-red-500 text-xs">{errors.langue}</div>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">❤️ Centres d'intérêt</label>
                <div className="flex flex-wrap gap-2">
                  {interetOptions.map(displayInterest => {
                    const baseInterest = getInterestBaseValue(displayInterest);
                    const isSelected = data.interets.includes(baseInterest);
                    return (
                      <button
                        key={displayInterest}
                        type="button"
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${isSelected ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                        onClick={() => handleInterestClick(displayInterest)}
                      >
                        {displayInterest}
                      </button>
                    );
                  })}
                </div>
                {errors.interets && <div className="text-red-500 text-xs">{errors.interets}</div>}
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
                      checked={data.notificationPreference === 'email'}
                      onChange={handleChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📧</span>
                      <div>
                        <div className="font-medium text-gray-700 text-sm">Email</div>
                        <div className="text-xs text-gray-500">Recevoir les codes OTP par email</div>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="notificationPreference"
                      value="whatsapp"
                      checked={data.notificationPreference === 'whatsapp'}
                      onChange={handleChange}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📱</span>
                      <div>
                        <div className="font-medium text-gray-700 text-sm">WhatsApp</div>
                        <div className="text-xs text-gray-500">Recevoir les codes OTP via WhatsApp</div>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Vous pourrez modifier cette préférence plus tard
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">🔗 Code parrain</label>
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
                <span>J'accepte les <button type="button" onClick={handleOpenTerms} className="text-[#115CF6] underline bg-transparent">conditions d'utilisation</button></span>
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
                disabled={loading || !data.cgu || affiliateLoading}
                className="bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-2 ml-auto"
              >
                {loading ? 'Inscription...' : (showRecoveryPreview ? 'S\'inscrire & Récupérer' : "S'inscrire")}
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
              {settingsLoading ? (
                <div className="flex justify-center items-center py-8 text-gray-500">
                  Chargement des conditions d'utilisation...
                </div>
              ) : settingsError ? (
                <div className="text-red-500 text-center py-8">
                  Erreur lors du chargement des conditions d'utilisation.
                </div>
              ) : (
                <p>Veuillez cliquer sur le lien pour ouvrir les conditions d'utilisation.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Completed Notification */}
      {recoveryCompletedData && (
        <RecoveryCompletedNotification 
          isOpen={showRecoveryCompletedNotification}
          onClose={() => {
            setShowRecoveryCompletedNotification(false);
            setRecoveryCompletedData(null);
          }}
          recoveryData={recoveryCompletedData}
        />
      )}
    </div>
  );
}

export default Signup;
