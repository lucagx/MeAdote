import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/config/firebase/firebase.module';

import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [FirebaseModule, ConfigModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule { }