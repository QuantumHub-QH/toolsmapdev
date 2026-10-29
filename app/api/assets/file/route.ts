export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { Asset } from '@/types';
import { fetchProductsFromGitHub } from '@/lib/github';
import { getDiscordSession } from '@/lib/discord-session';
import { getPremiumEntitlement } from '@/lib/premium';
import { downloadProductFile, isProductObjectKeyForId, isValidProductId } from '@/lib/product-files';

export async function GET(request: NextRequest) {
  const session = getDiscordSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Login Discord diperlukan untuk mengunduh file.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const productId = new URL(request.url).searchParams.get('id');
  if (!productId || !isValidProductId(productId)) {
    return NextResponse.json({ success: false, error: 'Product ID tidak valid.' }, { status: 400 });
  }

  try {
    const products = await fetchProductsFromGitHub();
    const product = products.find((item: Asset) => item.id === productId);
    if (!product?.storageObjectKey || !isProductObjectKeyForId(product.storageObjectKey, productId)) {
      return NextResponse.json({ success: false, error: 'File produk tidak ditemukan.' }, { status: 404 });
    }

    if (product.isPremium) {
      const entitlement = await getPremiumEntitlement(session.id);
      if (!entitlement.isPremium) {
        return NextResponse.json(
          { success: false, error: 'Akses Premium diperlukan untuk mengunduh produk ini.' },
          { status: 403, headers: { 'Cache-Control': 'private, no-store' } }
        );
      }
    }

    const object = await downloadProductFile(product.storageObjectKey);
    if (!object?.body) {
      return NextResponse.json({ success: false, error: 'File produk tidak ditemukan di penyimpanan.' }, { status: 404 });
    }

    const fileName = (product.fileName || 'asset.bin')
      .replace(/[\\/\r\n"]/g, '_')
      .slice(0, 180);
    const encodedFileName = encodeURIComponent(fileName).replace(/[!'()*]/g, (character) => (
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    ));
    const fallbackFileName = fileName.replace(/[^\x20-\x7E]|["\\;]/g, '_');
    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
      ...(object.headers.get('content-length')
        ? { 'Content-Length': object.headers.get('content-length')! }
        : {}),
      'Content-Type': object.headers.get('content-type') || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error('Product download failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengambil file produk.',
    }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
