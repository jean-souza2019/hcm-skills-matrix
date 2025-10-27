import crypto from 'node:crypto';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@$%';

export function generateTemporaryPassword(length = 12) {
  return Array.from({ length })
    .map(() => PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)])
    .join('');
}
