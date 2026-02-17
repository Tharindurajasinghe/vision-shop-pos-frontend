import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * API Service Class - OOP Implementation
 * Handles all HTTP requests to the backend
 */
class APIService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  setupInterceptors() {
    // Add token to every request
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle 401/403 errors (token expired)
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('jagathStoreLoggedIn');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== AUTH ====================
  login(credentials) {
    return this.axiosInstance.post(`${API_URL}/auth/login`, credentials);
  }

  verifyPassword(data) {
    return this.axiosInstance.post(`${API_URL}/auth/verify-password`, data);
  }

  // ==================== PRODUCTS ====================
  
  /**
   * Get all products (with optional category filter)
   */
  getProducts(categoryId = null) {
    const url = categoryId 
      ? `${API_URL}/products?categoryId=${categoryId}` 
      : `${API_URL}/products`;
    return this.axiosInstance.get(url);
  }

  /**
   * Get product by ID (returns single product or all variants)
   */
  getProduct(id) {
    return this.axiosInstance.get(`${API_URL}/products/${id}`);
  }

  /**
   * Get specific variant of a product
   * @param {string} id - Product ID
   * @param {string} variant - Variant name (e.g., 'Small', 'Large')
   */
  getProductVariant(id, variant) {
    return this.axiosInstance.get(`${API_URL}/products/${id}?variant=${variant}`);
  }

  /**
   * Get all variants of a product
   */
  getProductVariants(id) {
    return this.axiosInstance.get(`${API_URL}/products/${id}/variants`);
  }

  /**
   * Search products by name
   */
  searchProducts(query) {
    return this.axiosInstance.get(`${API_URL}/products/search?query=${query}`);
  }

  /**
   * Get next available product ID
   */
  getNextProductId() {
    return this.axiosInstance.get(`${API_URL}/products/next-id`);
  }

  /**
   * Add new product (with optional variant)
   * @param {Object} product - Product data with optional variant field
   */
  addProduct(product) {
    return this.axiosInstance.post(`${API_URL}/products`, product);
  }

  /**
   * Update product (with optional variant)
   * @param {string} id - Product ID
   * @param {Object} product - Updated product data
   * @param {string} variant - Variant name (optional, defaults to 'Standard')
   */
  updateProduct(id, product, variant = null) {
    const url = variant 
      ? `${API_URL}/products/${id}?variant=${variant}` 
      : `${API_URL}/products/${id}`;
    return this.axiosInstance.put(url, product);
  }

  /**
   * Delete product variant
   * @param {string} id - Product ID
   * @param {string} variant - Variant name (optional, defaults to 'Standard')
   */
  deleteProduct(id, variant = null) {
    const url = variant 
      ? `${API_URL}/products/${id}?variant=${variant}` 
      : `${API_URL}/products/${id}`;
    return this.axiosInstance.delete(url);
  }

  // ==================== BILLS ====================
  
  /**
   * Create new bill (with variant and optional price editing)
   * @param {Object} billData - Bill data including items with variant and optional price
   */
  createBill(billData) {
    return this.axiosInstance.post(`${API_URL}/bills`, billData);
  }

  getTodayBills() {
    return this.axiosInstance.get(`${API_URL}/bills/today`);
  }

  getBillsByDate(date) {
    return this.axiosInstance.get(`${API_URL}/bills/date/${date}`);
  }

  getBill(billId) {
    return this.axiosInstance.get(`${API_URL}/bills/${billId}`);
  }

  getPast30DaysBills() {
    return this.axiosInstance.get(`${API_URL}/bills/history/past30days`);
  }

  deleteBill(billId) {
    return this.axiosInstance.delete(`${API_URL}/bills/${billId}`);
  }

  // ==================== DAY ====================
  
  getCurrentDaySummary() {
    return this.axiosInstance.get(`${API_URL}/day/current`);
  }

  endDay() {
    return this.axiosInstance.post(`${API_URL}/day/end`);
  }

  // ==================== SUMMARY ====================
  
  getDailySummary(date) {
    return this.axiosInstance.get(`${API_URL}/summary/daily/${date}`);
  }

  createMonthlySummary() {
    return this.axiosInstance.post(`${API_URL}/summary/monthly/create`);
  }

  getMonthlySummary(month) {
    return this.axiosInstance.get(`${API_URL}/summary/monthly/${month}`);
  }

  getAllMonthlySummaries() {
    return this.axiosInstance.get(`${API_URL}/summary/monthly`);
  }

  getAvailableDates() {
    return this.axiosInstance.get(`${API_URL}/summary/available-dates`);
  }

  // ==================== CATEGORIES ====================
  
  getCategories() {
    return this.axiosInstance.get('/categories');
  }

  getCategory(id) {
    return this.axiosInstance.get(`/categories/${id}`);
  }

  addCategory(category) {
    return this.axiosInstance.post('/categories', category);
  }

  updateCategory(id, category) {
    return this.axiosInstance.put(`/categories/${id}`, category);
  }

  deleteCategory(id) {
    return this.axiosInstance.delete(`/categories/${id}`);
  }

  getCategoryProducts(id) {
    return this.axiosInstance.get(`/categories/${id}/products`);
  }
}

// Export singleton instance
const apiService = new APIService();
export default apiService;