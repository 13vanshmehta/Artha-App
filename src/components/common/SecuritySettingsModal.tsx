import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccountPageSheetModal } from './AccountPageSheetModal';
import { Icon } from './Icon';
import { toast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

export type SecuritySheetMode = 'credentials' | 'applock' | 'sessions';

interface SecuritySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: SecuritySheetMode;
}

const RELOCK_OPTIONS: Array<{ label: string; seconds: number }> = [
  { label: 'Immediately', seconds: 0 },
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
];

interface MockSessionItem {
  id: string;
  deviceName: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const INITIAL_SESSIONS: MockSessionItem[] = [
  {
    id: 'sess_1',
    deviceName: 'iPhone 15 Pro (This Device)',
    location: 'Mumbai, India',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess_2',
    deviceName: 'MacBook Pro 16" (Chrome)',
    location: 'Mumbai, India',
    lastActive: '2 hours ago',
    isCurrent: false,
  },
  {
    id: 'sess_3',
    deviceName: 'iPad Air 5th Gen (Safari)',
    location: 'Bengaluru, India',
    lastActive: '3 days ago',
    isCurrent: false,
  },
];

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  visible,
  onClose,
  mode = 'credentials',
}) => {
  // Credentials state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // App Lock state
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [selectedRelock, setSelectedRelock] = useState(60);
  const [requireReauth, setRequireReauth] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState<MockSessionItem[]>(INITIAL_SESSIONS);

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated successfully (Demo).', 'Security');
    onClose();
  };

  const handleRevokeSession = (id: string, name: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.info(`Revoked session for ${name}.`, 'Session Ended');
  };

  const handleRevokeAllOther = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.info('All other sessions revoked.', 'Sessions Cleared');
  };

  const title =
    mode === 'credentials'
      ? 'Security & Credentials'
      : mode === 'applock'
        ? 'App Lock & Biometrics'
        : 'Active Sessions';

  const subtitle =
    mode === 'credentials'
      ? 'Manage password and connected sign-in accounts'
      : mode === 'applock'
        ? 'Device-level protection with Face ID and App PIN'
        : 'Devices currently signed in to your Artha account';

  return (
    <AccountPageSheetModal
      visible={visible}
      onClose={onClose}
      topLabel="SECURITY"
      title={title}
      subtitle={subtitle}
    >
      <ScrollView
        style={styles.sheetScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sheetScrollContent}
        nestedScrollEnabled
      >
        {/* MODE 1: CREDENTIALS */}
        {mode === 'credentials' && (
          <View>
            <Text style={styles.sectionLabel}>Connected Sign-In Methods</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Icon name="mail" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Email Address</Text>
                  <Text style={styles.rowSubtitle}>vansh@example.com</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Icon name="shield" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Google Account</Text>
                  <Text style={styles.rowSubtitle}>Connected as vansh@example.com</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Linked</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              Change Password
            </Text>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                New Password
              </Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                Confirm New Password
              </Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={handleUpdatePassword}
              >
                <Text style={styles.primaryButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MODE 2: APP LOCK & BIOMETRICS */}
        {mode === 'applock' && (
          <View>
            <Text style={styles.sectionLabel}>Biometric Protection</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Icon name="smartphone" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Face ID / Biometrics</Text>
                  <Text style={styles.rowSubtitle}>
                    Unlock Artha using device biometric sensors
                  </Text>
                </View>
                <Switch
                  value={biometricsEnabled}
                  onValueChange={(val) => {
                    setBiometricsEnabled(val);
                    toast.info(
                      val ? 'Biometrics enabled (Demo)' : 'Biometrics disabled (Demo)',
                      'App Lock',
                    );
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Icon name="lock" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>App PIN Code</Text>
                  <Text style={styles.rowSubtitle}>
                    Fallback 4-digit PIN when biometrics are unavailable
                  </Text>
                </View>
                <Switch
                  value={pinEnabled}
                  onValueChange={(val) => {
                    setPinEnabled(val);
                    toast.info(
                      val ? 'App PIN enabled (Demo)' : 'App PIN disabled (Demo)',
                      'App Lock',
                    );
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              Auto-Lock Timeout
            </Text>
            <View style={styles.pillRow}>
              {RELOCK_OPTIONS.map((opt) => {
                const isSelected = selectedRelock === opt.seconds;
                return (
                  <TouchableOpacity
                    key={opt.seconds}
                    style={[styles.relockPill, isSelected && styles.relockPillActive]}
                    onPress={() => setSelectedRelock(opt.seconds)}
                  >
                    <Text
                      style={[
                        styles.relockPillText,
                        isSelected && styles.relockPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              Sensitive Actions Protection
            </Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Icon name="shield" size={18} color={colors.navyPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Require Re-Auth on Large Transfers</Text>
                  <Text style={styles.rowSubtitle}>
                    Prompt verification for payments over ₹10,000
                  </Text>
                </View>
                <Switch
                  value={requireReauth}
                  onValueChange={setRequireReauth}
                  trackColor={{ false: '#CBD5E1', true: colors.bluePrimary }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          </View>
        )}

        {/* MODE 3: ACTIVE SESSIONS */}
        {mode === 'sessions' && (
          <View>
            <Text style={styles.sectionLabel}>Active Device Sessions ({sessions.length})</Text>
            {sessions.map((sess) => (
              <View key={sess.id} style={[styles.card, { marginBottom: spacing.sm }]}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Icon name="smartphone" size={18} color={colors.navyPrimary} />
                  </View>
                  <View style={styles.rowText}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rowTitle}>{sess.deviceName}</Text>
                      {sess.isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSubtitle}>
                      {sess.location} · {sess.lastActive}
                    </Text>
                  </View>
                  {!sess.isCurrent && (
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeSession(sess.id, sess.deviceName)}
                    >
                      <Text style={styles.revokeButtonText}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {sessions.some((s) => !s.isCurrent) && (
              <TouchableOpacity
                style={styles.outlineDangerButton}
                activeOpacity={0.85}
                onPress={handleRevokeAllOther}
              >
                <Text style={styles.outlineDangerButtonText}>
                  Revoke All Other Sessions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </AccountPageSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetScrollView: {
    flex: 1,
  },
  sheetScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.xs,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  currentBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bluePrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.bluePrimary,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  relockPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  relockPillActive: {
    backgroundColor: colors.bluePrimary,
    borderColor: colors.bluePrimary,
  },
  relockPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  relockPillTextActive: {
    color: colors.white,
  },
  revokeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  revokeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  outlineDangerButton: {
    borderWidth: 1.2,
    borderColor: '#EF4444',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: '#FEF2F2',
  },
  outlineDangerButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
