import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export type IconName =
  | 'home'
  | 'scan'
  | 'analytics'
  | 'history'
  | 'account'
  | 'bell'
  | 'menu'
  | 'plus'
  | 'arrowDown'
  | 'arrowUp'
  | 'trendDown'
  | 'trendUp'
  | 'split'
  | 'receipt'
  | 'search'
  | 'close'
  | 'check'
  | 'chevronRight'
  | 'food'
  | 'shopping'
  | 'travel'
  | 'bills'
  | 'entertainment'
  | 'income'
  | 'other'
  | 'card'
  | 'upi'
  | 'bank'
  | 'wallet'
  | 'group'
  | 'camera'
  | 'gallery'
  | 'lock'
  | 'eye'
  | 'eyeOff'
  | 'shield'
  | 'logOut'
  | 'bellRing'
  | 'user'
  | 'info'
  | 'warning'
  | 'error'
  | 'apple'
  | 'google'
  | 'chevronLeft'
  | 'settings'
  | 'mail'
  | 'globe'
  | 'moon'
  | 'help'
  | 'trash'
  | 'smartphone';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#FFFFFF' }) => {
  const s = size;
  const strokeWidth = Math.max(1.8, s * 0.09);

  switch (name) {
    case 'home':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.8,
              height: s * 0.72,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopWidth: 0,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
              alignItems: 'center',
            }}
          >
            {/* roof top pointer */}
            <View
              style={{
                position: 'absolute',
                top: -s * 0.36,
                width: s * 0.62,
                height: s * 0.62,
                borderTopWidth: strokeWidth,
                borderLeftWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
              }}
            />
            {/* door */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                width: s * 0.26,
                height: s * 0.34,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                borderWidth: strokeWidth,
                borderColor: color,
                borderBottomWidth: 0,
              }}
            />
          </View>
        </View>
      );

    case 'scan':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.86,
              height: s * 0.86,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View
                style={{
                  width: s * 0.28,
                  height: s * 0.28,
                  borderTopWidth: strokeWidth,
                  borderLeftWidth: strokeWidth,
                  borderColor: color,
                  borderTopLeftRadius: 4,
                }}
              />
              <View
                style={{
                  width: s * 0.28,
                  height: s * 0.28,
                  borderTopWidth: strokeWidth,
                  borderRightWidth: strokeWidth,
                  borderColor: color,
                  borderTopRightRadius: 4,
                }}
              />
            </View>
            {/* Center scan line */}
            <View
              style={{
                height: strokeWidth,
                backgroundColor: color,
                width: '70%',
                alignSelf: 'center',
                borderRadius: 1,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View
                style={{
                  width: s * 0.28,
                  height: s * 0.28,
                  borderBottomWidth: strokeWidth,
                  borderLeftWidth: strokeWidth,
                  borderColor: color,
                  borderBottomLeftRadius: 4,
                }}
              />
              <View
                style={{
                  width: s * 0.28,
                  height: s * 0.28,
                  borderBottomWidth: strokeWidth,
                  borderRightWidth: strokeWidth,
                  borderColor: color,
                  borderBottomRightRadius: 4,
                }}
              />
            </View>
          </View>
        </View>
      );

    case 'analytics':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.76,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                width: s * 0.18,
                height: s * 0.38,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: s * 0.18,
                height: s * 0.72,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: s * 0.18,
                height: s * 0.52,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'history':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: (s * 0.82) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: s * 0.14,
                width: strokeWidth,
                height: s * 0.28,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: s * 0.36,
                left: s * 0.36,
                width: s * 0.24,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'account':
    case 'user':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          {/* Head */}
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderRadius: (s * 0.38) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              marginBottom: 2,
            }}
          />
          {/* Body */}
          <View
            style={{
              width: s * 0.72,
              height: s * 0.32,
              borderTopLeftRadius: s * 0.36,
              borderTopRightRadius: s * 0.36,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
        </View>
      );

    case 'bell':
    case 'bellRing':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.58,
              height: s * 0.54,
              borderTopLeftRadius: s * 0.29,
              borderTopRightRadius: s * 0.29,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
          <View
            style={{
              width: s * 0.76,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: s * 0.22,
              height: s * 0.1,
              backgroundColor: color,
              borderBottomLeftRadius: s * 0.11,
              borderBottomRightRadius: s * 0.11,
              marginTop: 1.5,
            }}
          />
        </View>
      );

    case 'menu':
      return (
        <View
          style={[
            styles.center,
            {
              width: s,
              height: s,
              justifyContent: 'space-between',
              paddingVertical: s * 0.22,
            },
          ]}
        >
          <View
            style={{
              width: s * 0.44,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: s * 0.76,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: s * 0.44,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'plus':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View style={{ position: 'absolute', width: s * 0.68, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', width: strokeWidth, height: s * 0.68, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'trendDown':
    case 'arrowDown':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderBottomWidth: strokeWidth * 1.2,
              borderRightWidth: strokeWidth * 1.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              top: -s * 0.08,
            }}
          />
        </View>
      );

    case 'trendUp':
    case 'arrowUp':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.5,
              borderTopWidth: strokeWidth * 1.2,
              borderRightWidth: strokeWidth * 1.2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              bottom: -s * 0.08,
            }}
          />
        </View>
      );

    case 'chevronRight':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderTopWidth: strokeWidth,
              borderRightWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              right: 1,
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.52,
              height: s * 0.52,
              borderRadius: (s * 0.52) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              top: -1,
              left: -1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.28,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
              bottom: s * 0.16,
              right: s * 0.16,
            }}
          />
        </View>
      );

    case 'receipt':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.64,
              height: s * 0.8,
              borderWidth: strokeWidth,
              borderColor: color,
              borderRadius: 3,
              padding: 2,
              justifyContent: 'space-evenly',
              alignItems: 'center',
            }}
          >
            <View style={{ width: '70%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '70%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '45%', height: 1.5, backgroundColor: color, alignSelf: 'flex-start', marginLeft: 3 }} />
          </View>
        </View>
      );

    case 'split':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderRadius: s * 0.16,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
            <View style={{ width: 4, height: strokeWidth, backgroundColor: color }} />
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderRadius: s * 0.16,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'check':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.55,
              height: s * 0.3,
              borderBottomWidth: strokeWidth * 1.2,
              borderLeftWidth: strokeWidth * 1.2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              top: -1,
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View style={{ position: 'absolute', width: s * 0.6, height: strokeWidth, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
          <View style={{ position: 'absolute', width: s * 0.6, height: strokeWidth, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
        </View>
      );

    case 'lock':
    case 'shield':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.42,
              height: s * 0.28,
              borderTopLeftRadius: s * 0.21,
              borderTopRightRadius: s * 0.21,
              borderWidth: strokeWidth,
              borderBottomWidth: 0,
              borderColor: color,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: s * 0.68,
              height: s * 0.48,
              borderRadius: 4,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: strokeWidth * 1.3,
                height: s * 0.16,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'eye':
    case 'eyeOff':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.5,
              borderRadius: s * 0.25,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.22,
                height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color,
              }}
            />
          </View>
          {name === 'eyeOff' && (
            <View
              style={{
                position: 'absolute',
                width: s * 0.9,
                height: strokeWidth,
                backgroundColor: color,
                transform: [{ rotate: '-35deg' }],
              }}
            />
          )}
        </View>
      );

    case 'logOut':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.5,
              height: s * 0.76,
              borderLeftWidth: strokeWidth,
              borderTopWidth: strokeWidth,
              borderBottomWidth: strokeWidth,
              borderColor: color,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
              alignSelf: 'flex-start',
              marginLeft: s * 0.12,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.12,
              width: s * 0.48,
              height: strokeWidth,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'info':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: Math.max(2.2, s * 0.14),
              height: Math.max(2.2, s * 0.14),
              borderRadius: Math.max(1.2, s * 0.07),
              backgroundColor: color,
              marginBottom: Math.max(2, s * 0.1),
            }}
          />
          <View
            style={{
              width: Math.max(2.2, s * 0.13),
              height: s * 0.42,
              borderRadius: Math.max(1.2, s * 0.065),
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'warning':
    case 'error':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: Math.max(2.2, s * 0.14),
              height: s * 0.44,
              borderRadius: Math.max(1.2, s * 0.07),
              backgroundColor: color,
              marginBottom: Math.max(2.2, s * 0.1),
            }}
          />
          <View
            style={{
              width: Math.max(2.4, s * 0.15),
              height: Math.max(2.4, s * 0.15),
              borderRadius: Math.max(1.2, s * 0.075),
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'apple':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          {/* Leaf */}
          <View
            style={{
              width: s * 0.22,
              height: s * 0.24,
              backgroundColor: color,
              borderTopLeftRadius: s * 0.2,
              borderBottomRightRadius: s * 0.2,
              borderTopRightRadius: 2,
              borderBottomLeftRadius: 2,
              transform: [{ rotate: '18deg' }],
              marginLeft: s * 0.1,
              marginBottom: -s * 0.03,
            }}
          />
          {/* Apple body (two overlapping lobes) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.42,
                height: s * 0.58,
                backgroundColor: color,
                borderTopLeftRadius: s * 0.24,
                borderTopRightRadius: s * 0.18,
                borderBottomLeftRadius: s * 0.28,
                borderBottomRightRadius: s * 0.18,
                marginRight: -s * 0.12,
              }}
            />
            <View
              style={{
                width: s * 0.42,
                height: s * 0.58,
                backgroundColor: color,
                borderTopLeftRadius: s * 0.18,
                borderTopRightRadius: s * 0.24,
                borderBottomLeftRadius: s * 0.18,
                borderBottomRightRadius: s * 0.28,
              }}
            />
          </View>
        </View>
      );

    case 'google':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.84,
              borderRadius: s * 0.42,
              borderWidth: Math.max(2.4, s * 0.16),
              borderTopColor: '#EA4335',
              borderLeftColor: '#FBBC05',
              borderBottomColor: '#34A853',
              borderRightColor: '#4285F4',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.4,
                height: Math.max(2.2, s * 0.15),
                backgroundColor: '#4285F4',
                marginRight: -Math.max(1.5, s * 0.08),
              }}
            />
          </View>
        </View>
      );

    // Categories
    case 'food':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>🍔</Text>
        </View>
      );
    case 'shopping':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>🛍️</Text>
        </View>
      );
    case 'travel':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>🚕</Text>
        </View>
      );
    case 'bills':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>⚡</Text>
        </View>
      );
    case 'entertainment':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>🍿</Text>
        </View>
      );
    case 'income':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>💰</Text>
        </View>
      );
    case 'other':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <Text style={{ fontSize: s * 0.72 }}>✨</Text>
        </View>
      );

    case 'chevronLeft':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderLeftWidth: strokeWidth,
              borderBottomWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginLeft: s * 0.1,
            }}
          />
        </View>
      );

    case 'settings':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.76,
              height: s * 0.76,
              borderRadius: s * 0.38,
              borderWidth: strokeWidth,
              borderColor: color,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.32,
                height: s * 0.32,
                borderRadius: s * 0.16,
                borderWidth: strokeWidth,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'mail':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.62,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: s * 0.6,
                height: s * 0.6,
                borderBottomWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -s * 0.34,
              }}
            />
          </View>
        </View>
      );

    case 'globe':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: s * 0.41,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.42,
                height: s * 0.8,
                borderRadius: s * 0.21,
                borderWidth: Math.max(1.2, strokeWidth * 0.8),
                borderColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: s * 0.78,
                height: Math.max(1.2, strokeWidth * 0.8),
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'moon':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.72,
              borderRadius: s * 0.36,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: '-35deg' }],
            }}
          />
        </View>
      );

    case 'help':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.84,
              borderRadius: s * 0.42,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color,
                fontSize: s * 0.52,
                fontWeight: '800',
                lineHeight: s * 0.58,
              }}
            >
              ?
            </Text>
          </View>
        </View>
      );

    case 'trash':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.72,
              height: strokeWidth,
              backgroundColor: color,
              marginBottom: 2,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              width: s * 0.58,
              height: s * 0.62,
              borderWidth: strokeWidth,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </View>
      );

    case 'smartphone':
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.54,
              height: s * 0.84,
              borderRadius: 4,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingBottom: 2.5,
            }}
          >
            <View
              style={{
                width: s * 0.18,
                height: strokeWidth,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    default:
      return (
        <View style={[styles.center, { width: s, height: s }]}>
          <View style={{ width: s * 0.4, height: s * 0.4, backgroundColor: color, borderRadius: 2 }} />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
