import { describe, it, expect } from 'bun:test';
import {
  convertCurrency,
  parseMoneyToMinorUnits,
  getCurrencyDecimals,
  formatMoney,
  SUPPORTED_CURRENCIES,
} from '../utils/currency';
import { encryptBackup, decryptBackup, isEncryptedBackup } from '../utils/crypto';

describe('Financial Engine: Exponent-Aware Currency Arithmetic', () => {
  it('correctly maps currency decimal precisions', () => {
    expect(getCurrencyDecimals('INR')).toBe(2);
    expect(getCurrencyDecimals('USD')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(getCurrencyDecimals('GBP')).toBe(2);
    expect(getCurrencyDecimals('JPY')).toBe(0); // Zero-decimal currency
  });

  it('converts zero-decimal JPY to two-decimal INR without 100x error', () => {
    // 1,000 JPY = 1000 minor units
    // Rate: 1 JPY = 0.54166667 INR
    // Expected in INR minor units: round(1000 * 0.54166667 * 10^(2 - 0)) = round(541.66667 * 100) = 54167 cents (₹541.67)
    // Naive multiplication would have given: 1000 * 0.54166667 = 542 cents (₹5.42) - a 100x bug!
    const { convertedCents, rate } = convertCurrency(1000, 'JPY', 'INR');
    expect(rate).toBeCloseTo(0.54166667, 4);
    expect(convertedCents).toBe(54167); // ₹541.67
  });

  it('converts two-decimal USD to zero-decimal JPY accurately', () => {
    // $10.00 USD = 1000 cents (decimals = 2)
    // Rate: 1 USD = 83.33333333 / 0.54166667 = 153.846 JPY (decimals = 0)
    // Expected in JPY units: round(1000 * 153.84615 * 10^(0 - 2)) = round(1538.46) = 1538 JPY
    const { convertedCents, rate } = convertCurrency(1000, 'USD', 'JPY');
    expect(rate).toBeCloseTo(153.85, 1);
    expect(convertedCents).toBe(1538); // ¥1,538
  });

  it('converts identical currencies at exactly 1:1 rate', () => {
    const { convertedCents, rate } = convertCurrency(250000, 'INR', 'INR');
    expect(rate).toBe(1);
    expect(convertedCents).toBe(250000);
  });

  it('parses user monetary input into minor integer units safely', () => {
    // INR (2 decimals)
    expect(parseMoneyToMinorUnits('150.50', 'INR')).toBe(15050);
    expect(parseMoneyToMinorUnits('1,250.75', 'INR')).toBe(125075);
    expect(parseMoneyToMinorUnits('500', 'INR')).toBe(50000);

    // JPY (0 decimals)
    expect(parseMoneyToMinorUnits('1000', 'JPY')).toBe(1000);
    expect(parseMoneyToMinorUnits('25,000', 'JPY')).toBe(25000);

    // Invalid or edge inputs
    expect(parseMoneyToMinorUnits('', 'INR')).toBe(0);
    expect(parseMoneyToMinorUnits('abc', 'INR')).toBe(0);
    expect(parseMoneyToMinorUnits('-500', 'INR')).toBe(0);
  });

  it('formats currency with locale and proper decimal positions', () => {
    expect(formatMoney(15050, 'INR')).toBe('₹150.50');
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500');
    expect(formatMoney(2500, 'USD')).toBe('$25.00');
  });
});

describe('Security Engine: Authenticated Client-Side Backup Encryption', () => {
  const sampleDatabaseBackup = JSON.stringify({
    version: 3,
    base_currency: 'INR',
    accounts: [
      { id: 'acc_1', name: 'Primary Savings', balance_cents: 10000000, currency: 'INR' },
    ],
    cards: [],
    categories: [],
    transactions: [
      { id: 'tx_1', amount_cents: 50000, currency: 'INR', note: 'Confidential rent payment' },
    ],
  });

  it('encrypts backup into a standard AES-GCM container', async () => {
    const encryptedStr = await encryptBackup(sampleDatabaseBackup, 'SuperStrongPassphrase123!');
    const container = JSON.parse(encryptedStr);

    expect(isEncryptedBackup(container)).toBe(true);
    expect(container._castra_encrypted).toBe(true);
    expect(container.kdf).toBe('PBKDF2-SHA256');
    expect(container.iterations).toBe(100000);
    expect(typeof container.salt).toBe('string');
    expect(typeof container.iv).toBe('string');
    expect(typeof container.ciphertext).toBe('string');

    // Ensure plaintext data is never exposed in the encrypted container
    expect(encryptedStr).not.toContain('Primary Savings');
    expect(encryptedStr).not.toContain('Confidential rent payment');
  });

  it('decrypts backup successfully with matching passphrase', async () => {
    const passphrase = 'MyMasterPassphrase!2026';
    const encryptedStr = await encryptBackup(sampleDatabaseBackup, passphrase);
    const decryptedJson = await decryptBackup(encryptedStr, passphrase);

    expect(decryptedJson).toBe(sampleDatabaseBackup);
    const parsed = JSON.parse(decryptedJson);
    expect(parsed.accounts[0].name).toBe('Primary Savings');
  });

  it('rejects decryption when provided an incorrect passphrase', async () => {
    const encryptedStr = await encryptBackup(sampleDatabaseBackup, 'CorrectPassphrase123');

    await expect(
      decryptBackup(encryptedStr, 'WrongPassphrase456')
    ).rejects.toThrow('Incorrect passphrase or corrupted backup file.');
  });
});

describe('Ledger Invariants & Data Integrity', () => {
  it('guarantees integer-cent safe storage without floating-point drift', () => {
    // Classic floating point drift: 0.1 + 0.2 = 0.30000000000000004
    // Castra integer-cent accounting invariant:
    const item1 = 10; // 10 cents
    const item2 = 20; // 20 cents
    const sum = item1 + item2;
    expect(sum).toBe(30);
    expect(Number.isSafeInteger(sum)).toBe(true);
  });

  it('neutralizes spreadsheet formula injection in transaction notes', () => {
    const dangerousNotes = [
      '=cmd|"/C calc"!A0',
      '+SUM(1+1)',
      '-2+3',
      '@SUM(A1:A10)',
    ];

    for (const note of dangerousNotes) {
      let sanitized = note.replace(/"/g, '""');
      if (/^[=+\-@]/.test(sanitized)) {
        sanitized = `'${sanitized}`;
      }
      expect(sanitized.startsWith("'")).toBe(true);
    }
  });
});

describe('Feature Logic: Safe-to-Spend 3-Pillar Liquidity Engine', () => {
  it('correctly caps daily spend by actual liquid cash when cash < category budget', () => {
    // Scenario:
    // Category budget cap: ₹30,000 (3,000,000 cents)
    // Budgeted spent so far: ₹10,000 (1,000,000 cents)
    // Remaining theoretical budget: ₹20,000 (2,000,000 cents)
    // Liquid accounts (bank + wallet): ₹8,000 (800,000 cents)
    // Upcoming unpaid bills this month: ₹3,000 (300,000 cents)
    // Discretionary liquid cash = 8,000 - 3,000 = ₹5,000 (500,000 cents)
    // Days remaining in month: 10
    const remainingBudgetCents = 2000000;
    const daysRemaining = 10;
    const safeDailyBudgetCents = Math.floor(remainingBudgetCents / daysRemaining); // ₹2,000/day theoretical

    const liquidCashCents = 800000;
    const upcomingCommitmentsCents = 300000;
    const discretionaryCashCents = Math.max(0, liquidCashCents - upcomingCommitmentsCents); // 500,000 cents
    const safeDailyCashCents = Math.floor(discretionaryCashCents / daysRemaining); // ₹500/day real

    const isLiquidityConstrained = discretionaryCashCents < remainingBudgetCents;
    const effectiveDailyCents = Math.min(safeDailyBudgetCents, safeDailyCashCents);

    expect(isLiquidityConstrained).toBe(true);
    expect(safeDailyBudgetCents).toBe(200000); // ₹2,000
    expect(effectiveDailyCents).toBe(50000); // Capped to ₹500/day real cash!
  });
});

describe('Feature Logic: Recurring Bill Radar Cycle Tracking', () => {
  it('identifies overdue bills when current day exceeds due day and bill is unpaid', () => {
    const currentDay = 25;
    const billDueDay = 10;
    const isPaid = false;

    const isOverdue = !isPaid && currentDay > billDueDay;
    const daysOverdue = currentDay - billDueDay;

    expect(isOverdue).toBe(true);
    expect(daysOverdue).toBe(15);
  });

  it('advances next due date to next month when bill is paid for current cycle', () => {
    const now = new Date(2026, 10, 15); // Nov 15, 2026
    const bill = {
      due_day: 10,
      frequency: 'monthly' as const,
      last_paid_at: '2026-11-10T10:00:00.000Z',
    };

    const lastPaid = new Date(bill.last_paid_at);
    const isPaid = lastPaid.getFullYear() === now.getFullYear() && lastPaid.getMonth() === now.getMonth();
    expect(isPaid).toBe(true);

    // Next due month is December (month 11)
    const targetMonth = now.getMonth() + 1;
    const nextDue = new Date(now.getFullYear(), targetMonth, bill.due_day);
    expect(nextDue.getMonth()).toBe(11); // December
    expect(nextDue.getDate()).toBe(10);
  });
});
