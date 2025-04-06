/**
 * Utility functions for generating and validating short codes for file sharing
 */

/**
 * Generates a random 6-digit hexadecimal code
 * @returns A 6-character string of hexadecimal digits
 */
export function generateShortCode(): string {
  // Generate random bytes and convert to hex
  const randomBytes = new Uint8Array(3); // 3 bytes = 6 hex chars
  crypto.getRandomValues(randomBytes);
  
  // Convert bytes to hexadecimal string and ensure it's 6 characters
  return Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Validates if a string is a valid 6-digit hexadecimal code
 * @param code - The code to validate
 * @returns true if the code is valid, false otherwise
 */
export function validateShortCode(code: string): boolean {
  if (!code) return false;
  
  // Check if the code is a 6-character hexadecimal string
  const regex = /^[0-9A-F]{6}$/;
  return regex.test(code);
}

/**
 * Formats a short code for display (no longer adds a dash)
 * @param code - The 6-digit code to format
 * @returns Formatted code (e.g., "ABCDEF")
 */
export function formatShortCode(code: string): string {
  if (!validateShortCode(code)) return code;
  
  // Return the code without formatting
  return code;
}

/**
 * Normalizes a short code by removing any formatting and converting to uppercase
 * @param code - The code to normalize
 * @returns Normalized code
 */
export function normalizeShortCode(code: string): string {
  if (!code) return '';
  
  // Remove non-alphanumeric characters and convert to uppercase
  return code.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

/**
 * Maps a short code to a longer UUID for storage/retrieval
 * In a real application, this would involve database lookups
 * @param shortCode - The short code to map
 * @returns A promise that resolves to the UUID or null if not found
 */
export async function mapShortCodeToId(shortCode: string): Promise<string | null> {
  // In a real app, you would look up the short code in a database
  // For demonstration purposes, we're returning a mock response
  
  // Simulate a database lookup with a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would check a database and return the actual UUID
      // For demo purposes, we're just returning a static mock UUID
      if (validateShortCode(shortCode)) {
        resolve(`mock-uuid-for-${shortCode}`);
      } else {
        resolve(null);
      }
    }, 300);
  });
}

/**
 * Maps a UUID to a short code
 * In a real application, this would involve database lookups
 * @param uuid - The UUID to map
 * @returns A promise that resolves to the short code or null if not found
 */
export async function mapIdToShortCode(uuid: string): Promise<string | null> {
  // In a real app, you would look up the UUID in a database
  // or generate and store a new short code if one doesn't exist
  
  // Simulate a database lookup with a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would check a database
      // For demo purposes, we're generating a short code
      const shortCode = generateShortCode();
      resolve(shortCode);
    }, 300);
  });
} 