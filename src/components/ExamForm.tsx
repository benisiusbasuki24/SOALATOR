import React, { useState } from 'react';
import { SchoolIdentity, ExamSettings, TypeDifficulty } from '../types';
import { Sparkles, Upload, FileText, Settings, Building2, CheckSquare, Square, Bot, Cpu } from 'lucide-react';

interface ExamFormProps {
  onGenerate: (schoolIdentity: SchoolIdentity, settings: ExamSettings, materialText: string) => void;
  isLoading: boolean;
}

export const ExamForm: React.FC<ExamFormProps> = ({ onGenerate, isLoading }) => {
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>({
    namaSekolah: 'SMA Negeri 1 Teladan',
    mataPelajaran: 'Matematika Peminatan',
    guruPengampu: 'Drs. H. Budi Santoso, M.Pd.',
    kelas: 'XI MIPA',
    semester: 'Ganjil',
    kkm: '75',
    tanggalUjian: '24 November 2026',
    hariUjian: 'Senin',
    jamUjian: '08.00 - 09.30',
    durasiUjian: '90 Menit',
  });

  const [examCategory, setExamCategory] = useState<string>('Ulangan Harian 1');
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'claude' | 'chatgpt'>('gemini');

  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Pilihan Ganda', 'Uraian']);

  const [typeSettings, setTypeSettings] = useState<{ [key: string]: TypeDifficulty }>({
    'Pilihan Ganda': { hotsCount: 2, motsCount: 3, lotsCount: 2, total: 7 },
    'Isian Singkat': { hotsCount: 1, motsCount: 1, lotsCount: 1, total: 3 },
    'Uraian': { hotsCount: 2, motsCount: 1, lotsCount: 1, total: 4 },
    'Studi Kasus': { hotsCount: 1, motsCount: 0, lotsCount: 0, total: 1 },
  });

  const [materialText, setMaterialText] = useState<string>(
    'Materi: Turunan Fungsi Aljabar dan Penerapannya berbasis Pendekatan Deep Learning. Mengintegrasikan nilai-nilai kebopkrian (Kasih dalam kolaborasi pemecahan masalah, Integritas dalam kejujuran akademik, dan Pelayanan yang Tulus dalam membantu rekan sejawat).'
  );

  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setMaterialText((prev) => prev + '\n\n[Hasil Ekstrak File ' + file.name + ']:\n' + content.slice(0, 5000));
        }
      };
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        setMaterialText((prev) => prev + `\n\n[File Terlampir: ${file.name} - Ukuran: ${(file.size / 1024).toFixed(1)} KB]`);
      }
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleTypeDiffChange = (type: string, field: keyof TypeDifficulty, val: number) => {
    setTypeSettings((prev) => {
      const current = prev[type] || { hotsCount: 0, motsCount: 0, lotsCount: 0, total: 0 };
      const nextVal = Math.max(0, val);
      const updatedType = { ...current, [field]: nextVal };
      if (field !== 'total') {
        updatedType.total = updatedType.hotsCount + updatedType.motsCount + updatedType.lotsCount;
      }
      return { ...prev, [type]: updatedType };
    });
  };

  const totalSoalAll = selectedTypes.reduce((acc, t) => acc + (typeSettings[t]?.total || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalSoalAll <= 0) {
      alert('Total soal keseluruhan minimal 1 butir.');
      return;
    }

    const settings: ExamSettings = {
      examCategory,
      selectedTypes,
      typeSettings,
      totalSoal: totalSoalAll,
      selectedModel,
    };

    onGenerate(schoolIdentity, settings, materialText);
  };

  const loadSampleMaterial = (topic: string) => {
    if (topic === 'matematika') {
      setSchoolIdentity((prev) => ({ ...prev, mataPelajaran: 'Matematika Lanjutan (Deep Learning)' }));
      setMaterialText('Materi: Barisan dan Deret Aritmatika dengan pendekatan Deep Learning & Nilai Kebopkrian (Kasih dalam berbagi perhitungan ekonomi sosial, Integritas dalam pelaporan data, Pelayanan tulus bagi komunitas).');
    } else if (topic === 'biologi') {
      setSchoolIdentity((prev) => ({ ...prev, mataPelajaran: 'Biologi (Deep Learning)' }));
      setMaterialText('Materi: Ekosistem dan Pelestarian Lingkungan hidup berlandaskan nilai Kasih terhadap alam, Integritas dalam riset ekologi, dan Pelayanan tulus menjaga bumi.');
    }
  };

  const questionTypesList = [
    { id: 'Pilihan Ganda', label: 'Soal Pilihan Ganda' },
    { id: 'Isian Singkat', label: 'Soal Isian Singkat' },
    { id: 'Uraian', label: 'Soal Uraian' },
    { id: 'Studi Kasus', label: 'Soal Studi Kasus' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center space-x-3">
            <Sparkles className="w-7 h-7 text-yellow-300" />
            <span>soalator bogota — Kurikulum Deep Learning</span>
          </h2>
          <p className="text-blue-100 text-sm mt-2 max-w-2xl">
            Pendekatan Kurikulum Deep Learning dengan Nilai Kebopkrian (Kasih, Integritas, Pelayanan yang Tulus) lengkap dengan kisi-kisi dan pembahasan mendalam.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs bg-blue-800/80 text-blue-200 px-3 py-1 rounded-full border border-blue-600/50">Kurikulum Deep Learning</span>
            <span className="text-xs bg-indigo-800/80 text-indigo-200 px-3 py-1 rounded-full border border-indigo-600/50">Multi AI Engine</span>
            <span className="text-xs bg-slate-800 text-slate-200 px-3 py-1 rounded-full border border-slate-700">HOTS / MOTS / LOTS</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {/* Section 1: Identitas Sekolah & Jenis Ujian */}
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-5">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">1. Identitas Sekolah & Jenis Ujian</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={schoolIdentity.namaSekolah}
                  onChange={(e) => setSchoolIdentity({ ...schoolIdentity, namaSekolah: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={schoolIdentity.mataPelajaran}
                  onChange={(e) => setSchoolIdentity({ ...schoolIdentity, mataPelajaran: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Pilihan Jenis Ujian</label>
                <select
                  value={examCategory}
                  onChange={(e) => setExamCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Jenis Khusus">
                    <option value="EPB (Evaluasi Pembelajaran Bermakna)">EPB (Evaluasi Pembelajaran Bermakna)</option>
                  </optgroup>
                  <optgroup label="Ulangan Harian">
                    <option value="Ulangan Harian 1">Ulangan Harian 1</option>
                    <option value="Ulangan Harian 2">Ulangan Harian 2</option>
                    <option value="Ulangan Harian 3">Ulangan Harian 3</option>
                    <option value="Ulangan Harian 4">Ulangan Harian 4</option>
                  </optgroup>
                  <optgroup label="Uji Kompetensi">
                    <option value="Uji Kompetensi 1">Uji Kompetensi 1</option>
                    <option value="Uji Kompetensi 2">Uji Kompetensi 2</option>
                    <option value="Uji Kompetensi 3">Uji Kompetensi 3</option>
                    <option value="Uji Kompetensi 4">Uji Kompetensi 4</option>
                  </optgroup>
                  <optgroup label="Asesmen Harian">
                    <option value="Asesmen Harian 1">Asesmen Harian 1</option>
                    <option value="Asesmen Harian 2">Asesmen Harian 2</option>
                    <option value="Asesmen Harian 3">Asesmen Harian 3</option>
                    <option value="Asesmen Harian 4">Asesmen Harian 4</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Guru Pengampu</label>
                <input
                  type="text"
                  value={schoolIdentity.guruPengampu}
                  onChange={(e) => setSchoolIdentity({ ...schoolIdentity, guruPengampu: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={schoolIdentity.kelas}
                    onChange={(e) => setSchoolIdentity({ ...schoolIdentity, kelas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Semester</label>
                  <select
                    value={schoolIdentity.semester}
                    onChange={(e) => setSchoolIdentity({ ...schoolIdentity, semester: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">KKM</label>
                <input
                  type="text"
                  value={schoolIdentity.kkm}
                  onChange={(e) => setSchoolIdentity({ ...schoolIdentity, kkm: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Upload / Materi Deep Learning */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-800">2. Materi & Nilai Kebopkrian (Deep Learning)</h3>
              </div>
              <div className="flex space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => loadSampleMaterial('matematika')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  [Contoh: Matematika]
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleMaterial('biologi')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  [Contoh: Biologi]
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition">
                <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                  <div className="bg-blue-100 text-blue-700 p-3 rounded-xl">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Unggah Dokumen Materi (.txt, .pdf, .docx)</p>
                    <p className="text-xs text-slate-500">{fileName ? `File terpilih: ${fileName}` : 'Atau tempel teks materi di bawah ini'}</p>
                  </div>
                </div>
                <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition">
                  <span>Browse File</span>
                  <input type="file" onChange={handleFileChange} className="hidden" accept=".txt,.pdf,.doc,.docx,.md" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Ringkasan Materi & Integrasi Nilai Kebopkrian (Kasih, Integritas, Pelayanan Tulus)
                </label>
                <textarea
                  rows={5}
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Ketik atau tempel materi pembelajaran berbasis Deep Learning..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pilihan Model AI (Gemini, Claude, ChatGPT) */}
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-5">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">3. Pilih Model AI untuk Penyusunan Soal</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Pilih model AI kecerdasan buatan yang akan menyusun soal, kisi-kisi, dan pembahasan mendalam.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'gemini', name: 'Google Gemini', desc: 'Cepat, cerdas, & didukung multi-model flash.' },
                { id: 'claude', name: 'Anthropic Claude', desc: 'Ahli analisis pedagogis & kedalaman literasi.' },
                { id: 'chatgpt', name: 'OpenAI ChatGPT', desc: 'Pakar format soal HOTS & skenario studi kasus.' },
              ].map((model) => {
                const isActive = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id as any)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{model.name}</span>
                        <Bot className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-xs text-slate-500">{model.desc}</p>
                    </div>
                    <span className={`text-xs font-bold mt-3 inline-block ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                      {isActive ? '✓ Model Dipilih' : 'Klik untuk pilih'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Jenis Soal & Tingkat Kesulitan Dinamis */}
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 mb-5">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">4. Pemilihan Jenis Soal & Konfigurasi Kesulitan</h3>
            </div>

            <div className="space-y-4">
              {questionTypesList.map((qType) => {
                const isSelected = selectedTypes.includes(qType.id);
                const currentDiff = typeSettings[qType.id] || { hotsCount: 1, motsCount: 1, lotsCount: 1, total: 3 };

                return (
                  <div
                    key={qType.id}
                    className={`border rounded-2xl transition overflow-hidden ${
                      isSelected ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div
                      onClick={() => handleTypeToggle(qType.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                        <span className={`font-bold text-base ${isSelected ? 'text-blue-950' : 'text-slate-600'}`}>
                          {qType.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border shadow-sm">
                        {isSelected ? `Aktif (${currentDiff.total} Soal)` : 'Tidak Aktif'}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="p-4 pt-0 border-t border-blue-100 bg-white m-3 rounded-xl shadow-inner space-y-3">
                        <p className="text-xs font-bold uppercase text-blue-800 pt-3">
                          Konfigurasi Tingkat Kesulitan & Jumlah Butir — {qType.label}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                            <label className="block text-xs font-bold text-purple-900 mb-1">HOTS (C4-C6)</label>
                            <input
                              type="number"
                              min={0}
                              value={currentDiff.hotsCount}
                              onChange={(e) => handleTypeDiffChange(qType.id, 'hotsCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-sm font-bold text-purple-900"
                            />
                          </div>

                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                            <label className="block text-xs font-bold text-blue-900 mb-1">MOTS (C3)</label>
                            <input
                              type="number"
                              min={0}
                              value={currentDiff.motsCount}
                              onChange={(e) => handleTypeDiffChange(qType.id, 'motsCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-sm font-bold text-blue-900"
                            />
                          </div>

                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <label className="block text-xs font-bold text-emerald-900 mb-1">LOTS (C1-C2)</label>
                            <input
                              type="number"
                              min={0}
                              value={currentDiff.lotsCount}
                              onChange={(e) => handleTypeDiffChange(qType.id, 'lotsCount', parseInt(e.target.value) || 0)}
                              className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-900"
                            />
                          </div>

                          <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 flex flex-col justify-center">
                            <span className="text-xs font-bold text-slate-600">Total Soal Jenis Ini</span>
                            <span className="text-lg font-extrabold text-blue-600">{currentDiff.total} Butir</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
              <span className="text-sm font-semibold">Total Keseluruhan Butir Soal Ujian:</span>
              <span className="text-xl font-extrabold text-blue-400 bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700">
                {totalSoalAll} Butir Soal
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-xl flex items-center justify-center space-x-3 transition transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyusun Soal via {selectedModel.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>Generate Soal dengan {selectedModel.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
