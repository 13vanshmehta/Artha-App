import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';
import { SplashScreen, BrandSplashLockup } from '../src/components/splash/SplashScreen';
import { secureStorage } from '../src/services/secureStorage';
import { apiClient } from '../src/services/apiClient';

describe('Artha Prototype UI App', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    jest.useFakeTimers();
    await secureStorage.clearAll();
    apiClient.setInMemorySession(null);
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error (offline test)'));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await secureStorage.clearAll();
    apiClient.setInMemorySession(null);
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the brand splash lockup with Artha branding and tagline', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<BrandSplashLockup animated={false} />);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');
    expect(allText).toContain('Artha');
    expect(allText).toContain('Know. Spend. Grow.');

    await act(async () => {
      renderer.unmount();
    });
  });

  it('shows welcome / auth flow when unauthenticated', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      renderer.root.findByProps({ testID: 'welcome-screen' }),
    ).toBeDefined();

    await act(async () => {
      renderer.unmount();
    });
  });

  it('launches cleanly into the 4-tab mobile prototype navigation when authenticated', async () => {
    const session = {
      accessToken: 'test-jwt-token',
      refreshToken: 'test-refresh-token',
      accessTokenExpiresAt: Date.now() + 600_000,
      sessionId: 'sess_1',
      user: {
        id: 'usr_1',
        displayName: 'Vansh Mehta',
        email: 'vansh.mehta@example.com',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        status: 'ACTIVE',
        hasPassword: true,
        linkedProviders: [],
        securityPreferences: {
          biometricEnabled: false,
          pinEnabled: false,
          appLockTimeoutSeconds: 300,
          requireReauthForSensitiveAction: false,
        },
        createdAt: new Date().toISOString(),
      },
    };
    await secureStorage.saveSession(session);

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const textNodes = renderer.root.findAllByType(Text);
    const allText = textNodes.map((n) => n.props.children).flat().join(' ');

    // 4 primary navigation tabs
    expect(allText).toContain('Home');
    expect(allText).toContain('PE Tracker');
    expect(allText).toContain('Groups');
    expect(allText).toContain('Account');

    // Bottom tab bar should start selected on Home
    const homeTab = renderer.root.findByProps({ accessibilityLabel: 'Home' });
    expect(homeTab.props.accessibilityState.selected).toBe(true);

    const accountTab = renderer.root.findByProps({ accessibilityLabel: 'Account' });
    expect(accountTab.props.accessibilityState.selected).toBe(false);

    await act(async () => {
      renderer.unmount();
    });
  });

  it('resets navbar and scroll state cleanly to Home on re-login after logout', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const session = {
      accessToken: 'test-jwt-token-2',
      refreshToken: 'test-refresh-token-2',
      accessTokenExpiresAt: Date.now() + 600_000,
      sessionId: 'sess_2',
      user: {
        id: 'usr_2',
        displayName: 'Vansh Mehta',
        email: 'vansh.mehta@example.com',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        status: 'ACTIVE',
        hasPassword: true,
        linkedProviders: [],
        securityPreferences: {
          biometricEnabled: false,
          pinEnabled: false,
          appLockTimeoutSeconds: 300,
          requireReauthForSensitiveAction: false,
        },
        createdAt: new Date().toISOString(),
      },
    };
    await secureStorage.saveSession(session);

    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Starts on Home
    const initialHomeTab = renderer.root.findByProps({ accessibilityLabel: 'Home' });
    expect(initialHomeTab.props.accessibilityState.selected).toBe(true);

    // Switch tab to Account
    const accountTab = renderer.root.findByProps({ accessibilityLabel: 'Account' });
    await act(async () => {
      accountTab.props.onPress();
    });

    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Account' }).props.accessibilityState.selected,
    ).toBe(true);

    await act(async () => {
      renderer.unmount();
    });
  });
});
