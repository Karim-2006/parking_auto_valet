import React, { useState } from 'react';
import { Heart, ShoppingCart, Star, Tag } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  isInWishlist: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onToggleWishlist, 
  isInWishlist 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Discount badge */}
        {product.discount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-bold flex items-center">
            <Tag className="h-3 w-3 mr-1" />
            {product.discount}% OFF
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isInWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          />
        </button>

        {/* Quick add to cart overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center space-x-2"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>

      {/* Product info */}
      <div className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center space-x-1 mb-2">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-gray-700 ml-1">
              {product.rating}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            ({product.reviews.toLocaleString()} reviews)
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Category badge */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.category === 'groceries' 
              ? 'bg-green-100 text-green-700'
              : product.category === 'electronics'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </span>

          {/* Stock status */}
          <span className={`text-xs font-medium ${
            product.inStock ? 'text-green-600' : 'text-red-600'
          }`}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        {/* Add to cart button */}
        <button
          onClick={() => onAddToCart(product)}
          disabled={!product.inStock}
          className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            product.inStock
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;