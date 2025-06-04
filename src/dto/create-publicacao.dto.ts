import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePublicationDto {
  @ApiProperty({
    description: 'Texto da publicação descrevendo o animal',
    example: 'Lindo gatinho procura um lar amoroso... miau miau caralho!!',
  })
  @IsString()
  text: string;

  // @ApiProperty({
  //   description: 'Arquivos de mídia (máximo 5)',
  //   type: 'array',
  //   items: {
  //     type: 'string',
  //     format: 'binary',
  //   },
  //   required: false,
  // })
  // @IsOptional()
  // files?: any[];

  @ApiProperty({
    description: 'URLs das mídias (usado internamente)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  media?: string[];
}