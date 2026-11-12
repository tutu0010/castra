import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportDatabaseJSON, exportTransactionsCSV, importDatabaseJSON } from '../db/database';
import { encryptBackup, decryptBackup, isEncryptedBackup } from './crypto';

export async function exportCSVFile(): Promise<boolean> {
  try {
    const csvData = exportTransactionsCSV();
    const fileName = `castra_export_${new Date().toISOString().slice(0, 10)}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    const { File, Paths } = require('expo-file-system');
    const file = new File(Paths.cache, fileName);
    await file.write(csvData);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Castra Ledger (CSV)',
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return false;
  }
}

export async function exportJSONBackup(passphrase?: string): Promise<boolean> {
  try {
    let jsonData = exportDatabaseJSON();
    let fileName = `castra_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (passphrase && passphrase.trim().length > 0) {
      jsonData = await encryptBackup(jsonData, passphrase.trim());
      fileName = `castra_encrypted_backup_${new Date().toISOString().slice(0, 10)}.castra.json`;
    }

    if (Platform.OS === 'web') {
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    const { File, Paths } = require('expo-file-system');
    const file = new File(Paths.cache, fileName);
    await file.write(jsonData);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: passphrase
          ? 'Export Password-Protected Castra Backup (AES-GCM)'
          : 'Export Castra Database Backup (JSON)',
        UTI: 'public.json',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to export JSON:', error);
    return false;
  }
}

export async function pickAndRestoreJSONBackup(
  promptPassphrase?: () => Promise<string | null>
): Promise<{ success: boolean; message: string }> {
  try {
    let fileText = '';

    if (Platform.OS === 'web') {
      fileText = await new Promise<string>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            reject(new Error('No file selected'));
            return;
          }
          const text = await file.text();
          resolve(text);
        };
        input.click();
      });
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Selection cancelled' };
      }

      const pickedFile = result.assets[0];
      const { File } = require('expo-file-system');
      const file = new File(pickedFile.uri);
      fileText = await file.text();
    }

    // Check if the backup is encrypted
    let jsonToImport = fileText;
    try {
      const parsed = JSON.parse(fileText);
      if (isEncryptedBackup(parsed)) {
        if (!promptPassphrase) {
          return {
            success: false,
            message: 'Backup is encrypted. Passphrase input required.',
          };
        }
        const passphrase = await promptPassphrase();
        if (!passphrase) {
          return { success: false, message: 'Restore cancelled (Passphrase needed).' };
        }
        jsonToImport = await decryptBackup(fileText, passphrase);
      }
    } catch (err: any) {
      if (err?.message?.includes('Incorrect passphrase') || err?.message?.includes('corrupted')) {
        return { success: false, message: 'Incorrect passphrase or corrupted backup.' };
      }
    }

    const ok = importDatabaseJSON(jsonToImport);
    return ok
      ? { success: true, message: 'Backup restored successfully!' }
      : { success: false, message: 'Invalid or malformed Castra backup file.' };
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    return { success: false, message: error?.message || 'Restore failed' };
  }
}
