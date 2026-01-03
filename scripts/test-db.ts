import pool from '../lib/db';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    const client = await pool.connect();
    console.log('✓ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✓ Database query successful! Current time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    console.log('Connection closed.');
  } catch (error: any) {
    console.error('✗ Database connection failed:');
    console.error('Error:', error.message);
    console.error('\nPlease check your DATABASE_URL in .env file.');
    console.error('Format should be: postgresql://username:password@host:port/database');
    process.exit(1);
  }
}

testConnection();



