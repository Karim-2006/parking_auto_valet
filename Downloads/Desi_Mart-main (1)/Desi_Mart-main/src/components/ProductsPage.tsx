import React, { useState, useMemo } from 'react';
import { Filter, SortAsc, Grid, List, Star } from 'lucide-react';
import { Product, CartItem } from '../types';
import ProductCard from './ProductCard';
import { mockProducts } from '../data/products';

interface ProductsPageProps {
  searchQuery: string;
  cartItems: CartItem[];
  wishlist: string[];
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ 
  searchQuery, 
  cartItems, 
  wishlist, 
  onAddToCart, 
  onToggleWishlist 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 50000 });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = mockProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;
      
      return matchesSearch && matchesCategory && matchesPrice;
    });

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'discount':
        filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, priceRange]);

  const categories = [
    { id: 'all', name: 'All Categories', count: mockProducts.length },
    { id: 'groceries', name: 'Groceries', count: mockProducts.filter(p => p.category === 'groceries').length },
    { id: 'electronics', name: 'Electronics', count: mockProducts.filter(p => p.category === 'electronics').length },
    { id: 'fashion', name: 'Fashion', count: mockProducts.filter(p => p.category === 'fashion').length },
  ];

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowFilters(false); // Close mobile filters
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-green-500 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to DesiBazaar
          </h1>
          <p className="text-xl md:text-2xl font-light">
            भारत का बाज़ार - Your one-stop shop for everything Indian
          </p>
          <div className="flex items-center justify-center space-x-4 mt-6">
            <div className="flex items-center space-x-1">
              <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              <span className="font-medium">4.7 Rating</span>
            </div>
            <div className="h-4 w-px bg-white opacity-50"></div>
            <span className="font-medium">10L+ Happy Customers</span>
            <div className="h-4 w-px bg-white opacity-50"></div>
            <span className="font-medium">Same Day Delivery</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h3 className="font-semibold">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{category.name}</span>
                        <span className="text-xs opacity-75">({category.count})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="₹50,000"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPriceRange({ min: 0, max: 50000 });
                  setSortBy('relevance');
                }}
                className="w-full text-center py-2 text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowFilters(true)}
                    className="lg:hidden flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                  </button>
                  
                  <span className="text-gray-600">
                    {filteredAndSortedProducts.length} products
                    {searchQuery && ` for "${searchQuery}"`}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Sort dropdown */}
                  <div className="flex items-center space-x-2">
                    <SortAsc className="h-4 w-4 text-gray-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Customer Rating</option>
                      <option value="discount">Discount</option>
                    </select>
                  </div>

                  {/* View mode toggle */}
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500'} rounded-l-lg`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-500'} rounded-r-lg`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredAndSortedProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Filter className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {filteredAndSortedProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    isInWishlist={wishlist.includes(product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;