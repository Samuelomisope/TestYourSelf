const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});
console.log('R2_ACCESS_KEY:', process.env.R2_ACCESS_KEY);
console.log('R2_SECRET_KEY:', process.env.R2_SECRET_KEY ? 'set' : 'not set');
const { Client } = require('pg');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

async function listAllR2Files() {
  const files = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
    }));
    if (res.Contents) files.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);
  return files;
}


async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const r2Files = await listAllR2Files();
  console.log(`Total files in R2: ${r2Files.length}`);

  const dbRes = await client.query('SELECT "fileUrl" FROM "StudyMaterial"');
  const dbUrls = new Set(dbRes.rows.map(r => r.fileUrl));
  console.log(`Total files in DB: ${dbUrls.size}`);

  const missing = r2Files.filter(f => {
    const url = `${PUBLIC_URL}/${f.Key}`;
    return !dbUrls.has(url);
  });

  console.log(`Files in R2 but NOT in DB: ${missing.length}`);
  missing.forEach(f => console.log(' -', f.Key));

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });