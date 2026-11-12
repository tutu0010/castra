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
  const units = currency.decimals === 0 ? absCents : absCents / 100;

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

  const fromInfo = SUPPORTED_CURRENCIES[fromCurrency] || { rateToUSD: 1.0 };
  const toInfo = SUPPORTED_CURRENCIES[toCurrency] || { rateToUSD: 1.0 };

  const rate = fromInfo.rateToUSD / toInfo.rateToUSD;
  const convertedCents = Math.round(amountCents * rate);

  return { convertedCents, rate };
}
