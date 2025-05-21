import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserType {
  ADOTANTE = 'adotante',
  ABRIGO = 'abrigo',
}

export class RegisterDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João',
    required: false,
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiProperty({
    description: 'Sobrenome do usuário',
    example: 'Silva',
    required: false,
  })
  @IsString()
  @IsOptional()
  sobrenome?: string;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11) 98765-4321',
    required: false,
  })
  @IsString()
  @IsOptional()
  telefone?: string;

  @ApiProperty({
    description: 'Tipo de usuário',
    enum: UserType,
    example: UserType.ADOTANTE,
    required: false,
  })
  @IsEnum(UserType, {
    message: 'userType must be either "adotante" or "abrigo"',
  })
  @IsOptional()
  userType?: UserType;

  @ApiProperty({
    description: 'Nome de exibição',
    example: 'João Silva',
    required: false,
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    description: 'Endereço do usuário',
    example: 'Rua Exemplo, 123',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;
}
