export function isValidNanoid(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

export function validateId(id: string): { valid: boolean; error?: string } {
  if (!isValidNanoid(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }
  return { valid: true };
}
