import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CreditCard, Landmark, Wallet, Plus, ChevronRight } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.72, 270);

interface CardDeckProps {
  accounts: Account[];
  cards: Card[];
  onPressEntity: (entity: Account | Card) => void;
  onAddPress: () => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  accounts,
  cards,
  onPressEntity,
  onAddPress,
}) => {
  const hasItems = accounts.length > 0 || cards.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Accounts & Cards</Text>
        <TouchableOpacity
          style={styles.addTextButton}
          onPress={() => {
            triggerLightHaptic();
            onAddPress();
          }}
        >
          <Plus size={14} color={CozyTheme.textPrimary} />
          <Text style={styles.addTextButtonLabel}>Add New</Text>
        </TouchableOpacity>
      </View>

      {!hasItems ? (
        <TouchableOpacity
          style={styles.emptyCardBox}
          onPress={() => {
            triggerLightHaptic();
            onAddPress();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.emptyIconCircle}>
            <Plus size={20} color={CozyTheme.textPrimary} />
          </View>
          <Text style={styles.emptyCardTitle}>No Accounts Added Yet</Text>
          <Text style={styles.emptyCardSub}>Tap to add your first Bank, Credit/Debit Card, or Wallet</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 12}
        >
          {/* Credit & Debit Cards */}
          {cards.map(card => {
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
                  onPressEntity(card);
                }}
                style={[styles.cardBase, { backgroundColor: card.color || '#1C222B' }]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.typeRow}>
                    <CreditCard size={13} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.typeText}>{isCredit ? 'Credit Card' : 'Debit Card'}</Text>
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

                {isCredit && limit > 0 ? (
                  <View style={styles.cardBottom}>
                    <View style={styles.limitRow}>
                      <Text style={styles.limitText}>Limit {formatMoney(limit, card.currency)}</Text>
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
                  </View>
                ) : (
                  <View style={styles.cardBottom}>
                    <View style={styles.tapDetailsRow}>
                      <Text style={styles.tapDetailsText}>Manage & History</Text>
                      <ChevronRight size={12} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Bank & Wallet Accounts */}
          {accounts.map(acc => {
            const isBank = acc.type === 'bank';

            return (
              <TouchableOpacity
                key={acc.id}
                activeOpacity={0.88}
                onPress={() => {
                  triggerLightHaptic();
                  onPressEntity(acc);
                }}
                style={[styles.cardBase, { backgroundColor: acc.color || '#161412' }]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.typeRow}>
                    {isBank ? (
                      <Landmark size={13} color="rgba(255, 255, 255, 0.8)" />
                    ) : (
                      <Wallet size={13} color="rgba(255, 255, 255, 0.8)" />
                    )}
                    <Text style={styles.typeText}>{isBank ? 'Bank Account' : 'Cash Wallet'}</Text>
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
                  <View style={styles.tapDetailsRow}>
                    <Text style={styles.tapDetailsText}>Manage & Adjust</Text>
                    <ChevronRight size={12} color="rgba(255, 255, 255, 0.7)" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTextButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  last4Text: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  cardMiddle: {
    gap: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardBalance: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
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
    color: 'rgba(255, 255, 255, 0.75)',
  },
  utilizationText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tapDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapDetailsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  emptyCardBox: {
    marginHorizontal: 22,
    padding: 24,
    borderRadius: 20,
    backgroundColor: CozyTheme.surface,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
  },
  emptyCardSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
