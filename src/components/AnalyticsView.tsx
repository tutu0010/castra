import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import { PieChart, TrendingUp, ArrowDownRight, ArrowUpRight, Wallet, Percent } from 'lucide-react-native';
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
  const savingsRate = totalIncomeCents > 0 ? Math.max(0, Math.round((netSavingsCents / totalIncomeCents) * 100)) : 0;

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

  // SVG Donut geometry
  const size = 220;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Timeframe selector */}
      <View style={styles.timeframeRow}>
        <TouchableOpacity
          style={[styles.timePill, timeframe === 'this_month' && styles.timePillSelected]}
          onPress={() => {
            triggerLightHaptic();
            setTimeframe('this_month');
          }}
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
            <ArrowDownRight size={14} color={CozyTheme.expense} />
            <Text style={styles.cardHeaderLabel}>Total Spent</Text>
          </View>
          <Text style={styles.cardAmountExpense}>
            {formatMoney(totalExpenseCents, baseCurrency)}
          </Text>
        </View>

        <View style={styles.cashFlowCard}>
          <View style={styles.cardHeaderRow}>
            <ArrowUpRight size={14} color={CozyTheme.income} />
            <Text style={styles.cardHeaderLabel}>Total Income</Text>
          </View>
          <Text style={styles.cardAmountIncome}>
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
          >
            {netSavingsCents >= 0 ? '+' : ''}
            {formatMoney(netSavingsCents, baseCurrency)}
          </Text>
        </View>

        <View style={styles.savingsRateBadge}>
          <Percent size={12} color={CozyTheme.income} />
          <Text style={styles.savingsRateText}>{savingsRate}% saved</Text>
        </View>
      </View>

      {/* Cash Flow Visual Bar Comparison */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>Cash Flow Balance</Text>
        <View style={styles.flowBarContainer}>
          <View style={styles.flowBarRow}>
            <Text style={styles.flowBarLabel}>Income</Text>
            <View style={styles.flowBarTrack}>
              <View
                style={[
                  styles.flowBarFill,
                  {
                    width: totalIncomeCents > 0 || totalExpenseCents > 0
                      ? `${Math.min(100, Math.round((totalIncomeCents / Math.max(totalIncomeCents, totalExpenseCents, 1)) * 100))}%`
                      : '0%',
                    backgroundColor: CozyTheme.income,
                  },
                ]}
              />
            </View>
            <Text style={styles.flowBarVal}>{formatMoney(totalIncomeCents, baseCurrency)}</Text>
          </View>

          <View style={styles.flowBarRow}>
            <Text style={styles.flowBarLabel}>Expenses</Text>
            <View style={styles.flowBarTrack}>
              <View
                style={[
                  styles.flowBarFill,
                  {
                    width: totalIncomeCents > 0 || totalExpenseCents > 0
                      ? `${Math.min(100, Math.round((totalExpenseCents / Math.max(totalIncomeCents, totalExpenseCents, 1)) * 100))}%`
                      : '0%',
                    backgroundColor: CozyTheme.expense,
                  },
                ]}
              />
            </View>
            <Text style={styles.flowBarVal}>{formatMoney(totalExpenseCents, baseCurrency)}</Text>
          </View>
        </View>
      </View>

      {/* Category Spend Donut Chart */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>Expense Breakdown</Text>
        {totalExpenseCents === 0 ? (
          <View style={styles.emptyChart}>
            <PieChart size={32} color={CozyTheme.textTertiary} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyChartTitle}>No Expense Data</Text>
            <Text style={styles.emptyChartSub}>Record expense transactions to see spending breakdown</Text>
          </View>
        ) : (
          <View style={styles.donutWrapper}>
            <View style={styles.svgContainer}>
              <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                  {/* Background Track */}
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
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
                        cx={size / 2}
                        cy={size / 2}
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
                <Text style={styles.donutCenterLabel}>Total Spent</Text>
                <Text style={styles.donutCenterAmount}>
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
                      <Text style={styles.legendName}>{slice.name}</Text>
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
    paddingHorizontal: 22,
    paddingBottom: 110,
    paddingTop: 10,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surface,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 14,
  },
  timePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  timePillSelected: {
    backgroundColor: CozyTheme.textPrimary,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  timePillTextSelected: {
    color: CozyTheme.textInverse,
  },
  cashFlowGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  cashFlowCard: {
    flex: 1,
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  cardAmountExpense: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.expense,
  },
  cardAmountIncome: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.income,
  },
  netSavingsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 14,
  },
  netSavingsLeft: {},
  netSavingsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  netSavingsAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  savingsRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.incomeSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  savingsRateText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.income,
  },
  chartBox: {
    backgroundColor: CozyTheme.surface,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    marginBottom: 14,
  },
  flowBarContainer: {
    gap: 12,
  },
  flowBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowBarLabel: {
    width: 65,
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  flowBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 5,
    overflow: 'hidden',
  },
  flowBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  flowBarVal: {
    width: 75,
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    textAlign: 'right',
  },
  donutWrapper: {
    alignItems: 'center',
  },
  svgContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCenterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  donutCenterAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: CozyTheme.border,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textTertiary,
    width: 32,
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyChartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  emptyChartSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
