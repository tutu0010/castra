import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Account, Card, Category, Transaction, DatabaseBackup } from '../types';
import { convertCurrency } from '../utils/currency';

// ----------------------------------------------------
// DEFAULT SEED DATA
// ----------------------------------------------------
const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc_main_bank',
    name: 'Main Checking',
    type: 'bank',
    balance_cents: 425000,
    currency: 'USD',
    color: '#2C343E',
    icon: 'landmark',
    created_at: now,
  },
  {
    id: 'acc_savings',
    name: 'High Yield Savings',
    type: 'bank',
    balance_cents: 1250000,
    currency: 'USD',
    color: '#44624D',
    icon: 'piggy-bank',
    created_at: now,
  },
  {
    id: 'acc_cash_wallet',
    name: 'Pocket Cash',
    type: 'wallet',
    balance_cents: 8500,
    currency: 'USD',
    color: '#7D7060',
    icon: 'wallet',
    created_at: now,
  },
];

const DEFAULT_CARDS: Card[] = [
  {
    id: 'card_sapphire',
    name: 'Sapphire Reserve',
    type: 'credit',
    bank_account_id: 'acc_main_bank',
    currency: 'USD',
    color: '#3E4968',
    last4: '4821',
    credit_limit_cents: 600000,
    statement_day: 20,
    due_day: 10,
    created_at: now,
  },
  {
    id: 'card_debit',
    name: 'Checking Debit Card',
    type: 'debit',
    bank_account_id: 'acc_main_bank',
    currency: 'USD',
    color: '#B85D43',
    last4: '9012',
    created_at: now,
  },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Dining & Food', icon: 'utensils', color: '#C8543B', type: 'expense', monthly_budget_cents: 45000, created_at: now },
  { id: 'cat_groceries', name: 'Groceries', icon: 'shopping-cart', color: '#3B7A57', type: 'expense', monthly_budget_cents: 50000, created_at: now },
  { id: 'cat_coffee', name: 'Coffee & Treats', icon: 'coffee', color: '#B85D43', type: 'expense', monthly_budget_cents: 8000, created_at: now },
  { id: 'cat_housing', name: 'Rent & Utilities', icon: 'home', color: '#4B6B94', type: 'expense', monthly_budget_cents: 150000, created_at: now },
  { id: 'cat_transport', name: 'Transport & Fuel', icon: 'car', color: '#D68832', type: 'expense', monthly_budget_cents: 18000, created_at: now },
  { id: 'cat_shopping', name: 'Shopping & Gear', icon: 'shopping-bag', color: '#634832', type: 'expense', monthly_budget_cents: 25000, created_at: now },
  { id: 'cat_subs', name: 'Subscriptions', icon: 'tv', color: '#7D7060', type: 'expense', monthly_budget_cents: 6000, created_at: now },
  { id: 'cat_salary', name: 'Salary & Work', icon: 'briefcase', color: '#3B7A57', type: 'income', monthly_budget_cents: null, created_at: now },
  { id: 'cat_freelance', name: 'Side Hustles', icon: 'laptop', color: '#4B6B94', type: 'income', monthly_budget_cents: null, created_at: now },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [];

// ----------------------------------------------------
// WEB STORAGE FALLBACK (LOCAL STORAGE)
// ----------------------------------------------------
const WEB_KEY = 'castra_local_store_v1';

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
      base_currency: 'USD',
      accounts: DEFAULT_ACCOUNTS,
      cards: DEFAULT_CARDS,
      categories: DEFAULT_CATEGORIES,
      transactions: DEFAULT_TRANSACTIONS,
    };
  }

  const raw = window.localStorage.getItem(WEB_KEY);
  if (!raw) {
    const initial: WebStore = {
      base_currency: 'USD',
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
    parsed.transactions = (parsed.transactions || []).filter(t => !['tx_1', 'tx_2', 'tx_3'].includes(t.id));
    return parsed;
  } catch {
    return {
      base_currency: 'USD',
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
      currency TEXT NOT NULL DEFAULT 'USD',
      color TEXT NOT NULL DEFAULT '#2C343E',
      icon TEXT NOT NULL DEFAULT 'landmark',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      bank_account_id TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      color TEXT NOT NULL DEFAULT '#3E4968',
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
      color TEXT NOT NULL DEFAULT '#787067',
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
      currency TEXT NOT NULL DEFAULT 'USD',
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

  const accountCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM accounts;');
  if (!accountCount || accountCount.count === 0) {
    seedNativeData(db);
  }
  // Clear any mock seed transactions so user starts with a clean slate
  db.runSync("DELETE FROM transactions WHERE id IN ('tx_1', 'tx_2', 'tx_3');");
}

function seedNativeData(db: SQLite.SQLiteDatabase) {
  db.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
    ['base_currency', 'USD']
  );

  for (const acc of DEFAULT_ACCOUNTS) {
    db.runSync(
      `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [acc.id, acc.name, acc.type, acc.balance_cents, acc.currency, acc.color, acc.icon, acc.created_at]
    );
  }

  for (const c of DEFAULT_CARDS) {
    db.runSync(
      `INSERT INTO cards (id, name, type, bank_account_id, currency, color, last4, credit_limit_cents, statement_day, due_day, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [c.id, c.name, c.type, c.bank_account_id || null, c.currency, c.color, c.last4 || null, c.credit_limit_cents || null, c.statement_day || null, c.due_day || null, c.created_at]
    );
  }

  for (const cat of DEFAULT_CATEGORIES) {
    db.runSync(
      `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.monthly_budget_cents || null, cat.created_at || now]
    );
  }

  for (const tx of DEFAULT_TRANSACTIONS) {
    db.runSync(
      `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [tx.id, tx.account_id || null, tx.card_id || null, tx.category_id || null, tx.amount_cents, tx.currency, tx.exchange_rate, tx.base_amount_cents, tx.type, tx.date, tx.note || null, tx.created_at]
    );
  }
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export function getBaseCurrency(): string {
  if (Platform.OS === 'web') {
    return getWebStore().base_currency;
  }
  const db = getDatabase();
  const res = db?.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['base_currency']);
  return res?.value || 'USD';
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
export function getAllTransactions(limit: number = 100): Transaction[] {
  if (Platform.OS === 'web') {
    return getWebStore().transactions.slice(0, limit);
  }
  const db = getDatabase();
  return db?.getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?;',
    [limit]
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

    // Update balances
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
    version: 1,
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
        base_currency: backup.base_currency || 'USD',
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

      if (backup.base_currency) {
        setBaseCurrency(backup.base_currency);
      }

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
