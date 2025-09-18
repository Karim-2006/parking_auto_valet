import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import ProductsPage from './components/ProductsPage';
import CartDrawer from './components/CartDrawer';
import CheckoutForm from './components/CheckoutForm';
import OrderConfirmation from './components/OrderConfirmation';
import AuthModal from './components/AuthModal';
import PaymentModal from './components/PaymentModal';
import { Product, CartItem, Order, Address } from './types';
import { PaymentStatus } from './types';
import { useAuth } from './hooks/useAuth';
import { paymentService } from './services/paymentService';

type AppPage = 'products' | 'checkout' | 'order-confirmation';

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('products');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'processing' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  
  const { user } = useAuth();

  // Load cart and wishlist from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('desibazaar_cart');
    const savedWishlist = localStorage.getItem('desibazaar_wishlist');
    
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist));
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('desibazaar_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('desibazaar_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
    toast.success('Item removed from cart');
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const isInWishlist = prev.includes(productId);
      if (isInWishlist) {
        toast.success('Removed from wishlist');
        return prev.filter(id => id !== productId);
      } else {
        toast.success('Added to wishlist');
        return [...prev, productId];
      }
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    // Check if user is logged in
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setCurrentPage('checkout');
  };

  const handlePlaceOrder = async (address: Address, paymentMethod: string) => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    if (paymentMethod === 'googlepay') {
      // Google Pay payment is handled in CheckoutForm
      setPaymentStatus({ status: 'processing' });
      setIsPaymentModalOpen(true);
      
      try {
        const result = await paymentService.processPayment(cartItems, address, total);
        
        if (result.success) {
          const order = await createOrder(address, paymentMethod, result.paymentId!, total, subtotal, gst);
          setPaymentStatus({ 
            status: 'success', 
            orderId: order.id,
            paymentId: result.paymentId 
          });
          setCurrentOrder(order);
          setCartItems([]);
        } else {
          const qrData = paymentService.generateUpiQrData(total, Date.now().toString());
          setPaymentStatus({ 
            status: result.errorCode === 'USER_CANCELED' ? 'canceled' : 'failed',
            error: result.error,
            qrData 
          });
        }
      } catch (error: any) {
        const qrData = paymentService.generateUpiQrData(total, Date.now().toString());
        setPaymentStatus({ 
          status: 'failed',
          error: error.message,
          qrData 
        });
      }
    } else {
      // Handle other payment methods (UPI, COD)
      toast.loading('Processing your order...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const order = await createOrder(address, paymentMethod, `PAY_${Date.now()}`, total, subtotal, gst);
      
      toast.dismiss();
      toast.success('Order placed successfully!');
      
      setCurrentOrder(order);
      setCartItems([]);
      setCurrentPage('order-confirmation');
      
      // Simulate notifications
      setTimeout(() => toast.success('📧 Confirmation email sent!'), 1000);
      setTimeout(() => toast.success('📱 WhatsApp notification sent!'), 2000);
    }
  };

  const createOrder = async (
    address: Address, 
    paymentMethod: string, 
    paymentId: string, 
    total: number, 
    subtotal: number, 
    gst: number
  ): Promise<Order> => {
    const order: Order = {
      id: Date.now().toString(),
      userId: user?.id || 'guest',
      items: cartItems,
      total,
      subtotal,
      gst,
      status: 'confirmed',
      paymentMethod,
      paymentId,
      address,
      createdAt: new Date().toISOString()
    };

    // Save order to localStorage (in production, this would be sent to backend)
    const savedOrders = JSON.parse(localStorage.getItem('desibazaar_orders') || '[]');
    savedOrders.push(order);
    localStorage.setItem('desibazaar_orders', JSON.stringify(savedOrders));

    return order;
  };

  const handleContinueShopping = () => {
    setCurrentPage('products');
    setCurrentOrder(null);
  };

  const handleBackToCart = () => {
    setCurrentPage('products');
    setIsCartOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    // After successful login, proceed to checkout if cart has items
    if (cartItems.length > 0) {
      setCurrentPage('checkout');
    }
  };

  const handleRetryPayment = () => {
    setIsPaymentModalOpen(false);
    // Reset payment status and allow user to try again
    setPaymentStatus({ status: 'processing' });
  };

  const handleConfirmManualPayment = async () => {
    // In production, this would notify the backend about manual payment
    toast.success('Payment confirmation received. We will verify and process your order.');
    
    // Create order with pending status
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    
    const order = await createOrder(
      cartItems[0] ? { 
        name: 'Manual Payment User', 
        phone: '+91 98765 43210',
        addressLine1: 'Address Line 1',
        city: 'City',
        state: 'State',
        pincode: '123456'
      } : {} as Address,
      'manual_upi',
      `MANUAL_${Date.now()}`,
      total,
      subtotal,
      gst
    );
    
    setCurrentOrder(order);
    setCartItems([]);
    setIsPaymentModalOpen(false);
    setCurrentPage('order-confirmation');
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    if (paymentStatus.status === 'success') {
      setCurrentPage('order-confirmation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {currentPage !== 'order-confirmation' && (
        <Header
          cartItems={cartItems}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCartClick={() => setIsCartOpen(true)}
          wishlistCount={wishlist.length}
          user={user}
          onAuthClick={() => setIsAuthModalOpen(true)}
        />
      )}

      {currentPage === 'products' && (
        <ProductsPage
          searchQuery={searchQuery}
          cartItems={cartItems}
          wishlist={wishlist}
          onAddToCart={addToCart}
          onToggleWishlist={toggleWishlist}
        />
      )}

      {currentPage === 'checkout' && (
        <CheckoutForm
          cartItems={cartItems}
          onPlaceOrder={handlePlaceOrder}
          onBack={handleBackToCart}
          onPaymentProcessing={setIsPaymentProcessing}
        />
      )}

      {currentPage === 'order-confirmation' && currentOrder && (
        <OrderConfirmation
          order={currentOrder}
          onContinueShopping={handleContinueShopping}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        paymentStatus={paymentStatus}
        order={currentOrder}
        onRetryPayment={handleRetryPayment}
        onConfirmManualPayment={handleConfirmManualPayment}
      />
    </div>
  );
}

export default App;