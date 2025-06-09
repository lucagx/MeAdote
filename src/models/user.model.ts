export interface User {
  uid: string;
  email: string;
  nome?: string;
  sobrenome?: string;
  telefone?: string;
  profilePhoto?: string;
  displayName?: string;
  userType?: 'adotante' | 'abrigo';
  address?: string;
  createdAt: Date;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  nascimento?: string;
  genero?: string;
}
