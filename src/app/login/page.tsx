"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    
    // Hablando con los Servidores de Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Credenciales incorrectas o Acceso Denegado.');
      setLoading(false);
      return;
    }

    // Refrescamos toda la App para que el Middleware se entere de que ya tenemos las llaves y nos deje entrar al Dashboard
    router.refresh();
  };

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-brand-bg font-['Inter']">
      <div className="bg-brand-panel border border-brand-border shadow-2xl rounded-xl w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative subtle gradient */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-purple-500"></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Inventario Karina
          </h1>
          <p className="text-brand-textMuted font-medium text-sm tracking-widest uppercase">
            Bóveda de Seguridad (V4)
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-brand-textMuted text-sm font-medium mb-2">Llave Administrativa (Correo)</label>
            <input 
              type="email" 
              className="w-full bg-brand-sidebar border border-brand-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              autoFocus
              placeholder="admin@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-brand-textMuted text-sm font-medium mb-2">Contraseña de Acceso</label>
            <input 
              type="password" 
              className="w-full bg-brand-sidebar border border-brand-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-mono" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="•••••••••"
            />
          </div>
          
          {error && (
            <div className="bg-brand-red/10 border border-brand-red/50 text-brand-red px-4 py-3 rounded-lg text-center font-bold text-sm">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-brand-primary hover:bg-brand-primaryHover text-white font-bold text-lg py-3 rounded-lg transition-all shadow-md disabled:opacity-50 mt-4 h-14 flex items-center justify-center" 
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              'Desbloquear Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
