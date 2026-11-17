import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CanalDeVenteCard from './CanalDeVenteCard';

const getCanalDeVente = vi.fn();
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: { getCanalDeVente: () => getCanalDeVente() } }));

const LINK = 'https://canaldevente.sniperbuisnesscenter.com/alice12/237690000001';

describe('Votre canal de vente', () => {
    beforeEach(() => getCanalDeVente.mockReset());

    it('shows the link and copies it', async () => {
        getCanalDeVente.mockResolvedValue({ body: { data: { link: LINK } } });
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        render(<CanalDeVenteCard />);
        expect(await screen.findByTestId('canal-de-vente-link')).toHaveTextContent(LINK);
        fireEvent.click(screen.getByRole('button', { name: /Copier le lien/ }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK));
        expect(await screen.findByRole('button', { name: /Lien copié/ })).toBeInTheDocument();
    });

    it('says the link is on its way when there is none yet', async () => {
        getCanalDeVente.mockResolvedValue({ body: { data: { link: null } } });
        render(<CanalDeVenteCard />);
        expect(await screen.findByText(/en cours de création/)).toBeInTheDocument();
        expect(screen.queryByTestId('canal-de-vente-link')).not.toBeInTheDocument();
    });

    it('never shows a link on another domain', async () => {
        getCanalDeVente.mockResolvedValue({ body: { data: { link: 'https://evil.example.com/x' } } });
        render(<CanalDeVenteCard />);
        expect(await screen.findByText(/en cours de création/)).toBeInTheDocument();
        expect(screen.queryByText(/evil/)).not.toBeInTheDocument();
    });
});
