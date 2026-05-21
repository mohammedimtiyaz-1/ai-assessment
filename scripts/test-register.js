const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { crypto } = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres.usjpcpoqttvqrcltccuk:12345@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testRegister() {
  const email = 'test' + Date.now() + '@example.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  const id = '11111111-1111-1111-1111-111111111111';

  console.log('Attempting to register:', email);
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [id, email, hash, 'Test User', 'student']
      );
      console.log('Registration successful! ID:', res.rows[0].id);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.code) console.error('Code:', err.code);
  } finally {
    await pool.end();
  }
}

testRegister();
