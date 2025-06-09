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
  UploadedFile,
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
  @Post(':id/like')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Curtir/descurtir publicação' })
  @ApiResponse({ status: 200, description: 'Like processado com sucesso' })
  async toggleLike(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Publication> {
    const user = request.user;

    try {
      return await this.publicationService.toggleLike(id, user.uid);
    } catch (error) {
      this.logger.error(`Erro ao processar like: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/comment')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Comentar em publicação' })
  @ApiResponse({ status: 200, description: 'Comentário adicionado com sucesso' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: { text: string },
    @Req() request: Request,
  ): Promise<Publication> {
    const user = request.user;

    try {
      return await this.publicationService.addComment(id, user.uid, user, dto.text);
    } catch (error) {
      this.logger.error(`Erro ao comentar: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Buscar comentários de uma publicação' })
  @ApiResponse({ status: 200, description: 'Lista de comentários' })
  async getComments(@Param('id') id: string): Promise<any[]> {
    try {
      return await this.publicationService.getComments(id);
    } catch (error) {
      this.logger.error(`Erro ao buscar comentários: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/comments/:commentId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Deletar comentário (apenas autor do comentário)' })
  @ApiResponse({ status: 200, description: 'Comentário deletado com sucesso' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  async deleteComment(
    @Param('id') publicationId: string,
    @Param('commentId') commentId: string,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    const user = request.user;

    try {
      await this.publicationService.deleteComment(publicationId, commentId, user.uid);
      return { message: 'Comentário deletado com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao deletar comentário: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/fix-comments')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Corrigir contador de comentários de uma publicação' })
  @ApiResponse({ status: 200, description: 'Contador corrigido' })
  async fixCommentsCounter(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.publicationService.fixCommentsCounter(id);
      return { message: 'Contador de comentários corrigido com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao corrigir contador: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthGuard)
  @Post('fix-all-comments')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Corrigir contadores de comentários de todas as publicações' })
  @ApiResponse({ status: 200, description: 'Contadores corrigidos' })
  async fixAllCommentsCounters(): Promise<{ message: string }> {
    try {
      await this.publicationService.fixAllCommentsCounters();
      return { message: 'Todos os contadores corrigidos com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao corrigir contadores: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
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