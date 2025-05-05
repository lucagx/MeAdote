export interface User {
  uid: string;
  email: string;
  displayName?: string;
  userType: 'adotante' | 'abrigo';
  phone?: string;
  address?: string;
  createdAt: Date;
}
