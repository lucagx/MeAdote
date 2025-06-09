import { Injectable, Logger } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';

import type { User } from '../../models/user.model';
import { FirebaseService } from '../../config/firebase/firebase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly firebaseService: FirebaseService) { }

  async registrar(email: string, password: string, userData: Partial<User>) {
    try {
      // O usuário já foi criado pelo Firebase Auth no frontend.
      // Recupere o usuário pelo email para obter o uid.
      const userRecord = await this.firebaseService
        .getAuth()
        .getUserByEmail(email);

      const db = this.firebaseService.getFirestore();
      const userDoc = {
        uid: userRecord.uid,
        email,
        nome: userData.nome ?? '',
        sobrenome: userData.sobrenome ?? '',
        telefone: userData.telefone ?? '',
        displayName:
          userData.displayName ||
          `${userData.nome ?? ''} ${userData.sobrenome ?? ''}`.trim(),
        userType: userData.userType ?? 'adotante',
        address: userData.address ?? '',
        createdAt: new Date(),
        bairro: userData.bairro ?? '',
        cidade: userData.cidade ?? '',
        estado: userData.estado ?? '',
        cep: userData.cep ?? '',
        nascimento: userData.nascimento ?? '',
        genero: userData.genero ?? '',
      };
      await db.collection('users').doc(userRecord.uid).set(userDoc);

      this.logger.log(
        `Usuário registrado com sucesso: ${email}`,
      );
      return userDoc;
    } catch (error) {
      this.logger.error(
        `Erro durante cadastro do usuário ${email}: ${error instanceof Error ? error.message : error}`,
      );
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
      this.logger.error(
        `Erro ao validar token: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error('Token inválido ou expirado');
    }
  }

  async login(email: string) {
    try {
      const trimmedEmail = email?.trim();

      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        throw new Error('Email inválido');
      }

      const userRecord = await this.firebaseService
        .getAuth()
        .getUserByEmail(trimmedEmail);
      if (!userRecord) {
        throw new Error('Usuário não encontrado');
      }

      const token = await this.firebaseService
        .getAuth()
        .createCustomToken(userRecord.uid);

      const db = this.firebaseService.getFirestore();
      const userDocSnap = await db
        .collection('users')
        .doc(userRecord.uid)
        .get();
      const userDoc = userDocSnap.exists ? userDocSnap.data() : {};

      return {
        token,
        user: { ...userDoc, uid: userRecord.uid, email: userRecord.email },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao fazer login para ${email}: ${error instanceof Error ? error.message : error}`,
      );
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
      this.logger.error(
        `Erro validando token ${provider}: ${error instanceof Error ? error.message : error}`,
      );
      throw new Error(`Falha na autenticação com ${provider}`);
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const db = this.firebaseService.getFirestore();
      const userDoc = {
        ...userData,
        createdAt: new Date(),
        userType: userData.userType ?? 'adotante',
      };

      if (!userData.uid) {
        throw new Error('UID do usuário é obrigatório para criar o documento.');
      }
      await db.collection('users').doc(userData.uid).set(userDoc);
      return userDoc as User;
    } catch (error) {
      this.logger.error(`Erro ao criar usuário: ${error.message}`);
      throw new Error('Erro ao criar usuário');
    }
  }

  async getUserByUid(uid: string): Promise<User | null> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection('users').doc(uid).get();

      if (!doc.exists) {
        return null;
      }

      return { uid, ...doc.data() } as User;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário ${uid}: ${error.message}`);
      throw new Error('Erro ao buscar usuário');
    }
  }

  async updateUser(uid: string, updateData: Partial<User>): Promise<User> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection('users').doc(uid).update({
        ...updateData,
        updatedAt: new Date(),
      });

      const updatedDoc = await db.collection('users').doc(uid).get();
      return { uid, ...updatedDoc.data() } as User;
    } catch (error) {
      this.logger.error(`Erro ao atualizar usuário ${uid}: ${error.message}`);
      throw new Error('Erro ao atualizar usuário');
    }
  }
}
