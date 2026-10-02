import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { createPaymentIntent } from '@/src/api/api';

export function useStripePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const payWithStripe = async ({ amount }: { amount: number; userId: string }) => {
    try {
      const clientSecret = await createPaymentIntent(amount);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Tiffinly',
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        return false;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', paymentError.message);
        }
        return false;
      }

      return true;
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Something went wrong');
      return false;
    }
  };

  return { payWithStripe };
}
