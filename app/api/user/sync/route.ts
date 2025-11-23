import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const { uid, email, name } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
        }

        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            // New user, initialize with 3 credits
            await userRef.set({
                uid,
                email,
                name,
                credits: 3,
                subscriptionStatus: 'free',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            return NextResponse.json({ success: true, isNewUser: true, credits: 3 });
        } else {
            // Existing user, update metadata but preserve credits/subscription
            await userRef.update({
                email, // Update email if changed
                name,  // Update name if changed
                lastLogin: new Date().toISOString()
            });
            const data = doc.data();
            return NextResponse.json({
                success: true,
                isNewUser: false,
                credits: data?.credits ?? 0
            });
        }
    } catch (error) {
        console.error('Error syncing user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
