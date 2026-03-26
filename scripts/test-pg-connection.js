const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Attempting to connect to the database...');
    await client.connect();
    console.log('✅ Connection successful!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Results:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
