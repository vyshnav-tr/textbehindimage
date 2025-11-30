import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { dodo } from '@/lib/dodo';
import { auditSubscriptionWrite } from '@/lib/subscription-audit';

// Force sync a user's subscription fields from Dodo into Firestore
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
        const beforeAudit = {
            subscriptionInterval: data?.subscriptionInterval ?? null,
            subscriptionStatus: data?.subscriptionStatus ?? null,
            dodoSubscriptionId: data?.dodoSubscriptionId ?? null,
        };
        const subId: string | undefined = String(subscriptionId || data.dodoSubscriptionId || '');

        if (!subId) {
            return NextResponse.json({ error: 'Missing subscriptionId on request or user' }, { status: 400 });
        }

        // Retrieve the latest subscription details from Dodo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub: any = await dodo.subscriptions.retrieve(subId);

        // Compute interval as reliably as possible
        const rawInterval =
            sub?.price?.payment_frequency_interval ??
            sub?.price?.subscription_period_interval ??
            sub?.product?.price?.payment_frequency_interval ??
            sub?.product?.price?.subscription_period_interval ??
            sub?.subscription_period_interval ??
            sub?.interval;
        const productIdCandidate =
            sub?.product_id ||
            sub?.product?.product_id ||
            sub?.product?.id ||
            sub?.productId ||
            sub?.price?.product_id ||
            sub?.price?.productId;

        const interval = rawInterval ? String(rawInterval).toLowerCase() : undefined;

        const customerId: string | undefined =
            sub?.customer_id || sub?.customer?.id || data?.dodoCustomerId;

        // Guard: avoid overriding a very recent local write (e.g. right after plan change)
        const currentInterval: string | undefined = data?.subscriptionInterval;
        const lastPlanChangeAt = data?.lastPlanChangeAt ? new Date(data.lastPlanChangeAt).getTime() : 0;
        const isRecentPlanChange = (Date.now() - lastPlanChangeAt) < 60000; // 1 minute buffer

        // Always write interval if it differs from current value, UNLESS we just changed plans locally
        const shouldWriteInterval = !!(interval && interval !== currentInterval && !isRecentPlanChange);

        const nowIso = new Date().toISOString();

        const update: Record<string, unknown> = {
            subscriptionStatus: 'active',
            dodoSubscriptionId: subId,
            credits: -1,
            lastSubscriptionSyncAt: nowIso,
        };

        if (customerId) update['dodoCustomerId'] = customerId;
        if (shouldWriteInterval) update['subscriptionInterval'] = interval;

        await userRef.set(update, { merge: true });
        // Audit only when we actually changed interval during sync
        if (shouldWriteInterval) {
            await auditSubscriptionWrite(String(uid), {
                source: 'sync',
                eventContext: { subscriptionId: subId },
                before: beforeAudit,
                after: update,
                mapping: {
                    computedFinalInterval: interval ?? null,
                    productIdCandidate: productIdCandidate ?? null,
                    monthlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY || null,
                    yearlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY || null,
                    intervalSource: 'raw_interval_fields',
                },
            });
        }

        return NextResponse.json({
            success: true,
            subscriptionInterval: shouldWriteInterval ? interval ?? null : currentInterval ?? null,
            dodoSubscriptionId: subId,
            dodoCustomerId: customerId ?? null,
            wroteInterval: !!shouldWriteInterval,
            lastSubscriptionSyncAt: nowIso,
        });
    } catch (error: unknown) {
        console.error('Error syncing subscription from Dodo:', error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}