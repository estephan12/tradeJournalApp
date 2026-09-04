'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabaseConfigured = isSupabaseConfigured();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase credentials are not configured yet in .env.local.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email inbox for confirmation link, or log in directly if confirmation is disabled.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F5F7FA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#111820] border border-[#26313D] rounded-lg p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded bg-[#0B0F14] border border-[#26313D] flex items-center justify-center text-[#38BDF8] mx-auto">
            <Terminal className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold font-mono tracking-widest text-[#F5F7FA]">
            TRADELAB
          </h1>
          <p className="text-xs text-[#8B98A8]">
            {isSignUp
              ? 'Crea tu cuenta para sincronizar tus operaciones entre tu PC y tu celular'
              : 'Inicia sesión con la misma cuenta en tu PC y celular para sincronizar en tiempo real'}
          </p>
        </div>

        <div className="p-3 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded text-xs text-[#38BDF8] flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>Sincronización Automática:</strong> Cualquier operación registrada localmente se guardará en tu cuenta para que puedas verla en todos tus dispositivos.
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded text-xs text-[#F59E0B] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Credenciales de Supabase pendientes:</span> Configura tu{' '}
              <code className="text-[#F5F7FA]">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
              <code className="text-[#F5F7FA]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{' '}
              <code className="text-[#F5F7FA]">.env.local</code>.
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded text-xs text-[#22C55E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#8B98A8] mb-1">Correo Electrónico / Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B98A8]" />
              <input
                type="email"
                required
                placeholder="trader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8B98A8] mb-1">Contraseña / Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B98A8]" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded bg-[#0B0F14] border border-[#26313D] text-xs text-[#F5F7FA] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 rounded bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F14] font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow"
          >
            <span>{loading ? 'Procesando...' : isSignUp ? 'Crear Cuenta y Sincronizar' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#26313D] text-center text-xs text-[#8B98A8] flex items-center justify-between">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="hover:text-[#38BDF8] transition-colors text-left"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </button>

          <Link href="/" className="text-[#38BDF8] hover:underline shrink-0">
            Volver al Terminal →
          </Link>
        </div>
      </div>
    </div>
  );
}
