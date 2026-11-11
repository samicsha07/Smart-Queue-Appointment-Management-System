import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Building,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import QueueTrackerCard from '../../components/QueueTrackerCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { lastMessage } = useWebSocket();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await appointmentsAPI.getMyAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Refresh appointments on WebSocket queue or booking events
  useEffect(() => {
    if (
      lastMessage?.event === 'QUEUE_UPDATED' ||
      lastMessage?.event === 'NEW_BOOKING'
    ) {
      fetchAppointments();
    }
  }, [lastMessage]);

  const handleCancelClick = (appt) => {
    setSelectedAppt(appt);
    setCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    if (!selectedAppt) return;
    try {
      setCancelling(true);
      await appointmentsAPI.cancel(selectedAppt.id);
      setCancelModalOpen(false);
      setSelectedAppt(null);
      await fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const primaryActiveAppt = appointments.active[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigoBrand-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> Customer Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Customer'}!
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl leading-relaxed">
              Track your live position in queue, check estimated waiting times, and book new appointments across hospitals, clinics, banks, and salons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-700 font-bold text-sm shadow-lg shadow-black/10 hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Book Appointment
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Main Grid: Live Queue Tracker on left/top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols on lg): Live Queue Tracker & Active Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Current Live Queue
            </h2>
            <button
              onClick={fetchAppointments}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {primaryActiveAppt && primaryActiveAppt.token ? (
            <QueueTrackerCard
              tokenId={primaryActiveAppt.token.id}
              onCancel={() => handleCancelClick(primaryActiveAppt)}
            />
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                No Active Appointments in Queue
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                You do not have any pending appointments or queue tokens right now. Schedule a visit to receive your live digital token.
              </p>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Schedule Appointment <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Active Appointments List */}
          {appointments.active.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                Active Appointments ({appointments.active.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {appointments.active.map((appt) => (
                  <div
                    key={appt.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm">
                          {appt.centre_name}
                        </span>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {appt.category_name} &bull; {appt.appointment_date} at {appt.appointment_time}
                      </p>
                      {appt.token && (
                        <span className="inline-block mt-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          Token: #{appt.token.token_number}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCancelClick(appt)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Quick Info & Recent History */}
        <div className="space-y-6">
          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-base font-bold mb-2">How SmartQueue Works</h3>
            <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Select your preferred centre, category, and available time slot.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Receive an instant sequential digital token number.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Track live queue movement and get alerted when your turn approaches!</span>
              </li>
            </ul>
          </div>

          {/* Recent History Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Recent History
              </h3>
              <Link
                to="/history"
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                View all
              </Link>
            </div>

            {appointments.history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No completed or cancelled appointments yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.history.slice(0, 4).map((hist) => (
                  <div key={hist.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 line-clamp-1">
                        {hist.centre_name}
                      </span>
                      <StatusBadge status={hist.status} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{hist.category_name}</span>
                      <span>{hist.appointment_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold">Are you sure you want to cancel this appointment?</p>
              <p className="mt-0.5 text-rose-700">
                Your queue token ({selectedAppt?.token?.token_number || 'Token'}) will be revoked and removed from the active queue. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
            <p><strong>Centre:</strong> {selectedAppt?.centre_name}</p>
            <p><strong>Category:</strong> {selectedAppt?.category_name}</p>
            <p><strong>Date & Time:</strong> {selectedAppt?.appointment_date} at {selectedAppt?.appointment_time}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Keep Appointment
            </button>
            <button
              onClick={confirmCancel}
              disabled={cancelling}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
