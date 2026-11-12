import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Calendar, Check, Repeat, CreditCard, Landmark } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Account, Card, Category, RecurringBill } from '../types';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { parseMoneyToMinorUnits, getCurrencySymbol } from '../utils/currency';

interface AddRecurringBillModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  baseCurrency: string;
  onSave: (bill: Omit<RecurringBill, 'created_at'>) => void;
}

export const AddRecurringBillModal: React.FC<AddRecurringBillModalProps> = ({
  visible,
  onClose,
  categories,
  accounts,
  cards,
  baseCurrency,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [dueDay, setDueDay] = useState<number>(new Date().getDate());
  const [categoryId, setCategoryId] = useState<string | null>(
    categories.find((c) => c.id === 'cat_subs')?.id || categories[0]?.id || null
  );
  const [sourceId, setSourceId] = useState<string | null>(
    accounts[0]?.id || cards[0]?.id || null
  );

  const handleSave = () => {
    if (!name.trim()) return;
    const amount_cents = parseMoneyToMinorUnits(amountStr, baseCurrency);
    if (amount_cents <= 0) return;

    triggerSuccessHaptic();

    const selectedAccount = accounts.find((a) => a.id === sourceId);
    const selectedCard = cards.find((c) => c.id === sourceId);

    onSave({
      id: `rec_${Date.now()}`,
      name: name.trim(),
      amount_cents,
      currency: baseCurrency,
      category_id: categoryId,
      account_id: selectedAccount ? selectedAccount.id : null,
      card_id: selectedCard ? selectedCard.id : null,
      frequency,
      due_day: dueDay,
      is_active: true,
    });

    // Reset fields
    setName('');
    setAmountStr('');
    onClose();
  };

  const FREQUENCIES: { id: 'monthly' | 'yearly' | 'weekly'; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'yearly', label: 'Yearly' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Repeat size={20} color={CozyTheme.textPrimary} />
            <Text style={styles.headerTitle}>New Recurring Bill</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onClose();
            }}
            style={styles.closeBtn}
          >
            <X size={18} color={CozyTheme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {/* Subscription Name */}
          <Text style={styles.inputLabel}>Bill / Subscription Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Netflix, Wifi, Rent, Gym, Spotify"
              placeholderTextColor={CozyTheme.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Amount */}
          <Text style={styles.inputLabel}>Billing Amount ({getCurrencySymbol(baseCurrency)})</Text>
          <View style={styles.inputBox}>
            <Text style={styles.currencyPrefix}>{getCurrencySymbol(baseCurrency)}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={CozyTheme.textTertiary}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
            />
          </View>

          {/* Frequency Selector */}
          <Text style={styles.inputLabel}>Billing Cycle</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => {
              const isSelected = frequency === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.freqPill, isSelected && styles.freqPillSelected]}
                  onPress={() => {
                    triggerLightHaptic();
                    setFrequency(f.id);
                  }}
                >
                  <Text style={[styles.freqText, isSelected && styles.freqTextSelected]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due Day Selector (1-31) */}
          <Text style={styles.inputLabel}>Due Day of Month (Day {dueDay})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScroll}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isSelected = dueDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                  onPress={() => {
                    triggerLightHaptic();
                    setDueDay(day);
                  }}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category Picker */}
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catPill, isSelected && styles.catPillSelected]}
                  onPress={() => {
                    triggerLightHaptic();
                    setCategoryId(cat.id);
                  }}
                >
                  <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catName, isSelected && styles.catNameSelected]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Payment Method / Account Source */}
          <Text style={styles.inputLabel}>Payment Source</Text>
          <View style={styles.sourceList}>
            {accounts.map((acc) => {
              const isSelected = sourceId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.sourceItem, isSelected && styles.sourceItemSelected]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSourceId(acc.id);
                  }}
                >
                  <Landmark size={15} color={CozyTheme.textPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.sourceName}>{acc.name} (Bank)</Text>
                  {isSelected && <Check size={16} color={CozyTheme.income} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}

            {cards.map((c) => {
              const isSelected = sourceId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.sourceItem, isSelected && styles.sourceItemSelected]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSourceId(c.id);
                  }}
                >
                  <CreditCard size={15} color={CozyTheme.textPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.sourceName}>{c.name} (Card)</Text>
                  {isSelected && <Check size={16} color={CozyTheme.income} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Check size={18} color={CozyTheme.textInverse} style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>Add to Radar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CozyTheme.background,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: CozyTheme.border,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
    padding: 0,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    padding: 0,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CozyTheme.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  freqPillSelected: {
    backgroundColor: CozyTheme.textPrimary,
    borderColor: CozyTheme.textPrimary,
  },
  freqText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  freqTextSelected: {
    color: CozyTheme.textInverse,
  },
  dayScroll: {
    gap: 6,
    paddingRight: 10,
  },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CozyTheme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  dayPillSelected: {
    backgroundColor: CozyTheme.textPrimary,
    borderColor: CozyTheme.textPrimary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  dayTextSelected: {
    color: CozyTheme.textInverse,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 10,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: CozyTheme.surface,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 6,
  },
  catPillSelected: {
    backgroundColor: CozyTheme.surfaceElevated,
    borderColor: CozyTheme.textPrimary,
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  catNameSelected: {
    color: CozyTheme.textPrimary,
    fontWeight: '700',
  },
  sourceList: {
    gap: 8,
    marginBottom: 20,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  sourceItemSelected: {
    borderColor: CozyTheme.textPrimary,
    backgroundColor: CozyTheme.surfaceElevated,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 40,
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: CozyTheme.textInverse,
  },
});
