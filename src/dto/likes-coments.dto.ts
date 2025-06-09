import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LikePublicationDto {
    @ApiProperty({
        description: 'ID da publicação',
        example: 'abc123',
    })
    @IsString()
    publicationId: string;
}

export class CommentPublicationDto {
    @ApiProperty({
        description: 'ID da publicação',
        example: 'abc123',
    })
    @IsString()
    publicationId: string;

    @ApiProperty({
        description: 'Texto do comentário',
        example: 'Que fofo! Tenho interesse em adotar.',
    })
    @IsString()
    text: string;
}