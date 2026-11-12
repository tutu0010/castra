import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { Fingerprint, ShieldCheck, Lock } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { authenticateBiometrics, checkBiometricSupport } from '../utils/biometrics';
import { getBiometricsEnabled } from '../db/database';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface BiometricGateProps {
  children: React.ReactNode;
}

export const BiometricGate: React.FC<BiometricGateProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [biometryType, setBiometryType] = useState<string>('Biometrics');
  const [hasChecked, setHasChecked] = useState<boolean>(false);

  const performAuth = useCallback(async () => {
    triggerLightHaptic();
    const success = await authenticateBiometrics('Unlock Castra Ledger');
    if (success) {
      triggerSuccessHaptic();
      setIsLocked(false);
    }
  }, []);

  const checkLockState = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsLocked(false);
      setHasChecked(true);
      return;
    }

    const enabled = getBiometricsEnabled();
    if (!enabled) {
      setIsLocked(false);
      setHasChecked(true);
      return;
    }

    const support = await checkBiometricSupport();
    if (support.supported && support.enrolled) {
      setBiometryType(support.biometryType);
      setIsLocked(true);
      setHasChecked(true);
      const success = await authenticateBiometrics('Unlock Castra Ledger');
      if (success) {
        setIsLocked(false);
      }
    } else {
      setIsLocked(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    checkLockState();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const enabled = getBiometricsEnabled();
        if (enabled && Platform.OS !== 'web') {
          setIsLocked(true);
          authenticateBiometrics('Unlock Castra Ledger').then((success) => {
            if (success) {
              setIsLocked(false);
            }
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkLockState]);

  if (!hasChecked) {
    return <View style={styles.gateBackground} />;
  }

  if (isLocked) {
    return (
      <View style={styles.gateBackground}>
        <View style={styles.lockContainer}>
          <View style={styles.iconCircle}>
            <Lock size={36} color={CozyTheme.textPrimary} />
          </View>
          <Text style={styles.appTitle}>Castra</Text>
          <Text style={styles.lockSubtitle}>
            100% Private Offline Ledger
          </Text>

          <TouchableOpacity
            style={styles.unlockButton}
            onPress={performAuth}
            activeOpacity={0.8}
          >
            <Fingerprint size={22} color={CozyTheme.textInverse} />
            <Text style={styles.unlockButtonText}>
              Unlock with {biometryType}
            </Text>
          </TouchableOpacity>

          <View style={styles.securityBadge}>
            <ShieldCheck size={14} color={CozyTheme.income} />
            <Text style={styles.securityBadgeText}>Encrypted on Device</Text>
          </View>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  gateBackground: {
    flex: 1,
    backgroundColor: CozyTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 380,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: CozyTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: CozyTheme.textPrimary,
    letterSpacing: -0.5,
  },
  lockSubtitle: {
    fontSize: 14,
    color: CozyTheme.textSecondary,
    marginTop: 6,
    marginBottom: 36,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 18,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  unlockButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: CozyTheme.textInverse,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  securityBadgeText: {
    fontSize: 12,
    color: CozyTheme.textTertiary,
    fontWeight: '600',
  },
});
