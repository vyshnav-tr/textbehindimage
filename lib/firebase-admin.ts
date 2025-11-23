import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Lazy initialization to prevent secrets from being evaluated during build time
let firestoreInstance: Firestore | null = null;

function initializeFirebaseAdmin() {
    if (!getApps().length) {
        let serviceAccount;

        try {
            const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

            if (!key) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
            }

            serviceAccount = JSON.parse(key);
        } catch (error) {
            console.error(
                'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.',
                error
            );

            if (
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY &&
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().startsWith('{') &&
                !process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim().endsWith('}')
            ) {
                console.error(
                    'It looks like the FIREBASE_SERVICE_ACCOUNT_KEY variable is truncated. ' +
                    'Make sure to either put it all on one line or wrap it in single quotes.'
                );
            }

            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
        }

        initializeApp({
            credential: cert(serviceAccount),
        });
    }

    return getFirestore();
}

// Export a getter that lazily initializes Firebase Admin only when accessed
export const getDb = (): Firestore => {
    if (!firestoreInstance) {
        firestoreInstance = initializeFirebaseAdmin();
    }
    return firestoreInstance;
};

// For backward compatibility, export db that lazily initializes on access
// Using a Proxy to make the getter work seamlessly with TypeScript
export const db = new Proxy({} as Firestore, {
    get(_target, prop: string | symbol) {
        const instance = getDb();
        const value = instance[prop as keyof Firestore];
        return typeof value === 'function' ? value.bind(instance) : value;
    },
    set(_target, prop: string | symbol, value: unknown) {
        const instance = getDb();
        (instance as unknown as Record<string | symbol, unknown>)[prop] = value;
        return true;
    },
});
