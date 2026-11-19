import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ supportWithdrawals: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpWithdrawals from './HelpWithdrawals';

describe('Aide: my withdrawals', () => {
    it('links each withdrawal by the id support-service sends, with its plain-French status', async () => {
        // Shape of support-service GET /me/withdrawals (CONTRACT §3.2): the reference is `id`.
        api.supportWithdrawals.mockResolvedValue(ok([
            { id: 'TXREFUSED1', amount: 2562.5, currency: 'XAF', businessStatus: 'REJECTED', statusLabel: 'Refusé', explanation: 'Rien n’a été envoyé.' },
            { id: 'TXDONE2', amount: 5125, currency: 'XAF', businessStatus: 'SUCCEEDED' },
        ]));
        renderPage(<HelpWithdrawals />, '/aide/retraits');
        const refused = await screen.findByRole('link', { name: /Refusé/ });
        expect(refused).toHaveAttribute('href', '/aide/retraits/TXREFUSED1');
        expect(screen.getByRole('link', { name: /Retrait effectué/ })).toHaveAttribute('href', '/aide/retraits/TXDONE2');
        expect(screen.queryByText(/En cours/)).not.toBeInTheDocument();
    });
});
