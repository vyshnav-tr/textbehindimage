import { NextResponse } from 'next/server';
import { dodo } from '@/lib/dodo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isLive =
    process.env.DODO_PAYMENTS_ENV === 'live_mode' ||
    process.env.NODE_ENV === 'production';

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
        }

        const body = await req.json().catch(() => null as unknown);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const { productId, uid, email, name, plan } = body as {
            productId?: string;
            uid?: string;
            email?: string;
            name?: string;
            plan?: 'monthly' | 'yearly';
        };

        // Basic input validation
        if (!uid || typeof uid !== 'string') {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }
        if (!email || typeof email !== 'string') {
            // Email is required by Dodo when creating a new customer for checkout
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        // Resolve product id from plan or validate provided productId against allowlist
        const monthly = process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY;
        const yearly = process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;
        const allowedProducts = [monthly, yearly].filter(Boolean) as string[];

        let finalProductId: string | undefined =
            productId && typeof productId === 'string' ? productId : undefined;

        if (!finalProductId && (plan === 'monthly' || plan === 'yearly')) {
            finalProductId = plan === 'monthly' ? monthly : yearly;
        }

        if (
            !finalProductId ||
            (allowedProducts.length > 0 && !allowedProducts.includes(String(finalProductId)))
        ) {
            console.error('Invalid or unknown productId for current environment', {
                received: productId,
                plan,
                resolved: finalProductId,
                allowedProducts,
            });
            return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl || !/^https?:\/\//i.test(appUrl)) {
            console.error('Invalid or missing NEXT_PUBLIC_APP_URL:', appUrl);
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        if (!process.env.DODO_PAYMENTS_API_KEY) {
            console.error('DODO_PAYMENTS_API_KEY is missing');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        // Normalize base URL (no trailing slash)
        const base = appUrl.replace(/\/$/, '');

        const session = await dodo.checkoutSessions.create({
            product_cart: [{ product_id: finalProductId, quantity: 1 }],
            customer: { email, name: name || 'User' },
            allowed_payment_method_types: ['credit', 'debit'], // keep card rails as reliable fallback
            return_url: `${base}/editor?success=true`,
            metadata: { firebaseUid: uid, ...(plan ? { plan: String(plan) } : {}) },
        });

        // Be defensive about possible response shapes across SDK versions
        const url =
            (session as any)?.link ||
            (session as any)?.checkout_url ||
            (session as any)?.url;

        if (!url || typeof url !== 'string') {
            console.error('Checkout session did not include a URL payload', session);
            return NextResponse.json({ error: 'Failed to create checkout link' }, { status: 502 });
        }

        return NextResponse.json({ url });
    } catch (error: unknown) {
        console.error('Error creating checkout session:', error);
        console.error('Checkout env:', {
            NODE_ENV: process.env.NODE_ENV,
            DODO_PAYMENTS_ENV: process.env.DODO_PAYMENTS_ENV,
        });
        // Signal upstream failure so client can retry or show an error
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 502 });
    }
}
