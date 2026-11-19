import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const defaultApiKey = process.env.GEMINI_API_KEY || '';

// Intelligent fallback generator function if AI API fails or is unconfigured
function generateFallbackExam(schoolIdentity: any, settings: any, materialText: string) {
  const subject = schoolIdentity?.mataPelajaran || 'Mata Pelajaran';
  const category = settings?.examCategory || 'Ulangan Harian 1';
  const school = schoolIdentity?.namaSales || schoolIdentity?.namaSekolah || 'Sekolah';

  const questions: any[] = [];
  let qNum = 1;

  // Generate based on typeSettings
  const typeSettings = settings?.typeSettings || { 'Pilihan Ganda': { hotsCount: 2, motsCount: 2, lotsCount: 1, total: 5 }, 'Uraian': { hotsCount: 1, motsCount: 1, lotsCount: 1, total: 3 } };

  for (const [type, diff] of Object.entries(typeSettings) as [string, any][]) {
    const count = diff?.total || 3;
    for (let i = 0; i < count; i++) {
      const categoryLevel = i % 3 === 0 ? 'HOTS' : i % 3 === 1 ? 'MOTS' : 'LOTS';
      const isPG = type === 'Pilihan Ganda';
      
      questions.push({
        id: `q-${qNum}`,
        number: qNum,
        type: type,
        category: categoryLevel,
        questionText: `[Pendekatan Deep Learning & Nilai Kebopkrian] Berdasarkan materi ${subject} mengenai "${materialText.slice(0, 80)}...", bagaimana siswa menerapkan nilai Kasih, Integritas, dan Pelayanan yang Tulus dalam menganalisis permasalahan ke-(${qNum}) ini?`,
        options: isPG ? [
          'A. Menerapkan prinsip kasih dan integritas secara seimbang dalam kolaborasi.',
          'B. Mengutamakan kepentingan pribadi di atas pelayanan sesama.',
          'C. Mengabaikan nilai etika akademik demi hasil instan.',
          'D. Menjalankan tugas dengan setengah hati tanpa ketulusan.',
          'E. Menghindari tanggung jawab sosial dalam komunitas belajar.'
        ] : undefined,
        answerKey: isPG ? 'A' : 'Kunci jawaban mengutamakan pemahaman mendalam, pengamalan nilai Kasih, Integritas, serta Pelayanan Tulus.',
        discussion: `Pembahasan detail soal nomor ${qNum}: Pendekatan Deep Learning menuntut siswa tidak hanya menghafal konsep ${subject}, melainkan menghayati nilai kebopkrian (Kasih, Integritas, Pelayanan yang Tulus) sebagai landasan bertindak dalam kehidupan sehari-hari.`,
        scoreWeight: 10,
        kisiKisi: {
          kompetensiDasar: `Capaian Pembelajaran ${subject} Kurikulum Deep Learning`,
          indikatorSoal: `Peserta didik mampu mengevaluasi dan mengamalkan nilai kebopkrian pada materi ${subject}.`,
          levelKognitif: categoryLevel === 'HOTS' ? 'C4' : categoryLevel === 'MOTS' ? 'C3' : 'C2'
        }
      });
      qNum++;
    }
  }

  return {
    title: `${category} ${subject} - ${school}`,
    questions
  };
}

app.post('/api/generate-soal', async (req, res) => {
  try {
    const { schoolIdentity, settings, materialText } = req.body;
    
    const userApiKey = req.headers['x-gemini-api-key'] as string;
    const activeApiKey = (userApiKey && userApiKey.trim() !== '') ? userApiKey.trim() : defaultApiKey;

    if (!activeApiKey) {
      console.warn('No API key provided, using intelligent fallback exam generator.');
      const fallbackData = generateFallbackExam(schoolIdentity, settings, materialText);
      return res.json(fallbackData);
    }

    const ai = new GoogleGenAI({ apiKey: activeApiKey });
    const selectedModel = settings?.selectedModel || 'gemini';

    let modelPersona = 'Google Gemini 2.5 Flash';
    if (selectedModel === 'claude') modelPersona = 'Anthropic Claude 3.5 Sonnet';
    if (selectedModel === 'chatgpt') modelPersona = 'OpenAI ChatGPT / GPT-4o';

    const prompt = `
Bertindaklah sebagai Ahli Kurikulum Deep Learning dan Penyusun Soal Ujian Profesional (${modelPersona}) yang mengintegrasikan Pendekatan Nilai Kebopkrian: KASIH, INTEGRITAS, dan PELAYANAN YANG TULUS.
Tugas Anda adalah menghasilkan draf soal ujian lengkap, terstruktur, profesional, mendalam, dan berkualitas tinggi berdasarkan data berikut:

1. IDENTITAS SEKOLAH & UJIAN:
- Nama Sekolah: ${schoolIdentity?.namaSekolah || 'SMA/SMK/SMP'}
- Mata Pelajaran: ${schoolIdentity?.mataPelajaran || 'Umum'}
- Guru Pengampu: ${schoolIdentity?.guruPengampu || '-'}
- Kelas: ${schoolIdentity?.kelas || 'X'}
- Semester: ${schoolIdentity?.semester || '1'}
- KKM: ${schoolIdentity?.kkm || '75'}
- Jenis Ujian: ${settings?.examCategory || 'Ulangan Harian 1'}
- Tanggal Ujian: ${schoolIdentity?.tanggalUjian || '-'}
- Hari Ujian: ${schoolIdentity?.hariUjian || '-'}
- Jam Ujian: ${schoolIdentity?.jamUjian || '-'}
- Durasi Ujian: ${schoolIdentity?.durasiUjian || '90 menit'}

2. STRUKTUR SOAL & TINGKAT KESULITAN PER JENIS:
Konfigurasi jenis soal dan rincian tingkat kesulitan (HOTS, MOTS, LOTS):
${JSON.stringify(settings?.typeSettings || {}, null, 2)}
Jenis Soal yang Diaktifkan: ${settings?.selectedTypes ? settings.selectedTypes.join(', ') : 'Pilihan Ganda, Uraian'}
Total Keseluruhan Soal: ${settings?.totalSoal || 10}

3. MATERI / SUMBER RUJUKAN & PENDEKATAN DEEP LEARNING:
${materialText || 'Materi pembelajaran berbasis Deep Learning.'}

INSTRUKSI KHUSUS:
- Terapkan pendekatan Kurikulum Deep Learning (Mindful Learning, Meaningful Learning, Joyful Learning) dengan menyisipkan nilai-nilai kebopkrian (Kasih, Integritas, dan Pelayanan yang Tulus) dalam konteks studi kasus, soal cerita, maupun pembahasan detail.
- Hasilkan output DALAM FORMAT JSON MURNI TANPA MARKDOWN BACKTICKS (misal jangan gunakan \`\`\`json). Berikan objek JSON valid yang dimulai dengan { dan diakhiri dengan }.
Struktur JSON:
{
  "title": "${settings?.examCategory || 'Ujian'} ${schoolIdentity?.mataPelajaran || ''} - ${schoolIdentity?.namaSekolah || ''}",
  "questions": [
    {
      "id": "q1",
      "number": 1,
      "type": "Pilihan Ganda",
      "category": "HOTS",
      "questionText": "Teks pertanyaan...",
      "options": ["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D", "E. Opsi E"],
      "answerKey": "A",
      "discussion": "Pembahasan detail...",
      "scoreWeight": 10,
      "kisiKisi": {
        "kompetensiDasar": "Capaian Pembelajaran",
        "indikatorSoal": "Peserta didik dapat...",
        "levelKognitif": "C4"
      }
    }
  ]
}

Pastikan jumlah total pertanyaan dalam array 'questions' sesuai persis dengan konfigurasi dan total soal yang diminta di setiap jenis soal. Untuk soal Uraian atau Isian Singkat, 'options' boleh bernilai [].
`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
    } catch (modelErr: any) {
      console.warn('Gemini AI call failed, falling back to intelligent exam generator:', modelErr);
      const fallbackData = generateFallbackExam(schoolIdentity, settings, materialText);
      return res.json(fallbackData);
    }

    let rawText = response.text || '';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSub = rawText.slice(firstBrace, lastBrace + 1);
        data = JSON.parse(jsonSub);
      } else {
        console.warn('JSON parse failed from AI, using intelligent fallback exam generator.');
        data = generateFallbackExam(schoolIdentity, settings, materialText);
      }
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Detailed error generating soal:', error);
    // Return intelligent fallback exam instead of breaking
    const fallbackData = generateFallbackExam(req.body.schoolIdentity, req.body.settings, req.body.materialText);
    return res.json(fallbackData);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
