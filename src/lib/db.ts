/**
 * Database client with automatic fallback to in-memory storage
 * Gracefully handles database unavailability
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;
let dbAvailable = false;
let dbCheckPromise: Promise<boolean> | null = null;

/**
 * Initialize Prisma client with connection test
 */
async function initializePrisma(): Promise<boolean> {
  if (dbCheckPromise) {
    return dbCheckPromise;
  }

  dbCheckPromise = (async () => {
    try {
      if (!process.env.DATABASE_URL) {
        console.warn("⚠️ DATABASE_URL not set - using in-memory storage");
        return false;
      }

      prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

      // Test connection with a simple query
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;

      console.log("✅ Database connected successfully");
      dbAvailable = true;
      return true;
    } catch (error) {
      console.warn("⚠️ Database unavailable, falling back to in-memory storage:", error);
      prisma = null;
      dbAvailable = false;
      return false;
    }
  })();

  return dbCheckPromise;
}

/**
 * Get Prisma client (initializes on first call)
 */
export async function getPrisma(): Promise<PrismaClient | null> {
  if (!dbAvailable && !dbCheckPromise) {
    await initializePrisma();
  }

  return prisma;
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!dbCheckPromise) {
    await initializePrisma();
  }
  return dbAvailable;
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    dbAvailable = false;
  }
}

// Auto-initialize on import (non-blocking)
if (typeof window === "undefined") {
  initializePrisma().catch(() => {
    // Silently fail, fallback will be used
  });
}

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    disconnectDatabase().catch(console.error);
  });
}