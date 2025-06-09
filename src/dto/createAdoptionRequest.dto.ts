import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsEmail, IsOptional } from 'class-validator';

export class CreateAdoptionRequestDto {
  @ApiProperty({ description: 'ID da publicação' })
  @IsString()
  @IsNotEmpty()
  publicationId: string;

  @ApiProperty({ description: 'Email do autor da publicação' })
  @IsEmail()
  @IsNotEmpty()
  publicationAuthorEmail: string;

  @ApiProperty({ description: 'Texto da publicação' })
  @IsString()
  @IsOptional()
  publicationText?: string;

  @ApiProperty({ description: 'Informações do solicitante' })
  @IsObject()
  @IsNotEmpty()
  requesterInfo: {
    nome: string;
    telefone: string;
    email: string;
    disponibilidade: string;
    experiencia: string;
    moradia: string;
    motivacao: string;
  };
}