import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { dodo } from '@/lib/dodo';

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
        let dodoCustomerId = data?.dodoCustomerId;
        const dodoSubscriptionId = data?.dodoSubscriptionId;
        const subscriptionStatus = data?.subscriptionStatus ?? 'free';

        // Self-healing: If active but missing customer ID, try to fetch it
        if (subscriptionStatus === 'active' && !dodoCustomerId && dodoSubscriptionId) {
            try {
                console.log(`Attempting to backfill customerId for user ${uid}`);

                const sub: any = await dodo.subscriptions.retrieve(dodoSubscriptionId); // eslint-disable-line @typescript-eslint/no-explicit-any
                const fetchedCustomerId = sub.customer_id || sub.customer?.id;

                if (fetchedCustomerId) {
                    dodoCustomerId = fetchedCustomerId;
                    await userRef.update({ dodoCustomerId: fetchedCustomerId });
                    console.log(`Successfully backfilled customerId: ${fetchedCustomerId}`);
                }
            } catch (error) {
                console.error('Error backfilling customerId:', error);
            }
        }

        return NextResponse.json({
            credits: data?.credits ?? 0,
            subscriptionStatus: subscriptionStatus,
            dodoCustomerId: dodoCustomerId,
            dodoSubscriptionId: dodoSubscriptionId,
            subscriptionInterval: data?.subscriptionInterval,
            subscriptionCancellationPending: data?.subscriptionCancellationPending ?? false,
            subscriptionAccessExpiresAt: data?.subscriptionAccessExpiresAt ?? null,
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
