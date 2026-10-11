/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { SplashScreen } from '../src/components/splash/SplashScreen';

import { secureStorage } from '../src/services/secureStorage';

describe('Artha App Root & SplashScreen', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn();
    await secureStorage.clearSession();
  });

  afterEach(async () => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    await secureStorage.clearSession();
  });

  it('renders the clean SplashScreen with Artha logo, app name, and tagline', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<SplashScreen />);
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Artha');
    expect(json).toContain('Know. Spend. Grow.');

    await act(async () => {
      renderer.unmount();
    });
  });

  it('shows splash screen on launch and transitions to welcome flow after session restoration', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    // Splash screen is initially visible
    expect(
      renderer.root.findByProps({ testID: 'artha-splash-screen' }),
    ).toBeDefined();

    // Advance timers so the splash entrance/exit completes
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

  it('exits splash screen quickly in offline mode with cached session without getting stuck', async () => {
    const cachedSession = {
      accessToken: 'offline-jwt-token',
      refreshToken: 'offline-refresh-token',
      accessTokenExpiresAt: Date.now() + 600_000,
      sessionId: 'session-offline-1',
      user: {
        id: 'usr-offline-1',
        displayName: 'Offline User',
        email: 'offline@artha.app',
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
    await secureStorage.saveSession(cachedSession);

    // Mock network failure / offline mode
    (globalThis.fetch as jest.Mock).mockRejectedValue(
      new Error('Network request failed'),
    );

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    // Advance timer past splash duration and 280ms fade out animation
    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    // In offline mode with cached session, splash screen exits quickly to home screen
    expect(
      renderer.root.findAllByProps({ testID: 'artha-splash-screen' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'offline-mode-banner' }),
    ).toBeDefined();

    await act(async () => {
      renderer.unmount();
    });
  });
});
