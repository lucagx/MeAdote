import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Logger,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { CreatePublicationDto } from 'src/dto/create-publicacao.dto';
import type { UpdatePublicationDto } from 'src/dto/update-publicacao.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import type { Publication } from 'src/models/publicacao.model';
import { PublicationService } from 'src/services/publicacoes/publicacao.service';
import { StorageService } from 'src/services/storage/storage.service';

// Interface para arquivos do Multer
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

@Controller('publications')
@ApiTags('publications')
export class PublicationController {
  private readonly logger = new Logger(PublicationController.name);

  constructor(
    private readonly publicationService: PublicationService,
    private readonly storageService: StorageService,
  ) { }

  @UseGuards(AuthGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar nova publicação de adoção' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5)) // Máximo 5 arquivos
  @ApiResponse({ status: 201, description: 'Publicação criada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async create(
    @Body() dto: CreatePublicationDto,
    @UploadedFiles() files: UploadedFile[],
    @Req() request: Request,
  ): Promise<Publication> {
    const user = request.user;
    this.logger.log(`Criando publicação para usuário: ${user.email}`);

    try {
      let mediaUrls: string[] = [];

      // Upload dos arquivos se houver
      if (files && files.length > 0) {
        this.logger.log(`Fazendo upload de ${files.length} arquivos`);
        const uploadPromises = files.map((file) =>
          this.storageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
          ),
        );
        mediaUrls = await Promise.all(uploadPromises);
      }

      // Criar DTO com URLs das mídias
      const publicationData = {
        ...dto,
        media: mediaUrls,
      };

      return await this.publicationService.create(publicationData, user.uid, user);
    } catch (error) {
      this.logger.error(`Erro ao criar publicação: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as publicações ativas (feed público)',
  })
  @ApiResponse({ status: 200, description: 'Lista de publicações' })
  async findAll(): Promise<Publication[]> {
    this.logger.log('Buscando todas as publicações para o feed');
    try {
      return await this.publicationService.findAll();
    } catch (error) {
      this.logger.error(`Erro ao buscar publicações: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Get('my')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar minhas publicações' })
  @ApiResponse({ status: 200, description: 'Lista das minhas publicações' })
  async findMy(@Req() request: Request): Promise<Publication[]> {
    const user = request.user;
    this.logger.log(`Buscando publicações do usuário: ${user.email}`);

    try {
      return await this.publicationService.findByUser(user.uid);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar publicações do usuário: ${error.message}`,
      );
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar publicação por ID' })
  @ApiResponse({ status: 200, description: 'Publicação encontrada' })
  @ApiResponse({ status: 404, description: 'Publicação não encontrada' })
  async findOne(@Param('id') id: string): Promise<Publication> {
    this.logger.log(`Buscando publicação: ${id}`);

    try {
      const publication = await this.publicationService.findOne(id);
      if (!publication) {
        throw new HttpException(
          'Publicação não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }
      return publication;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Erro ao buscar publicação: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar publicação (apenas autor)' })
  @ApiResponse({ status: 200, description: 'Publicação atualizada' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicationDto,
    @Req() request: Request,
  ): Promise<Publication> {
    const user = request.user;
    this.logger.log(`Atualizando publicação ${id} pelo usuário: ${user.email}`);

    try {
      return await this.publicationService.update(id, dto, user.uid);
    } catch (error) {
      this.logger.error(`Erro ao atualizar publicação: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remover publicação (apenas autor)' })
  @ApiResponse({ status: 200, description: 'Publicação removida' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  async remove(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<void> {
    const user = request.user;
    this.logger.log(`Removendo publicação ${id} pelo usuário: ${user.email}`);

    try {
      return await this.publicationService.remove(id, user.uid);
    } catch (error) {
      this.logger.error(`Erro ao remover publicação: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }
}