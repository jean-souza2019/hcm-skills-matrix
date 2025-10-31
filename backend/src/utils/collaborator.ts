import { findCollaboratorByUserId } from '../repositories/collaborators.repository';

export async function findCollaboratorProfileByUserId(userId: string) {
  return findCollaboratorByUserId(userId);
}

export async function requireCollaboratorProfile(userId: string) {
  const profile = await findCollaboratorProfileByUserId(userId);

  if (!profile) {
    throw new Error('Perfil de colaborador nao encontrado para este usuario.');
  }

  return profile;
}
