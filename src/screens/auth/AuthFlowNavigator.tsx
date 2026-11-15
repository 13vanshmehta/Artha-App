import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AuthBrandHeader } from '../../components/auth/AuthBrandHeader';
import { Logo } from '../../components/common/Logo';
import { SplashScreen } from '../../components/splash/SplashScreen';
import {
  AuthPrimaryButton,
  AuthSecondaryButton,
  SocialAuthGroup,
} from '../../components/auth/AuthButtons';
import { AuthFormInput } from '../../components/auth/AuthFormInput';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Palette } from '../../theme/colors';
import { toast } from '../../context/ToastContext';
import { ApiError } from '../../services/apiClient';
import { borderRadius, spacing } from '../../theme/spacing';

export type AuthScreenStep =
  | 'welcome'
  | 'login'
  | 'register'
  | 'verify_otp'
  | 'forgot_password'
  | 'reset_password';

interface AuthFlowNavigatorProps {
  initialStep?: AuthScreenStep;
  isSplashActive?: boolean;
}

const STEP_DEPTH: Record<AuthScreenStep, number> = {
  welcome: 0,
  register: 1,
  login: 1,
  verify_otp: 2,
  forgot_password: 2,
  reset_password: 3,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function evaluatePasswordPolicy(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^A-Za-z\d]/.test(password),
    get isValid() {
      return (
        this.minLength &&
        this.hasUpper &&
        this.hasLower &&
        this.hasDigit &&
        this.hasSymbol
      );
    },
  };
}

export function maskEmailAddress(rawEmail: string): string {
  const trimmed = rawEmail.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return trimmed || 'your email';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  if (local.length <= 2) {
    return `${local[0]}***${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}${domain}`;
}

export const AuthFlowNavigator: React.FC<AuthFlowNavigatorProps> = ({
  initialStep = 'welcome',
  isSplashActive: isSplashActiveProp,
}) => {
  // The app's own default launch screen (SplashScreen, shown before this
  // component ever mounts) already plays the logo-only entrance once. By
  // the time the Welcome screen appears, the Get Started / Log in actions
  // should already be in place — no second wait here.
  const isSplashActive = isSplashActiveProp ?? false;
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const {
    status,
    pendingVerificationEmail,
    otpResendCooldownSeconds,
    register,
    resendVerificationOtp,
    confirmEmailOtp,
    login,
    signInWithGoogle,
    requestPasswordReset,
    confirmPasswordReset,
    exitPendingVerification,
    openPendingVerification,
  } = useAuth();

  const [step, setStep] = useState<AuthScreenStep>(
    status === 'pending_verification' ? 'verify_otp' : initialStep,
  );

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(pendingVerificationEmail ?? '');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Password carried from Sign Up / Log In into the verification step. The
  // backend requires it on confirm (it becomes the account password, so only
  // the inbox owner decides it). Kept in memory only, never persisted.
  const [verificationPassword, setVerificationPassword] = useState('');
  // True when the verification step was reached without a password in memory
  // (e.g. the navigator remounted), so the step must ask for it.
  const [askVerificationPassword, setAskVerificationPassword] = useState(false);

  // Field-level inline validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string | null;
    email?: string | null;
    password?: string | null;
    otp?: string | null;
    resetToken?: string | null;
  }>({});

  // Feedback & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Directional slide + fade screen transition animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const screenSlideX = useRef(new Animated.Value(0)).current;

  const triggerStepAnimation = (
    fromStep: AuthScreenStep,
    toStep: AuthScreenStep,
  ) => {
    const fromDepth = STEP_DEPTH[fromStep];
    const toDepth = STEP_DEPTH[toStep];
    let initialOffset = 44;
    if (toDepth < fromDepth) {
      initialOffset = -44;
    } else if (toDepth === fromDepth) {
      initialOffset = toStep === 'login' ? 36 : -36;
    }

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((reduceMotion) => {
        if (reduceMotion) {
          fadeAnim.setValue(1);
          screenSlideX.setValue(0);
          return;
        }
        fadeAnim.setValue(0.18);
        screenSlideX.setValue(initialOffset);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.spring(screenSlideX, {
            toValue: 0,
            damping: 22,
            stiffness: 185,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]).start();
      })
      .catch(() => {
        fadeAnim.setValue(1);
        screenSlideX.setValue(0);
      });
  };

  // Bottom-to-top entrance animation for Welcome screen CTA buttons
  const welcomeButtonsOpacity = useRef(
    new Animated.Value(isSplashActive ? 0 : 1),
  ).current;
  const welcomeButtonsTranslateY = useRef(
    new Animated.Value(isSplashActive ? 64 : 0),
  ).current;

  useEffect(() => {
    if (step !== 'welcome') {
      return;
    }
    if (isSplashActive) {
      welcomeButtonsOpacity.setValue(0);
      welcomeButtonsTranslateY.setValue(64);
      return;
    }

    welcomeButtonsOpacity.setValue(0);
    welcomeButtonsTranslateY.setValue(64);

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((reduceMotion) => {
        if (reduceMotion) {
          welcomeButtonsOpacity.setValue(1);
          welcomeButtonsTranslateY.setValue(0);
          return;
        }
        Animated.parallel([
          Animated.timing(welcomeButtonsOpacity, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.spring(welcomeButtonsTranslateY, {
            toValue: 0,
            damping: 20,
            stiffness: 150,
            mass: 0.85,
            useNativeDriver: true,
          }),
        ]).start();
      })
      .catch(() => {
        welcomeButtonsOpacity.setValue(1);
        welcomeButtonsTranslateY.setValue(0);
      });
  }, [
    isSplashActive,
    step,
    welcomeButtonsOpacity,
    welcomeButtonsTranslateY,
  ]);

  useEffect(() => {
    if (status === 'pending_verification' && pendingVerificationEmail) {
      setEmail(pendingVerificationEmail);
      setStep('verify_otp');
      setCooldownRemaining(otpResendCooldownSeconds);
    }
  }, [status, pendingVerificationEmail, otpResendCooldownSeconds]);

  useEffect(() => {
    if (step === 'verify_otp' && !verificationPassword) {
      setAskVerificationPassword(true);
    }
    // Only re-evaluate on entering the step; typing into the field must not hide it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const navigateStep = (next: AuthScreenStep) => {
    const previousStep = step;
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});
    setPassword('');
    setOtpCode('');
    if (step === 'verify_otp' && next !== 'verify_otp') {
      setVerificationPassword('');
      setAskVerificationPassword(false);
      exitPendingVerification();
    }
    setStep(next);
    triggerStepAnimation(previousStep, next);
  };

  const handleRegister = async () => {
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      const msg = 'Please enter your full name (at least 2 characters).';
      setFieldErrors({ name: 'Required' });
      setErrorBanner(msg);
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const msg = 'Please enter a valid email address.';
      setFieldErrors({ email: 'Invalid email' });
      setErrorBanner(msg);
      return;
    }
    const policy = evaluatePasswordPolicy(password);
    if (!policy.isValid) {
      const msg =
        'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
      setFieldErrors({ password: 'Weak password' });
      setErrorBanner(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        displayName: trimmedName,
        email: trimmedEmail,
        password,
      });
      setVerificationPassword(password);
      setAskVerificationPassword(false);
      setPassword('');
      setCooldownRemaining(res.resendCooldownSeconds);
      const verifyMsg = `We sent a 6-digit verification code to ${maskEmailAddress(res.email)}.`;
      setInfoBanner(verifyMsg);
      toast.info(verifyMsg, 'Verify Your Email');
      setStep('verify_otp');
      triggerStepAnimation('register', 'verify_otp');
    } catch (err) {
      // An unverified sign-up for this address was made moments ago: a code is
      // already on its way, so go straight to entering it instead of failing.
      if (err instanceof ApiError && err.errorCode === 'OTP_RESEND_COOLDOWN') {
        const retryAfter = Number(err.details?.retryAfterSeconds ?? 60);
        setVerificationPassword(password);
        setAskVerificationPassword(false);
        setPassword('');
        openPendingVerification(trimmedEmail, retryAfter);
        setCooldownRemaining(retryAfter);
        const msg = `A code was already sent to ${maskEmailAddress(trimmedEmail)}. Enter it below.`;
        setInfoBanner(msg);
        setStep('verify_otp');
        triggerStepAnimation('register', 'verify_otp');
        return;
      }
      const msg =
        err instanceof Error ? err.message : 'Registration failed.';
      setErrorBanner(msg);
      toast.error(msg, 'Registration Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const msg = 'Please enter a valid email address.';
      setFieldErrors({ email: 'Enter a valid email' });
      setErrorBanner(msg);
      return;
    }
    if (!password) {
      const msg = 'Please enter your password.';
      setFieldErrors({ password: 'Password required' });
      setErrorBanner(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      setPassword('');
      toast.success('Signed in to your Artha account.', 'Welcome Back');
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'EMAIL_NOT_VERIFIED') {
        setVerificationPassword(password);
        setAskVerificationPassword(false);
        setPassword('');
        setStep('verify_otp');
        triggerStepAnimation('login', 'verify_otp');
        const unverifiedMsg =
          'Your email is not verified yet. Enter your 6-digit code below.';
        setInfoBanner(unverifiedMsg);
        toast.warning(unverifiedMsg, 'Email Verification Required');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      setErrorBanner(msg);
      toast.error(msg, 'Sign In Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOtp = async () => {
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});

    const cleanCode = otpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      const msg = 'Please enter the 6-digit numeric verification code.';
      setFieldErrors({ otp: '6 digits required' });
      setErrorBanner(msg);
      return;
    }
    if (!verificationPassword) {
      const msg = 'Please enter your password to finish verifying your account.';
      setFieldErrors({ password: 'Password required' });
      setErrorBanner(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmEmailOtp({
        email: email.trim(),
        code: cleanCode,
        password: verificationPassword,
      });
      setOtpCode('');
      setVerificationPassword('');
      setAskVerificationPassword(false);
      toast.success(
        'Your email has been verified and your account is active.',
        'Account Verified',
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Verification failed.';
      setErrorBanner(msg);
      toast.error(msg, 'Verification Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownRemaining > 0) return;
    setErrorBanner(null);
    setInfoBanner(null);

    setIsSubmitting(true);
    try {
      const res = await resendVerificationOtp(email.trim());
      setCooldownRemaining(res.resendCooldownSeconds);
      const sentMsg = 'A fresh 6-digit verification code has been sent.';
      setInfoBanner(sentMsg);
      toast.info(sentMsg, 'Verification Code Sent');
    } catch (err) {
      if (err instanceof ApiError && err.details?.retryAfterSeconds) {
        setCooldownRemaining(Number(err.details.retryAfterSeconds));
      }
      const msg =
        err instanceof Error ? err.message : 'Could not resend code.';
      setErrorBanner(msg);
      toast.error(msg, 'Could Not Resend Code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const msg = 'Please enter a valid email address.';
      setFieldErrors({ email: 'Enter a valid email' });
      setErrorBanner(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmedEmail);
      const resetMsg =
        res.message ||
        'If an account is registered with that email, a 6-digit reset code has been sent.';
      setInfoBanner(resetMsg);
      toast.info(resetMsg, 'Reset Code Sent');
      setStep('reset_password');
      triggerStepAnimation('forgot_password', 'reset_password');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not request password reset.';
      setErrorBanner(msg);
      toast.error(msg, 'Password Reset Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorBanner(null);
    setInfoBanner(null);
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const msg = 'Please enter your account email address.';
      setFieldErrors({ email: 'Valid email required' });
      setErrorBanner(msg);
      return;
    }
    if (!/^\d{6}$/.test(resetToken.trim())) {
      const msg = 'Please enter the 6-digit reset code from your email.';
      setFieldErrors({ resetToken: '6 digits required' });
      setErrorBanner(msg);
      return;
    }
    const policy = evaluatePasswordPolicy(newPassword);
    if (!policy.isValid) {
      const msg =
        'New password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
      setFieldErrors({ password: 'Weak password' });
      setErrorBanner(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordReset({
        email: trimmedEmail,
        resetToken: resetToken.trim(),
        newPassword,
      });
      setResetToken('');
      setNewPassword('');
      setInfoBanner(res.message);
      toast.success(res.message, 'Password Updated');
      setStep('login');
      triggerStepAnimation('reset_password', 'login');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Password reset failed.';
      setErrorBanner(msg);
      toast.error(msg, 'Password Reset Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isSubmitting || isGoogleSubmitting) return;
    setErrorBanner(null);
    setInfoBanner(null);
    setIsGoogleSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res.cancelled) {
        // User cancellation remains silent without misleading errors
        return;
      }
      toast.success('Signed in with Google.', 'Welcome to Artha');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google sign-in failed.';
      toast.error(msg, 'Google Sign-In Failed');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleAppleSignInComingSoon = () => {
    toast.warning(
      'Apple Sign-In will be available in a future update.',
      'Coming Soon',
    );
  };

  const renderFeedbackBanners = () => (
    <>
      {errorBanner ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          testID="auth-error-banner"
        >
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
        </View>
      ) : null}

      {infoBanner ? (
        <View style={styles.infoBanner} testID="auth-info-banner">
          <Text style={styles.infoBannerText}>{infoBanner}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        step !== 'welcome' && {
          paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 4,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {step === 'welcome' ? (
        <SplashScreen
          showActions
          onGetStarted={() => navigateStep('register')}
          onLogin={() => navigateStep('login')}
          testID="welcome-screen"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentWrap,
              {
                opacity: fadeAnim,
                transform: [{ translateX: screenSlideX }],
              },
            ]}
          >

          {/* ============================================================== */}
          {/* 2. AUTHENTICATION FORM — LOGIN MODE                            */}
          {/* ============================================================== */}
          {step === 'login' && (
            <View style={styles.formScreenWrap} testID="login-screen">
              <AuthBrandHeader
                title="Welcome Back"
                subtitle="Please enter your details to sign in"
              />

              {renderFeedbackBanners()}

              <AuthFormInput
                label="Your Email Address"
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                errorText={fieldErrors.email}
                disabled={isSubmitting}
                testID="login-email-input"
              />

              <AuthFormInput
                label="Password"
                placeholder="••••••••"
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                passwordToggleTestID="toggle-password-visibility"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: null }));
                  }
                }}
                errorText={fieldErrors.password}
                disabled={isSubmitting}
                testID="login-password-input"
              />

              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  style={styles.forgotLinkBtn}
                  onPress={() => navigateStep('forgot_password')}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot Password?"
                  testID="login-forgot-password-btn"
                >
                  <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <AuthPrimaryButton
                label="Log In"
                onPress={handleLogin}
                loading={isSubmitting}
                testID="login-submit-btn"
              />

              <SocialAuthGroup
                onGooglePress={handleGoogleAuth}
                onApplePress={handleAppleSignInComingSoon}
                disabled={isSubmitting}
                googleLoading={isGoogleSubmitting}
                dividerLabel="OR"
                googleTestID="login-google-btn"
                appleTestID="login-apple-btn"
              />

              <TouchableOpacity
                style={styles.footerSwitchBtn}
                onPress={() => navigateStep('register')}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Don't have an account? Sign up"
                testID="login-to-register-btn"
              >
                <Text style={styles.footerSwitchPrompt}>
                  Don&apos;t have an account?{' '}
                  <Text style={styles.footerSwitchAction}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* 3. AUTHENTICATION FORM — SIGN UP MODE                          */}
          {/* ============================================================== */}
          {step === 'register' && (
            <View style={styles.formScreenWrap} testID="register-screen">
              <AuthBrandHeader
                title="Create Account"
                subtitle="Please enter your details to get started"
              />

              {renderFeedbackBanners()}

              <AuthFormInput
                label="Full Name"
                placeholder="Your full name"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: null }));
                  }
                }}
                errorText={fieldErrors.name}
                disabled={isSubmitting}
                testID="register-name-input"
              />

              <AuthFormInput
                label="Your Email Address"
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                errorText={fieldErrors.email}
                disabled={isSubmitting}
                testID="register-email-input"
              />

              <AuthFormInput
                label="Password"
                placeholder="••••••••"
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                passwordToggleTestID="register-toggle-password-visibility"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: null }));
                  }
                }}
                errorText={fieldErrors.password}
                helperText="Use 8+ characters with upper, lower, number & symbol."
                disabled={isSubmitting}
                testID="register-password-input"
              />

              <View style={styles.primaryActionSpacer}>
                <AuthPrimaryButton
                  label="Create Account"
                  onPress={handleRegister}
                  loading={isSubmitting}
                  testID="register-submit-btn"
                />
              </View>

              <SocialAuthGroup
                onGooglePress={handleGoogleAuth}
                onApplePress={handleAppleSignInComingSoon}
                disabled={isSubmitting}
                googleLoading={isGoogleSubmitting}
                dividerLabel="OR"
                googleTestID="register-google-btn"
                appleTestID="register-apple-btn"
              />

              <TouchableOpacity
                style={styles.footerSwitchBtn}
                onPress={() => navigateStep('login')}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Already have an account? Log in"
                testID="register-to-login-btn"
              >
                <Text style={styles.footerSwitchPrompt}>
                  Already have an account?{' '}
                  <Text style={styles.footerSwitchAction}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* 4. EMAIL OTP VERIFICATION                                      */}
          {/* ============================================================== */}
          {step === 'verify_otp' && (
            <View style={styles.formScreenWrap} testID="otp-verification-screen">
              <AuthBrandHeader
                title="Verify Your Email"
                subtitle={`Enter the 6-digit code sent to ${maskEmailAddress(email)}`}
              />

              {renderFeedbackBanners()}

              <AuthFormInput
                label="Verification Code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                centerText
                value={otpCode}
                onChangeText={(val) => {
                  setOtpCode(val.replace(/\D/g, ''));
                  if (fieldErrors.otp) {
                    setFieldErrors((prev) => ({ ...prev, otp: null }));
                  }
                }}
                errorText={fieldErrors.otp}
                disabled={isSubmitting}
                testID="otp-code-input"
              />

              {askVerificationPassword ? (
                <AuthFormInput
                  label="Password"
                  placeholder="••••••••"
                  isPassword
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  value={verificationPassword}
                  onChangeText={(text) => {
                    setVerificationPassword(text);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  errorText={fieldErrors.password}
                  disabled={isSubmitting}
                  testID="otp-password-input"
                />
              ) : null}

              <View style={styles.primaryActionSpacer}>
                <AuthPrimaryButton
                  label="Verify & Continue"
                  onPress={handleConfirmOtp}
                  loading={isSubmitting}
                  testID="otp-confirm-btn"
                />
              </View>

              <View style={styles.secondaryActionSpacer}>
                <AuthSecondaryButton
                  label={
                    cooldownRemaining > 0
                      ? `Resend code in ${cooldownRemaining}s`
                      : 'Resend verification code'
                  }
                  onPress={handleResendOtp}
                  disabled={isSubmitting || cooldownRemaining > 0}
                  testID="otp-resend-btn"
                />
              </View>

              <TouchableOpacity
                style={styles.footerSwitchBtn}
                onPress={() => navigateStep('login')}
                disabled={isSubmitting}
                testID="otp-back-to-login-btn"
              >
                <Text style={styles.footerSwitchAction}>
                  Back to Log in
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* 5. FORGOT PASSWORD REQUEST                                     */}
          {/* ============================================================== */}
          {step === 'forgot_password' && (
            <View style={styles.formScreenWrap} testID="forgot-password-screen">
              <AuthBrandHeader
                title="Reset Password"
                subtitle="Enter your email to receive a 6-digit reset code"
              />

              {renderFeedbackBanners()}

              <AuthFormInput
                label="Your Email Address"
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                errorText={fieldErrors.email}
                disabled={isSubmitting}
                testID="forgot-email-input"
              />

              <View style={styles.primaryActionSpacer}>
                <AuthPrimaryButton
                  label="Send Reset Code"
                  onPress={handleForgotPassword}
                  loading={isSubmitting}
                  testID="forgot-submit-btn"
                />
              </View>

              <View style={styles.secondaryActionSpacer}>
                <AuthSecondaryButton
                  label="I already have a reset code"
                  onPress={() => navigateStep('reset_password')}
                  disabled={isSubmitting}
                  testID="have-reset-token-btn"
                />
              </View>

              <TouchableOpacity
                style={styles.footerSwitchBtn}
                onPress={() => navigateStep('login')}
                disabled={isSubmitting}
              >
                <Text style={styles.footerSwitchAction}>Back to Log in</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* 6. CONFIRM PASSWORD RESET                                      */}
          {/* ============================================================== */}
          {step === 'reset_password' && (
            <View style={styles.formScreenWrap} testID="reset-password-screen">
              <AuthBrandHeader
                title="Set New Password"
                subtitle="Enter your 6-digit code and choose a new password"
              />

              {renderFeedbackBanners()}

              <AuthFormInput
                label="Your Email Address"
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                errorText={fieldErrors.email}
                disabled={isSubmitting}
                testID="reset-email-input"
              />

              <AuthFormInput
                label="Reset Code"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                centerText
                value={resetToken}
                onChangeText={(text) => {
                  setResetToken(text.replace(/\D/g, ''));
                  if (fieldErrors.resetToken) {
                    setFieldErrors((prev) => ({ ...prev, resetToken: null }));
                  }
                }}
                errorText={fieldErrors.resetToken}
                disabled={isSubmitting}
                testID="reset-token-input"
              />

              <AuthFormInput
                label="New Password"
                placeholder="••••••••"
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: null }));
                  }
                }}
                errorText={fieldErrors.password}
                helperText="Use 8+ characters with upper, lower, number & symbol."
                disabled={isSubmitting}
                testID="reset-new-password-input"
              />

              <View style={styles.primaryActionSpacer}>
                <AuthPrimaryButton
                  label="Update Password"
                  onPress={handleResetPassword}
                  loading={isSubmitting}
                  testID="reset-submit-btn"
                />
              </View>

              <TouchableOpacity
                style={styles.footerSwitchBtn}
                onPress={() => navigateStep('login')}
                disabled={isSubmitting}
              >
                <Text style={styles.footerSwitchAction}>Back to Log in</Text>
              </TouchableOpacity>
            </View>
          )}
          </Animated.View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const makeStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
      position: 'relative',
    },
    welcomeFullScreen: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: c.background,
      justifyContent: 'space-between',
    },
    welcomeUpperBody: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeWaveBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    },
    welcomeCenterOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeCenterBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 56,
    },
    welcomeLogoTile: {
      width: 88,
      height: 88,
      borderRadius: 24,
      marginBottom: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeBrandName: {
      fontSize: 40,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
      textAlign: 'center',
      fontFamily: Platform.select({
        ios: 'AvenirNext-Bold',
        android: 'sans-serif-medium',
        default: 'System',
      }),
    },
    welcomeTagline: {
      marginTop: 8,
      fontSize: 14.5,
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    welcomeBottomContainer: {
      width: '100%',
      maxWidth: 448,
      alignSelf: 'center',
      paddingHorizontal: spacing.xxl,
    },
    welcomeBottomActions: {
      width: '100%',
      paddingBottom: spacing.sm,
    },
    welcomeLoginLink: {
      minHeight: 44,
      marginTop: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeLoginPrompt: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? c.textSecondary : '#031D44',
    },
    welcomeLoginAction: {
      fontSize: 14,
      fontWeight: '800',
      color: isDark ? c.accent : '#031D44',
      textDecorationLine: 'underline',
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl,
      justifyContent: 'center',
    },
    contentWrap: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      justifyContent: 'center',
    },
    formScreenWrap: {
      width: '100%',
      paddingVertical: spacing.md,
    },
    errorBanner: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : c.negativeBg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.28)',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    errorBannerText: {
      color: c.negative,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 18,
    },
    infoBanner: {
      backgroundColor: isDark ? 'rgba(245, 138, 7, 0.1)' : c.surfacePaleBlue,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 138, 7, 0.25)' : 'rgba(10, 40, 85, 0.14)',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    infoBannerText: {
      color: isDark ? c.textPrimary : '#031D44',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 18,
    },
    forgotPasswordRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: -4,
      marginBottom: spacing.xl,
    },
    forgotLinkBtn: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    forgotLinkText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? c.accent : '#031D44',
      textDecorationLine: 'underline',
    },
    primaryActionSpacer: {
      marginTop: spacing.xs,
    },
    secondaryActionSpacer: {
      marginTop: spacing.md,
    },
    footerSwitchBtn: {
      minHeight: 44,
      marginTop: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerSwitchPrompt: {
      fontSize: 13.5,
      fontWeight: '500',
      color: c.textSecondary,
    },
    footerSwitchAction: {
      fontSize: 13.5,
      fontWeight: '700',
      color: isDark ? c.accent : '#031D44',
      textDecorationLine: 'underline',
    },
  });
