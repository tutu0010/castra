import * as SQLite from 'expo-sqlite';
import { Account, Card, Category, Transaction, DatabaseBackup } from '../types';
import { convertCurrency } from '../utils/currency';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('castra.db');
    initDatabase(dbInstance);
  }
  return dbInstance;
}

function initDatabase(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'bank' | 'wallet'
      balance_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      color TEXT NOT NULL DEFAULT '#2C343E',
      icon TEXT NOT NULL DEFAULT 'landmark',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'credit' | 'debit'
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
      type TEXT NOT NULL DEFAULT 'expense', -- 'expense' | 'income'
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
      type TEXT NOT NULL, -- 'expense' | 'income' | 'transfer'
      to_account_id TEXT,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Seed default data if brand new
  const accountCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM accounts;');
  if (!accountCount || accountCount.count === 0) {
    seedInitialData(db);
  }
}

function seedInitialData(db: SQLite.SQLiteDatabase) {
  const now = new Date().toISOString();

  // Settings
  db.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?), (?, ?);',
    ['base_currency', 'USD', 'theme', 'cozy']
  );

  // Accounts
  const mainBankId = 'acc_main_bank';
  const savingsId = 'acc_savings';
  const cashWalletId = 'acc_cash_wallet';

  db.runSync(
    `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at) VALUES 
      (?, 'Main Checking', 'bank', 425000, 'USD', '#2C343E', 'landmark', ?),
      (?, 'High Yield Savings', 'bank', 1250000, 'USD', '#44624D', 'piggy-bank', ?),
      (?, 'Pocket Cash', 'wallet', 8500, 'USD', '#7D7060', 'wallet', ?);`,
    [mainBankId, now, savingsId, now, cashWalletId, now]
  );

  // Cards
  const sapphireId = 'card_sapphire';
  const debitId = 'card_debit';

  db.runSync(
    `INSERT INTO cards (id, name, type, bank_account_id, currency, color, last4, credit_limit_cents, statement_day, due_day, created_at) VALUES
      (?, 'Sapphire Reserve', 'credit', ?, 'USD', '#3E4968', '4821', 600000, 20, 10, ?),
      (?, 'Checking Debit Card', 'debit', ?, 'USD', '#B85D43', '9012', NULL, NULL, NULL, ?);`,
    [sapphireId, mainBankId, now, debitId, mainBankId, now]
  );

  // Categories
  db.runSync(`
    INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at) VALUES
      ('cat_food', 'Dining & Food', 'utensils', '#C8543B', 'expense', 45000, '${now}'),
      ('cat_groceries', 'Groceries', 'shopping-cart', '#3B7A57', 'expense', 50000, '${now}'),
      ('cat_coffee', 'Coffee & Treats', 'coffee', '#B85D43', 'expense', 8000, '${now}'),
      ('cat_housing', 'Rent & Utilities', 'home', '#4B6B94', 'expense', 150000, '${now}'),
      ('cat_transport', 'Transport & Fuel', 'car', '#D68832', 'expense', 18000, '${now}'),
      ('cat_shopping', 'Shopping & Gear', 'shopping-bag', '#634832', 'expense', 25000, '${now}'),
      ('cat_subs', 'Subscriptions', 'tv', '#7D7060', 'expense', 6000, '${now}'),
      ('cat_salary', 'Salary & Work', 'briefcase', '#3B7A57', 'income', NULL, '${now}'),
      ('cat_freelance', 'Side Hustles', 'laptop', '#4B6B94', 'income', NULL, '${now}');
  `);

  // Sample realistic initial transactions
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

  // 1. Grocery on credit card
  db.runSync(
    `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, date, note, created_at)
     VALUES ('tx_1', NULL, ?, 'cat_groceries', 6450, 'USD', 1.0, 6450, 'expense', ?, 'Trader Joe\\\'s weekly restock', ?);`,
    [sapphireId, yesterday, yesterday]
  );

  // 2. Coffee on debit card (deducted from main bank)
  db.runSync(
    `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, date, note, created_at)
     VALUES ('tx_2', ?, ?, 'cat_coffee', 675, 'USD', 1.0, 675, 'expense', ?, 'Artisan Flat White', ?);`,
    [mainBankId, debitId, yesterday, yesterday]
  );

  // 3. Dinner on credit card
  db.runSync(
    `INSERT INTO transactions (id, account_id, card_id, category_id, amount_cents, currency, exchange_rate, base_amount_cents, type, date, note, created_at)
     VALUES ('tx_3', NULL, ?, 'cat_food', 4820, 'USD', 1.0, 4820, 'expense', ?, 'Neighborhood Italian Bistro', ?);`,
    [sapphireId, twoDaysAgo, twoDaysAgo]
  );
}

// ----------------------------------------------------
// SETTINGS QUERIES
// ----------------------------------------------------
export function getBaseCurrency(): string {
  const db = getDatabase();
  const res = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?;', ['base_currency']);
  return res?.value || 'USD';
}

export function setBaseCurrency(currency: string): void {
  const db = getDatabase();
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);', ['base_currency', currency]);
}

// ----------------------------------------------------
// ACCOUNTS & CARDS QUERIES
// ----------------------------------------------------
export function getAllAccounts(): Account[] {
  const db = getDatabase();
  return db.getAllSync<Account>('SELECT * FROM accounts ORDER BY created_at ASC;');
}

export function getAllCards(): Card[] {
  const db = getDatabase();
  const cards = db.getAllSync<Card>('SELECT * FROM cards ORDER BY created_at ASC;');

  // Compute outstanding balance for credit cards
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
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [account.id, account.name, account.type, account.balance_cents, account.currency, account.color, account.icon, now]
  );
}

export function createCard(card: Omit<Card, 'created_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO cards (id, name, type, bank_account_id, currency, color, last4, credit_limit_cents, statement_day, due_day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      card.id,
      card.name,
      card.type,
      card.bank_account_id || null,
      card.currency,
      card.color,
      card.last4 || null,
      card.credit_limit_cents || null,
      card.statement_day || null,
      card.due_day || null,
      now,
    ]
  );
}

export function getAllCategories(): Category[] {
  const db = getDatabase();
  return db.getAllSync<Category>('SELECT * FROM categories ORDER BY type ASC, name ASC;');
}

export function createCategory(cat: Omit<Category, 'created_at'>): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.monthly_budget_cents || null, now]
  );
}

// ----------------------------------------------------
// TRANSACTION & LEDGER QUERIES
// ----------------------------------------------------
export function getAllTransactions(limit: number = 100): Transaction[] {
  const db = getDatabase();
  return db.getAllSync<Transaction>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?;',
    [limit]
  );
}

export function addTransaction(tx: Omit<Transaction, 'created_at' | 'base_amount_cents' | 'exchange_rate'>): void {
  const db = getDatabase();
  const baseCurrency = getBaseCurrency();
  const { convertedCents, rate } = convertCurrency(tx.amount_cents, tx.currency, baseCurrency);
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    // 1. Insert transaction record
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
        rate,
        convertedCents,
        tx.type,
        tx.to_account_id || null,
        tx.date,
        tx.note || null,
        now,
      ]
    );

    // 2. Adjust account balances
    if (tx.type === 'expense') {
      if (tx.card_id) {
        // If it's a debit card, debit the linked bank account directly
        const card = db.getFirstSync<Card>('SELECT * FROM cards WHERE id = ?;', [tx.card_id]);
        if (card && card.type === 'debit' && card.bank_account_id) {
          db.runSync(
            'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;',
            [tx.amount_cents, card.bank_account_id]
          );
        }
        // If credit card, liability simply accumulates (tracked via transactions)
      } else if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
    } else if (tx.type === 'income') {
      if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
    } else if (tx.type === 'transfer') {
      // Source account decreases
      if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
      // Target account increases
      if (tx.to_account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;',
          [tx.amount_cents, tx.to_account_id]
        );
      }
      // Or if paying a credit card, the card_id tracks the payment reduction
    }
  });
}

export function deleteTransaction(txId: string): void {
  const db = getDatabase();
  const tx = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?;', [txId]);
  if (!tx) return;

  db.withTransactionSync(() => {
    // Revert balance changes
    if (tx.type === 'expense') {
      if (tx.card_id) {
        const card = db.getFirstSync<Card>('SELECT * FROM cards WHERE id = ?;', [tx.card_id]);
        if (card && card.type === 'debit' && card.bank_account_id) {
          db.runSync(
            'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;',
            [tx.amount_cents, card.bank_account_id]
          );
        }
      } else if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
    } else if (tx.type === 'income') {
      if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
    } else if (tx.type === 'transfer') {
      if (tx.account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?;',
          [tx.amount_cents, tx.account_id]
        );
      }
      if (tx.to_account_id) {
        db.runSync(
          'UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?;',
          [tx.amount_cents, tx.to_account_id]
        );
      }
    }

    db.runSync('DELETE FROM transactions WHERE id = ?;', [txId]);
  });
}

// ----------------------------------------------------
// EXPORT & IMPORT MECHANICS
// ----------------------------------------------------
export function exportDatabaseJSON(): string {
  const db = getDatabase();
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

    const db = getDatabase();
    db.withTransactionSync(() => {
      // Clear existing
      db.runSync('DELETE FROM transactions;');
      db.runSync('DELETE FROM cards;');
      db.runSync('DELETE FROM accounts;');
      db.runSync('DELETE FROM categories;');

      if (backup.base_currency) {
        setBaseCurrency(backup.base_currency);
      }

      // Restore accounts
      for (const a of backup.accounts) {
        db.runSync(
          `INSERT INTO accounts (id, name, type, balance_cents, currency, color, icon, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [a.id, a.name, a.type, a.balance_cents, a.currency, a.color, a.icon, a.created_at]
        );
      }

      // Restore cards
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

      // Restore categories
      for (const cat of backup.categories) {
        db.runSync(
          `INSERT INTO categories (id, name, icon, color, type, monthly_budget_cents, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.monthly_budget_cents || null, cat.created_at || new Date().toISOString()]
        );
      }

      // Restore transactions
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
