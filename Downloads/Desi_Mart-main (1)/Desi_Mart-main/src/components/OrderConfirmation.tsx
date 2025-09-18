import React from 'react';
import { CheckCircle, Package, Truck, Download, MessageCircle, Mail } from 'lucide-react';
import { Order } from '../types';

interface OrderConfirmationProps {
  order: Order;
  onContinueShopping: () => void;
}

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ order, onContinueShopping }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center mb-8">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-lg text-gray-600">Thank you for shopping with DesiBazaar</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <Package className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Order Processing</h3>
              <p className="text-sm text-gray-600">Your order is being prepared</p>
            </div>
            <div className="text-center">
              <Truck className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
              <p className="text-sm text-gray-600">Expected by {estimatedDelivery.toLocaleDateString('en-IN')}</p>
            </div>
            <div className="text-center">
              <MessageCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">24/7 Support</h3>
              <p className="text-sm text-gray-600">We're here to help</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
              <p className="text-gray-600">Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          {/* Items */}
          <div className="space-y-4 mb-6">
            {order.items.map((item) => (
              <div key={item.product.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{item.product.name}</h3>
                  {item.product.brand && (
                    <p className="text-sm text-gray-500">{item.product.brand}</p>
                  )}
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.product.price)} each
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>{formatPrice(order.gst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span className="text-green-600">FREE</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                <span>Total Paid</span>
                <span className="text-orange-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h3>
          <div className="text-gray-600">
            <p className="font-medium text-gray-900">{order.address.name}</p>
            <p>{order.address.phone}</p>
            <p>{order.address.addressLine1}</p>
            {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
            <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 capitalize">{order.paymentMethod.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-sm text-gray-500">Payment successful</p>
              {order.paymentId && (
                <p className="text-xs text-gray-400">Payment ID: {order.paymentId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onContinueShopping}
            className="px-8 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Continue Shopping
          </button>
          
          <button className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Download Invoice</span>
          </button>

          <button className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Track Order</span>
          </button>
        </div>

        {/* Notification Messages */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Confirmation Sent</p>
              <p className="text-xs text-blue-700">
                Order confirmation and invoice have been sent to your email and WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;