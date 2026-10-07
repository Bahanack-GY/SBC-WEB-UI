import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage } from '../../test/api';
import ServicesSidebar from './ServicesSidebar';

describe('services menu', () => {
  it('lists Relance and Packs publicité (relance is live again on prod)', () => {
    renderPage(<ServicesSidebar open onClose={() => {}} />);
    expect(screen.getByText('Relance')).toBeInTheDocument();
    expect(screen.getByText('Packs publicité')).toBeInTheDocument();
  });
});
