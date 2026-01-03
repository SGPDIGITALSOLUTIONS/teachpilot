import 'dotenv/config';

console.log('Environment check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  // Mask password in output
  const masked = url.replace(/:([^:@]+)@/, ':****@');
  console.log('DATABASE_URL (masked):', masked);
  console.log('DATABASE_URL length:', url.length);
} else {
  console.log('❌ DATABASE_URL is not set!');
  console.log('Please ensure your .env file contains: DATABASE_URL=postgresql://...');
}


