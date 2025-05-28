import type { Publication } from 'src/models/publicacao.model';
import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import type { CreatePublicationDto } from 'src/dto/create-publicacao.dto';
import type { UpdatePublicationDto } from 'src/dto/update-publicacao.dto';
import * as admin from 'firebase-admin';

import { FirebaseService } from '../../config/firebase/firebase.service';

type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot<DocumentData>;
type CollectionReference = admin.firestore.CollectionReference<DocumentData>;
type Query = admin.firestore.Query<DocumentData>;

@Injectable()
export class PublicationService implements OnModuleInit {
  private readonly logger = new Logger(PublicationService.name);
  private db: admin.firestore.Firestore;
  private collection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) { }

  onModuleInit() {
    this.db = this.firebaseService.getFirestore();
    this.collection = this.db.collection('publications');
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
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };

    return publication;
  }

  async create(
    dto: CreatePublicationDto,
    userId: string,
    userInfo: any,
  ): Promise<Publication> {
    this.logger.log(`Criando publicação para usuário: ${userId}`);
    try {
      const publicationData = this.toPlainObject(dto);
      const now = admin.firestore.Timestamp.now();

      publicationData.authorId = userId;
      publicationData.authorName =
        userInfo.displayName ||
        `${userInfo.nome || ''} ${userInfo.sobrenome || ''}`.trim() ||
        'Usuário';
      publicationData.authorEmail = userInfo.email;
      publicationData.isActive = true;
      publicationData.likes = 0;
      publicationData.comments = 0;
      publicationData.createdAt = now;
      publicationData.updatedAt = now;

      const docRef = await this.collection.add(publicationData);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(
          'Falha ao criar publicação: documento não encontrado após criação',
        );
      }

      this.logger.log(`Publicação criada com sucesso: ${doc.id}`);
      return this.toPublication(doc);
    } catch (error) {
      this.logger.error(`Erro ao criar publicação: ${error.message}`);
      throw new Error(`Erro ao criar publicação: ${error.message}`);
    }
  }

  async findAll(): Promise<Publication[]> {
    this.logger.log('Buscando todas as publicações ativas');
    try {
      const query = this.collection
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      const publications = snapshot.docs.map((doc) => this.toPublication(doc));

      this.logger.log(`${publications.length} publicações encontradas`);
      return publications;
    } catch (error) {
      this.logger.error(`Erro ao buscar publicações: ${error.message}`);
      throw new Error(`Erro ao buscar publicações: ${error.message}`);
    }
  }

  async findByUser(userId: string): Promise<Publication[]> {
    this.logger.log(`Buscando publicações do usuário: ${userId}`);
    try {
      const query = this.collection
        .where('authorId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => this.toPublication(doc));
    } catch (error) {
      this.logger.error(
        `Erro ao buscar publicações do usuário ${userId}: ${error.message}`,
      );
      throw new Error(
        `Erro ao buscar publicações do usuário: ${error.message}`,
      );
    }
  }

  async findOne(id: string): Promise<Publication | null> {
    this.logger.log(`Buscando publicação: ${id}`);
    try {
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
    this.logger.log(`Atualizando publicação: ${id} pelo usuário: ${userId}`);
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${id} não encontrada`);
      }

      const publicationData = doc.data();
      if (!publicationData || publicationData.authorId !== userId) {
        throw new Error('Usuário não autorizado a editar esta publicação');
      }

      const updateData = this.toPlainObject(dto);
      updateData.updatedAt = admin.firestore.Timestamp.now();

      await docRef.update(updateData);
      const updatedDoc = await docRef.get();

      this.logger.log(`Publicação atualizada com sucesso: ${id}`);
      return this.toPublication(updatedDoc);
    } catch (error) {
      this.logger.error(`Erro ao atualizar publicação ${id}: ${error.message}`);
      throw new Error(`Erro ao atualizar publicação: ${error.message}`);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Removendo publicação: ${id} pelo usuário: ${userId}`);
    try {
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

      this.logger.log(`Publicação removida com sucesso: ${id}`);
    } catch (error) {
      this.logger.error(`Erro ao remover publicação ${id}: ${error.message}`);
      throw new Error(`Erro ao remover publicação: ${error.message}`);
    }
  }
}
