// src/services/animais/animais.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AnimalController],
  providers: [AnimalService],
  exports: [AnimalService],
})
export class AnimaisModule {}