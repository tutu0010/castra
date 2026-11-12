export type AccountType = 'bank' | 'wallet';
export type CardType = 'credit' | 'debit';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type DateFilterType = 'all' | 'this_month' | 'last_month' | 'last_30_days';

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
  statement_day?: number | null;
  due_day?: number | null;
  created_at: string;
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
  exchange_rate: number;
  base_amount_cents: number;
  type: TransactionType;
  to_account_id?: string | null;
  date: string;
  note?: string;
  created_at: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount_cents: number;
  currency: string;
  category_id?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  frequency: 'monthly' | 'yearly' | 'weekly';
  due_day: number; // 1-31
  is_active: boolean;
  created_at: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
}

export interface DatabaseBackup {
  version: number;
  exported_at: string;
  base_currency: string;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  recurring_bills?: RecurringBill[];
}
