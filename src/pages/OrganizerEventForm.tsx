import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

const toInputDate = (iso?: string) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

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
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<any>(null);
    const [ticketTypes, setTicketTypes] = useState<any[]>([]);

    // New ticket type form (only shown after event exists)
    const [ttName, setTtName] = useState('');
    const [ttPrice, setTtPrice] = useState('');
    const [ttQuantity, setTtQuantity] = useState('');
    const [ttMax, setTtMax] = useState('10');

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
                }
            });
            sbcApiService.listEventTicketTypes(id).then((r) => r.apiReportedSuccess && setTicketTypes(r.body?.data || []));
        }
    }, [id, isEdit]);

    const pickPoster = (f: File | null) => {
        setPosterFile(f);
        setPosterPreview(f ? URL.createObjectURL(f) : (posterFileId ? sbcApiService.generateThumbnailUrl(posterFileId, 512) : ''));
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
        const res = await sbcApiService.createEventTicketType(event._id, {
            name: ttName.trim(),
            price: parseFloat(ttPrice),
            quantityTotal: parseInt(ttQuantity, 10),
            maxPerOrder: parseInt(ttMax, 10),
        });
        if (res.apiReportedSuccess) {
            setTicketTypes((prev) => [...prev, res.body?.data]);
            setTtName(''); setTtPrice(''); setTtQuantity(''); setTtMax('10');
        } else { setError(res.message || 'Impossible d\'ajouter le billet.'); }
    };

    const publish = async () => {
        if (!event) return;
        const res = await sbcApiService.publishOrganizerEvent(event._id);
        if (res.apiReportedSuccess) { setEvent(res.body?.data); }
        else setError(res.message || 'Impossible de publier.');
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate('/events/organizer')} />
                <h1 className="text-lg font-semibold">{isEdit ? 'Modifier l\'événement' : 'Créer un événement'}</h1>
            </div>

            <div className="p-4 space-y-3">
                <label className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 hover:border-[#115CF6] transition">
                    {posterPreview ? (
                        <div className="relative">
                            <img src={posterPreview} alt="Affiche" className="w-full h-48 object-cover" />
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                {posterFile ? 'Nouvelle affiche · cliquez pour changer' : 'Cliquez pour changer'}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-gray-500">
                            <div className="text-2xl">🖼️</div>
                            <div className="mt-2">Ajouter une affiche</div>
                            <div className="text-xs text-gray-400 mt-1">Format image, ratio conseillé 16/9 ou 4/5</div>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickPoster(e.target.files?.[0] ?? null)}
                    />
                </label>
                {uploadingPoster && <div className="text-xs text-gray-500 text-center">Envoi de l'affiche...</div>}

                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white"
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
                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white"
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
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Lieu" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">Début<input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></label>
                    <label className="text-xs text-gray-500">Fin<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mt-1" /></label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={resaleEnabled} onChange={(e) => setResaleEnabled(e.target.checked)} />
                    Autoriser la revente entre utilisateurs
                </label>
                {resaleEnabled && (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        Prix maximum de revente (%)
                        <input type="number" min="100" max="500" value={maxResalePricePct} onChange={(e) => setMaxResalePricePct(e.target.value)} className="w-24 border border-gray-300 rounded-xl px-2 py-1 text-sm" />
                    </label>
                )}
                <button onClick={save} disabled={submitting} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">{submitting ? '...' : isEdit ? 'Enregistrer' : 'Créer'}</button>
                {error && <div className="text-red-600 text-sm">{error}</div>}

                {event && (
                    <div className="border-t pt-4 space-y-3">
                        <h2 className="text-base font-semibold">Types de billets</h2>
                        {ticketTypes.length === 0 ? (
                            <div className="text-sm text-gray-500">Aucun billet créé.</div>
                        ) : (
                            <div className="space-y-2">
                                {ticketTypes.map((tt) => (
                                    <div key={tt._id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{tt.name}</div>
                                            <div className="text-xs text-gray-500">{tt.price.toLocaleString('fr-FR')} XAF · {tt.quantitySold}/{tt.quantityTotal} vendus</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <input value={ttName} onChange={(e) => setTtName(e.target.value)} placeholder="Nom (ex: VIP)" className="border border-gray-300 rounded-xl px-3 py-2 text-sm col-span-2" />
                            <input value={ttPrice} onChange={(e) => setTtPrice(e.target.value)} placeholder="Prix XAF" type="number" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                            <input value={ttQuantity} onChange={(e) => setTtQuantity(e.target.value)} placeholder="Quantité" type="number" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                            <input value={ttMax} onChange={(e) => setTtMax(e.target.value)} placeholder="Max/commande" type="number" className="border border-gray-300 rounded-xl px-3 py-2 text-sm col-span-2" />
                        </div>
                        <button onClick={addTicketType} className="w-full border border-[#115CF6] text-[#115CF6] font-semibold py-2 rounded-xl">Ajouter ce type de billet</button>

                        {event.status === 'DRAFT' && (
                            <button onClick={publish} disabled={ticketTypes.length === 0} className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl disabled:bg-gray-300">Publier l'événement</button>
                        )}
                        {event.status === 'PUBLISHED' && (
                            <button onClick={() => navigate(`/events/organizer/${event._id}/scanner`)} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">📱 Scanner les billets</button>
                        )}
                        {(event.status === 'PUBLISHED' || event.status === 'COMPLETED') && (
                            <a
                                href={sbcApiService.getEventParticipantsCsvUrl(event._id)}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-center w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-xl text-sm"
                            >
                                Exporter les participants (CSV)
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
