import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from '@/components/ui/page-header'; // Assuming you have a PageHeader component

// Define subscription plan types
type Plan = 'free' | 'professional';

// Define plan details
const planDetails = {
  free: {
    name: "Free Plan",
    price: "₹0",
    features: [
      "Basic Patient Record Management",
      "Appointment Scheduling (up to 10/month)",
      "Standard Email Reminders",
      "Community Support",
    ],
  },
  professional: {
    name: "Professional Plan",
    price: "₹49", // Example price for dental app
    priceSuffix: "/ month",
    features: [
      "All features in Free Plan",
      "Unlimited Patient Records",
      "Unlimited Appointment Scheduling",
      "Automated SMS & Email Reminders",
      "Basic Treatment Planning",
      "Consent Form Management",
      "Priority Email Support",
      "5 GB Document Storage",
    ],
  },
};

// Define FAQ items
const faqItems = [
  {
    question: "Can I change my plan later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time from your account settings. Changes will take effect from the next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.",
  },
  {
    question: "Is my payment information secure?",
    answer: "Absolutely. We use industry-standard encryption and partner with Stripe, a leading payment processor, to ensure your payment details are handled securely.",
  },
  {
    question: "What happens if my payment fails?",
    answer: "If a payment fails, we'll notify you and attempt to retry the payment method. You'll have a grace period to update your payment details before any service interruption.",
  },
];

export function PaymentsSubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('professional');
  const [promoCode, setPromoCode] = useState('');
  const [usePromo, setUsePromo] = useState(false);

  const currentPlan = planDetails[selectedPlan];
  const subtotal = selectedPlan === 'free' ? 0 : 49; // Example subtotal based on plan
  const platformFee = selectedPlan === 'free' ? 0 : 4; // Example fee
  const totalAmount = subtotal + platformFee;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual payment processing logic (e.g., Stripe integration)
    console.log("Processing payment for:", selectedPlan, "Total:", totalAmount);
    // Show success toast or handle errors
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <PageHeader heading="Payments & Subscription" text="Manage your billing details and subscription plan." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Payment Details Form - Column 1 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Enter your payment information to subscribe.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayment} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" required defaultValue="m@example.com" /> {/* Pre-fill or fetch user email */}
              </div>

              {/* Credit Card */}
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Credit Card Number</Label>
                <Input id="cardNumber" type="text" placeholder="XXXX XXXX XXXX XXXX" required />
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input id="expiryDate" type="text" placeholder="MM / YY" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" type="text" placeholder="XXX" required />
                </div>
              </div>

              {/* Promo Code */}
              <div className="flex items-center space-x-2">
                <Checkbox id="promo" checked={usePromo} onCheckedChange={(checked) => setUsePromo(Boolean(checked))} />
                <Label htmlFor="promo" className="cursor-pointer">I have a promo code</Label>
              </div>
              {usePromo && (
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code</Label>
                  <Input id="promoCode" type="text" placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
                  {/* Add logic to validate and apply promo code */}
                </div>
              )}

              {/* Payment Summary */}
              <div className="space-y-2 border-t pt-4 mt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee</span>
                  <span>₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                  <span>Total Amount</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={selectedPlan === 'free'}>
                {selectedPlan === 'free' ? 'Free Plan Selected' : `Subscribe to ${currentPlan.name}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Plans & Info - Column 2 */}
        <div className="space-y-8">
          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as Plan)}>
                {/* Free Plan Option */}
                <Label
                  htmlFor="free-plan"
                  className={`flex flex-col items-start space-y-1 rounded-md border p-4 cursor-pointer transition-colors ${selectedPlan === 'free' ? 'border-primary bg-primary/5' : 'hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <div className="flex justify-between w-full items-center">
                    <span className="font-semibold">{planDetails.free.name}</span>
                    <RadioGroupItem value="free" id="free-plan" className="translate-y-0" />
                  </div>
                  <span className="text-2xl font-bold">{planDetails.free.price}</span>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                    {planDetails.free.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </Label>

                {/* Professional Plan Option */}
                <Label
                  htmlFor="professional-plan"
                  className={`flex flex-col items-start space-y-1 rounded-md border p-4 cursor-pointer transition-colors ${selectedPlan === 'professional' ? 'border-primary bg-primary/5' : 'hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <div className="flex justify-between w-full items-center">
                    <span className="font-semibold">{planDetails.professional.name}</span>
                    <RadioGroupItem value="professional" id="professional-plan" className="translate-y-0" />
                  </div>
                  <span className="text-2xl font-bold">
                    {planDetails.professional.price}
                    <span className="text-sm font-normal text-muted-foreground">{planDetails.professional.priceSuffix}</span>
                  </span>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                    {planDetails.professional.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </Label>
              </RadioGroup>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Modify Plan</Button> {/* Link to plan modification logic */}
            </CardFooter>
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem value={`item-${index + 1}`} key={index}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
