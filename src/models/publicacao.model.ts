export interface Publication {
  id: string;
  text: string;
  media: string[]; // URLs das imagens/vídeos no Firebase Storage
  authorId: string; // UID do usuário que criou
  authorName: string; // Nome do autor para exibição
  authorEmail: string; // Email do autor
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  likes?: number; // Futuro: contador de curtidas
  comments?: number; // Futuro: contador de comentários
}
