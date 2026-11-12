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
const CARD_WIDTH = Math.min(width * 0.78, 300);

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
        <Text style={styles.sectionTitle}>Your Wallets & Cards</Text>
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
        snapToInterval={CARD_WIDTH + 14}
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
              activeOpacity={0.9}
              onPress={() => {
                triggerLightHaptic();
                onSelect(isSelected ? null : card.id);
              }}
              style={[
                styles.cardBase,
                { backgroundColor: card.color || '#3E4968' },
                isSelected && styles.cardSelected,
              ]}
            >
              {/* Top Row: Type & Chip */}
              <View style={styles.cardTopRow}>
                <View style={styles.badgeRow}>
                  <CreditCard size={15} color="#FFFFFF" opacity={0.85} />
                  <Text style={styles.cardTypeBadge}>
                    {isCredit ? 'CREDIT CARD' : 'DEBIT CARD'}
                  </Text>
                </View>
                {card.last4 ? (
                  <Text style={styles.last4Text}>•••• {card.last4}</Text>
                ) : null}
              </View>

              {/* Middle: Name & Balance */}
              <View style={styles.cardMiddle}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {card.name}
                </Text>
                {isCredit ? (
                  <View>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.cardBalance}>
                      {formatMoney(outstanding, card.currency)}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.balanceLabel}>Direct Debit</Text>
                    <Text style={styles.cardBalance}>Linked to Checking</Text>
                  </View>
                )}
              </View>

              {/* Bottom Row: Utilization or Statements */}
              {isCredit && limit > 0 && (
                <View style={styles.cardBottom}>
                  <View style={styles.utilizationHeader}>
                    <Text style={styles.utilizationLabel}>
                      Limit: {formatMoney(limit, card.currency)}
                    </Text>
                    <Text style={styles.utilizationPct}>{utilizationPct}% used</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(4, utilizationPct)}%`,
                          backgroundColor:
                            utilizationPct > 75
                              ? '#FFA08A'
                              : utilizationPct > 35
                              ? '#FFDE99'
                              : '#95E3AB',
                        },
                      ]}
                    />
                  </View>

                  {card.due_day && (
                    <View style={styles.cardFooter}>
                      <Text style={styles.dueDayText}>Due on {card.due_day}th</Text>
                      {outstanding > 0 && onPayCardPress && (
                        <TouchableOpacity
                          style={styles.payButton}
                          onPress={() => onPayCardPress(card)}
                        >
                          <Text style={styles.payButtonText}>Pay</Text>
                          <ArrowUpRight size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
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
              activeOpacity={0.9}
              onPress={() => {
                triggerLightHaptic();
                onSelect(isSelected ? null : acc.id);
              }}
              style={[
                styles.cardBase,
                { backgroundColor: acc.color || '#2C343E' },
                isSelected && styles.cardSelected,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.badgeRow}>
                  {isBank ? (
                    <Landmark size={15} color="#FFFFFF" opacity={0.85} />
                  ) : (
                    <Wallet size={15} color="#FFFFFF" opacity={0.85} />
                  )}
                  <Text style={styles.cardTypeBadge}>
                    {isBank ? 'BANK ACCOUNT' : 'WALLET / CASH'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardMiddle}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {acc.name}
                </Text>
                <View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text style={styles.cardBalance}>
                    {formatMoney(acc.balance_cents, acc.currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.accountCurrencyTag}>{acc.currency} Primary</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add New Card / Account Card */}
        <TouchableOpacity
          style={styles.addCardButton}
          activeOpacity={0.7}
          onPress={() => {
            triggerLightHaptic();
            onAddPress();
          }}
        >
          <View style={styles.addIconCircle}>
            <Plus size={20} color={CozyTheme.textSecondary} />
          </View>
          <Text style={styles.addCardTitle}>Add Account or Card</Text>
          <Text style={styles.addCardSubtitle}>Bank, Credit, Debit, Wallet</Text>
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
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.expense,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  cardBase: {
    width: CARD_WIDTH,
    height: 172,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.02 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  last4Text: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.75,
  },
  cardMiddle: {
    gap: 4,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  cardBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardBottom: {
    marginTop: 2,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  utilizationLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  utilizationPct: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dueDayText: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.85,
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  payButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountCurrencyTag: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '600',
  },
  addCardButton: {
    width: 140,
    height: 172,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: CozyTheme.borderStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CozyTheme.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    textAlign: 'center',
  },
  addCardSubtitle: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
