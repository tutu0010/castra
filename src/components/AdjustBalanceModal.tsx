import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X, Check, Delete } from 'lucide-react-native';
import { Account, Card } from '../types';
import { CozyTheme } from '../theme/colors';
import { formatMoney } from '../utils/currency';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface AdjustBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  entity: Account | Card | null;
  onSaveBalance: (newBalanceCents: number) => void;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  visible,
  onClose,
  entity,
  onSaveBalance,
}) => {
  if (!entity) return null;

  const currentCents = 'balance_cents' in entity ? entity.balance_cents : (entity.outstanding_balance_cents || 0);
  const [amountStr, setAmountStr] = useState<string>((currentCents / 100).toFixed(0));

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
    const num = parseFloat(amountStr) || 0;
    triggerSuccessHaptic();
    onSaveBalance(Math.round(num * 100));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Adjust Balance</Text>
              <Text style={styles.headerSubtitle}>{entity.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={18} color={CozyTheme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current vs New comparison */}
          <View style={styles.currentBalanceRow}>
            <Text style={styles.currentLabel}>Current Balance:</Text>
            <Text style={styles.currentValue}>{formatMoney(currentCents, entity.currency)}</Text>
          </View>

          {/* New Balance Display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <Text style={styles.amountText} numberOfLines={1}>
              {amountStr}
            </Text>
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

          {/* Confirm Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Check size={18} color={CozyTheme.textInverse} style={{ marginRight: 6 }} />
            <Text style={styles.saveButtonText}>Update Balance</Text>
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: CozyTheme.border,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 36,
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
  headerSubtitle: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CozyTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  currentLabel: {
    fontSize: 13,
    color: CozyTheme.textSecondary,
    fontWeight: '500',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '800',
    color: CozyTheme.textSecondary,
  },
  amountText: {
    fontSize: 44,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -1,
  },
  keypad: {
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  keypadButton: {
    flex: 1,
    height: 60,
    marginHorizontal: 6,
    borderRadius: 18,
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
    backgroundColor: CozyTheme.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
});
