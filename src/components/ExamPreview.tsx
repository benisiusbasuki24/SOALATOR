import React, { useState } from 'react';
import { ExamData, Question } from '../types';
import { FileText, Printer, Download, BookmarkCheck, Edit3, CheckCircle, ArrowLeft, Trash2, Plus, Sparkles, Layers } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExamPreviewProps {
  exam: ExamData;
  onSave: (exam: ExamData) => void;
  onBack: () => void;
  onUpdateExam: (updated: ExamData) => void;
}

export const ExamPreview: React.FC<ExamPreviewProps> = ({ exam, onSave, onBack, onUpdateExam }) => {
  const [activeTab, setActiveTab] = useState<'soal' | 'kisi' | 'kunci' | 'skoring'>('soal');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...exam.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    onUpdateExam({ ...exam, questions: updatedQuestions });
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: 'q-' + Date.now(),
      number: exam.questions.length + 1,
      type: 'Pilihan Ganda',
      category: 'MOTS',
      questionText: 'Tulis pertanyaan baru di sini...',
      options: ['A. Opsi A', 'B. Opsi B', 'C. Opsi C', 'D. Opsi D', 'E. Opsi E'],
      answerKey: 'A',
      discussion: 'Tulis pembahasan di sini...',
      scoreWeight: 10,
      kisiKisi: {
        kompetensiDasar: 'Kompetensi Dasar / Capaian Pembelajaran',
        indikatorSoal: 'Peserta didik dapat...',
        levelKognitif: 'C3'
      }
    };
    onUpdateExam({ ...exam, questions: [...exam.questions, newQ] });
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = exam.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, number: i + 1 }));
    onUpdateExam({ ...exam, questions: updated });
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      await onSave(exam);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan ke penyimpanan cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('printable-exam-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${exam.title.replace(/\s+/g, '_')}_Ujian.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      window.print();
    }
  };

  const totalScore = exam.questions.reduce((acc, q) => acc + (Number(q.scoreWeight) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali / Buat Baru</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${
              isEditing ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Selesai Edit' : 'Edit Soal'}</span>
          </button>

          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan ke Akun'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF / Cetak</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'soal', label: 'Naskah Soal Ujian', icon: FileText },
          { id: 'kisi', label: 'Kisi-Kisi Soal', icon: Layers },
          { id: 'kunci', label: 'Kunci & Pembahasan', icon: CheckCircle },
          { id: 'skoring', label: 'Rubrik Penilaian', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Printable Area */}
      <div id="printable-exam-area" className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-12 space-y-8">
        {/* Exam Header */}
        <div className="text-center border-b-2 border-slate-900 pb-6">
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase text-slate-900 tracking-wide">
            {exam.schoolIdentity.namaSekolah}
          </h2>
          <h3 className="text-lg font-bold uppercase text-slate-700 mt-1">
            NASKAH SOAL UJIAN {exam.schoolIdentity.mataPelajaran}
          </h3>
          <p className="text-sm font-medium text-slate-600 mt-1">
            SEMESTER {exam.schoolIdentity.semester.toUpperCase()} — TAHUN AJARAN 2026/2027
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 block">KODE / KELAS:</span>
              <span className="font-semibold text-slate-800">{exam.schoolIdentity.kelas}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">HARI / TANGGAL:</span>
              <span className="font-semibold text-slate-800">{exam.schoolIdentity.hariUjian}, {exam.schoolIdentity.tanggalUjian}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">WAKTU / DURASI:</span>
              <span className="font-semibold text-slate-800">{exam.schoolIdentity.jamUjian} ({exam.schoolIdentity.durasiUjian})</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block">KKM:</span>
              <span className="font-semibold text-slate-800">{exam.schoolIdentity.kkm}</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Naskah Soal */}
        {activeTab === 'soal' && (
          <div className="space-y-8">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-xl">
              <h4 className="font-bold text-blue-900 text-sm">Petunjuk Umum:</h4>
              <ul className="list-disc list-inside text-xs text-blue-800 mt-1 space-y-1">
                <li>Perhatikan dan baca setiap soal dengan teliti sebelum menjawab.</li>
                <li>Total terdapat {exam.questions.length} butir soal dengan bobot total {totalScore} poin.</li>
                <li>Dilarang menggunakan kalkulator atau alat bantu hitung kecuali diizinkan.</li>
              </ul>
            </div>

            <div className="space-y-6">
              {exam.questions.map((q, idx) => (
                <div key={q.id || idx} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 relative group">
                  {isEditing && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <select
                        value={q.category}
                        onChange={(e) => handleQuestionChange(idx, 'category', e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold"
                      >
                        <option value="HOTS">HOTS</option>
                        <option value="MOTS">MOTS</option>
                        <option value="LOTS">LOTS</option>
                      </select>
                      <button
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Hapus Soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                        Soal No. {q.number}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                        {q.type}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          q.category === 'HOTS'
                            ? 'bg-purple-100 text-purple-700'
                            : q.category === 'MOTS'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {q.category}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Bobot: {q.scoreWeight} Poin</span>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(idx, 'questionText', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-800 mb-4 font-medium"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium text-base mb-4 whitespace-pre-line leading-relaxed">
                      {q.questionText}
                    </p>
                  )}

                  {q.type === 'Pilihan Ganda' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-slate-700 flex items-start space-x-2">
                          <span className="font-bold text-blue-600">{opt[0]}.</span>
                          <span>{opt.slice(3)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full py-3 border-2 border-dashed border-blue-400 text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 transition flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Butir Soal Baru</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Kisi-Kisi Soal */}
        {activeTab === 'kisi' && (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-slate-900">Matriks Kisi-Kisi Soal Ujian</h3>
              <p className="text-xs text-slate-500">Tabel penyusunan kisi-kisi instrumen penilaian berdasarkan capaian pembelajaran.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 border border-slate-700">No</th>
                    <th className="p-3 border border-slate-700">Kompetensi Dasar / CP</th>
                    <th className="p-3 border border-slate-700">Indikator Soal</th>
                    <th className="p-3 border border-slate-700">Materi</th>
                    <th className="p-3 border border-slate-700">Bentuk</th>
                    <th className="p-3 border border-slate-700">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.questions.map((q, idx) => (
                    <tr key={q.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 border border-slate-200 font-bold text-center">{q.number}</td>
                      <td className="p-3 border border-slate-200">{q.kisiKisi?.kompetensiDasar || '-'}</td>
                      <td className="p-3 border border-slate-200">{q.kisiKisi?.indikatorSoal || '-'}</td>
                      <td className="p-3 border border-slate-200">{exam.schoolIdentity.mataPelajaran}</td>
                      <td className="p-3 border border-slate-200">{q.type}</td>
                      <td className="p-3 border border-slate-200 font-bold text-blue-600">{q.kisiKisi?.levelKognitif || q.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Kunci Jawaban & Pembahasan */}
        {activeTab === 'kunci' && (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-slate-900">Kunci Jawaban dan Pembahasan Detail</h3>
              <p className="text-xs text-slate-500">Penjelasan komprehensif untuk setiap butir soal guna evaluasi hasil belajar siswa.</p>
            </div>

            <div className="space-y-4">
              {exam.questions.map((q, idx) => (
                <div key={q.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
                      Soal No. {q.number} ({q.type})
                    </span>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      Kunci Jawaban: {q.answerKey}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600 line-clamp-2 italic">
                    "{q.questionText}"
                  </p>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500 block">Pembahasan Detail:</span>
                    <p className="text-sm text-slate-800 leading-relaxed">{q.discussion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Rubrik Penilaian */}
        {activeTab === 'skoring' && (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-slate-900">Rubrik Skoring & Pedoman Penilaian</h3>
              <p className="text-xs text-slate-500">Panduan perhitungan nilai akhir siswa berdasarkan bobot dan jumlah butir soal.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                <span className="text-xs font-bold uppercase text-blue-600 block mb-1">Total Bobot Nilai</span>
                <span className="text-2xl font-extrabold text-blue-900">{totalScore} Poin</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl">
                <span className="text-xs font-bold uppercase text-indigo-600 block mb-1">Jumlah Butir Soal</span>
                <span className="text-2xl font-extrabold text-indigo-900">{exam.questions.length} Soal</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
                <span className="text-xs font-bold uppercase text-emerald-600 block mb-1">KKM Sekolah</span>
                <span className="text-2xl font-extrabold text-emerald-900">{exam.schoolIdentity.kkm}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Rumus Perhitungan Nilai Akhir Siswa:</h4>
              <div className="bg-white p-4 rounded-xl border font-mono text-sm text-slate-700">
                Nilai Akhir = (Jumlah Skor Perolehan / Total Bobot Maksimal [{totalScore}]) × 100
              </div>
              <p className="text-xs text-slate-600">
                Siswa dinyatakan tuntas apabila nilai akhir mencapai atau melampaui KKM ({exam.schoolIdentity.kkm}). Untuk soal uraian dan studi kasus, guru dapat menggunakan skala penilaian rentang 1-10 atau rubrik holistik sesuai kedalaman jawaban siswa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
