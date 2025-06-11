import {
  Controller, Get, Post, Body, Param, Delete, Put, Query, HttpException, HttpStatus,
  UseInterceptors, UploadedFile, UseGuards, Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAnimalDto } from '../../dto/create-animal.dto';
import { UpdateAnimalDto } from '../../dto/update-animal.dto';
import { Animal } from '../../models/animal.model';
import { AnimalService } from './animal.service';
import { StorageService } from '../storage/storage.service';
import { AuthGuard } from '../../guards/auth.guard';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Controller('animais')
@ApiTags('animais')
export class AnimalController {
  constructor(
    private readonly animalService: AnimalService,
    private readonly storageService: StorageService
  ) { }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cadastrar novo animal' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Animal cadastrado com sucesso' })
  @UseInterceptors(FileInterceptor('foto'))
  async create(
    @Body() dto: CreateAnimalDto,
    @UploadedFile() file: UploadedFile,
    @Req() request: any
  ): Promise<Animal> {
    try {
      let fotoUrl: string | undefined;

      // Upload da foto se fornecida
      if (file) {
        if (!file.mimetype.startsWith('image/')) {
          throw new HttpException('Apenas arquivos de imagem são permitidos', HttpStatus.BAD_REQUEST);
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
          throw new HttpException('Arquivo muito grande. Máximo 5MB', HttpStatus.BAD_REQUEST);
        }

        fotoUrl = await this.storageService.uploadFile(
          file.buffer,
          `pets/${Date.now()}_${file.originalname}`
        );
      }

      // Criar animal com foto e authorId
      const animalData: CreateAnimalDto & { authorId: string } = {
        nome: dto.nome,
        especie: dto.especie,
        raca: dto.raca,
        idade: parseInt(String(dto.idade)), // Garantir conversão para número
        porte: dto.porte as any,
        localizacao: dto.localizacao,
        abrigoId: dto.abrigoId,
        abrigoNome: dto.abrigoNome,
        descricao: dto.descricao,
        foto: fotoUrl,
        // Converter strings para boolean adequadamente
        vacinado: String(dto.vacinado) === 'true' || dto.vacinado === true,
        castrado: String(dto.castrado) === 'true' || dto.castrado === true,
        // Adicionar o ID do usuário que está cadastrando
        authorId: request.user.uid,
      };

      return this.animalService.create(animalData);
    } catch (error) {
      throw new HttpException(
        `Erro ao cadastrar animal: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar animais com filtros' })
  @ApiQuery({ name: 'especie', required: false })
  @ApiQuery({ name: 'raca', required: false })
  @ApiQuery({ name: 'porte', required: false })
  @ApiQuery({ name: 'localizacao', required: false })
  async findAll(@Query() query: Partial<Animal>): Promise<Animal[]> {
    return this.animalService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar animal por ID' })
  async findOne(@Param('id') id: string): Promise<Animal> {
    const animal = await this.animalService.findOne(id);
    if (!animal) {
      throw new HttpException('Animal não encontrado', HttpStatus.NOT_FOUND);
    }
    return animal;
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar animal' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('foto'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
    @UploadedFile() file: UploadedFile
  ): Promise<Animal> {
    try {
      let updateData = { ...dto };

      // Upload nova foto se fornecida
      if (file) {
        if (!file.mimetype.startsWith('image/')) {
          throw new HttpException('Apenas arquivos de imagem são permitidos', HttpStatus.BAD_REQUEST);
        }

        const fotoUrl = await this.storageService.uploadFile(
          file.buffer,
          `pets/${Date.now()}_${file.originalname}`
        );

        updateData = { ...updateData, foto: fotoUrl };
      }

      return this.animalService.update(id, updateData);
    } catch (error) {
      throw new HttpException(
        `Erro ao atualizar animal: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remover animal' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.animalService.remove(id);
  }
}