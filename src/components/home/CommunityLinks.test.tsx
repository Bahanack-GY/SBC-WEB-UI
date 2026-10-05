import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommunityLinks from './CommunityLinks';

describe('Rejoignez-nous', () => {
  it("opens the Groupe d'accompagnement on parcourssbc.com", () => {
    render(<CommunityLinks />);
    const link = screen.getByRole('link', { name: /Groupe d'accompagnement/ });
    expect(link).toHaveAttribute('href', 'https://www.parcourssbc.com/');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
