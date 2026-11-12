import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  FileSpreadsheet,
  DownloadCloud,
  UploadCloud,
  Coins,
  Shield,
  CheckCircle2,
  Fingerprint,
  Lock,
  KeyRound,
} from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { exportCSVFile, exportJSONBackup, pickAndRestoreJSONBackup } from '../utils/backup';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { getBiometricsEnabled, setBiometricsEnabled } from '../db/database';
import { checkBiometricSupport, authenticateBiometrics } from '../utils/biometrics';

interface SettingsBackupModalProps {
  visible: boolean;
  onClose: () => void;
  baseCurrency: string;
  onBaseCurrencyChange: (currency: string) => void;
  onDataReload: () => void;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  visible,
  onClose,
  baseCurrency,
  onBaseCurrencyChange,
  onDataReload,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [biometricsActive, setBiometricsActive] = useState<boolean>(false);
  const [biometryType, setBiometryType] = useState<string>('Biometrics');
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);
  const [passphraseModalVisible, setPassphraseModalVisible] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState<'export' | 'import'>('export');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [resolver, setResolver] = useState<{ resolve: (pass: string | null) => void } | null>(null);

  useEffect(() => {
    if (visible) {
      const enabled = getBiometricsEnabled();
      setBiometricsActive(enabled);

      if (Platform.OS !== 'web') {
        checkBiometricSupport().then((support) => {
          setBiometricsAvailable(support.supported && support.enrolled);
          if (support.biometryType) {
            setBiometryType(support.biometryType);
          }
        });
      }
    }
  }, [visible]);

  const handleToggleBiometrics = async (value: boolean) => {
    triggerLightHaptic();
    if (value) {
      // Prompt user to verify before enabling
      const success = await authenticateBiometrics(`Enable ${biometryType} lock`);
      if (success) {
        setBiometricsEnabled(true);
        setBiometricsActive(true);
        triggerSuccessHaptic();
        setStatusMessage(`${biometryType} lock enabled!`);
      } else {
        setStatusMessage('Authentication cancelled');
      }
    } else {
      setBiometricsEnabled(false);
      setBiometricsActive(false);
      setStatusMessage('Biometric lock disabled');
    }
  };

  const handleExportCSV = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Exporting CSV...');
    const ok = await exportCSVFile();
    setLoading(false);
    setStatusMessage(ok ? 'CSV Exported successfully!' : 'Export cancelled or failed');
    if (ok) triggerSuccessHaptic();
  };

  const handleExportJSON = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Exporting Backup...');
    const ok = await exportJSONBackup();
    setLoading(false);
    setStatusMessage(ok ? 'Backup Exported successfully!' : 'Export cancelled or failed');
    if (ok) triggerSuccessHaptic();
  };

  const handleExportEncryptedJSON = () => {
    triggerLightHaptic();
    setPassphraseMode('export');
    setPassphraseInput('');
    setPassphraseModalVisible(true);
  };

  const handleConfirmPassphrase = async () => {
    if (!passphraseInput || passphraseInput.length < 4) {
      setStatusMessage('Passphrase must be at least 4 characters');
      return;
    }
    setPassphraseModalVisible(false);

    if (passphraseMode === 'export') {
      setLoading(true);
      setStatusMessage('Encrypting with AES-256-GCM...');
      const ok = await exportJSONBackup(passphraseInput);
      setLoading(false);
      setStatusMessage(ok ? 'Encrypted Backup exported!' : 'Export cancelled or failed');
      if (ok) triggerSuccessHaptic();
    } else if (resolver) {
      resolver.resolve(passphraseInput);
      setResolver(null);
    }
  };

  const handleCancelPassphrase = () => {
    setPassphraseModalVisible(false);
    if (resolver) {
      resolver.resolve(null);
      setResolver(null);
    }
  };

  const handleImportJSON = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Restoring backup...');

    const promptPassphrase = () => {
      return new Promise<string | null>((resolve) => {
        setPassphraseMode('import');
        setPassphraseInput('');
        setResolver({ resolve });
        setPassphraseModalVisible(true);
      });
    };

    const res = await pickAndRestoreJSONBackup(promptPassphrase);
    setLoading(false);
    setStatusMessage(res.message);
    if (res.success) {
      triggerSuccessHaptic();
      onDataReload();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings & Data</Text>
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
          {statusMessage && (
            <View style={styles.statusBanner}>
              <CheckCircle2 size={16} color={CozyTheme.income} />
              <Text style={styles.statusBannerText}>{statusMessage}</Text>
            </View>
          )}

          {/* Base Currency Selection */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Coins size={16} color={CozyTheme.textPrimary} />
              <Text style={styles.cardTitle}>Default Base Currency</Text>
            </View>
            <Text style={styles.cardSub}>Current: {baseCurrency}</Text>

            <View style={styles.currencyGrid}>
              {Object.values(SUPPORTED_CURRENCIES).map(curr => {
                const isSelected = baseCurrency === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.currencyPill,
                      isSelected && styles.currencyPillSelected,
                    ]}
                    onPress={() => {
                      triggerLightHaptic();
                      onBaseCurrencyChange(curr.code);
                    }}
                  >
                    <Text
                      style={[
                        styles.currCode,
                        isSelected && styles.currCodeSelected,
                      ]}
                    >
                      {curr.symbol} {curr.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Biometrics App Lock */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Fingerprint size={16} color={CozyTheme.textPrimary} />
              <Text style={styles.cardTitle}>App Security</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>{biometryType} Lock</Text>
                <Text style={styles.toggleSubtitle}>
                  Require {biometryType} authentication when opening app
                </Text>
              </View>
              <Switch
                value={biometricsActive}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: CozyTheme.surfaceElevated, true: CozyTheme.income }}
                thumbColor="#FFFFFF"
                disabled={Platform.OS === 'web' || !biometricsAvailable}
              />
            </View>
            {Platform.OS === 'web' ? (
              <Text style={styles.unavailableWarning}>
                Biometric security requires native iOS or Android hardware.
              </Text>
            ) : !biometricsAvailable ? (
              <Text style={styles.unavailableWarning}>
                Biometrics not supported or not enrolled on this device.
              </Text>
            ) : null}
          </View>

          {/* Export & Sharing */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <DownloadCloud size={16} color={CozyTheme.textPrimary} />
              <Text style={styles.cardTitle}>Export Data</Text>
            </View>

            <TouchableOpacity
              style={styles.rowButton}
              onPress={handleExportCSV}
              disabled={loading}
              activeOpacity={0.7}
            >
              <FileSpreadsheet size={18} color={CozyTheme.income} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowButtonTitle}>Export CSV</Text>
                <Text style={styles.rowButtonSub}>Spreadsheet for Excel & Sheets</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rowButton, { marginTop: 8 }]}
              onPress={handleExportJSON}
              disabled={loading}
              activeOpacity={0.7}
            >
              <DownloadCloud size={18} color={CozyTheme.transfer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowButtonTitle}>Standard JSON Backup</Text>
                <Text style={styles.rowButtonSub}>Unencrypted database snapshot</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rowButton, { marginTop: 8 }]}
              onPress={handleExportEncryptedJSON}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Lock size={18} color={CozyTheme.income} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowButtonTitle}>Encrypted Backup (AES-256)</Text>
                <Text style={styles.rowButtonSub}>Password-protected with PBKDF2</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Import */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <UploadCloud size={16} color={CozyTheme.textPrimary} />
              <Text style={styles.cardTitle}>Restore</Text>
            </View>

            <TouchableOpacity
              style={styles.rowButton}
              onPress={handleImportJSON}
              disabled={loading}
              activeOpacity={0.7}
            >
              <UploadCloud size={18} color={CozyTheme.expense} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowButtonTitle, { color: CozyTheme.expense }]}>
                  Restore from Backup File
                </Text>
                <Text style={styles.rowButtonSub}>Auto-detects plaintext or encrypted (.castra) files</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyCard}>
            <Shield size={18} color={CozyTheme.income} />
            <Text style={styles.privacyText}>
              Castra is 100% offline & local-first. Your financial data is stored locally on this device in SQLite.
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Passphrase Entry Modal */}
      <Modal visible={passphraseModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.passphraseOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.passphraseCard}>
            <View style={styles.passphraseHeader}>
              <KeyRound size={20} color={CozyTheme.textPrimary} />
              <Text style={styles.passphraseTitle}>
                {passphraseMode === 'export' ? 'Set Backup Password' : 'Enter Backup Password'}
              </Text>
            </View>
            <Text style={styles.passphraseSub}>
              {passphraseMode === 'export'
                ? 'Choose a passphrase to encrypt your financial snapshot with AES-GCM 256-bit.'
                : 'This backup is encrypted. Enter the passphrase to decrypt and restore your ledger.'}
            </Text>

            <TextInput
              style={styles.passphraseInput}
              placeholder="Enter passphrase (min 4 chars)"
              placeholderTextColor={CozyTheme.textTertiary}
              secureTextEntry
              value={passphraseInput}
              onChangeText={setPassphraseInput}
              autoFocus
            />

            <View style={styles.passphraseActions}>
              <TouchableOpacity style={styles.passphraseCancelBtn} onPress={handleCancelPassphrase}>
                <Text style={styles.passphraseCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.passphraseConfirmBtn} onPress={handleConfirmPassphrase}>
                <Text style={styles.passphraseConfirmText}>
                  {passphraseMode === 'export' ? 'Encrypt & Export' : 'Unlock & Restore'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CozyTheme.background,
    paddingTop: 16,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.4,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.incomeSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.income,
  },
  cardSection: {
    backgroundColor: CozyTheme.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginBottom: 12,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  currencyPillSelected: {
    backgroundColor: CozyTheme.textPrimary,
    borderColor: CozyTheme.textPrimary,
  },
  currCode: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  currCodeSelected: {
    color: CozyTheme.textInverse,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  rowButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  rowButtonSub: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  unavailableWarning: {
    fontSize: 11,
    color: CozyTheme.expense,
    marginTop: 8,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 30,
    marginTop: 6,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: CozyTheme.textSecondary,
    lineHeight: 16,
  },
  passphraseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  passphraseCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CozyTheme.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  passphraseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  passphraseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  passphraseSub: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  passphraseInput: {
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: CozyTheme.textPrimary,
    fontSize: 14,
    marginBottom: 16,
  },
  passphraseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  passphraseCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  passphraseCancelText: {
    color: CozyTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  passphraseConfirmBtn: {
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  passphraseConfirmText: {
    color: CozyTheme.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
