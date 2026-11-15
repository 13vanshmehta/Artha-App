import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useTheme } from '../context/ThemeContext';
import { AppIcon, AppIconName } from '../components/icons/AppIcon';
import { toast } from '../context/ToastContext';

declare const process: {
  env: Record<string, string | undefined>;
};

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  dateGroup: 'Today, Nov 14' | 'Yesterday, Nov 13' | 'Earlier this week';
  read: boolean;
  iconName: AppIconName;
  iconColor: string;
  iconBg: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Special offer: 2x Cashback on weekend dining',
    message: 'Check out the latest deals on our partner restaurants. Pay via UPI to get 10% extra.',
    timestamp: '9:25 am',
    dateGroup: 'Today, Nov 14',
    read: false,
    iconName: 'Gift',
    iconColor: '#EA580C',
    iconBg: '#FFEDD5',
  },
  {
    id: 'notif-2',
    title: 'Salary Credited: ₹85,000 received',
    message: 'Monthly payroll payout credited from TechCorp Solutions to your primary account.',
    timestamp: '8:00 am',
    dateGroup: 'Today, Nov 14',
    read: false,
    iconName: 'ArrowDown',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
  },
  {
    id: 'notif-3',
    title: 'Budget Alert: 85% of Food & Dining budget used',
    message: 'You have spent ₹14,200 of your ₹18,000 monthly food allowance. 16 days remaining.',
    timestamp: '6:30 pm',
    dateGroup: 'Yesterday, Nov 13',
    read: true,
    iconName: 'CircleAlert',
    iconColor: '#D97706',
    iconBg: '#FEF3C7',
  },
  {
    id: 'notif-4',
    title: 'Settlement: Jai Sharma paid ₹450',
    message: 'Goa Trip Beach Shack Dinner split has been settled via UPI.',
    timestamp: '11:15 am',
    dateGroup: 'Yesterday, Nov 13',
    read: true,
    iconName: 'Users',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
  },
  {
    id: 'notif-5',
    title: 'Your subscription to Spotify Premium is now active',
    message: 'Next billing cycle on December 14 for ₹119.',
    timestamp: '9:00 pm',
    dateGroup: 'Earlier this week',
    read: true,
    iconName: 'Calendar',
    iconColor: '#9333EA',
    iconBg: '#F3E8FF',
  },
  {
    id: 'notif-6',
    title: 'Reminder: Pay your electricity bill to avoid late fees',
    message: 'Bill amount of ₹2,450 is due on November 18.',
    timestamp: '12:17 pm',
    dateGroup: 'Earlier this week',
    read: true,
    iconName: 'Zap',
    iconColor: '#E11D48',
    iconBg: '#FFE4E6',
  },
  {
    id: 'notif-7',
    title: 'Security: Biometric unlock enabled',
    message: 'Biometric face & fingerprint authentication was verified on this device.',
    timestamp: '10:30 am',
    dateGroup: 'Earlier this week',
    read: true,
    iconName: 'Shield',
    iconColor: '#084887',
    iconBg: '#E0F2FE',
  },
];

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  notifications,
  onMarkAsRead,
  onDeleteNotification,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const { isDark, colors: c } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const animMap = useRef<{
    [id: string]: { translateX: Animated.Value; opacity: Animated.Value };
  }>({}).current;

  const { width: windowWidth } = Dimensions.get('window');
  const SLIDE_OUT_DISTANCE = windowWidth > 0 ? windowWidth + 50 : 450;
  const USE_NATIVE_DRIVER = Platform.OS !== 'web' && process.env.NODE_ENV !== 'test';

  const getAnim = (id: string) => {
    if (!animMap[id]) {
      animMap[id] = {
        translateX: new Animated.Value(0),
        opacity: new Animated.Value(1),
      };
    }
    return animMap[id];
  };

  // Group notifications by dateGroup
  const groups = ['Today, Nov 14', 'Yesterday, Nov 13', 'Earlier this week'] as const;

  const handleToggleDelete = (id: string) => {
    setActiveDeleteId((prev) => (prev === id ? null : id));
  };

  // Animate single notification tile left to right off-screen
  const handleDeleteSingle = (id: string) => {
    if (isClearing) return;
    const anims = getAnim(id);

    Animated.parallel([
      Animated.timing(anims.translateX, {
        toValue: SLIDE_OUT_DISTANCE,
        duration: 240,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(anims.opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      delete animMap[id];
      onDeleteNotification(id);
    });
  };

  // Animate all notification tiles left to right with smooth stagger
  const handleClearAll = () => {
    if (notifications.length === 0 || isClearing) return;
    setIsClearing(true);

    const animations: Animated.CompositeAnimation[] = [];

    notifications.forEach((item, index) => {
      const anims = getAnim(item.id);
      animations.push(
        Animated.sequence([
          Animated.delay(index * 35),
          Animated.parallel([
            Animated.timing(anims.translateX, {
              toValue: SLIDE_OUT_DISTANCE,
              duration: 240,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(anims.opacity, {
              toValue: 0,
              duration: 210,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ]),
      );
    });

    Animated.parallel(animations).start(() => {
      setIsClearing(false);
      onClearAll();
      toast.info('All notifications cleared', 'Notifications');
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* ======================================================== */}
        {/* HEADER: BACK ARROW, TITLE, CLEAR ALL GLASSY BUTTON       */}
        {/* ======================================================== */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go Back"
            accessibilityRole="button"
          >
            <AppIcon name="ChevronLeft" size={26} color={c.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Notifications</Text>

          <TouchableOpacity
            style={[
              styles.clearAllBtn,
              (notifications.length === 0 || isClearing) && styles.clearAllBtnDisabled,
            ]}
            onPress={handleClearAll}
            disabled={notifications.length === 0 || isClearing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            accessibilityLabel="Clear All Notifications"
            accessibilityRole="button"
          >
            <AppIcon
              name="Trash2"
              size={13}
              color={notifications.length === 0 || isClearing ? '#94A3B8' : '#EF4444'}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.clearAllBtnText,
                (notifications.length === 0 || isClearing) && styles.clearAllBtnTextDisabled,
              ]}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* NOTIFICATIONS LIST                                       */}
        {/* ======================================================== */}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="Bell" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up with your expenses, budgets, and shared group alerts.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {groups.map((group) => {
              const itemsInGroup = notifications.filter(
                (n) => n.dateGroup === group,
              );
              if (itemsInGroup.length === 0) return null;

              return (
                <View key={group} style={styles.groupSection}>
                  {/* Date Section Header */}
                  <Text style={styles.groupHeader}>{group}</Text>

                  {/* List of Notification Rows */}
                  <View style={styles.groupList}>
                    {itemsInGroup.map((item) => {
                      const isDeleteActive = activeDeleteId === item.id;
                      const anims = getAnim(item.id);

                      return (
                        <Animated.View
                          key={item.id}
                          style={[
                            styles.notificationRowWrapper,
                            isDeleteActive && styles.rowWrapperActive,
                            {
                              transform: [{ translateX: anims.translateX }],
                              opacity: anims.opacity,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.notificationRow,
                              !item.read && styles.notificationRowUnread,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => onMarkAsRead(item.id)}
                            onLongPress={() => handleToggleDelete(item.id)}
                          >
                            {/* Category Icon */}
                            <View
                              style={[
                                styles.iconBox,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : item.iconBg },
                              ]}
                            >
                              <AppIcon
                                name={item.iconName}
                                size={18}
                                color={item.iconColor}
                              />
                            </View>

                            {/* Notification Content */}
                            <View style={styles.contentBox}>
                              <View style={styles.titleRow}>
                                <Text
                                  style={[
                                    styles.itemTitle,
                                    !item.read && styles.itemTitleUnread,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>
                                <Text style={styles.timestampText}>
                                  {item.timestamp}
                                </Text>
                              </View>
                              <Text style={styles.itemMessage} numberOfLines={2}>
                                {item.message}
                              </Text>
                            </View>

                            {/* Trash Icon Button with Left-to-Right Slide Animation */}
                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => handleDeleteSingle(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel="Delete notification"
                            >
                              <AppIcon
                                name="Trash2"
                                size={16}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    backBtn: {
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    clearAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: isDark ? 'transparent' : '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 4,
      elevation: isDark ? 0 : 2,
    },
    clearAllBtnDisabled: {
      opacity: 0.45,
      backgroundColor: isDark ? '#000000' : 'rgba(241, 245, 249, 0.60)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.50)',
    },
    clearAllBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#EF4444',
      letterSpacing: -0.2,
    },
    clearAllBtnTextDisabled: {
      color: c.textMuted,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    groupSection: {
      marginTop: 20,
    },
    groupHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 10,
      letterSpacing: 0.1,
    },
    groupList: {
      backgroundColor: c.background,
    },
    notificationRowWrapper: {
      borderRadius: 12,
      marginVertical: 2,
    },
    rowWrapperActive: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC',
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F8FAFC',
    },
    notificationRowUnread: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    contentBox: {
      flex: 1,
      marginRight: 8,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 3,
    },
    itemTitle: {
      fontSize: 13.5,
      fontWeight: '500',
      color: isDark ? 'rgba(255, 255, 255, 0.85)' : '#334155',
      flex: 1,
      marginRight: 8,
      lineHeight: 18,
    },
    itemTitleUnread: {
      fontWeight: '700',
      color: c.textPrimary,
    },
    timestampText: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '500',
    },
    itemMessage: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 16,
    },
    deleteBtn: {
      padding: 6,
      marginTop: 2,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 13.5,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
