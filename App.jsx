import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, addDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { 
  BookOpen, Gamepad2, Edit3, LayoutDashboard, LogOut, User, Users, 
  FileText, Activity, CheckCircle, BrainCircuit, PlayCircle, Trophy, Plus, X, GraduationCap,
  Globe, Sparkles, Image as ImageIcon, Loader2, Music, Music2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Zap
} from 'lucide-react';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "mock-key", projectId: "mock-project"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sirisno-edu-platform';

// --- LOFI MUSIC GENERATOR (Web Audio API) ---
class LofiGenerator {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = false;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.15;
    this.masterGain.connect(this.ctx.destination);
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.currentChord = 0;
    this.timerID = null;
    
    this.chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
      [196.00, 246.94, 293.66, 329.63, 392.00], // G6
      [110.00, 130.81, 164.81, 196.00, 246.94]  // Am9
    ];
  }

  playChord(chordIndex, time) {
    const chord = this.chords[chordIndex];
    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.5 + (i * 0.1));
      gain.gain.exponentialRampToValueAtTime(0.001, time + 4.0);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + 4.5);
    });

    if (Math.random() > 0.3) {
        const sparkleOsc = this.ctx.createOscillator();
        const sparkleGain = this.ctx.createGain();
        sparkleOsc.type = 'sine';
        sparkleOsc.frequency.value = chord[Math.floor(Math.random() * chord.length)] * (Math.random() > 0.5 ? 2 : 4); 
        sparkleGain.gain.setValueAtTime(0, time + 1.0); 
        sparkleGain.gain.linearRampToValueAtTime(0.05, time + 1.5);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(this.masterGain);
        sparkleOsc.start(time + 1.0);
        sparkleOsc.stop(time + 3.0);
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playChord(this.currentChord, this.nextNoteTime);
      this.nextNoteTime += 4.0;
      this.currentChord = (this.currentChord + 1) % this.chords.length;
    }
    this.timerID = requestAnimationFrame(this.scheduler.bind(this));
  }

  toggle() {
    if (this.isPlaying) {
      cancelAnimationFrame(this.timerID);
      this.ctx.suspend();
      this.isPlaying = false;
    } else {
      this.ctx.resume();
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
      this.isPlaying = true;
    }
    return this.isPlaying;
  }
}

// --- ARCADE BGM & SFX GENERATOR ---
const playSFX = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'hit' || type === 'correct') {
       osc.type = 'sine';
       osc.frequency.setValueAtTime(600, now);
       osc.frequency.setValueAtTime(1200, now + 0.1);
       gain.gain.setValueAtTime(0.3, now);
       gain.gain.linearRampToValueAtTime(0, now + 0.3);
       osc.start(now);
       osc.stop(now + 0.3);
    } else if (type === 'wrong') {
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(250, now);
       osc.frequency.linearRampToValueAtTime(100, now + 0.3);
       gain.gain.setValueAtTime(0.3, now);
       gain.gain.linearRampToValueAtTime(0, now + 0.3);
       osc.start(now);
       osc.stop(now + 0.3);
    } else if (type === 'over') {
       osc.type = 'square';
       osc.frequency.setValueAtTime(150, now);
       osc.frequency.exponentialRampToValueAtTime(50, now + 1.0);
       gain.gain.setValueAtTime(0.3, now);
       gain.gain.linearRampToValueAtTime(0, now + 1.0);
       osc.start(now);
       osc.stop(now + 1.0);
    }
  } catch(e) {}
};

class ArcadeBGM {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = false;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.03; // Sangat perlahan di latar
    this.masterGain.connect(this.ctx.destination);
    this.nextNoteTime = 0;
    this.currentNote = 0;
    this.timerID = null;
    
    this.notes = [
      [261.63, 329.63, 392.00, 523.25], // C maj
      [261.63, 329.63, 392.00, 523.25], 
      [174.61, 220.00, 261.63, 349.23], // F maj
      [196.00, 246.94, 293.66, 392.00]  // G maj
    ];
    this.chordIndex = 0;
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.value = this.notes[this.chordIndex][this.currentNote];
      
      gain.gain.setValueAtTime(0, this.nextNoteTime);
      gain.gain.linearRampToValueAtTime(0.1, this.nextNoteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.nextNoteTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.nextNoteTime);
      osc.stop(this.nextNoteTime + 0.15);

      this.currentNote++;
      if (this.currentNote >= 4) {
          this.currentNote = 0;
          if (Math.random() > 0.7) {
              this.chordIndex = (this.chordIndex + 1) % this.notes.length;
          }
      }
      this.nextNoteTime += 0.15; 
    }
    this.timerID = requestAnimationFrame(this.scheduler.bind(this));
  }

  start() {
    if (!this.isPlaying) {
      this.ctx.resume();
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.isPlaying) {
      cancelAnimationFrame(this.timerID);
      this.ctx.suspend();
      this.isPlaying = false;
    }
  }
}

// --- DATA HELPERS ---
const SUBJECTS = ['Bahasa Melayu', 'Sains', 'Matematik', 'Sejarah', 'Pendidikan Islam', 'Bahasa Arab', 'PJPK', 'Muzik', 'RBT', 'PSV'];

const TRANSLATIONS = {
  ms: { 
    student: 'Murid', teacher: 'Guru', portal_teacher: 'Portal Guru', portal_student: 'Portal Murid', logout: 'Log Keluar',
    hero_title: 'Pendidikan Interaktif & \n Menyeronokkan dengan', hero_sub: 'Platform pembelajaran digital berasaskan silibus KPM (Tahun 1-6). Dilengkapi nota interaktif, permainan merangsang minda, dan portal guru yang efisien.',
    login_student: 'Masuk Sebagai Murid', login_teacher: 'Masuk Sebagai Guru',
    feat1_title: 'Nota & Infografik', feat1_desc: 'Terokai nota dan infografik pintar yang dijana khas oleh AI merangkumi pelbagai subjek teras KPM dengan visual yang menarik.',
    feat2_title: 'Permainan Digital AI', feat2_desc: 'Rangsang minda dengan pelbagai mod permainan yang dijana secara pintar oleh AI.',
    feat3_title: 'Analisis Prestasi', feat3_desc: 'Guru boleh memantau pencapaian murid secara langsung melalui penjana kuiz dan carta analisis.',
    welcome: 'Selamat Datang, Murid Pintar! 🚀', choose_activity: 'Pilih aktiviti pembelajaran anda hari ini.',
    notes: 'Nota & Infografik', notes_desc: 'Ulang kaji subjek teras & elektif KPM.',
    games: 'Permainan Digital AI', games_desc: 'Cabaran minda 3 Mod Pintar.',
    uasa: 'Latihan UASA (2018-Kini)', uasa_desc: 'Koleksi soalan peperiksaan lepas.',
    live_quiz: 'Kuiz Langsung (Dari Guru)', no_quiz: 'Belum ada kuiz yang diterbitkan oleh guru buat masa ini.',
    questions: 'Soalan', created_by: 'Ciptaan Guru',
    teacher_portal: 'Portal Guru', create_quiz: 'Cipta Kuiz Baru', manage_quiz: 'Urus Kuiz', analytics: 'Analisis Prestasi',
    ai_title: 'Penjana Kuiz & Gambar Automatik', ai_desc: 'Bina berpuluh soalan sekaligus. AI akan memproses jumlah, bahasa, dan turut menjana gambar ilustrasi!',
    ai_placeholder: 'Cth: "Hasilkan 10 soalan sejarah tahun 5 dan sediakan gambar untuk setiap soalan"',
    ai_btn: 'Jana AI', ai_generating: 'Menjana...',
    quiz_title: 'Tajuk Kuiz', quiz_subject: 'Subjek',
    add_question: 'Tambah Soalan', publish: 'Terbitkan Kuiz', publishing: 'Menerbitkan...',
    no_published: 'Tiada kuiz diterbitkan lagi.', delete: 'Padam',
    no_records: 'Belum ada rekod jawapan murid.',
    date: 'Tarikh', student_name: 'Nama Murid', class_name: 'Kelas', subject: 'Subjek', score: 'Markah', status: 'Status',
    pass: 'LULUS', fail: 'GAGAL',
    enter_name: 'Sila Masukkan Nama Anda', enter_class: 'Masukkan Nama Kelas Anda', start_quiz: 'Mula Kuiz', submit_answers: 'Hantar Jawapan', next: 'Seterusnya',
    back: 'Kembali', back_dash: 'Kembali ke Dashboard', game_title: 'Cabaran Minda', game_sub: 'Jawab pantas untuk kumpul mata!', game_score: 'Skor Terkumpul:', game_ans: 'Jawab',
    player_name: 'Masukkan Nama Pemain', start_game: 'Mula Bermain', leaderboard: 'Carta Kedudukan', level_1: 'Tahap 1 (Tahun 1-3)', level_2: 'Tahap 2 (Tahun 4-6)',
    music_on: 'Muzik Tenang: Aktif', music_off: 'Muzik Tenang: Mati',
    ai_game_title: 'Pilih Mod Permainan AI',
    ai_game_sub: 'Pilih jenis cabaran AI untuk subjek',
    mode_mcq: 'Pengembaraan Fakta',
    mode_mcq_desc: 'Lawan masa! Jawab cabaran fakta secepat mungkin sebelum masa tamat.',
    mode_whack: 'Ketuk Jawapan Pintar',
    mode_whack_desc: 'Uji refleks anda! Ketuk pilihan jawapan yang tepat apabila ia muncul dari lubang.',
    mode_riddle: 'Teka-Teki Pintar',
    mode_riddle_desc: 'Main teka huruf rahsia! Jangan sampai salah teka 5 kali atau anda kalah!',
    generating_title: 'MEMUATKAN GAME...',
    generating_notes: 'MENJANA INFOGRAFIK PINTAR...',
    out_of_lives: 'Anda telah kehabisan nyawa!',
    final_score: 'Skor Akhir Anda:',
    play_again: 'Main Semula',
    congrats: 'Tahniah!',
    oops: 'Aduh!',
    next_challenge: 'Teruskan Cabaran',
    see_results: 'Lihat Keputusan Akhir',
    start_gen: 'Mula Jana & Bermain!',
    level_text: 'Tahap',
    score_text: 'Skor',
    life_text: 'Nyawa',
    select_level_title: 'Pilih Tahap:',
    change_level: 'Tukar Tahap',
    time_out: 'Masa Tamat!',
    guess_word: 'Teka Perkataan Rahsia:'
  },
  en: { 
    student: 'Student', teacher: 'Teacher', portal_teacher: 'Teacher Portal', portal_student: 'Student Portal', logout: 'Logout',
    hero_title: 'Interactive & Fun \n Education with', hero_sub: 'Digital learning platform based on the KPM syllabus (Years 1-6). Featuring interactive notes, AI games, and an efficient teacher portal.',
    login_student: 'Login as Student', login_teacher: 'Login as Teacher',
    feat1_title: 'Notes & Infographics', feat1_desc: 'Explore smart notes and infographics tailored by AI for various KPM core subjects with engaging visuals.',
    feat2_title: 'AI Digital Games', feat2_desc: 'Stimulate your mind with various game modes smartly generated by AI.',
    feat3_title: 'Performance Analytics', feat3_desc: 'Teachers can monitor student progress directly via live analytics.',
    welcome: 'Welcome, Smart Student! 🚀', choose_activity: 'Choose your learning activity today.',
    notes: 'Notes & Infographics', notes_desc: 'Review KPM core & elective subjects.',
    games: 'AI Digital Games', games_desc: '3 Smart Mind Challenge Modes.',
    uasa: 'UASA Practice (2018-Now)', uasa_desc: 'Collection of past exam questions.',
    live_quiz: 'Live Quiz (From Teacher)', no_quiz: 'No quizzes have been published by teachers yet.',
    questions: 'Questions', created_by: 'Created by Teacher',
    teacher_portal: 'Teacher Portal', create_quiz: 'Create New Quiz', manage_quiz: 'Manage Quizzes', analytics: 'Performance Analytics',
    ai_title: 'Auto Quiz & Image Generator', ai_desc: 'Create dozens of questions at once. AI processes the quantity, language, and generates illustrations!',
    ai_placeholder: 'E.g.: "Generate 10 year 5 history questions and provide an image for each"',
    ai_btn: 'Generate AI', ai_generating: 'Generating...',
    quiz_title: 'Quiz Title', quiz_subject: 'Subject',
    add_question: 'Add Question', publish: 'Publish Quiz', publishing: 'Publishing...',
    no_published: 'No quizzes published yet.', delete: 'Delete',
    no_records: 'No student answer records yet.',
    date: 'Date', student_name: 'Student Name', class_name: 'Class', subject: 'Subject', score: 'Score', status: 'Status',
    pass: 'PASS', fail: 'FAIL',
    enter_name: 'Please Enter Your Name', enter_class: 'Enter Your Class Name', start_quiz: 'Start Quiz', submit_answers: 'Submit Answers', next: 'Next',
    back: 'Back', back_dash: 'Back to Dashboard', game_title: 'Mind Challenge', game_sub: 'Answer fast to collect points!', game_score: 'Total Score:', game_ans: 'Answer',
    player_name: 'Enter Player Name', start_game: 'Start Playing', leaderboard: 'Leaderboard', level_1: 'Level 1 (Years 1-3)', level_2: 'Level 2 (Years 4-6)',
    music_on: 'Lofi Music: On', music_off: 'Lofi Music: Off',
    ai_game_title: 'Select AI Game Mode',
    ai_game_sub: 'Choose an AI challenge for the subject',
    mode_mcq: 'Fact Adventure',
    mode_mcq_desc: 'Race against time! Answer facts as quickly as possible before time runs out.',
    mode_whack: 'Whack-a-Fact',
    mode_whack_desc: 'Test your reflexes! Tap the correct answer when it pops out of the hole.',
    mode_riddle: 'Smart Riddles',
    mode_riddle_desc: 'Play secret word guess! Guess the letters, don\'t make 5 mistakes or you lose!',
    generating_title: 'LOADING GAME...',
    generating_notes: 'GENERATING SMART INFOGRAPHIC...',
    out_of_lives: 'You have run out of lives!',
    final_score: 'Your Final Score:',
    play_again: 'Play Again',
    congrats: 'Congratulations!',
    oops: 'Oops!',
    next_challenge: 'Continue Challenge',
    see_results: 'View Final Results',
    start_gen: 'Generate & Play!',
    level_text: 'Stage',
    score_text: 'Score',
    life_text: 'Lives',
    select_level_title: 'Select Level:',
    change_level: 'Change Level',
    time_out: 'Time is Up!',
    guess_word: 'Guess the Secret Word:'
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [lang, setLang] = useState('ms'); 
  const [view, setView] = useState('home'); 
  
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  const lofiRef = useRef(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    lofiRef.current = new LofiGenerator();
  }, []);

  const toggleMusic = () => {
    if (lofiRef.current) {
      const state = lofiRef.current.toggle();
      setIsMusicPlaying(state);
      showToast(state ? TRANSLATIONS[lang].music_on : TRANSLATIONS[lang].music_off);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const quizzesRef = collection(db, 'artifacts', appId, 'public', 'data', 'quizzes');
    const unsubQuizzes = onSnapshot(quizzesRef, (snapshot) => {
      const qData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(qData.sort((a, b) => b.createdAt - a.createdAt));
    });

    const resultsRef = collection(db, 'artifacts', appId, 'public', 'data', 'results');
    const unsubResults = onSnapshot(resultsRef, (snapshot) => {
      const rData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(rData.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => { unsubQuizzes(); unsubResults(); };
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLogin = (selectedRole) => {
    setRole(selectedRole);
    setView(selectedRole === 'teacher' ? 'teacher_dash' : 'student_dash');
  };

  const handleLogout = () => {
    setRole(null);
    setView('home');
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ms'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col transition-all">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => view !== 'home' && setView(role === 'teacher' ? 'teacher_dash' : 'student_dash')}
        >
          <GraduationCap className="text-blue-600 w-8 h-8" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500 hidden sm:block">
            SIRISNO Edu
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="w-4 h-4" />
            <select 
              value={lang} 
              onChange={e => setLang(e.target.value)} 
              className="bg-transparent border-none outline-none cursor-pointer font-bold hover:text-blue-600 transition"
            >
              <option value="ms">BM</option>
              <option value="en">EN</option>
            </select>
          </div>
          <button 
            onClick={toggleMusic}
            className={`p-2 rounded-full transition-all flex items-center justify-center ${isMusicPlaying ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'hover:bg-slate-100 text-slate-400'}`}
            title="Lofi Study Music"
          >
            {isMusicPlaying ? <Music className="w-5 h-5 animate-pulse" /> : <Music2 className="w-5 h-5" />}
          </button>
          
          <div>
            {!role ? (
              <div className="flex gap-2 sm:gap-4">
                <button onClick={() => handleLogin('student')} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full transition">
                  <User className="w-4 h-4" /> <span className="hidden sm:block">{t.student}</span>
                </button>
                <button onClick={() => handleLogin('teacher')} className="flex items-center gap-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-full shadow-md transition">
                  <Users className="w-4 h-4" /> <span className="hidden sm:block">{t.teacher}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm font-medium bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                  {role === 'teacher' ? t.portal_teacher : t.portal_student}
                </span>
                <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title={t.logout}>
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10">
        {view === 'home' && <LandingPage onRoleSelect={handleLogin} t={t} />}
        {view === 'student_dash' && <StudentDashboard setView={setView} quizzes={quizzes} setActiveQuiz={setActiveQuiz} t={t} />}
        {view === 'teacher_dash' && <TeacherDashboard setView={setView} quizzes={quizzes} results={results} showToast={showToast} t={t} />}
        {view === 'notes' && <NotesView setView={setView} t={t} />}
        {view === 'game' && <GameView setView={setView} t={t} />}
        {view === 'take_quiz' && activeQuiz && <TakeQuizView quiz={activeQuiz} setView={setView} showToast={showToast} user={user} t={t} />}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm relative z-10">
        <p>&copy; 2026 SIRISNO Edu. KPM Syllabus Aligned. Pembelajaran Digital Interaktif.</p>
      </footer>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
          <CheckCircle className="w-5 h-5 text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEWS
// ==========================================

function LandingPage({ onRoleSelect, t }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-blue-50/50">
      <div className="max-w-4xl text-center space-y-8 mt-10">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight whitespace-pre-line">
          {t.hero_title} <span className="text-blue-600">SIRISNO Edu</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          {t.hero_sub}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <button 
            onClick={() => onRoleSelect('student')}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 px-8 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-105"
          >
            <User className="w-5 h-5" /> {t.login_student}
          </button>
          <button 
            onClick={() => onRoleSelect('teacher')}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 text-lg font-semibold py-4 px-8 rounded-2xl shadow-sm transition-all hover:scale-105"
          >
            <Users className="w-5 h-5" /> {t.login_teacher}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mt-24 mb-10">
        <FeatureCard icon={<BookOpen />} title={t.feat1_title} desc={t.feat1_desc} color="text-indigo-500" bg="bg-indigo-50" />
        <FeatureCard icon={<Gamepad2 />} title={t.feat2_title} desc={t.feat2_desc} color="text-pink-500" bg="bg-pink-50" />
        <FeatureCard icon={<Activity />} title={t.feat3_title} desc={t.feat3_desc} color="text-teal-500" bg="bg-teal-50" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition">
      <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
        {React.cloneElement(icon, { className: 'w-7 h-7' })}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function StudentDashboard({ setView, quizzes, setActiveQuiz, t }) {
  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-slate-800">{t.welcome}</h2>
        <p className="text-slate-500 mt-2">{t.choose_activity}</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title={t.notes}
          desc={t.notes_desc}
          icon={<FileText className="w-8 h-8 text-white" />}
          color="bg-indigo-500 shadow-indigo-500/30"
          onClick={() => setView('notes')}
        />
        <DashboardCard 
          title={t.games}
          desc={t.games_desc}
          icon={<Gamepad2 className="w-8 h-8 text-white" />}
          color="bg-pink-500 shadow-pink-500/30"
          onClick={() => setView('game')}
        />
        <DashboardCard 
          title={t.uasa}
          desc={t.uasa_desc}
          icon={<Edit3 className="w-8 h-8 text-white" />}
          color="bg-teal-500 shadow-teal-500/30"
          onClick={() => alert("Modul UASA akan dibuka hampir dengan tarikh peperiksaan!")}
        />
      </div>

      <section className="mt-12 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-blue-500 w-6 h-6" /> {t.live_quiz}
          </h3>
        </div>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">{t.no_quiz}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="p-5 border border-slate-100 bg-slate-50 hover:bg-blue-50 rounded-2xl transition flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{quiz.title}</h4>
                  <p className="text-sm text-slate-500">{quiz.questions.length} {t.questions} • {quiz.subject} • {t.created_by}</p>
                </div>
                <button 
                  onClick={() => { setActiveQuiz(quiz); setView('take_quiz'); }}
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"
                >
                  <PlayCircle className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardCard({ title, desc, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`${color} rounded-3xl p-6 text-white shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
    >
      <div className="absolute -right-4 -top-4 opacity-20 w-32 h-32 bg-white rounded-full"></div>
      <div className="relative z-10">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-white/80 font-medium">{desc}</p>
      </div>
    </div>
  );
}

function TeacherDashboard({ setView, quizzes, results, showToast, t }) {
  const [activeTab, setActiveTab] = useState('create'); 
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizSubject, setNewQuizSubject] = useState(SUBJECTS[0]);
  const [questions, setQuestions] = useState([{ q: '', options: ['', '', '', ''], correct: 0, imagePrompt: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([...questions, { q: '', options: ['', '', '', ''], correct: 0, imagePrompt: '' }]);
  };

  const handleQuestionChange = (index, field, value, optIndex = null) => {
    const updated = [...questions];
    if (field === 'q') updated[index].q = value;
    else if (field === 'correct') updated[index].correct = parseInt(value);
    else if (field === 'option') updated[index].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return showToast('Sila masukkan arahan untuk AI');
    setIsGeneratingAI(true);
    showToast(t.ai_generating);
    try {
      const payload = {
        contents: [{ role: "user", parts: [{ text: `Bina set soalan kuiz berdasarkan arahan ini: "${aiPrompt}". Janakan bilangan soalan yang TEPAT mengikut jumlah yang diminta dalam arahan. Soalan dan jawapan mesti dalam bahasa yang sama dengan arahan. Berikan juga 'imagePrompt' dalam Bahasa Inggeris untuk menjana gambar jika sesuai. Jangan berikan teks lain selain JSON.` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                "q": { "type": "STRING" },
                "options": { "type": "ARRAY", "items": { "type": "STRING" } },
                "correct": { "type": "INTEGER" },
                "imagePrompt": { "type": "STRING" }
              },
              "required": ["q", "options", "correct"]
            }
          }
        }
      };
      
      const apiKey = "";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      let newQuestions = JSON.parse(data.candidates[0].content.parts[0].text);

      showToast('Soalan dijana! Menjana gambar AI...');

      const questionsWithImages = await Promise.all(newQuestions.map(async (q) => {
        if (q.imagePrompt && q.imagePrompt.trim() !== "") {
          try {
            const imgPayload = {
              contents: [{ role: 'user', parts: [{ text: "Bina ilustrasi pendidikan untuk pelajar sekolah rendah: " + q.imagePrompt }] }],
              generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: "16:9" } }
            };
            const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgPayload)
            });
            const imgData = await imgRes.json();
            const part = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part) {
              return { ...q, imageData: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
          } catch (e) {
            console.error("Gagal menjana gambar untuk soalan", e);
          }
        }
        return q;
      }));

      setQuestions(questionsWithImages);
      if (!newQuizTitle) setNewQuizTitle(aiPrompt.substring(0, 30) + "...");
      showToast('Selesai menjana soalan dan gambar!');
    } catch (e) {
      console.error(e);
      showToast('Gagal menjana soalan dari AI.');
    }
    setIsGeneratingAI(false);
  };

  const handlePublish = async () => {
    if (!newQuizTitle.trim()) return showToast('Sila masukkan tajuk kuiz');
    if (questions.some(q => !q.q.trim() || q.options.some(o => !o.trim()))) return showToast('Sila lengkapkan semua soalan dan pilihan jawapan');
    
    setIsSubmitting(true);
    try {
      const quizData = {
        title: newQuizTitle,
        subject: newQuizSubject,
        questions: questions,
        createdAt: Date.now(),
        createdBy: 'Guru'
      };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'quizzes'), quizData);
      showToast('Kuiz berjaya diterbitkan kepada murid!');
      setNewQuizTitle('');
      setQuestions([{ q: '', options: ['', '', '', ''], correct: 0, imagePrompt: '' }]);
      setActiveTab('manage');
    } catch (e) {
      console.error(e);
      showToast('Gagal menerbitkan kuiz.');
    }
    setIsSubmitting(false);
  };

  const handleDeleteQuiz = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'quizzes', id));
      showToast(t.delete);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-64 shrink-0 space-y-2">
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-4">{t.teacher_portal}</h2>
        <TeacherNavBtn active={activeTab === 'create'} onClick={() => setActiveTab('create')} icon={<Plus/>} label={t.create_quiz} />
        <TeacherNavBtn active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<FileText/>} label={t.manage_quiz} count={quizzes.length} />
        <TeacherNavBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Activity/>} label={t.analytics} />
      </div>

      <div className="flex-1 bg-white p-4 sm:p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[70vh] overflow-x-hidden">
        {activeTab === 'create' && (
          <div className="animate-in fade-in space-y-6">
            <h3 className="text-2xl font-bold text-slate-800 border-b pb-4">{t.create_quiz}</h3>
            
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-100 mb-8 shadow-sm relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><Sparkles className="w-40 h-40" /></div>
              <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3 relative z-10">
                <Sparkles className="w-5 h-5 text-indigo-600"/> {t.ai_title}
              </h4>
              <p className="text-sm text-indigo-700 mb-4 font-medium relative z-10">
                {t.ai_desc}
              </p>
              <div className="flex flex-col md:flex-row gap-3 relative z-10">
                <textarea 
                  rows={2}
                  className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm shadow-inner"
                  placeholder={t.ai_placeholder}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
                <button 
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold px-6 py-3 rounded-xl transition flex flex-col items-center justify-center min-w-[150px] shadow-lg shadow-indigo-500/30"
                >
                  {isGeneratingAI ? <><Loader2 className="w-6 h-6 animate-spin mb-1"/> {t.ai_generating}</> : <><BrainCircuit className="w-6 h-6 mb-1"/> {t.ai_btn}</>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">{t.quiz_title}</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={newQuizTitle}
                    onChange={e => setNewQuizTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">{t.quiz_subject}</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={newQuizSubject}
                    onChange={e => setNewQuizSubject(e.target.value)}
                  >
                    {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 space-y-4 relative">
                    <h4 className="font-bold text-slate-700">{t.questions} {qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <button 
                        onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                        className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                      >
                        <X className="w-5 h-5"/>
                      </button>
                    )}
                    <input 
                      type="text" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3"
                      value={q.q}
                      onChange={e => handleQuestionChange(qIndex, 'q', e.target.value)}
                    />
                    
                    {q.imageData && (
                      <div className="relative w-full max-w-sm rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm mt-2">
                         <img src={q.imageData} alt="Ilustrasi soalan" className="w-full h-auto object-cover" />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name={`correct-${qIndex}`} 
                            checked={q.correct === oIndex}
                            onChange={() => handleQuestionChange(qIndex, 'correct', oIndex)}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <input 
                            type="text" 
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            value={opt}
                            onChange={e => handleQuestionChange(qIndex, 'option', e.target.value, oIndex)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={handleAddQuestion}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold transition"
                >
                  <Plus className="w-4 h-4"/> {t.add_question}
                </button>
                <button 
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition flex justify-center items-center gap-2"
                >
                  {isSubmitting ? t.publishing : <><PlayCircle className="w-5 h-5"/> {t.publish}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="animate-in fade-in space-y-6">
            <h3 className="text-2xl font-bold text-slate-800 border-b pb-4">{t.manage_quiz}</h3>
            {quizzes.length === 0 ? (
              <p className="text-slate-500 italic">{t.no_published}</p>
            ) : (
              <div className="space-y-4">
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{quiz.title}</h4>
                      <p className="text-sm text-slate-500">{quiz.questions.length} {t.questions} • {quiz.subject}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition text-sm font-semibold border border-transparent hover:border-red-100 sm:w-auto w-full text-center"
                    >
                      {t.delete}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-in fade-in space-y-6">
            <h3 className="text-2xl font-bold text-slate-800 border-b pb-4">{t.analytics}</h3>
            
            {results.length === 0 ? (
              <p className="text-slate-500 italic">{t.no_records}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-xs">
                    <tr>
                      <th className="px-4 py-4">{t.date}</th>
                      <th className="px-4 py-4">{t.student_name}</th>
                      <th className="px-4 py-4">{t.class_name}</th>
                      <th className="px-4 py-4">{t.subject}</th>
                      <th className="px-4 py-4">{t.quiz_title}</th>
                      <th className="px-4 py-4 text-center">{t.score}</th>
                      <th className="px-4 py-4 text-center">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map(r => {
                      const percentage = (r.score / r.total) * 100;
                      const pass = percentage >= 50;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 bg-white">
                          <td className="px-4 py-4 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-4 font-bold text-slate-800">{r.studentName || '-'}</td>
                          <td className="px-4 py-4 font-bold text-slate-600">{r.studentClass || '-'}</td>
                          <td className="px-4 py-4">{r.quizSubject}</td>
                          <td className="px-4 py-4 font-medium text-slate-700">{r.quizTitle}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-slate-800">{r.score}</span> / {r.total}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {pass ? t.pass : t.fail}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherNavBtn({ active, onClick, icon, label, count }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        {label}
      </div>
      {count !== undefined && (
        <span className={`text-xs py-1 px-2 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200'}`}>{count}</span>
      )}
    </button>
  );
}

function NotesView({ setView, t }) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteData, setNoteData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [topicHistory, setTopicHistory] = useState([]);

  useEffect(() => {
      let interval;
      if (isGenerating) {
          setProgress(0);
          interval = setInterval(() => {
              setProgress(p => (p < 90 ? p + Math.floor(Math.random() * 8) + 1 : p));
          }, 300);
      }
      return () => clearInterval(interval);
  }, [isGenerating]);

  const generateAINotes = async (subject, level) => {
    setIsGenerating(true);
    try {
      const aiLanguage = t.logout === 'Logout' ? 'English' : 'Bahasa Melayu';
      const targetAudience = level === 'tahap1' ? 'Tahap 1 (Umur 7-9)' : 'Tahap 2 (Umur 10-12)';
      const randomSeed = Math.floor(Math.random() * 1000000);
      
      const historyStr = topicHistory.length > 0 ? `DO NOT USE THESE TOPICS: ${topicHistory.join(', ')}.` : '';
      
      const payload = {
        contents: [{ role: "user", parts: [{ text: `Generate a NEW, UNIQUE, and highly engaging educational infographic content for primary school students about a SPECIFIC NICHE SUBTOPIC in ${subject} for ${targetAudience}. ${historyStr} IMPORTANT: Do NOT generate general overviews. Pick a highly specific, interesting niche topic within the syllabus (e.g., if Science, focus on 'Types of Roots' or 'Food Chain', not just 'Science General'). Ensure MAXIMUM variety using Random Seed: ${randomSeed}. The content MUST closely follow the Malaysia KPM syllabus and use factual open-source info (copyright free). Include a catchy title, a short intro, exactly 5 key points (each with subtitle and detailed description), and one amazing fun fact. Also provide an 'imagePrompt' in English for a vibrant 3D kids educational illustration. Language MUST BE strictly in ${aiLanguage}.` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "title": { "type": "STRING" },
              "intro": { "type": "STRING" },
              "points": {
                "type": "ARRAY",
                "items": {
                  "type": "OBJECT",
                  "properties": {
                    "subtitle": { "type": "STRING" },
                    "description": { "type": "STRING" }
                  }
                }
              },
              "fun_fact": { "type": "STRING" },
              "imagePrompt": { "type": "STRING" }
            }
          }
        }
      };
      
      const apiKey = "";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      let note = JSON.parse(data.candidates[0].content.parts[0].text);

      setTopicHistory(prev => [...prev, note.title]);

      if (note.imagePrompt) {
        try {
          const imgPayload = {
            contents: [{ role: 'user', parts: [{ text: "Create a highly engaging educational illustration for kids, vibrant 3D style: " + note.imagePrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: "16:9" } }
          };
          const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgPayload)
          });
          const imgData = await imgRes.json();
          const part = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (part) {
            note.imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        } catch (e) { console.error("Gagal load imej AI untuk nota:", e); }
      }

      setNoteData(note);
    } catch (e) {
      console.error(e);
      alert("Gagal menjana Nota AI. Sila cuba lagi.");
    }
    setIsGenerating(false);
    setProgress(100);
  };

  const handleSelectLevel = (lvl) => {
    setSelectedLevel(lvl);
    generateAINotes(selectedSubject, lvl);
  };

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-[60vh]">
         <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <BookOpen className="w-10 h-10 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse mb-4">
            {t.generating_notes || 'MENJANA INFOGRAFIK PINTAR...'}
          </h2>
          <div className="text-4xl font-extrabold text-indigo-500 mb-2">{progress}%</div>
          <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
      </div>
    );
  }

  if (noteData) {
    return (
      <div className="p-6 max-w-4xl mx-auto w-full animate-in zoom-in-95 pb-20">
        <button onClick={() => setNoteData(null)} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
          ← {t.back}
        </button>
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
          {noteData.imageData && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 relative">
               <img src={noteData.imageData} alt="Infographic Visual" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-8">
                 <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">{noteData.title}</h1>
               </div>
            </div>
          )}
          {!noteData.imageData && (
             <div className="bg-indigo-600 p-8 sm:p-12">
               <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">{noteData.title}</h1>
             </div>
          )}
          
          <div className="p-6 sm:p-10 space-y-10">
            <p className="text-xl text-slate-600 font-medium leading-relaxed italic border-l-4 border-indigo-400 pl-6">
              "{noteData.intro}"
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              {noteData.points && noteData.points.map((pt, idx) => (
                <div key={idx} className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 hover:-translate-y-1 transition-transform">
                  <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{pt.subtitle}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{pt.description}</p>
                </div>
              ))}
            </div>

            {noteData.fun_fact && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex items-start gap-4">
                <div className="text-4xl">💡</div>
                <div>
                  <h4 className="text-xl font-bold mb-2">Fakta Menarik!</h4>
                  <p className="font-medium text-lg text-yellow-50">{noteData.fun_fact}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-center mt-12 pt-8 border-t border-slate-100">
              <button 
                onClick={() => generateAINotes(selectedSubject, selectedLevel)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg flex items-center gap-3 transition-transform hover:scale-105"
              >
                <Sparkles className="w-6 h-6" /> ✨ Jana Nota Seterusnya
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedSubject) {
    return (
      <div className="p-6 max-w-6xl mx-auto w-full animate-in slide-in-from-right-8">
        <button onClick={() => setView('student_dash')} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
          ← {t.back_dash}
        </button>
        <h2 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <BookOpen className="text-indigo-500" /> Pilih Subjek untuk Nota Pintar AI
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUBJECTS.map(sub => (
            <div key={sub} onClick={() => setSelectedSubject(sub)} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition cursor-pointer text-center group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700">{sub}</h3>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hideTahap1 = selectedSubject === 'Sejarah' || selectedSubject === 'RBT';

  return (
    <div className="p-6 max-w-4xl mx-auto w-full animate-in zoom-in">
       <button onClick={() => setSelectedSubject(null)} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
        ← {t.back}
      </button>
      <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center bg-white py-4 rounded-2xl shadow-sm border border-slate-100">
        Pilih Tahap: <span className="text-indigo-600">{selectedSubject}</span>
      </h2>
      <div className={`grid ${hideTahap1 ? 'grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2'} gap-6`}>
         {!hideTahap1 && (
           <div onClick={() => handleSelectLevel('tahap1')} className="bg-gradient-to-br from-green-400 to-green-600 text-white p-10 rounded-3xl cursor-pointer hover:scale-105 transition shadow-xl text-center">
             <h3 className="text-3xl font-bold mb-2">{t.level_1}</h3>
           </div>
         )}
         <div onClick={() => handleSelectLevel('tahap2')} className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-10 rounded-3xl cursor-pointer hover:scale-105 transition shadow-xl text-center">
           <h3 className="text-3xl font-bold mb-2">{t.level_2}</h3>
         </div>
      </div>
    </div>
  );
}

function Leaderboard({ gameName, subject, level }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const scoresRef = collection(db, 'artifacts', appId, 'public', 'data', 'game_scores');
    const unsub = onSnapshot(scoresRef, (snapshot) => {
      const allScores = snapshot.docs.map(doc => doc.data());
      const filtered = allScores
        .filter(s => s.game === gameName && s.subject === subject && s.level === level)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setScores(filtered);
    });
    return () => unsub();
  }, [gameName, subject, level]);

  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mt-8 w-full max-w-md mx-auto">
      <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
        <Trophy className="w-6 h-6" /> Top 5 Carta Kedudukan
      </h3>
      {scores.length === 0 ? (
        <p className="text-slate-400 text-sm">Tiada rekod. Jadilah yang pertama!</p>
      ) : (
        <div className="space-y-3">
          {scores.map((s, idx) => (
            <div key={idx} className="flex justify-between items-center bg-slate-700/50 px-4 py-2 rounded-lg">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="text-slate-400 text-sm">#{idx + 1}</span> {s.playerName}
              </span>
              <span className="font-mono text-yellow-400 font-bold">{s.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- PORTAL PERMAINAN UTAMA ---
function GameView({ setView, t }) {
  const [playerName, setPlayerName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [subject, setSubject] = useState(null);
  const [level, setLevel] = useState(null); 
  const [aiGameMode, setAiGameMode] = useState(null); // 'mcq', 'dodge', 'riddle'

  const saveScoreToDB = async (gameName, score) => {
    if (score <= 0) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'game_scores'), {
        playerName, subject, level, game: gameName, score, createdAt: Date.now()
      });
    } catch (e) {
      console.error("Gagal simpan markah:", e);
    }
  };

  if (!isNameSet) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full animate-in zoom-in">
           <button onClick={() => setView('student_dash')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-800">
            <X className="w-6 h-6" />
          </button>
          <Gamepad2 className="w-16 h-16 text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.player_name}</h2>
          <p className="text-slate-500 mb-6">{t.leaderboard}</p>
          <input 
            type="text" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500 text-center font-bold"
            placeholder="Cth: Amir"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
          />
          <button 
            disabled={!playerName.trim()}
            onClick={() => setIsNameSet(true)}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition shadow-md"
          >
            {t.start_game}
          </button>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 max-w-6xl mx-auto w-full animate-in slide-in-from-right-8">
         <div className="flex justify-between items-center mb-6">
           <button onClick={() => setView('student_dash')} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium">
            ← {t.back_dash}
          </button>
          <div className="bg-pink-100 text-pink-700 px-4 py-1 rounded-full font-bold text-sm">Player: {playerName}</div>
         </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <Gamepad2 className="text-pink-500" /> Pilih Subjek Untuk Bermain / Choose Subject
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUBJECTS.map(sub => (
            <div key={sub} onClick={() => setSubject(sub)} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-pink-300 hover:shadow-lg transition cursor-pointer text-center group">
              <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700">{sub}</h3>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hideTahap1 = subject === 'Sejarah' || subject === 'RBT';

  if (!level) {
    return (
      <div className="p-6 max-w-4xl mx-auto w-full animate-in zoom-in">
         <button onClick={() => setSubject(null)} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
          ← {t.back}
        </button>
        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center bg-white py-4 rounded-2xl shadow-sm border border-slate-100">
          {t.select_level_title} <span className="text-blue-600">{subject}</span>
        </h2>
        <div className={`grid ${hideTahap1 ? 'grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2'} gap-6`}>
           {!hideTahap1 && (
             <div onClick={() => setLevel('tahap1')} className="bg-gradient-to-br from-green-400 to-green-600 text-white p-10 rounded-3xl cursor-pointer hover:scale-105 transition shadow-xl text-center">
               <h3 className="text-3xl font-bold mb-2">{t.level_1}</h3>
             </div>
           )}
           <div onClick={() => setLevel('tahap2')} className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-10 rounded-3xl cursor-pointer hover:scale-105 transition shadow-xl text-center">
             <h3 className="text-3xl font-bold mb-2">{t.level_2}</h3>
           </div>
        </div>
      </div>
    );
  }

  if (!aiGameMode) {
    return (
      <div className="p-6 max-w-5xl mx-auto w-full animate-in zoom-in">
         <button onClick={() => setLevel(null)} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
          ← {t.change_level}
        </button>
        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center bg-white py-4 rounded-2xl shadow-sm border border-slate-100">
          {t.ai_game_title}: <span className="text-blue-600">{subject}</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
           <div onClick={() => setAiGameMode('mcq')} className="bg-blue-600 text-white p-8 rounded-3xl cursor-pointer hover:-translate-y-2 transition-all shadow-xl text-center border-b-8 border-black/20 hover:border-black/40">
             <div className="text-6xl mb-6 bg-white/20 w-24 h-24 mx-auto rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">🚀</div>
             <h3 className="text-2xl font-bold mb-3">{t.mode_mcq}</h3>
             <p className="text-white/90">{t.mode_mcq_desc}</p>
           </div>
           <div onClick={() => setAiGameMode('whack')} className="bg-emerald-600 text-white p-8 rounded-3xl cursor-pointer hover:-translate-y-2 transition-all shadow-xl text-center border-b-8 border-black/20 hover:border-black/40">
             <div className="text-6xl mb-6 bg-white/20 w-24 h-24 mx-auto rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">🔨</div>
             <h3 className="text-2xl font-bold mb-3">{t.mode_whack}</h3>
             <p className="text-white/90">{t.mode_whack_desc}</p>
           </div>
           <div onClick={() => setAiGameMode('riddle')} className="bg-orange-500 text-white p-8 rounded-3xl cursor-pointer hover:-translate-y-2 transition-all shadow-xl text-center border-b-8 border-black/20 hover:border-black/40">
             <div className="text-6xl mb-6 bg-white/20 w-24 h-24 mx-auto rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">🧩</div>
             <h3 className="text-2xl font-bold mb-3">{t.mode_riddle}</h3>
             <p className="text-white/90">{t.mode_riddle_desc}</p>
           </div>
        </div>
      </div>
    );
  }

  return <AIGeneratedGame subject={subject} level={level} gameMode={aiGameMode} playerName={playerName} saveScore={(s) => saveScoreToDB(`AI_${aiGameMode}`, s)} goBack={() => setAiGameMode(null)} t={t} lang={t.logout === 'Logout' ? 'en' : 'ms'} />;
}

function AIGeneratedGame({ subject, level, gameMode, playerName, saveScore, goBack, t, lang }) {
  const [gameState, setGameState] = useState('menu'); // menu, generating, playing, over
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState(null); 
  const [progress, setProgress] = useState(0);

  // States for MCQ Mode
  const [timeLeft, setTimeLeft] = useState(20);
  
  // States for Riddle Mode
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [riddleMistakes, setRiddleMistakes] = useState(0);

  // States for Whack Mode
  const [activeMoles, setActiveMoles] = useState([]);

  // Arcade BGM Ref
  const bgmRef = useRef(null);

  useEffect(() => {
    bgmRef.current = new ArcadeBGM();
    bgmRef.current.start();
    return () => {
      if (bgmRef.current) bgmRef.current.stop();
    };
  }, []);

  // Loading Progress Bar Effect
  useEffect(() => {
    let interval;
    if (gameState === 'generating') {
        setProgress(0);
        interval = setInterval(() => {
            setProgress(p => (p < 90 ? p + Math.floor(Math.random() * 8) + 1 : p));
        }, 300);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // MCQ Timer
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'mcq' && !feedback && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback) {
      handleTimeout();
    }
  }, [timeLeft, gameState, gameMode, feedback]);

  const generateGame = async () => {
    setGameState('generating');
    try {
      const aiLanguage = lang === 'en' ? 'English' : 'Bahasa Melayu';
      const targetAudience = level === 'tahap1' ? 'Level 1 (Ages 7-9)' : 'Level 2 (Ages 10-12)';
      const randomSeed = Math.floor(Math.random() * 1000000); 
      const varietyPrompt = `IMPORTANT: Ensure MAXIMUM randomness and variety. Do not repeat typical questions. Delve into different, unique subtopics within the syllabus. Use Random Seed: ${randomSeed} to guarantee a completely new set of questions.`;
      
      let prompt = "";
      let jsonFormat = "";

      if (gameMode === 'mcq' || gameMode === 'whack') {
          prompt = `Generate 10 creative multiple choice questions for primary school subject ${subject} for ${targetAudience} based on Malaysia syllabus. Provide 3 options (A, B, C) for answer choices. Provide interesting facts/trivia. The output language MUST BE strictly in ${aiLanguage}. ${varietyPrompt}`;
          jsonFormat = `[{"q": "Question Text", "options": ["Option 1","Option 2","Option 3"], "correct": 0, "imagePrompt": "English prompt for vibrant kids 3D illustration", "trivia": "Fun fact"}]`;
      } else if (gameMode === 'riddle') {
          prompt = `Generate 5 educational riddles (Teka-Teki Pintar) for primary school subject ${subject} for ${targetAudience} based on Malaysia syllabus. The answer MUST BE A SINGLE WORD WITHOUT SPACES (max 12 letters). The output language MUST BE strictly in ${aiLanguage}. ${varietyPrompt}`;
          jsonFormat = `[{"riddle": "Riddle text...", "answer_word": "BUMI", "imagePrompt": "English prompt for abstract clue illustration", "trivia": "Fact about the answer"}]`;
      }

      const fullPrompt = `${prompt} Return the output as a JSON array matching this exact format: ${jsonFormat}. Do not return any other text outside the JSON.`;
      
      const payload = {
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };
      
      const apiKey = ""; 
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Gagal akses Gemini API");
      const data = await res.json();
      let newQuestions = JSON.parse(data.candidates[0].content.parts[0].text);

      const questionsWithImages = await Promise.all(newQuestions.map(async (q, index) => {
        // PANTASKAN PENJANAAN: Hanya jana imej AI untuk soalan pertama sebagai visual tema, yang lain teks sahaja!
        if (index === 0 && q.imagePrompt) {
          try {
            const imgPayload = {
              contents: [{ role: 'user', parts: [{ text: "Create a highly engaging educational game illustration for kids, 3D style: " + q.imagePrompt }] }],
              generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: "16:9" } }
            };
            const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgPayload)
            });
            const imgData = await imgRes.json();
            const part = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part) {
              return { ...q, imageData: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
            }
          } catch (e) { console.error("Gagal load imej AI:", e); }
        }
        return q;
      }));
      
      setQuestions(questionsWithImages);
      setScore(0);
      setLives(3);
      setCurrentQ(0);
      setProgress(100);
      
      if (gameMode === 'whack') {
        setActiveMoles([]);
      }

      resetLevelState();
      setGameState('playing');
    } catch (e) {
      console.error(e);
      alert("Gagal menjana Permainan AI. Sila pastikan API key disediakan.");
      setGameState('menu');
    }
  };

  const resetLevelState = () => {
    setTimeLeft(20);
    setGuessedLetters([]);
    setRiddleMistakes(0);
    setActiveMoles([]);
    setFeedback(null);
  };

  const handleTimeout = () => {
    playSFX('wrong');
    setLives(lives - 1);
    setFeedback({ isCorrect: false, text: t.time_out + " " + (questions[currentQ].trivia || "") });
  };

  const handleAnswer = (index) => {
    if (feedback) return; 
    const q = questions[currentQ];
    
    if (gameMode === 'whack') {
        setActiveMoles([]); // Sembunyikan semua mole jika dah dijawab
    }

    if (index === q.correct) {
      playSFX('correct');
      const timeBonus = gameMode === 'mcq' ? Math.floor(timeLeft / 2) : 0;
      setScore(score + 20 + timeBonus);
      setFeedback({ isCorrect: true, text: `${t.congrats} ` + (q.trivia || "") });
    } else {
      playSFX('wrong');
      setLives(lives - 1);
      setFeedback({ isCorrect: false, text: `${t.oops} Trivia: ` + (q.trivia || "") });
    }
  };

  const handleLetterGuess = (letter) => {
    if (feedback) return;
    const q = questions[currentQ];
    const word = (q.answer_word || "").toUpperCase().replace(/\s/g, ''); 
    
    if (guessedLetters.includes(letter)) return;
    const newGuessed = [...guessedLetters, letter];
    setGuessedLetters(newGuessed);

    if (!word.includes(letter)) {
      playSFX('wrong');
      const newMistakes = riddleMistakes + 1;
      setRiddleMistakes(newMistakes);
      if (newMistakes >= 5) {
        setLives(lives - 1);
        setFeedback({ isCorrect: false, text: `${t.oops} Jawapan: ${word}. ` + (q.trivia || "") });
      }
    } else {
      playSFX('correct');
      const isWin = word.split('').every(char => newGuessed.includes(char));
      if (isWin) {
        setScore(score + 30 - (riddleMistakes * 5));
        setFeedback({ isCorrect: true, text: `${t.congrats} ` + (q.trivia || "") });
      }
    }
  };

  const handleNext = () => {
    if (lives <= 0) {
      playSFX('over');
      saveScore(score);
      setGameState('over');
    } else {
      if (currentQ >= questions.length - 1) {
          playSFX('over');
          saveScore(score);
          setGameState('over');
          return;
      } else {
          setCurrentQ(currentQ + 1);
      }
      resetLevelState();
    }
  };

  // Mekanik untuk "Ketuk Jawapan / Whack-a-Fact"
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'whack' && !feedback) {
        // Jana lubang mole yang baru setiap 2 saat
        const moleInterval = setInterval(() => {
            const q = questions[currentQ];
            if (!q) return;

            const options = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct, originalIndex: i }));
            options.sort(() => Math.random() - 0.5); // Rawakkan pilihan jawapan
            
            // Pilih 3 lubang rawak (dari 0-5)
            const holes = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
            
            const newMoles = holes.map((holeId, idx) => ({
                holeId,
                ...options[idx]
            }));
            
            setActiveMoles(newMoles);
        }, 2000); 

        return () => clearInterval(moleInterval);
    }
  }, [gameState, gameMode, currentQ, feedback, questions]);

  const modeTheme = {
    mcq: { icon: '🚀', color: 'indigo', title: t.mode_mcq },
    whack: { icon: '🔨', color: 'emerald', title: t.mode_whack },
    riddle: { icon: '🧩', color: 'orange', title: t.mode_riddle }
  }[gameMode];

  const q = questions[currentQ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full animate-in zoom-in-95">
      <button onClick={goBack} className="text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-2 font-medium">
        ← {t.back}
      </button>

      <div className={`bg-slate-900 rounded-3xl p-4 sm:p-6 text-center text-white shadow-2xl relative overflow-hidden ring-4 ring-${modeTheme.color}-500/50`}>
        
        {/* Menu State */}
        {gameState === 'menu' && (
          <div className="py-16 sm:py-20 animate-in fade-in">
            <div className="text-6xl mb-6">{modeTheme.icon}</div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-${modeTheme.color}-400 to-pink-500`}>
              {modeTheme.title}: {subject}
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto text-base sm:text-lg">
              {gameMode === 'mcq' ? t.mode_mcq_desc : gameMode === 'board' ? t.mode_board_desc : t.mode_riddle_desc}
            </p>
            <button 
              onClick={generateGame}
              className={`bg-${modeTheme.color}-600 hover:bg-${modeTheme.color}-500 text-white font-bold px-8 py-4 rounded-xl text-xl transition shadow-lg shadow-${modeTheme.color}-600/40 flex items-center justify-center gap-3 mx-auto`}
            >
              <Sparkles className="w-6 h-6" /> {t.start_gen}
            </button>
            <Leaderboard gameName={`AI_${gameMode}`} subject={subject} level={level} />
          </div>
        )}

        {/* LOADING SCREEN BARU */}
        {gameState === 'generating' && (
          <div className="py-24 sm:py-32 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <Sparkles className="w-8 h-8 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              {t.generating_title}
            </h2>
            
            <div className="text-3xl font-bold text-white mb-2">{progress}%</div>
            <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && q && (
          <div className="relative animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6 px-2 sm:px-4">
               <div className={`text-base sm:text-xl font-bold text-${modeTheme.color}-400`}>{t.level_text} {currentQ + 1} / {questions.length}</div>
               <div className="flex gap-4 sm:gap-6">
                 <div className="text-base sm:text-xl font-bold text-yellow-400">{t.score_text}: {score}</div>
                 <div className="text-base sm:text-xl font-bold text-red-400">{t.life_text}: {'❤️'.repeat(lives)}</div>
               </div>
            </div>

            {/* Mode 1: MCQ (Arcade / Timer Mode) */}
            {gameMode === 'mcq' && (
              <>
                <div className="w-full bg-slate-800 rounded-full h-4 mb-6 overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft > 5 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} style={{ width: `${(timeLeft / 20) * 100}%` }}></div>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-inner mb-6 border border-slate-700">
                  {q.imageData && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-slate-600 max-w-lg mx-auto bg-slate-900">
                      <img src={q.imageData} alt="AI Art" className="w-full h-auto object-cover" />
                    </div>
                  )}
                  <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">{q.q}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {q.options.map((opt, i) => (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
                      className={`p-4 rounded-xl font-bold text-lg transition-all border-2
                        ${feedback === null ? 'bg-slate-800 border-slate-600 hover:bg-indigo-600 hover:border-indigo-400 text-slate-200' 
                        : i === q.correct ? 'bg-green-600 border-green-400 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-500 opacity-50'}
                      `}
                    >{opt}</button>
                  ))}
                </div>
              </>
            )}

            {/* Mode 2: WHACK-A-FACT (Ketuk Jawapan Pintar) */}
            {gameMode === 'whack' && (
              <>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-inner mb-8 border border-slate-700">
                  {q.imageData && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-slate-600 max-w-sm mx-auto bg-slate-900">
                      <img src={q.imageData} alt="AI Art" className="w-full h-auto object-cover" />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white leading-relaxed">{q.q}</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                  {[0, 1, 2, 3, 4, 5].map(holeId => {
                     const mole = activeMoles.find(m => m.holeId === holeId);
                     return (
                        <div key={holeId} className="h-32 bg-slate-900 rounded-2xl border-4 border-slate-700 flex items-end justify-center overflow-hidden relative shadow-inner p-1">
                           {mole && (
                              <button 
                                onClick={() => handleAnswer(mole.originalIndex)}
                                className="w-full h-full bg-emerald-500 rounded-xl border-b-8 border-emerald-700 animate-in slide-in-from-bottom duration-200 flex items-center justify-center p-3 text-white font-bold text-sm sm:text-base shadow-xl active:translate-y-6 transition-transform text-center leading-snug break-words"
                              >
                                {mole.text}
                              </button>
                           )}
                        </div>
                     )
                  })}
                </div>
              </>
            )}

            {/* Mode 3: RIDDLE (Hangman / Word Guess Mode) */}
            {gameMode === 'riddle' && (
              <>
                <div className="bg-slate-800 rounded-2xl p-6 shadow-inner mb-6 border border-slate-700">
                  {q.imageData && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-slate-600 max-w-xs mx-auto bg-slate-900">
                      <img src={q.imageData} alt="Riddle Clue" className="w-full h-auto object-cover" />
                    </div>
                  )}
                  <h3 className="text-2xl md:text-3xl font-bold text-orange-400 leading-relaxed italic">"{q.riddle}"</h3>
                </div>
                
                <div className="mb-8">
                  <p className="text-slate-400 mb-4">{t.guess_word}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(q.answer_word || "").toUpperCase().replace(/\s/g, '').split('').map((char, i) => (
                      <div key={i} className={`w-12 h-14 sm:w-16 sm:h-20 flex items-center justify-center text-3xl font-black rounded-lg border-b-4 
                        ${guessedLetters.includes(char) ? 'bg-orange-500 border-orange-700 text-white' : 'bg-slate-700 border-slate-900 text-transparent'}`}>
                        {guessedLetters.includes(char) ? char : '_'}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                   {[...Array(5)].map((_, i) => (
                     <div key={i} className={`w-4 h-4 rounded-full ${i < riddleMistakes ? 'bg-red-500' : 'bg-slate-600'}`}></div>
                   ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(letter => {
                    const isGuessed = guessedLetters.includes(letter);
                    const isWrong = isGuessed && !(q.answer_word || "").toUpperCase().includes(letter);
                    return (
                      <button 
                        key={letter}
                        onClick={() => handleLetterGuess(letter)}
                        disabled={isGuessed || feedback !== null}
                        className={`w-10 h-12 rounded-md font-bold text-lg transition-all border-b-4
                          ${!isGuessed ? 'bg-slate-200 border-slate-400 text-slate-800 hover:bg-white hover:-translate-y-1' 
                          : isWrong ? 'bg-red-900/50 border-red-900 text-red-500/50' 
                          : 'bg-green-900/50 border-green-900 text-green-500/50'}
                        `}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Modal Maklum Balas */}
            {feedback && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6 animate-in zoom-in-90 z-20">
                <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 text-center max-w-md w-full">
                   <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${feedback.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                     {feedback.isCorrect ? <CheckCircle className="w-10 h-10" /> : <X className="w-10 h-10" />}
                   </div>
                   <h3 className={`text-2xl font-bold mb-4 ${feedback.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                     {feedback.isCorrect ? t.congrats : t.oops}
                   </h3>
                   <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                     {feedback.text}
                   </p>
                   <button 
                     onClick={handleNext}
                     className={`w-full bg-${modeTheme.color}-600 hover:bg-${modeTheme.color}-500 text-white font-bold py-4 rounded-xl transition shadow-lg`}
                   >
                     {lives <= 0 || currentQ >= questions.length - 1 ? t.see_results : t.next_challenge}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Over State */}
        {gameState === 'over' && (
          <div className="py-16 animate-in zoom-in">
            <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-4xl font-extrabold text-white mb-2">{t.game_over}</h2>
            {lives <= 0 && <p className="text-red-400 font-bold mb-4">{t.out_of_lives}</p>}
            <p className="text-slate-300 text-xl mb-8">{t.final_score} <span className="font-bold text-4xl text-yellow-400 block mt-2">{score}</span></p>
            <button 
              onClick={() => setGameState('menu')}
              className={`bg-${modeTheme.color}-600 hover:bg-${modeTheme.color}-500 text-white font-bold px-8 py-4 rounded-xl text-xl transition shadow-lg`}
            >
              {t.play_again}
            </button>
            <Leaderboard gameName={`AI_${gameMode}`} subject={subject} level={level} />
          </div>
        )}
      </div>
    </div>
  );
}

function TakeQuizView({ quiz, setView, showToast, user, t }) {
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentClassInput, setStudentClassInput] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!hasStarted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full animate-in zoom-in">
          <GraduationCap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Maklumat Diri</h2>
          <p className="text-slate-500 mb-6">Sila isi nama dan kelas untuk rekod Cikgu.</p>
          <div className="space-y-4 mb-6">
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder={t.enter_name || "Cth: Ahmad Ali"}
              value={studentNameInput}
              onChange={e => setStudentNameInput(e.target.value)}
            />
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder={t.enter_class}
              value={studentClassInput}
              onChange={e => setStudentClassInput(e.target.value)}
            />
          </div>
          <button 
            disabled={!studentClassInput.trim() || !studentNameInput.trim()}
            onClick={() => setHasStarted(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            {t.start_quiz}
          </button>
        </div>
      </div>
    );
  }

  const handleSelect = (qIndex, oIndex) => {
    setAnswers({ ...answers, [qIndex]: oIndex });
  };

  const handleNext = () => {
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    let finalScore = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct) finalScore += 1;
    });
    setScore(finalScore);
    setIsFinished(true);
    
    if (user) {
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'results'), {
          quizId: quiz.id,
          quizTitle: quiz.title,
          quizSubject: quiz.subject || 'Umum',
          studentId: user.uid,
          studentName: studentNameInput,
          studentClass: studentClassInput,
          score: finalScore,
          total: quiz.questions.length,
          createdAt: Date.now()
        });
        showToast('Tahniah! Markah anda telah direkodkan.');
      } catch (e) {
        console.error("Error saving result", e);
      }
      setIsSubmitting(false);
    }
  };

  if (isFinished) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full animate-in zoom-in">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Kuiz Tamat!</h2>
          <p className="text-slate-500 mb-6">Berikut adalah keputusan anda untuk {quiz.title}</p>
          <div className="text-6xl font-extrabold text-blue-600 mb-8">
            {score} <span className="text-2xl text-slate-400">/ {quiz.questions.length}</span>
          </div>
          <button 
            onClick={() => setView('student_dash')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl transition"
          >
            {t.back_dash}
          </button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQ];
  const progress = ((currentQ) / quiz.questions.length) * 100;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full pt-10">
      <div className="mb-8">
        <div className="flex justify-between text-sm font-semibold text-slate-500 mb-2">
          <span>{quiz.title}</span>
          <span>{t.questions} {currentQ + 1} / {quiz.questions.length}</span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-right-4">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 leading-relaxed">{q.q}</h3>
        
        {q.imageData && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-md border border-slate-100 max-w-lg mx-auto">
            <img src={q.imageData} alt="Ilustrasi soalan" className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(currentQ, i)}
              className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all font-medium text-lg
                ${answers[currentQ] === i 
                  ? 'border-blue-500 bg-blue-50 text-blue-800' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-700'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-10 flex justify-end">
          <button
            disabled={answers[currentQ] === undefined || isSubmitting}
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl transition flex items-center gap-2 shadow-md"
          >
            {currentQ === quiz.questions.length - 1 ? t.submit_answers : t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
