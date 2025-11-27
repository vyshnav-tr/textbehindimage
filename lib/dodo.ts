import DodoPayments from 'dodopayments';

const webhookKey =
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
    process.env.DODO_PAYMENTS_WEBHOOK_KEY;

const env = (process.env.DODO_PAYMENTS_ENV === 'live_mode' ? 'live_mode' : 'test_mode') as 'test_mode' | 'live_mode';

export const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: env,
    ...(webhookKey ? { webhookKey } : {}),
});
