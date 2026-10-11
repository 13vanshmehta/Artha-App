import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../common/Icon';

interface HomeHeaderProps {
  userName?: string | null;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  onLogoPress?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(({
  userName,
  onNotificationPress,
  onMenuPress,
  onLogoPress,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = userName ? userName.split(' ')[0] : '';
  const greetingText = displayName ? `${getGreeting()}, ${displayName}` : getGreeting();

  return (
    <View style={styles.container}>
      {/* Top Brand & Actions Row matching Reference Top Bar */}
      <View style={styles.topBar}>
        {/* Brand Logo & Name */}
        <TouchableOpacity
          style={styles.brandRow}
          activeOpacity={0.8}
          onPress={onLogoPress}
          accessibilityRole="button"
          accessibilityLabel="Artha Brand Home"
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/branding/artha_icon_dark.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>Artha</Text>
        </TouchableOpacity>

        {/* Circular Action Buttons (Bell & Menu) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCircle}
            activeOpacity={0.75}
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={17} color={colors.navyDeep} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCircle}
            activeOpacity={0.75}
            onPress={onMenuPress}
            accessibilityRole="button"
            accessibilityLabel="Menu Options"
          >
            <Icon name="menu" size={17} color={colors.navyDeep} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting & Supporting Text */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingTitle}>{greetingText}</Text>
        <Text style={styles.greetingSubtitle}>Here's your money at a glance.</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 32,
    height: 32,
    marginRight: 9,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  greetingContainer: {
    marginTop: 2,
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.navyDeep,
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
});
