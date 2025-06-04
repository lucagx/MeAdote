import { PartialType } from '@nestjs/swagger';

import { CreatePublicationDto } from './create-publicacao.dto';

export class UpdatePublicationDto extends PartialType(CreatePublicationDto) { }
