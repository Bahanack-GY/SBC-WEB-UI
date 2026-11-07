import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage } from '../../test/api';
import ServicesSidebar from './ServicesSidebar';

describe('services menu', () => {
  it('lists Relance, and no longer Packs publicité (retired 2026-11-07)', () => {
    renderPage(<ServicesSidebar open onClose={() => {}} />);
    expect(screen.getByText('Relance')).toBeInTheDocument();
    expect(screen.queryByText('Packs publicité')).not.toBeInTheDocument();
  });
});
