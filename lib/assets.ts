import { Asset } from '@/types';

export function sanitizePublicAsset(asset: Asset): Asset {
  if (!asset.isPremium) return asset;

  const {
    fileData,
    fileName,
    downloadUrl,
    robloxAssetId,
    luauCode,
    ...publicAsset
  } = asset;
  return {
    ...publicAsset,
    isPremium: true,
    hasPrivateFile: Boolean(fileData || fileName),
  };
}
