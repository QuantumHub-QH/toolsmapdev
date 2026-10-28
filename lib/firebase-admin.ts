import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccountJson) {
    throw new Error('Firebase Admin belum dikonfigurasi. Tambahkan FIREBASE_SERVICE_ACCOUNT_JSON di Vercel.');
  }
  if (!storageBucket) {
    throw new Error('Firebase Storage belum dikonfigurasi. Tambahkan FIREBASE_STORAGE_BUCKET di Vercel.');
  }

  let serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON bukan JSON yang valid.');
  }

  const existingApp = getApps().find((app) => app.name === 'premium-admin');
  adminApp = existingApp || initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
    storageBucket,
  }, 'premium-admin');

  return adminApp;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
