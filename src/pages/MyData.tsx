import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    ArrowRight01Icon, Call02Icon, ContactBookIcon, Delete02Icon, Download01Icon, Mail01Icon, Notification01Icon,
    PencilEdit01Icon, Shield01Icon,
} from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import { ConfirmSheet } from '../components/relance/ui/ConfirmSheet';
import TermsLink from '../components/common/TermsLink';
import { Switch } from '../components/relance/ui/Switch';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { getToken, handleApiResponse } from '../utils/apiHelpers';
import { PRIVACY_POLICY_VERSION, type ConsentRecord } from '../utils/privacy';
import { fcfa } from '../lib/utils';
import { headerDrop, pageFade } from '../utils/motion';

const EMAIL = 'reseautage.sbc@gmail.com';
const EXPORT_FILE = 'mes-donnees-sbc.json';

const dateFr = (iso?: string) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
};

/**
 * Where a member exercises the rights listed in the privacy policy (APDP):
 * see what they accepted, download their data, correct it, leave the contacts
 * file, choose notifications, or delete the account.
 */
export default function MyData() {
    const { user, updateProfile, logout } = useAuth();
    const navigate = useNavigate();

    // ---------- download ----------
    const [download, setDownload] = useState<{ state: 'idle' | 'busy' | 'done' | 'error' }>({ state: 'idle' });
    const downloadData = async () => {
        setDownload({ state: 'busy' });
        try {
            const token = getToken();
            const res = await fetch(sbcApiService.getDataExportUrl(), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = EXPORT_FILE;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            setDownload({ state: 'done' });
        } catch {
            setDownload({ state: 'error' });
        }
    };

    // ---------- contacts file ----------
    const [sharing, setSharing] = useState<boolean | null>(null);
    const [sharingBusy, setSharingBusy] = useState(false);
    const [sharingError, setSharingError] = useState(false);
    const shareOn = sharing ?? user?.shareContactInfo !== false;
    const toggleSharing = async (next: boolean) => {
        setSharing(next);
        setSharingBusy(true);
        setSharingError(false);
        try {
            await updateProfile({ shareContactInfo: next });
        } catch {
            setSharing(!next);
            setSharingError(true);
        } finally {
            setSharingBusy(false);
        }
    };

    // ---------- deletion ----------
    const [deleting, setDeleting] = useState(false);
    const [password, setPassword] = useState('');
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const closeDelete = () => { if (!deleteBusy) { setDeleting(false); setPassword(''); setDeleteError(null); } };
    const deleteAccount = async () => {
        if (deleteBusy) return;
        if (!password) { setDeleteError('Tapez votre mot de passe pour confirmer.'); return; }
        setDeleteBusy(true);
        setDeleteError(null);
        try {
            handleApiResponse(await sbcApiService.deleteMyAccount(password));
        } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            // handleApiResponse turns any 401 into a login message; here it can only mean the password.
            setDeleteError(!msg ? 'La suppression n’a pas marché. Réessayez dans un instant.'
                : /mot de passe ou email/i.test(msg) ? 'Mot de passe incorrect.' : msg);
            setDeleteBusy(false);
            return;
        }
        await logout();
        navigate('/connexion', { replace: true });
    };

    const consents = user?.consents;
    const balance = typeof user?.balance === 'number' && user.balance > 0 ? user.balance : 0;

    return (
        <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-10">
            <motion.header variants={headerDrop} className="flex items-center gap-2 px-4 py-3">
                <BackButton />
                <h1 className="text-lg font-semibold text-ink">Mes données personnelles</h1>
            </motion.header>

            <div className="px-4 space-y-4 max-w-xl mx-auto">
                <p className="text-sm text-ink-2">
                    Ici, vous gardez la main sur vos données : voir ce que vous avez accepté, les télécharger, les
                    corriger, choisir ce qui est partagé, ou supprimer votre compte. Tout est expliqué dans la{' '}
                    <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.
                </p>

                <Card title="Vos accords" icon={Shield01Icon}>
                    <ul className="space-y-2 text-sm">
                        <ConsentLine label="Conditions d’utilisation et politique de confidentialité" record={consents?.privacy}
                            outdated={!!consents?.privacy && consents.privacy.version !== PRIVACY_POLICY_VERSION} />
                        <ConsentLine label="Hébergement et traitement de mes données hors du Bénin (serveurs en Allemagne)" record={consents?.dataTransfer} />
                    </ul>
                    <p className="mt-3 text-xs text-ink-3">
                        Pour retirer votre accord, supprimez votre compte (en bas de cette page).
                    </p>
                </Card>

                <Card title="Télécharger mes données" icon={Download01Icon}>
                    <p className="text-sm text-ink-2">
                        Un fichier avec toutes les données que SBC a sur vous, au format JSON : lisible, et réutilisable
                        par un autre service.
                    </p>
                    <button type="button" onClick={downloadData} disabled={download.state === 'busy'}
                        className="mt-3 w-full h-11 rounded-pill bg-primary text-white text-sm font-semibold disabled:opacity-60">
                        {download.state === 'busy' ? 'Préparation du fichier…' : 'Télécharger mes données'}
                    </button>
                    {download.state === 'done' && <p className="mt-2 text-xs text-success">Fichier enregistré : {EXPORT_FILE}</p>}
                    {download.state === 'error' && (
                        <p role="alert" className="mt-2 text-xs text-danger">Le téléchargement n’a pas marché. Vérifiez votre connexion et réessayez.</p>
                    )}
                </Card>

                <Card title="Corriger mes informations" icon={PencilEdit01Icon}>
                    <div className="divide-y divide-border -my-1">
                        <RowLink to="/modifier-le-profil" icon={PencilEdit01Icon}>Modifier mon profil</RowLink>
                        <RowLink to="/modifier-email" icon={Mail01Icon}>Modifier mon email</RowLink>
                        <RowLink to="/change-phone" icon={Call02Icon}>Changer mon numéro WhatsApp</RowLink>
                    </div>
                </Card>

                <Card title="Fichier de contacts SBC" icon={ContactBookIcon}>
                    <div className="flex items-center gap-3">
                        <span className="flex-1 text-sm font-medium text-ink">Partager mes coordonnées dans le fichier de contacts SBC</span>
                        <Switch checked={shareOn} onChange={toggleSharing} disabled={sharingBusy || !user}
                            label="Partager mes coordonnées dans le fichier de contacts SBC" />
                    </div>
                    <p className="mt-2 text-xs text-ink-3">
                        {shareOn
                            ? 'Activé : votre nom et votre numéro WhatsApp figurent dans le fichier de contacts que SBC partage avec les membres, pour qu’ils vous ajoutent et voient vos statuts.'
                            : 'Désactivé : vous ne figurez plus dans le fichier de contacts partagé avec les membres.'}
                    </p>
                    {sharingError && <p role="alert" className="mt-2 text-xs text-danger">Ce réglage n’a pas pu être enregistré. Réessayez.</p>}
                </Card>

                <Card title="Notifications" icon={Notification01Icon}>
                    <div className="-my-1">
                        <RowLink to="/notifications/reglages" icon={Notification01Icon}>Choisir les notifications que je reçois</RowLink>
                    </div>
                </Card>

                <Card title="Supprimer mon compte" icon={Delete02Icon} danger>
                    <p className="text-sm text-ink-2">
                        La suppression est <strong>définitive</strong> : votre compte et vos données sont effacés, et vous
                        ne pourrez plus vous connecter. <strong>Le solde de votre compte est perdu</strong>
                        {balance > 0 ? <> ({fcfa(balance)}) : pensez à le retirer avant.</> : '.'}
                    </p>
                    <button type="button" onClick={() => setDeleting(true)}
                        className="mt-3 w-full h-11 rounded-pill bg-danger-soft text-danger text-sm font-semibold">
                        Supprimer mon compte
                    </button>
                </Card>

                <section className="text-xs text-ink-3 space-y-2 pb-4">
                    <p>
                        Une question, ou une demande que vous ne pouvez pas faire ici ? Écrivez-nous à{' '}
                        <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a> : nous répondons dans un délai d’un mois.
                    </p>
                    <p>
                        Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à
                        l’Autorité de Protection des Données à caractère Personnel du Bénin (APDP) :{' '}
                        <a href="https://apdp.bj" target="_blank" rel="noopener noreferrer" className="text-primary underline">apdp.bj</a>.
                    </p>
                    <p className="flex flex-wrap gap-x-3 gap-y-1">
                        <Link to="/confidentialite" className="text-primary underline">Politique de confidentialité</Link>
                        <Link to="/mentions-legales" className="text-primary underline">Mentions légales</Link>
                        <TermsLink className="text-primary underline">Conditions d’utilisation</TermsLink>
                    </p>
                </section>
            </div>

            <ConfirmSheet
                open={deleting}
                title="Supprimer votre compte ?"
                message={`C’est définitif : votre compte et vos données sont effacés, et votre solde${balance > 0 ? ` de ${fcfa(balance)}` : ''} est perdu. Tapez votre mot de passe pour confirmer.`}
                confirmLabel="Supprimer définitivement"
                danger
                busy={deleteBusy}
                onConfirm={deleteAccount}
                onCancel={closeDelete}
            >
                <label className="mt-3 block text-sm font-medium text-ink" htmlFor="delete-password">Mot de passe</label>
                <input id="delete-password" type="password" autoComplete="current-password" value={password}
                    onChange={(e) => { setPassword(e.target.value); setDeleteError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void deleteAccount(); }}
                    className="mt-1 w-full h-11 rounded-tile border border-border bg-surface px-3 text-[15px] text-ink focus:outline-none focus:border-primary" />
                {deleteError && <p role="alert" className="mt-2 text-sm text-danger">{deleteError}</p>}
            </ConfirmSheet>
        </motion.div>
    );
}

function Card({ title, icon, danger, children }: { title: string; icon: typeof Shield01Icon; danger?: boolean; children: ReactNode }) {
    return (
        <section aria-label={title} className="bg-surface border border-border rounded-card p-4">
            <h2 className={`flex items-center gap-2 font-semibold mb-2 ${danger ? 'text-danger' : 'text-ink'}`}>
                <HugeiconsIcon icon={icon} size={20} className={danger ? 'text-danger' : 'text-primary'} />
                {title}
            </h2>
            {children}
        </section>
    );
}

function RowLink({ to, icon, children }: { to: string; icon: typeof Shield01Icon; children: ReactNode }) {
    return (
        <Link to={to} className="flex items-center gap-3 py-3 text-sm text-ink">
            <HugeiconsIcon icon={icon} size={18} className="text-ink-3" />
            <span className="flex-1">{children}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3" />
        </Link>
    );
}

function ConsentLine({ label, record, outdated }: { label: string; record?: ConsentRecord; outdated?: boolean }) {
    const date = dateFr(record?.acceptedAt);
    return (
        <li className="flex flex-col">
            <span className="text-ink">{label}</span>
            <span className={`text-xs ${record && !outdated ? 'text-success' : 'text-ink-3'}`}>
                {record
                    ? `${date ? `Accepté le ${date}` : 'Accepté'}${record.version ? ` (version ${record.version})` : ''}${outdated ? ' — une nouvelle version vous sera proposée' : ''}`
                    : 'Pas encore accepté'}
            </span>
        </li>
    );
}
