import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

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
        <Image
          source={require('../../assets/branding/artha_icon_dark.png')}
          style={styles.brandIcon}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>Artha</Text>
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 40, 85, 0.08)',
  },
  backArrow: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.navyDeep,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.xl,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navyDeep,
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
    color: colors.navyDeep,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
