import DodoPayments from 'dodopayments';

const webhookKey =
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
    process.env.DODO_PAYMENTS_WEBHOOK_KEY;

// Determine SDK environment:
// - Prefer explicit DODO_PAYMENTS_ENV=live_mode
// - Fallback to NODE_ENV === 'production' => live_mode
// - Otherwise default to test_mode
const env: 'test_mode' | 'live_mode' =
    process.env.DODO_PAYMENTS_ENV === 'live_mode' || process.env.NODE_ENV === 'production'
        ? 'live_mode'
        : 'test_mode';

export const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: env,
    ...(webhookKey ? { webhookKey } : {}),
});
