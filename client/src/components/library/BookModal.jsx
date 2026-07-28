import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { BookOpen, Save, AlertCircle } from 'lucide-react';

export const BookModal = ({ isOpen, onClose, bookData = null, onSubmit }) => {
  const [formData, setFormData] = useState({
    book_id: '',
    title: '',
    author: '',
    publisher: '',
    category: 'Core IT',
    edition: '1st Edition',
    isbn: '',
    shelf_number: 'Shelf-A1',
    total_copies: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (bookData) {
      setFormData({
        book_id: bookData.book_id || '',
        title: bookData.title || '',
        author: bookData.author || '',
        publisher: bookData.publisher || '',
        category: bookData.category || 'Core IT',
        edition: bookData.edition || '1st Edition',
        isbn: bookData.isbn || '',
        shelf_number: bookData.shelf_number || 'Shelf-A1',
        total_copies: bookData.total_copies || 1,
      });
    } else {
      setFormData({
        book_id: `BK-IT-${Math.floor(100 + Math.random() * 900)}`,
        title: '',
        author: '',
        publisher: 'Pearson Education',
        category: 'Core IT',
        edition: '1st Edition',
        isbn: `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        shelf_number: 'Shelf-A1',
        total_copies: 1,
      });
    }
  }, [bookData, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.book_id || !formData.title || !formData.author || !formData.isbn) {
      setErrorMsg('Book ID, Title, Author, and ISBN are mandatory fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving book details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={bookData ? 'Edit Book Details' : 'Add New Book to Inventory'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Book ID *</label>
            <input
              type="text"
              name="book_id"
              value={formData.book_id}
              onChange={handleChange}
              disabled={!!bookData}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN Number *</label>
            <input
              type="text"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Operating System Concepts"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Author(s) *</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="e.g. Silberschatz, Galvin"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher</label>
            <input
              type="text"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              placeholder="e.g. Wiley / Pearson"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            >
              <option value="Core IT">Core IT</option>
              <option value="Data Structures">Data Structures</option>
              <option value="Database Systems">Database Systems</option>
              <option value="Networks">Networks</option>
              <option value="AI & ML">AI & ML</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="Cyber Security">Cyber Security</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
            <input
              type="text"
              name="shelf_number"
              value={formData.shelf_number}
              onChange={handleChange}
              placeholder="e.g. Shelf-C3"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Copies</label>
            <input
              type="number"
              name="total_copies"
              min="1"
              value={formData.total_copies}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{submitting ? 'Saving...' : 'Save Book Record'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BookModal;
