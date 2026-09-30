import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { statusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';

const toInputDate = (iso?: string) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

/** The typed word that unlocks the irreversible cancellation (§18). */
const CANCEL_WORD = 'ANNULER';

const inputClass = 'w-full bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary';

export default function OrganizerEventForm() {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('concert');
    const [country, setCountry] = useState('CM');
    const [city, setCity] = useState('');
    const [venue, setVenue] = useState('');
    const [address, setAddress] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [resaleEnabled, setResaleEnabled] = useState(true);
    const [maxResalePricePct, setMaxResalePricePct] = useState<string>('120');
    const [posterFileId, setPosterFileId] = useState<string>('');
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string>('');
    const [uploadingPoster, setUploadingPoster] = useState(false);
    const [videoFileId, setVideoFileId] = useState<string>('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string>('');
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<any>(null);
    const [ticketTypes, setTicketTypes] = useState<any[]>([]);

    // New ticket type form (only shown after event exists)
    const [ttName, setTtName] = useState('');
    const [ttDescription, setTtDescription] = useState('');
    const [ttPrice, setTtPrice] = useState('');
    const [ttQuantity, setTtQuantity] = useState('');
    const [ttMax, setTtMax] = useState('10');
    const [ttSalesStart, setTtSalesStart] = useState('');
    const [ttSalesEnd, setTtSalesEnd] = useState('');

    // Cancellation (§18) — destructive, so it lives behind a typed confirmation.
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelConfirm, setCancelConfirm] = useState('');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (isEdit && id) {
            sbcApiService.listMyOrganizerEvents({ limit: 100 }).then((r) => {
                if (!r.apiReportedSuccess) return;
                const found = (r.body?.data.items || []).find((e: any) => e._id === id);
                if (found) {
                    setEvent(found);
                    setTitle(found.title);
                    setDescription(found.description);
                    setCategory(found.category);
                    if (found.country) setCountry(found.country);
                    setCity(found.city);
                    setVenue(found.venue);
                    setAddress(found.address);
                    setStartsAt(toInputDate(found.startsAt));
                    setEndsAt(toInputDate(found.endsAt));
                    setResaleEnabled(found.resaleEnabled);
                    setMaxResalePricePct(String(found.maxResalePricePct ?? 120));
                    if (found.posterFileId) {
                        setPosterFileId(found.posterFileId);
                        setPosterPreview(sbcApiService.generateThumbnailUrl(found.posterFileId, 512));
                    }
                    if (found.videoFileId) {
                        setVideoFileId(found.videoFileId);
                        setVideoPreview(sbcApiService.generateSettingsFileUrl(found.videoFileId));
                    }
                }
            });
            sbcApiService.listEventTicketTypes(id).then((r) => r.apiReportedSuccess && setTicketTypes(r.body?.data || []));
        }
    }, [id, isEdit]);

    const pickPoster = (f: File | null) => {
        setPosterFile(f);
        setPosterPreview(f ? URL.createObjectURL(f) : (posterFileId ? sbcApiService.generateThumbnailUrl(posterFileId, 512) : ''));
    };

    const pickVideo = (f: File | null) => {
        if (f && f.size > MAX_VIDEO_BYTES) {
            setError(`La vidéo ne doit pas dépasser 30 Mo (celle-ci fait ${(f.size / 1024 / 1024).toFixed(1)} Mo).`);
            return;
        }
        setError(null);
        setVideoFile(f);
        setVideoPreview(f ? URL.createObjectURL(f) : (videoFileId ? sbcApiService.generateSettingsFileUrl(videoFileId) : ''));
    };

    const save = async () => {
        setError(null); setSubmitting(true);
        try {
            let uploadedPosterId = posterFileId;
            if (posterFile) {
                setUploadingPoster(true);
                const up = await sbcApiService.uploadFile(posterFile);
                setUploadingPoster(false);
                const fid = up.body?.data?.fileId;
                if (!up.isSuccessByStatusCode || !fid) {
                    setError(up.message || "L'affiche n'a pas pu être envoyée. Réessayez.");
                    return;
                }
                uploadedPosterId = fid;
                setPosterFileId(fid);
                setPosterFile(null);
            }

            let uploadedVideoId = videoFileId;
            if (videoFile) {
                if (videoFile.size > MAX_VIDEO_BYTES) {
                    setError('La vidéo dépasse 30 Mo.');
                    return;
                }
                setUploadingVideo(true);
                const up = await sbcApiService.uploadFile(videoFile);
                setUploadingVideo(false);
                const fid = up.body?.data?.fileId;
                if (!up.isSuccessByStatusCode || !fid) {
                    setError(up.message || "La vidéo n'a pas pu être envoyée. Réessayez.");
                    return;
                }
                uploadedVideoId = fid;
                setVideoFileId(fid);
                setVideoFile(null);
            }

            const payload: Record<string, any> = {
                title: title.trim(),
                description: description.trim(),
                category,
                country,
                city: city.trim(),
                venue: venue.trim(),
                address: address.trim(),
                startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
                endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
                resaleEnabled,
                maxResalePricePct: maxResalePricePct ? parseFloat(maxResalePricePct) : null,
            };
            if (uploadedPosterId) payload.posterFileId = uploadedPosterId;
            if (uploadedVideoId) payload.videoFileId = uploadedVideoId;

            const res = isEdit && id
                ? await sbcApiService.updateOrganizerEvent(id, payload)
                : await sbcApiService.createOrganizerEvent(payload);
            if (!res.apiReportedSuccess) { setError(res.message || 'Erreur.'); return; }
            setEvent(res.body?.data);
            if (!isEdit) navigate(`/events/organizer/${res.body?.data._id}`, { replace: true });
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); setUploadingPoster(false); }
        finally { setSubmitting(false); }
    };

    const addTicketType = async () => {
        if (!event) return;
        if (!ttName.trim() || !ttPrice || !ttQuantity) { setError('Nom, prix et quantité sont obligatoires.'); return; }

        // Sale window (§6) — both bounds optional, but they must be coherent.
        const start = ttSalesStart ? new Date(ttSalesStart) : null;
        const end = ttSalesEnd ? new Date(ttSalesEnd) : null;
        if (start && end && end <= start) {
            setError('La fin de vente doit être postérieure au début de vente.');
            return;
        }
        const eventEnd = endsAt ? new Date(endsAt) : (event.endsAt ? new Date(event.endsAt) : null);
        if (start && eventEnd && start >= eventEnd) {
            setError("Le début de vente doit précéder la fin de l'événement.");
            return;
        }

        setError(null);
        const res = await sbcApiService.createEventTicketType(event._id, {
            name: ttName.trim(),
            description: ttDescription.trim() || undefined,
            price: parseFloat(ttPrice),
            quantityTotal: parseInt(ttQuantity, 10),
            maxPerOrder: parseInt(ttMax, 10),
            salesStart: start ? start.toISOString() : undefined,
            salesEnd: end ? end.toISOString() : undefined,
        });
        if (res.apiReportedSuccess) {
            setTicketTypes((prev) => [...prev, res.body?.data]);
            setTtName(''); setTtDescription(''); setTtPrice(''); setTtQuantity(''); setTtMax('10');
            setTtSalesStart(''); setTtSalesEnd('');
        } else { setError(res.message || 'Impossible d\'ajouter le billet.'); }
    };

    const publish = async () => {
        if (!event) return;
        const res = await sbcApiService.publishOrganizerEvent(event._id);
        if (res.apiReportedSuccess) { setEvent(res.body?.data); }
        else setError(res.message || 'Impossible de publier.');
    };

    const cancelEvent = async () => {
        if (!event || cancelConfirm.trim().toUpperCase() !== CANCEL_WORD) return;
        setCancelling(true); setError(null);
        try {
            const res = await sbcApiService.cancelOrganizerEvent(event._id, cancelReason.trim() || undefined);
            if (res.apiReportedSuccess) {
                setEvent(res.body?.data ?? { ...event, status: 'CANCELLED' });
                setCancelOpen(false); setCancelReason(''); setCancelConfirm('');
            } else setError(res.message || "L'annulation a échoué.");
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setCancelling(false); }
    };

    const st = event ? statusInfo('event', event.status) : null;

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={() => navigate('/events/organizer')} />
                <h1 className="text-lg font-semibold text-ink flex-1">{isEdit ? 'Modifier l\'événement' : 'Créer un événement'}</h1>
                {st && <span className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>}
            </div>

            <div className="p-4 space-y-3">
                <label className="block cursor-pointer border border-dashed border-border rounded-card overflow-hidden bg-surface-2 hover:border-primary transition-colors">
                    {posterPreview ? (
                        <div className="relative">
                            <img src={posterPreview} alt="Affiche" className="w-full h-48 object-cover" />
                            <div className="absolute bottom-2 right-2 bg-ink/70 text-surface text-xs px-2 py-1 rounded-pill">
                                {posterFile ? 'Nouvelle affiche · cliquez pour changer' : 'Cliquez pour changer'}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-ink-2">
                            <div className="text-2xl">🖼️</div>
                            <div className="mt-2">Ajouter une affiche</div>
                            <div className="text-xs text-ink-3 mt-1">Format image, ratio conseillé 16/9 ou 4/5</div>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickPoster(e.target.files?.[0] ?? null)}
                    />
                </label>
                {uploadingPoster && <div className="text-xs text-ink-2 text-center">Envoi de l'affiche...</div>}

                <label className="block cursor-pointer border border-dashed border-border rounded-card overflow-hidden bg-surface-2 hover:border-primary transition-colors">
                    {videoPreview ? (
                        <div className="relative">
                            <video src={videoPreview} className="w-full h-40 object-cover bg-ink" muted playsInline controls={false} />
                            <div className="absolute bottom-2 right-2 bg-ink/70 text-surface text-xs px-2 py-1 rounded-pill">
                                {videoFile ? 'Nouvelle vidéo · cliquez pour changer' : 'Cliquez pour changer'}
                            </div>
                            {videoFile && (
                                <div className="absolute top-2 left-2 bg-ink/70 text-surface text-[10px] px-2 py-1 rounded-pill">
                                    {(videoFile.size / 1024 / 1024).toFixed(1)} Mo
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-sm text-ink-2">
                            <div className="text-2xl">🎬</div>
                            <div className="mt-2">Ajouter une vidéo promo (optionnel)</div>
                            <div className="text-xs text-ink-3 mt-1">MP4, MOV ou WebM · 30 Mo max</div>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/*"
                        className="hidden"
                        onChange={(e) => pickVideo(e.target.files?.[0] ?? null)}
                    />
                </label>
                {uploadingVideo && <div className="text-xs text-ink-2 text-center">Envoi de la vidéo...</div>}

                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" className={inputClass} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass}
                    >
                        <option value="concert">Concert</option>
                        <option value="conference">Conférence</option>
                        <option value="formation">Formation</option>
                        <option value="sport">Sport</option>
                        <option value="festival">Festival</option>
                        <option value="salon">Salon / Exposition</option>
                        <option value="religieux">Religieux</option>
                        <option value="autre">Autre</option>
                    </select>
                    <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={inputClass}
                    >
                        <option value="CM">Cameroun</option>
                        <option value="CI">Côte d'Ivoire</option>
                        <option value="SN">Sénégal</option>
                        <option value="BJ">Bénin</option>
                        <option value="TG">Togo</option>
                        <option value="BF">Burkina Faso</option>
                        <option value="ML">Mali</option>
                        <option value="GN">Guinée</option>
                        <option value="CD">RD Congo</option>
                        <option value="CG">Congo-Brazzaville</option>
                        <option value="GA">Gabon</option>
                        <option value="TD">Tchad</option>
                        <option value="NE">Niger</option>
                    </select>
                </div>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className={inputClass} />
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Lieu" className={inputClass} />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-ink-2">Début<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${inputClass} mt-1`} /></label>
                    <label className="text-xs text-ink-2">Fin<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={`${inputClass} mt-1`} /></label>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={resaleEnabled} onChange={(e) => setResaleEnabled(e.target.checked)} />
                    Autoriser la revente entre utilisateurs
                </label>
                {resaleEnabled && (
                    <label className="flex items-center gap-2 text-sm text-ink-2">
                        Prix maximum de revente (%)
                        <input type="number" min="100" max="500" value={maxResalePricePct} onChange={(e) => setMaxResalePricePct(e.target.value)} className="w-24 bg-surface border border-border rounded-tile px-2 py-1 text-sm text-ink outline-none focus:border-primary" />
                    </label>
                )}
                <button onClick={save} disabled={submitting} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors disabled:opacity-60">{submitting ? '...' : isEdit ? 'Enregistrer' : 'Créer'}</button>
                {error && <div className="bg-danger-soft border border-border rounded-tile p-3 text-sm text-danger">{error}</div>}

                {event && (
                    <div className="border-t border-border pt-4 space-y-3">
                        <h2 className="text-base font-semibold text-ink">Types de billets</h2>
                        {ticketTypes.length === 0 ? (
                            <div className="text-sm text-ink-2">Aucun billet créé.</div>
                        ) : (
                            <div className="space-y-2">
                                {ticketTypes.map((tt) => (
                                    <div key={tt._id} className="bg-surface border border-border rounded-card p-3">
                                        <div className="font-medium text-ink">{tt.name}</div>
                                        {tt.description && <div className="text-xs text-ink-2 mt-0.5">{tt.description}</div>}
                                        <div className="text-xs text-ink-2 mt-0.5">{xaf(tt.price)} · {tt.quantitySold}/{tt.quantityTotal} vendus</div>
                                        {(tt.salesStart || tt.salesEnd) && (
                                            <div className="text-[11px] text-ink-3 mt-0.5">
                                                Vente {tt.salesStart ? `du ${new Date(tt.salesStart).toLocaleString('fr-FR')}` : ''}
                                                {tt.salesEnd ? ` jusqu'au ${new Date(tt.salesEnd).toLocaleString('fr-FR')}` : ''}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <input value={ttName} onChange={(e) => setTtName(e.target.value)} placeholder="Nom (ex: VIP)" className={`${inputClass} col-span-2`} />
                            <textarea value={ttDescription} onChange={(e) => setTtDescription(e.target.value)} placeholder="Description du billet (optionnel)" rows={2} className={`${inputClass} col-span-2`} />
                            <input value={ttPrice} onChange={(e) => setTtPrice(e.target.value)} placeholder="Prix XAF" type="number" className={inputClass} />
                            <input value={ttQuantity} onChange={(e) => setTtQuantity(e.target.value)} placeholder="Quantité" type="number" className={inputClass} />
                            <input value={ttMax} onChange={(e) => setTtMax(e.target.value)} placeholder="Max/commande" type="number" className={`${inputClass} col-span-2`} />
                            <label className="text-xs text-ink-2">Début de vente (optionnel)<input type="datetime-local" value={ttSalesStart} onChange={(e) => setTtSalesStart(e.target.value)} className={`${inputClass} mt-1`} /></label>
                            <label className="text-xs text-ink-2">Fin de vente (optionnel)<input type="datetime-local" value={ttSalesEnd} onChange={(e) => setTtSalesEnd(e.target.value)} className={`${inputClass} mt-1`} /></label>
                        </div>
                        <button onClick={addTicketType} className="w-full bg-surface border border-primary text-primary font-semibold py-2 rounded-tile">Ajouter ce type de billet</button>

                        {event.status === 'DRAFT' && (
                            <button onClick={publish} disabled={ticketTypes.length === 0} className="w-full bg-success text-white font-semibold py-3 rounded-tile disabled:bg-surface-2 disabled:text-ink-3">Publier l'événement</button>
                        )}
                        {event.status === 'PUBLISHED' && (
                            <button onClick={() => navigate(`/events/organizer/${event._id}/scanner`)} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors">📱 Scanner les billets</button>
                        )}
                        {(event.status === 'PUBLISHED' || event.status === 'COMPLETED') && (
                            <>
                                <button
                                    onClick={() => navigate(`/events/organizer/${event._id}/participants`)}
                                    className="w-full bg-surface border border-primary text-primary font-semibold py-2 rounded-tile"
                                >
                                    Voir les participants
                                </button>
                                <a
                                    href={sbcApiService.getEventParticipantsCsvUrl(event._id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-center w-full bg-surface border border-border text-ink-2 font-medium py-2 rounded-tile text-sm"
                                >
                                    Exporter les participants (CSV)
                                </a>
                            </>
                        )}

                        {event.status === 'PUBLISHED' && (
                            <div className="border-t border-border pt-4">
                                {!cancelOpen ? (
                                    <button onClick={() => setCancelOpen(true)} className="w-full bg-surface border border-danger text-danger font-semibold py-2 rounded-tile">
                                        Annuler l'événement
                                    </button>
                                ) : (
                                    <div className="bg-danger-soft border border-danger rounded-card p-4 space-y-3">
                                        <div className="text-sm font-semibold text-danger">Annuler définitivement cet événement ?</div>
                                        <p className="text-xs text-ink-2">
                                            Cette action est <strong>irréversible</strong>. Tous les billets vendus seront annulés et
                                            <strong> chaque acheteur sera intégralement remboursé</strong>. L'événement disparaîtra de la
                                            billetterie et les reventes en cours seront retirées.
                                        </p>
                                        <textarea
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            rows={2}
                                            placeholder="Motif de l'annulation (communiqué aux acheteurs)"
                                            className={inputClass}
                                        />
                                        <label className="block text-xs text-ink-2">
                                            Tapez <strong className="text-danger">{CANCEL_WORD}</strong> pour confirmer
                                            <input
                                                value={cancelConfirm}
                                                onChange={(e) => setCancelConfirm(e.target.value)}
                                                placeholder={CANCEL_WORD}
                                                className={`${inputClass} mt-1`}
                                            />
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setCancelOpen(false); setCancelConfirm(''); }}
                                                className="flex-1 bg-surface border border-border text-ink-2 font-medium py-2 rounded-tile text-sm"
                                            >
                                                Revenir
                                            </button>
                                            <button
                                                onClick={cancelEvent}
                                                disabled={cancelling || cancelConfirm.trim().toUpperCase() !== CANCEL_WORD}
                                                className="flex-1 bg-danger text-white font-semibold py-2 rounded-tile text-sm disabled:opacity-50"
                                            >
                                                {cancelling ? '...' : "Annuler et rembourser"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {event.status === 'CANCELLED' && (
                            <div className="bg-danger-soft border border-border rounded-card p-3 text-sm text-danger">
                                Cet événement est annulé. Les remboursements des acheteurs ont été déclenchés.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
