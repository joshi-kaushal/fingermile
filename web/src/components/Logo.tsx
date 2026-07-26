import { Link } from 'react-router-dom';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 'w-6 h-6', inner: 'w-3 h-3', text: 'text-base' },
    md: { icon: 'w-8 h-8', inner: 'w-4 h-4', text: 'text-lg' },
    lg: { icon: 'w-10 h-10', inner: 'w-5 h-5', text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <Link to="/" className="flex items-center gap-2.5 no-underline">
      <div className={`${s.icon} rounded-full bg-[#001D56] flex items-center justify-center`}>
        <div className={`${s.inner} rounded-full bg-white`} />
      </div>
      <span className={`${s.text} font-bold text-[#001D56] tracking-tight`}>
        Fingermile
      </span>
    </Link>
  );
}
