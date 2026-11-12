import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CreditCard, Landmark, Wallet, Plus, ArrowUpRight } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.74, 275);

interface CardDeckProps {
  accounts: Account[];
  cards: Card[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddPress: () => void;
  onPayCardPress?: (card: Card) => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  accounts,
  cards,
  selectedId,
  onSelect,
  onAddPress,
  onPayCardPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Accounts & Cards</Text>
        {selectedId && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onSelect(null);
            }}
          >
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {/* Credit & Debit Cards */}
        {cards.map(card => {
          const isSelected = selectedId === card.id;
          const isCredit = card.type === 'credit';
          const outstanding = card.outstanding_balance_cents || 0;
          const limit = card.credit_limit_cents || 0;
          const utilizationRatio = limit > 0 ? Math.min(outstanding / limit, 1.0) : 0;
          const utilizationPct = Math.round(utilizationRatio * 100);

          return (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.88}
              onPress={() => {
                triggerLightHaptic();
                onSelect(isSelected ? null : card.id);
              }}
              style={[
                styles.cardBase,
                { backgroundColor: card.color || '#1E252E' },
                isSelected && styles.cardSelected,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.typeRow}>
                  <CreditCard size={13} color={CozyTheme.textSecondary} />
                  <Text style={styles.typeText}>{isCredit ? 'Credit' : 'Debit'}</Text>
                </View>
                {card.last4 ? <Text style={styles.last4Text}>•• {card.last4}</Text> : null}
              </View>

              <View style={styles.cardMiddle}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {card.name}
                </Text>
                <Text style={styles.cardBalance}>
                  {isCredit ? formatMoney(outstanding, card.currency) : 'Direct Debit'}
                </Text>
              </View>

              {isCredit && limit > 0 && (
                <View style={styles.cardBottom}>
                  <View style={styles.limitRow}>
                    <Text style={styles.limitText}>
                      Limit {formatMoney(limit, card.currency)}
                    </Text>
                    <Text style={styles.utilizationText}>{utilizationPct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(3, utilizationPct)}%`,
                          backgroundColor:
                            utilizationPct > 70
                              ? CozyTheme.expense
                              : utilizationPct > 30
                              ? CozyTheme.warning
                              : CozyTheme.income,
                        },
                      ]}
                    />
                  </View>
                  {outstanding > 0 && onPayCardPress && (
                    <TouchableOpacity
                      style={styles.payLink}
                      onPress={() => onPayCardPress(card)}
                    >
                      <Text style={styles.payLinkText}>Pay Balance</Text>
                      <ArrowUpRight size={11} color={CozyTheme.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Bank & Wallet Accounts */}
        {accounts.map(acc => {
          const isSelected = selectedId === acc.id;
          const isBank = acc.type === 'bank';

          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.88}
              onPress={() => {
                triggerLightHaptic();
                onSelect(isSelected ? null : acc.id);
              }}
              style={[
                styles.cardBase,
                { backgroundColor: acc.color || '#1A1816' },
                isSelected && styles.cardSelected,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.typeRow}>
                  {isBank ? (
                    <Landmark size={13} color={CozyTheme.textSecondary} />
                  ) : (
                    <Wallet size={13} color={CozyTheme.textSecondary} />
                  )}
                  <Text style={styles.typeText}>{isBank ? 'Bank' : 'Wallet'}</Text>
                </View>
                <Text style={styles.last4Text}>{acc.currency}</Text>
              </View>

              <View style={styles.cardMiddle}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {acc.name}
                </Text>
                <Text style={styles.cardBalance}>
                  {formatMoney(acc.balance_cents, acc.currency)}
                </Text>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.availableTag}>Available Funds</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Minimal Add Card */}
        <TouchableOpacity
          style={styles.addCardButton}
          activeOpacity={0.7}
          onPress={() => {
            triggerLightHaptic();
            onAddPress();
          }}
        >
          <View style={styles.addIconCircle}>
            <Plus size={16} color={CozyTheme.textSecondary} />
          </View>
          <Text style={styles.addCardTitle}>New Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.expense,
  },
  scrollContent: {
    paddingHorizontal: 22,
    gap: 12,
  },
  cardBase: {
    width: CARD_WIDTH,
    height: 154,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  cardSelected: {
    borderColor: CozyTheme.textPrimary,
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  last4Text: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  cardMiddle: {
    gap: 2,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
  },
  cardBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.5,
  },
  cardBottom: {
    gap: 4,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
  },
  utilizationText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  payLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  payLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  availableTag: {
    fontSize: 10,
    color: CozyTheme.textTertiary,
    fontWeight: '500',
  },
  addCardButton: {
    width: 110,
    height: 154,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: CozyTheme.borderStrong,
    backgroundColor: CozyTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textAlign: 'center',
  },
});
