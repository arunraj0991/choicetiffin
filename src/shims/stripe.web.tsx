import React from "react";

export function StripeProvider({
  children,
}: {
  children: React.ReactNode;
  publishableKey?: string;
}) {
  return <>{children}</>;
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({
      error: { message: "Card payments are not available on web" },
    }),
    presentPaymentSheet: async () => ({
      error: { message: "Card payments are not available on web" },
    }),
  };
}
