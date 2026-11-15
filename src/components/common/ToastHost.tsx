import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import {
  ToastItem,
  ToastType,
  toastManager,
} from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ToastThemeVisuals {
  accentColor: string;
  iconName: IconName;
}

const TOAST_VISUALS: Record<ToastType, ToastThemeVisuals> = {
  success: {
    accentColor: '#22C55E',
    iconName: 'check',
  },
  info: {
    accentColor: '#0A66FF',
    iconName: 'info',
  },
  warning: {
    accentColor: '#EA8C00',
    iconName: 'warning',
  },
  error: {
    accentColor: '#EF4444',
    iconName: 'error',
  },
};

interface RenderedToastItem extends ToastItem {
  exiting?: boolean;
}

interface ToastCardProps {
  item: RenderedToastItem;
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
}

export const ToastCard: React.FC<ToastCardProps> = ({
  item,
  onDismiss,
  onExited,
}) => {
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const visuals = TOAST_VISUALS[item.type];
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    if (item.duration && item.duration > 0) {
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: item.duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [item.duration, progressAnim]);

  useEffect(() => {
    entranceAnim.setValue(0);

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((reduceMotion) => {
        reduceMotionRef.current = !!reduceMotion;
        if (reduceMotion) {
          entranceAnim.setValue(1);
        } else {
          Animated.timing(entranceAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {
        entranceAnim.setValue(1);
      });
  }, [entranceAnim, item.createdAt]);

  useEffect(() => {
    if (!item.exiting) {
      return;
    }
    if (reduceMotionRef.current) {
      onExited(item.id);
      return;
    }
    const animation = Animated.timing(entranceAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        onExited(item.id);
      }
    });
    return () => animation.stop();
  }, [item.exiting, entranceAnim, item.id, onExited]);

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: entranceAnim,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={`toast-card-${item.type}`}
    >
      <View style={styles.cardBody}>
        {/* Left circular status icon */}
        <View
          style={[
            styles.statusCircle,
            { backgroundColor: visuals.accentColor },
          ]}
          testID={`toast-icon-${item.type}`}
        >
          <Icon name={visuals.iconName} size={17} color="#FFFFFF" />
        </View>

        {/* Center text block */}
        <View style={styles.textColumn}>
          {item.title ? (
            <Text
              style={styles.titleText}
              numberOfLines={1}
              testID={`toast-title-${item.type}`}
            >
              {item.title}
            </Text>
          ) : null}
          {item.type !== 'error' && item.message ? (
            <Text
              style={styles.messageText}
              numberOfLines={3}
              testID={`toast-message-${item.type}`}
            >
              {item.message}
            </Text>
          ) : null}

          {/* Optional inline Toast Action button */}
          {item.action ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onDismiss(item.id);
                item.action?.onPress();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={item.action.label}
              testID={`toast-action-${item.id}`}
            >
              <Text style={styles.actionButtonText}>{item.action.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Right close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => onDismiss(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${item.title || item.type} notification`}
          testID={`toast-close-${item.id}`}
        >
          <Icon name="close" size={14} color={isDark ? 'rgba(255, 255, 255, 0.64)' : '#64748B'} />
        </TouchableOpacity>
      </View>

      {/* Bottom progress bar track */}
      <View style={styles.progressTrack} testID={`toast-progress-track-${item.id}`}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressWidth,
              backgroundColor: visuals.accentColor,
            },
          ]}
          testID={`toast-progress-fill-${item.id}`}
        />
      </View>
    </Animated.View>
  );
};

export const ToastHost: React.FC = () => {
  const styles = useThemedStyles(makeStyles);
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const [renderedToasts, setRenderedToasts] = useState<RenderedToastItem[]>(
    () => toastManager.getSnapshot().visible,
  );

  useEffect(() => {
    return toastManager.subscribe((snapshot) => {
      setRenderedToasts((prev) => {
        const nextMap = new Map(snapshot.visible.map((t) => [t.id, t]));
        const existingIds = new Set(prev.map((t) => t.id));
        const stillPresent = prev.map((t) => nextMap.get(t.id) ?? { ...t, exiting: true });
        const newOnes = snapshot.visible.filter((t) => !existingIds.has(t.id));
        return [...stillPresent, ...newOnes];
      });
    });
  }, []);

  const handleExited = useCallback((id: string) => {
    setRenderedToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (renderedToasts.length === 0) {
    return null;
  }

  const topOffset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 16) + 8;

  return (
    <View
      style={[styles.hostContainer, { top: topOffset }]}
      pointerEvents="box-none"
      testID="global-toast-host"
    >
      {renderedToasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={(id) => toastManager.dismiss(id)}
          onExited={handleExited}
        />
      ))}
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    hostContainer: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 100000,
      elevation: 1000,
      alignItems: 'center',
      gap: spacing.sm,
    },
    card: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: isDark ? '#000000' : c.white,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.08)',
      shadowColor: isDark ? 'transparent' : '#01151E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0 : 0.12,
      shadowRadius: 16,
      elevation: isDark ? 0 : 8,
    },
    cardBody: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 12,
      gap: 12,
    },
    statusCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textColumn: {
      flex: 1,
      justifyContent: 'center',
    },
    titleText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#1E293B',
      lineHeight: 19,
    },
    messageText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? 'rgba(255, 255, 255, 0.64)' : '#475569',
      lineHeight: 18,
      marginTop: 1,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButton: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? '#F58A07' : '#0F172A',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 7,
      marginTop: 6,
    },
    actionButtonText: {
      color: isDark ? '#000000' : '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    progressTrack: {
      height: 3,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#E2E8F0',
      width: '100%',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
    },
  });
