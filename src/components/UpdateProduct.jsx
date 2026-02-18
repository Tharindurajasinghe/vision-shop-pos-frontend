import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * UpdateProduct Component
 *
 * Loads ALL variants for a given productId, displays them in an editable
 * table identical in style to AddProduct. User can:
 *  - Edit product name and category (shared across all variants)
 *  - Edit stock / buying price / selling price per variant
 *  - Edit variant name (existing variant will be deleted + recreated with new name)
 *  - Add a brand-new variant row
 *  - Remove an existing variant (calls DELETE on the API)
 *
 * Props:
 *  showUpdateModal   : boolean
 *  setShowUpdateModal: fn
 *  productId         : string  — the product ID to update
 *  onProductUpdated  : fn      — called after successful save so parent reloads
 */
const UpdateProduct = ({ showUpdateModal, setShowUpdateModal, productId, onProductUpdated }) => {
  const [categories, setCategories]   = useState([]);
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId]   = useState('');

  /**
   * Each row shape:
   * {
   *   originalVariant : string | null  — original DB name (null = brand new row)
   *   variant         : string         — current (possibly edited) name
   *   stock           : string
   *   buyingPrice     : string
   *   sellingPrice    : string
   * }
   * Tracking originalVariant lets us DELETE the old name and ADD the new one
   * when the user renames an existing variant.
   */
  const [variantRows, setVariantRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Load data when modal opens ────────────────────────────────────────────
  useEffect(() => {
    if (showUpdateModal && productId) {
      loadCategories();
      loadProductVariants();
    }
  }, [showUpdateModal, productId]);

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadProductVariants = async () => {
    try {
      const res = await api.getProductVariants(productId);
      const variants = Array.isArray(res.data) ? res.data : [res.data];
      if (variants.length === 0) return;

      setProductName(variants[0].name);
      setCategoryId(variants[0].categoryId);

      setVariantRows(variants.map(v => ({
        originalVariant: v.variant || 'Standard',
        variant        : v.variant || 'Standard',
        stock          : String(v.stock),
        buyingPrice    : String(v.buyingPrice),
        sellingPrice   : String(v.sellingPrice),
      })));
    } catch (err) {
      alert('Error loading product data');
      console.error(err);
    }
  };

  // ── Variant row helpers ───────────────────────────────────────────────────

  const addVariantRow = () => {
    setVariantRows(prev => [
      ...prev,
      { originalVariant: null, variant: '', stock: '', buyingPrice: '', sellingPrice: '' }
    ]);
  };

  const removeVariantRow = async (index) => {
    if (variantRows.length === 1) {
      alert('A product must have at least one variant.');
      return;
    }

    const row = variantRows[index];
    const isExisting = row.originalVariant !== null;

    if (isExisting) {
      const confirmed = window.confirm(
        `Delete variant "${row.originalVariant}" from the database?\nThis cannot be undone.`
      );
      if (!confirmed) return;

      try {
        await api.deleteProduct(productId, row.originalVariant);
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting variant');
        return;
      }
    }

    setVariantRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariantRow = (index, field, value) => {
    setVariantRows(prev =>
      prev.map((row, i) => i === index ? { ...row, [field]: value } : row)
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productName.trim()) { alert('Please enter a product name'); return; }
    if (!categoryId)          { alert('Please select a category');   return; }

    for (let i = 0; i < variantRows.length; i++) {
      const row = variantRows[i];
      if (!row.variant.trim() && row.originalVariant === null) {
        // New row with empty name → treat as 'Standard', ok
      }
      if (!row.stock || !row.buyingPrice || !row.sellingPrice) {
        alert(`Please fill all fields in variant row ${i + 1}`);
        return;
      }
      if (parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)) {
        alert(`Row ${i + 1}: Selling price cannot be less than buying price`);
        return;
      }
    }

    // Check for duplicate final variant names
    const finalNames = variantRows.map(r => r.variant.trim() || 'Standard');
    if (new Set(finalNames).size !== finalNames.length) {
      alert('Duplicate variant names found. Each variant must have a unique name.');
      return;
    }

    setLoading(true);
    try {
      for (const row of variantRows) {
        const newName  = row.variant.trim() || 'Standard';
        const origName = row.originalVariant;

        const payload = {
          name        : productName.trim(),
          categoryId,
          stock       : parseInt(row.stock),
          buyingPrice : parseFloat(row.buyingPrice),
          sellingPrice: parseFloat(row.sellingPrice),
        };

        if (origName === null) {
          // Brand new variant row — just add it
          await api.addProduct({
            productId,
            variant: newName === 'Standard' ? undefined : newName,
            ...payload,
          });
        } else if (origName !== newName) {
          // Variant was RENAMED → delete old, add new
          await api.deleteProduct(productId, origName);
          await api.addProduct({
            productId,
            variant: newName === 'Standard' ? undefined : newName,
            ...payload,
          });
        } else {
          // Name unchanged → normal update
          await api.updateProduct(productId, payload, origName);
        }
      }

      alert('Product updated successfully!');
      setShowUpdateModal(false);
      if (onProductUpdated) onProductUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating product');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!showUpdateModal) return null;

  const hasPriceError = variantRows.some(r =>
    r.buyingPrice && r.sellingPrice &&
    parseFloat(r.sellingPrice) < parseFloat(r.buyingPrice)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Update Product</h2>
          <button
            type="button"
            onClick={() => setShowUpdateModal(false)}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          {/* Product ID — read only */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">Product ID</label>
            <input
              type="text"
              value={productId}
              readOnly
              className="w-32 px-3 py-2 border rounded bg-gray-100 text-gray-600 text-center font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
          </div>

          {/* Product Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-1">Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Boys Shoes"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Variants Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="text-gray-700 font-medium">Variants</label>
                <p className="text-xs text-gray-500">Leave variant name empty for Standard</p>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold"
              >
                <span className="text-base font-bold">+</span> Add Variant
              </button>
            </div>

            {/* Column Headers */}
            <div
              className="grid gap-2 mb-1 px-2"
              style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 32px' }}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant Name</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Buying (Rs.)</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling (Rs.)</span>
              <span></span>
            </div>

            {/* Variant Rows */}
            <div className="space-y-2">
              {variantRows.map((row, index) => {
                const isExisting = row.originalVariant !== null;
                const isRenamed  = isExisting && row.variant.trim() !== row.originalVariant;

                return (
                  <div
                    key={index}
                    className={`grid gap-2 items-center px-2 py-2 rounded border ${
                      !isExisting
                        ? 'bg-green-50 border-green-200'   // new row
                        : isRenamed
                          ? 'bg-yellow-50 border-yellow-300' // existing but renamed
                          : 'bg-blue-50 border-blue-200'    // existing unchanged
                    }`}
                    style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 32px' }}
                  >
                    {/* Variant name — fully editable */}
                    <div className="relative">
                      <input
                        type="text"
                        value={row.variant}
                        onChange={(e) => updateVariantRow(index, 'variant', e.target.value)}
                        placeholder={index === 0 ? 'Small / or leave empty' : 'Large / XL...'}
                        className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 w-full bg-white ${
                          isRenamed
                            ? 'border-yellow-400 focus:ring-yellow-400'
                            : 'focus:ring-blue-400'
                        }`}
                      />
                      {/* Badge */}
                      {isExisting && !isRenamed && (
                        <span className="absolute -top-1.5 right-1 text-[9px] bg-blue-200 text-blue-800 px-1 rounded">
                          existing
                        </span>
                      )}
                      {isRenamed && (
                        <span className="absolute -top-1.5 right-1 text-[9px] bg-yellow-300 text-yellow-900 px-1 rounded">
                          renamed
                        </span>
                      )}
                      {!isExisting && (
                        <span className="absolute -top-1.5 right-1 text-[9px] bg-green-200 text-green-800 px-1 rounded">
                          new
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      value={row.stock}
                      onChange={(e) => updateVariantRow(index, 'stock', e.target.value)}
                      placeholder="0"
                      min="0"
                      required
                      className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={row.buyingPrice}
                      onChange={(e) => updateVariantRow(index, 'buyingPrice', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      required
                      className="px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={row.sellingPrice}
                      onChange={(e) => updateVariantRow(index, 'sellingPrice', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      required
                      className={`px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 bg-white w-full ${
                        row.buyingPrice && row.sellingPrice &&
                        parseFloat(row.sellingPrice) < parseFloat(row.buyingPrice)
                          ? 'border-red-400 focus:ring-red-400'
                          : 'focus:ring-blue-400'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => removeVariantRow(index)}
                      disabled={variantRows.length === 1}
                      className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold flex-shrink-0 ${
                        variantRows.length === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:bg-red-100 hover:text-red-700 cursor-pointer'
                      }`}
                      title={isExisting ? 'Delete this variant from database' : 'Remove this row'}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {hasPriceError && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                ⚠ Selling price cannot be less than buying price
              </p>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-blue-200 border border-blue-300"></span>
                Existing variant
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></span>
                Renamed (old will be replaced)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-300"></span>
                New variant
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t mt-2">
            <button
              type="button"
              onClick={() => setShowUpdateModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || hasPriceError}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {loading
                ? 'Saving...'
                : `Update Product (${variantRows.length} Variant${variantRows.length > 1 ? 's' : ''})`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProduct;
