import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const gst = subtotal * 0.18; // 18% GST
  const total = subtotal + gst;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Shopping Cart</h2>
              <span className="bg-orange-500 text-white text-sm rounded-full px-2 py-1">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingBag className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm">Add some products to get started</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {item.product.name}
                        </h3>
                        {item.product.brand && (
                          <p className="text-xs text-gray-500 uppercase">
                            {item.product.brand}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-orange-600">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded-full bg-white border border-gray-200 hover:bg-gray-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 rounded-full bg-white border border-gray-200 hover:bg-gray-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Item total */}
                    <div className="mt-2 text-right">
                      <span className="text-sm font-semibold">
                        Total: {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with totals and checkout */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%)</span>
                  <span>{formatPrice(gst)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span className="text-orange-600">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onCheckout();
                  onClose();
                }}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                Proceed to Checkout
              </button>

              <p className="text-xs text-gray-500 text-center">
                Secure checkout with 256-bit SSL encryption
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;