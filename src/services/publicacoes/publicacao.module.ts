import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/config/firebase/firebase.module';
import { PublicationController } from 'src/controllers/publicacoes/publicacao.controller';
import { StorageModule } from '../storage/storage.module';

import { PublicationService } from './publicacao.service';

@Module({
  imports: [FirebaseModule, StorageModule],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationsModule { }