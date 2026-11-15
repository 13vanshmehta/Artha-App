import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export type TabKey = 'Home' | 'PE Tracker' | 'Groups' | 'Account';

interface BottomTabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isScrolling?: boolean;
  /**
   * Continuous, JS-driven page position (e.g. 1.35 = 35% of the way from tab
   * index 1 to tab index 2). When provided, the active pill/label tracks this
   * value directly via interpolation so it glides in real time with the
   * finger during a swipe instead of snapping only once `currentTab` changes.
   */
  scrollProgress?: Animated.Value;
  pageWidth?: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

const TAB_BAR_HEIGHT = 62;

interface TabIconProps {
  tab: TabKey;
  color: string;
  isActive: boolean;
  size?: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
}

/**
 * 1. Home Icon: Classic Instagram-style house glyph
 * Solid when active, clean architectural outline when inactive
 */
const HomeGlyph: React.FC<{ isActive: boolean; color: string; size: number }> = ({
  isActive,
  color,
  size,
}) => {
  if (isActive) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2.7L2.8 10.4C2.3 10.8 2 11.4 2 12V20C2 21.1 2.9 22 4 22H8.5C9.3 22 10 21.3 10 20.5V15C10 14.4 10.4 14 11 14H13C13.6 14 14 14.4 14 15V20.5C14 21.3 14.7 22 15.5 22H20C21.1 22 22 21.1 22 20V12C22 11.4 21.7 10.8 21.2 10.4L12 2.7Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.8L12 3.2L21 10.8V19.8C21 20.9 20.1 21.8 19 21.8H15C14.4 21.8 14 21.4 14 20.8V15.2C14 14.5 13.5 14 12.8 14H11.2C10.5 14 10 14.5 10 15.2V20.8C10 21.4 9.6 21.8 9 21.8H5C3.9 21.8 3 20.9 3 19.8V10.8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/**
 * 2. PE Tracker Icon: Financial analytics squircle glyph
 * Solid squircle with ledger bars when active, clean outline when inactive
 */
const TrackerGlyph: React.FC<{ isActive: boolean; color: string; size: number }> = ({
  isActive,
  color,
  size,
}) => {
  if (isActive) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="5.5"
          stroke={color}
          strokeWidth={2.4}
        />
        <Path
          d="M7.5 16V12.5"
          stroke={color}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <Path
          d="M12 16V8"
          stroke={color}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        <Path
          d="M16.5 16V10.5"
          stroke={color}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M7.5 16V13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 16V8.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M16.5 16V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * 3. Groups Icon: Dual-user community silhouette glyph
 * Solid silhouette when active, crisp outline when inactive
 */
const GroupsGlyph: React.FC<{ isActive: boolean; color: string; size: number }> = ({
  isActive,
  color,
  size,
}) => {
  if (isActive) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15.5 21V18.5C15.5 16.84 14.16 15.5 12.5 15.5H5.5C3.84 15.5 2.5 16.84 2.5 18.5V21"
          fill={color}
        />
        <Circle cx="9" cy="8.5" r="4.2" fill={color} />
        <Path
          d="M16.8 15.8C18.1 16.4 19 17.5 19 18.8V21H22V18.8C22 17.1 20.6 15.7 19.1 15.6"
          fill={color}
          opacity={0.65}
        />
        <Path
          d="M14.8 4.6C15.9 5.4 16.5 6.6 16.5 8C16.5 9.4 15.9 10.6 14.8 11.4"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.65}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 20.5V18C15 16.34 13.66 15 12 15H5C3.34 15 2 16.34 2 18V20.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="8.5"
        cy="7.5"
        r="4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 20.5V18C18 16.7 17.2 15.7 16 15.2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M14.5 4.5C15.7 5.2 16.5 6.5 16.5 8C16.5 9.5 15.7 10.8 14.5 11.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * 4. Account Avatar: Circular profile tab
 * Displays real user photo (or stylized monogram) with active ring indicator
 */
const AccountAvatar: React.FC<{
  isActive: boolean;
  userAvatarUrl?: string | null;
  userName?: string | null;
  size?: number;
}> = ({ isActive, userAvatarUrl, userName, size = 22 }) => {
  const { isDark } = useTheme();
  const initial = (userName?.trim()?.[0] || 'A').toUpperCase();

  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
          borderColor: isActive ? (isDark ? '#FFFFFF' : colors.navyDeep) : 'transparent',
          borderWidth: isActive ? 2 : 0,
        },
      ]}
    >
      {userAvatarUrl ? (
        <Image
          source={{ uri: userAvatarUrl }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isActive
                ? (isDark ? '#FFFFFF' : colors.navyDeep)
                : (isDark ? '#262626' : '#E2E8F0'),
            },
          ]}
        >
          <Text
            style={[
              styles.avatarInitial,
              {
                color: isActive
                  ? (isDark ? '#000000' : '#FFFFFF')
                  : (isDark ? '#A1A1AA' : '#475569'),
                fontSize: size * 0.44,
              },
            ]}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
};

const TabIcon: React.FC<TabIconProps> = ({
  tab,
  color,
  isActive,
  size = 22,
  userAvatarUrl,
  userName,
}) => {
  if (tab === 'Home') {
    return <HomeGlyph isActive={isActive} color={color} size={size} />;
  }

  if (tab === 'PE Tracker') {
    return <TrackerGlyph isActive={isActive} color={color} size={size} />;
  }

  if (tab === 'Groups') {
    return <GroupsGlyph isActive={isActive} color={color} size={size} />;
  }

  return (
    <AccountAvatar
      isActive={isActive}
      userAvatarUrl={userAvatarUrl}
      userName={userName}
      size={size}
    />
  );
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'Home', label: 'Home' },
  { key: 'PE Tracker', label: 'PE Tracker' },
  { key: 'Groups', label: 'Groups' },
  { key: 'Account', label: 'Account' },
];

/**
 * Natural width ceilings allocated for each tab's text label
 * Prevents text wrapping or jumpiness during horizontal expansion.
 */
const TAB_MAX_WIDTHS: Record<TabKey, number> = {
  Home: 52,
  'PE Tracker': 84,
  Groups: 58,
  Account: 66,
};

const BottomTabBarComponent: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
  isScrolling = false,
  scrollProgress,
  pageWidth,
  userAvatarUrl,
  userName,
}) => {
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const { isDark } = useTheme();

  // Floating margin above device home indicator / safe area
  const bottomMargin = Math.max(
    insets.bottom + 6,
    Platform.OS === 'ios' ? 18 : 14,
  );

  // Responsive capsule width (matches clean floating bar proportions)
  const screenWidth = pageWidth && pageWidth > 0 ? pageWidth : windowDimensions.width || 390;
  const capsuleWidth = Math.min(Math.max(screenWidth - 40, 310), 370);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Fallback spring driver used only when no live scrollProgress is supplied
  // (e.g. the tab bar is used standalone, without a swipeable page container).
  const tabAnims = useRef<Record<TabKey, Animated.Value>>({
    Home: new Animated.Value(currentTab === 'Home' ? 1 : 0),
    'PE Tracker': new Animated.Value(currentTab === 'PE Tracker' ? 1 : 0),
    Groups: new Animated.Value(currentTab === 'Groups' ? 1 : 0),
    Account: new Animated.Value(currentTab === 'Account' ? 1 : 0),
  }).current;

  useEffect(() => {
    if (scrollProgress) return; // live scroll position already drives the pill

    const animations = TABS.map((tab) => {
      const isActive = tab.key === currentTab;
      return Animated.spring(tabAnims[tab.key], {
        toValue: isActive ? 1 : 0,
        damping: 18,
        stiffness: 170,
        mass: 0.8,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [currentTab, scrollProgress, tabAnims]);

  // Resolves each tab's 0..1 "active-ness": when scrollProgress is live, this
  // is a continuous interpolation that tracks the finger/scroll position in
  // real time (1 when that tab's page is centered, fading linearly as the
  // adjacent page is dragged into view). Otherwise falls back to the spring.
  const tabInterpolations = React.useMemo(() => {
    if (!scrollProgress) return null;
    return TABS.map((_, index) =>
      scrollProgress.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      }),
    );
  }, [scrollProgress]);

  const getTabAnim = (tabKey: TabKey, index: number): Animated.Value => {
    if (tabInterpolations) {
      return tabInterpolations[index] as unknown as Animated.Value;
    }
    return tabAnims[tabKey];
  };

  // Smoothly glide bar down on vertical scroll and snap back on idle
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
      <View
        style={[
          styles.capsuleContainer,
          {
            width: capsuleWidth,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.96)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
          },
        ]}
      >
        {TABS.map((tab, index) => {
          const isActive = currentTab === tab.key;
          const anim = getTabAnim(tab.key, index);
          const maxLabelWidth = TAB_MAX_WIDTHS[tab.key];

          // Text unmasking width: reveals from 0 to full width next to the icon
          const animatedMaxWidth = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, maxLabelWidth],
          });

          // Text sliding entrance: translates from left (-14) to right (0) on page visit
          const animatedTranslateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-14, 0],
          });

          // Text opacity fade: fades into view smoothly
          const animatedTextOpacity = anim.interpolate({
            inputRange: [0, 0.35, 1],
            outputRange: [0, 0.2, 1],
          });

          // Spacing gap between icon and label: 0 when inactive, 6px when active
          const animatedMarginLeft = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 6],
          });

          // Active pill padding horizontal: 10px when icon-only, 14px when expanded
          const animatedPaddingHorizontal = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 14],
          });

          // Active pill background color highlight
          const animatedBgColor = anim.interpolate({
            inputRange: [0, 1],
            outputRange: isDark
              ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.12)']
              : ['rgba(3, 29, 68, 0)', 'rgba(3, 29, 68, 0.08)'],
          });

          // Active pill subtle border
          const animatedBorderColor = anim.interpolate({
            inputRange: [0, 1],
            outputRange: isDark
              ? ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.16)']
              : ['rgba(3, 29, 68, 0)', 'rgba(3, 29, 68, 0.05)'],
          });

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabTouchArea}
              activeOpacity={0.7}
              onPress={() => onSelectTab(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Animated.View
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: animatedBgColor,
                    borderColor: animatedBorderColor,
                    paddingHorizontal: animatedPaddingHorizontal,
                  },
                ]}
              >
                {/* 1. Icon (Always visible) */}
                <TabIcon
                  tab={tab.key}
                  color={
                    isActive
                      ? (isDark ? '#FFFFFF' : colors.navyDeep)
                      : (isDark ? 'rgba(255, 255, 255, 0.42)' : '#64748B')
                  }
                  size={22}
                  isActive={isActive}
                  userAvatarUrl={userAvatarUrl}
                  userName={userName}
                />

                {/* 2. Page Name: Expands horizontally & slides left-to-right on page visit */}
                <Animated.View
                  style={[
                    styles.labelMask,
                    {
                      maxWidth: animatedMaxWidth,
                      marginLeft: animatedMarginLeft,
                      opacity: animatedTextOpacity,
                    },
                  ]}
                >
                  <Animated.View
                    style={{
                      transform: [{ translateX: animatedTranslateX }],
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="clip"
                      style={[
                        styles.tabLabel,
                        {
                          width: maxLabelWidth,
                          color: isDark ? '#FFFFFF' : colors.navyDeep,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
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
  // Floating translucent liquid-glass pill container
  capsuleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 36,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 12,
  },
  tabTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  // Dynamic rounded pill chip wrapper for active / inactive states
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  // Overflow-hidden mask ensuring text unfolds cleanly from left to right next to icon
  labelMask: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  avatarImage: {
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '700',
  },
});

export const BottomTabBar = React.memo(BottomTabBarComponent);
