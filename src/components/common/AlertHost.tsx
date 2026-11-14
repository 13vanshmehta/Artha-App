import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useAlert, ActiveAlert } from '../../context/AlertContext';
import { AppIcon, AppIconName } from '../icons/AppIcon';

export const AlertHost: React.FC = () => {
  const { activeAlert, dismiss } = useAlert();

  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ActiveAlert | null>(null);
  const [loading, setLoading] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.88)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeAlert) {
      setCurrent(activeAlert);
      setVisible(true);
      setLoading(false);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardScaleAnim, {
          toValue: 0.9,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setCurrent(null);
        setLoading(false);
      });
    }
  }, [activeAlert, visible, backdropAnim, cardScaleAnim, cardOpacityAnim]);

  if (!visible || !current) {
    return null;
  }

  const isDanger = current.type === 'danger' || current.isDestructive;
  const isWarning = current.type === 'warning';
  const isSuccess = current.type === 'success';

  // Resolve icon
  const iconName: AppIconName =
    current.icon || (isDanger ? 'Trash2' : isWarning ? 'CircleAlert' : isSuccess ? 'Check' : 'Bell');
  let iconColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : isSuccess ? '#10B981' : '#F59E0B';
  if (current.icon && !isDanger && !isWarning && !isSuccess) {
    iconColor = '#0F172A';
  }

  const handleConfirm = async () => {
    if (loading) return;
    try {
      if (current.onConfirm) {
        const res = current.onConfirm();
        if (res && typeof (res as Promise<void>).then === 'function') {
          setLoading(true);
          await res;
        }
      }
    } finally {
      dismiss();
    }
  };

  const handleCancel = () => {
    if (loading) return;
    current.onCancel?.();
    dismiss();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Animated backdrop (dimmed frosted tone so background text cannot clash with alert) */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
          pointerEvents="auto"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={current.dismissOnBackdropPress !== false ? handleCancel : undefined}
          />
        </Animated.View>

        {/* Liquid Glass Dialog Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacityAnim,
              transform: [{ scale: cardScaleAnim }],
            },
          ]}
          testID="in-app-alert-card"
        >
          {/* Glass Circular Icon Ring */}
          <View style={styles.iconRing}>
            <AppIcon
              name={iconName}
              size={32}
              color={iconColor}
              strokeWidth={2.4}
            />
            {iconName === 'Bell' && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>1</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} testID="in-app-alert-title">
            {current.title}
          </Text>

          {/* Message */}
          {Boolean(current.message) && (
            <Text style={styles.message} testID="in-app-alert-message">
              {current.message}
            </Text>
          )}

          {/* Action Buttons: Liquid Glass Capsules */}
          <View style={styles.actionsRow}>
            {/* Cancel Button */}
            {Boolean(current.cancelText) && (
              <TouchableOpacity
                style={styles.pillButton}
                activeOpacity={0.7}
                onPress={handleCancel}
                disabled={loading}
                testID="in-app-alert-cancel-btn"
              >
                <Text style={styles.cancelBtnText}>{current.cancelText}</Text>
              </TouchableOpacity>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.pillButton}
              activeOpacity={0.7}
              onPress={handleConfirm}
              disabled={loading}
              testID="in-app-alert-confirm-btn"
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={isDanger ? '#DC2626' : '#2563EB'}
                />
              ) : (
                <Text
                  style={[
                    styles.confirmBtnText,
                    isDanger && styles.confirmBtnTextDanger,
                    isWarning && styles.confirmBtnTextWarning,
                    isSuccess && styles.confirmBtnTextSuccess,
                  ]}
                >
                  {current.confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  card: {
    width: 310,
    maxWidth: '92%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 36,
    elevation: 20,
  },
  iconRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bellBadge: {
    position: 'absolute',
    top: 13,
    right: 14,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  pillButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: -0.2,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: -0.2,
  },
  confirmBtnTextDanger: {
    color: '#DC2626',
  },
  confirmBtnTextWarning: {
    color: '#D97706',
  },
  confirmBtnTextSuccess: {
    color: '#16A34A',
  },
});
