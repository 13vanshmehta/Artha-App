import { Platform } from 'react-native';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { APP_CONFIG } from '../config/env';

export interface SocialTokenResult {
  cancelled: boolean;
  token?: string;
  fullName?: string | null;
  errorMessage?: string;
}

let configuredWebClientId: string | null = null;
let configuredIosClientId: string | null = null;
let inFlightGoogleSignInPromise: Promise<SocialTokenResult> | null = null;

function isPlaceholderClientId(value: string): boolean {
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed.startsWith('your-') ||
    trimmed.includes('placeholder') ||
    !trimmed.endsWith('.apps.googleusercontent.com')
  );
}

function logSocialAuthDebug(reason: string, details?: unknown): void {
  const isJest = Boolean((globalThis as Record<string, unknown>).jest);
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !isJest) {
    console.warn(`[Artha SocialAuth] ${reason}`, details ?? '');
  }
}

function ensureGoogleConfigured(): { ok: boolean; errorMessage?: string } {
  const webClientId = (APP_CONFIG.GOOGLE_WEB_CLIENT_ID || '').trim();
  const iosClientId = (APP_CONFIG.GOOGLE_IOS_CLIENT_ID || '').trim();

  if (isPlaceholderClientId(webClientId)) {
    logSocialAuthDebug(
      'Missing or placeholder ARTHA_GOOGLE_WEB_CLIENT_ID in environment.',
    );
    return {
      ok: false,
      errorMessage: 'Google Sign-In Failed',
    };
  }

  if (Platform.OS === 'ios' && isPlaceholderClientId(iosClientId)) {
    logSocialAuthDebug(
      'Missing or placeholder ARTHA_GOOGLE_IOS_CLIENT_ID on iOS.',
    );
    return {
      ok: false,
      errorMessage: 'Google Sign-In Failed',
    };
  }

  if (
    configuredWebClientId === webClientId &&
    configuredIosClientId === iosClientId
  ) {
    return { ok: true };
  }

  try {
    GoogleSignin.configure({
      webClientId,
      iosClientId: !isPlaceholderClientId(iosClientId)
        ? iosClientId
        : undefined,
      offlineAccess: false,
      scopes: ['openid', 'profile', 'email'],
    });

    configuredWebClientId = webClientId;
    configuredIosClientId = iosClientId;
    return { ok: true };
  } catch (err) {
    logSocialAuthDebug(
      'Native RNGoogleSignin module not linked in current binary. Rebuild native app (run-ios / run-android).',
      err,
    );
    return {
      ok: false,
      errorMessage: 'Google Sign-In Failed',
    };
  }
}

export async function requestGoogleIdToken(): Promise<SocialTokenResult> {
  if (inFlightGoogleSignInPromise) {
    return inFlightGoogleSignInPromise;
  }

  inFlightGoogleSignInPromise = executeGoogleSignIn().finally(() => {
    inFlightGoogleSignInPromise = null;
  });

  return inFlightGoogleSignInPromise;
}

async function executeGoogleSignIn(): Promise<SocialTokenResult> {
  const configCheck = ensureGoogleConfigured();
  if (!configCheck.ok) {
    return {
      cancelled: false,
      errorMessage: configCheck.errorMessage,
    };
  }

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { cancelled: true };
    }

    if (isSuccessResponse(response)) {
      const idToken = response.data?.idToken;
      if (!idToken) {
        logSocialAuthDebug(
          'Google Sign-In succeeded without returning an idToken.',
        );
        return {
          cancelled: false,
          errorMessage: 'Google Sign-In Failed',
        };
      }
      return {
        cancelled: false,
        token: idToken,
      };
    }

    // Fallback for legacy/custom mock shapes
    const fallbackIdToken =
      (response as unknown as { data?: { idToken?: string }; idToken?: string })
        ?.data?.idToken ??
      (response as unknown as { idToken?: string })?.idToken;

    if (!fallbackIdToken) {
      logSocialAuthDebug(
        'Google Sign-In fallback response did not include an idToken.',
      );
      return {
        cancelled: false,
        errorMessage: 'Google Sign-In Failed',
      };
    }

    return {
      cancelled: false,
      token: fallbackIdToken,
    };
  } catch (err: unknown) {
    if (isErrorWithCode(err)) {
      if (
        err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === statusCodes.IN_PROGRESS
      ) {
        return { cancelled: true };
      }
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        logSocialAuthDebug(
          'Google Play Services not available or outdated.',
          err,
        );
        return {
          cancelled: false,
          errorMessage: 'Google Sign-In Failed',
        };
      }
    }
    logSocialAuthDebug('Google Sign-In exception.', err);
    return {
      cancelled: false,
      errorMessage: 'Google Sign-In Failed',
    };
  }
}

export async function signOutGoogleSilently(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore if user was not signed in via Google
  }
}

export async function requestAppleIdentityToken(): Promise<SocialTokenResult> {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    logSocialAuthDebug('Apple Sign-In not supported on current platform/device.');
    return {
      cancelled: false,
      errorMessage: 'Apple Sign-In Failed',
    };
  }

  try {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    if (!appleAuthRequestResponse.identityToken) {
      logSocialAuthDebug('Apple Sign-In did not return an identityToken.');
      return {
        cancelled: false,
        errorMessage: 'Apple Sign-In Failed',
      };
    }

    const given = appleAuthRequestResponse.fullName?.givenName ?? '';
    const family = appleAuthRequestResponse.fullName?.familyName ?? '';
    const fullName = `${given} ${family}`.trim() || null;

    return {
      cancelled: false,
      token: appleAuthRequestResponse.identityToken,
      fullName,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === appleAuth.Error.CANCELED) {
      return { cancelled: true };
    }
    logSocialAuthDebug('Apple Sign-In exception.', err);
    return {
      cancelled: false,
      errorMessage: 'Apple Sign-In Failed',
    };
  }
}
