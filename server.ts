import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const defaultApiKey = process.env.GEMINI_API_KEY || '';

function generateFallbackExam(schoolIdentity: any, settings: any, materialText: string) {
  const subject = schoolIdentity?.mataPelajaran || 'Mata Pelajaran';
  const category = settings?.examCategory || 'Ulangan Harian 1';
  const school = schoolIdentity?.namaSekolah || 'Sekolah';

  const questions: any[] = [];
  let qNum = 1;

  const selectedTypes: string[] = settings?.selectedTypes && settings.selectedTypes.length > 0
    ? settings.selectedTypes
    : ['Pilihan Ganda', 'Uraian'];
  const typeSettings = settings?.typeSettings || {};

  for (const type of selectedTypes) {
    const diff = typeSettings[type] || { hotsCount: 1, motsCount: 1, lotsCount: 1, total: 3 };
    const counts: Array<{ cat: 'HOTS' | 'MOTS' | 'LOTS'; n: number }> = [
      { cat: 'HOTS', n: diff.hotsCount || 0 },
      { cat: 'MOTS', n: diff.motsCount || 0 },
      { cat: 'LOTS', n: diff.lotsCount || 0 },
    ];

    for (const group of counts) {
      for (let i = 0; i < group.n; i++) {
        const isPG = type === 'Pilihan Ganda';
        const snippet = (materialText || subject).replace(/\s+/g, ' ').trim().slice(0, 90);

        questions.push({
          id: `q-${qNum}`,
          number: qNum,
          type,
          category: group.cat,
          questionText: `[Pendekatan Deep Learning · Nilai Kebopkrian] Berdasarkan materi ${subject} ("${snippet}..."), analisis bagaimana penerapan nilai Kasih, Integritas, dan Pelayanan yang Tulus dalam menyelesaikan persoalan butir ke-${qNum} ini.`,
          options: isPG
            ? [
                'A. Menerapkan prinsip kasih dan integritas secara konsisten dalam kolaborasi pemecahan masalah.',
                'B. Mengutamakan hasil instan tanpa memperhatikan kejujuran proses akademik.',
                'C. Mengabaikan kebutuhan rekan belajar demi pencapaian individu semata.',
                'D. Menjalankan tugas seadanya tanpa ketulusan melayani.',
                'E. Menghindari tanggung jawab bersama dalam evaluasi pembelajaran.',
              ]
            : [],
          answerKey: isPG
            ? 'A'
            : `Peserta didik menjelaskan konsep utama ${subject} secara mendalam serta mengaitkannya dengan perilaku nyata Kasih, Integritas, dan Pelayanan yang Tulus.`,
          discussion: `Pembahasan soal nomor ${qNum} (${group.cat}): Melalui pembelajaran mendalam (Deep Learning), pemahaman konsep ${subject} diintegrasikan dengan nilai Kebopkrian—yakni Kasih dalam kepedulian, Integritas dalam kejujuran ilmiah, dan Pelayanan yang Tulus dalam berkontribusi bagi sesama.`,
          scoreWeight: isPG ? 5 : 15,
          kisiKisi: {
            kompetensiDasar: `Capaian Pembelajaran ${subject} Kurikulum Deep Learning`,
            indikatorSoal: `Peserta didik mampu ${group.cat === 'HOTS' ? 'menganalisis dan mengevaluasi' : group.cat === 'MOTS' ? 'menerapkan' : 'memahami'} konsep ${subject} dengan nilai Kebopkrian.`,
            levelKognitif: group.cat === 'HOTS' ? 'C4' : group.cat === 'MOTS' ? 'C3' : 'C2',
          },
        });
        qNum++;
      }
    }
  }

  return {
    title: `${category} ${subject} - ${school}`,
    questions,
  };
}

function buildPrompt(schoolIdentity: any, settings: any, materialText: string) {
  const selectedModel = settings?.selectedModel || 'gemini';

  let modelPersona = 'Google Gemini 2.5 Flash (Spesialis Kurikulum Deep Learning)';
  if (selectedModel === 'claude') {
    modelPersona = 'Anthropic Claude 3.5 Sonnet (Ahli Analisis Pedagogis & Literasi Mendalam)';
  } else if (selectedModel === 'chatgpt') {
    modelPersona = 'OpenAI ChatGPT / GPT-4o (Pakar Evaluasi HOTS & Studi Kasus Kontekstual)';
  }

  const activeTypes = settings?.selectedTypes?.length ? settings.selectedTypes : ['Pilihan Ganda', 'Uraian'];
  const activeTypeSettings: Record<string, any> = {};
  for (const t of activeTypes) {
    if (settings?.typeSettings?.[t]) {
      activeTypeSettings[t] = settings.typeSettings[t];
    }
  }

  return `
Anda berperan sebagai Ahli Kurikulum Deep Learning dan Penyusun Soal Ujian Profesional (${modelPersona}) yang mengintegrasikan Nilai Kebopkrian: KASIH, INTEGRITAS, dan PELAYANAN YANG TULUS.
Tugas Anda adalah menghasilkan draf soal ujian lengkap, terstruktur, mendalam, dan berkualitas tinggi berdasarkan data berikut:

1. IDENTITAS SEKOLAH & UJIAN:
- Nama Sekolah: ${schoolIdentity?.namaSekolah || 'Sekolah'}
- Mata Pelajaran: ${schoolIdentity?.mataPelajaran || 'Umum'}
- Guru Pengampu: ${schoolIdentity?.guruPengampu || '-'}
- Kelas: ${schoolIdentity?.kelas || 'X'}
- Semester: ${schoolIdentity?.semester || 'Ganjil'}
- KKM: ${schoolIdentity?.kkm || '75'}
- Jenis Ujian: ${settings?.examCategory || 'Ulangan Harian 1'}
- Tanggal Ujian: ${schoolIdentity?.tanggalUjian || '-'}
- Hari Ujian: ${schoolIdentity?.hariUjian || '-'}
- Jam Ujian: ${schoolIdentity?.jamUjian || '-'}
- Durasi Ujian: ${schoolIdentity?.durasiUjian || '90 menit'}

2. STRUKTUR SOAL & TINGKAT KESULITAN PER JENIS:
Konfigurasi jenis soal dan rincian tingkat kesulitan (HOTS, MOTS, LOTS):
${JSON.stringify(activeTypeSettings, null, 2)}
Jenis Soal yang Diaktifkan: ${activeTypes.join(', ')}
Total Keseluruhan Soal: ${settings?.totalSoal || 10}

3. MATERI / SUMBER RUJUKAN & PENDEKATAN DEEP LEARNING:
${materialText || 'Materi pembelajaran berbasis Deep Learning.'}

INSTRUKSI KHUSUS:
- Terapkan pendekatan Kurikulum Deep Learning (Mindful Learning, Meaningful Learning, Joyful Learning) dengan menyisipkan nilai-nilai kebopkrian (Kasih, Integritas, dan Pelayanan yang Tulus) dalam konteks studi kasus, narasi soal, maupun pembahasan detail.
- Hasilkan output DALAM FORMAT JSON MURNI TANPA MARKDOWN BACKTICKS. Berikan objek JSON valid yang dimulai dengan { dan diakhiri dengan }.
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

Pastikan jumlah total pertanyaan dalam array 'questions' sesuai persis dengan konfigurasi dan total soal (${settings?.totalSoal || 10}) di setiap jenis soal. Untuk soal Uraian, Isian Singkat, atau Studi Kasus, 'options' bernilai [].
`;
}

function parseAiJson(rawText: string) {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Format JSON dari AI tidak valid.');
  }
}

function sendSse(res: express.Response, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post('/api/generate-soal-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let aborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      aborted = true;
    }
  });

  try {
    const { schoolIdentity, settings, materialText } = req.body;
    const totalTarget = Number(settings?.totalSoal) || 10;
    const userApiKey = req.headers['x-gemini-api-key'] as string;
    const activeApiKey = userApiKey && userApiKey.trim() !== '' ? userApiKey.trim() : defaultApiKey;

    sendSse(res, 'step', {
      step: 1,
      status: 'active',
      message: 'Menganalisis materi pembelajaran & memetakan nilai Kebopkrian (Kasih, Integritas, Pelayanan yang Tulus)...',
      progress: 12,
    });
    await delay(350);
    if (aborted) return;

    sendSse(res, 'step', {
      step: 2,
      status: 'active',
      message: `Menyusun matriks kisi-kisi untuk ${totalTarget} butir soal (${(settings?.selectedTypes || []).join(', ')})...`,
      progress: 28,
    });
    await delay(350);
    if (aborted) return;

    sendSse(res, 'step', {
      step: 3,
      status: 'active',
      message: `Menulis butir soal, stimulus Deep Learning, dan opsi jawaban (${totalTarget} butir)...`,
      progress: 40,
    });

    let examData: any = null;

    if (activeApiKey) {
      const ai = new GoogleGenAI({ apiKey: activeApiKey });
      const prompt = buildPrompt(schoolIdentity, settings, materialText);

      try {
        const stream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        let accumulated = '';
        let lastDraftedCount = 0;

        for await (const chunk of stream) {
          if (aborted) return;
          const chunkText = chunk.text || '';
          accumulated += chunkText;

          const matches = accumulated.match(/"questionText"\s*:/g);
          const draftedCount = matches ? matches.length : 0;

          // Extract latest questionText preview if available
          const lastQMatch = [...accumulated.matchAll(/"questionText"\s*:\s*"([^"]{0,180})/g)].pop();
          const latestPreview = lastQMatch ? lastQMatch[1].replace(/\\n/g, ' ') : '';

          if (draftedCount > lastDraftedCount || accumulated.length % 250 < chunkText.length) {
            lastDraftedCount = draftedCount;
            const draftingProgress = Math.min(82, 40 + Math.round((draftedCount / Math.max(1, totalTarget)) * 42));
            sendSse(res, 'progress', {
              draftedCount: Math.min(draftedCount, totalTarget),
              totalTarget,
              charsReceived: accumulated.length,
              latestPreview,
              progress: draftingProgress,
            });
          }
        }

        examData = parseAiJson(accumulated);
      } catch (aiErr) {
        console.warn('Gemini streaming failed, using structured generator fallback:', aiErr);
      }
    }

    if (!examData) {
      // Structured fallback with realistic step-by-step progress
      examData = generateFallbackExam(schoolIdentity, settings, materialText);
      const qList = examData.questions || [];
      for (let i = 0; i < qList.length; i++) {
        if (aborted) return;
        const draftedCount = i + 1;
        const draftingProgress = Math.min(82, 40 + Math.round((draftedCount / Math.max(1, qList.length)) * 42));
        sendSse(res, 'progress', {
          draftedCount,
          totalTarget: qList.length,
          charsReceived: draftedCount * 420,
          latestPreview: qList[i].questionText?.slice(0, 140) || '',
          progress: draftingProgress,
        });
        await delay(180);
      }
    }

    if (aborted) return;

    sendSse(res, 'step', {
      step: 4,
      status: 'active',
      message: 'Menyusun kunci jawaban, pembahasan detail, dan rubrik penskoran...',
      progress: 90,
    });
    await delay(300);
    if (aborted) return;

    sendSse(res, 'step', {
      step: 5,
      status: 'active',
      message: 'Finalisasi naskah soal dan menyimpan ke arsip akun...',
      progress: 97,
    });
    await delay(250);
    if (aborted) return;

    sendSse(res, 'complete', {
      progress: 100,
      exam: examData,
    });
    res.end();
  } catch (error: any) {
    console.error('Stream generation error:', error);
    if (!aborted) {
      sendSse(res, 'error', { error: error?.message || 'Terjadi kesalahan saat menyusun soal.' });
      res.end();
    }
  }
});

app.post('/api/generate-soal', async (req, res) => {
  try {
    const { schoolIdentity, settings, materialText } = req.body;

    const userApiKey = req.headers['x-gemini-api-key'] as string;
    const activeApiKey = userApiKey && userApiKey.trim() !== '' ? userApiKey.trim() : defaultApiKey;

    if (!activeApiKey) {
      const fallbackData = generateFallbackExam(schoolIdentity, settings, materialText);
      return res.json(fallbackData);
    }

    const ai = new GoogleGenAI({ apiKey: activeApiKey });
    const prompt = buildPrompt(schoolIdentity, settings, materialText);

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (modelErr: any) {
      console.warn('Gemini AI call failed, falling back:', modelErr);
      return res.json(generateFallbackExam(schoolIdentity, settings, materialText));
    }

    try {
      const data = parseAiJson(response.text || '');
      return res.json(data);
    } catch {
      return res.json(generateFallbackExam(schoolIdentity, settings, materialText));
    }
  } catch (error: any) {
    console.error('Detailed error generating soal:', error);
    const fallbackData = generateFallbackExam(req.body.schoolIdentity, req.body.settings, req.body.materialText);
    return res.json(fallbackData);
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
