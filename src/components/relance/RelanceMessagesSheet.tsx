import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from './ui/Sheet';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { useAuth } from '../../contexts/AuthContext';

type DefaultMessage = { dayNumber: number; subject: string; text: string };
type SmsMessage = { type: 'auto' | 'manual'; dayNumber: number; text: string };
type Channel = 'email' | 'sms';

const SAMPLE_FILLEUL = 'Marie';

const fill = (s: string, referrerName: string, day: number) =>
  s.replace(/\{\{name\}\}/g, SAMPLE_FILLEUL).replace(/\{\{referrerName\}\}/g, referrerName).replace(/\{\{day\}\}/g, String(day));

/**
 * The messages relance sends, one day at a time, as a filleul named Marie
 * would read them. SMS (Cameroon only) shows the texts with "ton lien" where
 * the parrain's own link goes.
 */
export function RelanceMessagesSheet({
  open, onClose, showSms = false, smsKind = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  /** Cameroonian parrains also see the SMS texts. */
  showSms?: boolean;
  /** "auto" = relance des nouveaux (J0–J7), "manual" = campagnes (J1–J7). */
  smsKind?: 'auto' | 'manual';
}) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel>('email');
  const [day, setDay] = useState(1);
  const isSms = showSms && channel === 'sms';

  const emails = useQuery({
    queryKey: ['relance', 'default-messages'],
    queryFn: async (): Promise<DefaultMessage[]> => handleApiResponse(await sbcApiService.relanceGetDefaultMessages()) ?? [],
    enabled: open && !isSms,
    staleTime: 10 * 60_000,
  });
  const sms = useQuery({
    queryKey: ['relance', 'sms-messages'],
    queryFn: async (): Promise<SmsMessage[]> => handleApiResponse(await sbcApiService.relanceGetSmsMessages()) ?? [],
    enabled: open && isSms,
    staleTime: 10 * 60_000,
  });

  const active = isSms ? sms : emails;
  const days: number[] = isSms
    ? (sms.data ?? []).filter(m => m.type === smsKind).map(m => m.dayNumber)
    : (emails.data ?? []).map(m => m.dayNumber);
  const shownDay = days.includes(day) ? day : days[0];
  const referrerName = user?.name?.trim() || 'Votre parrain';
  const email = (emails.data ?? []).find(m => m.dayNumber === shownDay);
  const text = (sms.data ?? []).find(m => m.type === smsKind && m.dayNumber === shownDay);

  return (
    <Sheet open={open} onClose={onClose} title="Les messages envoyés">
      {showSms && (
        <div role="radiogroup" aria-label="Canal" className="mb-3 grid grid-cols-2 gap-1 p-1 rounded-pill bg-surface-2">
          {(['email', 'sms'] as const).map(c => (
            <button
              key={c}
              role="radio"
              aria-checked={channel === c}
              // Each channel starts at its first message: SMS at J0 (15 min after signup).
              onClick={() => { setChannel(c); setDay(c === 'sms' ? 0 : 1); }}
              className={`h-9 rounded-pill text-sm font-semibold ${channel === c ? 'bg-surface text-ink' : 'text-ink-3'}`}
            >
              {c === 'email' ? 'Email' : 'SMS'}
            </button>
          ))}
        </div>
      )}

      {active.isLoading ? (
        <div className="h-48 rounded-tile bg-surface-2 animate-pulse" />
      ) : active.isError || shownDay === undefined ? (
        <p className="text-sm text-ink-3 text-center py-6">Messages indisponibles pour le moment.</p>
      ) : (
        <div className="space-y-3">
          <div role="tablist" aria-label="Jour" className="flex gap-1.5 overflow-x-auto">
            {days.map(d => (
              <button
                key={d}
                role="tab"
                aria-selected={d === shownDay}
                onClick={() => setDay(d)}
                className={`shrink-0 h-9 min-w-10 px-3 rounded-pill text-sm font-semibold ${d === shownDay ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2'}`}
              >
                J{d}
              </button>
            ))}
          </div>

          {isSms && text ? (
            <article role="tabpanel" className="rounded-tile border border-border p-4">
              <p className="inline-block max-w-full rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2 text-sm text-ink whitespace-pre-line">
                {text.text.split('{{link}}').map((part, i, all) => (
                  <span key={i}>
                    {part}
                    {i < all.length - 1 && <span className="text-primary font-semibold">ton lien</span>}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-xs text-ink-3">{text.text.replace('{{link}}', '').length} caractères + ton lien</p>
            </article>
          ) : email ? (
            <article role="tabpanel" className="rounded-tile border border-border p-4">
              <h3 className="font-semibold text-ink">{fill(email.subject, referrerName, email.dayNumber)}</h3>
              <p className="mt-2 text-sm text-ink-2 whitespace-pre-line">{fill(email.text, referrerName, email.dayNumber)}</p>
            </article>
          ) : null}

          <p className="text-xs text-ink-3 text-center">
            {isSms ? 'Envoyé aux numéros du Cameroun (+237).' : `Exemple pour une filleule nommée ${SAMPLE_FILLEUL}.`}
          </p>
        </div>
      )}
    </Sheet>
  );
}
