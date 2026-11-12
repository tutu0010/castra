import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Utensils,
  ShoppingCart,
  Coffee,
  Home,
  Car,
  ShoppingBag,
  Tv,
  Briefcase,
  Laptop,
  ArrowRightLeft,
  Trash2,
  Tag,
} from 'lucide-react-native';
import { Transaction, Account, Card, Category } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic } from '../utils/haptics';

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  baseCurrency: string;
  onDelete: (id: string) => void;
}

const ICON_MAP: Record<string, any> = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  coffee: Coffee,
  home: Home,
  car: Car,
  'shopping-bag': ShoppingBag,
  tv: Tv,
  briefcase: Briefcase,
  laptop: Laptop,
  tag: Tag,
};

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  accounts,
  cards,
  categories,
  baseCurrency,
  onDelete,
}) => {
  const category = categories.find(c => c.id === transaction.category_id);
  const card = cards.find(c => c.id === transaction.card_id);
  const account = accounts.find(a => a.id === transaction.account_id);
  const toAccount = accounts.find(a => a.id === transaction.to_account_id);

  const IconComponent = category?.icon ? ICON_MAP[category.icon] || Tag : Tag;
  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  // Format date: "Nov 12" or "Today"
  const txDate = new Date(transaction.date);
  const isToday = new Date().toDateString() === txDate.toDateString();
  const dateFormatted = isToday
    ? `Today, ${txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : txDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Source name
  let sourceName = 'Manual';
  if (card) {
    sourceName = card.last4 ? `${card.name} (••${card.last4})` : card.name;
  } else if (account) {
    sourceName = account.name;
  }

  if (isTransfer) {
    sourceName = `${account?.name || 'Account'} → ${toAccount?.name || 'Account'}`;
  }

  const isDifferentCurrency = transaction.currency !== baseCurrency;

  return (
    <View style={styles.container}>
      {/* Category Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isTransfer
              ? CozyTheme.transferSoft
              : isIncome
              ? CozyTheme.incomeSoft
              : category?.color
              ? `${category.color}20`
              : CozyTheme.surfaceMuted,
          },
        ]}
      >
        {isTransfer ? (
          <ArrowRightLeft size={18} color={CozyTheme.transfer} />
        ) : (
          <IconComponent
            size={18}
            color={
              isIncome
                ? CozyTheme.income
                : category?.color || CozyTheme.textSecondary
            }
          />
        )}
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.note || category?.name || (isTransfer ? 'Transfer' : 'Transaction')}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.sourceTag} numberOfLines={1}>
            {sourceName}
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.dateText}>{dateFormatted}</Text>
        </View>
      </View>

      {/* Amount & Currency */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amountText,
            isIncome && styles.incomeText,
            isExpense && styles.expenseText,
            isTransfer && styles.transferText,
          ]}
        >
          {formatMoney(
            transaction.amount_cents,
            transaction.currency,
            { showSign: true }
          )}
        </Text>

        {isDifferentCurrency && (
          <Text style={styles.convertedAmountText}>
            ≈ {formatMoney(transaction.base_amount_cents, baseCurrency)}
          </Text>
        )}
      </View>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          triggerLightHaptic();
          onDelete(transaction.id);
        }}
        activeOpacity={0.6}
      >
        <Trash2 size={15} color={CozyTheme.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: CozyTheme.surface,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CozyTheme.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  sourceTag: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
    maxWidth: 130,
  },
  dotSeparator: {
    marginHorizontal: 5,
    fontSize: 10,
    color: CozyTheme.textTertiary,
  },
  dateText: {
    fontSize: 11,
    color: CozyTheme.textTertiary,
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.3,
  },
  expenseText: {
    color: CozyTheme.expense,
  },
  incomeText: {
    color: CozyTheme.income,
  },
  transferText: {
    color: CozyTheme.transfer,
  },
  convertedAmountText: {
    fontSize: 10,
    color: CozyTheme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
  },
});
