import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { PieChart, ArrowDownRight, ArrowUpRight, Percent } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Category, Transaction } from '../types';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  baseCurrency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  categories,
  baseCurrency,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [timeframe, setTimeframe] = useState<'this_month' | 'all'>('this_month');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });

  // Filter transactions based on timeframe
  const filteredTxs = transactions.filter((t) => {
    if (timeframe === 'all') return true;
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const expenseTxs = filteredTxs.filter((t) => t.type === 'expense');
  const incomeTxs = filteredTxs.filter((t) => t.type === 'income');

  const totalExpenseCents = expenseTxs.reduce((sum, t) => sum + t.base_amount_cents, 0);
  const totalIncomeCents = incomeTxs.reduce((sum, t) => sum + t.base_amount_cents, 0);
  const netSavingsCents = totalIncomeCents - totalExpenseCents;
  const isDeficit = netSavingsCents < 0;
  const savingsRate = totalIncomeCents > 0
    ? Math.round((netSavingsCents / totalIncomeCents) * 100)
    : (totalExpenseCents > 0 ? -100 : 0);

  // Month-over-month trend comparison
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthExpenseCents = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthIdx;
    })
    .reduce((sum, t) => sum + t.base_amount_cents, 0);

  const hasLastMonthData = lastMonthExpenseCents > 0;
  const momDiffCents = totalExpenseCents - lastMonthExpenseCents;
  const momDiffPct = hasLastMonthData ? Math.round((momDiffCents / lastMonthExpenseCents) * 100) : 0;
  const currentDay = Math.max(1, now.getDate());
  const dailySpendVelocityCents = Math.round(totalExpenseCents / currentDay);

  // Category breakdown
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const categoryTotals: { [catId: string]: number } = {};
  for (const tx of expenseTxs) {
    const catId = tx.category_id || 'other';
    categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.base_amount_cents;
  }

  const categorySlices = Object.entries(categoryTotals)
    .map(([catId, amountCents]) => {
      const cat = categoryMap.get(catId);
      return {
        id: catId,
        name: cat ? cat.name : 'Uncategorized',
        color: cat ? cat.color : '#756D63',
        amountCents,
        pct: totalExpenseCents > 0 ? amountCents / totalExpenseCents : 0,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  // Responsive SVG Donut geometry
  const chartSize = Math.min(Math.max(screenWidth * 0.52, 180), 210);
  const strokeWidth = 22;
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Timeframe selector */}
      <View style={styles.timeframeRow}>
        <TouchableOpacity
          style={[styles.timePill, timeframe === 'this_month' && styles.timePillSelected]}
          onPress={() => {
            triggerLightHaptic();
            setTimeframe('this_month');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.timePillText, timeframe === 'this_month' && styles.timePillTextSelected]}>
            {monthName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timePill, timeframe === 'all' && styles.timePillSelected]}
          onPress={() => {
            triggerLightHaptic();
            setTimeframe('all');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.timePillText, timeframe === 'all' && styles.timePillTextSelected]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cash Flow Summary Cards */}
      <View style={styles.cashFlowGrid}>
        <View style={styles.cashFlowCard}>
          <View style={styles.cardHeaderRow}>
            <ArrowDownRight size={13} color={CozyTheme.expense} />
            <Text style={styles.cardHeaderLabel}>Spent</Text>
          </View>
          <Text style={styles.cardAmountExpense} numberOfLines={1}>
            {formatMoney(totalExpenseCents, baseCurrency)}
          </Text>
        </View>

        <View style={styles.cashFlowCard}>
          <View style={styles.cardHeaderRow}>
            <ArrowUpRight size={13} color={CozyTheme.income} />
            <Text style={styles.cardHeaderLabel}>Income</Text>
          </View>
          <Text style={styles.cardAmountIncome} numberOfLines={1}>
            {formatMoney(totalIncomeCents, baseCurrency)}
          </Text>
        </View>
      </View>

      {/* Net Savings Metric Banner */}
      <View style={styles.netSavingsCard}>
        <View style={styles.netSavingsLeft}>
          <Text style={styles.netSavingsLabel}>Net Cash Flow</Text>
          <Text
            style={[
              styles.netSavingsAmount,
              { color: netSavingsCents >= 0 ? CozyTheme.income : CozyTheme.expense },
            ]}
            numberOfLines={1}
          >
            {netSavingsCents >= 0 ? '+' : ''}
            {formatMoney(netSavingsCents, baseCurrency)}
          </Text>
        </View>

        <View
          style={[
            styles.savingsRateBadge,
            { backgroundColor: isDeficit ? CozyTheme.expenseSoft : CozyTheme.incomeSoft },
          ]}
        >
          <Percent size={11} color={isDeficit ? CozyTheme.expense : CozyTheme.income} />
          <Text
            style={[
              styles.savingsRateText,
              { color: isDeficit ? CozyTheme.expense : CozyTheme.income },
            ]}
          >
            {isDeficit ? `${Math.abs(savingsRate)}% deficit` : `${savingsRate}% saved`}
          </Text>
        </View>
      </View>

      {/* Month-over-Month Velocity & Trend */}
      {timeframe === 'this_month' && (
        <View style={styles.trendRow}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Daily Velocity</Text>
            <Text style={styles.trendValue}>
              {formatMoney(dailySpendVelocityCents, baseCurrency)}
              <Text style={styles.trendSub}> / day</Text>
            </Text>
          </View>

          <View style={styles.trendDivider} />

          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>vs Last Month</Text>
            {hasLastMonthData ? (
              <View style={styles.trendDiffRow}>
                {momDiffPct <= 0 ? (
                  <ArrowDownRight size={12} color={CozyTheme.income} />
                ) : (
                  <ArrowUpRight size={12} color={CozyTheme.expense} />
                )}
                <Text
                  style={[
                    styles.trendValue,
                    { color: momDiffPct <= 0 ? CozyTheme.income : CozyTheme.expense },
                  ]}
                >
                  {momDiffPct <= 0 ? `${Math.abs(momDiffPct)}% less` : `+${momDiffPct}% more`}
                </Text>
              </View>
            ) : (
              <Text style={[styles.trendValue, { color: CozyTheme.textTertiary }]}>No baseline</Text>
            )}
          </View>
        </View>
      )}

      {/* Cash Flow Visual Bar Comparison */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>CASH FLOW BALANCE</Text>
        <View style={styles.flowBarContainer}>
          <View style={styles.flowBarRow}>
            <Text style={styles.flowBarLabel}>Income</Text>
            <View style={styles.flowBarTrack}>
              <View
                style={[
                  styles.flowBarFill,
                  {
                    width:
                      totalIncomeCents > 0 || totalExpenseCents > 0
                        ? `${Math.min(
                            100,
                            Math.round(
                              (totalIncomeCents / Math.max(totalIncomeCents, totalExpenseCents, 1)) * 100
                            )
                          )}%`
                        : '0%',
                    backgroundColor: CozyTheme.income,
                  },
                ]}
              />
            </View>
            <Text style={styles.flowBarVal} numberOfLines={1}>
              {formatMoney(totalIncomeCents, baseCurrency)}
            </Text>
          </View>

          <View style={styles.flowBarRow}>
            <Text style={styles.flowBarLabel}>Expense</Text>
            <View style={styles.flowBarTrack}>
              <View
                style={[
                  styles.flowBarFill,
                  {
                    width:
                      totalIncomeCents > 0 || totalExpenseCents > 0
                        ? `${Math.min(
                            100,
                            Math.round(
                              (totalExpenseCents / Math.max(totalIncomeCents, totalExpenseCents, 1)) * 100
                            )
                          )}%`
                        : '0%',
                    backgroundColor: CozyTheme.expense,
                  },
                ]}
              />
            </View>
            <Text style={styles.flowBarVal} numberOfLines={1}>
              {formatMoney(totalExpenseCents, baseCurrency)}
            </Text>
          </View>
        </View>
      </View>

      {/* Category Spend Donut Chart */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>SPENDING BREAKDOWN</Text>
        {totalExpenseCents === 0 ? (
          <View style={styles.emptyChart}>
            <PieChart size={28} color={CozyTheme.textTertiary} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyChartTitle}>No Expense Data</Text>
            <Text style={styles.emptyChartSub}>Record expense transactions to view category distribution</Text>
          </View>
        ) : (
          <View style={styles.donutWrapper}>
            <View style={[styles.svgContainer, { width: chartSize, height: chartSize }]}>
              <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
                <G rotation="-90" origin={`${chartSize / 2}, ${chartSize / 2}`}>
                  {/* Background Track */}
                  <Circle
                    cx={chartSize / 2}
                    cy={chartSize / 2}
                    r={radius}
                    stroke={CozyTheme.surfaceElevated}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* Slices */}
                  {categorySlices.map((slice) => {
                    const strokeDashoffset = -(accumulatedPct * circumference);
                    const strokeLength = slice.pct * circumference;
                    accumulatedPct += slice.pct;

                    return (
                      <Circle
                        key={slice.id}
                        cx={chartSize / 2}
                        cy={chartSize / 2}
                        r={radius}
                        stroke={slice.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                        strokeDashoffset={strokeDashoffset}
                        fill="transparent"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </G>
              </Svg>

              {/* Center Total Overlay */}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterLabel}>TOTAL SPENT</Text>
                <Text style={styles.donutCenterAmount} numberOfLines={1}>
                  {formatMoney(totalExpenseCents, baseCurrency)}
                </Text>
              </View>
            </View>

            {/* Category Slices List */}
            <View style={styles.legendContainer}>
              {categorySlices.map((slice) => {
                const pctFormatted = Math.round(slice.pct * 100);
                return (
                  <View key={slice.id} style={styles.legendItem}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                      <Text style={styles.legendName} numberOfLines={1}>
                        {slice.name}
                      </Text>
                    </View>
                    <View style={styles.legendRight}>
                      <Text style={styles.legendAmount}>
                        {formatMoney(slice.amountCents, baseCurrency)}
                      </Text>
                      <Text style={styles.legendPct}>{pctFormatted}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CozyTheme.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 8,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 10,
    alignItems: 'center',
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 10,
    color: CozyTheme.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  trendSub: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    fontWeight: '400',
  },
  trendDivider: {
    width: 1,
    height: 24,
    backgroundColor: CozyTheme.border,
    marginHorizontal: 8,
  },
  trendDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surface,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  timePillSelected: {
    backgroundColor: CozyTheme.textPrimary,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  timePillTextSelected: {
    color: CozyTheme.textInverse,
  },
  cashFlowGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cashFlowCard: {
    flex: 1,
    backgroundColor: CozyTheme.surface,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  cardHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  cardAmountExpense: {
    fontSize: 17,
    fontWeight: '800',
    color: CozyTheme.expense,
  },
  cardAmountIncome: {
    fontSize: 17,
    fontWeight: '800',
    color: CozyTheme.income,
  },
  netSavingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 10,
  },
  netSavingsLeft: {
    flex: 1,
  },
  netSavingsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  netSavingsAmount: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  savingsRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.incomeSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  savingsRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.income,
  },
  chartBox: {
    backgroundColor: CozyTheme.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  flowBarContainer: {
    gap: 10,
  },
  flowBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flowBarLabel: {
    width: 55,
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  flowBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  flowBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  flowBarVal: {
    minWidth: 70,
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    textAlign: 'right',
  },
  donutWrapper: {
    alignItems: 'center',
  },
  svgContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCenterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.5,
  },
  donutCenterAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: CozyTheme.textPrimary,
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: CozyTheme.borderLight,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  legendPct: {
    fontSize: 10,
    fontWeight: '600',
    color: CozyTheme.textTertiary,
    width: 28,
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyChartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptyChartSub: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 3,
  },
});
