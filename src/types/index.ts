export type AccountType = 'bank' | 'wallet';
export type CardType = 'credit' | 'debit';
export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance_cents: number;
  currency: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  bank_account_id?: string | null;
  currency: string;
  color: string;
  last4?: string;
  credit_limit_cents?: number | null;
  statement_day?: number | null; // e.g. 20th of month
  due_day?: number | null;       // e.g. 10th of next month
  created_at: string;
  // Computed for credit cards
  outstanding_balance_cents?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  monthly_budget_cents?: number | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  account_id?: string | null;
  card_id?: string | null;
  category_id?: string | null;
  amount_cents: number;
  currency: string;
  exchange_rate: number; // multiplier to get base currency
  base_amount_cents: number;
  type: TransactionType;
  to_account_id?: string | null; // for transfers
  date: string;
  note?: string;
  created_at: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateToBase: number; // 1 unit of this currency = X base currency
}

export interface DatabaseBackup {
  version: number;
  exported_at: string;
  base_currency: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
}
