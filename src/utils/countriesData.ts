// Complete list of all African countries with their details
export interface CountryData {
  value: string;
  label: string;
  code: string;
  flag: string;
  phoneCode: string;
  currency: string;
  supportsMomo: boolean;
}

export interface MomoOperatorData {
  operators: string[];
  currencies: string[];
}

export interface MomoCorrespondentsMap {
  [countryCode: string]: MomoOperatorData;
}

// Complete list of all 54 African countries
export const allAfricanCountries: CountryData[] = [
  // North Africa
  { value: 'Algérie', label: '🇩🇿 Algérie', code: 'DZ', flag: '🇩🇿', phoneCode: '+213', currency: 'DZD', supportsMomo: false },
  { value: 'Égypte', label: '🇪🇬 Égypte', code: 'EG', flag: '🇪🇬', phoneCode: '+20', currency: 'EGP', supportsMomo: false },
  { value: 'Libye', label: '🇱🇾 Libye', code: 'LY', flag: '🇱🇾', phoneCode: '+218', currency: 'LYD', supportsMomo: false },
  { value: 'Maroc', label: '🇲🇦 Maroc', code: 'MA', flag: '🇲🇦', phoneCode: '+212', currency: 'MAD', supportsMomo: false },
  { value: 'Soudan', label: '🇸🇩 Soudan', code: 'SD', flag: '🇸🇩', phoneCode: '+249', currency: 'SDG', supportsMomo: false },
  { value: 'Tunisie', label: '🇹🇳 Tunisie', code: 'TN', flag: '🇹🇳', phoneCode: '+216', currency: 'TND', supportsMomo: false },
  { value: 'Soudan du Sud', label: '🇸🇸 Soudan du Sud', code: 'SS', flag: '🇸🇸', phoneCode: '+211', currency: 'SSP', supportsMomo: false },

  // West Africa
  { value: 'Bénin', label: '🇧🇯 Bénin', code: 'BJ', flag: '🇧🇯', phoneCode: '+229', currency: 'XOF', supportsMomo: true },
  { value: 'Burkina Faso', label: '🇧🇫 Burkina Faso', code: 'BF', flag: '🇧🇫', phoneCode: '+226', currency: 'XOF', supportsMomo: true },
  { value: 'Cap-Vert', label: '🇨🇻 Cap-Vert', code: 'CV', flag: '🇨🇻', phoneCode: '+238', currency: 'CVE', supportsMomo: false },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 Côte d\'Ivoire', code: 'CI', flag: '🇨🇮', phoneCode: '+225', currency: 'XOF', supportsMomo: true },
  { value: 'Gambie', label: '🇬🇲 Gambie', code: 'GM', flag: '🇬🇲', phoneCode: '+220', currency: 'GMD', supportsMomo: false },
  { value: 'Ghana', label: '🇬🇭 Ghana', code: 'GH', flag: '🇬🇭', phoneCode: '+233', currency: 'GHS', supportsMomo: true },
  { value: 'Guinée', label: '🇬🇳 Guinée', code: 'GN', flag: '🇬🇳', phoneCode: '+224', currency: 'GNF', supportsMomo: false },
  { value: 'Guinée-Bissau', label: '🇬🇼 Guinée-Bissau', code: 'GW', flag: '🇬🇼', phoneCode: '+245', currency: 'XOF', supportsMomo: false },
  { value: 'Libéria', label: '🇱🇷 Libéria', code: 'LR', flag: '🇱🇷', phoneCode: '+231', currency: 'LRD', supportsMomo: false },
  { value: 'Mali', label: '🇲🇱 Mali', code: 'ML', flag: '🇲🇱', phoneCode: '+223', currency: 'XOF', supportsMomo: true },
  { value: 'Mauritanie', label: '🇲🇷 Mauritanie', code: 'MR', flag: '🇲🇷', phoneCode: '+222', currency: 'MRU', supportsMomo: false },
  { value: 'Niger', label: '🇳🇪 Niger', code: 'NE', flag: '🇳🇪', phoneCode: '+227', currency: 'XOF', supportsMomo: true },
  { value: 'Nigéria', label: '🇳🇬 Nigéria', code: 'NG', flag: '🇳🇬', phoneCode: '+234', currency: 'NGN', supportsMomo: true },
  { value: 'Sénégal', label: '🇸🇳 Sénégal', code: 'SN', flag: '🇸🇳', phoneCode: '+221', currency: 'XOF', supportsMomo: true },
  { value: 'Sierra Leone', label: '🇸🇱 Sierra Leone', code: 'SL', flag: '🇸🇱', phoneCode: '+232', currency: 'SLE', supportsMomo: false },
  { value: 'Togo', label: '🇹🇬 Togo', code: 'TG', flag: '🇹🇬', phoneCode: '+228', currency: 'XOF', supportsMomo: true },

  // Central Africa
  { value: 'Cameroun', label: '🇨🇲 Cameroun', code: 'CM', flag: '🇨🇲', phoneCode: '+237', currency: 'XAF', supportsMomo: true },
  { value: 'République Centrafricaine', label: '🇨🇫 République Centrafricaine', code: 'CF', flag: '🇨🇫', phoneCode: '+236', currency: 'XAF', supportsMomo: false },
  { value: 'Tchad', label: '🇹🇩 Tchad', code: 'TD', flag: '🇹🇩', phoneCode: '+235', currency: 'XAF', supportsMomo: false },
  { value: 'Congo-Brazzaville', label: '🇨🇬 Congo-Brazzaville', code: 'CG', flag: '🇨🇬', phoneCode: '+242', currency: 'XAF', supportsMomo: true },
  { value: 'Congo-Kinshasa', label: '🇨🇩 Congo-Kinshasa (RDC)', code: 'CD', flag: '🇨🇩', phoneCode: '+243', currency: 'CDF', supportsMomo: true },
  { value: 'Guinée Équatoriale', label: '🇬🇶 Guinée Équatoriale', code: 'GQ', flag: '🇬🇶', phoneCode: '+240', currency: 'XAF', supportsMomo: false },
  { value: 'Gabon', label: '🇬🇦 Gabon', code: 'GA', flag: '🇬🇦', phoneCode: '+241', currency: 'XAF', supportsMomo: true },
  { value: 'São Tomé-et-Príncipe', label: '🇸🇹 São Tomé-et-Príncipe', code: 'ST', flag: '🇸🇹', phoneCode: '+239', currency: 'STN', supportsMomo: false },

  // East Africa
  { value: 'Burundi', label: '🇧🇮 Burundi', code: 'BI', flag: '🇧🇮', phoneCode: '+257', currency: 'BIF', supportsMomo: false },
  { value: 'Comores', label: '🇰🇲 Comores', code: 'KM', flag: '🇰🇲', phoneCode: '+269', currency: 'KMF', supportsMomo: false },
  { value: 'Djibouti', label: '🇩🇯 Djibouti', code: 'DJ', flag: '🇩🇯', phoneCode: '+253', currency: 'DJF', supportsMomo: false },
  { value: 'Érythrée', label: '🇪🇷 Érythrée', code: 'ER', flag: '🇪🇷', phoneCode: '+291', currency: 'ERN', supportsMomo: false },
  { value: 'Éthiopie', label: '🇪🇹 Éthiopie', code: 'ET', flag: '🇪🇹', phoneCode: '+251', currency: 'ETB', supportsMomo: false },
  { value: 'Kenya', label: '🇰🇪 Kenya', code: 'KE', flag: '🇰🇪', phoneCode: '+254', currency: 'KES', supportsMomo: true },
  { value: 'Madagascar', label: '🇲🇬 Madagascar', code: 'MG', flag: '🇲🇬', phoneCode: '+261', currency: 'MGA', supportsMomo: false },
  { value: 'Malawi', label: '🇲🇼 Malawi', code: 'MW', flag: '🇲🇼', phoneCode: '+265', currency: 'MWK', supportsMomo: false },
  { value: 'Maurice', label: '🇲🇺 Maurice', code: 'MU', flag: '🇲🇺', phoneCode: '+230', currency: 'MUR', supportsMomo: false },
  { value: 'Mozambique', label: '🇲🇿 Mozambique', code: 'MZ', flag: '🇲🇿', phoneCode: '+258', currency: 'MZN', supportsMomo: false },
  { value: 'Rwanda', label: '🇷🇼 Rwanda', code: 'RW', flag: '🇷🇼', phoneCode: '+250', currency: 'RWF', supportsMomo: false },
  { value: 'Seychelles', label: '🇸🇨 Seychelles', code: 'SC', flag: '🇸🇨', phoneCode: '+248', currency: 'SCR', supportsMomo: false },
  { value: 'Somalie', label: '🇸🇴 Somalie', code: 'SO', flag: '🇸🇴', phoneCode: '+252', currency: 'SOS', supportsMomo: false },
  { value: 'Tanzanie', label: '🇹🇿 Tanzanie', code: 'TZ', flag: '🇹🇿', phoneCode: '+255', currency: 'TZS', supportsMomo: false },
  { value: 'Ouganda', label: '🇺🇬 Ouganda', code: 'UG', flag: '🇺🇬', phoneCode: '+256', currency: 'UGX', supportsMomo: false },
  { value: 'Zambie', label: '🇿🇲 Zambie', code: 'ZM', flag: '🇿🇲', phoneCode: '+260', currency: 'ZMW', supportsMomo: false },
  { value: 'Zimbabwe', label: '🇿🇼 Zimbabwe', code: 'ZW', flag: '🇿🇼', phoneCode: '+263', currency: 'ZWL', supportsMomo: false },

  // Southern Africa
  { value: 'Angola', label: '🇦🇴 Angola', code: 'AO', flag: '🇦🇴', phoneCode: '+244', currency: 'AOA', supportsMomo: false },
  { value: 'Botswana', label: '🇧🇼 Botswana', code: 'BW', flag: '🇧🇼', phoneCode: '+267', currency: 'BWP', supportsMomo: false },
  { value: 'Eswatini', label: '🇸🇿 Eswatini', code: 'SZ', flag: '🇸🇿', phoneCode: '+268', currency: 'SZL', supportsMomo: false },
  { value: 'Lesotho', label: '🇱🇸 Lesotho', code: 'LS', flag: '🇱🇸', phoneCode: '+266', currency: 'LSL', supportsMomo: false },
  { value: 'Namibie', label: '🇳🇦 Namibie', code: 'NA', flag: '🇳🇦', phoneCode: '+264', currency: 'NAD', supportsMomo: false },
  { value: 'Afrique du Sud', label: '🇿🇦 Afrique du Sud', code: 'ZA', flag: '🇿🇦', phoneCode: '+27', currency: 'ZAR', supportsMomo: false },
].sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically by label

// Countries that support mobile money operations
export const momoSupportedCountries = allAfricanCountries.filter(country => country.supportsMomo);

// Legacy country options for backward compatibility
export const countryOptions = allAfricanCountries;

// Phone country codes for all African countries
export const africanCountryCodes = allAfricanCountries.map(country => ({
  value: country.value,
  label: `${country.flag} ${country.phoneCode}`,
  code: country.phoneCode
}));

// Mobile money operators by country (only for countries that support momo)
export const momoCorrespondents: MomoCorrespondentsMap = {
  'BJ': {
    'operators': ['MTN_MOMO_BEN', 'MOOV_BEN'],
    'currencies': ['XOF']
  },
  'CM': {
    'operators': ['MTN_MOMO_CMR', 'ORANGE_CMR'],
    'currencies': ['XAF']
  },
  'BF': {
    'operators': ['MOOV_BFA', 'ORANGE_BFA'],
    'currencies': ['XOF']
  },
  'CD': {
    'operators': ['VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD'],
    'currencies': ['CDF']
  },
  'KE': {
    'operators': ['MPESA_KEN'],
    'currencies': ['KES']
  },
  'NG': {
    'operators': ['MTN_MOMO_NGA', 'AIRTEL_NGA'],
    'currencies': ['NGN']
  },
  'SN': {
    'operators': ['FREE_SEN', 'ORANGE_SEN'],
    'currencies': ['XOF']
  },
  'CG': {
    'operators': ['AIRTEL_COG', 'MTN_MOMO_COG'],
    'currencies': ['XAF']
  },
  'GA': {
    'operators': ['AIRTEL_GAB'],
    'currencies': ['XAF']
  },
  'CI': {
    'operators': ['MTN_MOMO_CIV', 'ORANGE_CIV'],
    'currencies': ['XOF']
  },
  'ML': {
    'operators': ['ORANGE_MLI', 'MOOV_MLI'],
    'currencies': ['XOF']
  },
  'NE': {
    'operators': ['ORANGE_NER', 'MOOV_NER'],
    'currencies': ['XOF']
  },
  'GH': {
    'operators': ['MTN_MOMO_GHA', 'VODAFONE_GHA'],
    'currencies': ['GHS']
  },
  'TG': {
    'operators': ['TOGOCOM_TG', 'MOOV_TG'],
    'currencies': ['XOF']
  },
};

// Helper function to get mobile money operators for a country
export const getMomoOperatorsForCountry = (countryCode: string): string[] => {
  return momoCorrespondents[countryCode]?.operators || [];
};

// Helper function to check if a country supports mobile money
export const countrySupportsMomo = (countryCode: string): boolean => {
  const country = allAfricanCountries.find(c => c.code === countryCode);
  return country?.supportsMomo || false;
};

// Helper function to get display name for momo operators
export const getMomoOperatorDisplayName = (operatorValue: string): string => {
  const operatorNames: { [key: string]: string } = {
    'MTN_MOMO_BEN': 'MTN MoMo Bénin',
    'MOOV_BEN': 'Moov Bénin',
    'MTN_MOMO_CMR': 'MTN MoMo Cameroun',
    'ORANGE_CMR': 'Orange Money Cameroun',
    'MOOV_BFA': 'Moov Burkina Faso',
    'ORANGE_BFA': 'Orange Burkina Faso',
    'VODACOM_MPESA_COD': 'Vodacom M-Pesa RDC',
    'AIRTEL_COD': 'Airtel RDC',
    'ORANGE_COD': 'Orange RDC',
    'MPESA_KEN': 'M-Pesa Kenya',
    'MTN_MOMO_NGA': 'MTN MoMo Nigeria',
    'AIRTEL_NGA': 'Airtel Nigeria',
    'FREE_SEN': 'Free Money Sénégal',
    'ORANGE_SEN': 'Orange Money Sénégal',
    'AIRTEL_COG': 'Airtel Congo',
    'MTN_MOMO_COG': 'MTN MoMo Congo',
    'AIRTEL_GAB': 'Airtel Gabon',
    'MTN_MOMO_CIV': 'MTN MoMo Côte d\'Ivoire',
    'ORANGE_CIV': 'Orange Money Côte d\'Ivoire',
    'ORANGE_MLI': 'Orange Money Mali',
    'MOOV_MLI': 'Moov Mali',
    'ORANGE_NER': 'Orange Money Niger',
    'MOOV_NER': 'Moov Niger',
    'MTN_MOMO_GHA': 'MTN MoMo Ghana',
    'VODAFONE_GHA': 'Vodafone Ghana',
    'TOGOCOM_TG': 'Togocom',
    'MOOV_TG': 'Moov Togo',
  };

  return operatorNames[operatorValue] || operatorValue.replace(/_/g, ' ');
};

// Helper function to get country by code
export const getCountryByCode = (code: string): CountryData | undefined => {
  return allAfricanCountries.find(country => country.code === code);
};

// Helper function to get country by value
export const getCountryByValue = (value: string): CountryData | undefined => {
  return allAfricanCountries.find(country => country.value === value);
};