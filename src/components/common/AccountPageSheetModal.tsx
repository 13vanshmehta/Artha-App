import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';

interface AccountPageSheetModalProps {
  visible: boolean;
  onClose: () => void;
  topLabel: string;
  title?: string;
  subtitle?: string;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
  rightActionDisabled?: boolean;
  rightActionTestID?: string;
  closeButtonTestID?: string;
  testID?: string;
  children: React.ReactNode;
}

const DEFAULT_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

// Distance (px) after which releasing the sheet closes it; before this it springs back up
const DISMISS_DRAG_THRESHOLD = 95;

/**
 * Smooth vertical drag curve:
 * - Pulling UP (dy < 0): gentle rubber-band stretch
 * - Pulling DOWN (dy >= 0): smooth, responsive finger tracking with slight elastic feel
 */
function computeSmoothDragTranslation(dy: number): number {
  if (dy < 0) {
    return -Math.min(Math.pow(Math.abs(dy), 0.7) * 2.0, 32);
  }
  if (dy <= DISMISS_DRAG_THRESHOLD) {
    return dy * 0.85;
  }
  const heldPart = DISMISS_DRAG_THRESHOLD * 0.85;
  return heldPart + (dy - DISMISS_DRAG_THRESHOLD) * 1.02;
}

export const AccountPageSheetModal: React.FC<AccountPageSheetModalProps> = ({
  visible,
  onClose,
  topLabel,
  title,
  subtitle,
  rightActionLabel,
  onRightActionPress,
  rightActionDisabled,
  rightActionTestID,
  closeButtonTestID,
  testID,
  children,
}) => {
  const insets = useContext(SafeAreaInsetsContext) ?? DEFAULT_INSETS;
  const { height: screenHeight } = useWindowDimensions();
  const isIOS = Platform.OS === 'ios';
  const isJest = typeof jest !== 'undefined';

  const [internalVisible, setInternalVisible] = useState(visible);
  const [isDragging, setIsDragging] = useState(false);
  const openProgress = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const contentRiseY = useRef(new Animated.Value(18)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Top safe-area clearance so the background Account screen peeks through cleanly
  const topClearance = isIOS
    ? Math.max(insets.top, 44) + 12
    : Math.max(insets.top, StatusBar.currentHeight ?? 28) + 12;

  const sheetHeight = Math.max(screenHeight - topClearance, 320);

  const dismissWithSpring = useCallback(
    (velocityY = 1.2) => {
      setIsDragging(false);
      Animated.parallel([
        Animated.timing(openProgress, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: screenHeight,
          velocity: Math.max(velocityY * 480, 520),
          damping: 26,
          stiffness: 230,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setInternalVisible(false);
          onClose();
        }
      });
    },
    [onClose, openProgress, screenHeight, sheetTranslateY],
  );

  const snapBackWithSpring = useCallback(() => {
    setIsDragging(false);
    Animated.parallel([
      Animated.spring(openProgress, {
        toValue: 1,
        damping: 18,
        stiffness: 240,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 15,
        stiffness: 265,
        mass: 0.72,
        useNativeDriver: true,
      }),
    ]).start();
  }, [openProgress, sheetTranslateY]);

  const handleDragMove = useCallback(
    (dy: number) => {
      const translated = computeSmoothDragTranslation(dy);
      sheetTranslateY.setValue(translated);

      if (dy > 0) {
        const nextBackdrop = Math.max(
          0.1,
          1 - translated / (screenHeight * 0.55),
        );
        openProgress.setValue(nextBackdrop);
      } else {
        openProgress.setValue(1);
      }
    },
    [openProgress, screenHeight, sheetTranslateY],
  );

  const handleDragEnd = useCallback(
    (dy: number, vy: number) => {
      const shouldDismiss =
        dy > DISMISS_DRAG_THRESHOLD || (dy > 36 && vy > 0.65);

      if (shouldDismiss) {
        dismissWithSpring(vy);
      } else {
        snapBackWithSpring();
      }
    },
    [dismissWithSpring, snapBackWithSpring],
  );

  // Dedicated PanResponder for the top gray grabber bar: claims touch immediately on touch-down
  const grabberPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          handleDragMove(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          handleDragEnd(gestureState.dy, gestureState.vy);
        },
        onPanResponderTerminate: () => {
          snapBackWithSpring();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [handleDragEnd, handleDragMove, snapBackWithSpring],
  );

  // Header PanResponder: allows smooth pull-down from anywhere on the header/title while keeping buttons tappable
  const headerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          setIsDragging(true);
        },
        onPanResponderMove: (_, gestureState) => {
          handleDragMove(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          handleDragEnd(gestureState.dy, gestureState.vy);
        },
        onPanResponderTerminate: () => {
          snapBackWithSpring();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [handleDragEnd, handleDragMove, snapBackWithSpring],
  );

  useEffect(() => {
    if (visible && !isJest) {
      contentRiseY.setValue(18);
      contentOpacity.setValue(0.4);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.spring(contentRiseY, {
          toValue: 0,
          damping: 22,
          stiffness: 210,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isJest && visible) {
      contentRiseY.setValue(0);
      contentOpacity.setValue(1);
    }
  }, [contentOpacity, contentRiseY, isJest, topLabel, visible]);

  useEffect(() => {
    if (isJest) {
      setInternalVisible(visible);
      return;
    }

    if (visible) {
      setInternalVisible(true);
      openProgress.setValue(0);
      sheetTranslateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(openProgress, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 215,
          mass: 0.82,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (internalVisible) {
      Animated.parallel([
        Animated.timing(openProgress, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setInternalVisible(false);
        }
      });
    }
  }, [
    internalVisible,
    isJest,
    openProgress,
    screenHeight,
    sheetTranslateY,
    visible,
  ]);

  const renderInnerBody = () => (
    <View style={styles.sheetBody} testID={testID}>
      {/* Top Gray Grabber Bar with generous touch target that immediately grabs on touch-down */}
      <View
        style={styles.grabberTouchArea}
        {...grabberPanResponder.panHandlers}
      >
        <View
          style={[
            styles.grabberPill,
            isDragging && styles.grabberPillActive,
          ]}
        />
      </View>

      {/* Draggable Header & Navigation Row */}
      <View style={styles.headerWrap} {...headerPanResponder.panHandlers}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={onClose}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={closeButtonTestID}
          >
            <Icon name="chevronLeft" size={18} color={colors.navyPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTopLabel} numberOfLines={1}>
            {topLabel}
          </Text>

          {rightActionLabel && onRightActionPress ? (
            <TouchableOpacity
              style={styles.rightActionBtn}
              onPress={onRightActionPress}
              disabled={rightActionDisabled}
              activeOpacity={0.75}
              testID={rightActionTestID}
            >
              <Text
                style={[
                  styles.rightActionText,
                  rightActionDisabled && styles.rightActionTextDisabled,
                ]}
              >
                {rightActionLabel}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>

      {/* Scrollable Body Container with bounded height for touch scrolling */}
      <Animated.View
        style={[
          styles.animatedContentWrap,
          {
            opacity: isJest ? 1 : contentOpacity,
            transform: [{ translateY: isJest ? 0 : contentRiseY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );

  const sheetCardNode = (
    <Animated.View
      style={[
        styles.sheetCard,
        {
          height: sheetHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          transform: [{ translateY: isJest ? 0 : sheetTranslateY }],
        },
      ]}
    >
      {renderInnerBody()}
    </Animated.View>
  );

  return (
    <Modal
      visible={isJest ? visible : internalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlayRoot, { paddingTop: topClearance }]}>
        <StatusBar barStyle="light-content" />

        {/* Animated dimmed backdrop that lightens to reveal the Account background as you pull down */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: isJest ? 1 : openProgress,
            },
          ]}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {isIOS ? (
          <KeyboardAvoidingView style={styles.iosKeyboardWrap} behavior="padding">
            {sheetCardNode}
          </KeyboardAvoidingView>
        ) : (
          sheetCardNode
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 19, 41, 0.48)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetCard: {
    width: '100%',
    backgroundColor: '#FAFCFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#051329',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 24,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FAFCFF',
  },
  animatedContentWrap: {
    flex: 1,
    minHeight: 0,
  },
  grabberTouchArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FAFCFF',
  },
  grabberPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(10, 40, 85, 0.2)',
  },
  grabberPillActive: {
    width: 52,
    backgroundColor: 'rgba(10, 40, 85, 0.35)',
  },
  headerWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm + 2,
    backgroundColor: '#FAFCFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(10, 40, 85, 0.08)',
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(111, 181, 238, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTopLabel: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.navyDeep,
  },
  headerSpacer: {
    width: 36,
  },
  rightActionBtn: {
    minWidth: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rightActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heroGradientStart,
  },
  rightActionTextDisabled: {
    opacity: 0.45,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
});
