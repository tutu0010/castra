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
import { Plus, SlidersHorizontal, History } from 'lucide-react-native';

import { CozyTheme } from './src/theme/colors';
import { Account, Card, Category, Transaction } from './src/types';
import {
  getAllAccounts,
  getAllCards,
  getAllCategories,
  getAllTransactions,
  getBaseCurrency,
  setBaseCurrency,
  addTransaction,
  deleteTransaction,
  createAccount,
  createCard,
} from './src/db/database';

import { SummaryHeader } from './src/components/SummaryHeader';
import { CardDeck } from './src/components/CardDeck';
import { TransactionItem } from './src/components/TransactionItem';
import { QuickAddModal } from './src/components/QuickAddModal';
import { AddAccountOrCardModal } from './src/components/AddAccountOrCardModal';
import { SettingsBackupModal } from './src/components/SettingsBackupModal';
import { triggerLightHaptic, triggerSuccessHaptic } from './src/utils/haptics';

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [baseCurrency, setBaseCurr] = useState<string>('USD');

  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Modals
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [addEntityVisible, setAddEntityVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Load all data from SQLite
  const loadData = useCallback(() => {
    try {
      const accs = getAllAccounts();
      const crds = getAllCards();
      const cats = getAllCategories();
      const txs = getAllTransactions(100);
      const curr = getBaseCurrency();

      setAccounts(accs);
      setCards(crds);
      setCategories(cats);
      setTransactions(txs);
      setBaseCurr(curr);
    } catch (err) {
      console.error('Failed to load local DB data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }, [loadData]);

  // Transaction Actions
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

  // Add Account / Card
  const handleSaveAccount = (accountData: Omit<Account, 'created_at'>) => {
    createAccount(accountData);
    loadData();
  };

  const handleSaveCard = (cardData: Omit<Card, 'created_at'>) => {
    createCard(cardData);
    loadData();
  };

  const handleBaseCurrencyChange = (newCurr: string) => {
    setBaseCurrency(newCurr);
    setBaseCurr(newCurr);
    loadData();
  };

  // Pay Card shortcut: auto-pay credit card from first bank
  const handlePayCardPress = (card: Card) => {
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
      note: `Full payment for ${card.name}`,
    });

    triggerSuccessHaptic();
    loadData();
  };

  // Filter transactions if an account/card is selected in the carousel
  const filteredTransactions = selectedEntityId
    ? transactions.filter(
        t => t.card_id === selectedEntityId || t.account_id === selectedEntityId
      )
    : transactions;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

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
          {/* Header & Net Worth */}
          <SummaryHeader
            accounts={accounts}
            cards={cards}
            baseCurrency={baseCurrency}
            onOpenSettings={() => setSettingsVisible(true)}
          />

          {/* Cards & Accounts Carousel */}
          <CardDeck
            accounts={accounts}
            cards={cards}
            selectedId={selectedEntityId}
            onSelect={setSelectedEntityId}
            onAddPress={() => setAddEntityVisible(true)}
            onPayCardPress={handlePayCardPress}
          />

          {/* Recent Activity Section */}
          <View style={styles.feedHeaderRow}>
            <View style={styles.feedTitleGroup}>
              <History size={16} color={CozyTheme.textPrimary} />
              <Text style={styles.feedTitle}>Recent Activity</Text>
              {selectedEntityId && (
                <View style={styles.filteredBadge}>
                  <Text style={styles.filteredBadgeText}>Filtered</Text>
                </View>
              )}
            </View>
            <Text style={styles.transactionCountText}>
              {filteredTransactions.length} logs
            </Text>
          </View>

          {/* Transaction List */}
          <View style={styles.transactionsList}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No transactions recorded</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the button below to quickly log an expense or income.
                </Text>
              </View>
            ) : (
              filteredTransactions.map(tx => (
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

        {/* Floating Quick-Add Action Button */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={() => {
              triggerLightHaptic();
              setQuickAddVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Plus size={22} color="#FFFFFF" />
            <Text style={styles.fabText}>Add Log</Text>
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <QuickAddModal
          visible={quickAddVisible}
          onClose={() => setQuickAddVisible(false)}
          accounts={accounts}
          cards={cards}
          categories={categories}
          baseCurrency={baseCurrency}
          onSave={handleSaveTransaction}
        />

        <AddAccountOrCardModal
          visible={addEntityVisible}
          onClose={() => setAddEntityVisible(false)}
          accounts={accounts}
          baseCurrency={baseCurrency}
          onSaveAccount={handleSaveAccount}
          onSaveCard={handleSaveCard}
        />

        <SettingsBackupModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          baseCurrency={baseCurrency}
          onBaseCurrencyChange={handleBaseCurrencyChange}
          onDataReload={loadData}
        />
      </SafeAreaView>
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
    paddingBottom: 90,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  feedTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
  },
  filteredBadge: {
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  filteredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  transactionCountText: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  transactionsList: {
    paddingHorizontal: 20,
  },
  emptyContainer: {
    backgroundColor: CozyTheme.surface,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.borderLight,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
