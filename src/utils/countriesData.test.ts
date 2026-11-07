import { describe, expect, it } from 'vitest';
import {
  allAfricanCountries,
  allCountries,
  countryForPhone,
  DEFAULT_DIAL_CODE,
  splitStoredPhone,
  worldCountryCodes,
} from './countriesData';

describe('the world country list (sign-up open to every country)', () => {
  it('has France +33 and Cameroun +237, each once', () => {
    const france = allCountries.filter((c) => c.value === 'France');
    const cameroun = allCountries.filter((c) => c.value === 'Cameroun');
    expect(france).toHaveLength(1);
    expect(france[0]).toMatchObject({ code: 'FR', phoneCode: '+33', flag: '🇫🇷', supportsMomo: false });
    expect(cameroun).toHaveLength(1);
    expect(cameroun[0]).toMatchObject({ code: 'CM', phoneCode: '+237', currency: 'XAF', supportsMomo: true });
    expect(worldCountryCodes).toContainEqual({ value: 'France', label: '🇫🇷 +33', code: '+33' });
  });

  it('is sorted by French name, not by the flag (Angola is no longer first)', () => {
    const names = allCountries.map((c) => c.value);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(names[0]).toBe('Afghanistan');
    expect(names.indexOf('Égypte')).toBeLessThan(names.indexOf('Espagne'));
    expect(allAfricanCountries[0].value).toBe('Afrique du Sud');
  });

  it('covers the whole world and keeps the 54 African countries as they were', () => {
    expect(allCountries.length).toBeGreaterThan(230);
    expect(allAfricanCountries).toHaveLength(54);
    for (const african of allAfricanCountries) expect(allCountries).toContainEqual(african);
    const codes = allCountries.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(allCountries.every((c) => /^[A-Z]{2}$/.test(c.code) && /^\+\d{1,4}$/.test(c.phoneCode))).toBe(true);
    expect(allCountries.filter((c) => c.supportsMomo).every((c) => allAfricanCountries.includes(c))).toBe(true);
  });

  it('opens the dial pickers on Cameroun', () => {
    expect(DEFAULT_DIAL_CODE).toEqual({ value: 'Cameroun', label: '🇨🇲 +237', code: '+237' });
  });
});

describe('reading a number’s country', () => {
  it('takes the longest matching code', () => {
    expect(countryForPhone('+242 06 123 45 67')?.value).toBe('Congo-Brazzaville');
    expect(countryForPhone('+33 6 12 34 56 78')?.value).toBe('France');
    expect(countryForPhone('0044 7700 900123')?.value).toBe('Royaume-Uni');
    expect(countryForPhone('+999 123456')).toBeUndefined();
    expect(countryForPhone('675090755')).toBeUndefined();
  });

  it('settles a shared code with the member’s country, else the main one', () => {
    expect(countryForPhone('+1 876 123 4567', 'JM')?.value).toBe('Jamaïque');
    expect(countryForPhone('+1 514 123 4567', 'Canada')?.value).toBe('Canada');
    expect(countryForPhone('+1 202 555 0100')?.value).toBe('États-Unis');
    expect(countryForPhone('+7 701 123 4567', 'KZ')?.value).toBe('Kazakhstan');
  });

  it('splits a stored number for a dial picker without misreading old national numbers', () => {
    expect(splitStoredPhone('237675090755', 'CM')).toEqual({ dial: DEFAULT_DIAL_CODE, local: '675090755' });
    // Older accounts hold the national number alone: not Papua New Guinea (+675).
    expect(splitStoredPhone('675090755', 'CM')).toEqual({ dial: DEFAULT_DIAL_CODE, local: '675090755' });
    expect(splitStoredPhone('+33612345678', 'FR').dial.value).toBe('France');
    expect(splitStoredPhone('33612345678', 'FR')).toMatchObject({ local: '612345678' });
    expect(splitStoredPhone('22990123456', 'CM')).toMatchObject({ local: '90123456' });
    expect(splitStoredPhone('22990123456', 'CM').dial.value).toBe('Bénin');
  });
});
