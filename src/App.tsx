import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ExamForm } from './components/ExamForm';
import { ExamPreview } from './components/ExamPreview';
import { SavedExamsModal } from './components/SavedExamsModal';
import { AuthLanding } from './components/AuthLanding';
import { SuperadminDashboard } from './components/SuperadminDashboard';
import { SchoolIdentity, ExamSettings, ExamData } from './types';
import { db, auth, onAuthStateChanged, testConnection, User } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [view, setView] = useState<'form' | 'preview' | 'superadmin'>('form');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentExam, setCurrentExam] = useState<ExamData | null>(null);
  const [savedExams, setSavedExams] = useState<ExamData[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);

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

    return () => unsubscribe();
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

  const handleGenerate = async (schoolIdentity: SchoolIdentity, settings: ExamSettings, materialText: string) => {
    setIsLoading(true);
    try {
      const userApiKey = localStorage.getItem('user_gemini_api_key') || '';
      const response = await fetch('/api/generate-soal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': userApiKey,
        },
        body: JSON.stringify({ schoolIdentity, settings, materialText }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Gagal menghasilkan soal ujian.';
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      const newExam: ExamData = {
        title: data.title || `${settings.examCategory} ${schoolIdentity.mataPelajaran} - ${schoolIdentity.namaSekolah}`,
        schoolIdentity,
        settings,
        materialSummary: materialText.slice(0, 300),
        questions: data.questions || [],
        createdAt: new Date().toISOString(),
        userId: user ? user.uid : 'guest',
      };

      setCurrentExam(newExam);
      setView('preview');
    } catch (error: any) {
      console.error('Generation error:', error);
      alert('Terjadi kesalahan saat generate soal: ' + (error.message || error));
    } finally {
      setIsLoading(false);
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
        {view === 'form' ? (
          <ExamForm onGenerate={handleGenerate} isLoading={isLoading} />
        ) : (
          currentExam && (
            <ExamPreview
              exam={currentExam}
              onSave={handleSaveExam}
              onBack={() => setView('form')}
              onUpdateExam={(updated) => setCurrentExam(updated)}
            />
          )
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
