import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, Loading03Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import { sbcApiService } from '../services/SBCApiService';
import { motion } from 'motion/react';
import { pageFade, headerDrop, listContainer, listItem } from '../utils/motion';

const MIN_AMOUNT = 6000;

/** Countries SBC operates in. Targeting is optional; empty means every country. */
import { baseInterestOptions, getInterestDisplayValue } from './ModifierLeProfil';
import { removeAccents } from '../utils/apiHelpers';

const COUNTRIES = [
  { code: 'CM', label: 'Cameroun' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'SN', label: 'Sénégal' },
  { code: 'BJ', label: 'Bénin' },
  { code: 'TG', label: 'Togo' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'ML', label: 'Mali' },
  { code: 'NE', label: 'Niger' },
  { code: 'GA', label: 'Gabon' },
  { code: 'CD', label: 'RD Congo' },
  { code: 'CG', label: 'Congo' },
  { code: 'GN', label: 'Guinée' },
  { code: 'TD', label: 'Tchad' },
];

/**
 * Create a campaign, then send it to moderation.
 *
 * Creation and submission are separate calls on purpose: a draft that fails to
 * submit is still recoverable from the dashboard, whereas a combined call that
 * half-fails would lose the upload.
 */
function AdsNetworkCampaignForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [amount, setAmount] = useState(params.get('amount') || String(MIN_AMOUNT));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [sex, setSex] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount);
  const { data: quote } = useQuery({
    queryKey: ['ads-quote', parsedAmount],
    queryFn: async () => {
      const res = await sbcApiService.getAdsQuote(parsedAmount);
      return res.body?.data as { message: string } | undefined;
    },
    enabled: Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT,
  });

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) return setError('Donnez un titre à votre annonce.');
    if (!file) return setError('Ajoutez le visuel à publier.');
    if (!contactWhatsapp && !contactPhone && !websiteUrl) {
      return setError('Indiquez au moins un moyen de contact : WhatsApp, téléphone ou site web.');
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_AMOUNT) {
      return setError(`Le budget minimum est de ${MIN_AMOUNT.toLocaleString('fr-FR')} F.`);
    }

    setSubmitting(true);
    try {
      const upload = await sbcApiService.uploadFile(file);
      // fileId only — data.fileName is the original upload name and would create
      // a campaign pointing at nothing.
      const fileId = upload.body?.data?.fileId;
      if (!upload.isSuccessByStatusCode || !fileId) {
        setError("Le visuel n'a pas pu être envoyé. Réessayez.");
        return;
      }

      const created = await sbcApiService.createAdsCampaign({
        title: title.trim(),
        description: description.trim() || undefined,
        mediaFileId: fileId,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        mediaMimeType: file.type,
        suggestedCaption: caption.trim() || undefined,
        contactWhatsapp: contactWhatsapp.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        targeting: {
          countries: countries.length ? countries : undefined,
          // Accent-stripped, same normalization as user profiles, so matching
          // doesn't quietly lose half the audience.
          cities: cities.length ? cities.map(c => removeAccents(c)) : undefined,
          interests: interests.length ? interests : undefined,
          sex: sex.length ? sex : undefined,
          minAge: minAge ? Number(minAge) : undefined,
          maxAge: maxAge ? Number(maxAge) : undefined,
        },
        amount: parsedAmount,
      });

      const campaignId = created.body?.data?._id;
      if (!created.isSuccessByStatusCode || !campaignId) {
        setError(created.body?.message || "L'annonce n'a pas pu être créée.");
        return;
      }

      const submitted = await sbcApiService.submitAdsCampaign(campaignId);
      if (!submitted.isSuccessByStatusCode) {
        // The draft exists; the dashboard can resubmit it.
        setError(
          (submitted.body?.message || "L'envoi à la validation a échoué.") +
          " Votre brouillon est enregistré, vous pouvez le renvoyer depuis votre espace annonceur.",
        );
        return;
      }

      navigate('/ads-network/annonceur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <motion.div variants={headerDrop}>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouvelle annonce</h1>
        </motion.div>

        <div className="bg-blue-50 border border-border rounded-xl p-3 mt-3 text-sm text-blue-900 flex items-start gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="mt-0.5 shrink-0" />
          <span>
            Votre annonce sera relue par notre équipe avant d'être diffusée. Vous
            paierez une fois qu'elle sera validée.
          </span>
        </div>

        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-4 mt-5">
          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Visuel à publier</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 cursor-pointer">
              {preview ? (
                <img src={preview} alt="Aperçu" className="max-h-56 rounded-xl" />
              ) : (
                <>
                  <HugeiconsIcon icon={Image01Icon} className="text-gray-400" size={28} />
                  <span className="text-sm text-gray-500 mt-2">Choisir une image ou une vidéo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="ex. Promo rentrée — sacs à dos"
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ce que voit un prospect sur votre page."
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Texte proposé aux diffuseurs
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Le texte qui accompagnera votre visuel sur leur statut."
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Le lien de suivi de chaque diffuseur y sera ajouté automatiquement.
            </p>
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Moyens de contact</label>
            <p className="text-xs text-gray-500 mb-2">Au moins un. C'est ainsi que les prospects vous joignent.</p>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="WhatsApp (ex. +237600000000)"
              className="w-full border border-border rounded-xl px-4 py-3 mb-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Téléphone"
              className="w-full border border-border rounded-xl px-4 py-3 mb-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Site web (https://…)"
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Ciblage</label>
            <p className="text-xs text-gray-500 mb-2">
              Facultatif. Sans ciblage, votre annonce est proposée à tous les diffuseurs —
              plus de portée, moins de précision.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggle(countries, c.code, setCountries)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${countries.includes(c.code) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[{ v: 'male', l: 'Hommes' }, { v: 'female', l: 'Femmes' }].map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => toggle(sex, s.v, setSex)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${sex.includes(s.v) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border'}`}
                >
                  {s.l}
                </button>
              ))}
            </div>
            {/* Cities: free text, chip on Entrée/virgule — profiles hold free-text
                cities, so a fixed list would never match reality. */}
            <div className="mb-2">
              <div className="flex gap-2">
                <input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const v = cityInput.trim().replace(/,$/, '');
                      if (v && !cities.some(c => c.toLowerCase() === v.toLowerCase())) setCities([...cities, v]);
                      setCityInput('');
                    }
                  }}
                  placeholder="Villes (Entrée pour ajouter)"
                  className="flex-1 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              {cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {cities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCities(cities.filter(x => x !== c))}
                      className="px-3 py-1.5 rounded-full text-sm border bg-primary text-white border-primary"
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interests: the same list users pick from at signup, so targeting
                and profiles speak the same vocabulary. */}
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Centres d'intérêt</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {baseInterestOptions.map((base: string) => {
                  const selected = interests.includes(base);
                  return (
                    <button
                      key={base}
                      type="button"
                      onClick={() => setInterests(selected ? interests.filter(i => i !== base) : [...interests, base])}
                      className={`px-3 py-1.5 rounded-full text-sm border ${selected ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-border'}`}
                    >
                      {getInterestDisplayValue(base)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="number" inputMode="numeric" value={minAge}
                onChange={(e) => setMinAge(e.target.value)} placeholder="Âge min."
                className="flex-1 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <input
                type="number" inputMode="numeric" value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)} placeholder="Âge max."
                className="flex-1 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </motion.div>

          <motion.div variants={listItem}>
            <label className="block text-sm font-medium text-gray-800 mb-1">Budget</label>
            <input
              type="number" inputMode="numeric" min={MIN_AMOUNT} step={1000}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {quote && <p className="text-sm text-gray-700 mt-2">{quote.message}</p>}
          </motion.div>
        </motion.div>

        {error && (
          <div className="bg-red-50 border border-border rounded-xl p-3 text-sm text-red-800 mt-4">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary text-white rounded-xl py-3 font-medium mt-5 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {submitting && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
          Envoyer à la validation
        </button>
      </div>
    </motion.div>
  );
}

export default AdsNetworkCampaignForm;
