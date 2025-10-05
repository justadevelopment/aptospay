/**
 * QR Code generation and parsing utilities for Aptfy
 * Supports payment requests with APT and USDC
 */

import { TokenSymbol, isValidToken } from './tokens';

export interface PaymentRequest {
  chain: 'aptos';
  network: 'testnet' | 'mainnet';
  token: TokenSymbol;
  amount: number;
  recipient: string; // Aptos address
  memo?: string;
  timestamp: number;
  merchantName?: string;
}

/**
 * Generate payment request data for QR code
 * @param params - Payment request parameters
 * @returns Base64-encoded JSON string for QR code
 */
export function generatePaymentRequest(params: {
  token: TokenSymbol;
  amount: number;
  recipient: string;
  memo?: string;
  merchantName?: string;
  network?: 'testnet' | 'mainnet';
}): string {
  // Validate token
  if (!isValidToken(params.token)) {
    throw new Error(`Invalid token: ${params.token}`);
  }

  // Validate amount
  if (params.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Validate Aptos address format
  if (!params.recipient.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid Aptos address format');
  }

  const paymentRequest: PaymentRequest = {
    chain: 'aptos',
    network: params.network || 'testnet',
    token: params.token,
    amount: params.amount,
    recipient: params.recipient,
    memo: params.memo,
    merchantName: params.merchantName,
    timestamp: Date.now(),
  };

  // Convert to JSON and encode as base64
  const json = JSON.stringify(paymentRequest);
  const base64 = Buffer.from(json).toString('base64');

  // Add protocol prefix for deep linking
  return `aptfy://pay?data=${base64}`;
}

/**
 * Parse payment request from QR code data
 * @param qrData - QR code string data
 * @returns Parsed payment request
 * @throws Error if invalid format
 */
export function parsePaymentRequest(qrData: string): PaymentRequest {
  try {
    // Check for protocol prefix
    if (!qrData.startsWith('aptfy://pay?data=')) {
      throw new Error('Invalid Aptfy QR code format');
    }

    // Extract base64 data
    const base64 = qrData.replace('aptfy://pay?data=', '');

    // Decode base64 to JSON
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const data = JSON.parse(json) as PaymentRequest;

    // Validate required fields
    if (data.chain !== 'aptos') {
      throw new Error('Invalid chain - only Aptos supported');
    }

    if (!isValidToken(data.token)) {
      throw new Error(`Unsupported token: ${data.token}`);
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!data.recipient || !data.recipient.match(/^0x[a-fA-F0-9]{64}$/)) {
      throw new Error('Invalid recipient address');
    }

    if (!data.network || !['testnet', 'mainnet'].includes(data.network)) {
      throw new Error('Invalid network');
    }

    // Check if request is not too old (24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (now - data.timestamp > maxAge) {
      throw new Error('Payment request expired (older than 24 hours)');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse payment request: ${error.message}`);
    }
    throw new Error('Failed to parse payment request');
  }
}

/**
 * Generate QR code-friendly URL for payment
 * @param paymentRequest - Payment request object
 * @returns URL that can be converted to QR code
 */
export function generateQRCodeURL(paymentRequest: PaymentRequest): string {
  const json = JSON.stringify(paymentRequest);
  const base64 = Buffer.from(json).toString('base64');
  return `aptfy://pay?data=${base64}`;
}

/**
 * Validate payment request before processing
 * @param request - Payment request to validate
 * @returns True if valid, throws error otherwise
 */
export function validatePaymentRequest(request: PaymentRequest): boolean {
  // Validate chain
  if (request.chain !== 'aptos') {
    throw new Error('Only Aptos chain supported');
  }

  // Validate network
  if (!['testnet', 'mainnet'].includes(request.network)) {
    throw new Error('Invalid network');
  }

  // Validate token
  if (!isValidToken(request.token)) {
    throw new Error('Invalid token');
  }

  // Validate amount
  if (request.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Validate recipient address
  if (!request.recipient.match(/^0x[a-fA-F0-9]{64}$/)) {
    throw new Error('Invalid recipient address');
  }

  // Check expiration (24 hours)
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  if (now - request.timestamp > maxAge) {
    throw new Error('Payment request expired');
  }

  return true;
}
