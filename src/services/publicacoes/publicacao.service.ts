import type { Publication } from 'src/models/publicacao.model';
import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import type { CreatePublicationDto } from 'src/dto/create-publicacao.dto';
import type { UpdatePublicationDto } from 'src/dto/update-publicacao.dto';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../config/firebase/firebase.service';

type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot<DocumentData>;
type CollectionReference = admin.firestore.CollectionReference<DocumentData>;

@Injectable()
export class PublicationService implements OnModuleInit {
  private readonly logger = new Logger(PublicationService.name);
  private db: admin.firestore.Firestore;
  private collection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) { }

  async onModuleInit() {
    try {
      this.db = this.firebaseService.getFirestore();
      this.collection = this.db.collection('publications');
    } catch (error) {
      this.logger.error(`Erro ao inicializar PublicationService: ${error.message}`);
      throw error;
    }
  }

  private toPlainObject(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  private toPublication(doc: DocumentSnapshot): Publication {
    const data = doc.data();
    if (!data) {
      throw new Error(`Documento ${doc.id} não contém dados`);
    }

    const publication: Publication = {
      id: doc.id,
      text: data.text as string,
      media: (data.media as string[]) || [],
      authorId: data.authorId as string,
      authorName: data.authorName as string,
      authorEmail: data.authorEmail as string,
      isActive: data.isActive as boolean,
      likes: (data.likes as number) || 0,
      comments: (data.comments as number) || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    return publication;
  }

  async create(
    dto: CreatePublicationDto,
    userId: string,
    userInfo: any,
  ): Promise<Publication> {
    try {
      if (!this.collection) {
        this.logger.error('Coleção não inicializada');
        throw new Error('Coleção não inicializada');
      }

      const now = admin.firestore.Timestamp.now();

      const publicationData = {
        text: dto.text,
        media: dto.media || [],
        authorId: userId,
        authorName: userInfo.displayName ||
          `${userInfo.nome || ''} ${userInfo.sobrenome || ''}`.trim() ||
          'Usuário',
        authorEmail: userInfo.email,
        isActive: true,
        likes: 0,
        comments: 0,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.collection.add(publicationData);

      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Falha ao criar publicação: documento não encontrado após criação');
      }

      return this.toPublication(doc);

    } catch (error) {
      this.logger.error(`Erro ao criar publicação: ${error.message}`);
      throw new Error(`Erro ao criar publicação: ${error.message}`);
    }
  }

  async findAll(): Promise<Publication[]> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const query = this.collection
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      const publications = snapshot.docs.map((doc) => this.toPublication(doc));

      return publications;

    } catch (error) {
      this.logger.error(`Erro ao buscar publicações: ${error.message}`);
      throw new Error(`Erro ao buscar publicações: ${error.message}`);
    }
  }

  async findByUser(userId: string): Promise<Publication[]> {

    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }
      const query = this.collection
        .where('authorId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.toPublication(doc));
    } catch (error) {
      this.logger.error(`Erro ao buscar publicações do usuário ${userId}: ${error.message}`);
      throw new Error(`Erro ao buscar publicações do usuário: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Publication | null> {

    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }
      const doc = await this.collection.doc(id).get();
      return doc.exists ? this.toPublication(doc) : null;
    } catch (error) {
      this.logger.error(`Erro ao buscar publicação ${id}: ${error.message}`);
      throw new Error(`Erro ao buscar publicação: ${error.message}`);
    }
  }

  async update(
    id: string,
    dto: UpdatePublicationDto,
    userId: string,
  ): Promise<Publication> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${id} não encontrada`);
      }

      const publicationData = doc.data();
      if (!publicationData || publicationData.authorId !== userId) {
        throw new Error('Usuário não autorizado a editar esta publicação');
      }

      const updateData = {
        ...dto,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await docRef.update(updateData);
      const updatedDoc = await docRef.get();

      return this.toPublication(updatedDoc);
    } catch (error) {
      this.logger.error(`Erro ao atualizar publicação ${id}: ${error.message}`);
      throw new Error(`Erro ao atualizar publicação: ${error.message}`);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${id} não encontrada`);
      }

      const publicationData = doc.data();
      if (!publicationData || publicationData.authorId !== userId) {
        throw new Error('Usuário não autorizado a remover esta publicação');
      }

      // Soft delete
      await docRef.update({
        isActive: false,
        updatedAt: admin.firestore.Timestamp.now(),
      });

    } catch (error) {
      this.logger.error(`Erro ao remover publicação ${id}: ${error.message}`);
      throw new Error(`Erro ao remover publicação: ${error.message}`);
    }
  }
}
