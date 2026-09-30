import React, { useContext, useEffect, useRef, useState } from 'react';
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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ToastThemeVisuals {
  accentColor: string;
  stripeColor: string;
  iconName: IconName;
}

const TOAST_VISUALS: Record<ToastType, ToastThemeVisuals> = {
  success: {
    accentColor: '#22C55E',
    stripeColor: 'rgba(255, 255, 255, 0.28)',
    iconName: 'check',
  },
  info: {
    accentColor: '#0A66FF',
    stripeColor: 'rgba(255, 255, 255, 0.28)',
    iconName: 'info',
  },
  warning: {
    accentColor: '#EA8C00',
    stripeColor: 'rgba(255, 255, 255, 0.28)',
    iconName: 'warning',
  },
  error: {
    accentColor: '#EF4444',
    stripeColor: 'rgba(255, 255, 255, 0.28)',
    iconName: 'error',
  },
};

const STRIPE_INDICES = Array.from({ length: 24 }, (_, idx) => idx);

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

export const ToastCard: React.FC<ToastCardProps> = ({ item, onDismiss }) => {
  const visuals = TOAST_VISUALS[item.type];
  const progressAnim = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progressAnim.setValue(1);
    entranceAnim.setValue(0);

    let progressAnimation: Animated.CompositeAnimation | null = null;

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((reduceMotion) => {
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

    progressAnimation = Animated.timing(progressAnim, {
      toValue: 0,
      duration: item.duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnimation.start();

    return () => {
      progressAnimation?.stop();
    };
  }, [entranceAnim, item.createdAt, item.duration, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
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
          <Icon name={visuals.iconName} size={17} color={colors.white} />
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
          <Icon name="close" size={14} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Bottom progress bar track matching reference image */}
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
        >
          <View style={styles.stripesRow} pointerEvents="none">
            {STRIPE_INDICES.map((idx) => (
              <View
                key={idx}
                style={[
                  styles.diagonalStripe,
                  { backgroundColor: visuals.stripeColor },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export const ToastHost: React.FC = () => {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const [visibleToasts, setVisibleToasts] = useState<ToastItem[]>(
    () => toastManager.getSnapshot().visible,
  );

  useEffect(() => {
    return toastManager.subscribe((snapshot) => {
      setVisibleToasts(snapshot.visible);
    });
  }, []);

  if (visibleToasts.length === 0) {
    return null;
  }

  const topOffset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 16) + 8;

  return (
    <View
      style={[styles.hostContainer, { top: topOffset }]}
      pointerEvents="box-none"
      testID="global-toast-host"
    >
      {visibleToasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={(id) => toastManager.dismiss(id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#071F46',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
    color: '#1E293B',
    lineHeight: 19,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
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
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
  stripesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: 480,
  },
  diagonalStripe: {
    width: 6,
    height: 18,
    marginRight: 8,
    transform: [{ rotate: '-35deg' }],
  },
});
