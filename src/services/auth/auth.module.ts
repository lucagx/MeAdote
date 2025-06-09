import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/config/firebase/firebase.module';

import { AuthController } from '../../controllers/auth/auth.controller';
import { AuthGuard } from '../../guards/auth.guard';

import { AuthService } from './auth.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [FirebaseModule, StorageModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule { }
