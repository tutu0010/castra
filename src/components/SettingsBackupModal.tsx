import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  FileSpreadsheet,
  DownloadCloud,
  UploadCloud,
  Coins,
  Shield,
  CheckCircle2,
} from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { exportCSVFile, exportJSONBackup, pickAndRestoreJSONBackup } from '../utils/backup';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

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

  const handleExportCSV = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Exporting CSV...');
    const ok = await exportCSVFile();
    setLoading(false);
    setStatusMessage(ok ? 'CSV Exported!' : 'Export cancelled or failed');
    if (ok) triggerSuccessHaptic();
  };

  const handleExportJSON = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Exporting Backup...');
    const ok = await exportJSONBackup();
    setLoading(false);
    setStatusMessage(ok ? 'Backup Exported!' : 'Export cancelled or failed');
    if (ok) triggerSuccessHaptic();
  };

  const handleImportJSON = async () => {
    triggerLightHaptic();
    setLoading(true);
    setStatusMessage('Restoring backup...');
    const res = await pickAndRestoreJSONBackup();
    setLoading(false);
    setStatusMessage(res.message);
    if (res.success) {
      triggerSuccessHaptic();
      onDataReload();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Preferences & Data</Text>
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

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Feedback Banner */}
            {statusMessage && (
              <View style={styles.statusBanner}>
                <CheckCircle2 size={16} color={CozyTheme.income} />
                <Text style={styles.statusBannerText}>{statusMessage}</Text>
              </View>
            )}

            {/* Base Currency Selection */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Coins size={18} color={CozyTheme.textPrimary} />
                <Text style={styles.sectionTitle}>Home Base Currency</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                All account totals and net worth are converted to this currency.
              </Text>

              <View style={styles.currencyGrid}>
                {Object.values(SUPPORTED_CURRENCIES).map(curr => {
                  const isSelected = baseCurrency === curr.code;
                  return (
                    <TouchableOpacity
                      key={curr.code}
                      style={[
                        styles.currencyItem,
                        isSelected && styles.currencyItemSelected,
                      ]}
                      onPress={() => {
                        triggerLightHaptic();
                        onBaseCurrencyChange(curr.code);
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyItemCode,
                          isSelected && styles.currencyItemCodeSelected,
                        ]}
                      >
                        {curr.symbol} {curr.code}
                      </Text>
                      <Text
                        style={[
                          styles.currencyItemName,
                          isSelected && styles.currencyItemNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {curr.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Data Export & Backup Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <DownloadCloud size={18} color={CozyTheme.textPrimary} />
                <Text style={styles.sectionTitle}>Export & Share</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Own your data. Export spreadsheet files or complete database snapshots anytime.
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleExportCSV}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <FileSpreadsheet size={18} color={CozyTheme.income} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionButtonTitle}>Export CSV Spreadsheet</Text>
                    <Text style={styles.actionButtonSub}>For Excel, Google Sheets, Numbers</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleExportJSON}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <DownloadCloud size={18} color={CozyTheme.transfer} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionButtonTitle}>Export Full JSON Backup</Text>
                    <Text style={styles.actionButtonSub}>Complete database snapshot</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Import & Restore Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <UploadCloud size={18} color={CozyTheme.textPrimary} />
                <Text style={styles.sectionTitle}>Import & Restore</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Migrating phones or restoring from a previous Castra backup?
              </Text>

              <TouchableOpacity
                style={[styles.actionButton, styles.restoreButton]}
                onPress={handleImportJSON}
                disabled={loading}
                activeOpacity={0.7}
              >
                <UploadCloud size={18} color={CozyTheme.expense} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionButtonTitle, { color: CozyTheme.expense }]}>
                    Restore From JSON Backup
                  </Text>
                  <Text style={styles.actionButtonSub}>Replaces current records with backup file</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Privacy & Local-First Guarantee */}
            <View style={styles.privacyCard}>
              <Shield size={20} color={CozyTheme.income} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.privacyTitle}>100% Private & Local-First</Text>
                <Text style={styles.privacyText}>
                  Castra has zero remote servers, zero trackers, and zero subscriptions.
                  Your financial data never leaves your device.
                </Text>
              </View>
            </View>
          </ScrollView>
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
    paddingBottom: 36,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.incomeSoft,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: CozyTheme.income,
  },
  sectionCard: {
    backgroundColor: CozyTheme.surfaceElevated,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: CozyTheme.borderLight,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: CozyTheme.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyItem: {
    width: '31%',
    backgroundColor: CozyTheme.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    alignItems: 'center',
  },
  currencyItemSelected: {
    backgroundColor: CozyTheme.textPrimary,
    borderColor: CozyTheme.textPrimary,
  },
  currencyItemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  currencyItemCodeSelected: {
    color: '#FFFFFF',
  },
  currencyItemName: {
    fontSize: 9,
    color: CozyTheme.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  currencyItemNameSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  actionRow: {
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    gap: 12,
  },
  restoreButton: {
    borderColor: CozyTheme.expenseSoft,
    backgroundColor: CozyTheme.expenseSoft,
  },
  actionButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
  actionButtonSub: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    marginTop: 1,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: CozyTheme.incomeSoft,
    padding: 14,
    borderRadius: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CozyTheme.income,
  },
  privacyText: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});
