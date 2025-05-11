import {
    Controller, Get, Post, Body, Param, Delete, Put, Query, HttpException, HttpStatus,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
  import { CreateAnimalDto } from '../../dto/create-animal.dto';
  import { UpdateAnimalDto } from '../../dto/update-animal.dto';
  import { Animal } from '../../models/animal.model';
import { AnimalService } from 'src/services/animais/animal.service';
  
  @Controller('animais')
  @ApiTags('animais')
  export class AnimalController {
    constructor(private readonly animalService: AnimalService) {}
  
    @Post()
    @ApiOperation({ summary: 'Cadastrar novo animal (apenas abrigo)' })
    @ApiResponse({ status: 201, description: 'Animal cadastrado com sucesso' })
    async create(@Body() dto: CreateAnimalDto): Promise<Animal> {
      return this.animalService.create(dto);
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
    @ApiOperation({ summary: 'Atualizar animal' })
    async update(
      @Param('id') id: string,
      @Body() dto: UpdateAnimalDto
    ): Promise<Animal> {
      return this.animalService.update(id, dto);
    }
    
  
    @Delete(':id')
    @ApiOperation({ summary: 'Remover animal' })
    async remove(@Param('id') id: string): Promise<void> {
      return this.animalService.remove(id);
    }
  }
  