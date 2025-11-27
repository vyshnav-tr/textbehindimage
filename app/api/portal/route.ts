import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { customerId, uid, subscriptionId, email } = await req.json();

        let resolvedCustomerId: string | undefined = customerId;

        // Try to resolve via provided subscriptionId first (fast path)
        if (!resolvedCustomerId && subscriptionId) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sub: any = await dodo.subscriptions.retrieve(String(subscriptionId));
                const cid: string | undefined = sub?.customer_id || sub?.customer?.id;
                if (cid) {
                    resolvedCustomerId = cid;
                }
            } catch (e) {
                console.warn('Unable to resolve customer from provided subscriptionId in portal route', e);
            }
        }

        // If customerId isn't provided, try resolving via uid -> Firestore -> subscription -> Dodo
        if (!resolvedCustomerId) {
            if (!uid) {
                return NextResponse.json({ error: 'Missing customerId or uid' }, { status: 400 });
            }

            const userRef = db.collection('users').doc(String(uid));
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const data = userDoc.data() || {};
            resolvedCustomerId = data.dodoCustomerId;

            // Backfill from subscription if needed
            if (!resolvedCustomerId && data.dodoSubscriptionId) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sub: any = await dodo.subscriptions.retrieve(String(data.dodoSubscriptionId));
                    const fetchedCustomerId: string | undefined = sub?.customer_id || sub?.customer?.id;
                    if (fetchedCustomerId) {
                        resolvedCustomerId = fetchedCustomerId;
                        await userRef.set({ dodoCustomerId: fetchedCustomerId }, { merge: true });
                    }
                } catch (e) {
                    console.warn('Unable to backfill customerId from subscription in portal route', e);
                }
            }

            // Email-based fallback: prefer request body email, else Firestore email
            const lookupEmail = email || data.email;
            if (!resolvedCustomerId && lookupEmail) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const customers: any = await dodo.customers.list({ email: String(lookupEmail), page_size: 1 });
                    const first = customers?.items?.[0];
                    const cid: string | undefined = first?.customer_id || first?.id;
                    if (cid) {
                        resolvedCustomerId = cid;
                        await userRef.set({ dodoCustomerId: cid }, { merge: true });
                    }
                } catch (e) {
                    console.warn('Unable to resolve customer via email lookup in portal route', e);
                }
            }

            if (!resolvedCustomerId) {
                return NextResponse.json(
                    { error: 'Unable to resolve customerId for this user. Ensure subscription is active.' },
                    { status: 400 }
                );
            }
        }

        // Create a Customer Portal session (SDK: customers.customerPortal.create)
        const session = await dodo.customers.customerPortal.create(resolvedCustomerId, {
            send_email: false,
        });

        // SDK returns { link }
        return NextResponse.json({ url: (session as any).link }); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (error) {
        console.error('Error creating portal session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
