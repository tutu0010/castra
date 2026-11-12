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
  AlertCircle,
} from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { RecurringBill, Account, Card, Category } from '../types';
import { formatMoney, convertCurrency } from '../utils/currency';
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

interface ProcessedBill extends RecurringBill {
  isPaid: boolean;
  isOverdue: boolean;
  daysUntil: number;
  nextDueFormatted: string;
}

function processRecurringBill(bill: RecurringBill, now: Date = new Date()): ProcessedBill {
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let isPaid = false;
  if (bill.last_paid_at) {
    const lastPaid = new Date(bill.last_paid_at);
    if (!isNaN(lastPaid.getTime())) {
      if (bill.frequency === 'weekly') {
        const diffDays = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60 * 24);
        isPaid = diffDays < 7;
      } else if (bill.frequency === 'yearly') {
        isPaid = lastPaid.getFullYear() === currentYear;
      } else {
        // Monthly
        isPaid = lastPaid.getFullYear() === currentYear && lastPaid.getMonth() === currentMonth;
      }
    }
  }

  let isOverdue = false;
  let daysUntil = 0;
  let nextDueDate: Date;

  if (bill.frequency === 'monthly') {
    if (isPaid) {
      const targetMonth = currentMonth + 1;
      const targetYear = currentYear + (targetMonth > 11 ? 1 : 0);
      const normalizedMonth = targetMonth % 12;
      const maxDaysInTarget = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const safeDay = Math.min(bill.due_day, maxDaysInTarget);
      nextDueDate = new Date(targetYear, normalizedMonth, safeDay);
      daysUntil = Math.max(1, Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      if (currentDay > bill.due_day) {
        isOverdue = true;
        daysUntil = currentDay - bill.due_day;
        nextDueDate = new Date(currentYear, currentMonth, bill.due_day);
      } else {
        daysUntil = bill.due_day - currentDay;
        nextDueDate = new Date(currentYear, currentMonth, bill.due_day);
      }
    }
  } else if (bill.frequency === 'weekly') {
    if (isPaid) {
      const lastPaid = new Date(bill.last_paid_at!);
      const nextWeekMs = lastPaid.getTime() + 7 * 24 * 60 * 60 * 1000;
      daysUntil = Math.max(1, Math.ceil((nextWeekMs - now.getTime()) / (1000 * 60 * 60 * 24)));
      nextDueDate = new Date(nextWeekMs);
    } else {
      daysUntil = 0;
      nextDueDate = now;
    }
  } else {
    // Yearly
    const targetMonth = bill.due_month ? bill.due_month - 1 : currentMonth;
    const targetYear = isPaid ? currentYear + 1 : currentYear;
    nextDueDate = new Date(targetYear, targetMonth, bill.due_day);
    if (!isPaid && nextDueDate.getTime() < now.getTime()) {
      isOverdue = true;
      daysUntil = Math.max(1, Math.ceil((now.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      daysUntil = Math.max(0, Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const nextDueFormatted = nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    ...bill,
    isPaid,
    isOverdue,
    daysUntil,
    nextDueFormatted,
  };
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
  const processedBills = bills.map((b) => processRecurringBill(b));
  const sortedBills = processedBills.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return b.daysUntil - a.daysUntil;
    if (!a.isPaid && b.isPaid) return -1;
    if (a.isPaid && !b.isPaid) return 1;
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
            const isDueSoon = bill.daysUntil <= 3 && !bill.isPaid && !bill.isOverdue;
            const isDueToday = bill.daysUntil === 0 && !bill.isPaid && !bill.isOverdue;

            return (
              <View
                key={bill.id}
                style={[
                  styles.billCard,
                  !bill.is_active && styles.billCardInactive,
                  bill.isOverdue && bill.is_active && styles.billCardOverdue,
                  isDueSoon && bill.is_active && styles.billCardDueSoon,
                  bill.isPaid && styles.billCardPaid,
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

                      {bill.isPaid ? (
                        <View style={[styles.urgencyTag, styles.urgencyTagPaid]}>
                          <Check size={10} color={CozyTheme.income} />
                          <Text style={[styles.urgencyText, styles.urgencyTextPaid]}>
                            Next: {bill.nextDueFormatted}
                          </Text>
                        </View>
                      ) : bill.isOverdue ? (
                        <View style={[styles.urgencyTag, styles.urgencyTagOverdue]}>
                          <AlertCircle size={10} color={CozyTheme.expense} />
                          <Text style={[styles.urgencyText, styles.urgencyTextOverdue]}>
                            Overdue {bill.daysUntil}d
                          </Text>
                        </View>
                      ) : isDueToday ? (
                        <View style={[styles.urgencyTag, styles.urgencyTagToday]}>
                          <Clock size={10} color={CozyTheme.expense} />
                          <Text style={[styles.urgencyText, styles.urgencyTextToday]}>
                            Due Today!
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.urgencyTag,
                            isDueSoon && styles.urgencyTagSoon,
                          ]}
                        >
                          <Clock
                            size={10}
                            color={isDueSoon ? '#F59E0B' : CozyTheme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.urgencyText,
                              isDueSoon && styles.urgencyTextSoon,
                            ]}
                          >
                            {bill.daysUntil === 1
                              ? 'Tomorrow'
                              : `In ${bill.daysUntil}d (${bill.due_day}th)`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.amountCol}>
                    <Text style={styles.billAmount}>
                      {formatMoney(bill.amount_cents, bill.currency || baseCurrency)}
                    </Text>
                    {bill.currency && bill.currency !== baseCurrency ? (
                      <Text style={styles.convertedApprox}>
                        ~{formatMoney(convertCurrency(bill.amount_cents, bill.currency, baseCurrency).convertedCents, baseCurrency)}
                      </Text>
                    ) : null}
                    <Text style={styles.billFreq}>{bill.frequency}</Text>
                  </View>
                </View>

                {/* Quick 1-Tap Actions */}
                <View style={styles.billActionsRow}>
                  {bill.isPaid ? (
                    <View style={styles.paidBadge}>
                      <Check size={12} color={CozyTheme.income} />
                      <Text style={styles.paidBadgeText}>Paid for this cycle</Text>
                    </View>
                  ) : (
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
                  )}

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
  billCardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  billCardPaid: {
    borderColor: 'rgba(52, 211, 153, 0.25)',
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
  urgencyTagOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  urgencyTagPaid: {
    backgroundColor: CozyTheme.incomeSoft,
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
  urgencyTextOverdue: {
    color: CozyTheme.expense,
    fontWeight: '700',
  },
  urgencyTextPaid: {
    color: CozyTheme.income,
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
  convertedApprox: {
    fontSize: 9,
    color: CozyTheme.textTertiary,
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
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: CozyTheme.incomeSoft,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.income,
  },
  deleteBtn: {
    padding: 5,
  },
});
