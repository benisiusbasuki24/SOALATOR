import React, { useEffect, useState } from 'react';
import { SchoolIdentity, ExamSettings } from '../types';
import { Check, Loader2, AlertCircle, ArrowLeft, Eye, RotateCcw } from 'lucide-react';

export interface GenerationStepState {
  step: number;
  title: string;
  description: string;
}

export interface GenerationProgressState {
  currentStep: number;
  statusMessage: string;
  progress: number;
  draftedCount: number;
  totalTarget: number;
  latestPreview: string;
  charsReceived: number;
  status: 'running' | 'completed' | 'error';
  errorMessage?: string;
}

interface GenerationProcessViewProps {
  schoolIdentity: SchoolIdentity;
  settings: ExamSettings;
  state: GenerationProgressState;
  onCancel: () => void;
  onRetry: () => void;
  onViewResult: () => void;
  autoSaved: boolean;
}

const STEPS: GenerationStepState[] = [
  {
    step: 1,
    title: 'Analisis Materi & Nilai Kebopkrian',
    description: 'Memetakan topik utama serta mengintegrasikan nilai Kasih, Integritas, dan Pelayanan yang Tulus.',
  },
  {
    step: 2,
    title: 'Penyusunan Matriks Kisi-Kisi',
    description: 'Merumuskan capaian pembelajaran, indikator soal, dan level kognitif (C1–C6).',
  },
  {
    step: 3,
    title: 'Penulisan Butir Soal & Stimulus Deep Learning',
    description: 'Menyusun pertanyaan, konteks masalah, serta opsi jawaban sesuai komposisi HOTS, MOTS, dan LOTS.',
  },
  {
    step: 4,
    title: 'Penyusunan Kunci Jawaban, Pembahasan & Skoring',
    description: 'Melengkapi pembahasan terperinci dan bobot penilaian tiap butir soal.',
  },
  {
    step: 5,
    title: 'Finalisasi & Penyimpanan Arsip',
    description: 'Menyimpan paket naskah ujian ke akun pengguna dan menyiapkan pratinjau cetak.',
  },
];

const MODEL_LABELS: Record<ExamSettings['selectedModel'], string> = {
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  chatgpt: 'OpenAI ChatGPT',
};

export const GenerationProcessView: React.FC<GenerationProcessViewProps> = ({
  schoolIdentity,
  settings,
  state,
  onCancel,
  onRetry,
  onViewResult,
  autoSaved,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (state.status !== 'running') return;
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [state.status]);

  const modelLabel = MODEL_LABELS[settings.selectedModel] || 'Google Gemini';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header & Main Progress Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-blue-600 tracking-wide">
              {state.status === 'running'
                ? 'Sedang Memproses'
                : state.status === 'completed'
                ? 'Proses Selesai'
                : 'Terjadi Kendala'}
            </p>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-balance">
              {state.status === 'running'
                ? 'Proses Pembuatan Soal Ujian'
                : state.status === 'completed'
                ? 'Naskah Soal Berhasil Disusun'
                : 'Pembuatan Soal Terhenti'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{settings.examCategory}</span>
              <span aria-hidden="true">·</span>
              <span>{schoolIdentity.mataPelajaran}</span>
              <span aria-hidden="true">·</span>
              <span>Kelas {schoolIdentity.kelas}</span>
              <span aria-hidden="true">·</span>
              <span>{modelLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {state.status === 'running' && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Batalkan</span>
              </button>
            )}

            {state.status === 'completed' && (
              <button
                type="button"
                onClick={onViewResult}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors whitespace-nowrap shadow-sm"
              >
                <Eye className="w-4 h-4" />
                <span>Buka Pratinjau Soal</span>
              </button>
            )}

            {state.status === 'error' && (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Coba Lagi</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar & Key Figures */}
        <div className="py-6 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-slate-700">
              {state.status === 'error' ? state.errorMessage || 'Proses gagal diselesaikan.' : state.statusMessage}
            </span>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-mono tabular-nums">
              <span>{elapsedSeconds.toFixed(1)} dtk</span>
              <span className="font-semibold text-slate-900 text-sm">{state.progress}%</span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                state.status === 'error'
                  ? 'bg-red-600'
                  : state.status === 'completed'
                  ? 'bg-emerald-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="tabular-nums">
              Butir soal tersusun: <strong className="text-slate-800">{state.draftedCount}</strong> dari{' '}
              <strong className="text-slate-800">{state.totalTarget}</strong> butir
            </span>
            {state.status === 'completed' && (
              <span className="text-emerald-700 font-medium">
                {autoSaved ? 'Tersimpan otomatis ke arsip akun' : 'Siap untuk pratinjau dan pengeditan'}
              </span>
            )}
          </div>
        </div>

        {/* Two-column body: Stages + Live Draft & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Left: 5-Stage Pipeline */}
          <div className="lg:col-span-7 space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Tahapan Penyusunan Soal</h3>

            <ol className="space-y-4">
              {STEPS.map((item) => {
                const isDone =
                  state.status === 'completed' || state.currentStep > item.step;
                const isActive =
                  state.status === 'running' && state.currentStep === item.step;
                const isFailed =
                  state.status === 'error' && state.currentStep === item.step;

                return (
                  <li key={item.step} className="flex items-start gap-3.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold tabular-nums border ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : isFailed
                          ? 'bg-red-600 border-red-600 text-white'
                          : isActive
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4" />
                      ) : isFailed ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        item.step
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            isDone || isActive ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span
                          className={`text-xs font-medium shrink-0 ${
                            isDone
                              ? 'text-emerald-700'
                              : isFailed
                              ? 'text-red-600'
                              : isActive
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {isDone
                            ? 'Selesai'
                            : isFailed
                            ? 'Gagal'
                            : isActive
                            ? 'Diproses'
                            : 'Menunggu'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>

                      {item.step === 3 && (isActive || (isDone && state.latestPreview)) && (
                        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Draf Soal Terkini</span>
                            <span className="font-mono tabular-nums">
                              {state.draftedCount}/{state.totalTarget} butir
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {state.latestPreview
                              ? `${state.latestPreview}...`
                              : 'Menyiapkan struktur pertanyaan dan indikator soal...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Right: Configuration Summary */}
          <div className="lg:col-span-5 space-y-5 lg:border-l lg:border-slate-200 lg:pl-8">
            <h3 className="text-sm font-bold text-slate-900">Ringkasan Spesifikasi Ujian</h3>

            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Sekolah</dt>
                <dd className="font-semibold text-slate-800 text-right">{schoolIdentity.namaSekolah}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Mata Pelajaran</dt>
                <dd className="font-semibold text-slate-800 text-right">{schoolIdentity.mataPelajaran}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Jenis Ujian</dt>
                <dd className="font-semibold text-slate-800 text-right">{settings.examCategory}</dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Kelas / Semester</dt>
                <dd className="font-semibold text-slate-800 text-right">
                  {schoolIdentity.kelas} / {schoolIdentity.semester}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">KKM</dt>
                <dd className="font-semibold text-slate-800 font-mono tabular-nums text-right">
                  {schoolIdentity.kkm}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Total Target Soal</dt>
                <dd className="font-bold text-blue-700 font-mono tabular-nums text-right">
                  {settings.totalSoal} butir
                </dd>
              </div>
            </dl>

            <div className="pt-2 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-700">Distribusi Jenis & Level Kognitif</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
                {settings.selectedTypes.map((type) => {
                  const cfg = settings.typeSettings[type] || { hotsCount: 0, motsCount: 0, lotsCount: 0, total: 0 };
                  return (
                    <div key={type} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800">{type}</span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        HOTS {cfg.hotsCount} · MOTS {cfg.motsCount} · LOTS {cfg.lotsCount} ({cfg.total})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
