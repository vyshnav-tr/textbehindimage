import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { auth } from "@/app/firebase";

interface PricingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uid?: string;
}

export function PricingDialog({ open, onOpenChange, uid }: PricingDialogProps) {
    const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

    const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
        if (!uid) return;
        setLoading(plan);
        try {
            // Use product IDs from env vars

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: plan === 'monthly' ? process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY : process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY,
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
                    {/* Monthly Plan */}
                    <div className="border rounded-xl p-6 flex flex-col gap-4 hover:border-primary transition-colors relative">
                        <div className="text-xl font-semibold">Monthly</div>
                        <div className="text-3xl font-bold">$9<span className="text-base font-normal text-muted-foreground">/month</span></div>
                        <ul className="space-y-2 flex-1">
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Unlimited Background Removals</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> High Quality Export</li>
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
