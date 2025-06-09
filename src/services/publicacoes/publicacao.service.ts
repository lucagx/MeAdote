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
      authorProfilePhoto: data.authorProfilePhoto as string,
      isActive: data.isActive as boolean,
      likes: (data.likes as number) || 0,
      comments: (data.comments as number) || 0,
      likedBy: (data.likedBy as string[]) || [],
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
        authorName: userInfo.displayName ??
          `${userInfo.nome ?? ''} ${userInfo.sobrenome ?? ''}`.trim() ??
          'Usuário',
        authorEmail: userInfo.email,
        authorProfilePhoto: userInfo.profilePhoto ?? null,
        isActive: true,
        likes: 0,
        comments: 0,
        likedBy: [],
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

  async toggleLike(publicationId: string, userId: string): Promise<Publication> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const docRef = this.collection.doc(publicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${publicationId} não encontrada`);
      }

      const data = doc.data();
      const likedBy = (data?.likedBy as string[]) || [];
      const currentLikes = (data?.likes as number) || 0;

      let newLikedBy: string[];
      let newLikes: number;

      if (likedBy.includes(userId)) {
        // Remove like
        newLikedBy = likedBy.filter(id => id !== userId);
        newLikes = Math.max(0, currentLikes - 1);
      } else {
        // Adiciona like
        newLikedBy = [...likedBy, userId];
        newLikes = currentLikes + 1;
      }

      await docRef.update({
        likedBy: newLikedBy,
        likes: newLikes,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      const updatedDoc = await docRef.get();
      return this.toPublication(updatedDoc);

    } catch (error) {
      this.logger.error(`Erro ao curtir/descurtir publicação ${publicationId}: ${error.message}`);
      throw new Error(`Erro ao curtir/descurtir publicação: ${error.message}`);
    }
  }

  async addComment(publicationId: string, userId: string, userInfo: any, text: string): Promise<Publication> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const docRef = this.collection.doc(publicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${publicationId} não encontrada`);
      }

      // Criar o comentário na subcoleção
      const commentData = {
        text,
        authorId: userId,
        authorName: userInfo.displayName ||
          `${userInfo.nome || ''} ${userInfo.sobrenome || ''}`.trim() ||
          'Usuário',
        authorProfilePhoto: userInfo.profilePhoto || null,
        publicationId,
        createdAt: admin.firestore.Timestamp.now(),
      };

      // Adicionar comentário na subcoleção
      await docRef.collection('comments').add(commentData);

      const commentsSnapshot = await docRef.collection('comments').get();
      const realCommentsCount = commentsSnapshot.size;

      await docRef.update({
        comments: realCommentsCount,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      const updatedDoc = await docRef.get();
      return this.toPublication(updatedDoc);

    } catch (error) {
      this.logger.error(`Erro ao comentar publicação ${publicationId}: ${error.message}`);
      throw new Error(`Erro ao comentar publicação: ${error.message}`);
    }
  }

  async getComments(publicationId: string): Promise<any[]> {
    try {
      if (!this.db) {
        throw new Error('Banco não inicializado');
      }

      // Buscar comentários na subcoleção
      const commentsRef = this.db
        .collection('publications')
        .doc(publicationId)
        .collection('comments');

      const snapshot = await commentsRef
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      }));

    } catch (error) {
      this.logger.error(`Erro ao buscar comentários da publicação ${publicationId}: ${error.message}`);
      throw new Error(`Erro ao buscar comentários: ${error.message}`);
    }
  }

  async deleteComment(publicationId: string, commentId: string, userId: string): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const docRef = this.collection.doc(publicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${publicationId} não encontrada`);
      }

      const commentRef = docRef.collection('comments').doc(commentId);
      const commentDoc = await commentRef.get();

      if (!commentDoc.exists) {
        throw new Error('Comentário não encontrado');
      }

      const commentData = commentDoc.data();
      if (!commentData || commentData.authorId !== userId) {
        throw new Error('Usuário não autorizado a deletar este comentário');
      }

      // Deletar o comentário
      await commentRef.delete();

      // Atualizar contador de comentários
      const commentsSnapshot = await docRef.collection('comments').get();
      const realCommentsCount = commentsSnapshot.size;

      await docRef.update({
        comments: realCommentsCount,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      this.logger.log(`Comentário ${commentId} deletado da publicação ${publicationId}`);

    } catch (error) {
      this.logger.error(`Erro ao deletar comentário: ${error.message}`);
      throw new Error(`Erro ao deletar comentário: ${error.message}`);
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

  async fixCommentsCounter(publicationId: string): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const docRef = this.collection.doc(publicationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Publicação com ID ${publicationId} não encontrada`);
      }

      const commentsSnapshot = await docRef.collection('comments').get();
      const realCommentsCount = commentsSnapshot.size;

      await docRef.update({
        comments: realCommentsCount,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      this.logger.log(`Contador de comentários corrigido para publicação ${publicationId}: ${realCommentsCount}`);

    } catch (error) {
      this.logger.error(`Erro ao corrigir contador de comentários: ${error.message}`);
      throw new Error(`Erro ao corrigir contador: ${error.message}`);
    }
  }

  async fixAllCommentsCounters(): Promise<void> {
    try {
      if (!this.collection) {
        throw new Error('Coleção não inicializada');
      }

      const snapshot = await this.collection.where('isActive', '==', true).get();

      const fixes = snapshot.docs.map(async (doc) => {
        const commentsSnapshot = await doc.ref.collection('comments').get();
        const realCommentsCount = commentsSnapshot.size;

        return doc.ref.update({
          comments: realCommentsCount,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      });

      await Promise.all(fixes);
      this.logger.log(`Contadores de comentários corrigidos para ${snapshot.size} publicações`);

    } catch (error) {
      this.logger.error(`Erro ao corrigir todos os contadores: ${error.message}`);
      throw new Error(`Erro ao corrigir contadores: ${error.message}`);
    }
  }
}
