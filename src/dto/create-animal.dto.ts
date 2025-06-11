import { IsString, IsInt, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Porte {
  PEQUENO = 'pequeno',
  MEDIO = 'médio',
  GRANDE = 'grande',
}

export class CreateAnimalDto {
  @ApiProperty({ description: 'Nome do animal' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Espécie do animal' })
  @IsString()
  especie: string;

  @ApiProperty({ description: 'Raça do animal' })
  @IsString()
  raca: string;

  @ApiProperty({ description: 'Idade do animal em anos' })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  idade: number;

  @ApiProperty({ enum: Porte, description: 'Porte do animal' })
  @IsEnum(Porte)
  porte: Porte;

  @ApiProperty({ description: 'Localização do animal' })
  @IsString()
  localizacao: string;

  @ApiProperty({ description: 'ID do abrigo/ONG' })
  @IsString()
  abrigoId: string;

  @ApiProperty({ description: 'Nome do abrigo/ONG', required: false })
  @IsOptional()
  @IsString()
  abrigoNome?: string;

  @ApiProperty({ description: 'Descrição do animal', required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ description: 'URL da foto do animal', required: false })
  @IsOptional()
  @IsString()
  foto?: string;

  @ApiProperty({ description: 'Se o animal é vacinado', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  vacinado?: boolean;

  @ApiProperty({ description: 'Se o animal é castrado', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  castrado?: boolean;
}