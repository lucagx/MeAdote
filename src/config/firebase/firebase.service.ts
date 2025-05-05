import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<admin.app.App> {
    try {
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

      this.logger.log(
        `Firebase initialization with projectId: ${serviceAccount.projectId}`,
      );

      let app: admin.app.App;

      try {
        app = admin.app('me-adote-app');
        this.logger.log('Firebase app retrieved successfully');
      } catch (appError) {
        this.logger.debug(
          'App not found, creating new Firebase app instance',
          appError instanceof Error ? appError.message : String(appError),
        );

        app = admin.initializeApp(
          {
            credential: admin.credential.cert(
              serviceAccount as admin.ServiceAccount,
            ),
          },
          'me-adote-app',
        );
        this.logger.log('Firebase app initialized successfully');
      }

      this.firebaseApp = app;

      if (!this.firebaseApp) {
        throw new Error('Firebase app não foi inicializado');
      }

      return this.firebaseApp;
    } catch (error) {
      this.logger.error(
        'Firebase initialization error:',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  getFirestore() {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.firestore();
  }

  getAuth() {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.auth();
  }

  getStorage() {
    if (!this.firebaseApp) {
      throw new Error('Firebase app não foi inicializado');
    }
    return this.firebaseApp.storage();
  }
}
