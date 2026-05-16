import { z } from "zod";

/**
 * Password validation schema with strict security requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - No common patterns or sequences
 */
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    "Password must not contain repeating characters (e.g., 'aaa')"
  )
  .refine(
    (password) => !/123|234|345|456|567|678|789|890|012|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password),
    "Password must not contain common sequences"
  )
  .refine(
    (password) => !/password|123456|qwerty|admin|letmein|welcome/i.test(password),
    "Password must not contain common words"
  );

/**
 * Validate password strength and return detailed feedback
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
} {
  const result = passwordSchema.safeParse(password);
  const errors = result.success ? [] : result.error.errors.map(e => e.message);
  
  // Calculate strength
  let strengthScore = 0;
  if (password.length >= 8) strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (/[A-Z]/.test(password)) strengthScore++;
  if (/[a-z]/.test(password)) strengthScore++;
  if (/[0-9]/.test(password)) strengthScore++;
  if (/[^A-Za-z0-9]/.test(password)) strengthScore++;
  if (password.length >= 16) strengthScore++;
  
  let strength: "weak" | "medium" | "strong" = "weak";
  if (strengthScore >= 5) strength = "medium";
  if (strengthScore >= 7) strength = "strong";
  
  return {
    isValid: result.success,
    errors,
    strength,
  };
}

/**
 * Hash password using bcrypt with secure cost factor
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12); // Cost factor of 12 for security
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}
