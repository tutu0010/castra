import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Sliders,
  CreditCard,
  Landmark,
  Wallet,
  Trash2,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react-native';
import { Account, Card, Category, Transaction } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { TransactionItem } from './TransactionItem';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface AccountDetailModalProps {
  visible: boolean;
  onClose: () => void;
  entity: Account | Card | null;
  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  baseCurrency: string;
  onUpdateBalance: (entityId: string, newBalanceCents: number) => void;
  onDeleteEntity: (entityId: string, isCard: boolean) => void;
  onDeleteTransaction: (txId: string) => void;
  onPayCreditCard?: (card: Card) => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  visible,
  onClose,
  entity,
  transactions,
  accounts,
  cards,
  categories,
  baseCurrency,
  onUpdateBalance,
  onDeleteEntity,
  onDeleteTransaction,
  onPayCreditCard,
}) => {
  const [adjustBalanceVisible, setAdjustBalanceVisible] = useState(false);

  if (!entity) return null;

  const isCard = 'credit_limit_cents' in entity || entity.type === 'credit' || entity.type === 'debit';
  const isCredit = isCard && entity.type === 'credit';
  const isBank = !isCard && entity.type === 'bank';

  const balanceCents = 'balance_cents' in entity
    ? entity.balance_cents
    : (entity.outstanding_balance_cents || 0);

  const cardLimit = (entity as Card).credit_limit_cents || 0;
  const utilizationRatio = cardLimit > 0 ? Math.min(balanceCents / cardLimit, 1.0) : 0;
  const utilizationPct = Math.round(utilizationRatio * 100);

  // O(1) Lookup Maps
  const accountsMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const cardsMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const categoriesMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filter transactions belonging to this account/card
  const entityTransactions = useMemo(() => {
    return transactions.filter(
      t => t.account_id === entity.id || t.card_id === entity.id || t.to_account_id === entity.id
    );
  }, [transactions, entity.id]);

  const handleDelete = () => {
    triggerLightHaptic();
    Alert.alert(
      `Delete ${isCard ? 'Card' : 'Account'}`,
      `Are you sure you want to permanently delete "${entity.name}"? Transactions referring to this ${isCard ? 'card' : 'account'} may lose their source reference.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteEntity(entity.id, isCard);
            onClose();
          },
        },
      ]
    );
  };

  const handlePromptDeleteTx = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    Alert.alert(
      'Delete Entry',
      `Permanently delete "${tx?.note || 'this entry'}"? This will automatically update your ledger balances.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteTransaction(txId),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Top Navigation */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              triggerLightHaptic();
              onClose();
            }}
          >
            <ArrowLeft size={20} color={CozyTheme.textPrimary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color={CozyTheme.expense} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Card Hero */}
          <View style={[styles.heroCard, { backgroundColor: entity.color || '#1C222B' }]}>
            <View style={styles.heroTop}>
              <View style={styles.typeBadge}>
                {isCard ? (
                  <CreditCard size={14} color="#FFFFFF" />
                ) : isBank ? (
                  <Landmark size={14} color="#FFFFFF" />
                ) : (
                  <Wallet size={14} color="#FFFFFF" />
                )}
                <Text style={styles.typeBadgeText}>
                  {isCredit ? 'Credit Card' : isCard ? 'Debit Card' : isBank ? 'Bank Account' : 'Cash Wallet'}
                </Text>
              </View>
              {(entity as Card).last4 && (
                <Text style={styles.heroLast4}>•••• {(entity as Card).last4}</Text>
              )}
            </View>

            <Text style={styles.heroName}>{entity.name}</Text>

            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>
                {isCredit ? 'Outstanding Balance' : 'Current Balance'}
              </Text>
              <Text style={styles.heroBalance}>
                {formatMoney(balanceCents, entity.currency)}
              </Text>
            </View>

            {isCredit && cardLimit > 0 && (
              <View style={styles.creditStats}>
                <View style={styles.creditLimitRow}>
                  <Text style={styles.creditLimitText}>Limit: {formatMoney(cardLimit, entity.currency)}</Text>
                  <Text style={styles.creditLimitText}>{utilizationPct}% used</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(4, utilizationPct)}%`,
                        backgroundColor: utilizationPct > 70 ? CozyTheme.expense : CozyTheme.income,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions Row */}
          <View style={styles.actionsRow}>
            {/* Balance Adjuster Option */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {
                triggerLightHaptic();
                setAdjustBalanceVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconBox}>
                <Sliders size={18} color={CozyTheme.textPrimary} />
              </View>
              <Text style={styles.actionTitle}>Adjust Balance</Text>
              <Text style={styles.actionSubtitle}>Correct real balance</Text>
            </TouchableOpacity>

            {/* Pay Credit Card Option */}
            {isCredit && balanceCents > 0 && onPayCreditCard && (
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardPay]}
                onPress={() => {
                  triggerSuccessHaptic();
                  onPayCreditCard(entity as Card);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBox, { backgroundColor: CozyTheme.incomeSoft }]}>
                  <ArrowUpRight size={18} color={CozyTheme.income} />
                </View>
                <Text style={[styles.actionTitle, { color: CozyTheme.income }]}>Pay Balance</Text>
                <Text style={styles.actionSubtitle}>Transfer from Bank</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Details & Billing Cycle Specs */}
          <View style={styles.specsSection}>
            <Text style={styles.specsTitle}>Details & Rules</Text>

            <View style={styles.specRow}>
              <Text style={styles.specKey}>Native Currency</Text>
              <Text style={styles.specVal}>{entity.currency}</Text>
            </View>

            {isCredit && (
              <>
                {(entity as Card).statement_day && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Statement Closes</Text>
                    <Text style={styles.specVal}>{(entity as Card).statement_day}th of every month</Text>
                  </View>
                )}
                {(entity as Card).due_day && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Payment Due Date</Text>
                    <Text style={styles.specVal}>{(entity as Card).due_day}th of next month</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Activity / Transactions for this Entity */}
          <View style={styles.activitySection}>
            <Text style={styles.specsTitle}>Account History ({entityTransactions.length})</Text>

            {entityTransactions.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>No transactions recorded on this account yet.</Text>
              </View>
            ) : (
              entityTransactions.map(tx => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  accounts={accounts}
                  cards={cards}
                  categories={categories}
                  accountsMap={accountsMap}
                  cardsMap={cardsMap}
                  categoriesMap={categoriesMap}
                  baseCurrency={baseCurrency}
                  onDelete={handlePromptDeleteTx}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Balance Adjuster Modal */}
        <AdjustBalanceModal
          visible={adjustBalanceVisible}
          onClose={() => setAdjustBalanceVisible(false)}
          entity={entity}
          onSaveBalance={(newCents) => onUpdateBalance(entity.id, newCents)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CozyTheme.background,
    paddingTop: 14,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: CozyTheme.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  heroLast4: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 6,
  },
  balanceContainer: {
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroBalance: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 2,
  },
  creditStats: {
    marginTop: 14,
  },
  creditLimitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  creditLimitText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  actionCardPay: {
    borderColor: CozyTheme.incomeSoft,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  actionSubtitle: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    marginTop: 1,
  },
  specsSection: {
    backgroundColor: CozyTheme.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 20,
  },
  specsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: CozyTheme.borderLight,
  },
  specKey: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
  },
  specVal: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  activitySection: {
    marginBottom: 30,
  },
  emptyFeed: {
    backgroundColor: CozyTheme.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.borderLight,
  },
  emptyText: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
  },
});
