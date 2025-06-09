import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CollectionReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { FirebaseService } from '../../config/firebase/firebase.service';

export interface AdoptionRequest {
  id: string;
  publicationId: string;
  publicationAuthorEmail: string;
  publicationText: string;
  requesterId: string;
  requesterEmail: string;
  requesterName: string;
  requesterInfo: {
    nome: string;
    telefone: string;
    email: string;
    disponibilidade: string;
    experiencia: string;
    moradia: string;
    motivacao: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdoptionService implements OnModuleInit {
  private readonly logger = new Logger(AdoptionService.name);
  private db: admin.firestore.Firestore;
  private collection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) { }

  async onModuleInit() {
    this.db = this.firebaseService.getFirestore();
    this.collection = this.db.collection('adoption_requests');
  }

  private toAdoptionRequest(doc: DocumentSnapshot): AdoptionRequest {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as AdoptionRequest;
  }

  async createRequest(dto: any): Promise<AdoptionRequest> {
    try {
      const now = admin.firestore.Timestamp.now();

      const requestData = {
        ...dto,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.collection.add(requestData);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Falha ao criar solicitação de adoção');
      }

      return this.toAdoptionRequest(doc);
    } catch (error) {
      this.logger.error(`Erro ao criar solicitação de adoção: ${error.message}`);
      throw new Error(`Erro ao criar solicitação: ${error.message}`);
    }
  }

  async getRequestsByRequester(requesterId: string): Promise<AdoptionRequest[]> {
    try {
      const query = this.collection
        .where('requesterId', '==', requesterId)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map(doc => this.toAdoptionRequest(doc));
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitações do usuário: ${error.message}`);
      throw new Error(`Erro ao buscar solicitações: ${error.message}`);
    }
  }

  async getRequestsByPublisher(publisherEmail: string): Promise<AdoptionRequest[]> {
    try {
      const query = this.collection
        .where('publicationAuthorEmail', '==', publisherEmail)
        .orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map(doc => this.toAdoptionRequest(doc));
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitações recebidas: ${error.message}`);
      throw new Error(`Erro ao buscar solicitações: ${error.message}`);
    }
  }

  async notifyPublisher(adoptionRequest: AdoptionRequest): Promise<void> {
    try {
      this.logger.log(`📧 Notificação enviada para ${adoptionRequest.publicationAuthorEmail}`);
      this.logger.log(`📋 Solicitação de: ${adoptionRequest.requesterName} (${adoptionRequest.requesterEmail})`);
      this.logger.log(`📱 Telefone: ${adoptionRequest.requesterInfo.telefone}`);
      this.logger.log(`📅 Disponibilidade: ${adoptionRequest.requesterInfo.disponibilidade}`);

      // TODO: Implementar envio de email real aqui
      // await this.emailService.sendAdoptionNotification(adoptionRequest);

    } catch (error) {
      this.logger.error(`Erro ao enviar notificação: ${error.message}`);
      // Não falhar a operação por erro de notificação
    }
  }
}
