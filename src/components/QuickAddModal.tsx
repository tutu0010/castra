import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, Delete, Check } from 'lucide-react-native';
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
  onOpenAddEntity: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  accounts,
  cards,
  categories,
  baseCurrency,
  onSave,
  onOpenAddEntity,
}) => {
  const [mode, setMode] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(baseCurrency || 'INR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<boolean>(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSelectedCurrency(baseCurrency || 'INR');
      setSelectedSourceId(cards[0]?.id || accounts[0]?.id || '');
      setSelectedToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setSelectedCategoryId(categories[0]?.id || '');
      setAmountStr('0');
      setNote('');
    }
  }, [visible, baseCurrency, cards, accounts, categories]);

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

    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      const parts = amountStr.split('.');
      if (parts.length > 1 && parts[1].length >= 2) return;
      if (amountStr.length < 9) {
        setAmountStr(amountStr + val);
      }
    }
  };

  const handleSave = () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) return;

    triggerSuccessHaptic();
    const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency] || { decimals: 2 };
    const decimals = currencyInfo.decimals ?? 2;
    const amount_cents = decimals === 0 ? Math.round(numericAmount) : Math.round(numericAmount * 100);

    const isCard = cards.some(c => c.id === selectedSourceId);
    const isTargetCard = cards.some(c => c.id === selectedToAccountId);
    const targetCard = cards.find(c => c.id === selectedToAccountId);

    onSave({
      amount_cents,
      currency: selectedCurrency,
      type: mode,
      card_id: mode === 'transfer' ? (isTargetCard ? selectedToAccountId : null) : (isCard ? selectedSourceId : null),
      account_id: isCard ? null : selectedSourceId,
      to_account_id: mode === 'transfer' ? selectedToAccountId : null,
      category_id: mode === 'transfer' ? null : selectedCategoryId,
      note: note.trim() || (isTargetCard && targetCard ? `Payment to ${targetCard.name}` : undefined),
      date: new Date().toISOString(),
    });

    setAmountStr('0');
    setNote('');
    onClose();
  };

  const filteredCategories = categories.filter(c => c.type === (mode === 'income' ? 'income' : 'expense'));
  const hasSources = cards.length > 0 || accounts.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
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
              <X size={18} color={CozyTheme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
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

          {/* Source Account / Card */}
          <Text style={styles.fieldSectionLabel}>
            {mode === 'transfer' ? 'From Source' : 'Paid With'}
          </Text>

          {!hasSources ? (
            <TouchableOpacity
              style={styles.noSourceButton}
              onPress={() => {
                onClose();
                onOpenAddEntity();
              }}
            >
              <Text style={styles.noSourceText}>+ Tap to create an Account or Card first</Text>
            </TouchableOpacity>
          ) : (
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
                      isSelected && { borderColor: CozyTheme.textPrimary, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedSourceId(c.id);
                    }}
                  >
                    <View style={[styles.sourceDot, { backgroundColor: c.color || '#1C222B' }]} />
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
                      isSelected && { borderColor: CozyTheme.textPrimary, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedSourceId(a.id);
                    }}
                  >
                    <View style={[styles.sourceDot, { backgroundColor: a.color || '#151311' }]} />
                    <Text style={styles.sourcePillText}>{a.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Destination Account / Card (Transfer Mode) */}
          {mode === 'transfer' ? (
            <View>
              <Text style={styles.fieldSectionLabel}>Transfer To (Bank, Card, or Wallet)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceScrollContent}
              >
                {/* Credit Cards (Pay Credit Card Bill) */}
                {cards
                  .filter(c => c.type === 'credit' && c.id !== selectedSourceId)
                  .map(c => {
                    const isSelected = selectedToAccountId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.sourcePill,
                          isSelected && { borderColor: CozyTheme.income, borderWidth: 1.5, backgroundColor: CozyTheme.surfaceElevated },
                        ]}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedToAccountId(c.id);
                        }}
                      >
                        <View style={[styles.sourceDot, { backgroundColor: c.color || '#1C222B' }]} />
                        <Text style={[styles.sourcePillText, isSelected && { color: CozyTheme.income }]}>
                          {c.name} (Credit Card)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                {/* Other Bank Accounts and Wallets */}
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
              placeholder="Note / Description (Optional)..."
              placeholderTextColor={CozyTheme.textTertiary}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Keypad */}
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
                    activeOpacity={0.6}
                  >
                    {key === 'back' ? (
                      <Delete size={20} color={CozyTheme.textPrimary} />
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
            <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>
              Save {mode === 'expense' ? 'Expense' : mode === 'income' ? 'Income' : 'Transfer'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 12,
    padding: 3,
  },
  modeTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
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
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    gap: 10,
  },
  currencyPill: {
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  currencyPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
  },
  amountNumberText: {
    fontSize: 38,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -1,
  },
  currencyScroll: {
    maxHeight: 38,
    marginBottom: 8,
  },
  currencyScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  currencyChoicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: CozyTheme.surfaceElevated,
  },
  currencyChoicePillActive: {
    backgroundColor: CozyTheme.textPrimary,
  },
  currencyChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  currencyChoiceTextActive: {
    color: CozyTheme.textInverse,
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
  },
  noSourceButton: {
    backgroundColor: CozyTheme.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: CozyTheme.borderStrong,
  },
  noSourceText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.income,
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
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 6,
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
    fontWeight: '700',
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
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 6,
  },
  catCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  noteContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  noteInput: {
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: CozyTheme.textPrimary,
  },
  keypad: {
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keypadButton: {
    flex: 1,
    height: 58,
    marginHorizontal: 5,
    borderRadius: 16,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  saveButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
