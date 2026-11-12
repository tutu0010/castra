import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldAlert, ShieldCheck, Flame, Sliders, ChevronRight } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Category, Transaction } from '../types';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface BudgetPaceCardProps {
  categories: Category[];
  transactions: Transaction[];
  baseCurrency: string;
  onOpenBudgetModal: () => void;
}

export const BudgetPaceCard: React.FC<BudgetPaceCardProps> = ({
  categories,
  transactions,
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

  const totalSpentCents = monthExpenseTransactions.reduce((sum, t) => sum + t.base_amount_cents, 0);

  // Categories with budget
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetedCategories = expenseCategories.filter((c) => c.monthly_budget_cents && c.monthly_budget_cents > 0);

  const totalBudgetCents = budgetedCategories.reduce((sum, c) => sum + (c.monthly_budget_cents || 0), 0);

  const remainingBudgetCents = Math.max(0, totalBudgetCents - totalSpentCents);
  const safeDailyCents = totalBudgetCents > 0 ? Math.floor(remainingBudgetCents / daysRemaining) : 0;

  const budgetPct = totalBudgetCents > 0 ? Math.min(100, Math.round((totalSpentCents / totalBudgetCents) * 100)) : 0;
  const monthElapsedPct = Math.round((currentDay / totalDaysInMonth) * 100);

  const isOverBudget = totalBudgetCents > 0 && totalSpentCents > totalBudgetCents;
  const isPaceGood = budgetPct <= monthElapsedPct;

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
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Fast Spending Pace</Text>
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
            <Sliders size={13} color={CozyTheme.textSecondary} />
            <Text style={styles.manageBtnText}>Edit Caps</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dailyAmount}>
          {totalBudgetCents > 0 ? formatMoney(safeDailyCents, baseCurrency) : '₹0'}
          <Text style={styles.dailyPerDay}> / day</Text>
        </Text>

        <Text style={styles.subPaceText}>
          {totalBudgetCents > 0
            ? `${formatMoney(remainingBudgetCents, baseCurrency)} left • ${daysRemaining} days remaining in ${monthName}`
            : 'Set monthly category caps to calculate safe daily pace'}
        </Text>

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
                {formatMoney(totalSpentCents, baseCurrency)} spent ({budgetPct}%)
              </Text>
              <Text style={styles.progressLabelRight}>
                Cap: {formatMoney(totalBudgetCents, baseCurrency)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Category Budget Breakdowns */}
      <View style={styles.categorySection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Category Allowances</Text>
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
            >
              <Sliders size={20} color={CozyTheme.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCatTitle}>No Category Budgets Configured</Text>
              <Text style={styles.emptyCatSub}>
                Tap here to set monthly spending targets for dining, groceries, shopping, and more.
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
                    <ChevronRight size={13} color={CozyTheme.textTertiary} />
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
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  heroCard: {
    backgroundColor: CozyTheme.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  dailyAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: CozyTheme.textPrimary,
    letterSpacing: -1,
  },
  dailyPerDay: {
    fontSize: 16,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  subPaceText: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  progressBarWrapper: {
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: CozyTheme.surfaceElevated,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catList: {
    gap: 10,
  },
  emptyCatCard: {
    backgroundColor: CozyTheme.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyCatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptyCatSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  catItem: {
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  catItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catSpentText: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catCapText: {
    fontSize: 11,
    color: CozyTheme.textTertiary,
  },
  catBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CozyTheme.surfaceElevated,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  catPctText: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
});
