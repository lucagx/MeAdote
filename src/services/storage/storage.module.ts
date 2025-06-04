import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/config/firebase/firebase.module';

import { StorageService } from './storage.service';

@Module({
  imports: [FirebaseModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule { }