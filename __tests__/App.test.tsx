/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import App from '../App';
import { SplashScreen } from '../src/components/splash/SplashScreen';

describe('Artha App Root & SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
});
