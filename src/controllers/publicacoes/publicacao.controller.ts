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
import { CreatePublicationDto } from 'src/dto/create-publicacao.dto';
import { UpdatePublicationDto } from 'src/dto/update-publicacao.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { Publication } from 'src/models/publicacao.model';
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

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar nova publicação de adoção' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5)) // Máximo 5 arquivos
  async create(
    @Body() dto: CreatePublicationDto,
    @UploadedFiles() files: UploadedFile[],
    @Req() request: Request,
  ): Promise<Publication> {
    const user = request.user;

    try {
      let mediaUrls: string[] = [];

      // Upload dos arquivos se houver
      if (files && files.length > 0) {
        const uploadPromises = files.map((file) =>
          this.storageService.uploadFile(
            file.buffer,
            file.originalname,
            // file.mimetype,
          ),
        );
        mediaUrls = await Promise.all(uploadPromises);
      }

      // Criar DTO com URLs das mídias
      const publicationData: CreatePublicationDto = {
        text: dto.text,
        media: mediaUrls,
      };

      const result = await this.publicationService.create(publicationData, user.uid, user);

      return result;

    } catch (error) {
      this.logger.error(`Erro ao criar publicação: ${error.message}`);
      throw new HttpException(
        `Erro ao criar publicação: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as publicações ativas (feed público)',
  })
  @ApiResponse({ status: 200, description: 'Lista de publicações' })
  async findAll(): Promise<Publication[]> {
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

    try {
      return await this.publicationService.remove(id, user.uid);
    } catch (error) {
      this.logger.error(`Erro ao remover publicação: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }
}