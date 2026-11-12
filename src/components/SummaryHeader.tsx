import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney, convertCurrency } from '../utils/currency';

interface SummaryHeaderProps {
  accounts: Account[];
  cards: Card[];
  baseCurrency: string;
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = React.memo(({
  accounts,
  cards,
  baseCurrency,
}) => {
  const totalAssetsCents = accounts.reduce((acc, account) => {
    const { convertedCents } = convertCurrency(
      account.balance_cents,
      account.currency,
      baseCurrency
    );
    return acc + convertedCents;
  }, 0);

  const totalDebtCents = cards.reduce((acc, card) => {
    if (card.type === 'credit') {
      const outstanding = card.outstanding_balance_cents || 0;
      const { convertedCents } = convertCurrency(outstanding, card.currency, baseCurrency);
      return acc + convertedCents;
    }
    return acc;
  }, 0);

  const netWorthCents = totalAssetsCents - totalDebtCents;

  return (
    <View style={styles.container}>
      {/* Executive Net Worth Card */}
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardLabel}>TOTAL NET WORTH</Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>{baseCurrency}</Text>
          </View>
        </View>

        <Text style={styles.netWorthValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(netWorthCents, baseCurrency)}
        </Text>

        {/* Assets vs Liabilities Breakdown Row */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabelGroup}>
              <View style={[styles.dot, { backgroundColor: CozyTheme.income }]} />
              <Text style={styles.breakdownLabel}>Assets</Text>
            </View>
            <Text style={styles.assetsValue} numberOfLines={1}>
              {formatMoney(totalAssetsCents, baseCurrency)}
            </Text>
          </View>

          <View style={styles.dividerVertical} />

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabelGroup}>
              <View style={[styles.dot, { backgroundColor: CozyTheme.expense }]} />
              <Text style={styles.breakdownLabel}>Liabilities</Text>
            </View>
            <Text style={styles.debtValue} numberOfLines={1}>
              {formatMoney(totalDebtCents, baseCurrency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: CozyTheme.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.8,
  },
  currencyBadge: {
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  currencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  netWorthValue: {
    fontSize: 32,
    fontWeight: '900',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CozyTheme.borderLight,
  },
  breakdownItem: {
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: CozyTheme.borderLight,
    marginHorizontal: 12,
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownLabel: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
  assetsValue: {
    fontSize: 14,
    color: CozyTheme.income,
    fontWeight: '700',
  },
  debtValue: {
    fontSize: 14,
    color: CozyTheme.expense,
    fontWeight: '700',
  },
});
