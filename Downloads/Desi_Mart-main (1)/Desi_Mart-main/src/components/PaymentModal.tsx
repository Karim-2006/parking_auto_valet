import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader, Download, Smartphone, CreditCard } from 'lucide-react';
import QRCode from 'react-qr-code';
import { PaymentStatus, Order } from '../types';
import { invoiceService } from '../services/invoiceService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentStatus: PaymentStatus;
  order: Order | null;
  onRetryPayment: () => void;
  onConfirmManualPayment: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentStatus,
  order,
  onRetryPayment,
  onConfirmManualPayment
}) => {
  const [showQR, setShowQR] = useState(false);
  const [manualPaymentConfirmed, setManualPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (paymentStatus.status === 'failed' || paymentStatus.status === 'canceled') {
      setShowQR(true);
    }
  }, [paymentStatus.status]);

  const handleDownloadInvoice = () => {
    if (order) {
      invoiceService.generateInvoice(order);
    }
  };

  const handleManualPaymentConfirm = () => {
    setManualPaymentConfirmed(true);
    onConfirmManualPayment();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {paymentStatus.status === 'processing' && 'Processing Payment'}
              {paymentStatus.status === 'success' && 'Payment Successful'}
              {(paymentStatus.status === 'failed' || paymentStatus.status === 'canceled') && 'Payment Failed'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Processing State */}
            {paymentStatus.status === 'processing' && (
              <div className="text-center">
                <Loader className="h-16 w-16 text-orange-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Processing Your Payment
                </h3>
                <p className="text-gray-600">
                  Please wait while we process your payment securely...
                </p>
              </div>
            )}

            {/* Success State */}
            {paymentStatus.status === 'success' && order && (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Successful!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your order has been confirmed and will be processed shortly.
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-green-700">Payment ID: {paymentStatus.paymentId}</p>
                    <p className="text-green-700">Amount: ₹{order.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleDownloadInvoice}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Invoice</span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}

            {/* Failed/Canceled State */}
            {(paymentStatus.status === 'failed' || paymentStatus.status === 'canceled') && (
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {paymentStatus.status === 'canceled' ? 'Payment Canceled' : 'Payment Failed'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {paymentStatus.status === 'canceled' 
                    ? 'You canceled the payment process.'
                    : paymentStatus.error || 'There was an issue processing your payment.'
                  }
                </p>

                {/* QR Code for Manual Payment */}
                {showQR && paymentStatus.qrData && (
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Pay with UPI</h4>
                      </div>
                      <p className="text-sm text-blue-700 mb-3">
                        Scan this QR code with any UPI app to complete your payment
                      </p>
                      
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-blue-300">
                        <QRCode
                          value={paymentStatus.qrData}
                          size={200}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        />
                      </div>
                      
                      <div className="mt-3 text-xs text-blue-600">
                        <p>UPI ID: {import.meta.env.VITE_MERCHANT_UPI_ID}</p>
                        <p>Merchant: DesiBazaar</p>
                        {order && <p>Amount: ₹{order.total.toFixed(2)}</p>}
                      </div>
                    </div>

                    {!manualPaymentConfirmed ? (
                      <button
                        onClick={handleManualPaymentConfirm}
                        className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors mb-3"
                      >
                        I've Completed the Payment
                      </button>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Payment confirmation received. We'll verify and process your order shortly.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={onRetryPayment}
                    className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Retry Payment</span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentModal;