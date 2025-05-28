import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private storage: admin.storage.Storage;
  private bucket: ReturnType<admin.storage.Storage['bucket']>;

  constructor(private readonly firebaseService: FirebaseService) { }

  async onModuleInit() {
    this.storage = this.firebaseService.getStorage();
    this.bucket = this.storage.bucket();
    this.logger.log('StorageService inicializado com sucesso');
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType: string,
  ): Promise<string> {
    this.logger.log(`Fazendo upload do arquivo: ${filename}`);

    if (!this.bucket) {
      throw new Error('Storage não foi inicializado');
    }

    try {
      const file = this.bucket.file(`publications/${Date.now()}_${filename}`);

      await file.save(buffer, {
        metadata: {
          contentType,
        },
        public: true,
      });

      // Usar URL pública em vez de signed URL para arquivos públicos
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${file.name}`;

      this.logger.log(`Upload concluído: ${filename}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(
        `Erro no upload do arquivo ${filename}: ${error.message}`,
      );
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }
}