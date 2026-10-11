import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'Home' | 'Account';

interface BottomTabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isScrolling?: boolean;
}

const TAB_WIDTH = 86;
const CONTAINER_PADDING = 4.5;

interface TabIconProps {
  tab: TabKey;
  color: string;
  isActive: boolean;
  size?: number;
}

const TabIcon: React.FC<TabIconProps> = ({
  tab,
  color,
  size = 18,
}) => {
  if (tab === 'Home') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        {/* Precision gable roof with symmetric eaves overhang */}
        <View
          style={[
            styles.homeRoof,
            {
              borderBottomColor: color,
            },
          ]}
        />
        {/* House body with natural transparent doorway opening */}
        <View style={styles.homeBody}>
          <View
            style={[
              styles.homeWall,
              styles.homeWallLeft,
              { backgroundColor: color },
            ]}
          />
          <View style={styles.homeDoorway}>
            <View style={[styles.homeLintel, { backgroundColor: color }]} />
          </View>
          <View
            style={[
              styles.homeWall,
              styles.homeWallRight,
              { backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  }

  // Account - Refined modern person glyph
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={[
          styles.accountHead,
          {
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.accountShoulders,
          {
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'Home', label: 'Home' },
  { key: 'Account', label: 'Account' },
];

const BottomTabBarComponent: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  isScrolling = false,
}) => {
  const insets = useSafeAreaInsets();
  const bottomMargin = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 12);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Active tab slider animation
  const initialIndex = TABS.findIndex((t) => t.key === currentTab);
  const slideAnim = useRef(new Animated.Value(initialIndex >= 0 ? initialIndex : 0)).current;

  // Animate slider smoothly when tab changes
  useEffect(() => {
    const targetIndex = TABS.findIndex((t) => t.key === currentTab);
    if (targetIndex !== -1) {
      Animated.spring(slideAnim, {
        toValue: targetIndex,
        damping: 18,
        stiffness: 175,
        mass: 0.75,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTab, slideAnim]);

  // Hide/Show on scroll
  useEffect(() => {
    translateY.stopAnimation();
    opacity.stopAnimation();

    if (isScrolling) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 90,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isScrolling, translateY, opacity]);

  const translateX = slideAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => i * TAB_WIDTH),
  });

  return (
    <Animated.View
      pointerEvents={isScrolling ? 'none' : 'auto'}
      style={[
        styles.outerWrapper,
        {
          bottom: bottomMargin,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.pillContainer}>
        {/* Animated Sliding Indicator Pill */}
        <Animated.View
          style={[
            styles.sliderPill,
            {
              width: TAB_WIDTH,
              transform: [{ translateX }],
            },
          ]}
        />

        {/* Tab Items */}
        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          const activeColor = '#FFFFFF';
          const inactiveColor = '#8EA5C4';

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, { width: TAB_WIDTH }]}
              activeOpacity={0.8}
              onPress={() => onSelectTab(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <TabIcon
                tab={tab.key}
                color={isActive ? activeColor : inactiveColor}
                size={17}
                isActive={isActive}
              />

              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 49, 82, 0.94)',
    borderRadius: 30,
    height: 58,
    padding: CONTAINER_PADDING,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#051124',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  sliderPill: {
    position: 'absolute',
    left: CONTAINER_PADDING,
    top: CONTAINER_PADDING,
    bottom: CONTAINER_PADDING,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: 0.25,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#8EA5C4',
    fontWeight: '600',
  },
  iconBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Precision Home architectural glyph
  homeRoof: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 7.5,
    borderRightWidth: 7.5,
    borderBottomWidth: 6.2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 0.5,
  },
  homeBody: {
    width: 12,
    height: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  homeWall: {
    width: 3.5,
    height: 7,
  },
  homeWallLeft: {
    borderBottomLeftRadius: 1.5,
  },
  homeWallRight: {
    borderBottomRightRadius: 1.5,
  },
  homeDoorway: {
    width: 5,
    height: 7,
    alignItems: 'center',
  },
  homeLintel: {
    width: 5,
    height: 1.8,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  // Precision Account avatar glyph
  accountHead: {
    width: 5.4,
    height: 5.4,
    borderRadius: 2.7,
  },
  accountShoulders: {
    width: 12,
    height: 6.2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    marginTop: 1.8,
  },
});

export const BottomTabBar = React.memo(BottomTabBarComponent);
