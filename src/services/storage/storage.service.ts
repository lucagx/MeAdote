import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';


@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly configService: ConfigService,
  ) { }

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
  ): Promise<string> {

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'publications', // Pasta onde os arquivos serão armazenados
          public_id: `${Date.now()}_${filename.split('.')[0]}`, // Para evitar nomes duplicados
          resource_type: 'auto', // Detecta automaticamente se é imagem, vídeo, etc.
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Erro no upload do arquivo ${filename} para Cloudinary: ${error.message}`,
            );
            return reject(new Error(`Erro no upload para Cloudinary: ${error.message}`));
          }
          if (!result) {
            this.logger.error(
              `Resultado do upload indefinido para Cloudinary: ${filename}`,
            );
            return reject(new Error('Resultado do upload indefinido do Cloudinary'));
          }
          resolve(result.secure_url);
        },
      );
      uploadStream.end(buffer);
    });
  }
}