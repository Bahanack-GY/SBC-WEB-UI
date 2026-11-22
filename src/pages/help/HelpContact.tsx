import { HugeiconsIcon } from '@hugeicons/react';
import { Call02Icon, InformationCircleIcon, LockIcon, Mail01Icon, UserIdVerificationIcon } from '@hugeicons/core-free-icons';
import { Card, HelpPage, RowLink } from './ui';

/**
 * Changing the email or phone. A member who still receives codes uses the
 * secure flow that already exists (password + code sent to the new contact);
 * one who lost access sends an ID + selfie (KYC level 3, /aide/identite).
 */
export default function HelpContact() {
    return (
        <HelpPage title="Changer mon email ou téléphone">
            <Card title="Vous avez encore accès à votre email et à votre téléphone" icon={LockIcon}>
                <p className="text-sm text-ink-2">
                    Faites le changement vous-même, en sécurité, en quelques minutes :
                </p>
                <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-ink-2">
                    <li>vous confirmez avec votre mot de passe ;</li>
                    <li>un code est envoyé à la <strong>nouvelle</strong> adresse ou au <strong>nouveau</strong> numéro ;</li>
                    <li>vous saisissez ce code : le changement est fait.</li>
                </ol>
                <div className="mt-3 space-y-2">
                    <RowLink to="/modifier-email" icon={Mail01Icon} title="Changer mon email" />
                    <RowLink to="/change-phone" icon={Call02Icon} title="Changer mon numéro de téléphone" />
                </div>
            </Card>

            <div className="flex items-start gap-2 rounded-tile bg-accent-soft p-3 text-xs text-ink-2">
                <HugeiconsIcon icon={InformationCircleIcon} size={18} className="text-accent shrink-0" />
                <p>
                    Pour votre sécurité, après un changement, l’ancienne adresse ou l’ancien numéro reçoit une alerte et les
                    retraits sont suspendus pendant 48 heures. Si ce n’est pas vous qui avez fait le changement, écrivez
                    tout de suite à un agent.
                </p>
            </div>

            <Card title="Je n’ai plus accès à mon email ou à mon téléphone" icon={UserIdVerificationIcon}>
                <p className="text-sm text-ink-2">
                    Un agent doit d’abord vérifier votre identité : envoyez une photo de votre pièce d’identité et un
                    selfie. Le nouveau contact reçoit ensuite un code de confirmation avant le changement. L’équipe SBC ne
                    vous demandera jamais votre mot de passe ni un code reçu par SMS ou email.
                </p>
                <div className="mt-3">
                    <RowLink
                        to="/aide/identite?motif=lost_access"
                        icon={UserIdVerificationIcon}
                        tint="bg-accent-soft text-accent"
                        title="Vérifier mon identité"
                        subtitle="Pièce d’identité + selfie, examinés par un agent"
                    />
                </div>
            </Card>
        </HelpPage>
    );
}
