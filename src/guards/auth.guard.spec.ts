import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { FirebaseService } from '../config/firebase/firebase.service';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let firebaseService: FirebaseService;
  let verifyIdTokenMock: jest.Mock;

  const mockVerifyIdToken = jest.fn();
  const mockFirebaseService = {
    getAuth: jest.fn().mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    }),
  };

  // Create a mock HTTP arguments host with a getRequest function
  const mockHttpArgumentsHost = {
    getRequest: jest.fn(),
  };

  // Create an execution context that properly returns the HTTP arguments host
  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
    getType: jest.fn().mockReturnValue('http'),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    verifyIdTokenMock = mockVerifyIdToken;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return false if no token is provided', async () => {
      // Set up the request mock to return a request with no authorization header
      mockHttpArgumentsHost.getRequest.mockReturnValue({
        headers: {},
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
    });

    it('should return true with valid token', async () => {
      // Set up the request mock to return a request with an authorization header
      mockHttpArgumentsHost.getRequest.mockReturnValue({
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const mockDecodedToken = { uid: '123', email: 'test@example.com' };
      verifyIdTokenMock.mockResolvedValue(mockDecodedToken);

      const result = await guard.canActivate(mockExecutionContext);

      expect(verifyIdTokenMock).toHaveBeenCalledWith('valid-token');
      expect(result).toBe(true);
    });

    it('should return false with invalid token', async () => {
      mockHttpArgumentsHost.getRequest.mockReturnValue({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      verifyIdTokenMock.mockRejectedValue(new Error('Invalid token'));

      const result = await guard.canActivate(mockExecutionContext);

      expect(verifyIdTokenMock).toHaveBeenCalledWith('invalid-token');
      expect(result).toBe(false);
    });

    it('should attach user to request when token is valid', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        user: undefined,
      };

      mockHttpArgumentsHost.getRequest.mockReturnValue(mockRequest);

      const mockDecodedToken = { uid: '123', email: 'test@example.com' };
      verifyIdTokenMock.mockResolvedValue(mockDecodedToken);

      await guard.canActivate(mockExecutionContext);

      expect(mockRequest.user).toEqual(mockDecodedToken);
    });
  });
});
