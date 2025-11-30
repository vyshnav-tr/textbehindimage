import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';
// auth is unused
import { auditSubscriptionWrite } from '@/lib/subscription-audit';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { subscriptionId, newProductId, uid } = await req.json();
        let wroteUser = false;

        if (!subscriptionId || !newProductId || !uid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Basic server-side allowlist validation for safety
        const allowedProducts = [
            process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY,
            process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY,
        ].filter(Boolean) as string[];

        console.log('[upgrade] incoming', {
            uid,
            subscriptionId,
            newProductId,
            allowedProducts,
        });

        if (!allowedProducts.includes(String(newProductId))) {
            console.warn('[upgrade] invalid product selection', { newProductId, allowedProducts });
            return NextResponse.json({ error: 'Invalid product selection' }, { status: 400 });
        }

        // Verify ownership
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        const beforeAudit = {
            subscriptionInterval: userData?.subscriptionInterval ?? null,
            subscriptionStatus: userData?.subscriptionStatus ?? null,
            dodoSubscriptionId: userData?.dodoSubscriptionId ?? null,
        };
        if (userData?.dodoSubscriptionId !== subscriptionId) {
            return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 403 });
        }

        // Call Dodo Payments API to change plan
        const subscription = await dodo.subscriptions.changePlan(subscriptionId, {
            product_id: String(newProductId),
            proration_billing_mode: 'prorated_immediately',
            quantity: 1,
        });
        console.log('[upgrade] changePlan succeeded', { subscriptionId, newProductId });

        // Compute target interval directly from requested product (authoritative for immediate UI)
        const interval: string =
            String(newProductId) === String(process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY) ? 'year' : 'month';

        // Update Firestore so UI and reads reflect new plan immediately
        try {
            const nowIso = new Date().toISOString();
            const updateDoc: Record<string, unknown> = {
                subscriptionStatus: 'active',
                credits: -1,
                dodoSubscriptionId: subscriptionId,
                subscriptionInterval: interval,
                lastSubscriptionSyncAt: nowIso,
                lastPlanChangeAt: nowIso,
                targetProductId: String(newProductId),
            };
            console.log('[upgrade] writing Firestore', { uid, subscriptionId, interval, updateDoc });
            await userRef.set(updateDoc, { merge: true });
            wroteUser = true;
            // Best-effort audit trail of the write
            await auditSubscriptionWrite(String(uid), {
                source: 'upgrade',
                eventContext: { subscriptionId, newProductId, proration_billing_mode: 'prorated_immediately' },
                before: beforeAudit,
                after: updateDoc,
                mapping: {
                    targetProductId: String(newProductId),
                    computedFinalInterval: interval,
                    monthlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY || null,
                    yearlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY || null,
                    intervalSource: 'requested_product_id',
                    lastPlanChangeAt: nowIso,
                },
            });
        } catch (e) {
            console.warn('Failed to update user doc after plan change', e);
            wroteUser = false;
        }

        return NextResponse.json({ success: true, subscription, interval, wroteUser });
    } catch (error: unknown) {
        console.error('Error upgrading subscription:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
