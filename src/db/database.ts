import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Account, Card, Category, Transaction, DatabaseBackup } from '../types';
import { convertCurrency } from '../utils/currency';

const now = new Date().toISOString();

// Category presets (kept ready so user can categorize immediately)
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Dining & Food', icon: 'utensils', color: '#F87171', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_groceries', name: 'Groceries', icon: 'shopping-cart', color: '#34D399', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_coffee', name: 'Café & Snacks', icon: 'coffee', color: '#FBBF24', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_housing', name: 'Rent & Bills', icon: 'home', color: '#60A5FA', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_transport', name: 'Fuel & Cab', icon: 'car', color: '#A78BFA', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_shopping', name: 'Shopping', icon: 'shopping-bag', color: '#FB923C', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_subs', name: 'Subscriptions', icon: 'tv', color: '#756D63', type: 'expense', monthly_budget_cents: null, created_at: now },
  { id: 'cat_salary', name: 'Salary / Income', icon: 'briefcase', color: '#34D399', type: 'income', monthly_budget_cents: null, created_at: now },
  { id: 'cat_freelance', name: 'Side Hustle', icon: 'laptop', color: '#60A5FA', type: 'income', monthly_budget_cents: null, created_at: now },
];

// ZERO MOCK DATA - Clean slate for the user
const DEFAULT_ACCOUNTS: Account[] = [];
const DEFAULT_CARDS: Card[] = [];
const DEFAULT_TRANSACTIONS: Transaction[] = [];

// ----------------------------------------------------
// WEB STORAGE FALLBACK (LOCAL STORAGE)
// ----------------------------------------------------
const WEB_KEY = 'castra_local_store_v2';

interface WebStore {
  base_currency: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
}

function getWebStore(): WebStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      base_currency: 'INR',
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
    };
  }

  const raw = window.localStorage.getItem(WEB_KEY);
  if (!raw) {
    const initial: WebStore = {
      base_currency: 'INR',
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
    };
    window.localStorage.setItem(WEB_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed: WebStore = JSON.parse(raw);
    parsed.accounts = (parsed.accounts || []).filter(a => !['acc_main_bank', 'acc_savings', 'acc_cash_wallet'].includes(a.id));
    parsed.cards = (parsed.cards || []).filter(c => !['card_sapphire', 'card_debit'].includes(c.id));
    parsed.transactions = (parsed.transactions || []).filter(t => !['tx_1', 'tx_2', 'tx_3'].includes(t.id));
    return parsed;
  } catch {
    return {
      base_currency: 'INR',
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
    };
  }
}

function saveWebStore(store: WebStore): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(WEB_KEY, JSON.stringify(store));
  }
}

// ----------------------------------------------------
// NATIVE SQLITE INITIALIZATION
// ----------------------------------------------------
let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('castra.db');
    initNativeDatabase(dbInstance);
  }
  return dbInstance;
}

function initNativeDatabase(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;

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
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Ensure default base currency is INR
  const baseCurr = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['base_currency']);
  if (!baseCurr) {
    db.runSync('INSERT INTO settings (key, value) VALUES (?, ?);', ['base_currency', 'INR']);
  } else if (baseCurr.value === 'USD') {
    db.runSync('UPDATE settings SET value = ? WHERE key = ?;', ['INR', 'base_currency']);
  }

  // Ensure categories are seeded if empty
  const catCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (!catCount || catCount.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      db.runSync(
        `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [cat.id, cat.name, cat.icon, cat.color, cat.type, null, now]
      );
    }
  }

  // WIPE ANY OLD MOCK DATA so user gets a completely fresh app
  db.runSync("DELETE FROM transactions WHERE id IN ('tx_1', 'tx_2', 'tx_3') OR account_id IN ('acc_main_bank', 'acc_savings', 'acc_cash_wallet') OR card_id IN ('card_sapphire', 'card_debit');");
  db.runSync("DELETE FROM cards WHERE id IN ('card_sapphire', 'card_debit');");
  db.runSync("DELETE FROM accounts WHERE id IN ('acc_main_bank', 'acc_savings', 'acc_cash_wallet');");
}

// ----------------------------------------------------
// SETTINGS
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

// ----------------------------------------------------
// ACCOUNTS & CARDS (CRUD & BALANCE ADJUSTERS)
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
          .filter(t => t.card_id === card.id && t.type === 'transfer')
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

  return cards.map(card => {
    if (card.type === 'credit') {
      const result = db.getFirstSync<{ total_spent: number }>(
        `SELECT COALESCE(SUM(amount_cents), 0) as total_spent 
         FROM transactions 
         WHERE card_id = ? AND type = 'expense';`,
        [card.id]
      );
      const payments = db.getFirstSync<{ total_paid: number }>(
        `SELECT COALESCE(SUM(amount_cents), 0) as total_paid 
         FROM transactions 
         WHERE card_id = ? AND type = 'transfer';`,
        [card.id]
      );
      const spent = result?.total_spent || 0;
      const paid = payments?.total_paid || 0;
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

export function updateAccount(id: string, updates: Partial<Account>): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const idx = store.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      store.accounts[idx] = { ...store.accounts[idx], ...updates };
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  if (!db) return;
  const current = db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?;', [id]);
  if (!current) return;

  const merged = { ...current, ...updates };
  db.runSync(
    'UPDATE accounts SET name = ?, type = ?, balance_cents = ?, currency = ?, color = ? WHERE id = ?;',
    [merged.name, merged.type, merged.balance_cents, merged.currency, merged.color, id]
  );
}

export function deleteAccount(id: string): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    store.accounts = store.accounts.filter(a => a.id !== id);
    store.transactions = store.transactions.filter(t => t.account_id !== id);
    saveWebStore(store);
    return;
  }
  const db = getDatabase();
  db?.runSync('DELETE FROM accounts WHERE id = ?;', [id]);
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

export function updateCard(id: string, updates: Partial<Card>): void {
  if (Platform.OS === 'web') {
    const store = getWebStore();
    const idx = store.cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      store.cards[idx] = { ...store.cards[idx], ...updates };
      saveWebStore(store);
    }
    return;
  }
  const db = getDatabase();
  if (!db) return;
  const current = db.getFirstSync<Card>('SELECT * FROM cards WHERE id = ?;', [id]);
  if (!current) return;

  const merged = { ...current, ...updates };
  db.runSync(
    `UPDATE cards SET name = ?, type = ?, bank_account_id = ?, currency = ?, color = ?, last4 = ?, credit_limit_cents = ?, statement_day = ?, due_day = ? WHERE id = ?;`,
    [
      merged.name,
      merged.type,
      merged.bank_account_id || null,
      merged.currency,
      merged.color,
      merged.last4 || null,
      merged.credit_limit_cents || null,
      merged.statement_day || null,
      merged.due_day || null,
      id,
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
  db?.runSync('DELETE FROM cards WHERE id = ?;', [id]);
}

export function getAllCategories(): Category[] {
  if (Platform.OS === 'web') {
    return getWebStore().categories;
  }
  const db = getDatabase();
  return db?.getAllSync<Category>('SELECT * FROM categories ORDER BY type ASC, name ASC;') || [];
}

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------
export function getAllTransactions(limit: number = 200): Transaction[] {
  if (Platform.OS === 'web') {
    return getWebStore().transactions.slice(0, limit);
  }
  const db = getDatabase();
  return db?.getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?;',
    [limit]
  ) || [];
}

export function getTransactionsByEntity(entityId: string): Transaction[] {
  if (Platform.OS === 'web') {
    return getWebStore().transactions.filter(
      t => t.account_id === entityId || t.card_id === entityId || t.to_account_id === entityId
    );
  }
  const db = getDatabase();
  return db?.getAllSync<Transaction>(
    `SELECT * FROM transactions 
     WHERE account_id = ? OR card_id = ? OR to_account_id = ? 
     ORDER BY date DESC, created_at DESC;`,
    [entityId, entityId, entityId]
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
        db.runSync('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;', [fullTx.amount_cents, fullTx.to_account_id]);
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
// EXPORT & IMPORT
// ----------------------------------------------------
export function exportDatabaseJSON(): string {
  const baseCurrency = getBaseCurrency();
  const accounts = getAllAccounts();
  const cards = getAllCards();
  const categories = getAllCategories();
  const transactions = getAllTransactions(10000);

  const backup: DatabaseBackup = {
    version: 2,
    exported_at: new Date().toISOString(),
    base_currency: baseCurrency,
    accounts,
    cards,
    categories,
    transactions,
  };

  return JSON.stringify(backup, null, 2);
}

export function exportTransactionsCSV(): string {
  const transactions = getAllTransactions(10000);
  const accounts = getAllAccounts();
  const cards = getAllCards();
  const categories = getAllCategories();

  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const cardMap = new Map(cards.map(c => [c.id, c.name]));
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Base Amount (Cents)', 'Account/Card', 'Category', 'Note'];
  const rows = transactions.map(tx => {
    const formattedAmount = (tx.amount_cents / 100).toFixed(2);
    const source = tx.card_id
      ? cardMap.get(tx.card_id) || 'Card'
      : tx.account_id
      ? accountMap.get(tx.account_id) || 'Account'
      : '';
    const categoryName = tx.category_id ? catMap.get(tx.category_id) || '' : '';
    const note = (tx.note || '').replace(/"/g, '""');

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
    if (!backup.accounts || !backup.transactions) {
      throw new Error('Invalid backup schema');
    }

    if (Platform.OS === 'web') {
      const store: WebStore = {
        base_currency: backup.base_currency || 'INR',
        accounts: backup.accounts,
        cards: backup.cards,
        categories: backup.categories,
        transactions: backup.transactions,
      };
      saveWebStore(store);
      return true;
    }

    const db = getDatabase();
    if (!db) return false;

    db.withTransactionSync(() => {
      db.runSync('DELETE FROM transactions;');
      db.runSync('DELETE FROM cards;');
      db.runSync('DELETE FROM accounts;');
      db.runSync('DELETE FROM categories;');

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
    });

    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}
