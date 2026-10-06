/* ==========================================================================
   _r2.js — Cloudflare R2 media storage (replaces the Neon `media` table).

   WHY: photos/logo/stamp/signatures were the heaviest, most frequently
   re-transferred payloads hitting Neon's public network transfer limit.
   R2 has ZERO egress fees (Cloudflare's whole pitch for R2), so moving
   media here takes that traffic off Neon's meter entirely, for good -
   this matters far more as real student photos get uploaded over time
   than it did on day one with a freshly wiped, almost-empty database.

   DESIGN CHOICE - kept private, not a public bucket URL: it would be
   simpler to make the R2 bucket public and just hand the browser a direct
   URL, but that would mean student photos and signatures are readable by
   anyone with the link, no login required - a real privacy regression from
   today's behavior (media-get.js currently requires a valid session). So
   this keeps the bucket PRIVATE and has the Netlify Function fetch the
   object server-side (authenticated with the R2 API token below) and hand
   the bytes back to the browser only after the existing session check -
   exactly the same security boundary as the old Postgres-backed version,
   just backed by R2 instead.

   Required environment variables (see .env.example):
     R2_ACCOUNT_ID       - Cloudflare account ID
     R2_ACCESS_KEY_ID    - R2 API token access key
     R2_SECRET_ACCESS_KEY - R2 API token secret
     R2_BUCKET_NAME      - the bucket created for this school's media
   ========================================================================== */
"use strict";

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

let client = null;

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not set. See .env.example.");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

function bucketName() {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME is not set. See .env.example.");
  return name;
}

/** Splits a "data:image/jpeg;base64,AAAA..." string into { contentType, buffer }. */
function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Not a valid data: URL.");
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Uploads one media item. `key` matches the app's existing media keys (e.g. "student_abc123"). */
async function putMedia(key, dataUrl) {
  const { contentType, buffer } = parseDataUrl(dataUrl);
  await getClient().send(new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

/** Returns { found:false } or { found:true, dataUrl } — same shape the app already expects. */
async function getMedia(key) {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
    const buffer = await streamToBuffer(result.Body);
    const contentType = result.ContentType || "application/octet-stream";
    return { found: true, dataUrl: `data:${contentType};base64,${buffer.toString("base64")}` };
  } catch (err) {
    if (err && (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404)) return { found: false };
    throw err;
  }
}

async function deleteMedia(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

module.exports = { putMedia, getMedia, deleteMedia };
