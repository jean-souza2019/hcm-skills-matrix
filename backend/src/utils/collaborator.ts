import { prisma } from '../lib/prisma';

export async function findCollaboratorProfileByUserId(userId: string) {
  return prisma.collaboratorProfile.findUnique({
    where: { userId },
  });
}

export async function requireCollaboratorProfile(userId: string) {
  const profile = await findCollaboratorProfileByUserId(userId);

  if (!profile) {
    throw new Error('Perfil de colaborador não encontrado para este usuário.');
  }

  return profile;
}
