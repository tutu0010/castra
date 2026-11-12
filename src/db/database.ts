import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Account, Card, Category, Transaction, RecurringBill, DatabaseBackup } from '../types';
import { convertCurrency, getCurrencyDecimals } from '../utils/currency';

const now = new Date().toISOString();

// Category presets
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Dining & Food', icon: 'utensils', color: '#F87171', type: 'expense', monthly_budget_cents: 1000000, created_at: now },
  { id: 'cat_groceries', name: 'Groceries', icon: 'shopping-cart', color: '#34D399', type: 'expense', monthly_budget_cents: 1500000, created_at: now },
  { id: 'cat_coffee', name: 'Café & Snacks', icon: 'coffee', color: '#FBBF24', type: 'expense', monthly_budget_cents: 300000, created_at: now },
  { id: 'cat_housing', name: 'Rent & Bills', icon: 'home', color: '#60A5FA', type: 'expense', monthly_budget_cents: 2500000, created_at: now },
  { id: 'cat_transport', name: 'Fuel & Cab', icon: 'car', color: '#A78BFA', type: 'expense', monthly_budget_cents: 500000, created_at: now },
  { id: 'cat_shopping', name: 'Shopping', icon: 'shopping-bag', color: '#FB923C', type: 'expense', monthly_budget_cents: 800000, created_at: now },
  { id: 'cat_subs', name: 'Subscriptions', icon: 'tv', color: '#9E968B', type: 'expense', monthly_budget_cents: 200000, created_at: now },
  { id: 'cat_salary', name: 'Salary / Income', icon: 'briefcase', color: '#34D399', type: 'income', monthly_budget_cents: null, created_at: now },
  { id: 'cat_freelance', name: 'Side Hustle', icon: 'laptop', color: '#60A5FA', type: 'income', monthly_budget_cents: null, created_at: now },
];

const DEFAULT_ACCOUNTS: Account[] = [];
const DEFAULT_CARDS: Card[] = [];
const DEFAULT_TRANSACTIONS: Transaction[] = [];
const DEFAULT_RECURRING: RecurringBill[] = [];

// ----------------------------------------------------
// WEB STORAGE FALLBACK (LOCAL STORAGE)
// ----------------------------------------------------
const WEB_KEY = 'castra_local_store_v3';

interface WebStore {
  base_currency: string;
  biometrics_enabled: boolean;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  recurring_bills: RecurringBill[];
}

function getWebStore(): WebStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      base_currency: 'INR',
      biometrics_enabled: false,
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
      recurring_bills: DEFAULT_RECURRING,
    };
  }

  const raw = window.localStorage.getItem(WEB_KEY);
  if (!raw) {
    const initial: WebStore = {
      base_currency: 'INR',
      biometrics_enabled: false,
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
      recurring_bills: DEFAULT_RECURRING,
    };
    window.localStorage.setItem(WEB_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed: WebStore = JSON.parse(raw);
    return {
      base_currency: parsed.base_currency || 'INR',
      biometrics_enabled: !!parsed.biometrics_enabled,
      accounts: parsed.accounts || [],
      cards: parsed.cards || [],
      categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
      transactions: parsed.transactions || [],
      recurring_bills: parsed.recurring_bills || [],
    };
  } catch {
    return {
      base_currency: 'INR',
      biometrics_enabled: false,
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
      recurring_bills: DEFAULT_RECURRING,
    };
  }
}

function saveWebStore(store: WebStore): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(WEB_KEY, JSON.stringify(store));
  }
}

// ----------------------------------------------------
// NATIVE SQLITE INITIALIZATION & MIGRATIONS
// ----------------------------------------------------
let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!dbInstance) {
    const db = SQLite.openDatabaseSync('castra.db');
    initNativeDatabase(db);
    dbInstance = db;
  }
  return dbInstance;
}

function initNativeDatabase(db: SQLite.SQLiteDatabase) {
  // 1. Immediately enforce foreign keys & write-ahead logging
  db.execSync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  // 2. Versioned Migration Engine
  const versionRow = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const version = versionRow?.user_version ?? 0;

  db.withTransactionSync(() => {
    if (version < 1) {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance_cents INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'INR',
          color TEXT NOT NULL DEFAULT '#1C222B',
          icon TEXT NOT NULL DEFAULT 'landmark',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          bank_account_id TEXT,
          currency TEXT NOT NULL DEFAULT 'INR',
          color TEXT NOT NULL DEFAULT '#1D1E22',
          last4 TEXT,
          credit_limit_cents INTEGER,
          statement_day INTEGER,
          due_day INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (bank_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT 'tag',
          color TEXT NOT NULL DEFAULT '#756D63',
          type TEXT NOT NULL DEFAULT 'expense',
          monthly_budget_cents INTEGER,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          account_id TEXT,
          card_id TEXT,
          category_id TEXT,
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          exchange_rate REAL NOT NULL DEFAULT 1.0,
          base_amount_cents INTEGER NOT NULL,
          type TEXT NOT NULL,
          to_account_id TEXT,
          date TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS recurring_bills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          category_id TEXT,
          account_id TEXT,
          card_id TEXT,
          frequency TEXT NOT NULL DEFAULT 'monthly',
          due_day INTEGER NOT NULL,
          due_month INTEGER,
          last_paid_at TEXT,
          next_due_date TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );
      `);
      db.execSync('PRAGMA user_version = 1;');
    }

    if (version < 2) {
      // Create high-speed secondary indexes
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_tx_card_type ON transactions(card_id, type);
        CREATE INDEX IF NOT EXISTS idx_tx_category_date ON transactions(category_id, date);
        CREATE INDEX IF NOT EXISTS idx_tx_destination ON transactions(to_account_id);
        CREATE INDEX IF NOT EXISTS idx_bills_active_due ON recurring_bills(is_active, due_day);
      `);

      // Add columns to recurring_bills if missing from earlier dev iterations
      try {
        db.execSync('ALTER TABLE recurring_bills ADD COLUMN due_month INTEGER;');
      } catch {}
      try {
        db.execSync('ALTER TABLE recurring_bills ADD COLUMN last_paid_at TEXT;');
      } catch {}
      try {
        db.execSync('ALTER TABLE recurring_bills ADD COLUMN next_due_date TEXT;');
      } catch {}

      db.execSync('PRAGMA user_version = 2;');
    }
  });

  // Verify foreign key integrity
  try {
    const fkErrors = db.getAllSync('PRAGMA foreign_key_check;');
    if (fkErrors && fkErrors.length > 0) {
      console.warn('Foreign key integrity check found orphaned records:', fkErrors);
    }
  } catch (err) {
    console.error('Foreign key check failed:', err);
  }

  // Ensure default base currency is INR
  const baseCurr = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['base_currency']);
  if (!baseCurr) {
    db.runSync('INSERT INTO settings (key, value) VALUES (?, ?);', ['base_currency', 'INR']);
  }

  // Ensure categories are seeded if empty
  const catCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (!catCount || catCount.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      db.runSync(
        `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.monthly_budget_cents || null, now]
      );
    }
  }
}

// ----------------------------------------------------
// SETTINGS & BIOMETRICS
// ----------------------------------------------------
export function getBaseCurrency(): string {
  if (Platform.OS === 'web') {
    return getWebStore().base_currency || 'INR';
  }
  const db = getDatabase();
  const res = db?.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['base_currency']);
  return res?.value || 'INR';
}

export function setBaseCurrency(currency: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.base_currency = currency;
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', ['base_currency', currency]);
}

export function getBiometricsEnabled(): boolean {
  if (Platform.OS === 'web') {
    return getWebStore().biometrics_enabled;
  }
  const db = getDatabase();
  const res = db?.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['biometrics_enabled']);
  return res?.value === 'true';
}

export function setBiometricsEnabled(enabled: boolean): void {
  const strVal = enabled ? 'true' : 'false';
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.biometrics_enabled = enabled;
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', ['biometrics_enabled', strVal]);
}

// ----------------------------------------------------
// ACCOUNTS & CARDS
// ----------------------------------------------------
export function getAllAccounts(): Account[] {
  if (Platform.OS === 'web') {
    return getWebStore().accounts;
  }
  const db = getDatabase();
  return db?.getAllSync<Account>('SELECT * FROM accounts ORDER BY created_at ASC;') || [];
}

export function getAllCards(): Card[] {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    return store.cards.map(card => {
      if (card.type === 'credit') {
        const spent = store.transactions
          .filter(t => t.card_id === card.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount_cents, 0);
        const paid = store.transactions
          .filter(t => (t.card_id === card.id || t.to_account_id === card.id) && t.type === 'transfer')
          .reduce((sum, t) => sum + t.amount_cents, 0);
        return {
          ...card,
          outstanding_balance_cents: Math.max(0, spent - paid),
        };
      }
      return card;
    });
  }

  const db = getDatabase();
  if (!db) return [];
  const cards = db.getAllSync<Card>('SELECT * FROM cards ORDER BY created_at ASC;');

  // Single grouped aggregation query eliminating the N+1 query loop
  const cardAggregates = db.getAllSync<{
    card_id: string;
    total_spent: number;
    total_paid: number;
  }>(`
    SELECT 
      card_id,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS total_spent,
      COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount_cents ELSE 0 END), 0) AS total_paid
    FROM transactions
    WHERE card_id IS NOT NULL
    GROUP BY card_id;
  `);

  const aggMap = new Map(cardAggregates.map(a => [a.card_id, a]));

  return cards.map(card => {
    if (card.type === 'credit') {
      const agg = aggMap.get(card.id);
      const spent = agg?.total_spent || 0;
      const paid = agg?.total_paid || 0;
      return {
        ...card,
        outstanding_balance_cents: Math.max(0, spent - paid),
      };
    }
    return card;
  });
}

export function createAccount(account: Omit<Account, 'created_at'>): void {
  const fullAccount: Account = { ...account, created_at: new Date().toISOString() };
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.accounts.push(fullAccount);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync(
    `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [fullAccount.id, fullAccount.name, fullAccount.type, fullAccount.balance_cents, fullAccount.currency, fullAccount.color, fullAccount.icon, fullAccount.created_at]
  );
}

export function updateAccountBalance(id: string, newBalanceCents: number): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const acc = store.accounts.find(a => a.id === id);
    if (acc) {
      acc.balance_cents = newBalanceCents;
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  db?.runSync('UPDATE accounts SET balance_cents = ? WHERE id = ?;', [newBalanceCents, id]);
}

export function adjustCardBalance(
  cardId: string,
  currentBalanceCents: number,
  targetBalanceCents: number,
  currency: string
): void {
  const diff = targetBalanceCents - currentBalanceCents;
  if (diff === 0) return;

  const nowIso = new Date().toISOString();
  if (diff > 0) {
    // Outstanding debt increased -> record adjustment expense
    addTransaction({
      id: `adj_${Date.now()}`,
      card_id: cardId,
      amount_cents: diff,
      currency,
      type: 'expense',
      date: nowIso,
      note: 'Balance Adjustment',
    });
  } else {
    // Outstanding debt decreased -> record adjustment payment/credit
    addTransaction({
      id: `adj_${Date.now()}`,
      card_id: cardId,
      amount_cents: Math.abs(diff),
      currency,
      type: 'transfer',
      date: nowIso,
      note: 'Balance Adjustment',
    });
  }
}

export function updateCardLimit(id: string, newLimitCents: number | null): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const card = store.cards.find(c => c.id === id);
    if (card) {
      card.credit_limit_cents = newLimitCents;
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  db?.runSync('UPDATE cards SET credit_limit_cents = ? WHERE id = ?;', [newLimitCents, id]);
}

export function deleteAccount(id: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.accounts = store.accounts.filter(a => a.id !== id);
    store.transactions = store.transactions.filter(t => t.account_id !== id && t.to_account_id !== id);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.withTransactionSync(() => {
    db.runSync('DELETE FROM accounts WHERE id = ?;', [id]);
  });
}

export function createCard(card: Omit<Card, 'created_at'>): void {
  const fullCard: Card = { ...card, created_at: new Date().toISOString() };
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.cards.push(fullCard);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync(
    `INSERT INTO cards (id, name, type, bank_account_id, currency, color, last4, credit_limit_cents, statement_day, due_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      fullCard.id,
      fullCard.name,
      fullCard.type,
      fullCard.bank_account_id || null,
      fullCard.currency,
      fullCard.color,
      fullCard.last4 || null,
      fullCard.credit_limit_cents || null,
      fullCard.statement_day || null,
      fullCard.due_day || null,
      fullCard.created_at,
    ]
  );
}

export function deleteCard(id: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.cards = store.cards.filter(c => c.id !== id);
    store.transactions = store.transactions.filter(t => t.card_id !== id);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.withTransactionSync(() => {
    db.runSync('DELETE FROM cards WHERE id = ?;', [id]);
  });
}

// ----------------------------------------------------
// CATEGORIES
// ----------------------------------------------------
export function getAllCategories(): Category[] {
  if (Platform.OS === 'web') {
    return getWebStore().categories;
  }
  const db = getDatabase();
  return db?.getAllSync<Category>('SELECT * FROM categories ORDER BY type ASC, name ASC;') || [];
}

export function updateCategoryBudget(categoryId: string, monthlyBudgetCents: number | null): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const cat = store.categories.find(c => c.id === categoryId);
    if (cat) {
      cat.monthly_budget_cents = monthlyBudgetCents;
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  db?.runSync('UPDATE categories SET monthly_budget_cents = ? WHERE id = ?;', [monthlyBudgetCents, categoryId]);
}

// ----------------------------------------------------
// RECURRING BILLS & SUBSCRIPTIONS
// ----------------------------------------------------
export function getAllRecurringBills(): RecurringBill[] {
  if (Platform.OS === 'web') {
    return getWebStore().recurring_bills;
  }
  const db = getDatabase();
  return db?.getAllSync<RecurringBill>('SELECT * FROM recurring_bills ORDER BY due_day ASC;') || [];
}

export function createRecurringBill(bill: Omit<RecurringBill, 'created_at'>): void {
  const fullBill: RecurringBill = { ...bill, created_at: new Date().toISOString() };
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.recurring_bills.push(fullBill);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync(
    `INSERT INTO recurring_bills (id, name, amount_cents, currency, category_id, account_id, card_id, frequency, due_day, due_month, last_paid_at, next_due_date, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      fullBill.id,
      fullBill.name,
      fullBill.amount_cents,
      fullBill.currency,
      fullBill.category_id || null,
      fullBill.account_id || null,
      fullBill.card_id || null,
      fullBill.frequency || 'monthly',
      fullBill.due_day,
      fullBill.due_month || null,
      fullBill.last_paid_at || null,
      fullBill.next_due_date || null,
      fullBill.is_active ? 1 : 0,
      fullBill.created_at,
    ]
  );
}

export function markRecurringBillPaid(billId: string): void {
  const nowIso = new Date().toISOString();
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const bill = store.recurring_bills.find(b => b.id === billId);
    if (bill) {
      bill.last_paid_at = nowIso;
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  db?.runSync('UPDATE recurring_bills SET last_paid_at = ? WHERE id = ?;', [nowIso, billId]);
}

export function toggleRecurringBill(id: string, isActive: boolean): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const bill = store.recurring_bills.find(b => b.id === id);
    if (bill) {
      bill.is_active = isActive;
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  db?.runSync('UPDATE recurring_bills SET is_active = ? WHERE id = ?;', [isActive ? 1 : 0, id]);
}

export function deleteRecurringBill(id: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.recurring_bills = store.recurring_bills.filter(b => b.id !== id);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync('DELETE FROM recurring_bills WHERE id = ?;', [id]);
}

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------
export function getAllTransactions(limit: number = 2000): Transaction[] {
  if (Platform.OS === 'web') {
    return limit > 0 ? getWebStore().transactions.slice(0, limit) : getWebStore().transactions;
  }
  const db = getDatabase();
  if (limit > 0) {
    return db?.getAllSync<Transaction>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?;',
      [limit]
    ) || [];
  }
  return db?.getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC;'
  ) || [];
}

export function addTransaction(tx: Omit<Transaction, 'created_at' | 'base_amount_cents' | 'exchange_rate'>): void {
  const baseCurrency = getBaseCurrency();
  const { convertedCents, rate } = convertCurrency(tx.amount_cents, tx.currency, baseCurrency);
  const nowStr = new Date().toISOString();

  const fullTx: Transaction = {
    ...tx,
    exchange_rate: rate,
    base_amount_cents: convertedCents,
    created_at: nowStr,
  };

  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.transactions.unshift(fullTx);

    if (fullTx.type === 'expense') {
      if (fullTx.card_id) {
        const card = store.cards.find(c => c.id === fullTx.card_id);
        if (card && card.type === 'debit' && card.bank_account_id) {
          const acc = store.accounts.find(a => a.id === card.bank_account_id);
          if (acc) acc.balance_cents -= fullTx.amount_cents;
        }
      } else if (fullTx.account_id) {
        const acc = store.accounts.find(a => a.id === fullTx.account_id);
        if (acc) acc.balance_cents -= fullTx.amount_cents;
      }
    } else if (fullTx.type === 'income') {
      if (fullTx.account_id) {
        const acc = store.accounts.find(a => a.id === fullTx.account_id);
        if (acc) acc.balance_cents += fullTx.amount_cents;
      }
    } else if (fullTx.type === 'transfer') {
      if (fullTx.account_id) {
        const fromAcc = store.accounts.find(a => a.id === fullTx.account_id);
        if (fromAcc) fromAcc.balance_cents -= fullTx.amount_cents;
      }
      if (fullTx.to_account_id) {
        const toAcc = store.accounts.find(a => a.id === fullTx.to_account_id);
        if (toAcc) toAcc.balance_cents += fullTx.amount_cents;
      }
    }

    saveWebStore(store);
    return;
  }

  const db = getDatabase();
  db?.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, to_account_id, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        fullTx.id,
        fullTx.account_id || null,
        fullTx.card_id || null,
        fullTx.category_id || null,
        fullTx.amount_cents,
        fullTx.currency,
        fullTx.exchange_rate,
        fullTx.base_amount_cents,
        fullTx.type,
        fullTx.to_account_id || null,
        fullTx.date,
        fullTx.note || null,
        fullTx.created_at,
      ]
    );

    if (fullTx.type === 'expense') {
      if (fullTx.card_id) {
        const card = db.getFirstSync<Card>('SELECT * FROM cards WHERE id = ?;', [fullTx.card_id]);
        if (card && card.type === 'debit' && card.bank_account_id) {
          db.runSync('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;', [fullTx.amount_cents, card.bank_account_id]);
        }
      } else if (fullTx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;', [fullTx.amount_cents, fullTx.account_id]);
      }
    } else if (fullTx.type === 'income') {
      if (fullTx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [fullTx.amount_cents, fullTx.account_id]);
      }
    } else if (fullTx.type === 'transfer') {
      if (fullTx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;', [fullTx.amount_cents, fullTx.account_id]);
      }
      if (fullTx.to_account_id) {
        const targetAcc = db.getFirstSync<Account>('SELECT id FROM accounts WHERE id = ?;', [fullTx.to_account_id]);
        if (targetAcc) {
          db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [fullTx.amount_cents, fullTx.to_account_id]);
        }
      }
    }
  });
}

export function deleteTransaction(txId: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const tx = store.transactions.find(t => t.id === txId);
    if (!tx) return;

    if (tx.type === 'expense') {
      if (tx.card_id) {
        const card = store.cards.find(c => c.id === tx.card_id);
        if (card && card.type === 'debit' && card.bank_account_id) {
          const acc = store.accounts.find(a => a.id === card.bank_account_id);
          if (acc) acc.balance_cents += tx.amount_cents;
        }
      } else if (tx.account_id) {
        const acc = store.accounts.find(a => a.id === tx.account_id);
        if (acc) acc.balance_cents += tx.amount_cents;
      }
    } else if (tx.type === 'income') {
      if (tx.account_id) {
        const acc = store.accounts.find(a => a.id === tx.account_id);
        if (acc) acc.balance_cents -= tx.amount_cents;
      }
    } else if (tx.type === 'transfer') {
      if (tx.account_id) {
        const acc = store.accounts.find(a => a.id === tx.account_id);
        if (acc) acc.balance_cents += tx.amount_cents;
      }
      if (tx.to_account_id) {
        const acc = store.accounts.find(a => a.id === tx.to_account_id);
        if (acc) acc.balance_cents -= tx.amount_cents;
      }
    }

    store.transactions = store.transactions.filter(t => t.id !== txId);
    saveWebStore(store);
    return;
  }

  const db = getDatabase();
  const tx = db?.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?;', [txId]);
  if (!tx || !db) return;

  db.withTransactionSync(() => {
    if (tx.type === 'expense') {
      if (tx.card_id) {
        const card = db.getFirstSync<Card>('SELECT * FROM cards WHERE id = ?;', [tx.card_id]);
        if (card && card.type === 'debit' && card.bank_account_id) {
          db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [tx.amount_cents, card.bank_account_id]);
        }
      } else if (tx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [tx.amount_cents, tx.account_id]);
      }
    } else if (tx.type === 'income') {
      if (tx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;', [tx.amount_cents, tx.account_id]);
      }
    } else if (tx.type === 'transfer') {
      if (tx.account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [tx.amount_cents, tx.account_id]);
      }
      if (tx.to_account_id) {
        db.runSync('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;', [tx.amount_cents, tx.to_account_id]);
      }
    }

    db.runSync('DELETE FROM transactions WHERE id = ?;', [txId]);
  });
}

// ----------------------------------------------------
// EXPORT & RESTORE BACKUP
// ----------------------------------------------------
export function exportDatabaseJSON(): string {
  const accounts = getAllAccounts();
  const cards = getAllCards();
  const categories = getAllCategories();
  const transactions = getAllTransactions(-1);
  const recurring_bills = getAllRecurringBills();
  const base_currency = getBaseCurrency();

  const backup: DatabaseBackup = {
    version: 3,
    exported_at: new Date().toISOString(),
    base_currency,
    accounts,
    cards,
    categories,
    transactions,
    recurring_bills,
  };

  return JSON.stringify(backup, null, 2);
}

export function exportTransactionsCSV(): string {
  const transactions = getAllTransactions(-1);
  const accounts = getAllAccounts();
  const cards = getAllCards();
  const categories = getAllCategories();

  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const cardMap = new Map(cards.map(c => [c.id, c.name]));
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Base Amount (Cents)', 'Account/Card', 'Category', 'Note'];
  const rows = transactions.map(tx => {
    const decimals = getCurrencyDecimals(tx.currency);
    const formattedAmount = (tx.amount_cents / Math.pow(10, decimals)).toFixed(decimals);
    const source = tx.card_id
      ? cardMap.get(tx.card_id) || 'Card'
      : tx.account_id
      ? accountMap.get(tx.account_id) || 'Account'
      : '';
    const categoryName = tx.category_id ? catMap.get(tx.category_id) || '' : '';
    // Prevent spreadsheet formula injection & escape quotes
    let note = (tx.note || '').replace(/"/g, '""');
    if (/^[=+\-@]/.test(note)) {
      note = `'${note}`;
    }

    return [
      tx.date,
      tx.type,
      formattedAmount,
      tx.currency,
      tx.base_amount_cents,
      `"${source}"`,
      `"${categoryName}"`,
      `"${note}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function importDatabaseJSON(jsonStr: string): boolean {
  try {
    const backup: DatabaseBackup = JSON.parse(jsonStr);

    // 1. Strict structural array validation
    if (
      !backup ||
      typeof backup !== 'object' ||
      !Array.isArray(backup.accounts) ||
      !Array.isArray(backup.cards) ||
      !Array.isArray(backup.categories) ||
      !Array.isArray(backup.transactions)
    ) {
      console.error('Invalid backup schema: Missing required arrays');
      return false;
    }

    // 2. Strict integer-cent arithmetic invariant validation
    for (const a of backup.accounts) {
      if (!Number.isSafeInteger(a.balance_cents)) {
        console.error(`Invalid balance integer in account: ${a.name}`);
        return false;
      }
    }
    for (const tx of backup.transactions) {
      if (!Number.isSafeInteger(tx.amount_cents) || !Number.isSafeInteger(tx.base_amount_cents)) {
        console.error(`Invalid monetary amount in transaction: ${tx.id}`);
        return false;
      }
    }
    if (backup.recurring_bills && Array.isArray(backup.recurring_bills)) {
      for (const r of backup.recurring_bills) {
        if (!Number.isSafeInteger(r.amount_cents)) {
          console.error(`Invalid monetary amount in recurring bill: ${r.id}`);
          return false;
        }
      }
    }

    if (Platform.OS === 'web') {
      const store: WebStore = {
        base_currency: backup.base_currency || 'INR',
        biometrics_enabled: false,
        accounts: backup.accounts,
        cards: backup.cards,
        categories: backup.categories,
        transactions: backup.transactions,
        recurring_bills: backup.recurring_bills || [],
      };
      saveWebStore(store);
      return true;
    }

    const db = getDatabase();
    if (!db) return false;

    db.withTransactionSync(() => {
      // Temporarily toggle foreign keys during full snapshot wipe to avoid cascade order races
      db.execSync('PRAGMA foreign_keys = OFF;');

      db.runSync('DELETE FROM transactions;');
      db.runSync('DELETE FROM cards;');
      db.runSync('DELETE FROM accounts;');
      db.runSync('DELETE FROM categories;');
      db.runSync('DELETE FROM recurring_bills;');

      setBaseCurrency(backup.base_currency || 'INR');

      for (const a of backup.accounts) {
        db.runSync(
          `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [a.id, a.name, a.type, a.balance_cents, a.currency, a.color, a.icon, a.created_at]
        );
      }

      for (const c of backup.cards) {
        db.runSync(
          `INSERT INTO cards (id, name, type, bank_account_id, currency, color, last4, credit_limit_cents, statement_day, due_day, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            c.id,
            c.name,
            c.type,
            c.bank_account_id || null,
            c.currency,
            c.color,
            c.last4 || null,
            c.credit_limit_cents || null,
            c.statement_day || null,
            c.due_day || null,
            c.created_at,
          ]
        );
      }

      for (const cat of backup.categories) {
        db.runSync(
          `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.monthly_budget_cents || null, cat.created_at || new Date().toISOString()]
        );
      }

      for (const tx of backup.transactions) {
        db.runSync(
          `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, to_account_id, date, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            tx.id,
            tx.account_id || null,
            tx.card_id || null,
            tx.category_id || null,
            tx.amount_cents,
            tx.currency,
            tx.exchange_rate,
            tx.base_amount_cents,
            tx.type,
            tx.to_account_id || null,
            tx.date,
            tx.note || null,
            tx.created_at,
          ]
        );
      }

      if (backup.recurring_bills && Array.isArray(backup.recurring_bills)) {
        for (const r of backup.recurring_bills) {
          db.runSync(
            `INSERT INTO recurring_bills (id, name, amount_cents, currency, category_id, account_id, card_id, frequency, due_day, due_month, last_paid_at, next_due_date, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              r.id,
              r.name,
              r.amount_cents,
              r.currency,
              r.category_id || null,
              r.account_id || null,
              r.card_id || null,
              r.frequency || 'monthly',
              r.due_day,
              r.due_month || null,
              r.last_paid_at || null,
              r.next_due_date || null,
              r.is_active ? 1 : 0,
              r.created_at,
            ]
          );
        }
      }

      db.execSync('PRAGMA foreign_keys = ON;');
    });

    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}
