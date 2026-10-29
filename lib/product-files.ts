export const MAX_PRODUCT_FILE_BYTES = 25 * 1024 * 1024;
export const SUPABASE_STORAGE_BUCKET = 'product-files';

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const PRODUCT_OBJECT_KEY_PATTERN = /^products\/([A-Za-z0-9_-]{1,120})\/([0-9a-f-]{36})$/;

interface SupabaseStorageConfig {
  url: string;
  secretKey: string;
}

function getSupabaseStorageConfig(): SupabaseStorageConfig {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) {
    throw new Error('SUPABASE_URL dan SUPABASE_SECRET_KEY harus dikonfigurasi sebagai Cloudflare Worker secrets.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('SUPABASE_URL tidak valid.');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
    throw new Error('SUPABASE_URL harus berupa alamat HTTPS yang valid.');
  }

  return { url: parsedUrl.origin, secretKey };
}

function getStorageObjectUrl(config: SupabaseStorageConfig, objectKey: string): string {
  const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
  return `${config.url}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${encodedKey}`;
}

function getStorageHeaders(secretKey: string, extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders);
  headers.set('apikey', secretKey);
  headers.set('Authorization', `Bearer ${secretKey}`);
  return headers;
}

export function isValidProductId(productId: string): boolean {
  return PRODUCT_ID_PATTERN.test(productId);
}

export function isProductObjectKeyForId(key: string, productId: string): boolean {
  const match = PRODUCT_OBJECT_KEY_PATTERN.exec(key);
  return Boolean(match && match[1] === productId);
}

export async function uploadProductFile(
  productId: string,
  body: ArrayBuffer,
  contentType: string,
  size: number
): Promise<string> {
  if (!isValidProductId(productId)) throw new Error('Product ID tidak valid.');
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_PRODUCT_FILE_BYTES) {
    throw new Error('Ukuran file produk harus di antara 1 byte dan 25 MB.');
  }

  const config = getSupabaseStorageConfig();
  const objectKey = `products/${productId}/${crypto.randomUUID()}`;
  const safeContentType = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(contentType)
    ? contentType
    : 'application/octet-stream';
  const response = await fetch(getStorageObjectUrl(config, objectKey), {
    method: 'POST',
    headers: getStorageHeaders(config.secretKey, {
      'Content-Type': safeContentType,
      'x-upsert': 'false',
    }),
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase Storage upload failed with HTTP ${response.status}:`, detail.slice(0, 500));
    throw new Error(`Supabase Storage gagal menerima file (HTTP ${response.status}).`);
  }
  return objectKey;
}

export async function deleteProductFile(objectKey: string, productId: string): Promise<void> {
  if (!isProductObjectKeyForId(objectKey, productId)) {
    throw new Error('Storage object key tidak sesuai dengan produk.');
  }

  const config = getSupabaseStorageConfig();
  const response = await fetch(`${config.url}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}`, {
    method: 'DELETE',
    headers: getStorageHeaders(config.secretKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [objectKey] }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase Storage delete failed with HTTP ${response.status}:`, detail.slice(0, 500));
    throw new Error(`Supabase Storage gagal menghapus file (HTTP ${response.status}).`);
  }
}

export async function downloadProductFile(objectKey: string): Promise<Response | null> {
  const config = getSupabaseStorageConfig();
  const response = await fetch(getStorageObjectUrl(config, objectKey), {
    headers: getStorageHeaders(config.secretKey),
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase Storage download failed with HTTP ${response.status}:`, detail.slice(0, 500));
    throw new Error(`Supabase Storage gagal mengambil file (HTTP ${response.status}).`);
  }
  return response;
}

export async function migrateInlineProductFile<T extends {
  id: string;
  title?: string;
  fileName?: string;
  fileData?: string;
  storageObjectKey?: string;
}>(product: T): Promise<T> {
  if (product.storageObjectKey || !product.fileData?.startsWith('data:')) return product;

  const match = /^data:([^;,]+)?;base64,([\s\S]*)$/.exec(product.fileData);
  if (!match) throw new Error(`Format file produk "${product.title ?? product.id}" tidak valid.`);

  const bytes = Buffer.from(match[2], 'base64');
  const objectKey = await uploadProductFile(
    product.id,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    match[1] || 'application/octet-stream',
    bytes.byteLength
  );

  return {
    ...product,
    fileData: undefined,
    storageObjectKey: objectKey,
  };
}
