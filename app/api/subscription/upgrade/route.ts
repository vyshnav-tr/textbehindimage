import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';
// auth is unused

import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { subscriptionId, newProductId, uid } = await req.json();

        if (!subscriptionId || !newProductId || !uid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        // Call Dodo Payments API to change plan
        const subscription = await dodo.subscriptions.changePlan(subscriptionId, {
            product_id: newProductId,
            proration_billing_mode: 'prorated_immediately',
            quantity: 1,
        });

        return NextResponse.json({ success: true, subscription });
    } catch (error: unknown) {
        console.error('Error upgrading subscription:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
