import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Building2,
  Calendar,
  PhoneCall,
  CheckCircle,
  SkipForward,
  XCircle,
  PlusCircle,
  RefreshCw,
  Users,
  Search,
  Tag
} from 'lucide-react';
import { queueAPI, servicesAPI } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

export default function QueueManagement() {
  const [centres, setCentres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [callingNext, setCallingNext] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Walk-in modal
  const [walkinModalOpen, setWalkinModalOpen] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinCategory, setWalkinCategory] = useState('');
  const [walkinLoading, setWalkinLoading] = useState(false);

  const { lastMessage, addToast } = useWebSocket();

  // Load centres
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const res = await servicesAPI.getCentres();
        setCentres(res.data);
        if (res.data.length > 0) {
          setSelectedCentreId(res.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching centres:', err);
      }
    };
    fetchCentres();
  }, []);

  // Load categories when centre changes
  useEffect(() => {
    if (selectedCentreId) {
      const fetchCategories = async () => {
        try {
          const res = await servicesAPI.getCategories({ centre_id: selectedCentreId });
          setCategories(res.data);
          setSelectedCategoryId('');
          if (res.data.length > 0) {
            setWalkinCategory(res.data[0].id);
          }
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      fetchCategories();
    }
  }, [selectedCentreId]);

  // Load tokens
  const fetchTokens = async () => {
    if (!selectedCentreId) return;
    try {
      setLoading(true);
      const res = await queueAPI.getActiveQueue(
        selectedCentreId,
        selectedDate,
        selectedCategoryId || undefined
      );
      setTokens(res.data);
    } catch (err) {
      console.error('Error fetching queue tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [selectedCentreId, selectedDate, selectedCategoryId]);

  // Real-time auto-refresh on WebSocket events
  useEffect(() => {
    if (
      lastMessage?.event === 'QUEUE_UPDATED' ||
      lastMessage?.event === 'NEW_BOOKING'
    ) {
      fetchTokens();
    }
  }, [lastMessage]);

  const handleCallNext = async () => {
    if (!selectedCentreId) return;
    try {
      setCallingNext(true);
      const res = await queueAPI.performAction({
        action: 'call_next',
        centre_id: Number(selectedCentreId),
        category_id: selectedCategoryId ? Number(selectedCategoryId) : undefined,
      });

      if (res.data.token_number) {
        addToast(
          'Customer Called',
          `Serving Token #${res.data.token_number} at counter`,
          'serving'
        );
      } else {
        addToast('Queue Empty', res.data.message || 'No waiting customers.', 'info');
      }
      await fetchTokens();
    } catch (err) {
      console.error('Error calling next:', err);
      addToast('Error', 'Failed to call next customer', 'cancellation');
    } finally {
      setCallingNext(false);
    }
  };

  const handleTokenAction = async (tokenId, action, actionLabel) => {
    try {
      setActionLoadingId(tokenId);
      await queueAPI.performAction({
        action,
        token_id: tokenId,
        centre_id: Number(selectedCentreId),
      });
      addToast('Status Updated', `Token ${actionLabel}`, 'info');
      await fetchTokens();
    } catch (err) {
      console.error('Action error:', err);
      addToast('Error', `Failed to perform ${action}`, 'cancellation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGenerateWalkin = async (e) => {
    e.preventDefault();
    if (!selectedCentreId || !walkinCategory) {
      alert('Please select a category for the walk-in token.');
      return;
    }
    try {
      setWalkinLoading(true);
      const res = await queueAPI.generateWalkin({
        centre_id: selectedCentreId,
        category_id: walkinCategory,
        customer_name: walkinName || 'Walk-in Guest',
        customer_phone: walkinPhone || 'N/A',
      });
      addToast(
        'Walk-in Generated',
        `Issued Token #${res.data.token.token_number}`,
        'serving'
      );
      setWalkinModalOpen(false);
      setWalkinName('');
      setWalkinPhone('');
      await fetchTokens();
    } catch (err) {
      console.error('Error generating walk-in:', err);
      alert('Failed to generate walk-in token.');
    } finally {
      setWalkinLoading(false);
    }
  };

  const waitingCount = tokens.filter((t) => t.status === 'waiting').length;
  const servingCount = tokens.filter((t) => t.status === 'serving').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Live Queue Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ListOrdered className="w-7 h-7 text-blue-600" />
            Queue Operations & Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Call next customers, manage serving states, and generate walk-in queue tokens in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setWalkinModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            Issue Walk-in Token
          </button>

          <button
            onClick={handleCallNext}
            disabled={callingNext || !selectedCentreId}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <PhoneCall className="w-4 h-4" />
            {callingNext ? 'Calling Next...' : 'Call Next Customer'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-center">
        {/* Service Centre */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Service Centre
          </label>
          <select
            value={selectedCentreId}
            onChange={(e) => setSelectedCentreId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Operating Date */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Operating Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Category Filter
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.token_prefix})
              </option>
            ))}
          </select>
        </div>

        {/* Live Status Summary Badges */}
        <div className="flex items-center gap-3 justify-end sm:col-span-3 md:col-span-1 pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Queue Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {waitingCount} Waiting
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                {servingCount} Serving
              </span>
            </div>
          </div>
          <button
            onClick={fetchTokens}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading queue tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No tokens in queue for this centre and date. Click "Issue Walk-in Token" or book from customer portal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Token</th>
                  <th className="py-3.5 px-6">Customer Name & Phone</th>
                  <th className="py-3.5 px-6">Service Category</th>
                  <th className="py-3.5 px-6">Scheduled Time</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tokens.map((t) => {
                  const isActionLoading = actionLoadingId === t.id;
                  const isServing = t.status === 'serving';

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        isServing
                          ? 'bg-blue-50/40 font-medium'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Token Number */}
                      <td className="py-4 px-6 font-bold text-sm">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg ${
                            isServing
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          #{t.token_number}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                          Seq #{t.sequence_number}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">
                          {t.user_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {t.user_phone}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-700">
                          {t.category_name}
                        </span>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-4 px-6 text-slate-600">
                        {t.appointment_time || 'Walk-in'}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'waiting' && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleTokenAction(t.id, 'mark_serving', 'marked as Serving')
                              }
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                              title="Call customer to counter"
                            >
                              Call / Serve
                            </button>
                          )}

                          {t.status === 'serving' && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleTokenAction(t.id, 'mark_completed', 'Completed')
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-[11px] shadow-sm transition-colors"
                              title="Mark customer as completed"
                            >
                              Complete
                            </button>
                          )}

                          {['waiting', 'serving'].includes(t.status) && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleTokenAction(t.id, 'mark_skipped', 'Skipped')
                              }
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-[11px] transition-colors"
                              title="Skip customer (not present)"
                            >
                              Skip
                            </button>
                          )}

                          {['waiting', 'serving', 'skipped'].includes(t.status) && (
                            <button
                              disabled={isActionLoading}
                              onClick={() =>
                                handleTokenAction(t.id, 'mark_cancelled', 'Cancelled')
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] transition-colors"
                              title="Cancel token"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Walk-in Token Modal */}
      <Modal
        isOpen={walkinModalOpen}
        onClose={() => setWalkinModalOpen(false)}
        title="Issue Walk-in Digital Queue Token"
      >
        <form onSubmit={handleGenerateWalkin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Henderson"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Contact Phone (Optional)
            </label>
            <input
              type="text"
              placeholder="+1 555-0199"
              value={walkinPhone}
              onChange={(e) => setWalkinPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Service Category
            </label>
            <select
              value={walkinCategory}
              onChange={(e) => setWalkinCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} (Prefix: {cat.token_prefix}, ~{cat.avg_duration_minutes}m)
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWalkinModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={walkinLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20"
            >
              {walkinLoading ? 'Generating...' : 'Issue Token'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
