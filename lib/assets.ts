import { Asset } from '@/types';

export function sanitizePublicAsset(asset: Asset): Asset {
  const { storageObjectKey, ...assetWithoutObjectKey } = asset;
  if (!asset.isPremium) {
    return {
      ...assetWithoutObjectKey,
      hasPrivateFile: Boolean(asset.fileData || storageObjectKey),
      hasStorageFile: Boolean(storageObjectKey),
    };
  }

  const { fileData, fileName, downloadUrl, robloxAssetId, luauCode, ...publicAsset } = assetWithoutObjectKey;
  return {
    ...publicAsset,
    isPremium: true,
    hasPrivateFile: Boolean(fileData || storageObjectKey),
    hasStorageFile: Boolean(storageObjectKey),
  };
}

export function sanitizeAssetForUser(asset: Asset, hasPremiumAccess: boolean): Asset {
  if (asset.isPremium && !hasPremiumAccess) return sanitizePublicAsset(asset);

  const { storageObjectKey, ...userAsset } = asset;
  return {
    ...userAsset,
    hasPrivateFile: Boolean(asset.fileData || storageObjectKey),
    hasStorageFile: Boolean(storageObjectKey),
  };
}
