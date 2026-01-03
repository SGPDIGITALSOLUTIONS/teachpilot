import { Pool } from 'pg';

// Check if we're in a build context
// More robust detection: check for Next.js build phase, or if we're in a build script
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (typeof process.env.NEXT_PHASE !== 'undefined' && process.env.NEXT_PHASE.includes('build')) ||
                     (process.env.NODE_ENV === 'production' && 
                      typeof window === 'undefined' && 
                      !process.env.VERCEL_ENV && 
                      (process.argv.includes('build') || process.argv.some(arg => arg.includes('next'))));

// Support both DATABASE_URL and POSTGRES_URL for flexibility
let pool: Pool | null = null;

function getPool(): Pool {
  // Skip database connection during build
  if (isBuildTime) {
    throw new Error('Database connection not available during build. This should only be called at runtime.');
  }

  // Only check and create pool when actually needed (at runtime, not build time)
  if (!pool) {
    // Load dotenv only when needed
    try {
      require('dotenv/config');
    } catch (e) {
      // dotenv might already be loaded
    }

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set. Please check your .env file.');
    }

    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
    });
  }

  return pool;
}

// Export a proxy object that lazily creates the pool when accessed
// This prevents the pool from being created during build time
export default new Proxy({} as Pool, {
  get(_target, prop) {
    // During build, return a no-op for most operations
    if (isBuildTime) {
      if (prop === 'query') {
        return () => Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (prop === 'connect') {
        return () => Promise.resolve({} as any);
      }
      if (prop === 'end') {
        return () => Promise.resolve();
      }
      return undefined;
    }
    
    const poolInstance = getPool();
    const value = poolInstance[prop as keyof Pool];
    // If it's a function, bind it to the pool instance
    if (typeof value === 'function') {
      return value.bind(poolInstance);
    }
    return value;
  }
});


