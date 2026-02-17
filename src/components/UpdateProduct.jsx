import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UpdateProduct = ({ showUpdateModal, setShowUpdateModal, formData, setFormData, handleSubmitUpdate }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (showUpdateModal) {
      loadCategories();
    }
  }, [showUpdateModal]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  if (!showUpdateModal) return null;

  const variantDisplay = formData.variant || 'Standard';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Update Product - ID: {formData.productId}</h2>
            <p className="text-sm text-gray-600">Variant: {variantDisplay}</p>
          </div>
          <button
            onClick={() => setShowUpdateModal(false)}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmitUpdate}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Variant</label>
            <input
              type="text"
              value={formData.variant || 'Standard'}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">Variant cannot be changed after creation</p>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Category *</label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Available Stock *</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Buying Price (Rs.) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.buyingPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, buyingPrice: e.target.value }))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Selling Price (Rs.) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowUpdateModal(false)}
              className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Update Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProduct;