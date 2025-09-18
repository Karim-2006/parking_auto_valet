import React, { useState } from 'react';
import { CreditCard, Smartphone, Banknote, MapPin, User, Phone, Loader } from 'lucide-react';
import { CartItem, Address } from '../types';
import { paymentService } from '../services/paymentService';
import { toast } from 'react-hot-toast';

interface CheckoutFormProps {
  cartItems: CartItem[];
  onPlaceOrder: (address: Address, paymentMethod: string) => void;
  onBack: () => void;
  onPaymentProcessing: (processing: boolean) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  cartItems, 
  onPlaceOrder, 
  onBack, 
  onPaymentProcessing 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('googlepay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState<Address>({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const gst = subtotal * 0.18;
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + gst + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'googlepay') {
      await handleGooglePayPayment();
    } else {
      // Handle other payment methods (UPI, COD)
      onPlaceOrder(address, paymentMethod);
    }
  };

  const handleGooglePayPayment = async () => {
    setIsProcessing(true);
    onPaymentProcessing(true);
    
    try {
      // Check if Google Pay is available
      const isReady = await paymentService.isReadyToPay();
      
      if (!isReady) {
        toast.error('Google Pay is not available on this device');
        setIsProcessing(false);
        onPaymentProcessing(false);
        return;
      }

      // Process payment
      const result = await paymentService.processPayment(cartItems, address, total);
      
      if (result.success) {
        toast.success('Payment successful!');
        onPlaceOrder(address, paymentMethod);
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed');
    } finally {
      setIsProcessing(false);
      onPaymentProcessing(false);
    }
  };

  const isFormValid = address.name && address.phone && address.addressLine1 && 
                     address.city && address.state && address.pincode;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
              <button
                type="button"
                onClick={onBack}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                ← Back to Cart
              </button>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={address.name}
                      onChange={(e) => setAddress({...address, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="tel"
                      required
                      value={address.phone}
                      onChange={(e) => setAddress({...address, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.addressLine1}
                    onChange={(e) => setAddress({...address, addressLine1: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="House no, Building name, Street name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={address.addressLine2}
                    onChange={(e) => setAddress({...address, addressLine2: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Area, Landmark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({...address, city: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <select
                    required
                    value={address.state}
                    onChange={(e) => setAddress({...address, state: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="West Bengal">West Bengal</option>
                    {/* Add more states */}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{6}"
                    value={address.pincode}
                    onChange={(e) => setAddress({...address, pincode: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="400001"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>

              <div className="space-y-3">
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'googlepay' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`} onClick={() => setPaymentMethod('googlepay')}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="googlepay"
                      name="payment"
                      value="googlepay"
                      checked={paymentMethod === 'googlepay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-orange-500"
                    />
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <div>
                      <label htmlFor="googlepay" className="font-medium cursor-pointer">
                        Google Pay UPI
                      </label>
                      <p className="text-sm text-gray-500">Secure and instant payment</p>
                    </div>
                  </div>
                </div>

                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'phonepe' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`} onClick={() => setPaymentMethod('phonepe')}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="phonepe"
                      name="payment"
                      value="phonepe"
                      checked={paymentMethod === 'phonepe'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-orange-500"
                    />
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    <div>
                      <label htmlFor="phonepe" className="font-medium cursor-pointer">
                        PhonePe
                      </label>
                      <p className="text-sm text-gray-500">Quick UPI payment</p>
                    </div>
                  </div>
                </div>

                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                }`} onClick={() => setPaymentMethod('cod')}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="cod"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-orange-500"
                    />
                    <Banknote className="h-5 w-5 text-green-600" />
                    <div>
                      <label htmlFor="cod" className="font-medium cursor-pointer">
                        Cash on Delivery
                      </label>
                      <p className="text-sm text-gray-500">Pay when you receive</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              disabled={!isFormValid || isProcessing}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                isFormValid && !isProcessing
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Processing Payment...</span>
                </div>
              ) : (
                `Place Order • ${formatPrice(total)}`
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center space-x-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>{formatPrice(gst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                <span>Total</span>
                <span className="text-orange-600">{formatPrice(total)}</span>
              </div>
            </div>

            {subtotal < 500 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Add items worth {formatPrice(500 - subtotal)} more for FREE delivery!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutForm;