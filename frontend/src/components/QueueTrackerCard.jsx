import React, { useState, useEffect } from 'react';
import { Users, Clock, Radio, Activity, AlertCircle, Sparkles } from 'lucide-react';
import { queueAPI } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import StatusBadge from './StatusBadge';

export default function QueueTrackerCard({ tokenId, onCancel, showCancelBtn = true }) {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { lastMessage, isConnected } = useWebSocket();

  const fetchLiveStatus = async () => {
    if (!tokenId) return;
    try {
      setLoading(true);
      const res = await queueAPI.getLiveStatus(tokenId);
      setQueueData(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching live queue status:', err);
      setError('Unable to load live queue tracking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
  }, [tokenId]);

  // Re-fetch automatically whenever a WebSocket queue update happens
  useEffect(() => {
    if (
      lastMessage?.event === 'QUEUE_UPDATED' ||
      lastMessage?.event === 'NEW_BOOKING'
    ) {
      fetchLiveStatus();
    }
  }, [lastMessage]);

  if (!tokenId) {
    return null;
  }

  if (loading && !queueData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Connecting to Live Queue...</p>
        </div>
      </div>
    );
  }

  if (error || !queueData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
        <p className="text-sm text-slate-500">{error || 'No active queue token found.'}</p>
      </div>
    );
  }

  const isMyTurn = queueData.status === 'serving';
  const isApproaching = queueData.status === 'waiting' && queueData.people_ahead <= 2;
  const isFinished = queueData.status === 'completed' || queueData.status === 'cancelled';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white shadow-xl border transition-all duration-300 ${
        isMyTurn
          ? 'ring-2 ring-blue-500 border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/30'
          : isApproaching
          ? 'ring-2 ring-amber-400 border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white'
          : 'border-slate-100'
      }`}
    >
      {/* Real-time Status Header */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Live Queue Tracker
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            • Auto-sync active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={queueData.status} />
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="p-6">
        {/* Service Centre & Category details */}
        <div className="mb-6">
          <h4 className="text-base font-bold text-slate-800">
            {queueData.centre_name}
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {queueData.category_name} &bull; Scheduled {queueData.appointment_time}
          </p>
        </div>

        {/* Urgency Announcement Banners */}
        {isMyTurn && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-600 text-white flex items-center gap-3 shadow-lg shadow-blue-500/20 animate-soft-pulse">
            <Sparkles className="w-6 h-6 shrink-0 text-blue-200" />
            <div>
              <p className="font-bold text-sm">It's Your Turn Now!</p>
              <p className="text-xs text-blue-100 mt-0.5">
                Token {queueData.token_number} is actively being served at the desk. Please proceed immediately.
              </p>
            </div>
          </div>
        )}

        {isApproaching && !isMyTurn && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-xs">Your Turn Is Approaching!</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Only {queueData.people_ahead} customer{queueData.people_ahead > 1 ? 's' : ''} ahead of you. Please stay close to the service counter.
              </p>
            </div>
          </div>
        )}

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Customer Token */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Your Token
            </span>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
              #{queueData.token_number}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Digital Token
            </span>
          </div>

          {/* 2. Currently Serving */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Currently Serving
            </span>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {queueData.currently_serving_token && queueData.currently_serving_token !== 'None'
                ? `#${queueData.currently_serving_token}`
                : 'Standby'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              At the counter
            </span>
          </div>

          {/* 3. People Ahead */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                People Ahead
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {queueData.status === 'serving' ? '0' : queueData.people_ahead}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Customers in line
            </span>
          </div>

          {/* 4. Estimated Wait Time */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Estimated Wait
              </span>
            </div>
            <div className="text-3xl font-extrabold text-indigoBrand-600 tracking-tight">
              {queueData.status === 'serving'
                ? '0 min'
                : `${queueData.estimated_waiting_time_minutes} min`}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dynamic calculation
            </span>
          </div>
        </div>

        {/* Footer info & Cancel CTA if eligible */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-500" />
            Queue position updates in real-time when the counter calls the next customer.
          </p>

          {showCancelBtn && onCancel && queueData.status === 'waiting' && (
            <button
              onClick={onCancel}
              className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel Appointment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
