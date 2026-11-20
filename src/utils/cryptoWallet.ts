/**
 * Crypto wallets that receive crypto withdrawals (NOWPayments). The formats
 * mirror the server's (user-service utils/crypto-wallet.ts), which has the
 * last word: they only catch a wrong network or a typo before a code is sent.
 */
export const supportedCryptoCurrencies = [
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'LTC', name: 'Litecoin' },
  { code: 'XRP', name: 'Ripple' },
  { code: 'TRX', name: 'TRON' },
  { code: 'USDTSOL', name: 'USDT (Solana)' },
  { code: 'USDTBSC', name: 'USDT (BSC-BEP20)' },
  { code: 'BNBBSC', name: 'BNB (BSC-BEP20)' },
] as const;

const B58 = '[1-9A-HJ-NP-Za-km-z]';
const BECH32 = '[02-9ac-hj-np-z]';
const PATTERNS: Record<string, RegExp> = {
  BTC: new RegExp(`^(bc1${BECH32}{11,87}|[13]${B58}{25,34})$`),
  LTC: new RegExp(`^(ltc1${BECH32}{11,87}|[LM3]${B58}{26,33})$`),
  XRP: new RegExp(`^r${B58}{24,34}$`),
  TRX: new RegExp(`^T${B58}{33}$`),
  USDTSOL: new RegExp(`^${B58}{32,44}$`),
  USDTBSC: /^0x[0-9a-fA-F]{40}$/,
  BNBBSC: /^0x[0-9a-fA-F]{40}$/,
};

/** The address as the server will store it, or null when it cannot belong to `currency`. */
export function normalizeCryptoAddress(raw: string, currency: string): string | null {
  let address = raw.trim();
  if (/^(bc1|ltc1)/i.test(address)) address = address.toLowerCase();
  const pattern = PATTERNS[currency];
  return pattern && pattern.test(address) ? address : null;
}

export const cryptoCurrencyName = (code?: string): string =>
  supportedCryptoCurrencies.find(c => c.code === code)?.name || code || '';

/** `0x5290…9EE7`: enough to recognise the wallet, never the whole address. */
export const shortAddress = (address?: string): string =>
  !address ? '' : address.length <= 14 ? address : `${address.slice(0, 6)}…${address.slice(-6)}`;
