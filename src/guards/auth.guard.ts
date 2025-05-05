import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { FirebaseService } from '../config/firebase/firebase.service';

declare module 'express' {
  export interface Request {
    user?: any;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) return false;

    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);

      const userRecord = await this.firebaseService
        .getAuth()
        .getUser(decodedToken.uid);

      const db = this.firebaseService.getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      request.user = {
        ...decodedToken,
        ...userRecord,
        ...(userDoc.exists ? userDoc.data() : {}),
      };
      return true;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
