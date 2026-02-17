import React, { useState, useEffect, useRef } from 'react';
import { getBillHTML } from '../components/BillView';
import api from '../services/api';
import { Product, ShoppingCart } from '../utils/ProductClasses';
import UptoNowBox from './UptoNowBox';
import LowStockAlert from './LowStockAlert';
import LoadingOverlay from '../components/LoadingOverlay';

const SellingScreen = ({ onEndDay }) => {
  const [cart, setCart] = useState(new ShoppingCart());
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [todayBills, setTodayBills] = useState([]);
  const [showBills, setShowBills] = useState(false);
  const [currentSales, setCurrentSales] = useState({ total: 0, profit: 0 });
  const [cash, setCash] = useState('');
  const [change, setChange] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const cashInputRef = useRef(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [productIndex, setProductIndex] = useState({});

  useEffect(() => {
    loadCurrentDaySummary();
  }, []);

  // Load all products once
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.getProducts();
        const index = {};
        res.data.forEach(p => {
          const product = new Product(p);
          const key = product.getUniqueKey();
          index[key] = product;
        });
        setProductIndex(index);
      } catch {
        alert('Products failed to load');
      }
    };
    loadProducts();
  }, []);

  // Global keydown: Ctrl to print/save, Right Shift to focus cash
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !cart.isEmpty()) {
        e.preventDefault();
        handlePrintSave();
      }
      // Right Shift focuses Cash input
      if (e.code === 'ShiftRight') {
        e.preventDefault();
        cashInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart]);

  useEffect(() => {
    if (selectedSuggestionIndex >= 0) {
      const element = document.querySelector(`[data-suggestion-index="${selectedSuggestionIndex}"]`);
      element?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedSuggestionIndex]);

  // Live calculate change whenever cash or cart changes
  useEffect(() => {
    const cashNum = parseFloat(cash) || 0;
    const total = cart.getTotal();
    setChange(cashNum >= total ? cashNum - total : 0);
  }, [cash, cart]);

  const addByProductIdLocal = (value) => {
    const id = value.padStart(3, '0');
    // Find product with this ID (any variant)
    const products = Object.values(productIndex).filter(p => p.productId === id);
    
    if (products.length === 0) {
      alert('Product ID not found');
      return;
    }
    
    // If only one variant, add it directly
    if (products.length === 1) {
      addToCart(products[0]);
    } else {
      // Multiple variants - show them as suggestions
      setSuggestions(products);
    }
  };

  const loadCurrentDaySummary = async () => {
    try {
      const response = await api.getCurrentDaySummary();
      setCurrentSales({ total: response.data.totalSales, profit: response.data.totalProfit });
    } catch (error) {
      console.error('Error loading day summary:', error);
    }
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (/^\d{1,3}$/.test(value)) {
          const response = await api.getProduct(value.padStart(3, '0'));
          const data = Array.isArray(response.data) ? response.data : [response.data];
          setSuggestions(data.map(p => new Product(p)));
          return;
        }
        const response = await api.searchProducts(value);
        setSuggestions(response.data.map(p => new Product(p)));
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const addToCart = (product, quantity = 1) => {
    try {
      const newCart = new ShoppingCart();
      // Copy existing items
      cart.getItems().forEach(item => {
        const key = item.getUniqueKey();
        newCart.items.set(key, item);
      });
      
      // Add new product
      newCart.addProduct(product, quantity);
      
      setCart(newCart);
      setSearchQuery('');
      setSuggestions([]);
      
      setTimeout(() => {
        const qtyInput = document.getElementById(`qty-${product.getUniqueKey()}`);
        qtyInput?.focus();
        qtyInput?.select();
      }, 100);
    } catch (error) {
      alert(error.message);
    }
  };

  const updateQuantity = (uniqueKey, quantity) => {
    try {
      const newCart = new ShoppingCart();
      cart.getItems().forEach(item => {
        const key = item.getUniqueKey();
        newCart.items.set(key, item);
      });
      
      newCart.updateQuantity(uniqueKey, quantity);
      setCart(newCart);
    } catch (error) {
      alert(error.message);
    }
  };

  const updatePrice = (uniqueKey, price) => {
    try {
      const newCart = new ShoppingCart();
      cart.getItems().forEach(item => {
        const key = item.getUniqueKey();
        newCart.items.set(key, item);
      });
      
      newCart.updatePrice(uniqueKey, price);
      setCart(newCart);
    } catch (error) {
      alert(error.message);
    }
  };

  const removeFromCart = (uniqueKey) => {
    const newCart = new ShoppingCart();
    cart.getItems().forEach(item => {
      const key = item.getUniqueKey();
      newCart.items.set(key, item);
    });
    
    newCart.removeItem(uniqueKey);
    setCart(newCart);
  };

  const printBill = (bill) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(getBillHTML(bill));
    printWindow.document.close();
  };

  const handlePrintSave = async () => {
    if (cart.isEmpty()) {
      alert('Cart is empty!');
      return;
    }
    const printConfirm = window.confirm('Do you want to print the bill?\n\nYes - Print and Save\nNo - Save Only');

    try {
      const billData = cart.toBillData(parseFloat(cash) || 0);
      const response = await api.createBill(billData);
      if (printConfirm) printBill(response.data);

      alert('Bill saved successfully!');
      setCart(new ShoppingCart());
      setCash('');
      setChange(0);
      loadCurrentDaySummary();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving bill');
    }
  };

  const handleCheckUpToNow = async () => {
    try {
      const response = await api.getTodayBills();
      setTodayBills(response.data);
      setShowBills(true);
    } catch {
      alert('Error loading bills');
    }
  };

  const handleEndDay = async () => {
    const confirm = window.confirm('Are you sure you want to end the day?\nThis will create a daily summary and close today\'s sales.');
    if (!confirm) return;
    setLoading(true);
    try {
      const response = await api.getCurrentDaySummary();
      onEndDay({
        date: response.data.date,
        items: response.data.items,
        totalIncome: response.data.totalSales,
        totalProfit: response.data.totalProfit,
        bills: response.data.bills
      });
    } catch (error) {
      setLoading(false);
      alert(error.response?.data?.message || 'Error ending day');
    }
  };

  const cartItems = cart.toDisplayArray();

  return (
    <div>
      {loading && <LoadingOverlay message="Creating day-end summary..." />}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Add Products</h2>

          <div className="mb-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by product ID or name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                  );
                  return;
                }

                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                  );
                  return;
                }

                // ENTER key — IMMEDIATE ADD
                if (e.key === 'Enter') {
                  e.preventDefault();

                  // stop pending debounce search
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }

                  // If product ID typed → add from local index
                  if (/^\d{1,3}$/.test(searchQuery)) {
                    addByProductIdLocal(searchQuery);
                    return;
                  }

                  // If suggestion selected → add it
                  if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                    addToCart(suggestions[selectedSuggestionIndex]);
                    return;
                  }

                  // Fallback → first suggestion
                  if (suggestions.length > 0) {
                    addToCart(suggestions[0]);
                  }
                }
              }}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((product, index) => (
                  <div
                    key={product.getUniqueKey()}
                    data-suggestion-index={index}
                    onClick={() => addToCart(product)}
                    className={`p-3 cursor-pointer border-b ${index === selectedSuggestionIndex ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{product.getDisplayName()}</p>
                        <p className="text-sm text-gray-600">
                          ID: {product.productId} | Stock: {product.stock}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">{product.formatPrice(product.sellingPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Up to Now Sell:</span>
              <span className="text-blue-600 font-bold">Rs. {currentSales.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCheckUpToNow} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Check Up to Now Sell
            </button>
            <button onClick={handleEndDay} className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700">
              End Sell Today
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Current Bill</h2>
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}</p>
          </div>

          {cart.isEmpty() ? (
            <div className="text-center py-12 text-gray-400">
              <p>No items in cart</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cartItems.map(item => (
                  <div key={item.uniqueKey} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          ID: {item.productId} | Variant: {item.variant}
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(item.uniqueKey)} className="text-red-600 hover:text-red-800">
                        ✕
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <input
                        id={`qty-${item.uniqueKey}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.uniqueKey, parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchInputRef.current?.focus();
                          }
                        }}
                        className="w-20 px-2 py-1 border rounded text-center"
                        min="1"
                      />
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Price (Rs.):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          if (newPrice > 0) {
                            updatePrice(item.uniqueKey, newPrice);
                          }
                        }}
                        className={`w-24 px-2 py-1 border rounded text-right ${item.priceEdited ? 'bg-yellow-50 border-yellow-400' : ''}`}
                        min={item.buyingPrice}
                        title={`Min: Rs.${item.buyingPrice} (Buying Price)`}
                      />
                    </div>

                    {item.priceEdited && (
                      <p className="text-xs text-yellow-600 mb-1">
                        Price edited (Original: Rs.{item.originalPrice.toFixed(2)})
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-green-600">Rs. {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cash & Change Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Cash:</p>
                  <input
                    ref={cashInputRef}
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const cashNum = parseFloat(cash) || 0;
                        const total = cart.getTotal();
                        const newChange = cashNum >= total ? cashNum - total : 0;
                        setChange(newChange);

                        if (!cart.isEmpty()) {
                          try {
                            const billData = cart.toBillData(cashNum);
                            const response = await api.createBill(billData);
                            alert('Bill saved successfully!');
                            setCart(new ShoppingCart());
                            setCash('');
                            setChange(0);
                            loadCurrentDaySummary();
                            setTimeout(() => {
                              searchInputRef.current?.focus();
                            }, 100);
                          } catch (err) {
                            alert(err.response?.data?.message || 'Error saving bill');
                          }
                        }
                      }
                    }}
                    className="w-32 px-2 py-1 border rounded text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-blue-600">Change:</p>
                  <p className="text-lg font-bold text-blue-600">Rs. {change.toFixed(2)}</p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-xl font-bold">Total</p>
                  <p className="text-2xl font-bold text-green-600">Rs. {cart.getTotal().toFixed(2)}</p>
                </div>

                <button
                  onClick={handlePrintSave}
                  className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 font-semibold"
                >
                  Print Bill / Save Bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* low stock alert */}
      <div className="mb-6">
        <LowStockAlert />
      </div>

      <UptoNowBox show={showBills} bills={todayBills} onClose={() => setShowBills(false)} />
    </div>
  );
};

export default SellingScreen;