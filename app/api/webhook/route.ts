import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { dodo } from '@/lib/dodo';
import { auditSubscriptionWrite } from '@/lib/subscription-audit';

const isLive =
    process.env.DODO_PAYMENTS_ENV === 'live_mode' ||
    process.env.NODE_ENV === 'production';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to read headers with multiple possible names (case/variant tolerant)
function headerGet(req: Request, names: string[]): string {
    for (const n of names) {
        const v = req.headers.get(n);
        if (v) return v;
    }
    return '';
}

export async function POST(req: Request) {
    try {
        // Read raw body for signature verification
        const rawBody = await req.text();

        const webhookHeaders = {
            'webhook-id': headerGet(req, ['webhook-id', 'Webhook-Id', 'x-webhook-id', 'dodo-webhook-id', 'Dodo-Webhook-Id', 'x-dodo-webhook-id']),
            'webhook-signature': headerGet(req, ['webhook-signature', 'Webhook-Signature', 'x-webhook-signature', 'dodo-signature', 'Dodo-Signature', 'x-dodo-signature']),
            'webhook-timestamp': headerGet(req, ['webhook-timestamp', 'Webhook-Timestamp', 'x-webhook-timestamp', 'dodo-timestamp', 'Dodo-Timestamp', 'x-dodo-timestamp']),
        };
        // Debug header presence (not values)
        console.log('Dodo webhook header presence', {
            id: !!webhookHeaders['webhook-id'],
            signature: !!webhookHeaders['webhook-signature'],
            timestamp: !!webhookHeaders['webhook-timestamp'],
        });

        const webhookId = webhookHeaders['webhook-id'];
        if (!webhookId) {
            return NextResponse.json({ error: 'Missing webhook-id header' }, { status: 400 });
        }

        const hasWebhookKey =
            !!(process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_KEY);

        if (isLive && !hasWebhookKey) {
            console.error('Dodo webhook secret not configured in production');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        let event: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (hasWebhookKey) {
            try {

                event = dodo.webhooks.unwrap(rawBody, { headers: webhookHeaders });
            } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Webhook verification failed:', err?.message || err);
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else {
            // Fallback for local dev only (NOT recommended for production)
            console.warn('Dodo webhook secret not configured; skipping signature verification. Set DODO_PAYMENTS_WEBHOOK_SECRET.');
            try {
                event = JSON.parse(rawBody);
            } catch {
                return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
            }
        }

        const type: string =
            event?.type || event?.event_type || event?.event || event?.name || '';

        const data: any = // eslint-disable-line @typescript-eslint/no-explicit-any
            event?.data || event?.payload?.data || event;

        // Idempotency: ensure each webhook-id is processed once
        try {
            // Use create to fail if the document already exists
            await db.collection('dodo_webhooks').doc(String(webhookId)).create({
                createdAt: new Date().toISOString(),
                type: type || 'unknown',
                status: 'processing',
            });
        } catch (e: unknown) {
            const msg = String((e as Error)?.message || '');
            if (msg.includes('ALREADY_EXISTS') || msg.includes('already exists')) {
                // Already processed; ack success
                return NextResponse.json({ received: true, duplicate: true });
            }
            console.error('Idempotency create failed', e);
            return NextResponse.json({ error: 'Temporary error' }, { status: 503 });
        }

        if (type === 'subscription.active') {
            const subscription_id =
                data?.subscription_id || data?.id || data?.subscription?.id;
            let customer_id =
                data?.customer_id || data?.customer?.id;
            const metadata =
                data?.metadata || data?.subscription?.metadata || {};

            // Fallback: retrieve subscription to backfill customer_id if missing
            if (!customer_id && subscription_id) {
                try {

                    const sub: any = await dodo.subscriptions.retrieve(subscription_id); // eslint-disable-line @typescript-eslint/no-explicit-any
                    customer_id = sub?.customer_id || sub?.customer?.id || customer_id;
                } catch (e) {
                    console.warn('Unable to retrieve subscription to backfill customer_id', e);
                }
            }

            let uid =
                metadata?.firebaseUid || metadata?.firebase_uid || metadata?.uid;

            if (!uid && (data?.customer?.email || data?.email)) {
                const email = data?.customer?.email || data?.email;
                const userSnapshot = await db.collection('users').where('email', '==', email).get();
                if (!userSnapshot.empty) {
                    uid = userSnapshot.docs[0].id;
                }
            }

            // Compute interval with product mapping first (env-based), fallback to interval fields
            let interval: string | undefined;
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sub: any = subscription_id ? await dodo.subscriptions.retrieve(subscription_id) : undefined;

                const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
                const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;

                const productIdCandidate =
                    sub?.product_id ||
                    sub?.product?.product_id ||
                    sub?.product?.id ||
                    sub?.productId ||
                    sub?.price?.product_id ||
                    sub?.price?.productId ||
                    data?.product_id ||
                    data?.product?.id;

                if (productIdCandidate && monthly && String(productIdCandidate) === String(monthly)) {
                    interval = 'month';
                } else if (productIdCandidate && yearly && String(productIdCandidate) === String(yearly)) {
                    interval = 'year';
                } else {
                    const rawInterval =
                        sub?.price?.payment_frequency_interval ??
                        sub?.price?.subscription_period_interval ??
                        sub?.product?.price?.payment_frequency_interval ??
                        sub?.product?.price?.subscription_period_interval ??
                        sub?.subscription_period_interval ??
                        sub?.interval ??
                        data?.subscription_period_interval ??
                        data?.interval;
                    interval = rawInterval ? String(rawInterval).toLowerCase() : undefined;
                }
            } catch (e) {
                console.warn('Unable to compute interval from subscription; falling back to event', e);
                interval = (data?.subscription_period_interval || data?.interval || 'month')?.toLowerCase?.();
            }

            // Fallback: try mapping by subscription_id if uid missing
            let targetUid = uid;
            if (!targetUid && subscription_id) {
                const subSnap = await db
                    .collection('users')
                    .where('dodoSubscriptionId', '==', subscription_id)
                    .limit(1)
                    .get();
                if (!subSnap.empty) {
                    targetUid = subSnap.docs[0].id;
                }
            }

            if (targetUid && subscription_id) {
                // Prefer recent plan change target within a short window to avoid reverting interval
                let finalInterval = interval;
                try {
                    const userDocSnap = await db.collection('users').doc(String(targetUid)).get();
                    if (userDocSnap.exists) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const udata: any = userDocSnap.data();
                        const lastPlanChangeAtStr = udata?.lastPlanChangeAt;
                        const lastPlanChangeAtMs = lastPlanChangeAtStr ? Date.parse(lastPlanChangeAtStr) : NaN;
                        const targetProductId = udata?.targetProductId;
                        const within5m =
                            lastPlanChangeAtStr &&
                            !Number.isNaN(lastPlanChangeAtMs) &&
                            Date.now() - lastPlanChangeAtMs < 5 * 60_000;

                        if (within5m && targetProductId) {
                            const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
                            const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;
                            if (monthly && String(targetProductId) === String(monthly)) {
                                finalInterval = 'month';
                            } else if (yearly && String(targetProductId) === String(yearly)) {
                                finalInterval = 'year';
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Webhook interval override check failed (active)', e);
                }

                const update: Record<string, unknown> = {
                    subscriptionStatus: 'active',
                    dodoSubscriptionId: subscription_id,
                    credits: -1, // Unlimited
                };
                if (customer_id) {
                    update['dodoCustomerId'] = customer_id;
                }
                if (finalInterval) {
                    update['subscriptionInterval'] = finalInterval;
                }
                const targetRef = db.collection('users').doc(String(targetUid));
                // Capture "before" snapshot for audit
                let beforeAudit: Record<string, unknown> | null = null;
                try {
                    const beforeSnap = await targetRef.get();
                    if (beforeSnap.exists) {
                        const b: any = beforeSnap.data(); // eslint-disable-line @typescript-eslint/no-explicit-any
                        beforeAudit = {
                            subscriptionInterval: b?.subscriptionInterval ?? null,
                            subscriptionStatus: b?.subscriptionStatus ?? null,
                            dodoSubscriptionId: b?.dodoSubscriptionId ?? null,
                        };
                    }
                } catch { }
                await targetRef.set(update, { merge: true });
                // Best-effort audit
                await auditSubscriptionWrite(String(targetUid), {
                    source: 'webhook',
                    eventContext: { eventType: 'subscription.active', subscriptionId: subscription_id, customerId: customer_id || null },
                    before: beforeAudit,
                    after: update,
                    mapping: {
                        computedFinalInterval: finalInterval ?? null,
                        originalInterval: interval ?? null,
                        withinRecentPlanChangeWindow: typeof finalInterval !== 'undefined' && typeof interval !== 'undefined' ? finalInterval !== interval : null,
                        monthlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY || null,
                        yearlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY || null,
                    },
                });
            } else {
                console.warn('Missing identifiers on subscription.active', { uid, subscription_id, customer_id });
                // Do not return 400 here; allow final 200 so Dodo doesn't hard-fail
            }
        }

        // Treat plan_changed or renewed similar to active (ensure user stays active and IDs are stored)
        if (type === 'subscription.plan_changed' || type === 'subscription.renewed') {
            const subscription_id =
                data?.subscription_id || data?.id || data?.subscription?.id;
            let customer_id =
                data?.customer_id || data?.customer?.id;
            const metadata =
                data?.metadata || data?.subscription?.metadata || {};

            // Backfill customer via subscription retrieve if missing
            if (!customer_id && subscription_id) {
                try {

                    const sub: any = await dodo.subscriptions.retrieve(subscription_id); // eslint-disable-line @typescript-eslint/no-explicit-any
                    customer_id = sub?.customer_id || sub?.customer?.id || customer_id;
                } catch (e) {
                    console.warn('Unable to retrieve subscription to backfill customer_id (plan_changed/renewed)', e);
                }
            }

            let uid =
                metadata?.firebaseUid || metadata?.firebase_uid || metadata?.uid;

            // Fallback by email if present
            if (!uid && (data?.customer?.email || data?.email)) {
                const email = data?.customer?.email || data?.email;
                const userSnapshot = await db.collection('users').where('email', '==', email).get();
                if (!userSnapshot.empty) {
                    uid = userSnapshot.docs[0].id;
                }
            }

            // Fallback by existing mapping using customer_id
            if (!uid && customer_id) {
                const snap = await db.collection('users').where('dodoCustomerId', '==', customer_id).limit(1).get();
                if (!snap.empty) {
                    uid = snap.docs[0].id;
                }
            }

            // Compute interval with product mapping first (env-based), fallback to interval fields
            let interval: string | undefined;
            try {
                // attempt to retrieve current subscription details to infer interval
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sub: any = subscription_id ? await dodo.subscriptions.retrieve(subscription_id) : undefined;

                const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
                const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;

                const productIdCandidate =
                    sub?.product_id ||
                    sub?.product?.product_id ||
                    sub?.product?.id ||
                    sub?.productId ||
                    sub?.price?.product_id ||
                    sub?.price?.productId ||
                    data?.product_id ||
                    data?.product?.id;

                if (productIdCandidate && monthly && String(productIdCandidate) === String(monthly)) {
                    interval = 'month';
                } else if (productIdCandidate && yearly && String(productIdCandidate) === String(yearly)) {
                    interval = 'year';
                } else {
                    const rawInterval =
                        sub?.price?.payment_frequency_interval ??
                        sub?.price?.subscription_period_interval ??
                        sub?.product?.price?.payment_frequency_interval ??
                        sub?.product?.price?.subscription_period_interval ??
                        sub?.subscription_period_interval ??
                        sub?.interval ??
                        data?.subscription_period_interval ??
                        data?.interval;
                    interval = rawInterval ? String(rawInterval).toLowerCase() : undefined;
                }
            } catch (e) {
                console.warn('Unable to compute interval from subscription; falling back to event', e);
                interval = (data?.subscription_period_interval || data?.interval)?.toLowerCase?.();
            }

            if (uid && subscription_id && customer_id) {
                // Prefer recent plan change target within a short window to avoid reverting interval
                let finalInterval = interval;
                try {
                    const userDocSnap = await db.collection('users').doc(String(uid)).get();
                    if (userDocSnap.exists) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const udata: any = userDocSnap.data();
                        const lastPlanChangeAtStr = udata?.lastPlanChangeAt;
                        const lastPlanChangeAtMs = lastPlanChangeAtStr ? Date.parse(lastPlanChangeAtStr) : NaN;
                        const targetProductId = udata?.targetProductId;
                        const within5m =
                            lastPlanChangeAtStr &&
                            !Number.isNaN(lastPlanChangeAtMs) &&
                            Date.now() - lastPlanChangeAtMs < 5 * 60_000;

                        if (within5m && targetProductId) {
                            const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
                            const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;
                            if (monthly && String(targetProductId) === String(monthly)) {
                                finalInterval = 'month';
                            } else if (yearly && String(targetProductId) === String(yearly)) {
                                finalInterval = 'year';
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Webhook interval override check failed (plan_changed/renewed)', e);
                }

                const updateDoc: Record<string, unknown> = {
                    subscriptionStatus: 'active',
                    dodoSubscriptionId: subscription_id,
                    dodoCustomerId: customer_id,
                    credits: -1,
                };
                if (finalInterval) {
                    updateDoc['subscriptionInterval'] = finalInterval;
                }
                const targetRef2 = db.collection('users').doc(String(uid));
                // Capture "before" snapshot for audit
                let beforeAudit2: Record<string, unknown> | null = null;
                try {
                    const beforeSnap2 = await targetRef2.get();
                    if (beforeSnap2.exists) {
                        const b2: any = beforeSnap2.data(); // eslint-disable-line @typescript-eslint/no-explicit-any
                        beforeAudit2 = {
                            subscriptionInterval: b2?.subscriptionInterval ?? null,
                            subscriptionStatus: b2?.subscriptionStatus ?? null,
                            dodoSubscriptionId: b2?.dodoSubscriptionId ?? null,
                        };
                    }
                } catch { }
                await targetRef2.set(updateDoc, { merge: true });
                // Best-effort audit
                await auditSubscriptionWrite(String(uid), {
                    source: 'webhook',
                    eventContext: { eventType: type, subscriptionId: subscription_id, customerId: customer_id || null },
                    before: beforeAudit2,
                    after: updateDoc,
                    mapping: {
                        computedFinalInterval: finalInterval ?? null,
                        originalInterval: interval ?? null,
                        monthlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY || null,
                        yearlyEnv: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY || null,
                    },
                });
            } else {
                console.error('Missing identifiers on plan_changed/renewed', { uid, subscription_id, customer_id });
            }
        }

        // Ensure activation on payment success as a fallback path
        if (type === 'payment.succeeded') {
            const payment_id = data?.payment_id || data?.id;
            let subscription_id = data?.subscription_id || data?.subscription?.id;
            let customer_id = data?.customer_id || data?.customer?.id;
            let email = data?.customer?.email || data?.email;
            let metadata = data?.metadata || {};

            // Backfill from payment retrieve if fields missing
            if ((!subscription_id || !customer_id) && payment_id) {
                try {

                    const payment: any = await dodo.payments.retrieve(payment_id); // eslint-disable-line @typescript-eslint/no-explicit-any
                    subscription_id = payment?.subscription_id || payment?.subscription?.id || subscription_id;
                    customer_id = payment?.customer?.customer_id || payment?.customer_id || payment?.customer?.id || customer_id;
                    email = payment?.customer?.email || email;
                    metadata = payment?.metadata || metadata;
                } catch (e) {
                    console.warn('Unable to retrieve payment to backfill fields', e);
                }
            }

            let uid =
                metadata?.firebaseUid || metadata?.firebase_uid || metadata?.uid;

            if (!uid && email) {
                const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
                if (!userSnapshot.empty) {
                    uid = userSnapshot.docs[0].id;
                }
            }

            if (!uid && customer_id) {
                const snap = await db.collection('users').where('dodoCustomerId', '==', customer_id).limit(1).get();
                if (!snap.empty) {
                    uid = snap.docs[0].id;
                }
            }

            if (uid && subscription_id && customer_id) {
                await db.collection('users').doc(uid).set({
                    subscriptionStatus: 'active',
                    dodoSubscriptionId: subscription_id,
                    dodoCustomerId: customer_id,
                    credits: -1,
                }, { merge: true });
            } else {
                console.error('Missing identifiers on payment.succeeded', { uid, subscription_id, customer_id, payment_id });
            }
        }

        // Handle subscription.cancelled:
        // - If cancellation is scheduled at period end (cancel_at_next_billing_date/period_end), keep access until accessUntil
        // - Otherwise (immediate), revoke access now
        if (type === 'subscription.cancelled') {
            let customer_id = data?.customer_id || data?.customer?.id;
            const subscription_id = data?.subscription_id || data?.id || data?.subscription?.id;

            let email = data?.customer?.email || data?.email;
            let uid =
                data?.metadata?.firebaseUid ||
                data?.metadata?.firebase_uid ||
                data?.subscription?.metadata?.firebaseUid ||
                data?.subscription?.metadata?.firebase_uid ||
                data?.subscription?.metadata?.uid;

            let cancelAtNextBilling: boolean | undefined;
            let accessUntil: string | undefined;

            if (subscription_id) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sub: any = await dodo.subscriptions.retrieve(subscription_id);
                    customer_id = customer_id || sub?.customer_id || sub?.customer?.id;
                    email = email || sub?.customer?.email;
                    uid = uid || sub?.metadata?.firebaseUid || sub?.metadata?.firebase_uid || sub?.metadata?.uid;
                    cancelAtNextBilling = sub?.cancel_at_next_billing_date ?? sub?.cancel_at_period_end ?? false;
                    accessUntil = sub?.next_billing_date ?? sub?.expires_at;
                } catch (e) {
                    console.warn('Unable to retrieve subscription to backfill identifiers (cancelled)', e);
                }
            }

            // Resolve the Firestore user document
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let userRef: any;

            // 1) Prefer direct UID mapping if known
            if (!userRef && uid) {
                const uidRef = db.collection('users').doc(String(uid));
                const uidDoc = await uidRef.get();
                if (uidDoc.exists) userRef = uidRef;
            }

            // 2) Lookup by customer id
            if (!userRef && customer_id) {
                const byCustomer = await db.collection('users').where('dodoCustomerId', '==', customer_id).limit(1).get();
                if (!byCustomer.empty) userRef = byCustomer.docs[0].ref;
            }

            // 3) Lookup by subscription id
            if (!userRef && subscription_id) {
                const bySubscription = await db.collection('users').where('dodoSubscriptionId', '==', subscription_id).limit(1).get();
                if (!bySubscription.empty) userRef = bySubscription.docs[0].ref;
            }

            // 4) Fallback by email
            if (!userRef && email) {
                const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
                if (!byEmail.empty) userRef = byEmail.docs[0].ref;
            }

            const nowMs = Date.now();
            const accessUntilMs = accessUntil ? Date.parse(accessUntil) : undefined;
            const scheduledCancel =
                !!cancelAtNextBilling &&
                accessUntilMs !== undefined &&
                !Number.isNaN(accessUntilMs) &&
                accessUntilMs > nowMs;

            if (userRef) {
                if (scheduledCancel) {
                    // Keep access until end of the current billing period
                    const update: Record<string, unknown> = {
                        subscriptionStatus: 'active',
                        credits: -1,
                        subscriptionCancellationPending: true,
                        subscriptionAccessExpiresAt: accessUntil,
                    };
                    if (customer_id) update['dodoCustomerId'] = customer_id;
                    if (subscription_id) update['dodoSubscriptionId'] = subscription_id;
                    await userRef.set(update, { merge: true });
                } else {
                    // Immediate cancel: revoke access now
                    const update: Record<string, unknown> = {
                        subscriptionStatus: 'free',
                        credits: 3,
                        subscriptionCancellationPending: false,
                    };
                    if (customer_id) update['dodoCustomerId'] = customer_id;
                    if (subscription_id) update['dodoSubscriptionId'] = subscription_id;
                    await userRef.set(update, { merge: true });
                }
            } else {
                console.warn('Unable to map subscription.cancelled to user', {
                    customer_id,
                    subscription_id,
                    email,
                    uid,
                    cancelAtNextBilling,
                    accessUntil,
                });
            }
        }

        // Other non-cancel downgrades (on_hold/failed/expired) revoke access immediately
        if (type === 'subscription.on_hold' || type === 'subscription.failed' || type === 'subscription.expired') {
            let customer_id = data?.customer_id || data?.customer?.id;
            const subscription_id = data?.subscription_id || data?.id || data?.subscription?.id;

            // Try to gather more identifiers for mapping
            let email = data?.customer?.email || data?.email;
            let uid =
                data?.metadata?.firebaseUid ||
                data?.metadata?.firebase_uid ||
                data?.subscription?.metadata?.firebaseUid ||
                data?.subscription?.metadata?.firebase_uid ||
                data?.subscription?.metadata?.uid;

            // Backfill details from subscription if missing
            if ((!customer_id || !email || !uid) && subscription_id) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sub: any = await dodo.subscriptions.retrieve(subscription_id);
                    customer_id = customer_id || sub?.customer_id || sub?.customer?.id;
                    email = email || sub?.customer?.email;
                    uid = uid || sub?.metadata?.firebaseUid || sub?.metadata?.firebase_uid || sub?.metadata?.uid;
                } catch (e) {
                    console.warn('Unable to retrieve subscription to backfill identifiers (on_hold/failed/expired)', e);
                }
            }

            // Resolve the Firestore user document
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let userRef: any;

            // 1) Prefer direct UID mapping if known
            if (!userRef && uid) {
                const uidRef = db.collection('users').doc(String(uid));
                const uidDoc = await uidRef.get();
                if (uidDoc.exists) {
                    userRef = uidRef;
                }
            }

            // 2) Lookup by customer id
            if (!userRef && customer_id) {
                const byCustomer = await db.collection('users').where('dodoCustomerId', '==', customer_id).limit(1).get();
                if (!byCustomer.empty) {
                    userRef = byCustomer.docs[0].ref;
                }
            }

            // 3) Lookup by subscription id
            if (!userRef && subscription_id) {
                const bySubscription = await db.collection('users').where('dodoSubscriptionId', '==', subscription_id).limit(1).get();
                if (!bySubscription.empty) {
                    userRef = bySubscription.docs[0].ref;
                }
            }

            // 4) Fallback: lookup by email
            if (!userRef && email) {
                const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
                if (!byEmail.empty) {
                    userRef = byEmail.docs[0].ref;
                }
            }

            if (userRef) {
                const update: Record<string, unknown> = {
                    subscriptionStatus: 'free',
                    credits: 3,
                    subscriptionCancellationPending: false,
                };
                if (customer_id) update['dodoCustomerId'] = customer_id;
                if (subscription_id) update['dodoSubscriptionId'] = subscription_id;

                await userRef.set(update, { merge: true });
            } else {
                console.warn('Unable to map subscription status downgrade to user', { customer_id, subscription_id, email, uid });
            }
        }

        try {
            await db.collection('dodo_webhooks').doc(String(webhookId)).set(
                { processedAt: new Date().toISOString(), status: 'processed' },
                { merge: true }
            );
        } catch (e) {
            console.warn('Failed to mark webhook processed', e);
        }
        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        console.error('Webhook Error Details:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            console.error('FIREBASE_SERVICE_ACCOUNT_KEY is missing!');
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Return 5xx so Dodo retries on transient failures
        return NextResponse.json({ error: `Webhook processing failed: ${errorMessage}` }, { status: 500 });
    }
}

