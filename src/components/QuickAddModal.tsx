import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { X, Delete, Check, ArrowRightLeft } from 'lucide-react-native';
import { Account, Card, Category, TransactionType } from '../types';
import { CozyTheme } from '../theme/colors';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  baseCurrency: string;
  onSave: (tx: {
    amount_cents: number;
    currency: string;
    type: TransactionType;
    account_id?: string | null;
    card_id?: string | null;
    to_account_id?: string | null;
    category_id?: string | null;
    note?: string;
    date: string;
  }) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  accounts,
  cards,
  categories,
  baseCurrency,
  onSave,
}) => {
  const [mode, setMode] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(baseCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<boolean>(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    cards[0]?.id || accounts[0]?.id || ''
  );
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>(
    accounts[1]?.id || accounts[0]?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ''
  );
  const [note, setNote] = useState<string>('');

  // Keypad actions
  const handleKeypadPress = (val: string) => {
    triggerLightHaptic();
    if (val === 'back') {
      if (amountStr.length <= 1) {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }

    if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }

    // Numbers
    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      // Limit to 2 decimal places if dot present
      const parts = amountStr.split('.');
      if (parts.length > 1 && parts[1].length >= 2) {
        return;
      }
      if (amountStr.length < 8) {
        setAmountStr(amountStr + val);
      }
    }
  };

  const handleSave = () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) return;

    triggerSuccessHaptic();
    const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency];
    const decimals = currencyInfo?.decimals ?? 2;
    const amount_cents = decimals === 0 ? Math.round(numericAmount) : Math.round(numericAmount * 100);

    const isCard = cards.some(c => c.id === selectedSourceId);

    onSave({
      amount_cents,
      currency: selectedCurrency,
      type: mode,
      card_id: isCard ? selectedSourceId : null,
      account_id: isCard ? null : selectedSourceId,
      to_account_id: mode === 'transfer' ? selectedToAccountId : null,
      category_id: mode === 'transfer' ? null : selectedCategoryId,
      note: note.trim() || undefined,
      date: new Date().toISOString(),
    });

    // Reset form
    setAmountStr('0');
    setNote('');
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === (mode === 'income' ? 'income' : 'expense'));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            {/* Mode Switcher */}
            <View style={styles.modeTabs}>
              {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    triggerLightHaptic();
                    setMode(t);
                  }}
                  style={[
                    styles.modeTab,
                    mode === t && (
                      t === 'expense'
                        ? styles.modeTabExpense
                        : t === 'income'
                        ? styles.modeTabIncome
                        : styles.modeTabTransfer
                    ),
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      mode === t && styles.modeTabTextActive,
                    ]}
                  >
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              style={styles.closeButton}
            >
              <X size={20} color={CozyTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Display with Currency Picker */}
          <View style={styles.amountDisplayRow}>
            <TouchableOpacity
              style={styles.currencyPill}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.currencyPillText}>
                {getCurrencySymbol(selectedCurrency)} {selectedCurrency}
              </Text>
            </TouchableOpacity>

            <Text style={styles.amountNumberText} numberOfLines={1}>
              {amountStr}
            </Text>
          </View>

          {/* Currency Dropdown Picker */}
          {showCurrencyPicker && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.currencyScroll}
              contentContainerStyle={styles.currencyScrollContent}
            >
              {Object.keys(SUPPORTED_CURRENCIES).map(currCode => (
                <TouchableOpacity
                  key={currCode}
                  style={[
                    styles.currencyChoicePill,
                    selectedCurrency === currCode && styles.currencyChoicePillActive,
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCurrency(currCode);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.currencyChoiceText,
                      selectedCurrency === currCode && styles.currencyChoiceTextActive,
                    ]}
                  >
                    {currCode} ({getCurrencySymbol(currCode)})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Source Account / Card Selector */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.fieldSectionLabel}>
              {mode === 'transfer' ? 'From Source' : 'Paid With'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sourceScrollContent}
          >
            {cards.map(c => {
              const isSelected = selectedSourceId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.sourcePill,
                    isSelected && { borderColor: c.color || CozyTheme.textPrimary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedSourceId(c.id);
                  }}
                >
                  <View style={[styles.sourceDot, { backgroundColor: c.color || '#3E4968' }]} />
                  <Text style={styles.sourcePillText}>
                    {c.name} {c.last4 ? `(••${c.last4})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {accounts.map(a => {
              const isSelected = selectedSourceId === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.sourcePill,
                    isSelected && { borderColor: a.color || CozyTheme.textPrimary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedSourceId(a.id);
                  }}
                >
                  <View style={[styles.sourceDot, { backgroundColor: a.color || '#2C343E' }]} />
                  <Text style={styles.sourcePillText}>{a.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Destination Account (if transfer) */}
          {mode === 'transfer' ? (
            <View>
              <Text style={styles.fieldSectionLabel}>Transfer To</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceScrollContent}
              >
                {accounts
                  .filter(a => a.id !== selectedSourceId)
                  .map(a => {
                    const isSelected = selectedToAccountId === a.id;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.sourcePill,
                          isSelected && styles.sourcePillActive,
                        ]}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedToAccountId(a.id);
                        }}
                      >
                        <View style={[styles.sourceDot, { backgroundColor: a.color }]} />
                        <Text style={styles.sourcePillText}>{a.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          ) : (
            /* Category Selector (if expense or income) */
            <View>
              <Text style={styles.fieldSectionLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {filteredCategories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        isSelected && {
                          backgroundColor: cat.color ? `${cat.color}25` : CozyTheme.surfaceElevated,
                          borderColor: cat.color || CozyTheme.textPrimary,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => {
                        triggerLightHaptic();
                        setSelectedCategoryId(cat.id);
                      }}
                    >
                      <View
                        style={[
                          styles.catCircle,
                          { backgroundColor: cat.color || CozyTheme.textSecondary },
                        ]}
                      />
                      <Text style={styles.categoryPillText}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Note Input */}
          <View style={styles.noteContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add note or merchant name (optional)..."
              placeholderTextColor={CozyTheme.textTertiary}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Tactile Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['.', '0', 'back'],
            ].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keypadRow}>
                {row.map(key => (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadButton}
                    onPress={() => handleKeypadPress(key)}
                    activeOpacity={0.5}
                  >
                    {key === 'back' ? (
                      <Delete size={22} color={CozyTheme.textPrimary} />
                    ) : (
                      <Text style={styles.keypadButtonText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Record Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              mode === 'expense'
                ? styles.saveButtonExpense
                : mode === 'income'
                ? styles.saveButtonIncome
                : styles.saveButtonTransfer,
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Check size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>
              Record {mode === 'expense' ? 'Expense' : mode === 'income' ? 'Income' : 'Transfer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: CozyTheme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: CozyTheme.border,
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surfaceMuted,
    borderRadius: 14,
    padding: 3,
  },
  modeTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  modeTabExpense: {
    backgroundColor: CozyTheme.expense,
  },
  modeTabIncome: {
    backgroundColor: CozyTheme.income,
  },
  modeTabTransfer: {
    backgroundColor: CozyTheme.transfer,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    letterSpacing: 0.3,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CozyTheme.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 12,
  },
  currencyPill: {
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  currencyPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  amountNumberText: {
    fontSize: 42,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -1,
  },
  currencyScroll: {
    maxHeight: 40,
    marginBottom: 10,
  },
  currencyScrollContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  currencyChoicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceMuted,
  },
  currencyChoicePillActive: {
    backgroundColor: CozyTheme.textPrimary,
  },
  currencyChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  currencyChoiceTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    marginTop: 4,
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  sourceScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 7,
  },
  sourcePillActive: {
    borderColor: CozyTheme.textPrimary,
    borderWidth: 1.5,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  categoryScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 7,
  },
  catCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  noteContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  noteInput: {
    backgroundColor: CozyTheme.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: CozyTheme.textPrimary,
  },
  keypad: {
    marginTop: 8,
    marginBottom: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  keypadButton: {
    flex: 1,
    height: 48,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: CozyTheme.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonExpense: {
    backgroundColor: CozyTheme.expense,
  },
  saveButtonIncome: {
    backgroundColor: CozyTheme.income,
  },
  saveButtonTransfer: {
    backgroundColor: CozyTheme.transfer,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
