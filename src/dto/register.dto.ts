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
    description: 'Nome de exibição',
    example: 'João Silva',
    required: false,
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    description: 'Tipo de usuário',
    enum: UserType,
    example: UserType.ADOTANTE,
  })
  @IsEnum(UserType, {
    message: 'userType must be either "adotante" or "abrigo"',
  })
  userType: UserType;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11) 98765-4321',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Endereço do usuário',
    example: 'Rua Exemplo, 123',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;
}
