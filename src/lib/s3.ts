import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

/**
 * S3-compatible client. Works with Cloudflare R2 (endpoint =
 * https://<accountid>.r2.cloudflarestorage.com) or AWS S3.
 */
const hasStorage =
  !!process.env.S3_ENDPOINT &&
  !!process.env.S3_ACCESS_KEY_ID &&
  !!process.env.S3_SECRET_ACCESS_KEY &&
  !!process.env.S3_BUCKET;

export const s3 = hasStorage
  ? new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    })
  : null;

export const STORAGE_ENABLED = hasStorage;

/** Build an object key: cases/<caseId>/<uuid>-<safeName>. */
export function buildObjectKey(caseId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return `cases/${caseId}/${crypto.randomUUID()}-${safe}`;
}

export function publicUrlForKey(key: string): string {
  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${key}`;
}

/** Create a presigned PUT URL so the browser uploads directly to storage. */
export async function createUploadUrl(params: {
  key: string;
  contentType: string;
}): Promise<string> {
  if (!s3) throw new Error("Storage is not configured");
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 5 });
}

export async function deleteObject(key: string): Promise<void> {
  if (!s3) return;
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
  );
}
