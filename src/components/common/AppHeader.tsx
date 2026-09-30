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
import { Icon } from './Icon';

interface AppHeaderProps {
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  onLogoPress?: () => void;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({
  onNotificationPress,
  onMenuPress,
  onLogoPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Brand logo & modern typography */}
      <TouchableOpacity
        style={styles.brandRow}
        activeOpacity={0.75}
        onPress={onLogoPress}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/branding/artha_icon_dark.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.brandTextColumn}>
          <Text style={styles.brandTitle}>ARTHA</Text>
          <Text style={styles.brandTagline}>Know • Spend • Grow</Text>
        </View>
      </TouchableOpacity>

      {/* Action buttons matching reference image (no-op on click) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.75}
          onPress={onNotificationPress}
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={19} color={colors.navyPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.75}
          onPress={onMenuPress}
          accessibilityLabel="Menu"
        >
          <Icon name="menu" size={19} color={colors.navyPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(111, 181, 238, 0.18)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navyDeep,
    letterSpacing: 1.2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'sans-serif-medium',
      default: 'System',
    }),
  },
  brandTagline: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#476282',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(111, 181, 238, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navyDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});

export const AppHeader = React.memo(AppHeaderComponent);
