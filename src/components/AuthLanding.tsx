import React, { useState } from 'react';
import { 
  signInWithPopup, 
  googleProvider, 
  auth, 
  db 
} from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Sparkles, KeyRound } from 'lucide-react';

export const AuthLanding: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const isSuper = user.email === 'ppdb.sdbogota@gmail.com';

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Guru / Pengajar',
        role: isSuper ? 'superadmin' : 'teacher',
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10 text-center">
        <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl text-white shadow-lg mb-6">
          <Sparkles className="w-9 h-9 animate-pulse" />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
          soalator bogota
        </h1>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          Platform Pembuat Soal Ujian, Kisi-Kisi, dan Pembahasan Otomatis Kurikulum Deep Learning & Nilai Kebopkrian.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-6 text-left">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center space-x-3 transition shadow-xl disabled:opacity-50"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
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
            <span>{loading ? 'Menghubungkan...' : 'Masuk / Daftar dengan Google'}</span>
          </button>
        </div>

        <div className="mt-8 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider">
            <KeyRound className="w-4 h-4" />
            <span>Detail Login Superadmin</span>
          </div>
          <p className="text-xs text-slate-300">
            Masuk menggunakan akun Google utama (<code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded">ppdb.sdbogota@gmail.com</code>) untuk mengaktifkan hak akses <span className="text-red-400 font-semibold">Superadmin</span> di soalator bogota.
          </p>
        </div>
      </div>
    </div>
  );
};
