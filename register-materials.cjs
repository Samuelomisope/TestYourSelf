const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

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
const PUBLIC_URL = 'https://pub-3d930003d3a544279288c67046df5137.r2.dev';
const OWNER_ID = 'd1ec8aef-32da-4c33-ae13-af07f78f1bd2'; // your user ID

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

function getFileType(key) {
  const ext = key.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'document';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['mp4', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
  return 'other';
}

function getTitle(key) {
  const filename = key.split('/').pop();
  // Remove UUID prefix if present
  return filename.replace(/^[a-f0-9-]{36}-/, '').replace(/\.[^.]+$/, '');
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const r2Files = await listAllR2Files();
  
  // Only register study-materials and PQs folders
 const toRegister = r2Files.filter(f => 
  f.Key.startsWith('study-materials/') || 
  f.Key.startsWith('PQs/') ||
  f.Key.startsWith('2nd Semester/') ||
  f.Key.startsWith('1st Semester/') ||
  f.Key.startsWith('MEE/') ||
  f.Key.startsWith('MTS/') ||
  f.Key.startsWith('CSC/') ||
  f.Key.startsWith('PHY/') ||
  f.Key.startsWith('CHE/') ||
  f.Key.startsWith('GNS/') ||
  f.Key.startsWith('BIO/')
);
  console.log(`Files to register: ${toRegister.length}`);

  // Get existing URLs
  const dbRes = await client.query('SELECT "fileUrl" FROM "StudyMaterial"');
  const existingUrls = new Set(dbRes.rows.map(r => r.fileUrl));

  let inserted = 0;
  for (const file of toRegister) {
    const url = `${PUBLIC_URL}/${file.Key}`;
    if (existingUrls.has(url)) continue;

    const title = getTitle(file.Key);
    const fileType = getFileType(file.Key);

    await client.query(
    `INSERT INTO "StudyMaterial" (id, title, "fileUrl", "fileType", "userId", "universityId", "createdAt", "updatedAt", "isPublic")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW(), true)
       ON CONFLICT DO NOTHING`,
      [title, url, fileType, OWNER_ID, '39caa8f0-4344-4c46-b823-ac106074ba12']
    );
    inserted++;
    console.log(`Inserted: ${title}`);
  }

  console.log(`\nDone! Inserted ${inserted} files.`);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });