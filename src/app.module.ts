import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './config/firebase/firebase.module';
import { AnimaisModule } from './services/animais/animais.module';
import { AuthModule } from './services/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', 
    }),
    FirebaseModule,
    AuthModule,
    AnimaisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}