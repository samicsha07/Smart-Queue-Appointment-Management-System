import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  MapPin,
  Phone,
  Tag,
  ArrowRight
} from 'lucide-react';
import { servicesAPI, appointmentsAPI } from '../../services/api';
import Modal from '../../components/Modal';

export default function BookAppointment() {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [centres, setCentres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slots, setSlots] = useState([]);

  // Selection state
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');

  // Loading & error
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState(null);

  // Success Modal
  const [successData, setSuccessData] = useState(null);

  // Fetch Centres on mount
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        setLoadingCentres(true);
        const res = await servicesAPI.getCentres();
        setCentres(res.data);
      } catch (err) {
        console.error('Error fetching centres:', err);
        setError('Failed to load service centres.');
      } finally {
        setLoadingCentres(false);
      }
    };
    fetchCentres();
  }, []);

  // Fetch Categories when centre is chosen
  useEffect(() => {
    if (selectedCentre) {
      const fetchCategories = async () => {
        try {
          const res = await servicesAPI.getCategories({ centre_id: selectedCentre.id });
          setCategories(res.data);
          setSelectedCategory(null);
        } catch (err) {
          console.error('Error fetching categories:', err);
        }
      };
      fetchCategories();
    }
  }, [selectedCentre]);

  // Fetch Slots when centre, category, and date are chosen
  useEffect(() => {
    if (selectedCentre && selectedCategory && selectedDate) {
      const fetchSlots = async () => {
        try {
          setLoadingSlots(true);
          const res = await servicesAPI.getSlots(
            selectedCentre.id,
            selectedCategory.id,
            selectedDate
          );
          setSlots(res.data);
          setSelectedSlot(null);
        } catch (err) {
          console.error('Error fetching slots:', err);
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedCentre, selectedCategory, selectedDate]);

  const handleBookingSubmit = async () => {
    if (!selectedCentre || !selectedCategory || !selectedDate || !selectedSlot) {
      setError('Please complete all selection steps.');
      return;
    }

    try {
      setBookingLoading(true);
      setError(null);

      const payload = {
        centre_id: selectedCentre.id,
        category_id: selectedCategory.id,
        slot_id: selectedSlot.id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot.start_time,
        notes: notes.trim() || undefined,
      };

      const res = await appointmentsAPI.book(payload);
      setSuccessData(res.data);
    } catch (err) {
      console.error('Booking failed:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to book appointment. Please try selecting a different slot.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Service Centre' },
    { num: 2, title: 'Category' },
    { num: 3, title: 'Date & Time' },
    { num: 4, title: 'Confirmation' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Wizard Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Book an Appointment
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Reserve your service slot and automatically receive a real-time digital queue token.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-200 -z-0" />
          {stepsList.map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-white text-slate-400 border-2 border-slate-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 hidden sm:block ${
                    isCurrent ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Body Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl">
        {/* STEP 1: Select Service Centre */}
        {step === 1 && (
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Step 1: Choose a Service Centre
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Select the facility where you wish to book your appointment.
            </p>

            {loadingCentres ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Loading service centres...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {centres.map((centre) => {
                  const isSelected = selectedCentre?.id === centre.id;
                  return (
                    <div
                      key={centre.id}
                      onClick={() => setSelectedCentre(centre)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {centre.type}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-800 mb-1">
                        {centre.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {centre.address}, {centre.city}
                      </p>
                      {centre.phone && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {centre.phone}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                disabled={!selectedCentre}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Category <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Service Category */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Step 2: Choose Service Category
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Selected Centre: <strong className="text-slate-800">{selectedCentre?.name}</strong>
            </p>

            {categories.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No service categories found for this centre.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Token Prefix: {cat.token_prefix}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-800 mb-1">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">
                        {cat.description || 'Standard service offering'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Avg. Duration: {cat.avg_duration_minutes} minutes
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={!selectedCategory}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to Date & Slot <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Date & Time Slot */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Step 3: Select Date & Available Time Slot
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Category: <strong className="text-slate-800">{selectedCategory?.name}</strong> at{' '}
              <strong className="text-slate-800">{selectedCentre?.name}</strong>
            </p>

            {/* Date Picker */}
            <div className="mb-6 max-w-xs">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Appointment Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Slots Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Available Time Slots
              </label>

              {loadingSlots ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Checking real-time slot availability...
                </div>
              ) : slots.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No slots available for this date. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isFull = !slot.is_available || slot.available_spaces <= 0;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isFull
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-slate-800'
                        }`}
                      >
                        <div className="text-xs font-bold">
                          {slot.start_time} - {slot.end_time}
                        </div>
                        <div
                          className={`text-[10px] mt-1 ${
                            isSelected
                              ? 'text-blue-100'
                              : isFull
                              ? 'text-rose-500'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isFull ? 'Full' : `${slot.available_spaces} spaces left`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={!selectedSlot}
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review & Confirm <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Confirm */}
        {step === 4 && (
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Step 4: Review & Confirm Booking
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Please verify your appointment details before generating your queue token.
            </p>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Service Centre</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedCentre?.name}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedCentre?.address}, {selectedCentre?.city}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Service Category</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedCategory?.name}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    Avg Duration: {selectedCategory?.avg_duration_minutes} mins
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Appointment Date</span>
                  <span className="font-bold text-slate-800">
                    {selectedDate}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Reserved Time Slot</span>
                  <span className="font-bold text-blue-600 text-sm">
                    {selectedSlot?.start_time} - {selectedSlot?.end_time}
                  </span>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Need assistance, routine checkup, document renewal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                disabled={bookingLoading}
                onClick={handleBookingSubmit}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {bookingLoading ? 'Generating Token...' : 'Confirm & Generate Token'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal with Token Generated */}
      <Modal
        isOpen={!!successData}
        onClose={() => {
          setSuccessData(null);
          navigate('/dashboard');
        }}
        title="Appointment Confirmed!"
      >
        {successData && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Your Digital Queue Token
              </p>
              <div className="text-5xl font-extrabold text-blue-600 tracking-tight my-2">
                #{successData.token?.token_number}
              </div>
              <p className="text-xs text-slate-500">
                Token sequence: #{successData.token?.sequence_number} for {successData.appointment_date}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 space-y-1 text-left">
              <p><strong>Centre:</strong> {successData.centre_name}</p>
              <p><strong>Category:</strong> {successData.category_name}</p>
              <p><strong>Time:</strong> {successData.appointment_time}</p>
            </div>

            <p className="text-xs text-slate-400">
              You will receive real-time notifications on your dashboard when your turn approaches!
            </p>

            <button
              onClick={() => {
                setSuccessData(null);
                navigate('/dashboard');
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              Go to Live Queue Tracker <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
