// src/models/animal.model.ts
export interface Animal {
    id: string;
    nome: string;
    especie: string;
    raca: string;
    idade: number;
    descricao: string;
    vacinado: boolean;
    castrado: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }