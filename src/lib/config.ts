// Configuration for Drinks Stall Loyalty Program

// Configurable stamps required for 1 free drink. Default is 3, can be changed via environment variable STAMPS_REQUIRED.
export const STAMPS_REQUIRED = parseInt(
  process.env.STAMPS_REQUIRED || process.env.NEXT_PUBLIC_STAMPS_REQUIRED || '3',
  10
);

export const STALL_NAME = 'Fruity Fusion Bar';
export const STALL_TAGLINE = 'Fresh Boba, Smoothies & Fruit Blends';

// Cookie settings for Admin session
export const ADMIN_COOKIE_NAME = 'yec_admin_session';
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

// Rate limit configurations
export const RATE_LIMITS = {
  CUSTOMER_LOOKUP: { limit: 30, windowMs: 60 * 1000 }, // 30 requests per min
  VERIFY_STAMP: { limit: 6, windowMs: 60 * 1000 }, // 6 stamp verification attempts per min
  ADMIN_LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  ADMIN_ACTIONS: { limit: 60, windowMs: 60 * 1000 }, // 60 actions per min
};
