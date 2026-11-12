import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Repeat,
  Plus,
  Check,
  CreditCard,
  Landmark,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { RecurringBill, Account, Card, Category } from '../types';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface RecurringRadarProps {
  bills: RecurringBill[];
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  baseCurrency: string;
  onPayBill: (bill: RecurringBill) => void;
  onToggleBill: (id: string, isActive: boolean) => void;
  onDeleteBill: (id: string) => void;
  onOpenAddBill: () => void;
}

export const RecurringRadar: React.FC<RecurringRadarProps> = ({
  bills,
  accounts,
  cards,
  categories,
  baseCurrency,
  onPayBill,
  onToggleBill,
  onDeleteBill,
  onOpenAddBill,
}) => {
  const currentDay = new Date().getDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Sort bills by urgency (days until next due)
  const sortedBills = [...bills].map((bill) => {
    let daysUntil = bill.due_day - currentDay;
    if (daysUntil < 0) {
      daysUntil += daysInCurrentMonth;
    }
    return { ...bill, daysUntil };
  }).sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.daysUntil - b.daysUntil;
  });

  const getSourceLabel = (bill: RecurringBill) => {
    if (bill.card_id) {
      const c = cards.find((card) => card.id === bill.card_id);
      return c ? c.name : 'Card';
    }
    if (bill.account_id) {
      const a = accounts.find((acc) => acc.id === bill.account_id);
      return a ? a.name : 'Bank';
    }
    return 'Default';
  };

  const getCategoryColor = (catId?: string | null) => {
    if (!catId) return CozyTheme.textSecondary;
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.color : CozyTheme.textSecondary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Repeat size={14} color={CozyTheme.textSecondary} />
          <Text style={styles.title}>SUBSCRIPTION & BILL RADAR</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            triggerLightHaptic();
            onOpenAddBill();
          }}
          activeOpacity={0.7}
        >
          <Plus size={12} color={CozyTheme.textInverse} />
          <Text style={styles.addButtonText}>Add Bill</Text>
        </TouchableOpacity>
      </View>

      {sortedBills.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={() => {
            triggerLightHaptic();
            onOpenAddBill();
          }}
          activeOpacity={0.8}
        >
          <Sparkles size={20} color={CozyTheme.textSecondary} style={{ marginBottom: 6 }} />
          <Text style={styles.emptyTitle}>Radar is Clear</Text>
          <Text style={styles.emptySub}>
            Track recurring bills (Netflix, Wifi, Rent). Castra alerts you before due dates and lets you record payments in 1 tap.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.billList}>
          {sortedBills.map((bill) => {
            const isDueSoon = bill.daysUntil <= 3;
            const isDueToday = bill.daysUntil === 0;

            return (
              <View
                key={bill.id}
                style={[
                  styles.billCard,
                  !bill.is_active && styles.billCardInactive,
                  isDueSoon && bill.is_active && styles.billCardDueSoon,
                ]}
              >
                <View style={styles.billCardTop}>
                  <View style={styles.billInfoCol}>
                    <View style={styles.billNameRow}>
                      <View
                        style={[
                          styles.categoryPip,
                          { backgroundColor: getCategoryColor(bill.category_id) },
                        ]}
                      />
                      <Text style={styles.billName} numberOfLines={1}>
                        {bill.name}
                      </Text>
                    </View>

                    <View style={styles.billMetaRow}>
                      <View style={styles.sourceTag}>
                        {bill.card_id ? (
                          <CreditCard size={10} color={CozyTheme.textSecondary} />
                        ) : (
                          <Landmark size={10} color={CozyTheme.textSecondary} />
                        )}
                        <Text style={styles.sourceText} numberOfLines={1}>
                          {getSourceLabel(bill)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.urgencyTag,
                          isDueToday && styles.urgencyTagToday,
                          isDueSoon && !isDueToday && styles.urgencyTagSoon,
                        ]}
                      >
                        <Clock
                          size={10}
                          color={
                            isDueToday
                              ? CozyTheme.expense
                              : isDueSoon
                              ? '#F59E0B'
                              : CozyTheme.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.urgencyText,
                            isDueToday && styles.urgencyTextToday,
                            isDueSoon && !isDueToday && styles.urgencyTextSoon,
                          ]}
                        >
                          {isDueToday
                            ? 'Due Today!'
                            : bill.daysUntil === 1
                            ? 'Tomorrow'
                            : `In ${bill.daysUntil}d (${bill.due_day}th)`}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={styles.billAmount}>
                      {formatMoney(bill.amount_cents, baseCurrency)}
                    </Text>
                    <Text style={styles.billFreq}>{bill.frequency}</Text>
                  </View>
                </View>

                {/* Quick 1-Tap Actions */}
                <View style={styles.billActionsRow}>
                  <TouchableOpacity
                    style={styles.markPaidBtn}
                    onPress={() => {
                      triggerSuccessHaptic();
                      onPayBill(bill);
                    }}
                    activeOpacity={0.8}
                  >
                    <Check size={13} color={CozyTheme.textInverse} />
                    <Text style={styles.markPaidText}>Mark Paid</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      triggerLightHaptic();
                      onDeleteBill(bill.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={13} color={CozyTheme.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
  emptyCard: {
    backgroundColor: CozyTheme.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  billList: {
    gap: 8,
  },
  billCard: {
    backgroundColor: CozyTheme.surface,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  billCardInactive: {
    opacity: 0.5,
  },
  billCardDueSoon: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  billCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  billInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  billNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  categoryPip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  billName: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  billMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
    maxWidth: 90,
  },
  urgencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyTagSoon: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  urgencyTagToday: {
    backgroundColor: CozyTheme.expenseSoft,
  },
  urgencyText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  urgencyTextSoon: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  urgencyTextToday: {
    color: CozyTheme.expense,
    fontWeight: '700',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.3,
  },
  billFreq: {
    fontSize: 10,
    color: CozyTheme.textTertiary,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  billActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CozyTheme.border,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 5,
  },
  markPaidText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
  deleteBtn: {
    padding: 5,
  },
});
