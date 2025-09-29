// Comprehensive validation utilities for AptosPay

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation with strict RFC 5322 compliance
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: "Email is required" };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: "Email address is too long" };
  }

  // RFC 5322 compliant regex for email validation
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: "Invalid email format" };
  }

  // Check for common typos in popular domains
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = trimmedEmail.split('@')[1];
  const typoPatterns = ['gmial.com', 'gmai.com', 'yahooo.com', 'homail.com'];

  if (typoPatterns.includes(domain)) {
    return { isValid: false, error: `Did you mean ${domain.replace(/gmial|gmai/, 'gmail').replace(/yahooo/, 'yahoo').replace(/homail/, 'hotmail')}?` };
  }

  return { isValid: true };
}

// Payment amount validation
export function validatePaymentAmount(amount: string | number): ValidationResult {
  if (amount === '' || amount === null || amount === undefined) {
    return { isValid: false, error: "Amount is required" };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { isValid: false, error: "Amount must be a number" };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (numAmount > 1000000) {
    return { isValid: false, error: "Amount exceeds maximum limit of $1,000,000" };
  }

  // Check decimal places (max 2 for USD)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: "Amount can have maximum 2 decimal places" };
  }

  return { isValid: true };
}

// Aptos address validation
export function validateAptosAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: "Address is required" };
  }

  const trimmedAddress = address.trim();

  // Aptos addresses are 64 hex characters with optional 0x prefix
  const addressRegex = /^(0x)?[a-fA-F0-9]{64}$/;

  if (!addressRegex.test(trimmedAddress)) {
    return { isValid: false, error: "Invalid Aptos address format" };
  }

  return { isValid: true };
}

// Payment link validation
export function validatePaymentLink(link: string): ValidationResult {
  if (!link || typeof link !== 'string') {
    return { isValid: false, error: "Payment link is required" };
  }

  try {
    const url = new URL(link);

    // Check if it's a valid AptosPay link
    if (!url.pathname.startsWith('/pay/')) {
      return { isValid: false, error: "Invalid payment link format" };
    }

    // Extract and validate parameters
    const pathParts = url.pathname.split('/').filter(p => p);
    if (pathParts.length < 4) {
      return { isValid: false, error: "Incomplete payment link" };
    }

    const amount = pathParts[1].replace('$', '');
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.isValid) {
      return { isValid: false, error: `Invalid amount in link: ${amountValidation.error}` };
    }

    if (pathParts[2] !== 'to') {
      return { isValid: false, error: "Invalid payment link format" };
    }

    const email = pathParts[3];
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { isValid: false, error: `Invalid recipient email: ${emailValidation.error}` };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Invalid URL format" };
  }
}

// JWT validation for OAuth callback
export function validateJWT(token: string): ValidationResult {
  if (!token || typeof token !== 'string') {
    return { isValid: false, error: "Token is required" };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { isValid: false, error: "Invalid JWT format" };
  }

  try {
    // Decode and validate header
    const header = JSON.parse(atob(parts[0]));
    if (!header.alg || !header.typ) {
      return { isValid: false, error: "Invalid JWT header" };
    }

    // Decode and validate payload
    const payload = JSON.parse(atob(parts[1]));

    // Check required fields
    if (!payload.iss || !payload.aud || !payload.exp || !payload.iat) {
      return { isValid: false, error: "Missing required JWT claims" };
    }

    // Check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTime) {
      return { isValid: false, error: "JWT has expired" };
    }

    // Check issued time
    if (payload.iat > currentTime) {
      return { isValid: false, error: "JWT issued in the future" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Invalid JWT encoding" };
  }
}

// Nonce validation for ephemeral keys
export function validateNonce(nonce: string): ValidationResult {
  if (!nonce || typeof nonce !== 'string') {
    return { isValid: false, error: "Nonce is required" };
  }

  // Nonce should be a base64url encoded string
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;

  if (!base64urlRegex.test(nonce)) {
    return { isValid: false, error: "Invalid nonce format" };
  }

  if (nonce.length < 16 || nonce.length > 256) {
    return { isValid: false, error: "Nonce length must be between 16 and 256 characters" };
  }

  return { isValid: true };
}

// Environment configuration validation
export function validateEnvironmentConfig(): ValidationResult {
  const requiredEnvVars = [
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_REDIRECT_URI',
    'NEXT_PUBLIC_APTOS_NETWORK',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    return {
      isValid: false,
      error: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  }

  // Validate Google Client ID format
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    return {
      isValid: false,
      error: 'Invalid Google Client ID format'
    };
  }

  // Validate redirect URI
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;
  try {
    new URL(redirectUri);
  } catch {
    return {
      isValid: false,
      error: 'Invalid redirect URI format'
    };
  }

  // Validate Aptos network
  const validNetworks = ['testnet', 'mainnet', 'devnet'];
  const network = process.env.NEXT_PUBLIC_APTOS_NETWORK!;
  if (!validNetworks.includes(network)) {
    return {
      isValid: false,
      error: `Invalid Aptos network. Must be one of: ${validNetworks.join(', ')}`
    };
  }

  return { isValid: true };
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Validate and sanitize payment message (optional field)
export function validatePaymentMessage(message: string): ValidationResult {
  if (!message) {
    return { isValid: true }; // Message is optional
  }

  if (typeof message !== 'string') {
    return { isValid: false, error: "Message must be a string" };
  }

  if (message.length > 500) {
    return { isValid: false, error: "Message cannot exceed 500 characters" };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /data:text\/html/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return { isValid: false, error: "Message contains invalid content" };
    }
  }

  return { isValid: true };
}