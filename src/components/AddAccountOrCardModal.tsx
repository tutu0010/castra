import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface AddAccountOrCardModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  baseCurrency: string;
  onSaveAccount: (account: Omit<Account, 'created_at'>) => void;
  onSaveCard: (card: Omit<Card, 'created_at'>) => void;
}

type TabType = 'credit' | 'debit' | 'bank' | 'wallet';

export const AddAccountOrCardModal: React.FC<AddAccountOrCardModalProps> = ({
  visible,
  onClose,
  accounts,
  baseCurrency,
  onSaveAccount,
  onSaveCard,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('credit');
  const [name, setName] = useState<string>('');
  const [currency, setCurrency] = useState<string>(baseCurrency);
  const [balanceStr, setBalanceStr] = useState<string>('0');
  const [limitStr, setLimitStr] = useState<string>('5000');
  const [statementDayStr, setStatementDayStr] = useState<string>('20');
  const [dueDayStr, setDueDayStr] = useState<string>('10');
  const [last4, setLast4] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>(accounts[0]?.id || '');
  const [selectedColor, setSelectedColor] = useState<string>(CozyTheme.cardColors[0].hex);

  const handleSave = () => {
    if (!name.trim()) return;

    triggerSuccessHaptic();
    const id = `item_${Date.now()}`;

    if (activeTab === 'bank' || activeTab === 'wallet') {
      const balanceNum = parseFloat(balanceStr) || 0;
      const balance_cents = Math.round(balanceNum * 100);

      onSaveAccount({
        id,
        name: name.trim(),
        type: activeTab,
        balance_cents,
        currency,
        color: selectedColor,
        icon: activeTab === 'bank' ? 'landmark' : 'wallet',
      });
    } else if (activeTab === 'credit') {
      const limitNum = parseFloat(limitStr) || 0;
      const credit_limit_cents = Math.round(limitNum * 100);
      const statement_day = parseInt(statementDayStr, 10) || null;
      const due_day = parseInt(dueDayStr, 10) || null;

      onSaveCard({
        id,
        name: name.trim(),
        type: 'credit',
        currency,
        color: selectedColor,
        last4: last4.trim() || undefined,
        credit_limit_cents,
        statement_day,
        due_day,
      });
    } else if (activeTab === 'debit') {
      onSaveCard({
        id,
        name: name.trim(),
        type: 'debit',
        bank_account_id: selectedBankId || null,
        currency,
        color: selectedColor,
        last4: last4.trim() || undefined,
      });
    }

    // Reset
    setName('');
    setLast4('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New Entity</Text>
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={CozyTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Type Selector Tabs */}
          <View style={styles.tabsRow}>
            {(['credit', 'debit', 'bank', 'wallet'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => {
                  triggerLightHaptic();
                  setActiveTab(tab);
                }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'credit'
                    ? 'Credit Card'
                    : tab === 'debit'
                    ? 'Debit Card'
                    : tab === 'bank'
                    ? 'Bank'
                    : 'Wallet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <Text style={styles.inputLabel}>Name / Nickname</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                activeTab === 'credit'
                  ? 'e.g. Amex Gold, Sapphire'
                  : activeTab === 'debit'
                  ? 'e.g. Everyday Debit'
                  : activeTab === 'bank'
                  ? 'e.g. Chase Premier Checking'
                  : 'e.g. Cash Pocket, PayPal'
              }
              placeholderTextColor={CozyTheme.textTertiary}
              value={name}
              onChangeText={setName}
            />

            {/* Currency Selector */}
            <Text style={styles.inputLabel}>Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {Object.keys(SUPPORTED_CURRENCIES).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.smallPill, currency === c && styles.smallPillActive]}
                  onPress={() => {
                    triggerLightHaptic();
                    setCurrency(c);
                  }}
                >
                  <Text style={[styles.smallPillText, currency === c && styles.smallPillTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Specific fields for Bank / Wallet */}
            {(activeTab === 'bank' || activeTab === 'wallet') && (
              <View>
                <Text style={styles.inputLabel}>Starting Balance</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={CozyTheme.textTertiary}
                  value={balanceStr}
                  onChangeText={setBalanceStr}
                />
              </View>
            )}

            {/* Specific fields for Debit Card */}
            {activeTab === 'debit' && (
              <View>
                <Text style={styles.inputLabel}>Linked Bank Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                  {accounts
                    .filter(a => a.type === 'bank')
                    .map(a => (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.smallPill,
                          selectedBankId === a.id && styles.smallPillActive,
                        ]}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedBankId(a.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            selectedBankId === a.id && styles.smallPillTextActive,
                          ]}
                        >
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            {/* Specific fields for Credit Card */}
            {activeTab === 'credit' && (
              <View>
                <Text style={styles.inputLabel}>Credit Limit</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="5000"
                  placeholderTextColor={CozyTheme.textTertiary}
                  value={limitStr}
                  onChangeText={setLimitStr}
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Statement Day</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="e.g. 20"
                      placeholderTextColor={CozyTheme.textTertiary}
                      value={statementDayStr}
                      onChangeText={setStatementDayStr}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Payment Due Day</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="e.g. 10"
                      placeholderTextColor={CozyTheme.textTertiary}
                      value={dueDayStr}
                      onChangeText={setDueDayStr}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Last 4 Digits for Cards */}
            {(activeTab === 'credit' || activeTab === 'debit') && (
              <View>
                <Text style={styles.inputLabel}>Card Last 4 Digits (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="e.g. 4821"
                  placeholderTextColor={CozyTheme.textTertiary}
                  value={last4}
                  onChangeText={setLast4}
                />
              </View>
            )}

            {/* Color Palette Selector */}
            <Text style={styles.inputLabel}>Card & Badge Theme Color</Text>
            <View style={styles.colorPaletteRow}>
              {CozyTheme.cardColors.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.hex },
                    selectedColor === c.hex && styles.colorCircleSelected,
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedColor(c.hex);
                  }}
                />
              ))}
            </View>
          </ScrollView>

          {/* Submit */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSave} activeOpacity={0.8}>
            <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitButtonText}>Create Entity</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 31, 29, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: CozyTheme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CozyTheme.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: CozyTheme.surfaceMuted,
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: CozyTheme.textPrimary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formScroll: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CozyTheme.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: CozyTheme.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: CozyTheme.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  pillRow: {
    marginBottom: 6,
  },
  smallPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceMuted,
    marginRight: 8,
  },
  smallPillActive: {
    backgroundColor: CozyTheme.textPrimary,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: CozyTheme.textPrimary,
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: CozyTheme.income,
    transform: [{ scale: 1.15 }],
  },
  submitButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 16,
    backgroundColor: CozyTheme.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
