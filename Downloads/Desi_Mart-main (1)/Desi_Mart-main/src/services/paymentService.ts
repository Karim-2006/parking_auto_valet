import { CartItem, Address, PaymentResult } from '../types';

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: any) => any;
        };
      };
    };
  }
}

export interface GooglePayConfig {
  merchantId: string;
  merchantName: string;
  environment: 'TEST' | 'PRODUCTION';
}

export class PaymentService {
  private paymentsClient: any;
  private config: GooglePayConfig;
  private currentTotal: number = 0;

  constructor(config: GooglePayConfig) {
    this.config = config;
    this.initializeGooglePay();
  }

  private async initializeGooglePay() {
    if (!window.google?.payments?.api) {
      await this.loadGooglePayScript();
    }

    if (!window.google?.payments?.api) {
      console.error("Google Pay API not available after loading script.");
      return;
    }

    this.paymentsClient = new window.google.payments.api.PaymentsClient({
      environment: this.config.environment,
      merchantInfo: {
        merchantId: this.config.merchantId,
        merchantName: this.config.merchantName
      },
      paymentDataCallbacks: {
        onPaymentAuthorized: this.onPaymentAuthorized.bind(this),
        onPaymentDataChanged: this.onPaymentDataChanged.bind(this)
      }
    });
  }

  private loadGooglePayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.payments?.api) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://pay.google.com/gp/p/js/pay.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Pay script'));
      document.head.appendChild(script);
    });
  }

  private getBaseRequest() {
    return {
      apiVersion: 2,
      apiVersionMinor: 0
    };
  }

  private getTokenizationSpecification() {
    return {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'example', // Replace with your actual payment gateway
        gatewayMerchantId: this.config.merchantId
      }
    };
  }

  private getCardPaymentMethod() {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX']
      },
      tokenizationSpecification: this.getTokenizationSpecification()
    };
  }

  // private getUpiPaymentMethod() {
  //   return {
  //     type: 'UPI',
  //     parameters: {
  //       payeeVpa: import.meta.env.VITE_MERCHANT_UPI_ID,
  //       payeeName: this.config.merchantName,
  //       referenceUrl: window.location.origin,
  //       mcc: '5411', // Grocery stores
  //       tr: Date.now().toString()
  //     }
  //   };
  // }

  async isReadyToPay(): Promise<boolean> {
    try {
      const isReadyToPayRequest = {
        ...this.getBaseRequest(),
        allowedPaymentMethods: [this.getCardPaymentMethod()]
      };

      const response = await this.paymentsClient.isReadyToPay(isReadyToPayRequest);
      return response.result;
    } catch (error) {
      console.error('Error checking Google Pay readiness:', error);
      return false;
    }
  }

  async processPayment(
    cartItems: CartItem[],
    address: Address,
    total: number
  ): Promise<PaymentResult> {
    try {
      this.currentTotal = total;
      const paymentDataRequest = {
        ...this.getBaseRequest(),
        allowedPaymentMethods: [this.getCardPaymentMethod()],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: total.toFixed(2),
          currencyCode: 'INR',
          countryCode: 'IN'
        },
        merchantInfo: {
          merchantId: this.config.merchantId,
          merchantName: this.config.merchantName
        },
        callbackIntents: ['PAYMENT_AUTHORIZATION', 'SHIPPING_ADDRESS', 'SHIPPING_OPTION']
      };

      const paymentData = await this.paymentsClient.loadPaymentData(paymentDataRequest);
      
      // Process payment with your backend
      const orderResult = await this.createOrder(cartItems, address, total, paymentData);
      
      return {
        success: true,
        orderId: orderResult.orderId,
        paymentId: orderResult.paymentId,
        paymentData
      };
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      if (error.statusCode === 'CANCELED') {
        return {
          success: false,
          error: 'Payment was canceled by user',
          errorCode: 'USER_CANCELED'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        errorCode: 'PAYMENT_FAILED'
      };
    }
  }

  private async onPaymentAuthorized(paymentData: any) {
    try {
      // Verify payment with your backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ paymentData })
      });

      if (response.ok) {
        return { transactionState: 'SUCCESS' };
      } else {
        return { transactionState: 'ERROR' };
      }
    } catch (error) {
      console.error('Payment authorization error:', error);
      return { transactionState: 'ERROR' };
    }
  }

  private onPaymentDataChanged(intermediatePaymentData: any) {
    return new Promise((resolve) => {
      const paymentDataRequest = {
        ...this.getBaseRequest(),
        allowedPaymentMethods: [this.getCardPaymentMethod()],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: this.currentTotal.toFixed(2),
          currencyCode: 'INR',
          countryCode: 'IN'
        }
      };

      let newShippingOptionPrice = 0;
      if (intermediatePaymentData.shippingOptionData) {
        switch (intermediatePaymentData.shippingOptionData.id) {
          case 'shipping-001':
            newShippingOptionPrice = 0.00;
            break;
          case 'shipping-002':
            newShippingOptionPrice = 5.00;
            break;
          case 'shipping-003':
            newShippingOptionPrice = 10.00;
            break;
          default:
            newShippingOptionPrice = 0.00;
            break;
        }
      }

      // Update transaction info with new shipping price
      paymentDataRequest.transactionInfo.totalPrice = (parseFloat(paymentDataRequest.transactionInfo.totalPrice) + newShippingOptionPrice).toFixed(2);

      resolve({
        newTransactionInfo: paymentDataRequest.transactionInfo,
        newShippingOptionParameters: {
          defaultSelectedOptionId: intermediatePaymentData.shippingOptionData ? intermediatePaymentData.shippingOptionData.id : 'shipping-001',
          shippingOptions: [
            {
              id: 'shipping-001',
              label: 'Free: Standard shipping',
              price: '0.00',
              description: 'Arrives in 5-7 days'
            },
            {
              id: 'shipping-002',
              label: 'Express: Express shipping',
              price: '5.00',
              description: 'Arrives in 1-3 days'
            },
            {
              id: 'shipping-003',
              label: 'Premium: Premium shipping',
              price: '10.00',
              description: 'Arrives in 1 day'
            }
          ]
        }
      });
    });
  }

  private async createOrder(
    cartItems: CartItem[],
    address: Address,
    total: number,
    paymentData: any
  ) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        items: cartItems,
        address,
        total,
        paymentData,
        paymentMethod: 'googlepay'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    return response.json();
  }

  generateUpiQrData(amount: number, orderId: string): string {
    const upiId = import.meta.env.VITE_MERCHANT_UPI_ID;
    const merchantName = this.config.merchantName;
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Order ${orderId}`)}&tr=${orderId}`;
  }
}

// Initialize payment service
export const paymentService = new PaymentService({
  merchantId: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || 'your_merchant_id',
  merchantName: import.meta.env.VITE_MERCHANT_NAME || 'DesiBazaar',
  environment: import.meta.env.PROD ? 'PRODUCTION' : 'TEST'
});