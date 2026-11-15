import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Logo } from '../common/Logo';

interface AuthBrandHeaderProps {
  title: string;
  subtitle: string;
  onBackPress?: () => void;
  backTestID?: string;
}

export const AuthBrandHeader: React.FC<AuthBrandHeaderProps> = ({
  title,
  subtitle,
  onBackPress,
  backTestID,
}) => {
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      {onBackPress ? (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID={backTestID}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Inline Horizontal Brand Mark like reference Phone 2 */}
      <View style={styles.brandRow}>
        <Logo size={32} variant={isDark ? 'white' : 'navy'} />
        <Text style={styles.brandText}>
          <Text style={{ color: isDark ? '#FFFFFF' : '#031D44' }}>Arth</Text>
          <Text style={{ color: '#F58A07' }}>a</Text>
        </Text>
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? c.border : 'rgba(10, 40, 85, 0.08)',
    },
    backArrow: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: spacing.xl,
    },
    brandText: {
      fontSize: 22,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: 0.3,
      fontFamily: Platform.select({
        ios: 'AvenirNext-Bold',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
    heading: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.4,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
