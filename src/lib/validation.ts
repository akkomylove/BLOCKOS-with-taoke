export function isValidNanoid(id: string): boolean {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{10,21}$/.test(id);
}

export function validateId(id: string): { valid: boolean; error?: string } {
  if (!isValidNanoid(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }
  return { valid: true };
}
