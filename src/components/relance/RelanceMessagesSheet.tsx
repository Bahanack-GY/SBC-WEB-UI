import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from './ui/Sheet';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { useAuth } from '../../contexts/AuthContext';

type DefaultMessage = { dayNumber: number; subject: string; text: string };

const SAMPLE_FILLEUL = 'Marie';

const fill = (s: string, referrerName: string, day: number) =>
  s.replace(/\{\{name\}\}/g, SAMPLE_FILLEUL).replace(/\{\{referrerName\}\}/g, referrerName).replace(/\{\{day\}\}/g, String(day));

/** The 7 SBC messages, one day at a time, as a filleul named Marie would read them. */
export function RelanceMessagesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [day, setDay] = useState(1);
  const messages = useQuery({
    queryKey: ['relance', 'default-messages'],
    queryFn: async (): Promise<DefaultMessage[]> => handleApiResponse(await sbcApiService.relanceGetDefaultMessages()) ?? [],
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const list = messages.data ?? [];
  const current = list.find(m => m.dayNumber === day) ?? list[0];
  const referrerName = user?.name?.trim() || 'Votre parrain';

  return (
    <Sheet open={open} onClose={onClose} title="Les messages envoyés">
      {messages.isLoading ? (
        <div className="h-48 rounded-tile bg-surface-2 animate-pulse" />
      ) : messages.isError || !current ? (
        <p className="text-sm text-ink-3 text-center py-6">Messages indisponibles pour le moment.</p>
      ) : (
        <div className="space-y-3">
          <div role="tablist" aria-label="Jour" className="flex gap-1.5 overflow-x-auto">
            {list.map(m => (
              <button
                key={m.dayNumber}
                role="tab"
                aria-selected={m.dayNumber === current.dayNumber}
                onClick={() => setDay(m.dayNumber)}
                className={`shrink-0 h-9 min-w-10 px-3 rounded-pill text-sm font-semibold ${m.dayNumber === current.dayNumber ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2'}`}
              >
                J{m.dayNumber}
              </button>
            ))}
          </div>
          <article role="tabpanel" className="rounded-tile border border-border p-4">
            <h3 className="font-semibold text-ink">{fill(current.subject, referrerName, current.dayNumber)}</h3>
            <p className="mt-2 text-sm text-ink-2 whitespace-pre-line">{fill(current.text, referrerName, current.dayNumber)}</p>
          </article>
          <p className="text-xs text-ink-3 text-center">Exemple pour une filleule nommée {SAMPLE_FILLEUL}.</p>
        </div>
      )}
    </Sheet>
  );
}
