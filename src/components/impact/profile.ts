import { allCountries } from '../../utils/countriesData';
import { IMPACT_PROFILE_LIMITS as LIMITS, type ImpactEdition } from '../../types/impact';

// Candidate profile helpers shared by the form and the page (no React here).

export const CONSENT_TEXT =
  'J’accepte que SBC publie mon profil, ma photo, mes vidéos et la présentation de mon projet dans l’application et sur ses réseaux sociaux (Facebook…) pendant le Challenge et, si je suis finaliste, dans l’espace SBC Impact pendant au moins 12 mois.';

export type TextKey = keyof typeof LIMITS;
export type Errors = Partial<Record<string, string>>;

export interface ProfileValues {
  name: string;
  photoFileId: string;
  country: string;
  city: string;
  activity: string;
  category: string;
  projectName: string;
  projectDescription: string;
  presentation: string;
  link: string;
  extra: Record<string, string>;
}

export const LABELS: Record<TextKey, string> = {
  name: 'Nom et prénom',
  country: 'Pays',
  city: 'Ville',
  activity: 'Activité professionnelle',
  category: 'Catégorie',
  projectName: 'Nom du projet',
  projectDescription: 'Description du projet',
  presentation: 'Présentation du projet',
  link: 'Lien vers votre activité ou votre SBC Shop',
};

/**
 * The field a refusal points at. The server sends the API key (`details.field`,
 * `extra.<key>` for an extra question); a French label, sent by the first
 * version of the server, is still recognised.
 */
export const fieldFromServer = (field: unknown, edition: ImpactEdition): string | null => {
  if (typeof field !== 'string' || !field) return null;
  const byLabel = (Object.keys(LABELS) as TextKey[]).find((k) => LABELS[k] === field);
  if (byLabel) return byLabel;
  if (field === 'photoFileId' || field === 'link' || field === 'category' || field in LIMITS) return field;
  if (field.startsWith('extra.')) return field;
  const extra = edition.settings.profileFields.find((f) => f.label === field);
  return extra ? `extra.${extra.key}` : null;
};

/** The member's country is stored as a code (CM) on most accounts. */
export const countryName = (raw: string | undefined): string => {
  const v = (raw || '').trim();
  if (!v) return '';
  const byCode = allCountries.find((c) => c.code.toLowerCase() === v.toLowerCase());
  return byCode ? byCode.value : v;
};

const isWebLink = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export function validateProfile(v: ProfileValues, edition: ImpactEdition, needConsent: boolean, consent: boolean): Errors {
  const errors: Errors = {};
  for (const k of Object.keys(LIMITS) as TextKey[]) {
    if (k === 'link' || k === 'category') continue;
    const [min, max] = LIMITS[k];
    const len = v[k].trim().length;
    if (len === 0) errors[k] = `« ${LABELS[k]} » est obligatoire.`;
    else if (len < min) errors[k] = `« ${LABELS[k]} » : au moins ${min} caractères.`;
    else if (len > max) errors[k] = `« ${LABELS[k]} » : ${max} caractères au maximum.`;
  }
  const cats = edition.settings.categories;
  if (!v.category.trim()) errors.category = 'Choisissez une catégorie.';
  else if (cats.length && !cats.includes(v.category)) errors.category = 'Choisissez une catégorie de la liste.';
  else if (v.category.trim().length > LIMITS.category[1]) errors.category = `« Catégorie » : ${LIMITS.category[1]} caractères au maximum.`;
  const link = v.link.trim();
  if (link && !isWebLink(link)) errors.link = 'Le lien doit être une adresse web complète (https://…).';
  else if (link.length > LIMITS.link[1]) errors.link = 'Le lien est trop long.';
  if (!v.photoFileId) errors.photoFileId = 'Ajoutez une photo.';
  for (const f of edition.settings.profileFields) {
    const val = (v.extra[f.key] || '').trim();
    if (!val && f.required) errors[`extra.${f.key}`] = `« ${f.label} » est obligatoire.`;
    else if (val.length > f.maxLength) errors[`extra.${f.key}`] = `« ${f.label} » : ${f.maxLength} caractères au maximum.`;
  }
  if (needConsent && !consent) errors.consent = 'Cochez la case pour accepter la publication de votre candidature.';
  return errors;
}

