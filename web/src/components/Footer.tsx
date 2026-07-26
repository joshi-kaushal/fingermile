import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#001D56] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <span className="text-sm font-semibold text-[#001D56]">Fingermile</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-[#64748B]">
            <Link to="/" className="hover:text-[#1E293B] transition-colors no-underline">
              Home
            </Link>
            <Link to="/privacy" className="hover:text-[#1E293B] transition-colors no-underline">
              Privacy
            </Link>
            <Link to="/contact" className="hover:text-[#1E293B] transition-colors no-underline">
              Contact
            </Link>
            <a
              href="https://github.com/joshi-kaushal/fingermile"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1E293B] transition-colors no-underline"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-[#94A3B8]">
          &copy; {new Date().getFullYear()} Fingermile. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
