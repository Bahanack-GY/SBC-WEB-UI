import { describe, expect, it } from 'vitest';
import { displayPhone, findCountry, fullPhone, parsePhone, validateBirthDate, validateConfirmation, validateEmail, validateName, validatePassword } from './signupChatLogic';

describe('parsePhone', () => {
    it('keeps the local number as typed, without spaces', () => {
        expect(parsePhone('675 09 07 55', 'Cameroun')).toEqual({ phone: '675090755', dialCountry: 'Cameroun' });
    });

    it('keeps the leading 0 of a Congo-Brazzaville number (it belongs to the number)', () => {
        const p = parsePhone('06 612 34 56', 'Congo-Brazzaville');
        expect(p).toEqual({ phone: '066123456', dialCountry: 'Congo-Brazzaville' });
        expect(fullPhone(p as never)).toBe('+242066123456');
    });

    it('reads the dial code from an international number, whatever country was chosen', () => {
        expect(parsePhone('+237 699 99 88 77', 'Sénégal')).toEqual({ phone: '699998877', dialCountry: 'Cameroun' });
        expect(parsePhone('00225 07 12 34 56 78', 'Cameroun')).toEqual({ phone: '0712345678', dialCountry: 'Côte d\'Ivoire' });
    });

    it('refuses letters, too short numbers and unknown dial codes', () => {
        expect(parsePhone('12ab', 'Cameroun')).toHaveProperty('error');
        expect(parsePhone('1234', 'Cameroun')).toHaveProperty('error');
        expect(parsePhone('+999 123456789', 'Cameroun')).toHaveProperty('error');
    });

    it('displays a readable number', () => {
        expect(displayPhone({ dialCountry: 'Cameroun', phone: '675090755' })).toBe('+237 675 090 755');
    });
});

describe('validators (same rules as the form)', () => {
    it('name, e-mail, password and confirmation', () => {
        expect(validateName('  ')).not.toBeNull();
        expect(validateName('Jean Paul')).toBeNull();
        expect(validateEmail('jean@')).not.toBeNull();
        expect(validateEmail('jean.paul@gmail.com')).toBeNull();
        expect(validatePassword('1234567')).not.toBeNull();
        expect(validatePassword('12345678')).toBeNull();
        expect(validateConfirmation('abcdefgh', 'abcdefgx')).not.toBeNull();
        expect(validateConfirmation('abcdefgh', 'abcdefgh')).toBeNull();
    });

    it('birth date: not in the future, not before 1900', () => {
        const now = new Date('2026-10-04');
        expect(validateBirthDate('2030-01-01', now)).not.toBeNull();
        expect(validateBirthDate('1850-01-01', now)).not.toBeNull();
        expect(validateBirthDate('1994-05-17', now)).toBeNull();
    });

    it('finds a country by name or ISO code (recovery links carry either)', () => {
        expect(findCountry('CM')?.value).toBe('Cameroun');
        expect(findCountry('cameroun')?.code).toBe('CM');
        expect(findCountry('XX')).toBeUndefined();
    });
});
