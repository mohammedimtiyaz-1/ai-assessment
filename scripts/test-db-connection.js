const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      process.env[key] = value;
    }
  });
}

// Use DATABASE_URL from environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const dbUrl = new URL(connectionString);
const isPooler = dbUrl.hostname.includes('pooler.supabase.com');

let finalConnectionString = connectionString;

// If using pooler, switch to direct DB connection with IPv6 address
if (isPooler) {
  const username = decodeURIComponent(dbUrl.username);
  const projectRef = username.includes('.') ? username.split('.')[1] : null;
  
  if (projectRef) {
    // Use direct database connection with IPv6 address to bypass DNS resolution issues
    finalConnectionString = `postgresql://postgres:${dbUrl.password}@[2406:da1a:b00:1301:c88d:14da:364f:946e]:5432/postgres`;
    console.log('Switching from pooler to direct DB connection with IPv6 address');
  }
}

const config = {
  connectionString: finalConnectionString,
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('Testing connection with config:', {
  originalHost: dbUrl.hostname,
  actualHost: new URL(finalConnectionString).hostname,
  port: new URL(finalConnectionString).port || 5432,
  database: new URL(finalConnectionString).pathname.slice(1),
  isPooler,
  usingIPv6: finalConnectionString.includes('2406:da1a:b00')
});

const pool = new Pool(config);

async function testConnection() {
  console.log('Testing connection...');
  try {
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.code) console.error('Error code:', err.code);
  } finally {
    await pool.end();
  }
}

testConnection();
