const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect()
  .then(() => client.query('SELECT DISTINCT "universityId", "faculty", "department", "level" FROM "StudyMaterial" WHERE "userId" = \'d1ec8aef-32da-4c33-ae13-af07f78f1bd2\' LIMIT 1'))
  .then(r => { console.log(r.rows); return client.end(); })
  .catch(console.error);