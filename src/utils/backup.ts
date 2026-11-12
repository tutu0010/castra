import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { exportDatabaseJSON, exportTransactionsCSV, importDatabaseJSON } from '../db/database';

export async function exportCSVFile(): Promise<boolean> {
  try {
    const csvData = exportTransactionsCSV();
    const fileName = `castra_export_${new Date().toISOString().slice(0, 10)}.csv`;
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

export async function exportJSONBackup(): Promise<boolean> {
  try {
    const jsonData = exportDatabaseJSON();
    const fileName = `castra_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(Paths.cache, fileName);

    await file.write(jsonData);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Castra Database Backup (JSON)',
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

export async function pickAndRestoreJSONBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'Selection cancelled' };
    }

    const pickedFile = result.assets[0];
    const file = new File(pickedFile.uri);
    const text = await file.text();

    const success = importDatabaseJSON(text);
    if (success) {
      return { success: true, message: 'Backup restored successfully!' };
    } else {
      return { success: false, message: 'Invalid Castra backup file format.' };
    }
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    return { success: false, message: error?.message || 'Restore failed' };
  }
}
