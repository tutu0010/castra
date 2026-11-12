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
  LucideIcon,
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
  accountsMap?: Map<string, Account>;
  cardsMap?: Map<string, Card>;
  categoriesMap?: Map<string, Category>;
  baseCurrency: string;
  onDelete: (id: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
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

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(({
  transaction,
  accounts,
  cards,
  categories,
  accountsMap,
  cardsMap,
  categoriesMap,
  baseCurrency,
  onDelete,
}) => {
  const category = categoriesMap
    ? (transaction.category_id ? categoriesMap.get(transaction.category_id) : undefined)
    : categories.find(c => c.id === transaction.category_id);

  const card = cardsMap
    ? (transaction.card_id ? cardsMap.get(transaction.card_id) : undefined)
    : cards.find(c => c.id === transaction.card_id);

  const account = accountsMap
    ? (transaction.account_id ? accountsMap.get(transaction.account_id) : undefined)
    : accounts.find(a => a.id === transaction.account_id);

  const toAccount = accountsMap
    ? (transaction.to_account_id ? accountsMap.get(transaction.to_account_id) : undefined)
    : accounts.find(a => a.id === transaction.to_account_id);

  const IconComponent = category?.icon ? ICON_MAP[category.icon] || Tag : Tag;
  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';

  const txDate = new Date(transaction.date);
  const isToday = new Date().toDateString() === txDate.toDateString();
  const dateFormatted = isToday
    ? 'Today'
    : txDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  let sourceName = 'Manual';
  if (card) {
    sourceName = card.last4 ? `${card.name} (••${card.last4})` : card.name;
  } else if (account) {
    sourceName = account.name;
  }

  if (isTransfer) {
    const toCard = cards.find(c => c.id === transaction.to_account_id || (transaction.card_id === c.id && c.type === 'credit'));
    const destName = toCard ? `${toCard.name} (Credit Card)` : (toAccount?.name || 'Account');
    sourceName = `${account?.name || 'Bank'} → ${destName}`;
  }

  const isDifferentCurrency = transaction.currency !== baseCurrency;

  return (
    <View style={styles.container}>
      {/* Category Icon */}
      <View style={styles.iconContainer}>
        {isTransfer ? (
          <ArrowRightLeft size={16} color={CozyTheme.transfer} />
        ) : (
          <IconComponent
            size={16}
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
        activeOpacity={0.5}
      >
        <Trash2 size={13} color={CozyTheme.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: CozyTheme.surface,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: CozyTheme.borderLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sourceTag: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
    maxWidth: 130,
  },
  dotSeparator: {
    marginHorizontal: 5,
    fontSize: 9,
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
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.2,
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
    color: CozyTheme.textTertiary,
    marginTop: 1,
  },
  deleteButton: {
    padding: 6,
  },
});
