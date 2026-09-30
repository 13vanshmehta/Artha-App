/* eslint-env jest */

const mockKeychainStore = new Map();

jest.mock('react-native-keychain', () => {
  return {
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
      WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
        'AccessibleWhenPasscodeSetThisDeviceOnly',
    },
    ACCESS_CONTROL: {
      BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
      BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
      DEVICE_PASSCODE: 'DevicePasscode',
    },
    AUTHENTICATION_TYPE: {
      DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
      BIOMETRICS: 'AuthenticationWithBiometrics',
    },
    BIOMETRY_TYPE: {
      FACE_ID: 'FaceID',
      TOUCH_ID: 'TouchID',
      FINGERPRINT: 'Fingerprint',
    },
    setGenericPassword: jest.fn(async (username, password, options) => {
      const service = options?.service || 'default';
      mockKeychainStore.set(service, { username, password });
      return { service, storage: 'keychain' };
    }),
    getGenericPassword: jest.fn(async (options) => {
      const service = options?.service || 'default';
      const entry = mockKeychainStore.get(service);
      if (!entry) return false;
      return {
        username: entry.username,
        password: entry.password,
        service,
        storage: 'keychain',
      };
    }),
    resetGenericPassword: jest.fn(async (options) => {
      const service = options?.service || 'default';
      mockKeychainStore.delete(service);
      return true;
    }),
    getSupportedBiometryType: jest.fn(async () => 'FaceID'),
    __clearStore: () => mockKeychainStore.clear(),
    __getStore: () => mockKeychainStore,
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({
      type: 'success',
      data: { idToken: 'mock-google-id-token' },
    })),
    signOut: jest.fn(async () => null),
  },
  isCancelledResponse: (response) => response?.type === 'cancelled',
  isSuccessResponse: (response) => response?.type === 'success',
  isErrorWithCode: (error) =>
    Boolean(error && typeof error === 'object' && 'code' in error),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: true,
    Operation: {
      LOGIN: 1,
    },
    Scope: {
      EMAIL: 0,
      FULL_NAME: 1,
    },
    Error: {
      CANCELED: '1001',
    },
    performRequest: jest.fn(async () => ({
      identityToken: 'mock-apple-identity-token',
      fullName: { givenName: 'Vansh', familyName: 'Mehta' },
    })),
  },
}));
