/**
 * Database client - PRODUCTION READY
 * Database is REQUIRED for operation - no fallbacks
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;
let initPromise: Promise<PrismaClient> | null = null;

/**
 * Initialize and get Prisma client
 * Throws error if database is not available
 */
export async function getPrisma(): Promise<PrismaClient> {
  // Return existing client if available
  if (prisma) {
    return prisma;
  }

  // Return existing initialization promise if in progress
  if (initPromise) {
    return initPromise;
  }

  // Initialize new client
  initPromise = (async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
        "Please configure your PostgreSQL database connection."
      );
    }

    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

    try {
      // Test connection
      await client.$connect();
      await client.$queryRaw`SELECT 1`;

      console.log("✅ Database connected successfully");
      prisma = client;
      return client;
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw new Error(
        "Failed to connect to database. Please check your DATABASE_URL and ensure " +
        "the PostgreSQL server is running and accessible."
      );
    }
  })();

  return initPromise;
}

/**
 * Disconnect from database (for cleanup)
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    initPromise = null;
  }
}

// Cleanup on process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    disconnectDatabase().catch(console.error);
  });

  process.on("SIGINT", () => {
    disconnectDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    disconnectDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}