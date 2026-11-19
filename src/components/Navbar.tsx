import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, BookmarkCheck, LogOut, HelpCircle, ShieldAlert, Key } from 'lucide-react';
import { AppUser } from '../types';

interface NavbarProps {
  user: AppUser | null;
  onLogout: () => void;
  onOpenSavedExams: () => void;
  savedCount: number;
  isSuperadmin: boolean;
  onOpenSuperadmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenSavedExams,
  savedCount,
  isSuperadmin,
  onOpenSuperadmin,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    setApiKeyInput(savedKey);
  }, []);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_gemini_api_key', apiKeyInput.trim());
    setApiKeySaved(true);
    setTimeout(() => {
      setApiKeySaved(false);
      setShowApiKeyModal(false);
    }, 1500);
  };

  return (
    <>
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent uppercase whitespace-nowrap">
                soalator bogota
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition border border-slate-700 whitespace-nowrap"
              title="API Key Pribadi (Token Mandiri)"
            >
              <Key className="w-4 h-4 text-yellow-400" />
              <span className="hidden md:inline">API Key Pribadi</span>
            </button>

            {isSuperadmin && (
              <button
                onClick={onOpenSuperadmin}
                className="flex items-center space-x-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Superadmin</span>
              </button>
            )}

            <button
              onClick={onOpenSavedExams}
              className="relative flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium transition border border-slate-700 whitespace-nowrap"
              title="Daftar Soal Tersimpan"
            >
              <BookmarkCheck className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Arsip Soal</span>
              {savedCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowInfo(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Panduan Penggunaan"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {user && (
              <div className="flex items-center space-x-2.5 bg-slate-800/80 pl-3 pr-2 py-1.5 rounded-full border border-slate-700">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user.displayName?.[0] || user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-200 hidden lg:inline max-w-[140px] truncate">
                  {user.displayName || user.username || user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-full transition"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold mb-2 flex items-center space-x-2 text-yellow-400">
              <Key className="w-5 h-5" />
              <span>Konfigurasi API Key Pribadi</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Masukkan API Key Gemini milik Anda sendiri agar pembebanan kuota/token AI dibebankan ke akun pribadi Anda secara mandiri di soalator bogota.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono"
                />
              </div>

              {apiKeySaved && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-2.5 rounded-xl text-center font-medium">
                  API Key pribadi berhasil disimpan!
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition shadow"
                >
                  Simpan Kunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-3 flex items-center space-x-2 text-blue-400">
              <BookOpen className="w-6 h-6" />
              <span>Panduan Penggunaan soalator bogota</span>
            </h3>
            <div className="space-y-3 text-sm text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
              <p>
                soalator bogota membantu guru dan tenaga pendidik menyusun perangkat evaluasi pembelajaran secara cepat, akurat, dan sesuai standar Kurikulum Deep Learning.
              </p>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-white">Langkah-Langkah:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Atur API Key pribadi Anda melalui tombol <span className="text-yellow-400 font-semibold">API Key Pribadi</span> di atas.</li>
                  <li>Lengkapi Identitas Sekolah, Mata Pelajaran, dan jenis ujian.</li>
                  <li>Unggah materi atau tulis ringkasan materi Deep Learning dan nilai kebopkrian.</li>
                  <li>Pilih bentuk soal dan atur tingkat kesulitan (HOTS, MOTS, LOTS) untuk masing-masing jenis soal.</li>
                  <li>Klik tombol <span className="text-blue-400 font-semibold">"Generate Soal"</span>.</li>
                </ol>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition shadow"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
