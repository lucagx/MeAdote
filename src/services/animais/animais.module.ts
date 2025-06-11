// src/services/animais/animais.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [FirebaseModule, StorageModule],
  controllers: [AnimalController],
  providers: [AnimalService],
  exports: [AnimalService],
})
export class AnimaisModule { }