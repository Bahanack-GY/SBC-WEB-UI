import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ok } from '../test/api';
import { _resetBanReports, ACCOUNT_BANNED_EVENT } from './security/accountBanned';

/** A withdrawal refused because the account was just suspended (403 ACCOUNT_BANNED). */

const api = vi.hoisted(() => ({
    getPendingWithdrawals: vi.fn(),
    initiateUnifiedWithdrawal: vi.fn(),
    verifyWithdrawal: vi.fn(),
    cancelWithdrawal: vi.fn(),
    getAuthenticatorStatus: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
// Stable objects: the sheet resets itself whenever `user` changes.
const auth = vi.hoisted(() => ({
    user: { _id: 'u1', country: 'CM', balance: 20000, usdBalance: 0, momoNumber: '237670000000', momoOperator: 'MTN_MOMO_CMR' },
    refreshUser: () => Promise.resolve(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import UnifiedWithdrawalComponent from './UnifiedWithdrawalComponent';

function Suspended() {
    const { state } = useLocation();
    return <div>Écran compte suspendu : {(state as { message?: string } | null)?.message}</div>;
}

const onClose = vi.fn();
const open = () => render(
    <MemoryRouter initialEntries={['/money']}>
        <Routes>
            <Route path="/money" element={<UnifiedWithdrawalComponent isOpen onClose={onClose} onWithdrawalComplete={vi.fn()} />} />
            <Route path="/compte-suspendu" element={<Suspended />} />
        </Routes>
    </MemoryRouter>,
);

beforeEach(() => {
    vi.clearAllMocks();
    _resetBanReports();
    sessionStorage.clear();
    api.getPendingWithdrawals.mockResolvedValue(ok({ transactions: [] }));
});

describe('withdrawal refused with ACCOUNT_BANNED', () => {
    it('opens /compte-suspendu (no error text in the sheet) and tells the app to forget the session', async () => {
        api.initiateUnifiedWithdrawal.mockResolvedValue({
            statusCode: 403, isSuccessByStatusCode: false, apiReportedSuccess: false, message: 'Compte suspendu.',
            body: { success: false, code: 'ACCOUNT_BANNED', message: 'Compte suspendu.' },
        });
        const events: Event[] = [];
        const onBanned = (e: Event) => events.push(e);
        window.addEventListener(ACCOUNT_BANNED_EVENT, onBanned);

        open();
        await userEvent.click(await screen.findByRole('button', { name: /Mobile Money/ }));
        await userEvent.type(screen.getByPlaceholderText(/Minimum: 1500 XAF/), '5000');
        await userEvent.click(screen.getByRole('button', { name: /Initiate Withdrawal/ }));

        expect(await screen.findByText('Écran compte suspendu : Compte suspendu.')).toBeInTheDocument();
        expect(api.initiateUnifiedWithdrawal).toHaveBeenCalledWith(5000, 'mobile_money');
        expect(onClose).toHaveBeenCalled();
        expect(events).toHaveLength(1);
        window.removeEventListener(ACCOUNT_BANNED_EVENT, onBanned);
    });

    it('a RISK_HOLD refusal stays in the sheet with the identity-check link', async () => {
        api.initiateUnifiedWithdrawal.mockResolvedValue({
            statusCode: 403, isSuccessByStatusCode: false, apiReportedSuccess: false, message: 'Retrait bloqué.',
            body: { success: false, code: 'RISK_HOLD', message: 'Retrait bloqué.' },
        });
        open();
        await userEvent.click(await screen.findByRole('button', { name: /Mobile Money/ }));
        await userEvent.type(screen.getByPlaceholderText(/Minimum: 1500 XAF/), '5000');
        await userEvent.click(screen.getByRole('button', { name: /Initiate Withdrawal/ }));
        expect(await screen.findByText('Retrait bloqué.')).toBeInTheDocument();
        expect(screen.queryByText(/Écran compte suspendu/)).toBeNull();
    });
});
