import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, Loading03Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  // Present when editing an existing campaign rather than creating one.
  const { id: editingId } = useParams<{ id: string }>();
  const isEditing = Boolean(editingId);

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
  /** Set when editing: what the campaign already is, which limits what may change. */
  const [existing, setExisting] = useState<{ status: string; mediaFileId?: string } | null>(null);

  // A live campaign has already been posted by diffuseurs, so its creative and
  // budget are frozen; only the audience can still be widened.
  const targetingOnly = existing?.status === 'active' || existing?.status === 'paused';
  // The money has already moved, so the budget cannot be re-quoted.
  const budgetLocked = isEditing && existing?.status !== 'draft' && existing?.status !== 'rejected';

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      const res = await sbcApiService.getAdsCampaign(editingId);
      const c = res.body?.data;
      if (cancelled || !c) return;
      setExisting({ status: c.status, mediaFileId: c.mediaFileId });
      setTitle(c.title ?? '');
      setDescription(c.description ?? '');
      setCaption(c.suggestedCaption ?? '');
      setContactWhatsapp(c.contactWhatsapp ?? '');
      setContactPhone(c.contactPhone ?? '');
      setWebsiteUrl(c.websiteUrl ?? '');
      setAmount(String(c.amountPaid ?? MIN_AMOUNT));
      const t = c.targeting ?? {};
      setCountries(t.countries ?? []);
      setSex(t.sex ?? []);
      setCities(t.cities ?? []);
      setInterests(t.interests ?? []);
      setMinAge(t.minAge != null ? String(t.minAge) : '');
      setMaxAge(t.maxAge != null ? String(t.maxAge) : '');
    })();
    return () => { cancelled = true; };
  }, [editingId]);

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

  // What this targeting can actually deliver, refreshed as the filters change.
  // Rufus: warn while they are still choosing, not after they have paid.
  const targetingPayload = {
    countries: countries.length ? countries : undefined,
    cities: cities.length ? cities.map(c => removeAccents(c)) : undefined,
    interests: interests.length ? interests : undefined,
    sex: sex.length ? sex : undefined,
    minAge: minAge ? Number(minAge) : undefined,
    maxAge: maxAge ? Number(maxAge) : undefined,
  };
  const { data: reach } = useQuery({
    queryKey: ['ads-reach', targetingPayload, parsedAmount],
    queryFn: async () => {
      const res = await sbcApiService.getAdsReach({ targeting: targetingPayload, amount: parsedAmount });
      return res.body?.data as
        | { matching: number; projectedUniqueViews: number; targetUniqueViews?: number; sufficient?: boolean; message: string }
        | undefined;
    },
    enabled: Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT,
    // The pool moves slowly; no need to re-ask on every keystroke.
    staleTime: 30_000,
  });

  /**
   * Saves changes to an existing campaign.
   *
   * A campaign in diffusion may only change its audience, so nothing else is sent
   * for one — the server refuses the rest anyway, and sending it would turn a
   * legitimate retarget into an error.
   */
  const saveEdit = async () => {
    let mediaFileId: string | undefined;
    if (file && !targetingOnly) {
      const upload = await sbcApiService.uploadFile(file);
      mediaFileId = upload.body?.data?.fileId;
      if (!upload.isSuccessByStatusCode || !mediaFileId) {
        setError("Le visuel n'a pas pu être envoyé. Réessayez.");
        return;
      }
    }

    const body: Record<string, unknown> = { targeting: targetingPayload };
    if (!targetingOnly) {
      body.title = title.trim();
      body.description = description.trim() || undefined;
      body.suggestedCaption = caption.trim() || undefined;
      body.contactWhatsapp = contactWhatsapp.trim() || undefined;
      body.contactPhone = contactPhone.trim() || undefined;
      body.websiteUrl = websiteUrl.trim() || undefined;
      if (mediaFileId && file) {
        body.mediaFileId = mediaFileId;
        body.mediaType = file.type.startsWith('video') ? 'video' : 'image';
        body.mediaMimeType = file.type;
      }
      if (!budgetLocked) body.amount = parsedAmount;
    }

    const saved = await sbcApiService.updateAdsCampaign(editingId!, body);
    if (!saved.isSuccessByStatusCode) {
      setError(saved.body?.message || "Les modifications n'ont pas pu être enregistrées.");
      return;
    }

    // A refusal that has already been paid for goes straight back into the queue,
    // free — the money was taken once and is still on the campaign.
    if (existing?.status === 'rejected') {
      const resubmit = await sbcApiService.submitAdsCampaign(editingId!);
      if (!resubmit.isSuccessByStatusCode) {
        setError(resubmit.body?.message || 'Modifications enregistrées, mais le renvoi en validation a échoué.');
        return;
      }
    }

    navigate('/ads-network/annonceur');
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) return setError('Donnez un titre à votre annonce.');
    // When editing, keeping the existing visual is the normal case.
    if (!file && !isEditing) return setError('Ajoutez le visuel à publier.');
    if (!contactWhatsapp && !contactPhone && !websiteUrl) {
      return setError('Indiquez au moins un moyen de contact : WhatsApp, téléphone ou site web.');
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < MIN_AMOUNT) {
      return setError(`Le budget minimum est de ${MIN_AMOUNT.toLocaleString('fr-FR')} F.`);
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await saveEdit();
        return;
      }

      // Guaranteed by the validation above; narrowed so the create payload can
      // read its mime type without a non-null assertion at each use.
      const creative = file as File;
      const upload = await sbcApiService.uploadFile(creative);
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
        mediaType: creative.type.startsWith('video') ? 'video' : 'image',
        mediaMimeType: creative.type,
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

      // Pay-first: paying is what puts the annonce in front of a moderator, so a
      // new campaign goes straight to payment. Submitting it for review unpaid is
      // exactly what filled the queue with campaigns nobody had paid for.
      const paid = await sbcApiService.payAdsCampaign(campaignId);
      if (!paid.isSuccessByStatusCode) {
        // The draft is saved either way; it can be paid from the dashboard.
        setError(
          (paid.body?.message || "Le paiement n'a pas pu être ouvert.") +
          " Votre brouillon est enregistré, vous pouvez le payer depuis votre espace annonceur.",
        );
        return;
      }

      // No session id means banked credit covered the whole budget, so there is
      // nothing to pay and the annonce is already queued for validation.
      const sessionId = paid.body?.data?.sessionId;
      if (!sessionId) {
        navigate('/ads-network/annonceur');
        return;
      }
      window.location.href = sbcApiService.generatePaymentUrl(sessionId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-white p-4 pb-24">
      <BackButton />

      <div className="max-w-2xl mx-auto">
        <motion.div variants={headerDrop}>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {isEditing ? (targetingOnly ? 'Modifier le ciblage' : 'Modifier l\'annonce') : 'Nouvelle annonce'}
          </h1>
        </motion.div>

        <div className="bg-blue-50 border border-border rounded-xl p-3 mt-3 text-sm text-blue-900 flex items-start gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="mt-0.5 shrink-0" />
          <span>
            {targetingOnly
              ? "Cette campagne est en diffusion : des diffuseurs l'ont déjà publiée, donc le visuel et le budget ne changent plus. Vous pouvez encore élargir le ciblage pour atteindre vos vues."
              : budgetLocked
                ? 'Cette campagne est déjà payée. Vous pouvez tout modifier sauf le budget — aucun nouveau paiement ne sera demandé.'
                : "Votre annonce sera relue par notre équipe avant d'être diffusée."}
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

        {/* The audience check. Shown while the filters are still being chosen,
            because after payment it is far too late to be useful. */}
        {reach && (
          <div
            className={`rounded-xl p-3 text-sm mt-4 border ${reach.sufficient === false
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-green-50 border-green-200 text-green-900'
              }`}
          >
            {reach.message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-border rounded-xl p-3 text-sm text-red-800 mt-4">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary text-white rounded-xl py-3 font-medium mt-5 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {submitting && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
          {isEditing
            ? (existing?.status === 'rejected' ? 'Enregistrer et renvoyer en validation' : 'Enregistrer les modifications')
            : 'Envoyer à la validation'}
        </button>
      </div>
    </motion.div>
  );
}

export default AdsNetworkCampaignForm;
