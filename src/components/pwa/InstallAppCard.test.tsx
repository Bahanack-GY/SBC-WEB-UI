import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const prompt = vi.hoisted(() => ({
  state: { installed: false, isIos: false, canPromptNatively: false, install: vi.fn(), canShow: false, dismiss: vi.fn() },
}));
vi.mock('../../hooks/useInstallPrompt', () => ({ useInstallPrompt: () => prompt.state }));

import { InstallAppCard } from './InstallAppCard';

beforeEach(() => {
  prompt.state = { installed: false, isIos: false, canPromptNatively: false, install: vi.fn(), canShow: false, dismiss: vi.fn() };
});

describe('installing SBC', () => {
  it('installs in one tap when Chrome offers it', async () => {
    prompt.state.canPromptNatively = true;
    render(<InstallAppCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Installer' }));
    expect(prompt.state.install).toHaveBeenCalled();
  });

  it('explains the iPhone steps — Safari has no install button to press', async () => {
    prompt.state.isIos = true;
    render(<InstallAppCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Comment ?' }));
    expect(screen.getByText(/Partager, puis « Sur l'écran d'accueil »/)).toBeInTheDocument();
  });

  it('points to Chrome\'s menu when Chrome has not offered it yet', async () => {
    render(<InstallAppCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Comment ?' }));
    expect(screen.getByText(/Menu ⋮ de Chrome/)).toBeInTheDocument();
  });

  it('is gone once SBC is installed', () => {
    prompt.state.installed = true;
    render(<InstallAppCard />);
    expect(screen.queryByRole('region', { name: "Installer l'application" })).not.toBeInTheDocument();
  });
});
