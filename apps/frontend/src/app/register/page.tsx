'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/auth';

function RegisterContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const setUser = useAuthStore((state) => state.setUser);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/register', { email, password, name });
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      router.push(redirectParam || '/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Wystąpił błąd podczas rejestracji.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate();
  };

  return (
    <div className="flex min-h-screen bg-[#05090f] text-gray-100 font-sans overflow-hidden">
      
      {/* Lewy panel - Wizualna strona tytułowa (Showcase) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-[#082a3a] via-[#081520] to-[#05090f] relative items-center justify-center p-12 overflow-hidden border-r border-gray-800/30">
        
        {/* Dekoracyjne efekty świetlne (Radial Glows) */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
        
        {/* Dynamiczne linie tła (Subtle mesh grid) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative max-w-lg space-y-12">
          {/* Logo & Nazwa firmy */}
          <div className="flex items-center gap-3.5 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 overflow-hidden shadow-2xl shadow-cyan-500/20 border border-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
              <img src="/TypeSpace.png" alt="TypeSpace Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent font-sans">
                TypeSpace
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mt-0.5">Real-time chat platform</p>
            </div>
          </div>

          {/* Slogan & Opis */}
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">
              Stwórz darmowe konto i dołącz do <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">nowoczesnej komunikacji</span>.
            </h2>
            <p className="text-base text-gray-400 leading-relaxed font-sans">
              Zarejestruj się w kilka sekund i zacznij korzystać ze spersonalizowanego workspace dla swojego zespołu, zapraszaj znajomych i czatuj w czasie rzeczywistym bez żadnych przeszkód.
            </p>
          </div>

          {/* Funkcjonalności ze wskaźnikami */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <span className="text-[10px] font-bold">✓</span>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Pełny dostęp za darmo</h4>
                <p className="text-xs text-gray-400 mt-0.5">Twórz nielimitowane kanały deweloperskie i zapraszaj tylu członków zespołu, ilu potrzebujesz.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <span className="text-[10px] font-bold">✓</span>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Niezależne pokoje DM</h4>
                <p className="text-xs text-gray-400 mt-0.5">Rozmawiaj prywatnie ze znajomymi w elastycznych konwersacjach, bez ograniczeń przestrzeni roboczych.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prawy panel - Formularz Rejestracji */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20 bg-[#070b12] relative">
        {/* Dekoracyjne rozmycie tła na mobile */}
        <div className="lg:hidden absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-cyan-500/5 blur-[96px]" />
        
        <div className="w-full max-w-md space-y-8 z-10 font-sans">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* Logo widoczne na mniejszych ekranach */}
            <div className="lg:hidden flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 overflow-hidden shadow-xl shadow-cyan-500/20 mb-5 border border-cyan-500/25">
              <img src="/TypeSpace.png" alt="TypeSpace Logo" className="h-full w-full object-cover" />
            </div>
            
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Zarejestruj się</h2>
            <p className="mt-2.5 text-sm text-gray-400">
              Masz już konto?{' '}
              <Link href={redirectParam ? `/login?redirect=${redirectParam}` : '/login'} className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                Zaloguj się tutaj
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-955/40 p-4 text-sm text-red-400 border border-red-900/30 text-center animate-fade-in font-medium">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="name">
                  Twoje imię lub nick
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-800/40 px-4 py-3.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all duration-200 shadow-inner"
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">
                  Adres e-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-800/40 px-4 py-3.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all duration-200 shadow-inner"
                  placeholder="nazwa@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">
                  Hasło
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="block w-full appearance-none rounded-xl border border-gray-700 bg-gray-800/40 px-4 py-3.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all duration-200 shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="group relative flex w-full justify-center rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl hover:shadow-cyan-500/20 shadow-cyan-650/10 active:scale-[0.99] mt-2"
            >
              {registerMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tworzenie konta…
                </div>
              ) : 'Zarejestruj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
