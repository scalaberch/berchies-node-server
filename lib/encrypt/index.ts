import bcrypt from 'bcrypt';

export const SALT_ROUNDS = 12;

/**
 * Converts a plain text password into a secure hash using bcrypt.
 *
 * @param password the input password
 * @returns the hashed password in bcrypt
 */
export const hashPassword = async (password: string): Promise<string> =>
  await bcrypt.hash(password, SALT_ROUNDS);

/**
 * Compares a plain text password attempt against the stored hash.
 *
 * @param password the input password
 * @param hash the stored hash of the supposed password
 * @returns
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> =>
  await bcrypt.compare(password, hash);
