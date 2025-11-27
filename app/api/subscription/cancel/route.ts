import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';
import { db } from '@/lib/firebase-admin';

// Schedules cancellation at period end (keeps access until current billing period ends)
export async function POST(req: Request) {
    try {
        const { subscriptionId, uid } = await req.json();

        if (!subscriptionId || !uid) {
            return NextResponse.json({ error: 'Missing subscriptionId or uid' }, { status: 400 });
        }

        // Verify ownership
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        if (userData?.dodoSubscriptionId !== subscriptionId) {
            return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 403 });
        }

        // Schedule cancellation at end of current billing period
        // NOTE: The server API uses "cancel_at_next_billing_date" (Dodo MCP tool schema).
        // Some SDKs may also expose "cancel_at_period_end". We use the MCP-backed field here.
        const updatedSub: any = await dodo.subscriptions.update(subscriptionId, { // eslint-disable-line @typescript-eslint/no-explicit-any
            cancel_at_next_billing_date: true,
        });

        // Compute access-until timestamp for UI
        const accessUntil: string | undefined =
            updatedSub?.next_billing_date || updatedSub?.expires_at;

        // Update local DB to reflect pending cancellation, but keep access active
        await userRef.set(
            {
                subscriptionCancellationPending: true,
                subscriptionAccessExpiresAt: accessUntil ?? null,
            },
            { merge: true }
        );

        return NextResponse.json({
            success: true,
            subscription_id: updatedSub?.subscription_id || subscriptionId,
            status: updatedSub?.status,
            cancel_at_next_billing_date:
                updatedSub?.cancel_at_next_billing_date ?? true,
            access_until: accessUntil ?? null,
        });
    } catch (error: unknown) {
        console.error('Error scheduling cancel at period end:', error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}