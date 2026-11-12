export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // 1 unit of this currency = X USD
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 0.012, decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0, decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.08, decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 1.28, decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0065, decimals: 0 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', rateToUSD: 0.73, decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUSD: 0.65, decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUSD: 0.75, decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUSD: 1.12, decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToUSD: 0.27, decimals: 2 },
};

export function getCurrencySymbol(code: string): string {
  return SUPPORTED_CURRENCIES[code]?.symbol || code;
}

export function getCurrencyDecimals(code: string): number {
  return SUPPORTED_CURRENCIES[code]?.decimals ?? 2;
}

export function parseMoneyToMinorUnits(
  inputStr: string,
  currencyCode: string = 'INR'
): number {
  if (!inputStr || typeof inputStr !== 'string') return 0;
  const cleanStr = inputStr.replace(/,/g, '').trim();
  const val = parseFloat(cleanStr);
  if (isNaN(val) || !isFinite(val) || val <= 0) return 0;

  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  const minor = Math.round(val * factor);
  return Number.isSafeInteger(minor) ? minor : 0;
}

export function formatMoney(
  cents: number,
  currencyCode: string = 'INR',
  options?: { showSign?: boolean; absolute?: boolean }
): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode + ' ',
    name: currencyCode,
    rateToUSD: 1.0,
    decimals: 2,
  };

  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const divisor = Math.pow(10, currency.decimals);
  const units = absCents / divisor;

  const locale = currencyCode === 'INR' ? 'en-IN' : undefined;
  const formattedNum = units.toLocaleString(locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  if (options?.absolute) {
    return `${currency.symbol}${formattedNum}`;
  }

  if (options?.showSign) {
    const sign = isNegative ? '-' : '+';
    return `${sign}${currency.symbol}${formattedNum}`;
  }

  return isNegative ? `-${currency.symbol}${formattedNum}` : `${currency.symbol}${formattedNum}`;
}

export function convertCurrency(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string
): { convertedCents: number; rate: number } {
  if (fromCurrency === toCurrency) {
    return { convertedCents: amountCents, rate: 1.0 };
  }

  const fromInfo = SUPPORTED_CURRENCIES[fromCurrency] || { rateToUSD: 1.0, decimals: 2 };
  const toInfo = SUPPORTED_CURRENCIES[toCurrency] || { rateToUSD: 1.0, decimals: 2 };

  const rate = fromInfo.rateToUSD / toInfo.rateToUSD;
  // Account for minor unit exponent differences between source and target currencies
  const exponentDiff = toInfo.decimals - fromInfo.decimals;
  const factor = Math.pow(10, exponentDiff);
  const converted = Math.round(amountCents * rate * factor);

  return {
    convertedCents: Number.isSafeInteger(converted) ? converted : 0,
    rate,
  };
}
