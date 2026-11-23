import { useEffect } from 'react';
import { dismissSafetyNotice, stopRemoteControl, useAssistState } from '../../services/remoteAssist';

/**
 * Always on top while the support team assists the member live (services/remoteAssist.ts):
 * - control granted → red banner with « Arrêter » (the member can end it at any time);
 * - an agent watching → a small note;
 * - control ended on a sensitive screen → a short notice.
 */
export default function RemoteAssistBanner() {
  const { watching, controlled, agentName, endedForSafety } = useAssistState();

  useEffect(() => {
    if (!endedForSafety) return;
    const t = setTimeout(dismissSafetyNotice, 6000);
    return () => clearTimeout(t);
  }, [endedForSafety]);

  if (controlled) {
    return (
      <div role="alert" className="fixed top-0 inset-x-0 z-[2147483646] bg-red-600 text-white px-4 py-2.5 flex items-center gap-3 shadow-lg">
        <span className="flex-1 text-sm font-medium">
          {agentName ? `${agentName} (support SBC)` : 'Le support SBC'} contrôle votre écran.
        </span>
        <button type="button" onClick={stopRemoteControl} className="bg-white text-red-700 rounded-lg px-3 py-1.5 text-sm font-semibold">
          Arrêter
        </button>
      </div>
    );
  }
  if (endedForSafety) {
    return (
      <div role="status" className="fixed top-0 inset-x-0 z-[2147483646] bg-gray-900 text-white px-4 py-2.5 text-sm text-center shadow-lg">
        Contrôle à distance arrêté : cette page est protégée, vous seul pouvez l’utiliser.
      </div>
    );
  }
  if (watching) {
    return (
      <div role="status" className="fixed top-2 left-1/2 -translate-x-1/2 z-[2147483646] bg-primary text-white rounded-full px-3 py-1 text-xs shadow">
        Le support SBC voit votre écran pour vous aider
      </div>
    );
  }
  return null;
}
