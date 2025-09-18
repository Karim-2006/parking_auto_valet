export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: 'groceries' | 'electronics' | 'fashion';
  rating: number;
  reviews: number;
  description: string;
  inStock: boolean;
  discount?: number;
  brand?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  gst: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentId?: string;
  address: Address;
  createdAt: string;
}

export interface Address {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  paymentData?: any;
  error?: string;
  errorCode?: string;
}

export interface PaymentStatus {
  status: 'processing' | 'success' | 'failed' | 'canceled';
  orderId?: string;
  paymentId?: string;
  error?: string;
  qrData?: string;
}