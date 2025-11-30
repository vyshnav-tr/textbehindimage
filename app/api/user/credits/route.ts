import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { dodo } from '@/lib/dodo';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const debug = searchParams.get('debug');

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

        // Self-heal/ensure subscriptionInterval reflects current plan
        let effectiveInterval = data?.subscriptionInterval;
        // Debug payload container
        const debugPayload: Record<string, unknown> = {};
        if (dodoSubscriptionId) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sub: any = await dodo.subscriptions.retrieve(String(dodoSubscriptionId));

                // Prefer mapping by product id to avoid ambiguous interval fields
                const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
                const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;

                const productIdCandidate =
                    sub?.product_id ||
                    sub?.product?.product_id ||
                    sub?.product?.id ||
                    sub?.productId ||
                    sub?.price?.product_id ||
                    sub?.price?.productId;

                debugPayload['productIdCandidate'] = productIdCandidate || null;
                debugPayload['monthlyEnv'] = monthly || null;
                debugPayload['yearlyEnv'] = yearly || null;

                let fetchedInterval: string | undefined;
                if (productIdCandidate && monthly && String(productIdCandidate) === String(monthly)) {
                    fetchedInterval = 'month';
                    debugPayload['intervalSource'] = 'product_map_monthly';
                } else if (productIdCandidate && yearly && String(productIdCandidate) === String(yearly)) {
                    fetchedInterval = 'year';
                    debugPayload['intervalSource'] = 'product_map_yearly';
                } else {
                    // Fallback to any interval-like fields if product mapping is unavailable
                    const rawInterval =
                        sub?.price?.payment_frequency_interval ??
                        sub?.price?.subscription_period_interval ??
                        sub?.product?.price?.payment_frequency_interval ??
                        sub?.product?.price?.subscription_period_interval ??
                        sub?.subscription_period_interval ??
                        sub?.interval;
                    fetchedInterval = rawInterval ? String(rawInterval).toLowerCase() : undefined;
                    debugPayload['intervalSource'] = 'raw_interval_fields';
                    debugPayload['rawInterval'] = fetchedInterval || null;
                }

                // Do NOT mutate Firestore here to avoid clobbering recent writes from upgrade/webhook.
                // Only compute and return the effective interval to the client.
                if (fetchedInterval) {
                    effectiveInterval = fetchedInterval;
                }
            } catch (e) {
                console.warn('Unable to refresh subscriptionInterval from Dodo', e);
                debugPayload['intervalError'] = (e as Error)?.message || String(e);
            }
        }

        const responseBody: Record<string, unknown> = {
            credits: data?.credits ?? 0,
            subscriptionStatus: subscriptionStatus,
            dodoCustomerId: dodoCustomerId,
            dodoSubscriptionId: dodoSubscriptionId,
            subscriptionInterval: effectiveInterval,
            subscriptionCancellationPending: data?.subscriptionCancellationPending ?? false,
            subscriptionAccessExpiresAt: data?.subscriptionAccessExpiresAt ?? null,
        };

        if (debug) {
            responseBody['debug'] = debugPayload;
        }

        return NextResponse.json(responseBody);
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
