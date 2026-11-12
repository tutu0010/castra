import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  History,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  Target,
  BarChart3,
} from 'lucide-react-native';

import { CozyTheme } from './src/theme/colors';
import { Account, Card, Category, Transaction, RecurringBill, DateFilterType } from './src/types';
import {
  getAllAccounts,
  getAllCards,
  getAllCategories,
  getAllTransactions,
  getAllRecurringBills,
  getBaseCurrency,
  setBaseCurrency,
  addTransaction,
  deleteTransaction,
  createAccount,
  createCard,
  updateAccountBalance,
  deleteAccount,
  deleteCard,
  updateCategoryBudget,
  createRecurringBill,
  toggleRecurringBill,
  deleteRecurringBill,
} from './src/db/database';

import { BiometricGate } from './src/components/BiometricGate';
import { SummaryHeader } from './src/components/SummaryHeader';
import { CardDeck } from './src/components/CardDeck';
import { TransactionItem } from './src/components/TransactionItem';
import { QuickAddModal } from './src/components/QuickAddModal';
import { AddAccountOrCardModal } from './src/components/AddAccountOrCardModal';
import { SettingsBackupModal } from './src/components/SettingsBackupModal';
import { AccountDetailModal } from './src/components/AccountDetailModal';
import { FilterSearchBar } from './src/components/FilterSearchBar';
import { BudgetPaceCard } from './src/components/BudgetPaceCard';
import { SetBudgetModal } from './src/components/SetBudgetModal';
import { RecurringRadar } from './src/components/RecurringRadar';
import { AddRecurringBillModal } from './src/components/AddRecurringBillModal';
import { AnalyticsView } from './src/components/AnalyticsView';

import { formatMoney } from './src/utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from './src/utils/haptics';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'budgets' | 'analytics'>('ledger');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [baseCurrency, setBaseCurr] = useState<string>('INR');

  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Sub-page selection
  const [selectedEntity, setSelectedEntity] = useState<Account | Card | null>(null);

  // Modals
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [addEntityVisible, setAddEntityVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [setBudgetVisible, setSetBudgetVisible] = useState(false);
  const [addRecurringVisible, setAddRecurringVisible] = useState(false);

  const loadData = useCallback(() => {
    try {
      const accs = getAllAccounts();
      const crds = getAllCards();
      const cats = getAllCategories();
      const txs = getAllTransactions(300);
      const bills = getAllRecurringBills();
      const curr = getBaseCurrency();

      setAccounts(accs);
      setCards(crds);
      setCategories(cats);
      setTransactions(txs);
      setRecurringBills(bills);
      setBaseCurr(curr || 'INR');

      // Keep selected entity updated if opened
      if (selectedEntity) {
        const updatedAcc = accs.find(a => a.id === selectedEntity.id);
        const updatedCard = crds.find(c => c.id === selectedEntity.id);
        setSelectedEntity(updatedAcc || updatedCard || null);
      }
    } catch (err) {
      console.error('Failed to load local DB data:', err);
    }
  }, [selectedEntity]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  // Transaction Handlers
  const handleSaveTransaction = (txData: any) => {
    const id = `tx_${Date.now()}`;
    addTransaction({
      id,
      ...txData,
    });
    loadData();
  };

  const handleDeleteTransaction = (txId: string) => {
    deleteTransaction(txId);
    loadData();
  };

  // Balance Adjuster (Direct modification)
  const handleUpdateBalance = (entityId: string, newBalanceCents: number) => {
    updateAccountBalance(entityId, newBalanceCents);
    loadData();
  };

  // Delete entity
  const handleDeleteEntity = (entityId: string, isCard: boolean) => {
    if (isCard) {
      deleteCard(entityId);
    } else {
      deleteAccount(entityId);
    }
    setSelectedEntity(null);
    loadData();
  };

  // Pay Card shortcut: auto-pay credit card from primary bank
  const handlePayCard = (card: Card) => {
    triggerLightHaptic();
    const primaryBank = accounts.find(a => a.type === 'bank');
    if (!primaryBank || !card.outstanding_balance_cents) return;

    addTransaction({
      id: `pay_${Date.now()}`,
      account_id: primaryBank.id,
      card_id: card.id,
      amount_cents: card.outstanding_balance_cents,
      currency: card.currency,
      type: 'transfer',
      date: new Date().toISOString(),
      note: `Bill payment for ${card.name}`,
    });

    triggerSuccessHaptic();
    loadData();
  };

  // Pay Recurring Bill shortcut (1-tap)
  const handlePayBill = (bill: RecurringBill) => {
    triggerLightHaptic();
    addTransaction({
      id: `rec_pay_${Date.now()}`,
      account_id: bill.account_id,
      card_id: bill.card_id,
      category_id: bill.category_id,
      amount_cents: bill.amount_cents,
      currency: bill.currency,
      type: 'expense',
      date: new Date().toISOString(),
      note: bill.name,
    });
    triggerSuccessHaptic();
    loadData();
  };

  // Save Category Budget
  const handleSaveBudget = (categoryId: string, monthlyBudgetCents: number | null) => {
    updateCategoryBudget(categoryId, monthlyBudgetCents);
    loadData();
  };

  // Save Recurring Bill
  const handleSaveRecurring = (bill: Omit<RecurringBill, 'created_at'>) => {
    createRecurringBill(bill);
    loadData();
  };

  const handleToggleRecurring = (id: string, isActive: boolean) => {
    toggleRecurringBill(id, isActive);
    loadData();
  };

  const handleDeleteRecurring = (id: string) => {
    deleteRecurringBill(id);
    loadData();
  };

  const handleBaseCurrencyChange = (newCurr: string) => {
    setBaseCurrency(newCurr);
    setBaseCurr(newCurr);
    loadData();
  };

  // Monthly stats calculations
  const totalExpenseCents = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.base_amount_cents, 0);

  const totalIncomeCents = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.base_amount_cents, 0);

  // Filtered transactions for the ledger view
  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const noteMatch = tx.note ? tx.note.toLowerCase().includes(q) : false;
      const cat = categories.find((c) => c.id === tx.category_id);
      const catMatch = cat ? cat.name.toLowerCase().includes(q) : false;
      const acc = accounts.find((a) => a.id === tx.account_id);
      const accMatch = acc ? acc.name.toLowerCase().includes(q) : false;
      const card = cards.find((c) => c.id === tx.card_id);
      const cardMatch = card ? card.name.toLowerCase().includes(q) : false;
      if (!noteMatch && !catMatch && !accMatch && !cardMatch) {
        return false;
      }
    }

    if (selectedCategoryId && tx.category_id !== selectedCategoryId) {
      return false;
    }

    if (dateFilter !== 'all') {
      const txDate = new Date(tx.date);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (dateFilter === 'this_month') {
        if (txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) {
          return false;
        }
      } else if (dateFilter === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        if (
          txDate.getFullYear() !== lastMonthDate.getFullYear() ||
          txDate.getMonth() !== lastMonthDate.getMonth()
        ) {
          return false;
        }
      } else if (dateFilter === 'last_30_days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (txDate < thirtyDaysAgo) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <SafeAreaProvider>
      <BiometricGate>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />

          {/* Top Level Summary Header */}
          <SummaryHeader
            accounts={accounts}
            cards={cards}
            baseCurrency={baseCurrency}
            onOpenSettings={() => setSettingsVisible(true)}
          />

          {/* Segmented Navigation Tab Bar */}
          <View style={styles.tabNavRow}>
            <TouchableOpacity
              style={[styles.tabNavButton, activeTab === 'ledger' && styles.tabNavButtonActive]}
              onPress={() => {
                triggerLightHaptic();
                setActiveTab('ledger');
              }}
              activeOpacity={0.7}
            >
              <BookOpen
                size={14}
                color={activeTab === 'ledger' ? CozyTheme.textInverse : CozyTheme.textSecondary}
              />
              <Text style={[styles.tabNavText, activeTab === 'ledger' && styles.tabNavTextActive]}>
                Ledger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabNavButton, activeTab === 'budgets' && styles.tabNavButtonActive]}
              onPress={() => {
                triggerLightHaptic();
                setActiveTab('budgets');
              }}
              activeOpacity={0.7}
            >
              <Target
                size={14}
                color={activeTab === 'budgets' ? CozyTheme.textInverse : CozyTheme.textSecondary}
              />
              <Text style={[styles.tabNavText, activeTab === 'budgets' && styles.tabNavTextActive]}>
                Budgets & Radar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabNavButton, activeTab === 'analytics' && styles.tabNavButtonActive]}
              onPress={() => {
                triggerLightHaptic();
                setActiveTab('analytics');
              }}
              activeOpacity={0.7}
            >
              <BarChart3
                size={14}
                color={activeTab === 'analytics' ? CozyTheme.textInverse : CozyTheme.textSecondary}
              />
              <Text style={[styles.tabNavText, activeTab === 'analytics' && styles.tabNavTextActive]}>
                Analytics
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: LEDGER */}
          {activeTab === 'ledger' && (
            <ScrollView
              style={styles.container}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={CozyTheme.textSecondary}
                />
              }
            >
              {/* Quick Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <View style={styles.statHeader}>
                    <ArrowDownRight size={14} color={CozyTheme.expense} />
                    <Text style={styles.statLabel}>Total Spend</Text>
                  </View>
                  <Text style={styles.statAmountExpense}>
                    {formatMoney(totalExpenseCents, baseCurrency)}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <View style={styles.statHeader}>
                    <ArrowUpRight size={14} color={CozyTheme.income} />
                    <Text style={styles.statLabel}>Total Income</Text>
                  </View>
                  <Text style={styles.statAmountIncome}>
                    {formatMoney(totalIncomeCents, baseCurrency)}
                  </Text>
                </View>
              </View>

              {/* Accounts & Cards Hub */}
              <CardDeck
                accounts={accounts}
                cards={cards}
                onPressEntity={(entity) => {
                  setSelectedEntity(entity);
                }}
                onAddPress={() => setAddEntityVisible(true)}
              />

              {/* Smart Search & Filter Bar */}
              <FilterSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                categories={categories}
                totalResults={filteredTransactions.length}
                totalEntries={transactions.length}
              />

              {/* Ledger Section Header */}
              <View style={styles.feedHeaderRow}>
                <View style={styles.feedTitleGroup}>
                  <History size={15} color={CozyTheme.textSecondary} />
                  <Text style={styles.feedTitle}>Recent Activity</Text>
                </View>
                <Text style={styles.transactionCountText}>
                  {filteredTransactions.length} entries
                </Text>
              </View>

              {/* Transaction List / Clean Empty State */}
              <View style={styles.transactionsList}>
                {filteredTransactions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <ShieldCheck size={24} color={CozyTheme.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>
                      {transactions.length === 0 ? 'Fresh Ledger Ready' : 'No Matching Entries'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {transactions.length === 0
                        ? 'Add your bank accounts, cards, or tap the button below to record your first entry.'
                        : 'Try clearing your filters or search keywords to view all transactions.'}
                    </Text>
                    {transactions.length === 0 && (
                      <TouchableOpacity
                        style={styles.emptyAddButton}
                        onPress={() => setQuickAddVisible(true)}
                      >
                        <Plus size={16} color={CozyTheme.textInverse} style={{ marginRight: 6 }} />
                        <Text style={styles.emptyAddButtonText}>Record Entry</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      accounts={accounts}
                      cards={cards}
                      categories={categories}
                      baseCurrency={baseCurrency}
                      onDelete={handleDeleteTransaction}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* TAB 2: BUDGETS & RADAR */}
          {activeTab === 'budgets' && (
            <ScrollView
              style={styles.container}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={CozyTheme.textSecondary}
                />
              }
            >
              {/* Category Budgets & Daily Safe Pace */}
              <BudgetPaceCard
                categories={categories}
                transactions={transactions}
                baseCurrency={baseCurrency}
                onOpenBudgetModal={() => setSetBudgetVisible(true)}
              />

              {/* Recurring Bills & Subscription Radar */}
              <RecurringRadar
                bills={recurringBills}
                accounts={accounts}
                cards={cards}
                categories={categories}
                baseCurrency={baseCurrency}
                onPayBill={handlePayBill}
                onToggleBill={handleToggleRecurring}
                onDeleteBill={handleDeleteRecurring}
                onOpenAddBill={() => setAddRecurringVisible(true)}
              />
            </ScrollView>
          )}

          {/* TAB 3: VISUAL CASH FLOW & ANALYTICS CHARTS */}
          {activeTab === 'analytics' && (
            <AnalyticsView
              transactions={transactions}
              categories={categories}
              baseCurrency={baseCurrency}
            />
          )}

          {/* Floating Quick-Add Button */}
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={() => {
                triggerLightHaptic();
                setQuickAddVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Plus size={20} color={CozyTheme.textInverse} />
              <Text style={styles.fabText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          {/* Account / Card Detail Sub-Page (with balance adjuster) */}
          <AccountDetailModal
            visible={!!selectedEntity}
            onClose={() => setSelectedEntity(null)}
            entity={selectedEntity}
            transactions={transactions}
            accounts={accounts}
            cards={cards}
            categories={categories}
            baseCurrency={baseCurrency}
            onUpdateBalance={handleUpdateBalance}
            onDeleteEntity={handleDeleteEntity}
            onDeleteTransaction={handleDeleteTransaction}
            onPayCreditCard={handlePayCard}
          />

          {/* Quick Add Log Modal */}
          <QuickAddModal
            visible={quickAddVisible}
            onClose={() => setQuickAddVisible(false)}
            accounts={accounts}
            cards={cards}
            categories={categories}
            baseCurrency={baseCurrency}
            onSave={handleSaveTransaction}
            onOpenAddEntity={() => setAddEntityVisible(true)}
          />

          {/* Add Account / Card Modal */}
          <AddAccountOrCardModal
            visible={addEntityVisible}
            onClose={() => setAddEntityVisible(false)}
            accounts={accounts}
            baseCurrency={baseCurrency}
            onSaveAccount={(acc) => {
              createAccount(acc);
              loadData();
            }}
            onSaveCard={(c) => {
              createCard(c);
              loadData();
            }}
          />

          {/* Set Category Budgets Modal */}
          <SetBudgetModal
            visible={setBudgetVisible}
            onClose={() => setSetBudgetVisible(false)}
            categories={categories}
            baseCurrency={baseCurrency}
            onSaveBudget={handleSaveBudget}
          />

          {/* Add Recurring Bill Modal */}
          <AddRecurringBillModal
            visible={addRecurringVisible}
            onClose={() => setAddRecurringVisible(false)}
            categories={categories}
            accounts={accounts}
            cards={cards}
            baseCurrency={baseCurrency}
            onSave={handleSaveRecurring}
          />

          {/* Settings & Preferences Modal */}
          <SettingsBackupModal
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
            baseCurrency={baseCurrency}
            onBaseCurrencyChange={handleBaseCurrencyChange}
            onDataReload={loadData}
          />
        </SafeAreaView>
      </BiometricGate>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CozyTheme.background,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    backgroundColor: CozyTheme.background,
  },
  scrollContent: {
    paddingBottom: 95,
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surface,
    padding: 4,
    borderRadius: 14,
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    width: '90%',
    maxWidth: 500,
  },
  tabNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabNavButtonActive: {
    backgroundColor: CozyTheme.textPrimary,
  },
  tabNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  tabNavTextActive: {
    color: CozyTheme.textInverse,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statAmountExpense: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.expense,
    letterSpacing: -0.4,
  },
  statAmountIncome: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.income,
    letterSpacing: -0.4,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 10,
    marginBottom: 10,
  },
  feedTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transactionCountText: {
    fontSize: 12,
    color: CozyTheme.textTertiary,
    fontWeight: '600',
  },
  transactionsList: {
    paddingHorizontal: 22,
  },
  emptyContainer: {
    backgroundColor: CozyTheme.surface,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginTop: 4,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginTop: 16,
  },
  emptyAddButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    gap: 7,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textInverse,
    letterSpacing: -0.2,
  },
});
