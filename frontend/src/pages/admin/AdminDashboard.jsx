import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  ArrowUpRight,
  Sparkles,
  PhoneCall,
  Building2,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { adminAPI, queueAPI, servicesAPI } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const { lastMessage, addToast } = useWebSocket();

  const fetchCentres = async () => {
    try {
      const res = await servicesAPI.getCentres();
      setCentres(res.data);
      if (res.data.length > 0 && !selectedCentreId) {
        setSelectedCentreId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching centres:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAnalytics({
        centre_id: selectedCentreId ? Number(selectedCentreId) : undefined,
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCentreId]);

  // Auto-refresh stats when queue is updated
  useEffect(() => {
    if (
      lastMessage?.event === 'QUEUE_UPDATED' ||
      lastMessage?.event === 'NEW_BOOKING'
    ) {
      fetchAnalytics();
    }
  }, [lastMessage]);

  const handleCallNext = async () => {
    if (!selectedCentreId) return;
    try {
      setCallingNext(true);
      const res = await queueAPI.performAction({
        action: 'call_next',
        centre_id: Number(selectedCentreId),
      });
      if (res.data.token_number) {
        addToast(
          'Customer Called',
          `Successfully called Token #${res.data.token_number}`,
          'serving'
        );
      } else {
        addToast('Queue Empty', res.data.message || 'No waiting customers.', 'info');
      }
      await fetchAnalytics();
    } catch (err) {
      console.error('Error calling next:', err);
      addToast('Error', 'Failed to call next customer', 'cancellation');
    } finally {
      setCallingNext(false);
    }
  };

  const overview = analytics?.overview || {
    total_appointments_today: 0,
    waiting_count: 0,
    serving_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    avg_waiting_time_minutes: 0,
  };

  // 1. Daily Statistics Bar Chart
  const dailyChartData = {
    labels: analytics?.daily_stats?.map((d) => d.date) || [],
    datasets: [
      {
        label: 'Booked',
        data: analytics?.daily_stats?.map((d) => d.booked) || [],
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
      {
        label: 'Completed',
        data: analytics?.daily_stats?.map((d) => d.completed) || [],
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Cancelled',
        data: analytics?.daily_stats?.map((d) => d.cancelled) || [],
        backgroundColor: '#f43f5e',
        borderRadius: 6,
      },
    ],
  };

  // 2. Weekly Customer Visits Line Chart
  const weeklyChartData = {
    labels: analytics?.weekly_visits?.map((w) => w.day) || [],
    datasets: [
      {
        label: 'Weekly Customer Visits',
        data: analytics?.weekly_visits?.map((w) => w.visits) || [],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#4f46e5',
        pointRadius: 4,
      },
    ],
  };

  // 3. Monthly Trends Bar Chart
  const monthlyChartData = {
    labels: analytics?.monthly_trends?.map((m) => m.month) || [],
    datasets: [
      {
        label: 'Total Appointments',
        data: analytics?.monthly_trends?.map((m) => m.appointments) || [],
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
    ],
  };

  // 4. Category Popularity Doughnut Chart
  const categoryChartData = {
    labels: analytics?.category_popularity?.map((c) => c.name) || [],
    datasets: [
      {
        data: analytics?.category_popularity?.map((c) => c.count) || [],
        backgroundColor: [
          '#2563eb',
          '#4f46e5',
          '#06b6d4',
          '#10b981',
          '#f59e0b',
          '#ec4899',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 } },
        grid: { color: '#f1f5f9' },
      },
      x: {
        ticks: { font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Centre Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Operational Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics, queue control, and appointment management metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Service Centre Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="">All Service Centres</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Quick Call Next Button */}
          <button
            onClick={handleCallNext}
            disabled={callingNext || !selectedCentreId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <PhoneCall className="w-4 h-4" />
            {callingNext ? 'Calling...' : 'Call Next Customer'}
          </button>

          <Link
            to="/admin/queue"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Manage Queue <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 6 Key Operational Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Appointments Today */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Appointments
            </span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {overview.total_appointments_today}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Scheduled today</span>
        </div>

        {/* Currently Waiting */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Waiting
            </span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {overview.waiting_count}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">In active queue</span>
        </div>

        {/* Being Served */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Serving Now
            </span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600">
            {overview.serving_count}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">At counters</span>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Completed
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {overview.completed_count}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Served today</span>
        </div>

        {/* Cancelled */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Cancelled
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {overview.cancelled_count}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Revoked</span>
        </div>

        {/* Average Wait Time */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Avg. Wait
            </span>
            <Clock className="w-4 h-4 text-indigoBrand-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigoBrand-600">
            {overview.avg_waiting_time_minutes}m
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Calculated today</span>
        </div>
      </div>

      {/* 4 Chart.js Analytical Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Daily Statistics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Daily Appointment Statistics
              </h3>
              <p className="text-[11px] text-slate-400">
                Comparison of Booked, Completed, and Cancelled appointments over the last 7 days.
              </p>
            </div>
          </div>
          <div className="h-64">
            <Bar data={dailyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 2: Weekly Customer Visits */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Weekly Customer Visits
              </h3>
              <p className="text-[11px] text-slate-400">
                Customer arrival volume across the days of the week.
              </p>
            </div>
          </div>
          <div className="h-64">
            <Line data={weeklyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 3: Monthly Appointment Trends */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Monthly Appointment Trends
              </h3>
              <p className="text-[11px] text-slate-400">
                Total monthly customer footfall and bookings (past 6 months).
              </p>
            </div>
          </div>
          <div className="h-64">
            <Bar data={monthlyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 4: Service Category Popularity */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Service Category Popularity
              </h3>
              <p className="text-[11px] text-slate-400">
                Distribution of appointments by service category.
              </p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { boxWidth: 12, font: { size: 10 } },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
