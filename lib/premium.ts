import { Timestamp } from 'firebase-admin/firestore';
import { Asset } from '@/types';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { sanitizePublicAsset } from '@/lib/assets';

export interface PremiumEntitlement {
  discordId: string;
  expiresAt: number;
}

export interface PremiumAssetDetails {
  robloxAssetId?: string;
  downloadUrl?: string;
  luauCode?: string;
  fileName?: string;
  hasPrivateFile: boolean;
}

interface PremiumProductRecord extends PremiumAssetDetails {
  active?: boolean;
  filePath?: string;
  contentType?: string;
}

const DISCORD_ID_PATTERN = /^\d{17,20}$/;

export function isValidDiscordId(discordId: string): boolean {
  return DISCORD_ID_PATTERN.test(discordId);
}

export async function getPremiumEntitlement(discordId: string): Promise<PremiumEntitlement | null> {
  const snapshot = await getAdminFirestore().collection('premiumEntitlements').doc(discordId).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data();
  const expiresAt = data?.expiresAt;
  const expiration = expiresAt instanceof Timestamp
    ? expiresAt.toMillis()
    : typeof expiresAt === 'number'
      ? expiresAt
      : Number.NaN;

  if (!Number.isFinite(expiration) || expiration <= Date.now()) return null;
  return { discordId, expiresAt: expiration };
}

export async function getPremiumProductRecord(productId: string): Promise<PremiumProductRecord | null> {
  const snapshot = await getAdminFirestore().collection('premiumProducts').doc(productId).get();
  if (!snapshot.exists) return null;
  const record = snapshot.data() as PremiumProductRecord;
  return record.active === false ? null : record;
}

export function sanitizePremiumAsset(asset: Asset): Asset {
  return sanitizePublicAsset(asset);
}

export async function storePremiumProduct(asset: Asset): Promise<Asset> {
  const firestore = getAdminFirestore();
  const productRef = firestore.collection('premiumProducts').doc(asset.id);
  const existingSnapshot = await productRef.get();
  const existing = existingSnapshot.data() as PremiumProductRecord | undefined;
  let filePath = existing?.filePath;
  let contentType = existing?.contentType;

  if (asset.fileData) {
    const match = asset.fileData.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
    if (!match) throw new Error('File premium tidak valid. Upload ulang file map.');

    const fileBuffer = Buffer.from(match[2], 'base64');
    if (fileBuffer.length === 0 || fileBuffer.length > 3 * 1024 * 1024) {
      throw new Error('File premium harus berukuran maksimal 3 MB.');
    }

    const safeFileName = (asset.fileName || 'premium-asset')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);
    filePath = `premium-products/${asset.id}/${safeFileName}`;
    contentType = match[1];
    await getAdminStorage().bucket().file(filePath).save(fileBuffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'private, no-store, max-age=0',
      },
    });
  }

  if (!filePath && !asset.downloadUrl && !asset.robloxAssetId && !asset.luauCode) {
    throw new Error('Produk Premium perlu file, link download, Roblox Asset ID, atau script.');
  }

  await productRef.set({
    productId: asset.id,
    active: true,
    filePath: filePath || null,
    contentType: contentType || null,
    fileName: asset.fileName || existing?.fileName || null,
    downloadUrl: asset.downloadUrl || null,
    robloxAssetId: asset.robloxAssetId || null,
    luauCode: asset.luauCode || null,
    updatedAt: Timestamp.now(),
  });

  return sanitizePremiumAsset(asset);
}

export async function getPremiumProductsForAdmin(assets: Asset[]): Promise<Asset[]> {
  if (!assets.some((asset) => asset.isPremium)) return assets;
  return Promise.all(assets.map(async (asset) => {
    if (!asset.isPremium) return asset;

    const record = await getPremiumProductRecord(asset.id);
    if (!record) return asset;

    return {
      ...asset,
      downloadUrl: record.downloadUrl || undefined,
      robloxAssetId: record.robloxAssetId || undefined,
      luauCode: record.luauCode || undefined,
      fileName: record.fileName || undefined,
      hasPrivateFile: Boolean(record.filePath),
    };
  }));
}

export async function removePremiumProduct(productId: string): Promise<void> {
  const firestore = getAdminFirestore();
  const productRef = firestore.collection('premiumProducts').doc(productId);
  const record = await productRef.get();
  const filePath = record.data()?.filePath;

  await productRef.set({ active: false, updatedAt: Timestamp.now() }, { merge: true });
  if (typeof filePath === 'string') {
    await getAdminStorage().bucket().file(filePath).delete({ ignoreNotFound: true });
  }
  await productRef.delete();
}
