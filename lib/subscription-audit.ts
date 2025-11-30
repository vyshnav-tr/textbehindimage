import { db } from '@/lib/firebase-admin';

export type SubscriptionAuditPayload = {
    source: string;
    eventContext?: Record<string, unknown> | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    mapping?: Record<string, unknown> | null;
};

/**
 * Append an audit entry under users/{uid}/subscription_audit to trace writes
 * to subscription-related fields (especially subscriptionInterval).
 *
 * This helper is best-effort and will never throw: failures are logged.
 */
export async function auditSubscriptionWrite(uid: string, payload: SubscriptionAuditPayload): Promise<void> {
    try {
        await db
            .collection('users')
            .doc(String(uid))
            .collection('subscription_audit')
            .add({
                ...payload,
                created_at: new Date().toISOString(),
            });
    } catch (e) {
        // Never block the main flow on audit issues
        console.warn('auditSubscriptionWrite failed', e);
    }
}