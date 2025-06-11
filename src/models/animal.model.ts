export interface Animal {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  porte: 'pequeno' | 'médio' | 'grande';
  localizacao: string;
  abrigoId: string;
  abrigoNome?: string; // Nome amigável do abrigo
  descricao?: string;
  foto?: string; // URL da foto do pet
  vacinado?: boolean;
  castrado?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}