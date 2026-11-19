import React from 'react';
import { ExamData } from '../types';
import { X, FolderOpen, Trash2, Calendar, BookOpen, ChevronRight } from 'lucide-react';

interface SavedExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: ExamData[];
  onLoadExam: (exam: ExamData) => void;
  onDeleteExam: (id: string) => void;
}

export const SavedExamsModal: React.FC<SavedExamsModalProps> = ({
  isOpen,
  onClose,
  exams,
  onLoadExam,
  onDeleteExam,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-xl">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Arsip Soal Tersimpan</h3>
              <p className="text-xs text-slate-400">Daftar paket soal ujian yang tersimpan di akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {exams.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm font-medium">Belum ada arsip soal yang tersimpan.</p>
              <p className="text-slate-500 text-xs">Simpan hasil generate soal untuk mengaksesnya kembali di sini.</p>
            </div>
          ) : (
            exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 hover:bg-slate-800 transition flex items-center justify-between group"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <h4 className="font-bold text-base text-white group-hover:text-blue-400 transition">
                    {exam.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="bg-slate-700 px-2.5 py-0.5 rounded-md font-medium text-slate-300">
                      {exam.schoolIdentity?.mataPelajaran || 'Umum'}
                    </span>
                    <span>Kelas: {exam.schoolIdentity?.kelas || '-'}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('id-ID') : '-'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      onLoadExam(exam);
                      onClose();
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow transition"
                  >
                    <span>Buka</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Apakah Anda yakin ingin menghapus arsip soal ini?')) {
                        if (exam.id) onDeleteExam(exam.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
