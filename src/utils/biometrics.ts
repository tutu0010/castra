import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export async function checkBiometricSupport(): Promise<{
  supported: boolean;
  enrolled: boolean;
  biometryType: string;
}> {
  if (Platform.OS === 'web') {
    return { supported: false, enrolled: false, biometryType: 'None' };
  }

  try {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'FaceID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'Fingerprint';
    }

    return { supported, enrolled, biometryType };
  } catch (error) {
    console.error('Failed to check biometrics:', error);
    return { supported: false, enrolled: false, biometryType: 'None' };
  }
}

export async function authenticateBiometrics(promptMessage: string = 'Unlock Castra'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Enter Passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}
