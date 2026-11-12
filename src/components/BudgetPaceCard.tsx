import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldAlert, ShieldCheck, Flame, Sliders, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Category, Transaction, Account, RecurringBill } from '../types';
import { formatMoney, convertCurrency } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface BudgetPaceCardProps {
  categories: Category[];
  transactions: Transaction[];
  accounts?: Account[];
  recurringBills?: RecurringBill[];
  baseCurrency: string;
  onOpenBudgetModal: () => void;
}

export const BudgetPaceCard: React.FC<BudgetPaceCardProps> = ({
  categories,
  transactions,
  accounts = [],
  recurringBills = [],
  baseCurrency,
  onOpenBudgetModal,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);
  const monthName = now.toLocaleString('default', { month: 'short' });

  // Filter current month expense transactions
  const monthExpenseTransactions = transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Categories with configured budget
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetedCategories = expenseCategories.filter((c) => c.monthly_budget_cents && c.monthly_budget_cents > 0);
  const budgetedCatIds = new Set(budgetedCategories.map((c) => c.id));

  // Separate budgeted spending from unbudgeted spending
  const budgetedSpentCents = monthExpenseTransactions
    .filter((t) => t.category_id && budgetedCatIds.has(t.category_id))
    .reduce((sum, t) => sum + t.base_amount_cents, 0);

  const unbudgetedSpentCents = monthExpenseTransactions
    .filter((t) => !t.category_id || !budgetedCatIds.has(t.category_id))
    .reduce((sum, t) => sum + t.base_amount_cents, 0);

  const totalSpentCents = budgetedSpentCents + unbudgetedSpentCents;
  const totalBudgetCents = budgetedCategories.reduce((sum, c) => sum + (c.monthly_budget_cents || 0), 0);

  const remainingBudgetCents = Math.max(0, totalBudgetCents - budgetedSpentCents);
  const safeDailyBudgetCents = totalBudgetCents > 0 ? Math.floor(remainingBudgetCents / daysRemaining) : 0;

  // 1. Calculate Liquid Cash (Bank + Wallet accounts converted to baseCurrency)
  const liquidAccounts = accounts.filter((a) => a.type === 'bank' || a.type === 'wallet');
  const liquidCashCents = liquidAccounts.reduce(
    (sum, a) => sum + convertCurrency(a.balance_cents, a.currency, baseCurrency).convertedCents,
    0
  );

  // 2. Calculate Upcoming Commitments (Active recurring bills due this month that are not yet paid)
  const upcomingCommitmentsCents = recurringBills
    .filter((b) => {
      if (!b.is_active) return false;
      if (b.last_paid_at) {
        const lastPaid = new Date(b.last_paid_at);
        if (!isNaN(lastPaid.getTime())) {
          if (b.frequency === 'monthly' && lastPaid.getFullYear() === currentYear && lastPaid.getMonth() === currentMonth) {
            return false; // already paid this month
          }
          if (b.frequency === 'yearly' && lastPaid.getFullYear() === currentYear) {
            return false; // already paid this year
          }
        }
      }
      return true;
    })
    .reduce((sum, b) => sum + convertCurrency(b.amount_cents, b.currency, baseCurrency).convertedCents, 0);

  // 3. Calculate Discretionary Cash
  const discretionaryCashCents = Math.max(0, liquidCashCents - upcomingCommitmentsCents);
  const safeDailyCashCents = accounts.length > 0 ? Math.floor(discretionaryCashCents / daysRemaining) : safeDailyBudgetCents;

  // True Safe Daily Spend: constrained by liquid reality if cash is lower than theoretical budget
  const hasBudget = totalBudgetCents > 0;
  const hasAccounts = accounts.length > 0;
  const isLiquidityConstrained = hasBudget && hasAccounts && discretionaryCashCents < remainingBudgetCents;

  const effectiveDailyCents = hasBudget && hasAccounts
    ? Math.min(safeDailyBudgetCents, safeDailyCashCents)
    : hasBudget
    ? safeDailyBudgetCents
    : hasAccounts
    ? safeDailyCashCents
    : 0;

  const budgetPct = totalBudgetCents > 0 ? Math.min(100, Math.round((budgetedSpentCents / totalBudgetCents) * 100)) : 0;
  const monthElapsedPct = Math.round((currentDay / totalDaysInMonth) * 100);

  const isOverBudget = totalBudgetCents > 0 && budgetedSpentCents > totalBudgetCents;
  const isPaceGood = budgetPct <= monthElapsedPct && !isLiquidityConstrained;

  return (
    <View style={styles.container}>
      {/* Safe to Spend Hero Box */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.paceBadgeRow}>
            {isOverBudget ? (
              <View style={[styles.badge, styles.badgeOver]}>
                <ShieldAlert size={12} color={CozyTheme.expense} />
                <Text style={[styles.badgeText, { color: CozyTheme.expense }]}>Budget Exceeded</Text>
              </View>
            ) : isPaceGood ? (
              <View style={[styles.badge, styles.badgeSafe]}>
                <ShieldCheck size={12} color={CozyTheme.income} />
                <Text style={[styles.badgeText, { color: CozyTheme.income }]}>Safe Daily Pace</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeWarning]}>
                <Flame size={12} color="#F59E0B" />
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Fast Pace</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => {
              triggerLightHaptic();
              onOpenBudgetModal();
            }}
          >
            <Sliders size={12} color={CozyTheme.textSecondary} />
            <Text style={styles.manageBtnText}>Set Limits</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dailyAmount}>
          {effectiveDailyCents > 0 ? formatMoney(effectiveDailyCents, baseCurrency) : formatMoney(0, baseCurrency)}
          <Text style={styles.dailyPerDay}> / day</Text>
        </Text>

        <Text style={styles.subPaceText}>
          {hasBudget
            ? `${formatMoney(remainingBudgetCents, baseCurrency)} left in budget • ${daysRemaining} days remaining in ${monthName}`
            : hasAccounts
            ? `${formatMoney(discretionaryCashCents, baseCurrency)} discretionary cash • ${daysRemaining} days remaining in ${monthName}`
            : 'Set monthly category caps to calculate safe daily pace'}
        </Text>

        {/* Financial Reality Check Pillars */}
        {hasAccounts && (
          <View style={styles.pillarsContainer}>
            <View style={styles.pillarItem}>
              <Text style={styles.pillarLabel}>Remaining Cap</Text>
              <Text style={styles.pillarValue} numberOfLines={1}>
                {hasBudget ? formatMoney(remainingBudgetCents, baseCurrency) : 'No Cap'}
              </Text>
            </View>
            <View style={styles.pillarDivider} />
            <View style={styles.pillarItem}>
              <Text style={styles.pillarLabel}>Liquid Cash</Text>
              <Text style={styles.pillarValue} numberOfLines={1}>
                {formatMoney(liquidCashCents, baseCurrency)}
              </Text>
            </View>
            <View style={styles.pillarDivider} />
            <View style={styles.pillarItem}>
              <Text style={styles.pillarLabel}>Upcoming Bills</Text>
              <Text
                style={[
                  styles.pillarValue,
                  upcomingCommitmentsCents > 0 && { color: '#F59E0B' },
                ]}
                numberOfLines={1}
              >
                {formatMoney(upcomingCommitmentsCents, baseCurrency)}
              </Text>
            </View>
          </View>
        )}

        {/* Liquidity constraint reality alert */}
        {isLiquidityConstrained && (
          <View style={styles.liquidityAlertBox}>
            <AlertTriangle size={13} color="#F59E0B" />
            <Text style={styles.liquidityAlertText}>
              Cash Reality: Liquid funds after upcoming bills ({formatMoney(discretionaryCashCents, baseCurrency)}) are less than remaining budget cap. Daily pace is safely capped by actual cash.
            </Text>
          </View>
        )}

        {/* Global Month Pace Progress Bar */}
        {totalBudgetCents > 0 && (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${budgetPct}%`,
                    backgroundColor: isOverBudget
                      ? CozyTheme.expense
                      : budgetPct > 80
                      ? '#F59E0B'
                      : CozyTheme.income,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabelLeft}>
                {formatMoney(budgetedSpentCents, baseCurrency)} ({budgetPct}%)
              </Text>
              <Text style={styles.progressLabelRight}>
                Cap: {formatMoney(totalBudgetCents, baseCurrency)}
              </Text>
            </View>
          </View>
        )}

        {/* Unbudgeted categories note */}
        {unbudgetedSpentCents > 0 && (
          <View style={styles.unbudgetedRow}>
            <Text style={styles.unbudgetedText}>
              + {formatMoney(unbudgetedSpentCents, baseCurrency)} spent across unbudgeted categories
            </Text>
          </View>
        )}
      </View>

      {/* Category Budget Breakdowns */}
      <View style={styles.categorySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>CATEGORY ALLOWANCES</Text>
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onOpenBudgetModal();
            }}
          >
            <Text style={styles.viewAllText}>Configure</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.catList}>
          {budgetedCategories.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCatCard}
              onPress={() => {
                triggerLightHaptic();
                onOpenBudgetModal();
              }}
              activeOpacity={0.7}
            >
              <Sliders size={18} color={CozyTheme.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCatTitle}>No Category Budgets Configured</Text>
              <Text style={styles.emptyCatSub}>
                Tap here to set monthly targets for dining, groceries, shopping, and bills.
              </Text>
            </TouchableOpacity>
          ) : (
            budgetedCategories.map((cat) => {
              const spent = monthExpenseTransactions
                .filter((t) => t.category_id === cat.id)
                .reduce((sum, t) => sum + t.base_amount_cents, 0);
              const cap = cat.monthly_budget_cents || 0;
              const catPct = cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
              const isCatOver = spent > cap;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catItem}
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenBudgetModal();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.catItemTop}>
                    <View style={styles.catItemTitleRow}>
                      <View style={[styles.catItemDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catItemName}>{cat.name}</Text>
                    </View>
                    <View style={styles.catAmountRow}>
                      <Text style={styles.catSpentText}>
                        {formatMoney(spent, baseCurrency)}
                      </Text>
                      <Text style={styles.catCapText}>
                        {' / ' + formatMoney(cap, baseCurrency)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catBarTrack}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${catPct}%`,
                          backgroundColor: isCatOver
                            ? CozyTheme.expense
                            : catPct > 80
                            ? '#F59E0B'
                            : cat.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.catItemBottom}>
                    <Text
                      style={[
                        styles.catPctText,
                        isCatOver && { color: CozyTheme.expense, fontWeight: '700' },
                      ]}
                    >
                      {isCatOver ? 'Exceeded by ' + formatMoney(spent - cap, baseCurrency) : `${catPct}% used`}
                    </Text>
                    <ChevronRight size={12} color={CozyTheme.textTertiary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  heroCard: {
    backgroundColor: CozyTheme.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeSafe: {
    backgroundColor: CozyTheme.incomeSoft,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeOver: {
    backgroundColor: CozyTheme.expenseSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  dailyAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.8,
  },
  dailyPerDay: {
    fontSize: 15,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  subPaceText: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginTop: 3,
    marginBottom: 12,
  },
  pillarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  pillarItem: {
    flex: 1,
    alignItems: 'center',
  },
  pillarLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: CozyTheme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pillarValue: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  pillarDivider: {
    width: 1,
    height: 20,
    backgroundColor: CozyTheme.border,
    marginHorizontal: 4,
  },
  liquidityAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  liquidityAlertText: {
    flex: 1,
    fontSize: 10,
    color: '#F59E0B',
    lineHeight: 14,
    fontWeight: '500',
  },
  unbudgetedRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  unbudgetedText: {
    fontSize: 10,
    color: CozyTheme.textTertiary,
    fontStyle: 'italic',
  },
  progressBarWrapper: {
    marginTop: 2,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CozyTheme.surfaceElevated,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressLabelLeft: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  progressLabelRight: {
    fontSize: 11,
    color: CozyTheme.textTertiary,
    fontWeight: '600',
  },
  categorySection: {},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catList: {
    gap: 8,
  },
  emptyCatCard: {
    backgroundColor: CozyTheme.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyCatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptyCatSub: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  catItem: {
    backgroundColor: CozyTheme.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  catItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catItemDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  catItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catSpentText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catCapText: {
    fontSize: 11,
    color: CozyTheme.textTertiary,
  },
  catBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: CozyTheme.surfaceElevated,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  catItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  catPctText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
});
