const RazorpayCheckout = {
  open: async () => {
    throw new Error("UPI payments are not available on web");
  },
};

export default RazorpayCheckout;
