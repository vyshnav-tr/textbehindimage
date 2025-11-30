
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import { logAnalyticsEvent } from "@/app/utils/analytics";
import { auth } from "@/app/firebase";

interface PricingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uid?: string;
    subscriptionStatus?: string;
    dodoCustomerId?: string;
    dodoSubscriptionId?: string;
    subscriptionInterval?: string;
}

export function PricingDialog({ open, onOpenChange, uid, subscriptionStatus, dodoCustomerId, dodoSubscriptionId, subscriptionInterval }: PricingDialogProps) {
    const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | 'upgrade' | 'cancel' | null>(null);

    useEffect(() => {
        if (open) {
            logAnalyticsEvent('view_pricing');
        }
    }, [open]);

    const handlePortal = async () => {
        logAnalyticsEvent('manage_subscription');
        if (!dodoCustomerId) return;
        setLoading('portal');
        try {
            const response = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: dodoCustomerId }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error opening portal:', error);
        } finally {
            setLoading(null);
        }
    };

    const handleUpgrade = async () => {
        if (!dodoSubscriptionId || !uid) return;
        logAnalyticsEvent('upgrade_subscription');
        setLoading('upgrade');
        try {
            const response = await fetch('/api/subscription/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: dodoSubscriptionId,
                    newProductId: process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY,
                    uid
                }),
            });
            const data = await response.json();
            if (data.success) {
                // Force-sync Firestore with latest subscription from Dodo to avoid stale UI
                try {
                    await fetch('/api/subscription/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            uid,
                            subscriptionId: dodoSubscriptionId,
                        }),
                    });
                } catch (e) {
                    console.warn('Subscription sync after upgrade failed', e);
                }
                alert('Subscription upgraded successfully!');
                window.location.reload();
            } else {
                console.error('Upgrade failed:', data.error);
                alert('Upgrade failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error upgrading:', error);
            alert('Error upgrading subscription');
        } finally {
            setLoading(null);
        }
    };

    const handleCancelAtPeriodEnd = async () => {
        if (!dodoSubscriptionId || !uid) return;
        logAnalyticsEvent('cancel_at_period_end');
        setLoading('cancel');
        try {
            const res = await fetch('/api/subscription/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: dodoSubscriptionId,
                    uid,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(
                    `Cancellation scheduled. You will keep access until ${data.access_until ?? 'the end of the current billing period'}.`
                );
                window.location.reload();
            } else {
                alert(data.error || 'Failed to schedule cancellation at period end');
            }
        } catch (error) {
            console.error('Error scheduling cancel:', error);
            alert('Error scheduling cancellation');
        } finally {
            setLoading(null);
        }
    };

    const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
        if (!uid) return;

        logAnalyticsEvent('begin_checkout', { plan });
        setLoading(plan);
        try {
            // Use product IDs from env vars

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: plan === 'monthly' ? process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY : process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY,
                    plan, // send plan so server can resolve product id safely per environment
                    uid,
                    email: auth.currentUser?.email,
                    name: auth.currentUser?.displayName
                }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Upgrade to Pro</DialogTitle>
                    <DialogDescription className="text-center text-lg">
                        Get unlimited background removals and premium features.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                    {subscriptionStatus === 'active' ? (
                        <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center p-8 border rounded-xl bg-muted/20 gap-4">
                            <h3 className="text-xl font-semibold mb-2">Active Subscription</h3>
                            <p className="text-muted-foreground mb-2 text-center">
                                You are currently on an active {subscriptionInterval === 'year' ? 'Yearly' : 'Monthly'} plan.
                            </p>

                            {subscriptionInterval === 'month' && (
                                <div className="w-full max-w-sm bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4 text-center">
                                    <h4 className="font-semibold text-primary mb-1">Upgrade to Yearly & Save 33%</h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Pay only the difference for the remaining time.
                                    </p>
                                    <Button
                                        onClick={handleUpgrade}
                                        disabled={loading === 'upgrade'}
                                        className="w-full"
                                        variant="default"
                                    >
                                        {loading === 'upgrade' ? 'Upgrading...' : 'Upgrade to Yearly ($72/year)'}
                                    </Button>
                                </div>
                            )}

                            <p className="text-muted-foreground mb-6 text-center text-sm">
                                You can manage your subscription and update payment method. To cancel, schedule a cancellation at the end of the current billing period.
                            </p>
                            <div className="flex flex-col gap-3 w-full max-w-sm">
                                <Button
                                    onClick={handlePortal}
                                    disabled={loading === 'portal'}
                                    className="w-full"
                                    variant="outline"
                                >
                                    {loading === 'portal' ? 'Loading Portal...' : 'Manage Billing'}
                                </Button>
                                <Button
                                    onClick={handleCancelAtPeriodEnd}
                                    disabled={loading === 'cancel'}
                                    className="w-full"
                                    variant="destructive"
                                >
                                    {loading === 'cancel' ? 'Scheduling…' : 'Cancel at Period End'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Monthly Plan */}
                            <div className="border rounded-xl p-6 flex flex-col gap-4 hover:border-primary transition-colors relative">
                                <div className="text-xl font-semibold">Monthly</div>
                                <div className="text-3xl font-bold">$9<span className="text-base font-normal text-muted-foreground">/month</span></div>
                                <ul className="space-y-2 flex-1">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Unlimited Background Removals</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Advanced Text Effects (3D, Curve)</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Pro Image Adjustments</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Priority Support</li>
                                </ul>
                                <Button
                                    onClick={() => handleSubscribe('monthly')}
                                    disabled={loading === 'monthly'}
                                    className="w-full"
                                >
                                    {loading === 'monthly' ? 'Processing...' : 'Subscribe Monthly'}
                                </Button>
                            </div>

                            {/* Yearly Plan */}
                            <div className="border rounded-xl p-6 flex flex-col gap-4 border-primary bg-primary/5 relative">
                                <div className="absolute -top-3 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                                    SAVE 33%
                                </div>
                                <div className="text-xl font-semibold">Yearly</div>
                                <div className="text-3xl font-bold">$6<span className="text-base font-normal text-muted-foreground">/month</span></div>
                                <div className="text-sm text-muted-foreground">Billed $72 yearly</div>
                                <ul className="space-y-2 flex-1">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> All Monthly Features</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Save $36 per year</li>
                                </ul>
                                <Button
                                    onClick={() => handleSubscribe('yearly')}
                                    disabled={loading === 'yearly'}
                                    className="w-full"
                                    variant="default"
                                >
                                    {loading === 'yearly' ? 'Processing...' : 'Subscribe Yearly'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
