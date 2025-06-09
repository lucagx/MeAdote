export interface Publication {
  id: string;
  text: string;
  media: string[]; // URLs das imagens/vídeos no Firebase Storage
  authorId: string; // UID do usuário que criou
  authorName: string; // Nome do autor para exibição
  authorEmail: string; // Email do autor
  authorProfilePhoto?: string; // URL da foto de perfil do autor
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  likes?: number; // Contador de curtidas
  comments?: number; // Contador de comentários
  likedBy?: string[]; // UIDs dos usuários que curtiram
}
