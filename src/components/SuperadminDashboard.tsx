import React, { useEffect, useState } from 'react';
import { ExamData } from '../types';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ShieldAlert, BookOpen, Trash2, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

interface SuperadminDashboardProps {
  onBackToApp: () => void;
  onLoadExam: (exam: ExamData) => void;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ onBackToApp, onLoadExam }) => {
  const [allExams, setAllExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllExams = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'exams'));
      const list: ExamData[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ExamData);
      });
      setAllExams(list);
    } catch (error) {
      console.error('Error fetching all exams for superadmin:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllExams();
  }, []);

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Hapus paket soal ini secara permanen dari server?')) return;
    try {
      await deleteDoc(doc(db, 'exams', id));
      setAllExams((prev) => prev.filter((ex) => ex.id !== id));
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Gagal menghapus soal.');
    }
  };

  const totalQuestions = allExams.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-red-500/20 text-red-400 p-2.5 rounded-xl border border-red-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">soalator bogota — Superadmin Dashboard</h1>
            <p className="text-xs text-slate-400">Pusat Pengawasan & Manajemen Sistem</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAllExams}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={onBackToApp}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Generator</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Total Soal Tersimpan</span>
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-3xl font-extrabold text-white">{allExams.length} Paket Ujian</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Total Butir Soal Generated</span>
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-3xl font-extrabold text-white">{totalQuestions} Butir</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400">Status Sistem</span>
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-emerald-400 flex items-center space-x-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <span>Normal & Aktif</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold">Semua Arsip Ujian Pengguna</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-medium">
              {allExams.length} Item Database
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Memuat data dari database...</div>
          ) : allExams.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Belum ada data ujian yang tersimpan di server.</div>
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
                    <tr key={exam.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 font-bold text-white">{exam.title}</td>
                      <td className="p-4 text-slate-300">
                        {exam.schoolIdentity?.namaSekolah} <br />
                        <span className="text-xs text-blue-400 font-medium">{exam.schoolIdentity?.mataPelajaran}</span>
                      </td>
                      <td className="p-4 text-slate-300">{exam.schoolIdentity?.kelas || '-'}</td>
                      <td className="p-4 font-semibold text-indigo-300">{exam.questions?.length || 0} Butir</td>
                      <td className="p-4 text-slate-400 text-xs">
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
                          onClick={() => { if (exam.id) handleDeleteExam(exam.id); }}
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
      </main>
    </div>
  );
};
