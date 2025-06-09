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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from '../../services/auth/auth.service';
import { StorageService } from '../../services/storage/storage.service';
import { AuthGuard } from '../../guards/auth.guard';
import type { User } from '../../models/user.model';
import { LoginDto } from '../../dto/login.dto';
import { SocialLoginDto } from '../../dto/social-login.dto';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

declare module 'express' {
  export interface Request {
    user?: any;
  }
}

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
  ) { }

  @Post('register')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @UseGuards(AuthGuard)
  async register(@Req() request: Request, @Body() userData: any) {
    const user = request.user;

    try {
      const newUser = await this.authService.createUser({
        uid: user.uid,
        email: user.email,
        ...userData,
      });

      return {
        message: 'Usuário registrado com sucesso',
        user: newUser,
      };
    } catch (error) {
      this.logger.error(`Erro ao registrar usuário: ${error.message}`);
      throw new HttpException(
        'Erro ao registrar usuário',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @UseGuards(AuthGuard)
  async getMe(@Req() request: Request) {
    const user = request.user;

    try {
      const userData = await this.authService.getUserByUid(user.uid);
      return { user: userData };
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário: ${error.message}`);
      throw new HttpException(
        'Usuário não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados atualizados com sucesso' })
  @UseGuards(AuthGuard)
  async updateMe(@Req() request: Request, @Body() updateData: any) {
    const user = request.user;

    try {
      const updatedUser = await this.authService.updateUser(user.uid, updateData);
      return {
        message: 'Dados atualizados com sucesso',
        user: updatedUser,
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar usuário: ${error.message}`);
      throw new HttpException(
        'Erro ao atualizar dados',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('profile-photo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload de foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Foto de perfil atualizada com sucesso' })
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('profilePhoto'))
  async uploadProfilePhoto(
    @UploadedFile() file: UploadedFile,
    @Req() request: Request,
  ) {
    const user = request.user;

    try {
      if (!file) {
        throw new HttpException('Nenhum arquivo foi enviado', HttpStatus.BAD_REQUEST);
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new HttpException('Apenas arquivos de imagem são permitidos', HttpStatus.BAD_REQUEST);
      }

      const photoUrl = await this.storageService.uploadFile(
        file.buffer,
        `profile_${user.uid}_${file.originalname}`,
      );

      const updatedUser = await this.authService.updateUser(user.uid, {
        profilePhoto: photoUrl,
      });

      return {
        message: 'Foto de perfil atualizada com sucesso',
        profilePhoto: photoUrl,
        user: updatedUser,
      };

    } catch (error) {
      this.logger.error(`Erro ao fazer upload da foto de perfil: ${error.message}`);
      throw new HttpException(
        'Erro ao fazer upload da foto de perfil',
        HttpStatus.BAD_REQUEST,
      );
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
}
