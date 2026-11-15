import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  G,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type LogoVariant = 'navy' | 'white';

interface LogoProps {
  size?: number;
  variant?: LogoVariant;
  /** Plays the arrow draw-in animation once on mount (used on splash/welcome). */
  animated?: boolean;
  /** Override the knockout-gap color; defaults to #F7F5FB on light, #06386e on dark */
  knockoutColor?: string;
}

/**
 * Artha Mobile Brand Mark: "New Ascending Arrow 'A' Logo"
 * Matches the user's exact HTML specification:
 * - Main Blue 'A' Arch: navy (#031D44) to royal (#084887) linear gradient
 * - Ghost White Knockout Gap: stroke-width 26, linecap round
 * - Dynamic Orange Growth Arrow Crossbar: stroke-width 18, orange (#F58A07) to amber (#F9AB55)
 * - Arrowhead: stroke-width 18, orange (#F58A07) to amber (#F9AB55)
 */
export const Logo: React.FC<LogoProps> = ({
  size = 155,
  variant = 'navy',
  animated = false,
  knockoutColor,
}) => {
  const isJest =
    typeof jest !== 'undefined' ||
    Boolean((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.JEST_WORKER_ID) ||
    Boolean((globalThis as Record<string, unknown>).jest);

  const shaftProgress = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;
  const headProgress = useRef(new Animated.Value(isJest || !animated ? 1 : 0)).current;

  useEffect(() => {
    if (isJest || !animated) return;

    Animated.sequence([
      Animated.timing(shaftProgress, {
        toValue: 1,
        duration: 650,
        delay: 250,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      }),
      Animated.timing(headProgress, {
        toValue: 1,
        duration: 400,
        delay: 50,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [animated, isJest, shaftProgress, headProgress]);

  const shaftDashoffset = shaftProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });
  const headDashoffset = headProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const isDark = variant === 'white';
  const gapColor = knockoutColor ?? (isDark ? '#000000' : '#F7F5FB');

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Defs>
          <LinearGradient id="blueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#031D44" />
            <Stop offset="100%" stopColor="#084887" />
          </LinearGradient>
          <LinearGradient id="orangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#F58A07" />
            <Stop offset="100%" stopColor="#F9AB55" />
          </LinearGradient>
        </Defs>

        <G>
          {/* Main Blue 'A' Arch (Crisp White on Dark, Blue Gradient on Light) */}
          <Path
            d="M 52 196 L 100 54 C 108 32, 132 32, 140 54 L 188 196 L 148 196 L 120 106 L 92 196 Z"
            fill={isDark ? '#FFFFFF' : 'url(#blueGrad)'}
            strokeLinejoin="round"
          />

          {/* Ghost White Knockout Gap */}
          <Path
            d="M 42 162 Q 115 152 186 92"
            fill="none"
            stroke={gapColor}
            strokeWidth={26}
            strokeLinecap="round"
          />

          {/* Dynamic Orange Growth Arrow Crossbar */}
          <AnimatedPath
            d="M 46 166 Q 115 156 184 94"
            fill="none"
            stroke="url(#orangeGrad)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={200}
            strokeDashoffset={shaftDashoffset as unknown as number}
          />

          {/* Arrowhead */}
          <AnimatedPath
            d="M 156 86 L 194 84 L 188 122"
            fill="none"
            stroke="url(#orangeGrad)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={100}
            strokeDashoffset={headDashoffset as unknown as number}
          />
        </G>
      </Svg>
    </View>
  );
};
