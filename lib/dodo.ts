import DodoPayments from 'dodopayments';

export const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: 'test_mode', // or 'live_mode' based on env, defaulting to test for now
});
