# Auth & Payment Integration Walkthrough

I have refactored the authentication to use dedicated pages and integrated **Dodo Payments**.

## Changes
- **Authentication**:
    - Created `app/login/page.tsx` and `app/signup/page.tsx`.
    - Signup now asks for **Name**, Email, and Password.
    - Removed `components/auth/LoginDialog.tsx`.
    - Updated `app/landing.tsx` to link to new pages.
    - Users are synced to Firestore via `/api/user/sync` on signup/login.
- **Payments (Dodo)**:
    - `app/api/checkout/route.ts`: Handles Dodo Checkout.
    - `app/api/webhook/route.ts`: Handles Dodo Webhooks.
    - `components/PricingDialog.tsx`: Initiates checkout.

## Verification
1.  **Environment Variables**:
    - Ensure `.env.local` has Dodo keys and Firebase Service Account.
2.  **Auth Testing**:
    - Go to `/signup` -> Create account with Name/Email/Pass -> Verify redirect to Editor.
    - Go to `/login` -> Login -> Verify redirect to Editor.
    - Check Firestore `users` collection for new user doc with `credits: 3` and `name`.
3.  **Payment Testing**:
    - In Editor, click "Upgrade".
    - Complete Dodo Checkout (Test Mode).
    - Verify "Pro Plan" status.

## Next Steps
- Verify Dodo Webhook endpoint is reachable (if deploying).
- Add your actual Dodo API keys.
