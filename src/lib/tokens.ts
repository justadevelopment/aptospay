/**
 * Token configuration for Aptfy
 * Supports APT (native coin) and USDC (fungible asset)
 */

export type TokenType = 'coin' | 'fungible_asset';

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  type: TokenType;
  transferFunction: string;
  address?: string; // Required for fungible assets, not needed for APT
  typeArguments?: readonly string[]; // Required for some transfer functions
}

/**
 * Supported tokens on Aptos testnet
 */
export const TOKENS = {
  APT: {
    symbol: 'APT',
    name: 'Aptos Coin',
    decimals: 8,
    type: 'coin' as TokenType,
    transferFunction: '0x1::aptos_account::transfer',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
    type: 'fungible_asset' as TokenType,
    transferFunction: '0x1::primary_fungible_store::transfer',
    typeArguments: ['0x1::fungible_asset::Metadata'],
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

/**
 * Convert human-readable amount to blockchain units
 * @param amount - Amount in human-readable format (e.g., 1.5)
 * @param token - Token symbol
 * @returns Amount in smallest units (e.g., 150000000 for 1.5 APT)
 */
export function toUnits(amount: number, token: TokenSymbol): number {
  const config = TOKENS[token];
  return Math.floor(amount * Math.pow(10, config.decimals));
}

/**
 * Convert blockchain units to human-readable amount
 * @param units - Amount in smallest units
 * @param token - Token symbol
 * @returns Amount in human-readable format
 */
export function fromUnits(units: number, token: TokenSymbol): number {
  const config = TOKENS[token];
  return units / Math.pow(10, config.decimals);
}

/**
 * Validate token symbol
 * @param symbol - Token symbol to validate
 * @returns True if valid token symbol
 */
export function isValidToken(symbol: string): symbol is TokenSymbol {
  return symbol in TOKENS;
}

/**
 * Get token configuration
 * @param symbol - Token symbol
 * @returns Token configuration
 * @throws Error if token not found
 */
export function getTokenConfig(symbol: TokenSymbol): TokenConfig {
  const config = TOKENS[symbol];
  if (!config) {
    throw new Error(`Token ${symbol} not supported`);
  }
  return config;
}

/**
 * Format amount for display with proper decimals
 * @param amount - Amount in human-readable format
 * @param token - Token symbol
 * @returns Formatted string (e.g., "1.50 USDC")
 */
export function formatAmount(amount: number, token: TokenSymbol): string {
  const config = TOKENS[token];
  // USDC shows 2 decimals, APT shows up to 4
  const decimals = token === 'USDC' ? 2 : 4;
  return `${amount.toFixed(decimals)} ${config.symbol}`;
}

/**
 * Get all supported token symbols
 * @returns Array of token symbols
 */
export function getSupportedTokens(): TokenSymbol[] {
  return Object.keys(TOKENS) as TokenSymbol[];
}
