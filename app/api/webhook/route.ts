import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const event = await req.json();

        // TODO: Verify webhook signature if Dodo provides a way/secret
        // For now, we trust the payload as per user instruction/docs simplicity

        const { type, data } = event;

        if (type === 'subscription.active') {
            const { subscription_id, customer_id, metadata } = data;
            // metadata might be nested or directly available depending on Dodo's payload structure
            // If metadata is not passed through to subscription object, we might need to rely on customer_id or email

            // Assuming metadata is passed or we can find user by customer_id if we saved it earlier (but we might not have)
            // Let's try to find user by email if metadata is missing, or if we can pass client_reference_id

            // In checkout creation we passed metadata: { firebaseUid: uid }
            // Let's check if it comes back in the subscription object

            let uid = metadata?.firebaseUid;

            // If not in metadata, maybe we can match by email if Dodo sends it
            if (!uid && data.customer && data.customer.email) {
                const userSnapshot = await db.collection('users').where('email', '==', data.customer.email).get();
                if (!userSnapshot.empty) {
                    uid = userSnapshot.docs[0].id;
                }
            }

            if (uid) {
                await db.collection('users').doc(uid).set({
                    subscriptionStatus: 'active',
                    dodoSubscriptionId: subscription_id,
                    dodoCustomerId: customer_id,
                    credits: -1, // Unlimited
                }, { merge: true });
            }
        }

        if (type === 'subscription.on_hold' || type === 'subscription.failed' || type === 'subscription.cancelled') {
            // Handle cancellation/failure
            const { customer_id } = data;
            const snapshot = await db.collection('users').where('dodoCustomerId', '==', customer_id).get();

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                await userDoc.ref.update({
                    subscriptionStatus: 'free',
                    credits: 3, // Reset to free credits or keep as is?
                });
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 400 });
    }
}
