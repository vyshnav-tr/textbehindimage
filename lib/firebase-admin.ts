import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let serviceAccount;

try {
    serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );
} catch (error) {
    console.error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string in your .env.local file.',
        error
    );

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().startsWith('{') && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().endsWith('}')) {
        console.error('It looks like the FIREBASE_SERVICE_ACCOUNT_KEY variable is truncated. If you pasted a multi-line JSON into your .env file, make sure to either put it all on one line or wrap it in single quotes.');
    }

    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
}

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

export const db = getFirestore();
