import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');

fs.mkdirSync(DATA_DIR, { recursive: true });

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim() !== '') {
    return process.env.SESSION_SECRET.trim();
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const SESSION_SECRET = getSessionSecret();

function getFirebaseApiKey(): string {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return cfg.apiKey || '';
    }
  } catch {
    // ignore
  }
  return '';
}

const FIREBASE_API_KEY = getFirebaseApiKey();
const SUPERADMIN_EMAILS = ['ppdb.sdbogota@gmail.com', 'soalator.admin@soalator.local'];

interface StoredUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'superadmin';
  schoolName?: string;
  active: boolean;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return `${usedSalt}:${derived}`;
}

function getFirebaseConfig(): { projectId: string; firestoreDatabaseId: string; apiKey: string } {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        projectId: cfg.projectId || '',
        firestoreDatabaseId: cfg.firestoreDatabaseId || '',
        apiKey: cfg.apiKey || '',
      };
    }
  } catch {
    // ignore
  }
  return { projectId: '', firestoreDatabaseId: '', apiKey: '' };
}

const fbConfig = getFirebaseConfig();
const FIRESTORE_REST_BASE = fbConfig.projectId && fbConfig.firestoreDatabaseId
  ? `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/${fbConfig.firestoreDatabaseId}/documents`
  : '';

function parseFirestoreUser(doc: any): StoredUser | null {
  try {
    const fields = doc?.fields;
    if (!fields) return null;
    return {
      id: fields.id?.stringValue || path.basename(doc.name || ''),
      username: fields.username?.stringValue || '',
      email: fields.email?.stringValue || '',
      displayName: fields.displayName?.stringValue || '',
      role: (fields.role?.stringValue === 'superadmin' ? 'superadmin' : 'teacher'),
      schoolName: fields.schoolName?.stringValue || '',
      active: fields.active?.booleanValue !== false,
      passwordHash: fields.passwordHash?.stringValue || '',
      createdAt: fields.createdAt?.stringValue || new Date().toISOString(),
      lastLogin: fields.lastLogin?.stringValue,
    };
  } catch {
    return null;
  }
}

function userToFirestoreFields(u: StoredUser) {
  return {
    fields: {
      id: { stringValue: u.id },
      username: { stringValue: u.username },
      email: { stringValue: u.email },
      displayName: { stringValue: u.displayName },
      role: { stringValue: u.role },
      schoolName: { stringValue: u.schoolName || '' },
      active: { booleanValue: u.active !== false },
      passwordHash: { stringValue: u.passwordHash },
      createdAt: { stringValue: u.createdAt || new Date().toISOString() },
      lastLogin: { stringValue: u.lastLogin || '' },
    },
  };
}

async function syncUsersToFirestore(users: StoredUser[]) {
  if (!FIRESTORE_REST_BASE) return;
  for (const u of users) {
    try {
      await fetch(`${FIRESTORE_REST_BASE}/users/${u.id}?updateMask.fieldPaths=id&updateMask.fieldPaths=username&updateMask.fieldPaths=email&updateMask.fieldPaths=displayName&updateMask.fieldPaths=role&updateMask.fieldPaths=schoolName&updateMask.fieldPaths=active&updateMask.fieldPaths=passwordHash&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=lastLogin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToFirestoreFields(u)),
      });
    } catch {
      // ignore
    }
  }
}

async function fetchUsersFromFirestore(): Promise<StoredUser[]> {
  if (!FIRESTORE_REST_BASE) return [];
  try {
    const resp = await fetch(`${FIRESTORE_REST_BASE}/users`);
    if (!resp.ok) return [];
    const data: any = await resp.json();
    const docs = data?.documents || [];
    const list: StoredUser[] = [];
    for (const d of docs) {
      const parsed = parseFirestoreUser(d);
      if (parsed) list.push(parsed);
    }
    return list;
  } catch {
    return [];
  }
}

async function deleteUserFromFirestore(userId: string) {
  if (!FIRESTORE_REST_BASE) return;
  try {
    await fetch(`${FIRESTORE_REST_BASE}/users/${userId}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore
  }
}

async function getStoredUsers(): Promise<StoredUser[]> {
  let users = readJsonFile<StoredUser[]>(USERS_FILE, []);
  try {
    const remoteUsers = await fetchUsersFromFirestore();
    if (remoteUsers.length > 0) {
      const map = new Map<string, StoredUser>();
      for (const u of users) map.set(u.id, u);
      for (const r of remoteUsers) {
        map.set(r.id, r);
      }
      users = Array.from(map.values());
      writeJsonFile(USERS_FILE, users);
    }
  } catch {
    // ignore
  }

  const adminIndex = users.findIndex((u) => u.username.toLowerCase() === 'soalator.admin');
  const defaultAdminHash = hashPassword('admin12345');
  if (adminIndex === -1) {
    const adminUser: StoredUser = {
      id: 'usr_soalator_admin',
      username: 'soalator.admin',
      email: 'soalator.admin@soalator.local',
      displayName: 'Superadmin Soalator',
      role: 'superadmin',
      schoolName: 'Bogota Academic Center',
      active: true,
      passwordHash: defaultAdminHash,
      createdAt: new Date().toISOString(),
    };
    users.unshift(adminUser);
    writeJsonFile(USERS_FILE, users);
    syncUsersToFirestore([adminUser]);
  } else {
    if (users[adminIndex].role !== 'superadmin' || !users[adminIndex].active) {
      users[adminIndex].role = 'superadmin';
      users[adminIndex].active = true;
      writeJsonFile(USERS_FILE, users);
      syncUsersToFirestore([users[adminIndex]]);
    }
  }
  return users;
}


function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

interface SessionPayload {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'superadmin';
  exp: number;
}

function signSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `local.${encoded}.${sig}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  if (!token.startsWith('local.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string; displayName: string; role: 'teacher' | 'superadmin' } | null> {
  if (!FIREBASE_API_KEY || !idToken) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const fbUser = data?.users?.[0];
    if (!fbUser || !fbUser.localId) return null;
    const email = (fbUser.email || '').toLowerCase();
    const isSuper = SUPERADMIN_EMAILS.includes(email) && fbUser.emailVerified !== false;
    return {
      uid: fbUser.localId,
      email: fbUser.email || '',
      displayName: fbUser.displayName || fbUser.email || 'Pengguna Google',
      role: isSuper ? 'superadmin' : 'teacher',
    };
  } catch {
    return null;
  }
}

interface AuthenticatedUser {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'superadmin';
  schoolName?: string;
  authMethod: 'google' | 'credentials';
}

async function resolveAuthUser(req: express.Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  if (token.startsWith('local.')) {
    const session = verifySessionToken(token);
    if (!session) return null;
    const users = await getStoredUsers();
    const found = users.find((u) => u.id === session.uid);
    if (!found || !found.active) return null;
    return {
      uid: found.id,
      username: found.username,
      email: found.email,
      displayName: found.displayName,
      role: found.role,
      schoolName: found.schoolName,
      authMethod: 'credentials',
    };
  }

  const fbUser = await verifyFirebaseIdToken(token);
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    role: fbUser.role,
    authMethod: 'google',
  };
}

function sanitizeUser(u: StoredUser) {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const defaultApiKey = process.env.GEMINI_API_KEY || '';

// --- Credential Auth Endpoints ---

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  const cleanIdentifier = String(identifier || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (!cleanIdentifier || !rawPassword) {
    return res.status(400).json({ error: 'Username/Email dan kata sandi wajib diisi.' });
  }

  const users = await getStoredUsers();
  const userIndex = users.findIndex(
    (u) =>
      u.username.toLowerCase() === cleanIdentifier ||
      (u.email && u.email.toLowerCase() === cleanIdentifier)
  );

  if (userIndex === -1) {
    return res.status(401).json({ error: 'Username/Email atau kata sandi salah.' });
  }

  const user = users[userIndex];
  if (!user.active) {
    return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Superadmin.' });
  }

  if (!verifyPassword(rawPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Username/Email atau kata sandi salah.' });
  }

  users[userIndex] = { ...user, lastLogin: new Date().toISOString() };
  writeJsonFile(USERS_FILE, users);

  const token = signSessionToken({
    uid: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    token,
    user: {
      uid: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      schoolName: user.schoolName,
      authMethod: 'credentials',
    },
  });
});

app.get('/api/auth/me', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' });
  }
  return res.json({ user: authUser });
});

// --- Superadmin User Management Endpoints ---

app.get('/api/admin/users', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser || authUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Superadmin yang diizinkan.' });
  }
  const users = await getStoredUsers();
  return res.json({ users: users.map(sanitizeUser) });
});

app.post('/api/admin/users', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser || authUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Superadmin yang diizinkan.' });
  }

  const { username, email, password, displayName, role, schoolName } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(displayName || '').trim();
  const rawPassword = String(password || '');
  const userRole: 'teacher' | 'superadmin' = role === 'superadmin' ? 'superadmin' : 'teacher';

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username minimal 3 karakter.' });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
  }
  if (rawPassword.length < 6) {
    return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  }

  const users = await getStoredUsers();
  const duplicate = users.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername.toLowerCase() ||
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
  );
  if (duplicate) {
    return res.status(409).json({ error: 'Username atau email sudah terdaftar.' });
  }

  const newUser: StoredUser = {
    id: `usr_${crypto.randomBytes(8).toString('hex')}`,
    username: cleanUsername,
    email: cleanEmail || `${cleanUsername.toLowerCase()}@soalator.local`,
    displayName: cleanName,
    role: userRole,
    schoolName: String(schoolName || '').trim(),
    active: true,
    passwordHash: hashPassword(rawPassword),
    createdAt: new Date().toISOString(),
  };

  users.unshift(newUser);
  writeJsonFile(USERS_FILE, users);
  syncUsersToFirestore([newUser]);

  return res.status(201).json({ user: sanitizeUser(newUser) });
});

app.patch('/api/admin/users/:id', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser || authUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Superadmin yang diizinkan.' });
  }

  const targetId = req.params.id;
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === targetId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const { displayName, email, role, schoolName, active, password } = req.body || {};
  const existing = users[idx];

  const updated: StoredUser = {
    ...existing,
    displayName: displayName !== undefined ? String(displayName).trim() || existing.displayName : existing.displayName,
    email: email !== undefined ? String(email).trim().toLowerCase() || existing.email : existing.email,
    role: role === 'superadmin' ? 'superadmin' : role === 'teacher' ? 'teacher' : existing.role,
    schoolName: schoolName !== undefined ? String(schoolName).trim() : existing.schoolName,
    active: active !== undefined ? Boolean(active) : existing.active,
    passwordHash:
      password && String(password).length >= 6 ? hashPassword(String(password)) : existing.passwordHash,
  };

  users[idx] = updated;
  writeJsonFile(USERS_FILE, users);
  syncUsersToFirestore([updated]);

  return res.json({ user: sanitizeUser(updated) });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser || authUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Superadmin yang diizinkan.' });
  }

  const targetId = req.params.id;
  const users = await getStoredUsers();
  const nextUsers = users.filter((u) => u.id !== targetId);
  if (nextUsers.length === users.length) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  writeJsonFile(USERS_FILE, nextUsers);
  deleteUserFromFirestore(targetId);
  return res.json({ deleted: true });
});

// --- Server-Side Exam Persistence Endpoints (for Credential Users & Superadmin Archive) ---

app.get('/api/exams', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }

  const allExams = readJsonFile<any[]>(EXAMS_FILE, []);
  if (req.query.scope === 'all' && authUser.role === 'superadmin') {
    return res.json({ exams: allExams });
  }
  const userExams = allExams.filter((ex) => ex.userId === authUser.uid);
  return res.json({ exams: userExams });
});

app.post('/api/exams', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }

  const examBody = req.body || {};
  const allExams = readJsonFile<any[]>(EXAMS_FILE, []);
  const now = new Date().toISOString();
  const examId = examBody.id || `exam_${crypto.randomBytes(8).toString('hex')}`;

  const existingIdx = allExams.findIndex((ex) => ex.id === examId);
  const record = {
    ...examBody,
    id: examId,
    userId: authUser.uid,
    authorName: authUser.displayName,
    authorEmail: authUser.email,
    updatedAt: now,
    createdAt: examBody.createdAt || now,
  };

  if (existingIdx !== -1) {
    if (allExams[existingIdx].userId !== authUser.uid && authUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Anda tidak berhak mengubah arsip ini.' });
    }
    allExams[existingIdx] = record;
  } else {
    allExams.unshift(record);
  }

  writeJsonFile(EXAMS_FILE, allExams);
  return res.status(201).json({ exam: record });
});

app.delete('/api/exams/:id', async (req, res) => {
  const authUser = await resolveAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  }

  const examId = req.params.id;
  const allExams = readJsonFile<any[]>(EXAMS_FILE, []);
  const found = allExams.find((ex) => ex.id === examId);
  if (!found) {
    return res.status(404).json({ error: 'Arsip soal tidak ditemukan.' });
  }
  if (found.userId !== authUser.uid && authUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const nextExams = allExams.filter((ex) => ex.id !== examId);
  writeJsonFile(EXAMS_FILE, nextExams);
  return res.json({ deleted: true });
});

// --- Question Generation Endpoints ---

function generateFallbackExam(schoolIdentity: any, settings: any, materialText: string) {
  const subject = schoolIdentity?.mataPelajaran || 'Mata Pelajaran';
  const category = settings?.examCategory || 'Ulangan Harian 1';
  const school = schoolIdentity?.namaSekolah || 'Sekolah';

  const questions: any[] = [];
  let qNum = 1;

  const selectedTypes: string[] =
    settings?.selectedTypes && settings.selectedTypes.length > 0
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
            indikatorSoal: `Peserta didik mampu ${
              group.cat === 'HOTS' ? 'menganalisis dan mengevaluasi' : group.cat === 'MOTS' ? 'menerapkan' : 'memahami'
            } konsep ${subject} dengan nilai Kebopkrian.`,
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
