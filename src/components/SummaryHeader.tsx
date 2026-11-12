import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney, convertCurrency } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface SummaryHeaderProps {
  accounts: Account[];
  cards: Card[];
  baseCurrency: string;
  onOpenSettings: () => void;
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({
  accounts,
  cards,
  baseCurrency,
  onOpenSettings,
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
      {/* Sleek Minimal Top Nav */}
      <View style={styles.topRow}>
        <Text style={styles.brandTitle}>Castra</Text>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            triggerLightHaptic();
            onOpenSettings();
          }}
          activeOpacity={0.6}
        >
          <Settings size={18} color={CozyTheme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Clutter-Free Net Worth Display */}
      <View style={styles.netWorthSection}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={styles.netWorthValue}>
          {formatMoney(netWorthCents, baseCurrency)}
        </Text>

        {/* Minimal Assets & Liabilities Breakdown */}
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownText}>
            Assets <Text style={styles.assetsValue}>{formatMoney(totalAssetsCents, baseCurrency)}</Text>
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.breakdownText}>
            Debt <Text style={styles.debtValue}>{formatMoney(totalDebtCents, baseCurrency)}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.6,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CozyTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  netWorthSection: {
    marginTop: 4,
  },
  netWorthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  netWorthValue: {
    fontSize: 38,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -1.2,
    marginVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  breakdownText: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
  assetsValue: {
    color: CozyTheme.income,
    fontWeight: '700',
  },
  debtValue: {
    color: CozyTheme.expense,
    fontWeight: '700',
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: CozyTheme.textTertiary,
    fontSize: 12,
  },
});
