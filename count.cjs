const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect()
  .then(() => client.query('SELECT COUNT(*) FROM "StudyMaterial"'))
  .then(r => { console.log('Total:', r.rows[0].count); return client.end(); })
  .catch(err => { console.error(err); process.exit(1); });
  