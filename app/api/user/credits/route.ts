import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
        return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    try {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            // New user, initialize with 3 credits
            await userRef.set({
                credits: 3,
                subscriptionStatus: 'free',
                createdAt: new Date().toISOString(),
            });
            return NextResponse.json({ credits: 3, subscriptionStatus: 'free' });
        }

        const data = doc.data();
        return NextResponse.json({
            credits: data?.credits ?? 0,
            subscriptionStatus: data?.subscriptionStatus ?? 'free'
        });
    } catch (error) {
        console.error('Error fetching credits:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        const userRef = db.collection('users').doc(uid);

        // Run transaction to ensure atomic update
        const result = await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);

            if (!doc.exists) {
                // Should have been created by GET, but handle just in case
                t.set(userRef, { credits: 2, subscriptionStatus: 'free', createdAt: new Date().toISOString() });
                return { success: true, remainingCredits: 2 };
            }

            const data = doc.data();
            const isPro = data?.subscriptionStatus === 'active';
            const currentCredits = data?.credits ?? 0;

            if (isPro) {
                return { success: true, remainingCredits: -1 }; // -1 indicates unlimited
            }

            if (currentCredits > 0) {
                t.update(userRef, { credits: currentCredits - 1 });
                return { success: true, remainingCredits: currentCredits - 1 };
            } else {
                return { success: false, error: 'Insufficient credits' };
            }
        });

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 403 });
        }

    } catch (error) {
        console.error('Error deducting credit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
