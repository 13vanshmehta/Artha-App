import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';
import { SplashScreen } from '../src/components/splash/SplashScreen';
import { secureStorage } from '../src/services/secureStorage';

describe('Artha Prototype UI App', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await secureStorage.clearAll();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await secureStorage.clearAll();
  });

  it('renders the clean SplashScreen with Artha branding and tagline', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<SplashScreen isReady={false} />);
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

    await act(async () => {
      renderer.unmount();
    });
  });
});
