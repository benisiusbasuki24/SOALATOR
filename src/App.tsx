import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ExamForm } from './components/ExamForm';
import { ExamPreview } from './components/ExamPreview';
import { SavedExamsModal } from './components/SavedExamsModal';
import { AuthLanding } from './components/AuthLanding';
import { SuperadminDashboard } from './components/SuperadminDashboard';
import { GenerationProcessView, GenerationProgressState } from './components/GenerationProcessView';
import { SchoolIdentity, ExamSettings, ExamData } from './types';
import { db, auth, onAuthStateChanged, testConnection, User } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';

interface PendingGenerationRequest {
  schoolIdentity: SchoolIdentity;
  settings: ExamSettings;
  materialText: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [view, setView] = useState<'form' | 'generating' | 'preview' | 'superadmin'>('form');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentExam, setCurrentExam] = useState<ExamData | null>(null);
  const [savedExams, setSavedExams] = useState<ExamData[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);
  const [pendingRequest, setPendingRequest] = useState<PendingGenerationRequest | null>(null);
  const [autoSaved, setAutoSaved] = useState<boolean>(false);
  const [generationState, setGenerationState] = useState<GenerationProgressState>({
    currentStep: 1,
    statusMessage: 'Mempersiapkan proses penyusunan soal...',
    progress: 5,
    draftedCount: 0,
    totalTarget: 10,
    latestPreview: '',
    charsReceived: 0,
    status: 'running',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoRedirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    testConnection().catch(console.warn);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
      if (currentUser) {
        const superadminEmails = ['ppdb.sdbogota@gmail.com'];
        const isSuper = superadminEmails.includes(currentUser.email || '');
        if (!isSuper) {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'superadmin') {
              setIsSuperadmin(true);
            } else {
              setIsSuperadmin(false);
            }
          } catch {
            setIsSuperadmin(false);
          }
        } else {
          setIsSuperadmin(true);
        }

        fetchSavedExams(currentUser.uid);
      } else {
        setSavedExams([]);
        setIsSuperadmin(false);
      }
    });

    return () => {
      unsubscribe();
      if (autoRedirectTimerRef.current) {
        window.clearTimeout(autoRedirectTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchSavedExams = async (uid: string) => {
    try {
      const q = query(collection(db, 'exams'), where('userId', '==', uid));
      const querySnapshot = await getDocs(q);
      const examsList: ExamData[] = [];
      querySnapshot.forEach((docSnap) => {
        examsList.push({ id: docSnap.id, ...docSnap.data() } as ExamData);
      });
      setSavedExams(examsList);
    } catch (error) {
      console.error('Error fetching saved exams:', error);
    }
  };

  const tryAutoSaveExam = async (examToSave: ExamData): Promise<ExamData> => {
    if (!user) return examToSave;
    try {
      const examPayload = {
        ...examToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      const savePromise = addDoc(collection(db, 'exams'), examPayload);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore save timeout')), 5000)
      );
      const docRef = await Promise.race([savePromise, timeoutPromise]);
      const savedWithId = { ...examPayload, id: docRef.id };
      setSavedExams((prev) => [savedWithId, ...prev]);
      setAutoSaved(true);
      return savedWithId;
    } catch (error) {
      console.warn('Auto-save skipped or offline:', error);
      return examToSave;
    }
  };

  const handleGenerate = async (
    schoolIdentity: SchoolIdentity,
    settings: ExamSettings,
    materialText: string
  ) => {
    if (autoRedirectTimerRef.current) {
      window.clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPendingRequest({ schoolIdentity, settings, materialText });
    setAutoSaved(false);
    setIsLoading(true);
    setGenerationState({
      currentStep: 1,
      statusMessage: 'Memulai analisis materi & pemetaan nilai Kebopkrian...',
      progress: 8,
      draftedCount: 0,
      totalTarget: settings.totalSoal || 10,
      latestPreview: '',
      charsReceived: 0,
      status: 'running',
    });
    setView('generating');

    try {
      const userApiKey = localStorage.getItem('user_gemini_api_key') || '';
      const response = await fetch('/api/generate-soal-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': userApiKey,
        },
        body: JSON.stringify({ schoolIdentity, settings, materialText }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errText = await response.text();
        throw new Error(errText || 'Gagal terhubung ke layanan penyusunan soal.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let completedExamPayload: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const rawEvents = buffer.split('\n\n');
        buffer = rawEvents.pop() || '';

        for (const rawEvent of rawEvents) {
          const lines = rawEvent.split('\n');
          let eventType = 'message';
          let dataLine = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLine += line.slice(5).trim();
            }
          }

          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine);

            if (eventType === 'step') {
              setGenerationState((prev) => ({
                ...prev,
                currentStep: payload.step ?? prev.currentStep,
                statusMessage: payload.message || prev.statusMessage,
                progress: payload.progress ?? prev.progress,
              }));
            } else if (eventType === 'progress') {
              setGenerationState((prev) => ({
                ...prev,
                currentStep: 3,
                draftedCount: payload.draftedCount ?? prev.draftedCount,
                totalTarget: payload.totalTarget ?? prev.totalTarget,
                latestPreview: payload.latestPreview || prev.latestPreview,
                charsReceived: payload.charsReceived ?? prev.charsReceived,
                progress: payload.progress ?? prev.progress,
                statusMessage: `Menyusun butir soal ke-${payload.draftedCount || 1} dari ${
                  payload.totalTarget || prev.totalTarget
                }...`,
              }));
            } else if (eventType === 'complete') {
              completedExamPayload = payload.exam;
            } else if (eventType === 'error') {
              throw new Error(payload.error || 'Terjadi kesalahan saat memproses soal.');
            }
          } catch (parseErr: any) {
            if (eventType === 'error') {
              throw parseErr;
            }
          }
        }
      }

      if (!completedExamPayload) {
        throw new Error('Hasil penyusunan soal belum diterima secara lengkap.');
      }

      const rawExam: ExamData = {
        title:
          completedExamPayload.title ||
          `${settings.examCategory} ${schoolIdentity.mataPelajaran} - ${schoolIdentity.namaSekolah}`,
        schoolIdentity,
        settings,
        materialSummary: materialText.slice(0, 300),
        questions: completedExamPayload.questions || [],
        createdAt: new Date().toISOString(),
        userId: user ? user.uid : 'guest',
      };

      const savedOrRawExam = await tryAutoSaveExam(rawExam);
      setCurrentExam(savedOrRawExam);

      setGenerationState((prev) => ({
        ...prev,
        currentStep: 5,
        status: 'completed',
        progress: 100,
        draftedCount: savedOrRawExam.questions.length,
        totalTarget: savedOrRawExam.questions.length,
        statusMessage: 'Seluruh naskah soal, kisi-kisi, kunci jawaban, dan pembahasan telah selesai disusun.',
      }));

      autoRedirectTimerRef.current = window.setTimeout(() => {
        setView((currentView) => (currentView === 'generating' ? 'preview' : currentView));
      }, 1500);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Generation error:', error);
      setGenerationState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: error?.message || 'Terjadi kesalahan saat menyusun soal.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelGeneration = () => {
    if (autoRedirectTimerRef.current) {
      window.clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setView('form');
  };

  const handleRetryGeneration = () => {
    if (pendingRequest) {
      handleGenerate(
        pendingRequest.schoolIdentity,
        pendingRequest.settings,
        pendingRequest.materialText
      );
    }
  };

  const handleSaveExam = async (examToSave: ExamData) => {
    if (!user) {
      alert('Silakan masuk terlebih dahulu.');
      return;
    }

    try {
      const examPayload = {
        ...examToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'exams'), examPayload);
      const savedWithId = { ...examPayload, id: docRef.id };
      setCurrentExam(savedWithId);
      setSavedExams((prev) => [savedWithId, ...prev]);
      alert('Soal ujian berhasil disimpan ke akun Anda!');
    } catch (error) {
      console.error('Error saving exam:', error);
      throw error;
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exams', id));
      setSavedExams((prev) => prev.filter((ex) => ex.id !== id));
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Gagal menghapus arsip soal.');
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthLanding />;
  }

  if (view === 'superadmin' && isSuperadmin) {
    return (
      <SuperadminDashboard
        onBackToApp={() => setView('form')}
        onLoadExam={(exam) => {
          setCurrentExam(exam);
          setView('preview');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 flex flex-col font-sans">
      <Navbar
        onOpenSavedExams={() => setIsSavedModalOpen(true)}
        savedCount={savedExams.length}
        isSuperadmin={isSuperadmin}
        onOpenSuperadmin={() => setView('superadmin')}
      />

      <main className="flex-1">
        {view === 'form' && (
          <ExamForm onGenerate={handleGenerate} isLoading={isLoading} />
        )}

        {view === 'generating' && pendingRequest && (
          <GenerationProcessView
            schoolIdentity={pendingRequest.schoolIdentity}
            settings={pendingRequest.settings}
            state={generationState}
            onCancel={handleCancelGeneration}
            onRetry={handleRetryGeneration}
            onViewResult={() => {
              if (autoRedirectTimerRef.current) {
                window.clearTimeout(autoRedirectTimerRef.current);
                autoRedirectTimerRef.current = null;
              }
              setView('preview');
            }}
            autoSaved={autoSaved}
          />
        )}

        {view === 'preview' && currentExam && (
          <ExamPreview
            exam={currentExam}
            onSave={handleSaveExam}
            onBack={() => setView('form')}
            onUpdateExam={(updated) => setCurrentExam(updated)}
          />
        )}
      </main>

      <SavedExamsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        exams={savedExams}
        onLoadExam={(exam) => {
          setCurrentExam(exam);
          setView('preview');
        }}
        onDeleteExam={handleDeleteExam}
      />

      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
        <p>© 2026 soalator bogota — Didukung oleh Google Gemini 2.5 Flash & Kurikulum Deep Learning</p>
      </footer>
    </div>
  );
}
