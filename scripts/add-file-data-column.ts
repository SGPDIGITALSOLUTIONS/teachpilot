import 'dotenv/config';
import pool from '../lib/db';

async function addFileDataColumn() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'revision_materials' 
      AND column_name = 'file_data'
    `);

    if (checkResult.rows.length === 0) {
      // Add file_data column
      await client.query(`
        ALTER TABLE revision_materials 
        ADD COLUMN file_data BYTEA
      `);
      console.log('Added file_data column to revision_materials table');
    } else {
      console.log('file_data column already exists');
    }

    // Also make content nullable since we might not have it initially
    await client.query(`
      ALTER TABLE revision_materials 
      ALTER COLUMN content DROP NOT NULL
    `);
    console.log('Made content column nullable');

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addFileDataColumn();

