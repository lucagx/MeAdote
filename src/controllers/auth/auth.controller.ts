import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Get,
  Put,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RegisterDto } from '../../dto/register.dto';
import { User } from '../../models/user.model';
import { LoginDto } from '../../dto/login.dto';
import { AuthService } from '../../services/auth/auth.service';
import { AuthGuard } from '../../guards/auth.guard';
import { SocialLoginDto } from '../../dto/social-login.dto';

declare module 'express' {
  export interface Request {
    user?: any;
  }
}

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Registrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const { email, password, ...userData } = registerDto;
      const user = await this.authService.registrar(
        email,
        password,
        userData as Partial<User>,
      );
      return user;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao cadastrar usuário';
      this.logger.error(
        `Erro ao registrar usuário ${registerDto.email}: ${errorMessage}`,
      );
      throw new HttpException(errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Autenticar um usuário' })
  @ApiResponse({ status: 200, description: 'Autenticação bem-sucedida' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    try {

      if (!loginDto.email || typeof loginDto.email !== 'string') {
        throw new Error('Email inválido ou ausente');
      }
      const result = await this.authService.login(loginDto.email);
      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Erro no login para ${loginDto.email}: ${error instanceof Error ? error.message : error}`,
      );
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('social-login')
  @ApiOperation({ summary: 'Autenticar um usuário com login social' })
  @ApiResponse({ status: 200, description: 'Autenticação bem-sucedida' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async socialLogin(
    @Body() socialLoginDto: SocialLoginDto,
  ): Promise<{ user: User }> {
    try {
      const { token, provider } = socialLoginDto;
      const userRecord = await this.authService.validarSocialToken(
        token,
        provider,
      );
      return { user: userRecord };
    } catch (error: unknown) {
      this.logger.error(
        `Falha na autenticação social: ${error instanceof Error ? error.message : error}`,
      );
      throw new HttpException(
        'Falha na autenticação social',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @UseGuards(AuthGuard)
  @Post('verify-token')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verificar token de autenticação' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  verifyToken(@Req() request: Request) {
    // O token já foi verificado pelo AuthGuard
    return { user: request.user as User };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async getProfile(@Req() request: Request) {
    return { user: request.user as User };
  }

  @UseGuards(AuthGuard)
  @Put('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar dados do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  async updateProfile(@Req() request: Request, @Body() update: Partial<User>) {
    const uid = (request.user as User).uid;
    try {
      const db = this.authService['firebaseService'].getFirestore();
      await db.collection('users').doc(uid).update(update);
      const userDoc = await db.collection('users').doc(uid).get();
      return { user: userDoc.data() };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar perfil do usuário ${uid}: ${error instanceof Error ? error.message : error}`,
      );
      throw new HttpException(
        'Erro ao atualizar perfil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
