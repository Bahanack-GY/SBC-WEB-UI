import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage } from '../../test/api';

const flags = vi.hoisted(() => ({ RELANCE_VISIBLE: true }));
vi.mock('../../config/features', () => flags);

// The menu is built when the module loads, so each case loads it afresh.
async function openMenu(relanceVisible: boolean) {
  flags.RELANCE_VISIBLE = relanceVisible;
  vi.resetModules();
  const { default: ServicesSidebar } = await import('./ServicesSidebar');
  renderPage(<ServicesSidebar open onClose={() => {}} />);
}

describe('services menu', () => {
  it('lists Relance and Packs publicité where relance is shown', async () => {
    await openMenu(true);
    expect(screen.getByText('Relance')).toBeInTheDocument();
    expect(screen.getByText('Packs publicité')).toBeInTheDocument();
  });

  it('leaves both out where relance is hidden', async () => {
    await openMenu(false);
    expect(screen.getByText('Mes filleuls')).toBeInTheDocument();
    expect(screen.queryByText('Relance')).not.toBeInTheDocument();
    expect(screen.queryByText('Packs publicité')).not.toBeInTheDocument();
  });
});
