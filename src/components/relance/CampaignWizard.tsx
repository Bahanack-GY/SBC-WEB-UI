import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Cancel01Icon, CheckmarkCircle02Icon, Search01Icon, ViewIcon } from '@hugeicons/core-free-icons';
import { Switch } from './ui/Switch';
import { Sheet } from './ui/Sheet';
import { CountUp } from './ui/CountUp';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { allAfricanCountries } from '../../utils/countriesData';
import {
  buildCampaignPayload, campaignFilter, creditsNeeded, defaultCampaignName, filleulsCovered, frenchErrorFrom,
  MESSAGE_VARIABLES, PERIOD_OPTIONS, RELANCE_DAYS, type CampaignDraft, type OwnMessage,
} from '../../utils/relance';

const STEPS = ['Qui relancer ?', 'Le message', 'Confirmer'] as const;

const EMPTY: CampaignDraft = { name: '', period: '3m', countries: [], skipAlreadyInRelance: true };

const foldAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * A campagne de relance in three steps. The old wizard had four, 57 country
 * chips, a channel choice and a "combien de contacts / à partir de #" slicer
 * the server ignored, an "Abonnés" option that re-contacted people who had
 * already paid, and required an English copy of every message — silently
 * dropping any day without one.
 */
export function CampaignWizard({
  open, onClose, emailBalance, onLaunched,
}: {
  open: boolean;
  onClose: () => void;
  emailBalance: number;
  onLaunched: () => void;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY);
  const [ownMode, setOwnMode] = useState(false);
  const [day, setDay] = useState(1);
  const [countryQuery, setCountryQuery] = useState('');
  const [countriesOpen, setCountriesOpen] = useState(false);

  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [counting, setCounting] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0); setDir(1); setDraft(EMPTY); setOwnMode(false); setDay(1);
    setCount(null); setSample([]); setLaunchError(null); setLaunched(false); setCountriesOpen(false);
  }, [open]);

  // Live count of who a campaign would reach, as the parrain changes the filters.
  const filterKey = JSON.stringify(campaignFilter(draft));
  useEffect(() => {
    if (!open || step !== 0) return;
    if (draft.period === 'custom' && !draft.customDates?.from && !draft.customDates?.to) {
      setCount(null);
      return;
    }
    let cancelled = false;
    setCounting(true);
    setCountError(null);
    const t = window.setTimeout(async () => {
      try {
        const data = handleApiResponse(await sbcApiService.relancePreviewFilters(campaignFilter(draft)));
        if (cancelled) return;
        setCount(data?.totalCount ?? 0);
        setSample((data?.sampleUsers ?? []).map((u: { name?: string }) => u.name).filter(Boolean).slice(0, 3));
      } catch (err) {
        if (!cancelled) setCountError(frenchErrorFrom(err, 'Impossible de compter les filleuls. Réessayez.'));
      } finally {
        if (!cancelled) setCounting(false);
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(t); };
    // filterKey captures every field the filter depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, open, step]);

  // The shared list is sorted by its flag emoji, i.e. by country code (Burundi
  // before Bénin); sort by name here, and match "benin" to "Bénin".
  const countries = useMemo(() => {
    const q = foldAccents(countryQuery.trim());
    return allAfricanCountries
      .filter(c => !q || foldAccents(c.value).includes(q) || c.code.toLowerCase() === q)
      .sort((a, b) => a.value.localeCompare(b.value, 'fr'));
  }, [countryQuery]);

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };
  const setOwn = (d: number, patch: Partial<OwnMessage>) =>
    setDraft(prev => ({
      ...prev,
      ownMessages: { ...prev.ownMessages, [d]: { subject: '', text: '', ...prev.ownMessages?.[d], ...patch } },
    }));
  const toggleCountry = (code: string) =>
    setDraft(prev => ({
      ...prev,
      countries: prev.countries.includes(code) ? prev.countries.filter(c => c !== code) : [...prev.countries, code],
    }));

  const current = draft.ownMessages?.[day] ?? { subject: '', text: '' };
  const writtenDays = Object.entries(draft.ownMessages ?? {}).filter(([, m]) => m?.text.trim()).map(([d]) => Number(d));

  const preview = async () => {
    try {
      const data = handleApiResponse(await sbcApiService.relancePreviewMessage({
        dayNumber: day,
        subject: current.subject || undefined,
        messageTemplate: { fr: current.text, en: current.text },
        recipientName: 'Marie',
        referrerName: 'Vous',
      }));
      setPreviewHtml(typeof data === 'string' ? data : data?.html ?? '');
    } catch (err) {
      setLaunchError(frenchErrorFrom(err, "L'aperçu n'a pas pu être généré."));
    }
  };

  const launch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const payload = buildCampaignPayload(ownMode ? draft : { ...draft, ownMessages: undefined });
      const created = handleApiResponse(await sbcApiService.relanceCreateCampaign(payload));
      const id = created?._id;
      if (id && created?.status !== 'active') handleApiResponse(await sbcApiService.relanceStartCampaign(id));
      setLaunched(true);
      window.setTimeout(() => { onLaunched(); onClose(); }, reduce ? 300 : 1600);
    } catch (err) {
      setLaunchError(frenchErrorFrom(err, "La campagne n'a pas pu être lancée. Réessayez."));
    } finally {
      setLaunching(false);
    }
  };

  const needed = creditsNeeded(count ?? 0);
  const enough = emailBalance >= needed;
  const canNext0 = !counting && (count ?? 0) > 0;
  const canNext1 = !ownMode || writtenDays.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Nouvelle campagne de relance"
          className="fixed inset-0 z-50 bg-bg flex flex-col"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          <header className="flex items-center gap-2 px-3 py-3">
            <button
              onClick={step === 0 ? onClose : () => go(step - 1)}
              aria-label={step === 0 ? 'Fermer' : 'Étape précédente'}
              className="size-10 grid place-items-center rounded-pill text-ink-2 hover:bg-surface-2"
            >
              <HugeiconsIcon icon={step === 0 ? Cancel01Icon : ArrowLeft01Icon} size={22} />
            </button>
            <div className="flex-1">
              <div className="text-xs text-ink-3">Étape {step + 1} sur 3</div>
              <h2 className="text-lg font-semibold text-ink leading-tight">{STEPS[step]}</h2>
            </div>
          </header>

          <div className="px-4 flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className="flex-1 h-1 rounded-pill bg-surface-2 overflow-hidden">
                <motion.span
                  className="block h-full bg-primary"
                  initial={false}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.35 }}
                />
              </span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={launched ? 'done' : step}
                custom={dir}
                initial={{ opacity: 0, x: reduce ? 0 : dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : dir * -40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="px-4 py-5 max-w-lg mx-auto space-y-5"
              >
                {launched ? (
                  <div className="py-16 text-center">
                    <motion.div
                      className="mx-auto size-20 grid place-items-center rounded-pill bg-success text-white"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    >
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} />
                    </motion.div>
                    <h3 className="mt-5 text-xl font-bold text-ink">Campagne lancée</h3>
                    <p className="mt-1 text-sm text-ink-2">
                      {count} filleuls vont recevoir leur premier message dans les minutes qui viennent.
                    </p>
                  </div>
                ) : step === 0 ? (
                  <>
                    <section>
                      <h3 className="text-sm font-semibold text-ink">Inscrits pendant</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PERIOD_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => setDraft(d => ({ ...d, period: o.value }))}
                            aria-pressed={draft.period === o.value}
                            className={`h-9 px-3.5 rounded-pill text-sm font-medium border transition-colors ${draft.period === o.value ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-2 border-border'}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {draft.period === 'custom' && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(['from', 'to'] as const).map(k => (
                            <label key={k} className="text-xs text-ink-3">
                              {k === 'from' ? 'Du' : 'Au'}
                              <input
                                type="date"
                                value={draft.customDates?.[k] ?? ''}
                                onChange={e => setDraft(d => ({ ...d, customDates: { ...d.customDates, [k]: e.target.value } }))}
                                className="mt-1 w-full h-11 px-3 rounded-tile bg-surface border border-border text-ink text-sm"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-ink">Pays</h3>
                      <button
                        onClick={() => setCountriesOpen(o => !o)}
                        className="mt-2 w-full h-11 px-3 rounded-tile bg-surface border border-border text-left text-sm text-ink"
                      >
                        {draft.countries.length === 0
                          ? 'Tous les pays'
                          : draft.countries.map(c => allAfricanCountries.find(x => x.code === c)?.label ?? c).join(', ')}
                      </button>
                      <AnimatePresence>
                        {countriesOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 flex items-center gap-2 h-11 px-3 rounded-tile bg-surface-2">
                              <HugeiconsIcon icon={Search01Icon} size={18} className="text-ink-3" />
                              <input
                                // Opening the list is always to find a country: type straight away.
                                autoFocus
                                value={countryQuery}
                                onChange={e => setCountryQuery(e.target.value)}
                                placeholder="Chercher un pays"
                                aria-label="Chercher un pays"
                                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-3"
                              />
                            </div>
                            <ul className="mt-2 max-h-56 overflow-y-auto divide-y divide-border rounded-tile border border-border bg-surface">
                              {countries.map(c => (
                                <li key={c.code}>
                                  <label className="flex items-center gap-3 px-3 h-11 text-sm text-ink">
                                    <input
                                      type="checkbox"
                                      checked={draft.countries.includes(c.code)}
                                      onChange={() => toggleCountry(c.code)}
                                      className="size-4 accent-primary"
                                    />
                                    {c.label}
                                  </label>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>

                    <section className="flex items-center gap-3 p-4 rounded-tile bg-surface border border-border">
                      <div className="flex-1 text-sm font-medium text-ink">Ignorer ceux déjà en relance</div>
                      <Switch
                        checked={draft.skipAlreadyInRelance}
                        onChange={v => setDraft(d => ({ ...d, skipAlreadyInRelance: v }))}
                        label="Ignorer ceux déjà en relance"
                      />
                    </section>

                    <section aria-live="polite" className="p-4 rounded-card bg-primary-soft">
                      {count === null && !counting ? (
                        <p className="text-sm text-ink-2">Choisissez les dates.</p>
                      ) : countError ? (
                        <p className="text-sm text-danger">{countError}</p>
                      ) : (
                        <>
                          <div className="text-3xl font-bold text-primary">
                            {counting && count === null ? '…' : <CountUp value={count ?? 0} />}
                          </div>
                          <div className="text-sm text-ink-2">
                            {count === 0 ? "filleul non payé ne correspond. Élargissez la période." : 'filleuls non payés correspondent'}
                          </div>
                          {sample.length > 0 && (
                            <div className="mt-1 text-xs text-ink-3 truncate">Dont {sample.join(', ')}…</div>
                          )}
                        </>
                      )}
                    </section>
                  </>
                ) : step === 1 ? (
                  <>
                    {[false, true].map(own => (
                      <button
                        key={String(own)}
                        onClick={() => setOwnMode(own)}
                        aria-pressed={ownMode === own}
                        className={`w-full text-left p-4 rounded-card border transition-colors ${ownMode === own ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
                      >
                        <div className="font-semibold text-ink text-sm">
                          {own ? 'Mes propres messages' : 'Les messages SBC (conseillé)'}
                        </div>
                        <div className="text-xs text-ink-2 mt-0.5">
                          {own
                            ? 'Jours vides : message SBC'
                            : '7 messages prêts, 1 par jour'}
                        </div>
                      </button>
                    ))}

                    {ownMode && (
                      <section className="space-y-3">
                        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Jour du message">
                          {Array.from({ length: RELANCE_DAYS }, (_, i) => i + 1).map(d => (
                            <button
                              key={d}
                              role="tab"
                              aria-selected={day === d}
                              onClick={() => setDay(d)}
                              className={`relative shrink-0 h-9 min-w-9 px-3 rounded-pill text-sm font-semibold ${day === d ? 'bg-primary text-white' : 'bg-surface border border-border text-ink-2'}`}
                            >
                              J{d}
                              {writtenDays.includes(d) && day !== d && (
                                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-pill bg-success" aria-label="écrit" />
                              )}
                            </button>
                          ))}
                        </div>
                        <input
                          value={current.subject}
                          onChange={e => setOwn(day, { subject: e.target.value })}
                          placeholder="Objet de l'email (facultatif)"
                          aria-label={`Objet du jour ${day}`}
                          className="w-full h-11 px-3 rounded-tile bg-surface border border-border text-sm text-ink"
                        />
                        <textarea
                          value={current.text}
                          onChange={e => setOwn(day, { text: e.target.value })}
                          placeholder={`Votre message du jour ${day}…`}
                          aria-label={`Message du jour ${day}`}
                          rows={6}
                          className="w-full p-3 rounded-tile bg-surface border border-border text-sm text-ink"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-ink-3">Ajouter :</span>
                          {MESSAGE_VARIABLES.map(v => (
                            <button
                              key={v.token}
                              onClick={() => setOwn(day, { text: `${current.text}${current.text && !current.text.endsWith(' ') ? ' ' : ''}${v.token}` })}
                              className="h-8 px-3 rounded-pill bg-surface-2 text-xs font-medium text-ink"
                            >
                              + {v.label}
                            </button>
                          ))}
                          <button
                            onClick={preview}
                            disabled={!current.text.trim()}
                            className="ml-auto h-8 px-3 rounded-pill text-xs font-semibold text-primary inline-flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <HugeiconsIcon icon={ViewIcon} size={14} /> Aperçu
                          </button>
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <>
                    <section className="rounded-card bg-surface border border-border divide-y divide-border">
                      {[
                        ['Filleuls relancés', <CountUp key="c" value={count ?? 0} />],
                        ['Messages par filleul', `${RELANCE_DAYS}, un par jour`],
                        ['Messages', ownMode ? `Les vôtres (${writtenDays.length} jour${writtenDays.length > 1 ? 's' : ''}) + SBC` : 'Ceux de SBC'],
                        ['Crédits nécessaires', <span key="n">≈ <CountUp value={needed} /></span>],
                        ['Vos crédits email', <CountUp key="b" value={emailBalance} />],
                      ].map(([k, v]) => (
                        <div key={String(k)} className="flex items-center justify-between px-4 h-12 text-sm">
                          <span className="text-ink-2">{k}</span>
                          <span className="font-semibold text-ink">{v}</span>
                        </div>
                      ))}
                    </section>

                    {!enough && (
                      <p className="p-3 rounded-tile bg-accent-soft text-sm text-ink">
                        Vos crédits couvrent environ {filleulsCovered(emailBalance)} filleuls. Les autres attendront
                        que vous rechargiez — sans rien perdre.
                      </p>
                    )}

                    <label className="block">
                      <span className="text-sm font-semibold text-ink">Nom de la campagne</span>
                      <input
                        value={draft.name}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder={defaultCampaignName()}
                        className="mt-2 w-full h-11 px-3 rounded-tile bg-surface border border-border text-sm text-ink"
                      />
                    </label>

                    {launchError && <p role="alert" className="text-sm text-danger">{launchError}</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {!launched && (
            <footer className="px-4 pt-3 pb-5 border-t border-border bg-bg">
              <div className="max-w-lg mx-auto">
                {step < 2 ? (
                  <button
                    onClick={() => go(step + 1)}
                    disabled={step === 0 ? !canNext0 : !canNext1}
                    className="w-full h-12 rounded-tile bg-primary text-white font-semibold disabled:opacity-40"
                  >
                    Continuer
                  </button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={launch}
                    disabled={launching}
                    className="w-full h-12 rounded-tile bg-success text-white font-semibold disabled:opacity-60"
                  >
                    {launching ? 'Lancement…' : `Lancer la campagne`}
                  </motion.button>
                )}
              </div>
            </footer>
          )}

          <Sheet open={previewHtml !== null} onClose={() => setPreviewHtml(null)} title={`Aperçu — jour ${day}`}>
            <iframe
              title="Aperçu de l'email"
              sandbox=""
              srcDoc={previewHtml ?? ''}
              className="w-full h-[60vh] rounded-tile border border-border bg-white"
            />
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
