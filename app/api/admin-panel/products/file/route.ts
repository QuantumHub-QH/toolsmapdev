export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/admin-request';
import {
  MAX_PRODUCT_FILE_BYTES,
  deleteProductFile,
  isProductObjectKeyForId,
  isValidProductId,
  uploadProductFile,
} from '@/lib/product-files';

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_PRODUCT_FILE_BYTES + 1024 * 1024) {
    return NextResponse.json({ success: false, error: 'Ukuran file maksimal 25 MB.' }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const productId = formData.get('productId');
    const file = formData.get('file');
    if (typeof productId !== 'string' || !isValidProductId(productId) || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Product ID atau file tidak valid.' }, { status: 400 });
    }

    if (file.size > MAX_PRODUCT_FILE_BYTES) {
      return NextResponse.json({ success: false, error: 'Ukuran file maksimal 25 MB.' }, { status: 413 });
    }

    const objectKey = await uploadProductFile(productId, await file.arrayBuffer(), file.type, file.size);

    return NextResponse.json({ success: true, objectKey }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Product file upload failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyimpan file produk ke Supabase Storage.',
    }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { objectKey?: unknown; productId?: unknown };
    if (typeof body.productId !== 'string' || typeof body.objectKey !== 'string'
      || !isValidProductId(body.productId)
      || !isProductObjectKeyForId(body.objectKey, body.productId)) {
      return NextResponse.json({ success: false, error: 'Storage object key tidak valid.' }, { status: 400 });
    }

    await deleteProductFile(body.objectKey, body.productId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product file cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menghapus file produk dari Supabase Storage.',
    }, { status: 503 });
  }
}
