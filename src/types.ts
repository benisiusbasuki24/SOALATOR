export interface SchoolIdentity {
  namaSekolah: string;
  mataPelajaran: string;
  guruPengampu: string;
  kelas: string;
  semester: string;
  kkm: string;
  tanggalUjian: string;
  hariUjian: string;
  jamUjian: string;
  durasiUjian: string;
}

export interface TypeDifficulty {
  hotsCount: number;
  motsCount: number;
  lotsCount: number;
  total: number;
}

export interface ExamSettings {
  examCategory: string;
  selectedTypes: string[];
  typeSettings: {
    [key: string]: TypeDifficulty;
  };
  totalSoal: number;
  selectedModel: 'gemini' | 'claude' | 'chatgpt';
}

export interface KisiKisiItem {
  kompetensiDasar: string;
  indikatorSoal: string;
  levelKognitif: string;
}

export interface Question {
  id: string;
  number: number;
  type: 'Pilihan Ganda' | 'Isian Singkat' | 'Uraian' | 'Studi Kasus';
  category: 'HOTS' | 'MOTS' | 'LOTS';
  questionText: string;
  options?: string[];
  answerKey: string;
  discussion: string;
  scoreWeight: number;
  kisiKisi: KisiKisiItem;
}

export interface ExamData {
  id?: string;
  userId?: string;
  title: string;
  schoolIdentity: SchoolIdentity;
  settings: ExamSettings;
  materialSummary: string;
  questions: Question[];
  createdAt: string;
  updatedAt?: string;
}
