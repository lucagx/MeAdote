import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsJWT, IsNotEmpty } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({
    description: 'Token de autenticação do provedor social (Google/Facebook)',
    example:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.ewogImlzcyI6ICJodHRwcz...',
    required: true,
  })
  @IsJWT({ message: 'Token de autenticação inválido' })
  @IsNotEmpty({ message: 'Token de autenticação é obrigatório' })
  token: string;

  @ApiProperty({
    description: 'Provedor de autenticação social',
    enum: ['google', 'facebook'],
    example: 'google',
    required: true,
  })
  @IsEnum(['google', 'facebook'], {
    message: 'Provedor precisa ser "google" ou "facebook"',
  })
  @IsNotEmpty({ message: 'Provedor é obrigatório' })
  provider: 'google' | 'facebook';
}
