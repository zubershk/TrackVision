import React, { useState, useEffect } from 'react';
import { useVisionStore } from '../../store';
import { MonitorPlay, ArrowRight, Menu, X, Cpu } from 'lucide-react';
import { useGlassInteractive } from '../../hooks/useGlassInteractive';

export function LandingNav() {
  const setMode = useVisionStore(s => s.setMode);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const glassBtnProps = useGlassInteractive();
  const { ref: _, ...glassBtnHandlers } = glassBtnProps;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Playground', href: '#playground' },
    { label: 'Benchmarks', href: '#benchmarks' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Code', href: '#code' },
  ];

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-4 transition-all duration-300 pointer-events-none">
      <nav
        className={`w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-2xl transition-all duration-300 pointer-events-auto ${
          scrolled
            ? 'glass-strong border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl'
            : 'glass border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md'
        }`}
      >
        {/* Brand */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-white/40 shadow-inner">
            <MonitorPlay className="w-5 h-5 text-white transition-transform group-hover:rotate-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-base sm:text-lg text-[#F5F5F5]">
                TrackVision
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                v2.0
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-[#888888] hidden sm:block">
              CLIENT-SIDE CV & TRACKING
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-xs lg:text-sm text-[#B8B8B8] hover:text-white px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5 font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action Button */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => setMode('app')}
            {...glassBtnHandlers}
            className="glass-btn-prominent group relative px-4 py-2 text-xs lg:text-sm font-semibold rounded-xl flex items-center gap-2 border border-white/25 hover:border-white/50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            <Cpu className="w-4 h-4 text-white/90" />
            <span className="text-[#F5F5F5]">Launch Engine</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMode('app')}
            className="glass-btn px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <span>Launch</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-20 z-40 md:hidden p-4 rounded-2xl glass-strong border border-white/20 shadow-2xl backdrop-blur-2xl flex flex-col gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-sm text-[#F5F5F5] hover:text-white px-4 py-2.5 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-between"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/40" />
            </a>
          ))}
          <div className="pt-2 border-t border-white/10 mt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setMode('app');
              }}
              className="w-full glass-btn-prominent py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch Command Center</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
