import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { GroupItem, formatCurrency } from '../../data/mockData';
import { Icon } from '../common/Icon';

interface GroupsSectionProps {
  groups: GroupItem[];
  onAddGroup?: () => void;
  onGroupPress?: (group: GroupItem) => void;
}

const GroupsSectionComponent: React.FC<GroupsSectionProps> = ({
  groups,
  onAddGroup,
  onGroupPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Shared Groups</Text>
          <Text style={styles.sectionSubtitle}>Collaborative expenses</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={onAddGroup}
        >
          <Icon name="plus" size={12} color={colors.navyPrimary} />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Group Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            activeOpacity={0.8}
            onPress={() => onGroupPress?.(group)}
          >
            <View style={styles.groupTopRow}>
              <View
                style={[
                  styles.groupIcon,
                  { backgroundColor: group.avatarBg },
                ]}
              >
                <Text style={styles.groupInitials}>
                  {group.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.membersPill}>
                <Text style={styles.membersCount}>{group.membersCount} members</Text>
              </View>
            </View>

            <Text style={styles.groupName} numberOfLines={1}>
              {group.name}
            </Text>

            <View style={styles.groupBottom}>
              <Text style={styles.spentLabel}>Group Total</Text>
              <Text style={styles.spentAmount}>
                {formatCurrency(group.spentThisMonth)}
              </Text>
              <Text style={styles.yourShareLabel}>
                Your share: {formatCurrency(group.yourShare)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(111, 181, 238, 0.25)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navyPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  groupCard: {
    width: 170,
    backgroundColor: colors.navyPrimary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111, 181, 238, 0.25)',
    ...shadows.card,
  },
  groupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  groupInitials: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  membersPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  membersCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLightMuted,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  groupBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: spacing.xs + 2,
  },
  spentLabel: {
    fontSize: 11,
    color: colors.textLightMuted,
  },
  spentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.blueBright,
    marginVertical: 2,
  },
  yourShareLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLightSubtle,
  },
});

export const GroupsSection = React.memo(GroupsSectionComponent);

