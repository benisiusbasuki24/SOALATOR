import React, { useEffect, useState } from 'react';
import { ExamData, RegisteredUser } from '../types';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import {
  ShieldAlert,
  BookOpen,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Layers,
  Users,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Ban,
} from 'lucide-react';

interface SuperadminDashboardProps {
  onBackToApp: () => void;
  onLoadExam: (exam: ExamData) => void;
  getAuthToken: () => Promise<string | null>;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({
  onBackToApp,
  onLoadExam,
  getAuthToken,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'exams'>('users');
  const [allExams, setAllExams] = useState<ExamData[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // New user registration form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'teacher' | 'superadmin'>('teacher');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<RegisteredUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching registered users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAllExams = async () => {
    setLoadingExams(true);
    try {
      const merged = new Map<string, ExamData>();

      // Fetch from backend archive
      try {
        const token = await getAuthToken();
        if (token) {
          const resp = await fetch('/api/exams?scope=all', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            for (const ex of data.exams || []) {
              if (ex.id) merged.set(ex.id, ex);
            }
          }
        }
      } catch (err) {
        console.warn('Server exams fetch skipped:', err);
      }

      // Fetch from Firestore
      try {
        const querySnapshot = await getDocs(collection(db, 'exams'));
        querySnapshot.forEach((docSnap) => {
          merged.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as ExamData);
        });
      } catch (err) {
        console.warn('Firestore exams fetch skipped:', err);
      }

      setAllExams(Array.from(merged.values()));
    } catch (error) {
      console.error('Error fetching all exams for superadmin:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAllExams();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmittingUser(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Sesi Superadmin tidak valid. Silakan login ulang.');
      }

      const resp = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          displayName: newDisplayName.trim(),
          schoolName: newSchoolName.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan user.');
      }

      setUsers((prev) => [data.user, ...prev]);
      setFormSuccess(`Akun "${data.user.username}" berhasil dibuat dan siap digunakan login.`);
      setNewUsername('');
      setNewEmail('');
      setNewDisplayName('');
      setNewSchoolName('');
      setNewPassword('');
      setNewRole('teacher');
    } catch (err: any) {
      setFormError(err?.message || 'Gagal membuat akun user.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleActive = async (target: RegisteredUser) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !target.active }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsers((prev) => prev.map((u) => (u.id === target.id ? data.user : u)));
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPasswordValue.length < 6) return;
    setResetting(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (resp.ok) {
        setResetTarget(null);
        setResetPasswordValue('');
        alert(`Kata sandi untuk ${resetTarget.username} berhasil diperbarui.`);
      }
    } catch (error) {
      console.error('Reset password error:', error);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (target: RegisteredUser) => {
    if (!confirm(`Hapus akun "${target.username}" secara permanen?`)) return;
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Hapus paket soal ini secara permanen dari server?')) return;
    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`/api/exams/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      await deleteDoc(doc(db, 'exams', id)).catch(() => {});
      setAllExams((prev) => prev.filter((ex) => ex.id !== id));
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Gagal menghapus soal.');
    }
  };

  const totalQuestions = allExams.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-red-500/20 text-red-400 p-2.5 rounded-xl border border-red-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">soalator bogota — Superadmin</h1>
            <p className="text-xs text-slate-400">Manajemen Akun Pengguna & Arsip Soal Sistem</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchUsers();
              fetchAllExams();
            }}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={onBackToApp}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Generator</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Akun Pengguna Terdaftar</span>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-3xl font-extrabold text-white tabular-nums">{users.length} Akun</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Total Paket Ujian Tersimpan</span>
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-3xl font-extrabold text-white tabular-nums">{allExams.length} Paket</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Total Butir Soal Generated</span>
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-3xl font-extrabold text-white tabular-nums">{totalQuestions} Butir</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manajemen Akun Pengguna</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'exams'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Semua Arsip Soal</span>
          </button>
        </div>

        {/* Tab 1: User Management */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create User Form */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
              <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-5">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Daftarkan Akun Baru</h2>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl mb-4">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl mb-4">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Username Login *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: budi.santoso"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="budi@sekolah.sch.id"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Asal Sekolah / Unit</label>
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="Contoh: SD Bogota"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Peran</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as 'teacher' | 'superadmin')}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="teacher">Guru / User</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Kata Sandi *</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition shadow disabled:opacity-50"
                >
                  {submittingUser ? 'Menyimpan...' : 'Buat Akun Pengguna'}
                </button>
              </form>
            </div>

            {/* Registered Users Table */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-base font-bold">Daftar Pengguna Terdaftar</h2>
                <span className="text-xs text-slate-400 tabular-nums">{users.length} pengguna</span>
              </div>

              {loadingUsers ? (
                <div className="text-center py-16 text-slate-400 text-sm">Memuat daftar pengguna...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-16 px-6 text-slate-400 text-sm">
                  Belum ada akun user terdaftar. Gunakan formulir di samping untuk membuat akun username dan kata sandi bagi guru.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                        <th className="p-4">Nama & Sekolah</th>
                        <th className="p-4">Username / Email</th>
                        <th className="p-4">Peran</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <p className="font-semibold text-white">{u.displayName}</p>
                            <p className="text-xs text-slate-400">{u.schoolName || '-'}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-xs text-blue-300">{u.username}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-300">
                            {u.role === 'superadmin' ? 'Superadmin' : 'Guru / User'}
                          </td>
                          <td className="p-4 text-xs">
                            {u.active ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                                <Ban className="w-3.5 h-3.5" />
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setResetTarget(u);
                                  setResetPasswordValue('');
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition inline-flex items-center gap-1"
                                title="Reset Kata Sandi"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Sandi</span>
                              </button>
                              <button
                                onClick={() => handleToggleActive(u)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                              >
                                {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Exams Archive */}
        {activeTab === 'exams' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold">Semua Arsip Ujian Pengguna</h2>
              <span className="text-xs text-slate-400 tabular-nums">{allExams.length} paket</span>
            </div>

            {loadingExams ? (
              <div className="text-center py-16 text-slate-400 text-sm">Memuat data dari database...</div>
            ) : allExams.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">Belum ada data ujian yang tersimpan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                      <th className="p-4">Judul Ujian</th>
                      <th className="p-4">Sekolah & Mata Pelajaran</th>
                      <th className="p-4">Kelas</th>
                      <th className="p-4">Jumlah Soal</th>
                      <th className="p-4">Tanggal Dibuat</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {allExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-white">{exam.title}</td>
                        <td className="p-4 text-slate-300">
                          {exam.schoolIdentity?.namaSekolah} <br />
                          <span className="text-xs text-blue-400 font-medium">{exam.schoolIdentity?.mataPelajaran}</span>
                        </td>
                        <td className="p-4 text-slate-300">{exam.schoolIdentity?.kelas || '-'}</td>
                        <td className="p-4 font-semibold text-indigo-300 tabular-nums">
                          {exam.questions?.length || 0} Butir
                        </td>
                        <td className="p-4 text-slate-400 text-xs tabular-nums">
                          {exam.createdAt ? new Date(exam.createdAt).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => onLoadExam(exam)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            Buka
                          </button>
                          <button
                            onClick={() => {
                              if (exam.id) handleDeleteExam(exam.id);
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Reset Kata Sandi</h3>
            <p className="text-xs text-slate-400">
              Masukkan kata sandi baru untuk akun <strong className="text-white">{resetTarget.username}</strong>.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input
                type="text"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                required
                minLength={6}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold"
                >
                  {resetting ? 'Menyimpan...' : 'Simpan Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
