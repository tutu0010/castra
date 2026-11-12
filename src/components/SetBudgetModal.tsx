import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { X, Check, Trash2, PiggyBank, Target } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Category } from '../types';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface SetBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  baseCurrency: string;
  onSaveBudget: (categoryId: string, monthlyBudgetCents: number | null) => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  visible,
  onClose,
  categories,
  baseCurrency,
  onSaveBudget,
}) => {
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(
    expenseCategories[0]?.id || null
  );
  const [budgetInput, setBudgetInput] = useState<string>('');

  const selectedCat = expenseCategories.find((c) => c.id === selectedCatId);

  const handleSelectCategory = (cat: Category) => {
    triggerLightHaptic();
    setSelectedCatId(cat.id);
    if (cat.monthly_budget_cents && cat.monthly_budget_cents > 0) {
      setBudgetInput((cat.monthly_budget_cents / 100).toString());
    } else {
      setBudgetInput('');
    }
  };

  const handleSave = () => {
    if (!selectedCatId) return;
    triggerSuccessHaptic();
    const val = parseFloat(budgetInput.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      onSaveBudget(selectedCatId, null);
    } else {
      onSaveBudget(selectedCatId, Math.round(val * 100));
    }
    setBudgetInput('');
  };

  const handleClearBudget = () => {
    if (!selectedCatId) return;
    triggerLightHaptic();
    onSaveBudget(selectedCatId, null);
    setBudgetInput('');
  };

  const PRESETS = [2000, 5000, 10000, 20000, 50000];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Target size={20} color={CozyTheme.textPrimary} />
            <Text style={styles.headerTitle}>Monthly Category Budgets</Text>
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
          {/* Category Picker Chips */}
          <Text style={styles.sectionLabel}>Select Category to Set Limit</Text>
          <View style={styles.catGrid}>
            {expenseCategories.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              const hasBudget = cat.monthly_budget_cents && cat.monthly_budget_cents > 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    isSelected && styles.catCardSelected,
                  ]}
                  onPress={() => handleSelectCategory(cat)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catColorDot, { backgroundColor: cat.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.catCardName,
                        isSelected && styles.catCardNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <Text style={styles.catCardBudget}>
                      {hasBudget
                        ? formatMoney(cat.monthly_budget_cents!, baseCurrency)
                        : 'No cap'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Budget Config Card */}
          {selectedCat && (
            <View style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <View style={[styles.activeDot, { backgroundColor: selectedCat.color }]} />
                <Text style={styles.editCardTitle}>
                  {selectedCat.name} Monthly Cap
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.budgetTextInput}
                  placeholder="0"
                  placeholderTextColor={CozyTheme.textTertiary}
                  keyboardType="numeric"
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  autoFocus={false}
                />
                <Text style={styles.perMonthText}>/ month</Text>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsRow}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.presetButton}
                    onPress={() => {
                      triggerLightHaptic();
                      setBudgetInput(p.toString());
                    }}
                  >
                    <Text style={styles.presetButtonText}>₹{p.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                {selectedCat.monthly_budget_cents ? (
                  <TouchableOpacity
                    style={styles.removeBudgetBtn}
                    onPress={handleClearBudget}
                  >
                    <Trash2 size={16} color={CozyTheme.expense} />
                    <Text style={styles.removeBudgetText}>Remove Limit</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.saveBudgetBtn}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Check size={16} color={CozyTheme.textInverse} />
                  <Text style={styles.saveBudgetText}>Save Budget</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.tipBox}>
            <PiggyBank size={18} color={CozyTheme.income} />
            <Text style={styles.tipText}>
              Setting monthly caps dynamically calculates your "Safe-to-Spend" daily pace so you never run out before month-end.
            </Text>
          </View>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 8,
  },
  catCardSelected: {
    backgroundColor: CozyTheme.surfaceElevated,
    borderColor: CozyTheme.textPrimary,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  catCardNameSelected: {
    color: CozyTheme.textPrimary,
  },
  catCardBudget: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    marginTop: 2,
  },
  editCard: {
    backgroundColor: CozyTheme.surface,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 16,
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  editCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 12,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    marginRight: 6,
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    padding: 0,
  },
  perMonthText: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  presetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  removeBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: CozyTheme.expenseSoft,
    gap: 6,
  },
  removeBudgetText: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.expense,
  },
  saveBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
  },
  saveBudgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 30,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: CozyTheme.textSecondary,
    lineHeight: 16,
  },
});
