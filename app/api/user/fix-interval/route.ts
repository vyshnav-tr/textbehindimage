import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { dodo } from '@/lib/dodo';
import { auditSubscriptionWrite } from '@/lib/subscription-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Force-correct a user's subscriptionInterval in Firestore based on the live Dodo subscription.
 * POST body:
 *   { uid: string, subscriptionId?: string }
 *
 * This is a safe administrative endpoint to fix cases where the UI shows the correct plan
 * but the Firestore document was not updated due to a prior mismatch or webhook lag.
 */
export async function POST(req: Request) {
    try {
        const { uid, subscriptionId } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        const userRef = db.collection('users').doc(String(uid));
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const data = userDoc.data() || {};
        const subId: string | undefined = String(subscriptionId || data.dodoSubscriptionId || '');

        if (!subId) {
            return NextResponse.json({ error: 'Missing subscriptionId on request or user' }, { status: 400 });
        }

        // Retrieve subscription from Dodo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub: any = await dodo.subscriptions.retrieve(subId);

        // Prefer mapping by product id against env for a deterministic interval
        const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
        const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;

        const productIdCandidate =
            sub?.product_id ||
            sub?.product?.product_id ||
            sub?.product?.id ||
            sub?.productId ||
            sub?.price?.product_id ||
            sub?.price?.productId;

        let interval: string | undefined;
        let intervalSource = 'unknown';
        if (productIdCandidate && monthly && String(productIdCandidate) === String(monthly)) {
            interval = 'month';
            intervalSource = 'product_map_monthly';
        } else if (productIdCandidate && yearly && String(productIdCandidate) === String(yearly)) {
            interval = 'year';
            intervalSource = 'product_map_yearly';
        } else {
            const rawInterval =
                sub?.price?.payment_frequency_interval ??
                sub?.price?.subscription_period_interval ??
                sub?.product?.price?.payment_frequency_interval ??
                sub?.product?.price?.subscription_period_interval ??
                sub?.subscription_period_interval ??
                sub?.interval;
            interval = rawInterval ? String(rawInterval).toLowerCase() : undefined;
            intervalSource = 'raw_interval_fields';
        }

        if (!interval) {
            return NextResponse.json({
                error: 'Unable to determine interval from subscription',
                details: { productIdCandidate: productIdCandidate || null, intervalSource }
            }, { status: 422 });
        }

        const update: Record<string, unknown> = {
            subscriptionInterval: interval,
            subscriptionStatus: 'active',
            dodoSubscriptionId: subId,
            lastIntervalFixAt: new Date().toISOString(),
            intervalSource,
            fixedFromProductId: productIdCandidate || null,
        };

        await userRef.set(update, { merge: true });
        // Best-effort audit for manual fix writes
        await auditSubscriptionWrite(String(uid), {
            source: 'fix_interval',
            eventContext: { subscriptionId: subId },
            before: {
                subscriptionInterval: data?.subscriptionInterval ?? null,
                subscriptionStatus: data?.subscriptionStatus ?? null,
                dodoSubscriptionId: data?.dodoSubscriptionId ?? null,
            },
            after: update,
            mapping: {
                computedFinalInterval: interval ?? null,
                productIdCandidate: productIdCandidate ?? null,
                intervalSource,
                monthlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY || null,
                yearlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY || null,
            },
        });

        const after = (await userRef.get()).data();

        return NextResponse.json({
            success: true,
            wrote: update,
            after: {
                subscriptionInterval: after?.subscriptionInterval ?? null,
                subscriptionStatus: after?.subscriptionStatus ?? null,
                dodoSubscriptionId: after?.dodoSubscriptionId ?? null,
            }
        });
    } catch (error: unknown) {
        console.error('fix-interval error:', error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}