import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit(): Promise<void> {
    try {
      // Verificar se já existe uma instância
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.apps[0]!;
        return;
      }

      const serviceAccount = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        privateKeyId: this.configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
        privateKey: this.configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        clientId: this.configService.get<string>('FIREBASE_CLIENT_ID'),
        authUri: this.configService.get<string>('FIREBASE_AUTH_URI'),
        tokenUri: this.configService.get<string>('FIREBASE_TOKEN_URI'),
        authProviderX509CertUrl: this.configService.get<string>(
          'FIREBASE_AUTH_PROVIDER_CERT_URL',
        ),
        clientX509CertUrl: this.configService.get<string>(
          'FIREBASE_CLIENT_CERT_URL',
        ),
      };

      // Verificar se as credenciais essenciais estão presentes
      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        this.logger.warn('Credenciais do Firebase não encontradas, tentando applicationDefault()');

        // Fallback para applicationDefault se as variáveis não estiverem configuradas
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      } else {
        // Usar credenciais das variáveis de ambiente
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      }
      ;

      // Testar conexão com Firestore
      const db = this.getFirestore();
      try {
        await db.collection('_healthcheck_').doc('ping').get();
        this.logger.log('Conexão com Firestore verificada com sucesso (via leitura de teste).');
      } catch (pingError) {
        this.logger.warn(`Teste de ping no Firestore encontrou um problema (pode ser normal se a coleção/documento não existir): ${pingError.message}`);
      }

    } catch (error) {
      this.logger.error(
        'Firebase initialization error:',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.firestore();
  }

  getAuth(): admin.auth.Auth {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.auth();
  }

  getStorage(): admin.storage.Storage {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.storage();
  }
}