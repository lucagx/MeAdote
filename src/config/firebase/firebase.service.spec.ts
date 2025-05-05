import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

const mockAuth = {
  verifyIdToken: jest.fn(),
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  createCustomToken: jest.fn(),
};

const mockFirestore = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      set: jest.fn(),
    }),
  }),
};

const mockStorage = {
  bucket: jest.fn(),
};

const mockApp = {
  auth: jest.fn().mockReturnValue(mockAuth),
  firestore: jest.fn().mockReturnValue(mockFirestore),
  storage: jest.fn().mockReturnValue(mockStorage),
};

// Store mock implementation in a separate object to avoid variable hoisting issues
const mockAdminSdk = {
  initializeApp: jest.fn().mockReturnValue(mockApp),
  credential: {
    cert: jest.fn(),
  },
  // Important: We need to track if app has been called with 'me-adote-app'
  _appCalled: false,
  app: jest.fn(),
};

// Configure the app mock to work correctly - but do it outside the variable declaration
mockAdminSdk.app.mockImplementation((name) => {
  if (!name) {
    return mockApp;
  }

  if (name === 'me-adote-app') {
    // Always throw error for 'me-adote-app' in the test
    // This forces initializeApp to be called
    throw new Error('App not found');
  }

  throw new Error('Invalid app name');
});

// Jest mock using our pre-configured mockAdminSdk
jest.mock('firebase-admin', () => mockAdminSdk);

// Import after mocking
import * as admin from 'firebase-admin';

import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;

  const mockConfig: Record<string, string> = {
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_PRIVATE_KEY_ID: 'privateKeyId',
    FIREBASE_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\nMOCKED_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
    FIREBASE_CLIENT_EMAIL: 'test@example.com',
    FIREBASE_CLIENT_ID: '123456',
    FIREBASE_AUTH_URI: 'https://example.com/auth',
    FIREBASE_TOKEN_URI: 'https://example.com/token',
    FIREBASE_AUTH_PROVIDER_CERT_URL: 'https://example.com/cert',
    FIREBASE_CLIENT_CERT_URL: 'https://example.com/client-cert',
  };

  const mockConfigService = {
    get: jest.fn((key: keyof typeof mockConfig): string => mockConfig[key]),
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FirebaseService>(FirebaseService);

    // Initialize service for testing
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize firebase app with correct credentials', () => {
    // Now verify initializeApp was called after onModuleInit
    expect(mockAdminSdk.initializeApp).toHaveBeenCalled();
    expect(mockAdminSdk.credential.cert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project',
        privateKeyId: 'privateKeyId',
        privateKey: expect.stringContaining('MOCKED_PRIVATE_KEY'),
        clientEmail: 'test@example.com',
      }),
    );
  });

  describe('getFirestore', () => {
    it('should return firestore instance', () => {
      const result = service.getFirestore();
      expect(result).toBeDefined();
      expect(mockApp.firestore).toHaveBeenCalled();
    });
  });

  describe('getAuth', () => {
    it('should return auth instance', () => {
      const result = service.getAuth();
      expect(result).toBeDefined();
      expect(mockApp.auth).toHaveBeenCalled();
    });
  });

  describe('getStorage', () => {
    it('should return storage instance', () => {
      const result = service.getStorage();
      expect(result).toBeDefined();
      expect(mockApp.storage).toHaveBeenCalled();
    });
  });
});
