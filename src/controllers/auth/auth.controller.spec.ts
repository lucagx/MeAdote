import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../../services/auth/auth.service';
import { AuthGuard } from '../../guards/auth.guard';
import { FirebaseService } from '../../config/firebase/firebase.service';

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock de AuthService
  const mockAuthService = {
    registrar: jest.fn(),
    login: jest.fn(),
    validarToken: jest.fn(),
  };

  const mockFirebaseService = {
    getAuth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn(),
      createUser: jest.fn(),
      getUserByEmail: jest.fn(),
      createCustomToken: jest.fn(),
    }),
    getFirestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue(true),
        }),
      }),
    }),
  };

  // Mock do ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock do request com usuário autenticado
  const mockRequest = {
    user: { uid: '123', email: 'test@example.com', name: 'Test User' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        AuthGuard,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      userType: 'adotante' as const,
      phone: '123456789',
      address: 'Test Address',
    };

    it('should register a new user successfully', async () => {
      const uid = 'new-user-id';
      mockAuthService.registrar.mockResolvedValue(uid);

      const result = await controller.register(registerDto);

      expect(mockAuthService.registrar).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        {
          displayName: registerDto.displayName,
          userType: registerDto.userType,
          phone: registerDto.phone,
          address: registerDto.address,
        },
      );
      expect(result).toEqual({ uid });
    });

    it('should throw HttpException when registration fails', async () => {
      const errorMessage = 'Email already in use';
      mockAuthService.registrar.mockRejectedValue(new Error(errorMessage));

      await expect(controller.register(registerDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return token and user data on successful login', async () => {
      const loginResponse = {
        token: 'valid-token',
        user: {
          uid: '123',
          email: 'test@example.com',
        },
      };
      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto.email);
      expect(result).toEqual(loginResponse);
    });

    it('should throw HttpException when login fails', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(HttpException);
    });
  });

  describe('verifyToken', () => {
    it('should return user data from request', () => {
      const result = controller.verifyToken(mockRequest as unknown as Request);
      expect(result).toEqual({ user: mockRequest.user });
    });
  });

  describe('socialLogin', () => {
    const socialLoginDto = {
      token: 'valid-social-token',
      provider: 'google' as const,
    };

    it('should authenticate user with social provider', async () => {
      const mockUser = { uid: 'social-uid', email: 'social@example.com' };
      mockAuthService.validarSocialToken = jest
        .fn()
        .mockResolvedValue(mockUser);

      const result = await controller.socialLogin(socialLoginDto);

      expect(mockAuthService.validarSocialToken).toHaveBeenCalledWith(
        socialLoginDto.token,
        socialLoginDto.provider,
      );
      expect(result).toEqual({ user: mockUser });
    });

    it('should throw HttpException when social authentication fails', async () => {
      mockAuthService.validarSocialToken = jest
        .fn()
        .mockRejectedValue(new Error('Invalid token'));

      await expect(controller.socialLogin(socialLoginDto)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
