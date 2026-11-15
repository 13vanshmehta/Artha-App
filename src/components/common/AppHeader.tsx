import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors: c, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      {/* Brand logo & modern typography */}
      <TouchableOpacity
        style={styles.brandRow}
        activeOpacity={0.75}
        onPress={onLogoPress}
      >
        <View style={styles.logoWrapper}>
          <Logo size={40} variant={isDark ? 'white' : 'navy'} />
        </View>

        <View style={styles.brandTextColumn}>
          <Text style={styles.brandTitle}>
            <Text style={{ color: c.textPrimary }}>Arth</Text>
            <Text style={{ color: c.accent }}>a</Text>
          </Text>
          <Text style={styles.brandTagline}>Know • Spend • Grow</Text>
        </View>
      </TouchableOpacity>

      {/* Action buttons matching reference image */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.75}
          onPress={onNotificationPress}
          accessibilityLabel="Notifications"
        >
          <Icon name="bell" size={19} color={c.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.75}
          onPress={onMenuPress}
          accessibilityLabel="Menu"
        >
          <Icon name="menu" size={19} color={c.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoWrapper: {
      width: 40,
      height: 40,
      marginRight: spacing.md,
      shadowColor: isDark ? 'transparent' : c.midnight,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0 : 0.22,
      shadowRadius: 6,
      elevation: isDark ? 0 : 4,
    },
    brandTextColumn: {
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 22,
      fontWeight: '800',
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
      color: c.textSecondary,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? 'transparent' : c.midnight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 6,
      elevation: isDark ? 0 : 3,
    },
  });

export const AppHeader = React.memo(AppHeaderComponent);
