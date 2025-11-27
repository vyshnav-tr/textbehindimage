import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';

export async function POST(req: Request) {
    try {
        const { productId, uid, email, name } = await req.json();

        if (!uid || !productId) {
            return NextResponse.json({ error: 'Missing uid or productId' }, { status: 400 });
        }

        // Dodo Payments creates customer during checkout
        // We pass customer details directly in the checkout session

        const session = await dodo.checkoutSessions.create({
            product_cart: [
                {
                    product_id: productId,
                    quantity: 1,
                },
            ],
            customer: {
                email: email,
                name: name || 'User',
            },
            allowed_payment_method_types: ['credit', 'debit'],
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/editor?success=true`,
            metadata: {
                firebaseUid: uid,
            },
        });

        return NextResponse.json({ url: (session as any).checkout_url || (session as any).link }); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
