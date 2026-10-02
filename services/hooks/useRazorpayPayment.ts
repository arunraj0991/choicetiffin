import { Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { createRazorpayOrder } from '@/src/api/api';
import COLORS from '@/constants/colors';

interface RazorpayOptions {
  amount: number;
  user: { id: string; name: string; email: string; phone: string };
  razorpayKey: string;
}

export function useRazorpayPayment() {
  const payWithRazorpay = async ({ amount, user, razorpayKey }: RazorpayOptions): Promise<boolean> => {
    try {
      const orderData = await createRazorpayOrder(amount);

      const options = {
        description: 'Payment for Subscription',
        currency: 'INR',
        key: razorpayKey,
        amount: String(amount * 100),
        name: 'Choice Tiffin Services',
        order_id: orderData.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: COLORS.primary },
      };

      const response: any = await RazorpayCheckout.open(options);

      if (response?.razorpay_payment_id) {
        return true;
      }
      throw new Error('Payment not completed');
    } catch (error: any) {
      if (error?.code !== 0) {
        Alert.alert('Payment Failed', error?.description || error?.message || 'Payment failed. Please try again.');
      }
      return false;
    }
  };

  return { payWithRazorpay };
}
