import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      role: Role;
      mustChangePassword: boolean;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
