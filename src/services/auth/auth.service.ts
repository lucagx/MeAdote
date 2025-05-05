import { Injectable } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';

import type { User } from '../../models/user.model';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async registrar(email: string, password: string, userData: Partial<User>) {
    try {
      const userRecord = await this.firebaseService.getAuth().createUser({
        email,
        password,
        displayName: userData.displayName,
      });
      const db = this.firebaseService.getFirestore();
      await db
        .collection('users')
        .doc(userRecord.uid)
        .set({
          ...userData,
          uid: userRecord.uid,
          createdAt: new Date(),
        });

      return userRecord.uid;
    } catch (error) {
      console.error('Erro durente cadastro:', error);
      throw new Error('Erro ao cadastrar usuário');
    }
  }

  async validarToken(token: string) {
    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Erro ao validar token:', error);
      throw new Error('Token inválido ou expirado');
    }
  }

  async login(email: string) {
    try {
      const trimmedEmail = email?.trim();

      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        throw new Error('Email inválido');
      }

      console.log('Attempting login with email:', trimmedEmail);

      const userRecord = await this.firebaseService
        .getAuth()
        .getUserByEmail(trimmedEmail);
      if (!userRecord) {
        throw new Error('Usuário não encontrado');
      }

      const token = await this.firebaseService
        .getAuth()
        .createCustomToken(userRecord.uid);

      return { token, user: userRecord };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw new Error('Erro ao fazer login');
    }
  }
  async validarSocialToken(
    token: string,
    provider: 'google' | 'facebook',
  ): Promise<User> {
    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);

      const userRecord = await this.firebaseService
        .getAuth()
        .getUser(decodedToken.uid);

      if (decodedToken.firebase.sign_in_provider.includes(provider)) {
        const db = this.firebaseService.getFirestore();
        const userDoc = await db.collection('users').doc(userRecord.uid).get();

        if (!userDoc.exists) {
          await db
            .collection('users')
            .doc(decodedToken.uid)
            .set({
              uid: decodedToken.uid,
              email: decodedToken.email ?? '',
              displayName: decodedToken.name ?? '',
              photoURL: decodedToken.picture ?? '',
              userType: 'adotante', // Default para usuário social
              createdAt: new Date(),
              provider,
            });
        }
      }
      const db = this.firebaseService.getFirestore();
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (!userDoc.exists) {
        throw new Error('User document not found');
      }
      return userDoc.data() as User;
    } catch (error) {
      console.error(`Erro validando token ${provider}:`, error);
      throw new Error(`Falha na autenticação com ${provider}`);
    }
  }
}
