import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings, ShieldCheck, ArrowDown, ArrowUp } from 'lucide-react-native';
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
  // Calculate Total Assets (Banks + Wallets) in Base Currency
  const totalAssetsCents = accounts.reduce((acc, account) => {
    const { convertedCents } = convertCurrency(
      account.balance_cents,
      account.currency,
      baseCurrency
    );
    return acc + convertedCents;
  }, 0);

  // Calculate Total Liabilities (Credit Cards) in Base Currency
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
      {/* Top Branding & Settings Row */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <ShieldCheck size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Castra</Text>
            <Text style={styles.brandSubtitle}>Personal Ledger</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            triggerLightHaptic();
            onOpenSettings();
          }}
          activeOpacity={0.7}
        >
          <Settings size={20} color={CozyTheme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Net Worth Card */}
      <View style={styles.netWorthCard}>
        <View style={styles.netWorthTop}>
          <Text style={styles.netWorthLabel}>Total Net Worth</Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>{baseCurrency}</Text>
          </View>
        </View>

        <Text style={styles.netWorthValue}>
          {formatMoney(netWorthCents, baseCurrency)}
        </Text>

        {/* Assets vs Debt Pills */}
        <View style={styles.breakdownRow}>
          <View style={[styles.pill, styles.assetsPill]}>
            <View style={styles.arrowCircleGreen}>
              <ArrowUp size={11} color={CozyTheme.income} />
            </View>
            <View>
              <Text style={styles.pillLabel}>Assets</Text>
              <Text style={styles.pillValueGreen}>
                {formatMoney(totalAssetsCents, baseCurrency)}
              </Text>
            </View>
          </View>

          <View style={[styles.pill, styles.debtPill]}>
            <View style={styles.arrowCircleRed}>
              <ArrowDown size={11} color={CozyTheme.expense} />
            </View>
            <View>
              <Text style={styles.pillLabel}>Liabilities</Text>
              <Text style={styles.pillValueRed}>
                {formatMoney(totalDebtCents, baseCurrency)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#2C343E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  netWorthCard: {
    backgroundColor: CozyTheme.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  netWorthTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  netWorthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  currencyBadge: {
    backgroundColor: CozyTheme.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  netWorthValue: {
    fontSize: 34,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -1,
    marginVertical: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 8,
  },
  assetsPill: {
    backgroundColor: CozyTheme.incomeSoft,
  },
  debtPill: {
    backgroundColor: CozyTheme.expenseSoft,
  },
  arrowCircleGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowCircleRed: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
  },
  pillValueGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.income,
  },
  pillValueRed: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.expense,
  },
});
