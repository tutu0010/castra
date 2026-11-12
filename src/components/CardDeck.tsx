import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { CreditCard, Landmark, Wallet, Plus, ChevronRight } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface CardDeckProps {
  accounts: Account[];
  cards: Card[];
  onPressEntity: (entity: Account | Card) => void;
  onAddPress: () => void;
}

export const CardDeck: React.FC<CardDeckProps> = React.memo(({
  accounts,
  cards,
  onPressEntity,
  onAddPress,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(Math.max(screenWidth * 0.74, 240), 285);

  const hasItems = accounts.length > 0 || cards.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>ACCOUNTS & CARDS</Text>
        <TouchableOpacity
          style={styles.addTextButton}
          onPress={() => {
            triggerLightHaptic();
            onAddPress();
          }}
          activeOpacity={0.7}
        >
          <Plus size={13} color={CozyTheme.textPrimary} />
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
            <Plus size={18} color={CozyTheme.textPrimary} />
          </View>
          <Text style={styles.emptyCardTitle}>No Accounts Added Yet</Text>
          <Text style={styles.emptyCardSub}>Tap to add your Bank, Credit/Debit Card, or Cash Wallet</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={cardWidth + 10}
        >
          {/* Credit & Debit Cards */}
          {cards.map((card) => {
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
                style={[
                  styles.cardBase,
                  { width: cardWidth, backgroundColor: card.color || '#1C222B' },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.typeRow}>
                    <CreditCard size={13} color="rgba(255, 255, 255, 0.85)" />
                    <Text style={styles.typeText}>{isCredit ? 'Credit Card' : 'Debit Card'}</Text>
                  </View>
                  {card.last4 ? <Text style={styles.last4Text}>•• {card.last4}</Text> : null}
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {card.name}
                  </Text>
                  <Text style={styles.cardBalance} numberOfLines={1}>
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
                      <Text style={styles.tapDetailsText}>Manage & Adjust</Text>
                      <ChevronRight size={12} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Bank & Wallet Accounts */}
          {accounts.map((acc) => {
            const isBank = acc.type === 'bank';

            return (
              <TouchableOpacity
                key={acc.id}
                activeOpacity={0.88}
                onPress={() => {
                  triggerLightHaptic();
                  onPressEntity(acc);
                }}
                style={[
                  styles.cardBase,
                  { width: cardWidth, backgroundColor: acc.color || '#161412' },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.typeRow}>
                    {isBank ? (
                      <Landmark size={13} color="rgba(255, 255, 255, 0.85)" />
                    ) : (
                      <Wallet size={13} color="rgba(255, 255, 255, 0.85)" />
                    )}
                    <Text style={styles.typeText}>{isBank ? 'Bank Account' : 'Cash Wallet'}</Text>
                  </View>
                  <Text style={styles.last4Text}>{acc.currency}</Text>
                </View>

                <View style={styles.cardMiddle}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.cardBalance} numberOfLines={1}>
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
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.8,
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTextButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cardBase: {
    height: 144,
    borderRadius: 18,
    padding: 14,
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
    gap: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  last4Text: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
  cardMiddle: {
    gap: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardBalance: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  cardBottom: {
    gap: 3,
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
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 18,
    backgroundColor: CozyTheme.surface,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
  },
  emptyCardSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
