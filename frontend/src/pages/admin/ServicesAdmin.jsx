import React, { useState, useEffect } from 'react';
import {
  Building2,
  Tag,
  PlusCircle,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { servicesAPI } from '../../services/api';
import Modal from '../../components/Modal';

export default function ServicesAdmin() {
  const [centres, setCentres] = useState([]);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [centreModalOpen, setCentreModalOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);
  const [centreForm, setCentreForm] = useState({
    name: '',
    type: 'Hospital',
    address: '',
    city: '',
    phone: '',
    opening_time: '09:00',
    closing_time: '18:00',
  });

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    avg_duration_minutes: 15,
    token_prefix: 'A',
  });

  const fetchCentres = async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getCentres();
      setCentres(res.data);
      if (res.data.length > 0) {
        if (!selectedCentre) {
          setSelectedCentre(res.data[0]);
        } else {
          const updated = res.data.find((c) => c.id === selectedCentre.id);
          setSelectedCentre(updated || res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching centres:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (centreId) => {
    if (!centreId) return;
    try {
      const res = await servicesAPI.getCategories({ centre_id: centreId });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    if (selectedCentre) {
      fetchCategories(selectedCentre.id);
    }
  }, [selectedCentre?.id]);

  // Centre CRUD
  const handleOpenCentreModal = (c = null) => {
    if (c) {
      setEditingCentre(c);
      setCentreForm({
        name: c.name,
        type: c.type,
        address: c.address,
        city: c.city,
        phone: c.phone || '',
        opening_time: c.opening_time || '09:00',
        closing_time: c.closing_time || '18:00',
      });
    } else {
      setEditingCentre(null);
      setCentreForm({
        name: '',
        type: 'Hospital',
        address: '',
        city: '',
        phone: '',
        opening_time: '09:00',
        closing_time: '18:00',
      });
    }
    setCentreModalOpen(true);
  };

  const handleSaveCentre = async (e) => {
    e.preventDefault();
    try {
      if (editingCentre) {
        await servicesAPI.updateCentre(editingCentre.id, centreForm);
      } else {
        await servicesAPI.createCentre(centreForm);
      }
      setCentreModalOpen(false);
      await fetchCentres();
    } catch (err) {
      alert('Failed to save service centre.');
    }
  };

  const handleDeleteCentre = async (id) => {
    if (!window.confirm('Delete this service centre? All related categories and queues will be removed.')) return;
    try {
      await servicesAPI.deleteCentre(id);
      setSelectedCentre(null);
      await fetchCentres();
    } catch (err) {
      alert('Failed to delete centre.');
    }
  };

  // Category CRUD
  const handleOpenCatModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatForm({
        name: cat.name,
        description: cat.description || '',
        avg_duration_minutes: cat.avg_duration_minutes || 15,
        token_prefix: cat.token_prefix || 'A',
      });
    } else {
      setEditingCategory(null);
      setCatForm({
        name: '',
        description: '',
        avg_duration_minutes: 15,
        token_prefix: 'A',
      });
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!selectedCentre) return;
    try {
      if (editingCategory) {
        await servicesAPI.updateCategory(editingCategory.id, catForm);
      } else {
        await servicesAPI.createCategory({
          ...catForm,
          centre_id: selectedCentre.id,
        });
      }
      setCatModalOpen(false);
      await fetchCategories(selectedCentre.id);
    } catch (err) {
      alert('Failed to save service category.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await servicesAPI.deleteCategory(id);
      await fetchCategories(selectedCentre.id);
    } catch (err) {
      alert('Failed to delete category.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Service Centres & Category Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Set up operating hours, average service times, token prefixes, and categories.
          </p>
        </div>

        <button
          onClick={() => handleOpenCentreModal()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Add Service Centre
        </button>
      </div>

      {/* Grid: Service Centres on Left, Categories on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Centres List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Service Centres ({centres.length})
          </h2>

          <div className="space-y-3">
            {centres.map((c) => {
              const isSelected = selectedCentre?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCentre(c)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {c.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCentreModal(c);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Centre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCentre(c.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Centre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800">{c.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {c.city} &bull; {c.opening_time} - {c.closing_time}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 cols): Selected Centre Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Service Categories
              </h2>
              <p className="text-xs text-slate-500">
                Facility: <strong className="text-slate-800">{selectedCentre?.name || 'None selected'}</strong>
              </p>
            </div>

            {selectedCentre && (
              <button
                onClick={() => handleOpenCatModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Category
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center text-xs text-slate-400">
              No categories configured for this facility yet. Click "Add Category" above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Prefix: {cat.token_prefix}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCatModal(cat)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {cat.description || 'Standard offering.'}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-3 border-t border-slate-50">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Average Service Duration: <strong>{cat.avg_duration_minutes} min</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Centre Modal */}
      <Modal
        isOpen={centreModalOpen}
        onClose={() => setCentreModalOpen(false)}
        title={editingCentre ? 'Edit Service Centre' : 'Add New Service Centre'}
      >
        <form onSubmit={handleSaveCentre} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Centre Name</label>
            <input
              type="text"
              required
              placeholder="e.g. City General Hospital"
              value={centreForm.name}
              onChange={(e) => setCentreForm({ ...centreForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Type</label>
              <select
                value={centreForm.type}
                onChange={(e) => setCentreForm({ ...centreForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Bank">Bank</option>
                <option value="Salon">Salon & Spa</option>
                <option value="Service Centre">Service Centre</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                placeholder="New York"
                value={centreForm.city}
                onChange={(e) => setCentreForm({ ...centreForm, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              required
              placeholder="100 Parkway Blvd"
              value={centreForm.address}
              onChange={(e) => setCentreForm({ ...centreForm, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+1 555-0100"
                value={centreForm.phone}
                onChange={(e) => setCentreForm({ ...centreForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Time</label>
              <input
                type="text"
                value={centreForm.opening_time}
                onChange={(e) => setCentreForm({ ...centreForm, opening_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Closing Time</label>
              <input
                type="text"
                value={centreForm.closing_time}
                onChange={(e) => setCentreForm({ ...centreForm, closing_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCentreModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20"
            >
              Save Service Centre
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCategory ? 'Edit Service Category' : 'Add Service Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Cardiology Consultation"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Token Prefix (e.g. A, C, G)
              </label>
              <input
                type="text"
                required
                maxLength="4"
                placeholder="C"
                value={catForm.token_prefix}
                onChange={(e) => setCatForm({ ...catForm, token_prefix: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Avg Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                required
                value={catForm.avg_duration_minutes}
                onChange={(e) => setCatForm({ ...catForm, avg_duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              placeholder="Brief details about what this service entails..."
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
