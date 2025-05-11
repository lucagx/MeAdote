import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Porte {
  PEQUENO = 'pequeno',
  MEDIO = 'médio',
  GRANDE = 'grande',
}

export class CreateAnimalDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty()
  @IsString()
  especie: string;

  @ApiProperty()
  @IsString()
  raca: string;

  @ApiProperty()
  @IsInt()
  idade: number;

  @ApiProperty({ enum: Porte })
  @IsEnum(Porte)
  porte: Porte;

  @ApiProperty()
  @IsString()
  localizacao: string;

  @ApiProperty()
  @IsString()
  abrigoId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;
}
