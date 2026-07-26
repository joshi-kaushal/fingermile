import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus('success');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.detail || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#001D56] mb-2">Contact Us</h1>
          <p className="text-sm text-[#64748B]">
            Have a question, feedback, or just want to say hi? Drop us a message.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-[#F0FDF4] border border-[#16A34A]/20 rounded-xl p-6 text-center">
            <p className="text-[#16A34A] font-semibold mb-1">Message sent!</p>
            <p className="text-sm text-[#64748B]">We&apos;ll get back to you soon.</p>
            <Link
              to="/"
              className="inline-block mt-4 text-sm font-medium text-[#001D56] hover:text-[#F58538] transition-colors no-underline"
            >
              &larr; Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] hover:border-[#94A3B8] focus:border-[#F58538] focus:shadow-[0_0_0_3px_rgba(245,133,56,0.15)] focus:outline-none transition-all"
                placeholder="Your name"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] hover:border-[#94A3B8] focus:border-[#F58538] focus:shadow-[0_0_0_3px_rgba(245,133,56,0.15)] focus:outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="message" className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#1E293B] hover:border-[#94A3B8] focus:border-[#F58538] focus:shadow-[0_0_0_3px_rgba(245,133,56,0.15)] focus:outline-none transition-all resize-y"
                placeholder="How can we help?"
              />
            </div>

            {status === 'error' && (
              <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-3">
                <p className="text-sm text-[#DC2626]">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#001D56] text-white hover:bg-[#002a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
