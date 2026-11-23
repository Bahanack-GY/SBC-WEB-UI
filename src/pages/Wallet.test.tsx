import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderPage } from '../test/api';
import { _resetBanReports } from '../components/security/accountBanned';

/** The Wallet withdrawal form, refused because the account was just suspended (403 ACCOUNT_BANNED). */

const api = vi.hoisted(() => {
    const known: Record<string, ReturnType<typeof vi.fn>> = { initiateUnifiedWithdrawal: vi.fn() };
    // Every other call the page makes answers an empty success.
    const fallback = new Map<string, ReturnType<typeof vi.fn>>();
    return new Proxy(known, {
        get(target, prop: string) {
            if (prop in target) return target[prop];
            if (!fallback.has(prop)) {
                fallback.set(prop, vi.fn(async () => ({ statusCode: 200, isSuccessByStatusCode: true, apiReportedSuccess: true, body: { success: true, data: null } })));
            }
            return fallback.get(prop);
        },
    });
});
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
// Stable objects: effects of the page depend on `user`.
const auth = vi.hoisted(() => ({
    user: { _id: 'u1', country: 'CM', balance: 20000, usdBalance: 0, momoNumber: '237670000000', momoOperator: 'MTN_MOMO_CMR' },
    isAuthenticated: true,
    loading: false,
    refreshUser: () => Promise.resolve(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/common/TourButton', () => ({ default: () => null }));

import Wallet from './Wallet';

// jsdom has no ResizeObserver; the page's chart (recharts) needs one.
if (!('ResizeObserver' in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
        observe() { /* noop */ }
        unobserve() { /* noop */ }
        disconnect() { /* noop */ }
    };
}

function Suspended() {
    const { state } = useLocation();
    return <div>Écran compte suspendu : {(state as { message?: string } | null)?.message}</div>;
}

beforeEach(() => {
    vi.clearAllMocks();
    _resetBanReports();
    sessionStorage.clear();
});

describe('Wallet withdrawal refused with ACCOUNT_BANNED', () => {
    it('opens /compte-suspendu instead of a modal', async () => {
        api.initiateUnifiedWithdrawal.mockResolvedValue({
            statusCode: 403, isSuccessByStatusCode: false, apiReportedSuccess: false, message: 'Compte suspendu.',
            body: { success: false, code: 'ACCOUNT_BANNED', message: 'Compte suspendu.' },
        });
        renderPage(
            <Routes>
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/compte-suspendu" element={<Suspended />} />
            </Routes>,
            '/wallet',
        );
        await userEvent.click((await screen.findAllByRole('button', { name: /^Retrait$/ }))[0]);
        await userEvent.type(await screen.findByPlaceholderText('Montant en FCFA'), '5000{Enter}');

        expect(await screen.findByText('Écran compte suspendu : Compte suspendu.')).toBeInTheDocument();
        expect(api.initiateUnifiedWithdrawal).toHaveBeenCalledWith(5000, 'mobile_money');
    });
});
