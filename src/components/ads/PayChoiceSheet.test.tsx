import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayChoiceSheet from './PayChoiceSheet';

describe('Comment payer ?', () => {
  it('says the balance covers it all when it does, and pays with it', async () => {
    const onPay = vi.fn();
    render(<PayChoiceSheet open title="Promo" amount={6000} balance={8000} busy={false} onPay={onPay} onClose={vi.fn()} />);
    expect(screen.getByText(/couvre tout le paiement/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Payer avec mon solde SBC/ }));
    expect(onPay).toHaveBeenCalledWith(true);
  });

  it('splits it when the balance is short, and can still pay by Mobile Money only', async () => {
    const onPay = vi.fn();
    render(<PayChoiceSheet open title="Promo" amount={6000} balance={2500} busy={false} onPay={onPay} onClose={vi.fn()} />);
    expect(screen.getByText(/2\s?500 F depuis votre solde, le reste \(3\s?500 F\) par Mobile Money/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Payer par Mobile Money/ }));
    expect(onPay).toHaveBeenCalledWith(false);
  });
});
