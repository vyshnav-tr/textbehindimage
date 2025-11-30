import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns recent audit entries for subscription writes.
 * Usage:
 *   GET /api/user/audit?uid=USER_ID&limit=20
 *
 * Response:
 * {
 *   items: [
 *     {
 *       id: string,
 *       created_at: string,
 *       source: 'upgrade' | 'webhook' | 'sync' | 'fix_interval',
 *       eventContext?: object,
 *       before?: object,
 *       after?: object,
 *       mapping?: object
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');
        const limitParam = searchParams.get('limit');

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        const limit = Math.min(Math.max(Number(limitParam ?? 20) || 20, 1), 100);

        const collectionRef = db
            .collection('users')
            .doc(String(uid))
            .collection('subscription_audit');

        const snapshot = await collectionRef.orderBy('created_at', 'desc').limit(limit).get();

        const items = snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
                id: d.id,
                created_at: data.created_at ?? null,
                source: data.source ?? null,
                eventContext: data.eventContext ?? null,
                before: data.before ?? null,
                after: data.after ?? null,
                mapping: data.mapping ?? null,
            };
        });

        return NextResponse.json({ items });
    } catch (error: unknown) {
        console.error('Error fetching audit entries:', error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}