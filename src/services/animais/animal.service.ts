import { Injectable, OnModuleInit } from '@nestjs/common';
import { CreateAnimalDto } from '../../dto/create-animal.dto';
import { UpdateAnimalDto } from '../../dto/update-animal.dto';
import { Animal } from '../../models/animal.model';
import { FirebaseService } from '../../config/firebase/firebase.service';
import * as admin from 'firebase-admin';

type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot<DocumentData>;
type DocumentReference = admin.firestore.DocumentReference<DocumentData>;
type CollectionReference = admin.firestore.CollectionReference<DocumentData>;
type Query = admin.firestore.Query<DocumentData>;

@Injectable()
export class AnimalService implements OnModuleInit {
  private db: admin.firestore.Firestore;
  private collection: CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {}

  async onModuleInit() {
    this.db = this.firebaseService.getFirestore();
    this.collection = this.db.collection('animais');
  }

  private toPlainObject(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  private toAnimal(doc: DocumentSnapshot): Animal {
    const data = doc.data();
    if (!data) {
      throw new Error(`Documento ${doc.id} não contém dados`);
    }

    // Verificação de tipo segura
    const animal: Animal = {
      id: doc.id,
      nome: data.nome as string,
      especie: data.especie as string,
      raca: data.raca as string,
      idade: data.idade as number,
      descricao: data.descricao as string,
      vacinado: data.vacinado as boolean,
      castrado: data.castrado as boolean,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    };

    return animal;
  }

  async create(dto: CreateAnimalDto): Promise<Animal> {
    try {
      const animalData = this.toPlainObject(dto);
      const now = admin.firestore.Timestamp.now();
      animalData.createdAt = now;
      animalData.updatedAt = now;

      const docRef = await this.collection.add(animalData);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('Falha ao criar animal: documento não encontrado após criação');
      }

      return this.toAnimal(doc);
    } catch (error) {
      throw new Error(`Erro ao criar animal: ${error.message}`);
    }
  }

  async findAll(filters?: Partial<Animal>): Promise<Animal[]> {
    try {
      let query: Query = this.collection;

      if (filters) {
        const plainFilters = this.toPlainObject(filters);
        Object.entries(plainFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, '==', value);
          }
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => this.toAnimal(doc));
    } catch (error) {
      throw new Error(`Erro ao buscar animais: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Animal | null> {
    try {
      const doc = await this.collection.doc(id).get();
      return doc.exists ? this.toAnimal(doc) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar animal ${id}: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateAnimalDto): Promise<Animal> {
    try {
      const docRef = this.collection.doc(id);
      const updateData = this.toPlainObject(dto);
      
      updateData.updatedAt = admin.firestore.Timestamp.now();

      await docRef.update(updateData);
      const updatedDoc = await docRef.get();

      if (!updatedDoc.exists) {
        throw new Error(`Animal com ID ${id} não encontrado após atualização`);
      }

      return this.toAnimal(updatedDoc);
    } catch (error) {
      throw new Error(`Erro ao atualizar animal ${id}: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`Animal com ID ${id} não encontrado`);
      }

      await docRef.delete();
    } catch (error) {
      throw new Error(`Erro ao remover animal ${id}: ${error.message}`);
    }
  }
}