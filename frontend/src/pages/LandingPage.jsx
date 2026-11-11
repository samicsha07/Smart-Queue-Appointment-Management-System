import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  CheckCircle2,
  Building2,
  Sparkles,
  BarChart3,
  Bell,
  HeartPulse,
  Landmark,
  Scissors
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Next-Gen Smart Queue & Appointment System</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Say Goodbye to <span className="text-blue-600">Crowded Waiting Rooms</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                SmartQueue connects patients, clients, and customers with hospitals, clinics, banks, and salons. Book appointments, receive digital queue tokens, track your live position in real-time, and get notified before your turn.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/book"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  Book Appointment Now
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm shadow-sm transition-all"
                >
                  Customer Login
                </Link>

                <Link
                  to="/admin/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all"
                >
                  Admin Console
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Zero Waiting Friction
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-Time WebSockets
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated Wait Times
                </span>
              </div>
            </div>

            {/* Right Column: Live Interactive Demo Card Preview */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Glow Backdrop */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 to-indigoBrand-500 opacity-20 blur-xl" />

                {/* Simulated Live Token Card */}
                <div className="relative rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Live Token Preview
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Waiting in Line
                    </span>
                  </div>

                  <div className="py-4">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Metro Central Hospital
                    </h3>
                    <p className="text-xs text-slate-500">General Physician Consultation</p>
                  </div>

                  {/* 4 Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Customer Token
                      </span>
                      <div className="text-2xl font-black text-blue-600 mt-0.5">
                        #A015
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Currently Serving
                      </span>
                      <div className="text-2xl font-black text-slate-800 mt-0.5">
                        #A010
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        People Ahead
                      </span>
                      <div className="text-2xl font-black text-slate-800 mt-0.5">
                        4
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Est. Wait Time
                      </span>
                      <div className="text-2xl font-black text-indigoBrand-600 mt-0.5">
                        20 min
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-blue-900 text-xs flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                    <span>Real-time queue updates automatically without refreshing.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Served */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Versatile Applications
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Tailored for High-Traffic Service Facilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Empower your staff, streamline foot traffic, and respect your visitors' valuable time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Hospital */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Hospitals & Clinics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Eliminate crowded waiting rooms, triage patients smoothly, and provide accurate wait estimates for lab tests and physician visits.
            </p>
          </div>

          {/* Banks */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Landmark className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Banks & Financial
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Route customers directly to tellers, mortgage consultants, or wealth advisors without chaotic queue lines.
            </p>
          </div>

          {/* Salons */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Salons & Spas
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Allow clients to reserve styling slots, arrive exactly when their chair is ready, and elevate customer satisfaction.
            </p>
          </div>

          {/* Service Centres */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Service Centres
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Maintain transparent ticketing, prevent duplicate bookings, and provide live status alerts on mobile devices.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Everything Needed for Modern Queue Control
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Built with FastAPI, React, MySQL, Chart.js, and WebSockets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Live WebSocket Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens automatically progress from Waiting to Serving to Completed without manual page refreshes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Admin Dashboard & Charts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gain real-time insights with daily statistics, weekly customer visits, monthly trends, and service popularity.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">In-App Notification Center</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customers receive immediate updates when their booking is confirmed and when their turn is approaching.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
