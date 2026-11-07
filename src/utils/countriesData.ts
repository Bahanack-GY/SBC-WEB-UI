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
].sort((a, b) => a.value.localeCompare(b.value, 'fr')); // By French name. The label starts with a flag, so sorting by it was ISO order (Angola first).

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

// ---------------------------------------------------------------------------
// Every country and territory with an ITU dialling code (Rufus: sign-up is open
// to the whole world). Money still moves by Mobile Money in Africa only, so the
// wallet, withdrawals and the Ads Network keep the African lists above.
// ---------------------------------------------------------------------------

const flagOf = (iso: string) =>
  String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** [French name, ISO 3166-1 alpha-2, dialling code, currency]. North America shares +1. */
type CountryRow = [string, string, string, string];

const NON_AFRICAN_COUNTRIES: CountryRow[] = [
  // Africa: territories that are not among the 54 states
  ['La Réunion', 'RE', '+262', 'EUR'],
  ['Mayotte', 'YT', '+262', 'EUR'],
  ['Sahara occidental', 'EH', '+212', 'MAD'],
  ['Sainte-Hélène', 'SH', '+290', 'SHP'],
  ['Territoire britannique de l\'océan Indien', 'IO', '+246', 'USD'],

  // Europe
  ['Albanie', 'AL', '+355', 'ALL'],
  ['Allemagne', 'DE', '+49', 'EUR'],
  ['Andorre', 'AD', '+376', 'EUR'],
  ['Autriche', 'AT', '+43', 'EUR'],
  ['Belgique', 'BE', '+32', 'EUR'],
  ['Biélorussie', 'BY', '+375', 'BYN'],
  ['Bosnie-Herzégovine', 'BA', '+387', 'BAM'],
  ['Bulgarie', 'BG', '+359', 'EUR'],
  ['Chypre', 'CY', '+357', 'EUR'],
  ['Croatie', 'HR', '+385', 'EUR'],
  ['Danemark', 'DK', '+45', 'DKK'],
  ['Espagne', 'ES', '+34', 'EUR'],
  ['Estonie', 'EE', '+372', 'EUR'],
  ['Finlande', 'FI', '+358', 'EUR'],
  ['France', 'FR', '+33', 'EUR'],
  ['Gibraltar', 'GI', '+350', 'GIP'],
  ['Grèce', 'GR', '+30', 'EUR'],
  ['Guernesey', 'GG', '+44', 'GBP'],
  ['Hongrie', 'HU', '+36', 'HUF'],
  ['Île de Man', 'IM', '+44', 'GBP'],
  ['Îles Åland', 'AX', '+358', 'EUR'],
  ['Îles Féroé', 'FO', '+298', 'DKK'],
  ['Irlande', 'IE', '+353', 'EUR'],
  ['Islande', 'IS', '+354', 'ISK'],
  ['Italie', 'IT', '+39', 'EUR'],
  ['Jersey', 'JE', '+44', 'GBP'],
  ['Kosovo', 'XK', '+383', 'EUR'],
  ['Lettonie', 'LV', '+371', 'EUR'],
  ['Liechtenstein', 'LI', '+423', 'CHF'],
  ['Lituanie', 'LT', '+370', 'EUR'],
  ['Luxembourg', 'LU', '+352', 'EUR'],
  ['Macédoine du Nord', 'MK', '+389', 'MKD'],
  ['Malte', 'MT', '+356', 'EUR'],
  ['Moldavie', 'MD', '+373', 'MDL'],
  ['Monaco', 'MC', '+377', 'EUR'],
  ['Monténégro', 'ME', '+382', 'EUR'],
  ['Norvège', 'NO', '+47', 'NOK'],
  ['Pays-Bas', 'NL', '+31', 'EUR'],
  ['Pologne', 'PL', '+48', 'PLN'],
  ['Portugal', 'PT', '+351', 'EUR'],
  ['Roumanie', 'RO', '+40', 'RON'],
  ['Royaume-Uni', 'GB', '+44', 'GBP'],
  ['Russie', 'RU', '+7', 'RUB'],
  ['Saint-Marin', 'SM', '+378', 'EUR'],
  ['Serbie', 'RS', '+381', 'RSD'],
  ['Slovaquie', 'SK', '+421', 'EUR'],
  ['Slovénie', 'SI', '+386', 'EUR'],
  ['Suède', 'SE', '+46', 'SEK'],
  ['Suisse', 'CH', '+41', 'CHF'],
  ['Svalbard et Jan Mayen', 'SJ', '+47', 'NOK'],
  ['Tchéquie', 'CZ', '+420', 'CZK'],
  ['Ukraine', 'UA', '+380', 'UAH'],
  ['Vatican', 'VA', '+39', 'EUR'],

  // Asia and the Middle East
  ['Afghanistan', 'AF', '+93', 'AFN'],
  ['Arabie saoudite', 'SA', '+966', 'SAR'],
  ['Arménie', 'AM', '+374', 'AMD'],
  ['Azerbaïdjan', 'AZ', '+994', 'AZN'],
  ['Bahreïn', 'BH', '+973', 'BHD'],
  ['Bangladesh', 'BD', '+880', 'BDT'],
  ['Bhoutan', 'BT', '+975', 'BTN'],
  ['Brunei', 'BN', '+673', 'BND'],
  ['Cambodge', 'KH', '+855', 'KHR'],
  ['Chine', 'CN', '+86', 'CNY'],
  ['Corée du Nord', 'KP', '+850', 'KPW'],
  ['Corée du Sud', 'KR', '+82', 'KRW'],
  ['Émirats arabes unis', 'AE', '+971', 'AED'],
  ['Géorgie', 'GE', '+995', 'GEL'],
  ['Hong Kong', 'HK', '+852', 'HKD'],
  ['Inde', 'IN', '+91', 'INR'],
  ['Indonésie', 'ID', '+62', 'IDR'],
  ['Irak', 'IQ', '+964', 'IQD'],
  ['Iran', 'IR', '+98', 'IRR'],
  ['Israël', 'IL', '+972', 'ILS'],
  ['Japon', 'JP', '+81', 'JPY'],
  ['Jordanie', 'JO', '+962', 'JOD'],
  ['Kazakhstan', 'KZ', '+7', 'KZT'],
  ['Kirghizistan', 'KG', '+996', 'KGS'],
  ['Koweït', 'KW', '+965', 'KWD'],
  ['Laos', 'LA', '+856', 'LAK'],
  ['Liban', 'LB', '+961', 'LBP'],
  ['Macao', 'MO', '+853', 'MOP'],
  ['Malaisie', 'MY', '+60', 'MYR'],
  ['Maldives', 'MV', '+960', 'MVR'],
  ['Mongolie', 'MN', '+976', 'MNT'],
  ['Myanmar (Birmanie)', 'MM', '+95', 'MMK'],
  ['Népal', 'NP', '+977', 'NPR'],
  ['Oman', 'OM', '+968', 'OMR'],
  ['Ouzbékistan', 'UZ', '+998', 'UZS'],
  ['Pakistan', 'PK', '+92', 'PKR'],
  ['Palestine', 'PS', '+970', 'ILS'],
  ['Philippines', 'PH', '+63', 'PHP'],
  ['Qatar', 'QA', '+974', 'QAR'],
  ['Singapour', 'SG', '+65', 'SGD'],
  ['Sri Lanka', 'LK', '+94', 'LKR'],
  ['Syrie', 'SY', '+963', 'SYP'],
  ['Tadjikistan', 'TJ', '+992', 'TJS'],
  ['Taïwan', 'TW', '+886', 'TWD'],
  ['Thaïlande', 'TH', '+66', 'THB'],
  ['Timor oriental', 'TL', '+670', 'USD'],
  ['Turkménistan', 'TM', '+993', 'TMT'],
  ['Turquie', 'TR', '+90', 'TRY'],
  ['Viêt Nam', 'VN', '+84', 'VND'],
  ['Yémen', 'YE', '+967', 'YER'],

  // Americas
  ['Anguilla', 'AI', '+1', 'XCD'],
  ['Antigua-et-Barbuda', 'AG', '+1', 'XCD'],
  ['Argentine', 'AR', '+54', 'ARS'],
  ['Aruba', 'AW', '+297', 'AWG'],
  ['Bahamas', 'BS', '+1', 'BSD'],
  ['Barbade', 'BB', '+1', 'BBD'],
  ['Belize', 'BZ', '+501', 'BZD'],
  ['Bermudes', 'BM', '+1', 'BMD'],
  ['Bolivie', 'BO', '+591', 'BOB'],
  ['Bonaire, Saint-Eustache et Saba', 'BQ', '+599', 'USD'],
  ['Brésil', 'BR', '+55', 'BRL'],
  ['Canada', 'CA', '+1', 'CAD'],
  ['Chili', 'CL', '+56', 'CLP'],
  ['Colombie', 'CO', '+57', 'COP'],
  ['Costa Rica', 'CR', '+506', 'CRC'],
  ['Cuba', 'CU', '+53', 'CUP'],
  ['Curaçao', 'CW', '+599', 'XCG'],
  ['Dominique', 'DM', '+1', 'XCD'],
  ['Équateur', 'EC', '+593', 'USD'],
  ['États-Unis', 'US', '+1', 'USD'],
  ['Grenade', 'GD', '+1', 'XCD'],
  ['Groenland', 'GL', '+299', 'DKK'],
  ['Guadeloupe', 'GP', '+590', 'EUR'],
  ['Guatemala', 'GT', '+502', 'GTQ'],
  ['Guyana', 'GY', '+592', 'GYD'],
  ['Guyane française', 'GF', '+594', 'EUR'],
  ['Haïti', 'HT', '+509', 'HTG'],
  ['Honduras', 'HN', '+504', 'HNL'],
  ['Îles Caïmans', 'KY', '+1', 'KYD'],
  ['Îles Malouines', 'FK', '+500', 'FKP'],
  ['Îles Turques-et-Caïques', 'TC', '+1', 'USD'],
  ['Îles Vierges britanniques', 'VG', '+1', 'USD'],
  ['Îles Vierges des États-Unis', 'VI', '+1', 'USD'],
  ['Jamaïque', 'JM', '+1', 'JMD'],
  ['Martinique', 'MQ', '+596', 'EUR'],
  ['Mexique', 'MX', '+52', 'MXN'],
  ['Montserrat', 'MS', '+1', 'XCD'],
  ['Nicaragua', 'NI', '+505', 'NIO'],
  ['Panama', 'PA', '+507', 'PAB'],
  ['Paraguay', 'PY', '+595', 'PYG'],
  ['Pérou', 'PE', '+51', 'PEN'],
  ['Porto Rico', 'PR', '+1', 'USD'],
  ['République dominicaine', 'DO', '+1', 'DOP'],
  ['Saint-Barthélemy', 'BL', '+590', 'EUR'],
  ['Saint-Christophe-et-Niévès', 'KN', '+1', 'XCD'],
  ['Saint-Martin', 'MF', '+590', 'EUR'],
  ['Saint-Pierre-et-Miquelon', 'PM', '+508', 'EUR'],
  ['Saint-Vincent-et-les-Grenadines', 'VC', '+1', 'XCD'],
  ['Sainte-Lucie', 'LC', '+1', 'XCD'],
  ['Salvador', 'SV', '+503', 'USD'],
  ['Sint Maarten', 'SX', '+1', 'XCG'],
  ['Suriname', 'SR', '+597', 'SRD'],
  ['Trinité-et-Tobago', 'TT', '+1', 'TTD'],
  ['Uruguay', 'UY', '+598', 'UYU'],
  ['Venezuela', 'VE', '+58', 'VES'],

  // Oceania
  ['Australie', 'AU', '+61', 'AUD'],
  ['Fidji', 'FJ', '+679', 'FJD'],
  ['Guam', 'GU', '+1', 'USD'],
  ['Île Christmas', 'CX', '+61', 'AUD'],
  ['Île Norfolk', 'NF', '+672', 'AUD'],
  ['Îles Cocos', 'CC', '+61', 'AUD'],
  ['Îles Cook', 'CK', '+682', 'NZD'],
  ['Îles Mariannes du Nord', 'MP', '+1', 'USD'],
  ['Îles Marshall', 'MH', '+692', 'USD'],
  ['Îles Salomon', 'SB', '+677', 'SBD'],
  ['Kiribati', 'KI', '+686', 'AUD'],
  ['Micronésie', 'FM', '+691', 'USD'],
  ['Nauru', 'NR', '+674', 'AUD'],
  ['Niue', 'NU', '+683', 'NZD'],
  ['Nouvelle-Calédonie', 'NC', '+687', 'XPF'],
  ['Nouvelle-Zélande', 'NZ', '+64', 'NZD'],
  ['Palaos', 'PW', '+680', 'USD'],
  ['Papouasie-Nouvelle-Guinée', 'PG', '+675', 'PGK'],
  ['Polynésie française', 'PF', '+689', 'XPF'],
  ['Samoa', 'WS', '+685', 'WST'],
  ['Samoa américaines', 'AS', '+1', 'USD'],
  ['Tokelau', 'TK', '+690', 'NZD'],
  ['Tonga', 'TO', '+676', 'TOP'],
  ['Tuvalu', 'TV', '+688', 'AUD'],
  ['Vanuatu', 'VU', '+678', 'VUV'],
  ['Wallis-et-Futuna', 'WF', '+681', 'XPF'],
];

/**
 * Every country, the 54 African ones exactly as above plus the rest of the
 * world, sorted by French name. Use it wherever a member says where they live
 * or which number they use; keep the African lists where Mobile Money is involved.
 */
export const allCountries: CountryData[] = [
  ...allAfricanCountries,
  ...NON_AFRICAN_COUNTRIES.map(([value, code, phoneCode, currency]) => ({
    value,
    label: `${flagOf(code)} ${value}`,
    code,
    flag: flagOf(code),
    phoneCode,
    currency,
    supportsMomo: false,
  })),
].sort((a, b) => a.value.localeCompare(b.value, 'fr'));

/** Dial codes for every country, same shape as africanCountryCodes. */
export const worldCountryCodes = allCountries.map(country => ({
  value: country.value,
  label: `${country.flag} ${country.phoneCode}`,
  code: country.phoneCode,
}));

export type DialCode = (typeof worldCountryCodes)[number];

/** Cameroun: where most members are, so the dial pickers open on it. */
export const DEFAULT_DIAL_CODE: DialCode = worldCountryCodes.find(c => c.value === 'Cameroun')!;

export const dialCodeOf = (country: CountryData): DialCode =>
  worldCountryCodes.find(c => c.value === country.value) ?? DEFAULT_DIAL_CODE;

/** The country whose code ends "a +1 number" when several share it. */
const MAIN_COUNTRY_FOR_CODE: Record<string, string> = {
  '+1': 'US', '+7': 'RU', '+39': 'IT', '+44': 'GB', '+47': 'NO', '+61': 'AU',
  '+212': 'MA', '+262': 'RE', '+358': 'FI', '+590': 'GP', '+599': 'CW',
};

/** A country given as its French name ("Cameroun") or its ISO code ("CM"). */
export const findAnyCountry = (raw?: string | null): CountryData | undefined => {
  const v = raw?.trim().toLowerCase();
  if (!v) return undefined;
  return allCountries.find(c => c.code.toLowerCase() === v || c.value.toLowerCase() === v);
};

/**
 * The country an international number ("+237…", "00237…") belongs to. The
 * longest matching code wins (+2420… is Congo-Brazzaville, not a shorter code);
 * among countries sharing a code (+1, +7, +44…) `prefer` (a name or ISO code,
 * usually the member's own country) wins, then the main country for that code.
 * A number without "+" or "00" is not international: undefined.
 */
export const countryForPhone = (
  international: string,
  prefer?: string | null,
  list: CountryData[] = allCountries,
): CountryData | undefined => {
  let s = international.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) return undefined;
  const matches = list.filter(c => s.startsWith(c.phoneCode));
  if (matches.length === 0) return undefined;
  const longest = Math.max(...matches.map(c => c.phoneCode.length));
  const best = matches.filter(c => c.phoneCode.length === longest);
  const preferred = findAnyCountry(prefer);
  return best.find(c => c.code === preferred?.code)
    ?? best.find(c => MAIN_COUNTRY_FOR_CODE[c.phoneCode] === c.code)
    ?? best[0];
};

/**
 * Splits a number as the server stores it into a dial code and the national
 * part, for a form with a dial picker. `home` is the member's country (name or
 * ISO code). Numbers stored without "+" are read the way the old African-only
 * forms did — older accounts hold the national number alone, so a bare
 * "675090755" must not be read as Papua New Guinea (+675).
 */
export const splitStoredPhone = (stored: string, home?: string | null): { dial: DialCode; local: string } => {
  const n = (stored || '').replace(/[\s\-().]/g, '');
  const homeCountry = findAnyCountry(home);
  if (n.startsWith('+') || n.startsWith('00')) {
    const c = countryForPhone(n, home);
    if (c) {
      const digits = n.startsWith('00') ? n.slice(2) : n.slice(1);
      return { dial: dialCodeOf(c), local: digits.slice(c.phoneCode.length - 1) };
    }
    return { dial: homeCountry ? dialCodeOf(homeCountry) : DEFAULT_DIAL_CODE, local: n.replace(/^(\+|00)/, '') };
  }
  if (homeCountry && n.startsWith(homeCountry.phoneCode.slice(1))) {
    return { dial: dialCodeOf(homeCountry), local: n.slice(homeCountry.phoneCode.length - 1) };
  }
  const african = n ? countryForPhone(`+${n}`, home, allAfricanCountries) : undefined;
  if (african) return { dial: dialCodeOf(african), local: n.slice(african.phoneCode.length - 1) };
  return { dial: homeCountry ? dialCodeOf(homeCountry) : DEFAULT_DIAL_CODE, local: n };
};

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
    'operators': ['FREE_SEN', 'ORANGE_SEN', 'WAVE_SEN'],
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
    'operators': ['MTN_MOMO_CIV', 'ORANGE_CIV', 'WAVE_CIV'],
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
    // The three networks MoneyFusion pays out to in Ghana (live methods list,
    // 2026-09-23). VODAFONE_GHA is kept for accounts already registered that
    // way — Vodafone Ghana is now Telecel, same network.
    'operators': ['MTN_MOMO_GHA', 'TELECEL_GHA', 'AIRTEL_GHA', 'VODAFONE_GHA'],
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
    'WAVE_SEN': 'Wave Sénégal',
    'AIRTEL_COG': 'Airtel Congo',
    'MTN_MOMO_COG': 'MTN MoMo Congo',
    'AIRTEL_GAB': 'Airtel Gabon',
    'MTN_MOMO_CIV': 'MTN MoMo Côte d\'Ivoire',
    'ORANGE_CIV': 'Orange Money Côte d\'Ivoire',
    'WAVE_CIV': 'Wave Côte d\'Ivoire',
    'ORANGE_MLI': 'Orange Money Mali',
    'MOOV_MLI': 'Moov Mali',
    'ORANGE_NER': 'Orange Money Niger',
    'MOOV_NER': 'Moov Niger',
    'MTN_MOMO_GHA': 'MTN MoMo Ghana',
    'TELECEL_GHA': 'Telecel Ghana',
    'AIRTEL_GHA': 'AirtelTigo Ghana',
    'VODAFONE_GHA': 'Telecel Ghana (ex-Vodafone)',
    'TOGOCOM_TG': 'Togocom',
    'MOOV_TG': 'Moov Togo',
  };

  return operatorNames[operatorValue] || operatorValue.replace(/_/g, ' ');
};

// Helper function to get country by code
export const getCountryByCode = (code: string): CountryData | undefined => {
  return allCountries.find(country => country.code === code);
};

// Helper function to get country by value
export const getCountryByValue = (value: string): CountryData | undefined => {
  return allCountries.find(country => country.value === value);
};

// Regions per country (by country code)
export const regionsPerCountry: Record<string, string[]> = {
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
  TD: ['Batha', 'Borkou', 'Chari-Baguirmi', 'Ennedi-Est', 'Ennedi-Ouest', 'Guéra', 'Hadjer-Lamis', 'Kanem', 'Lac', 'Logone Occidental', 'Logone Oriental', 'Mandoul', 'Mayo-Kebbi Est', 'Mayo-Kebbi Ouest', 'Moyen-Chari', "N'Djamena", 'Ouaddaï', 'Salamat', 'Sila', 'Tandjilé', 'Tibesti', 'Wadi Fira'],
  CF: ['Bamingui-Bangoran', 'Bangui', 'Basse-Kotto', 'Haute-Kotto', 'Haut-Mbomou', 'Kémo', 'Lobaye', 'Mambéré-Kadéï', 'Mbomou', 'Nana-Grébizi', 'Nana-Mambéré', "Ombella-M'Poko", 'Ouaka', 'Ouham', 'Ouham-Pendé', 'Sangha-Mbaéré', 'Vakaga'],
  GQ: ['Annobón', 'Bioko Norte', 'Bioko Sur', 'Centro Sur', 'Djibloho', 'Kié-Ntem', 'Litoral', 'Wele-Nzas'],
  RW: ['Est', 'Kigali', 'Nord', 'Ouest', 'Sud'],
  BI: ['Bubanza', 'Bujumbura Mairie', 'Bujumbura Rural', 'Bururi', 'Cankuzo', 'Cibitoke', 'Gitega', 'Karuzi', 'Kayanza', 'Kirundo', 'Makamba', 'Muramvya', 'Muyinga', 'Mwaro', 'Ngozi', 'Rumonge', 'Rutana', 'Ruyigi'],
  MG: ['Antananarivo', 'Antsiranana', 'Fianarantsoa', 'Mahajanga', 'Toamasina', 'Toliara'],
  MU: ['Black River', 'Flacq', 'Grand Port', 'Moka', 'Pamplemousses', 'Plaines Wilhems', 'Port Louis', 'Rivière du Rempart', 'Savanne'],
  SC: ['Anse aux Pins', 'Anse Boileau', 'Anse Etoile', 'Anse Royale', 'Baie Lazare', 'Baie Sainte Anne', 'Beau Vallon', 'Bel Air', 'Bel Ombre', 'Cascade', 'Glacis', 'Grand Anse Mahe', 'Grand Anse Praslin', 'La Digue', 'La Rivière Anglaise', 'Les Mamelles', 'Mont Buxton', 'Mont Fleuri', 'Plaisance', 'Pointe La Rue', 'Port Glaud', 'Roche Caïman', 'Saint Louis', 'Takamaka'],
  KM: ['Anjouan', 'Grande Comore', 'Mohéli'],
  DJ: ['Ali Sabieh', 'Arta', 'Dikhil', 'Djibouti', 'Obock', 'Tadjourah'],
};