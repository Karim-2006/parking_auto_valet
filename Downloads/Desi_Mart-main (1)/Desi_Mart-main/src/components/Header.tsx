import React, { useState } from 'react';
import { ShoppingCart, Search, User, Heart, Menu, X, LogOut } from 'lucide-react';
import { CartItem, User as UserType } from '../types';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  cartItems: CartItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCartClick: () => void;
  wishlistCount: number;
  user: UserType | null;
  onAuthClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  cartItems, 
  searchQuery, 
  onSearchChange, 
  onCartClick,
  wishlistCount,
  user,
  onAuthClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuth();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAuthAction = () => {
    if (user) {
      logout();
    } else {
      onAuthClick();
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gradient-to-r from-orange-500 via-white to-green-600 p-2 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-green-600 bg-clip-text text-transparent">
                DesiBazaar
              </h1>
              <p className="text-xs text-gray-500">भारत का बाज़ार</p>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleAuthAction}
                className="flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-colors"
              >
                {user ? <LogOut className="h-5 w-5" /> : <User className="h-5 w-5" />}
                <span className="hidden lg:inline text-sm">
                  {user ? user.name : 'Login'}
                </span>
              </button>
              
              <button className="relative flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-colors">
                <Heart className="h-5 w-5" />
                <span className="hidden lg:inline text-sm">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button 
                onClick={onCartClick}
                className="relative flex items-center space-x-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-medium">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            {/* Mobile search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Mobile navigation */}
            <div className="flex items-center justify-between mt-4">
              <button 
                onClick={handleAuthAction}
                className="flex items-center space-x-2 text-gray-600"
              >
                {user ? <LogOut className="h-5 w-5" /> : <User className="h-5 w-5" />}
                <span>{user ? user.name : 'Login'}</span>
              </button>
              
              <button className="relative flex items-center space-x-2 text-gray-600">
                <Heart className="h-5 w-5" />
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button 
                onClick={onCartClick}
                className="relative flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Cart ({cartCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* Categories bar */}
        <div className="hidden md:flex items-center space-x-8 mt-4 pt-4 border-t border-gray-100">
          <button className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
            All Categories
          </button>
          <button className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
            Groceries
          </button>
          <button className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
            Electronics
          </button>
          <button className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
            Fashion
          </button>
          <button className="text-gray-600 hover:text-orange-600 font-medium transition-colors">
            Home & Garden
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;