import crypto from 'crypto';

// Configuration for 30-second rolling verification code (TOTP RFC 6238 compatible)
const TIME_STEP_SECONDS = 30;
const CODE_DIGITS = 6;

// Fallback secret for local development if not set in environment
const DEFAULT_DEV_TOTP_SECRET = 'fruity-fusion-bar-totp-secret-key-32chars-min!';

export function getTotpSecret(): string {
  const secret = process.env.STAFF_TOTP_SECRET || process.env.TOTP_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STAFF_TOTP_SECRET environment variable is missing in production!');
    }
    return DEFAULT_DEV_TOTP_SECRET;
  }
  return secret;
}

/**
 * Generate 6-digit TOTP code for a specific time counter
 */
export function generateCodeForCounter(counter: number, secret: string): string {
  // 8-byte big-endian buffer for counter
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 / RFC 6238)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, CODE_DIGITS);
  return otp.toString().padStart(CODE_DIGITS, '0');
}

/**
 * Get the current rolling code, seconds remaining in this 30s period, and step interval
 */
export function getCurrentRollingCode(): {
  code: string;
  secondsRemaining: number;
  timeStep: number;
  currentCounter: number;
} {
  const secret = getTotpSecret();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(nowSeconds / TIME_STEP_SECONDS);
  const secondsRemaining = TIME_STEP_SECONDS - (nowSeconds % TIME_STEP_SECONDS);

  const code = generateCodeForCounter(currentCounter, secret);

  return {
    code,
    secondsRemaining,
    timeStep: TIME_STEP_SECONDS,
    currentCounter,
  };
}

// In-memory cache to prevent token replay for the same student within the active window
// Key: `${studentId}:${counter}` -> timestamp consumed
const usedTokensCache = new Map<string, number>();

// Clean up expired replay records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of usedTokensCache.entries()) {
    // Keep entries for 3 minutes (covers active window + clock drift)
    if (now - timestamp > 3 * 60 * 1000) {
      usedTokensCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Verify a 6-digit staff code submitted by a student
 * Allows ±1 window (30s) drift tolerance to handle network latency or clock differences
 */
export function verifyStaffCode(
  inputCode: string,
  studentId: string
): { valid: boolean; error?: string } {
  const cleanCode = inputCode.trim();
  if (!cleanCode || cleanCode.length !== CODE_DIGITS || !/^\d+$/.test(cleanCode)) {
    return { valid: false, error: 'Code must be a 6-digit number.' };
  }

  const secret = getTotpSecret();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(nowSeconds / TIME_STEP_SECONDS);

  // Check current counter and ±1 step tolerance (documented 30s clock-drift tolerance)
  const candidateCounters = [
    currentCounter, // Current 30s window (most likely)
    currentCounter - 1, // Just expired in last 30s (grace period for typing)
    currentCounter + 1, // Slight forward clock drift
  ];

  let matchedCounter: number | null = null;

  for (const counter of candidateCounters) {
    const expected = generateCodeForCounter(counter, secret);
    // Constant-time comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      matchedCounter = counter;
      break;
    }
  }

  if (matchedCounter === null) {
    return {
      valid: false,
      error: 'Invalid or expired staff code. Please check the current code on the staff terminal.',
    };
  }

  // Prevent replay: A student cannot use the same counter code more than once
  const replayKey = `${studentId.toUpperCase()}:${matchedCounter}`;
  if (usedTokensCache.has(replayKey)) {
    return {
      valid: false,
      error: 'This verification code was already used for your purchase. Please wait for the next rolling code.',
    };
  }

  // Mark token as consumed for this student
  usedTokensCache.set(replayKey, Date.now());

  return { valid: true };
}
