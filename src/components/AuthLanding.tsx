import React, { useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  googleProvider,
  auth,
  db,
} from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AppUser } from '../types';
import { Sparkles, KeyRound, User as UserIcon, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface AuthLandingProps {
  onCredentialLogin: (token: string, user: AppUser) => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onCredentialLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data.token && data.user) {
        onCredentialLogin(data.token, data.user as AppUser);
        return;
      }

      // If identifier looks like an email and backend didn't find it, try Firebase Email/Password if enabled
      if (identifier.includes('@') && resp.status === 401) {
        try {
          await signInWithEmailAndPassword(auth, identifier.trim(), password);
          return;
        } catch (fbErr: any) {
          const fbCode = fbErr?.code || '';
          if (fbCode && fbCode !== 'auth/operation-not-allowed') {
            throw new Error(data.error || 'Username/Email atau kata sandi salah.');
          }
        }
      }

      throw new Error(data.error || 'Username/Email atau kata sandi salah.');
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk. Periksa kembali username/email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const isSuper = user.email === 'ppdb.sdbogota@gmail.com';

      setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Guru / Pengajar',
          role: isSuper ? 'superadmin' : 'teacher',
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      ).catch((fsErr) => {
        console.warn('Firestore profile sync warning:', fsErr);
      });
    } catch (err: any) {
      console.error('Google auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain' || (err?.message || '').includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        setError(
          `Domain (${currentHost}) belum terdaftar di Authorized Domains Firebase Authentication. Tambahkan domain tersebut di Firebase Console, atau masuk menggunakan Username & Kata Sandi yang dibuat oleh Superadmin.`
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Jendela login Google ditutup sebelum proses selesai. Silakan coba lagi.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.');
      } else {
        setError(err?.message || 'Gagal masuk dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-3.5 rounded-2xl text-white shadow-lg mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
            soalator bogota
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Platform Pembuat Soal Ujian Kurikulum Deep Learning & Nilai Kebopkrian
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3.5 rounded-xl mb-5 text-left leading-relaxed break-words">
            {error}
          </div>
        )}

        {/* Username / Email & Password Form */}
        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username atau Email Terdaftar
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: guru.budi atau nama@sekolah.sch.id"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk dengan Akun'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Atau</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center space-x-3 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Masuk dengan Google</span>
        </button>

        <div className="mt-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-1.5">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Informasi Akses Akun & Superadmin</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pengguna terdaftar dapat masuk memakai <span className="text-slate-200 font-medium">Username & Kata Sandi</span> yang dibuat oleh Superadmin. Superadmin (<code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded">ppdb.sdbogota@gmail.com</code>) dapat masuk via Google untuk mengelola akun guru.
          </p>
        </div>
      </div>
    </div>
  );
};
