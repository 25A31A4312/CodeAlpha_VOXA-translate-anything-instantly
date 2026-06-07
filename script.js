/**
 * VOXA — script.js
 * AI Powered Language Translator
 */

'use strict';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const CHAR_MAX   = 5000;
const CHAR_WARN  = 4000;
const HIST_MAX   = 50;
const FAV_MAX    = 100;
const AUTO_DELAY = 1000;

const K_THEME = 'voxa_theme';
const K_HIST  = 'voxa_hist';
const K_FAVS  = 'voxa_favs';

/* ─────────────────────────────────────────
   LANGUAGE LIST
───────────────────────────────────────── */
const LANG_LIST = [
  { code: 'en',    name: 'English' },
  { code: 'es',    name: 'Spanish' },
  { code: 'fr',    name: 'French' },
  { code: 'de',    name: 'German' },
  { code: 'it',    name: 'Italian' },
  { code: 'pt',    name: 'Portuguese' },
  { code: 'ru',    name: 'Russian' },
  { code: 'ja',    name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ar',    name: 'Arabic' },
  { code: 'ko',    name: 'Korean' },
  { code: 'hi',    name: 'Hindi' },
  { code: 'te',    name: 'Telugu' },
  { code: 'ta',    name: 'Tamil' },
  { code: 'kn',    name: 'Kannada' },
  { code: 'ml',    name: 'Malayalam' },
  { code: 'bn',    name: 'Bengali' },
  { code: 'gu',    name: 'Gujarati' },
  { code: 'mr',    name: 'Marathi' },
  { code: 'pa',    name: 'Punjabi' },
  { code: 'ur',    name: 'Urdu' },
  { code: 'nl',    name: 'Dutch' },
  { code: 'pl',    name: 'Polish' },
  { code: 'tr',    name: 'Turkish' },
  { code: 'sv',    name: 'Swedish' },
  { code: 'da',    name: 'Danish' },
  { code: 'fi',    name: 'Finnish' },
  { code: 'uk',    name: 'Ukrainian' },
  { code: 'cs',    name: 'Czech' },
  { code: 'ro',    name: 'Romanian' },
  { code: 'hu',    name: 'Hungarian' },
  { code: 'el',    name: 'Greek' },
  { code: 'he',    name: 'Hebrew' },
  { code: 'th',    name: 'Thai' },
  { code: 'vi',    name: 'Vietnamese' },
  { code: 'id',    name: 'Indonesian' },
  { code: 'ms',    name: 'Malay' },
  { code: 'af',    name: 'Afrikaans' },
  { code: 'no',    name: 'Norwegian' },
  { code: 'sk',    name: 'Slovak' },
  { code: 'sw',    name: 'Swahili' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
];

/* ─────────────────────────────────────────
   SPEECH BCP-47 MAP
───────────────────────────────────────── */
const SPEECH_MAP = {
  en:'en-US', hi:'hi-IN', te:'te-IN', ta:'ta-IN', kn:'kn-IN',
  ml:'ml-IN', bn:'bn-IN', gu:'gu-IN', mr:'mr-IN', pa:'pa-IN',
  ur:'ur-PK', fr:'fr-FR', de:'de-DE', es:'es-ES', it:'it-IT',
  pt:'pt-BR', ru:'ru-RU', ja:'ja-JP', ko:'ko-KR', ar:'ar-SA',
  nl:'nl-NL', pl:'pl-PL', tr:'tr-TR', sv:'sv-SE', da:'da-DK',
  fi:'fi-FI', vi:'vi-VN', id:'id-ID', uk:'uk-UA', cs:'cs-CZ',
  ro:'ro-RO', hu:'hu-HU', el:'el-GR', he:'he-IL', th:'th-TH',
  'zh-CN':'zh-CN', 'zh-TW':'zh-TW',
};
const toBCP47 = code => SPEECH_MAP[code] || code;

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const S = {
  translating: false,
  micActive:   false,
  recognition: null,
  drawerOpen:  false,
  activeTab:   'history',
  translation: '',
  srcText:     '',
  srcLang:     '',
  tgtLang:     '',
  history:     [],
  favorites:   [],
  autoTimer:   null,
};

/* ─────────────────────────────────────────
   DOM CACHE
   ⚠️  IDs must exactly match your index.html
───────────────────────────────────────── */
let E = {};

function cacheElements() {
  E = {
    /* Header */
    btnHistory:   document.getElementById('btn-history'),
    btnTheme:     document.getElementById('btn-theme'),
    themeLabel:   document.getElementById('theme-label'),
    iconMoon:     document.getElementById('icon-moon'),
    iconSun:      document.getElementById('icon-sun'),

    /* Language selectors — matching index.html ids */
    srcLang:      document.getElementById('src-lang'),
    tgtLang:      document.getElementById('tgt-lang'),
    btnSwap:      document.getElementById('btn-swap'),
    tgtPill:      document.getElementById('tgt-pill'),

    /* Source panel */
    srcText:      document.getElementById('src-text'),
    charCt:       document.getElementById('char-ct'),
    detectedWrap: document.getElementById('detected-wrap'),
    detectedLang: document.getElementById('detected-lang'),
    srcStats:     document.getElementById('src-stats'),
    wordCt:       document.getElementById('word-ct'),
    readTime:     document.getElementById('read-time'),
    btnMic:       document.getElementById('btn-mic'),
    btnClear:     document.getElementById('btn-clear'),
    btnTranslate: document.getElementById('btn-translate'),
    tbLabel:      document.getElementById('tb-label'),
    tbSpin:       document.getElementById('tb-spin'),
    tbArrow:      document.getElementById('tb-arrow'),

    /* Target panel */
    outPlaceholder: document.getElementById('out-placeholder'),
    outSkeleton:    document.getElementById('out-skeleton'),
    outResult:      document.getElementById('out-result'),
    btnTts:         document.getElementById('btn-tts'),
    btnFav:         document.getElementById('btn-fav'),
    btnCopy:        document.getElementById('btn-copy'),
    btnDl:          document.getElementById('btn-dl'),

    /* Quick pills */
    quickPills:   document.querySelectorAll('.qpill'),

    /* Drawer */
    overlay:        document.getElementById('overlay'),
    drawer:         document.getElementById('drawer'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    drawerTabs:     document.querySelectorAll('.dtab'),
    tabHistory:     document.getElementById('tab-history'),
    tabFavorites:   document.getElementById('tab-favorites'),
    histList:       document.getElementById('hist-list'),
    histEmpty:      document.getElementById('hist-empty'),
    favList:        document.getElementById('fav-list'),
    favEmpty:       document.getElementById('fav-empty'),
    btnClrHist:     document.getElementById('btn-clr-hist'),

    /* Toast */
    toastBox:     document.getElementById('toast-container'),
  };

  /* Log any missing elements so you can spot ID mismatches immediately */
  Object.entries(E).forEach(([key, val]) => {
    if (!val) console.warn(`[VOXA] Missing element: "${key}"`);
  });
}

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  buildDropdowns();   // fill both <select> from LANG_LIST
  loadTheme();
  loadStorage();
  bindEvents();
  renderHistory();
  renderFavorites();
  syncPills();
  updateTgtPill();
});

/* ─────────────────────────────────────────
   BUILD DROPDOWNS FROM LANG_LIST
   (Does NOT depend on any external API)
───────────────────────────────────────── */
function buildDropdowns() {
  /* FROM — first option is Auto Detect, rest from LANG_LIST */
  E.srcLang.innerHTML = '<option value="auto">Auto Detect</option>';
  LANG_LIST.forEach(({ code, name }) => {
    E.srcLang.appendChild(new Option(name, code));
  });
  E.srcLang.value = 'auto';

  /* TO — all languages, default English */
  E.tgtLang.innerHTML = '';
  LANG_LIST.forEach(({ code, name }) => {
    E.tgtLang.appendChild(new Option(name, code));
  });
  E.tgtLang.value = 'en';

  updateTgtPill();
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function getLangName(code) {
  if (!code || code === 'auto') return 'Auto';
  const found = LANG_LIST.find(l => l.code === code);
  return found ? found.name : code.toUpperCase();
}

function updateTgtPill() {
  if (E.tgtPill) {
    const sel = E.tgtLang.selectedOptions[0];
    E.tgtPill.textContent = sel ? sel.text : 'English';
  }
}

function syncPills() {
  const tgt = E.tgtLang.value;
  E.quickPills.forEach(p => p.classList.toggle('active', p.dataset.code === tgt));
}

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function loadTheme() {
  applyTheme(localStorage.getItem(K_THEME) || 'dark');
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  if (E.themeLabel) E.themeLabel.textContent = t === 'dark' ? 'Light' : 'Dark';
  if (E.iconMoon)   E.iconMoon.style.display  = t === 'dark'  ? 'block' : 'none';
  if (E.iconSun)    E.iconSun.style.display   = t === 'light' ? 'block' : 'none';
  localStorage.setItem(K_THEME, t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ─────────────────────────────────────────
   STORAGE
───────────────────────────────────────── */
function loadStorage() {
  try { S.history   = JSON.parse(localStorage.getItem(K_HIST)) || []; } catch { S.history   = []; }
  try { S.favorites = JSON.parse(localStorage.getItem(K_FAVS)) || []; } catch { S.favorites = []; }
}
function saveHistory()   { try { localStorage.setItem(K_HIST, JSON.stringify(S.history));   } catch {} }
function saveFavorites() { try { localStorage.setItem(K_FAVS, JSON.stringify(S.favorites)); } catch {} }

/* ─────────────────────────────────────────
   BIND EVENTS
───────────────────────────────────────── */
function bindEvents() {
  E.btnTheme.addEventListener('click', toggleTheme);
  E.btnHistory.addEventListener('click', openDrawer);
  E.btnCloseDrawer.addEventListener('click', closeDrawer);
  E.overlay.addEventListener('click', closeDrawer);
  E.btnClrHist.addEventListener('click', clearHistory);

  E.drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  E.tgtLang.addEventListener('change', () => { updateTgtPill(); syncPills(); });
  E.srcLang.addEventListener('change', hideDetected);
  E.btnSwap.addEventListener('click', swapLanguages);

  E.srcText.addEventListener('input', onTextInput);
  E.srcText.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doTranslate(); }
  });

  E.btnTranslate.addEventListener('click', doTranslate);
  E.btnClear.addEventListener('click', clearAll);
  E.btnMic.addEventListener('click', toggleMic);
  E.btnTts.addEventListener('click', doTTS);
  E.btnFav.addEventListener('click', toggleFavCurrent);
  E.btnCopy.addEventListener('click', doCopy);
  E.btnDl.addEventListener('click', doDownload);

  E.quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      E.tgtLang.value = pill.dataset.code;
      updateTgtPill();
      syncPills();
      if (E.srcText.value.trim()) doTranslate();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.drawerOpen) closeDrawer();
  });
}

/* ─────────────────────────────────────────
   TEXT INPUT
───────────────────────────────────────── */
function onTextInput() {
  const text = E.srcText.value;
  const len  = text.length;

  E.charCt.textContent = `${len.toLocaleString()} / 5000`;
  E.charCt.className = 'char-ct' + (len >= 5000 ? ' over' : len >= 4000 ? ' warn' : '');

  if (text.trim()) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const mins  = Math.max(1, Math.ceil(words / 200));
    E.wordCt.textContent  = `Words: ${words}`;
    E.readTime.textContent = `~${mins} min read`;
    E.srcStats.style.display = 'flex';
  } else {
    E.srcStats.style.display = 'none';
  }

  clearTimeout(S.autoTimer);
  if (text.trim().length >= 3) {
    S.autoTimer = setTimeout(() => {
      if (!S.translating && E.srcText.value.trim().length >= 3) doTranslate();
    }, AUTO_DELAY);
  }
}

/* ─────────────────────────────────────────
   SWAP
───────────────────────────────────────── */
function swapLanguages() {
  if (E.srcLang.value === 'auto') {
    showToast('Cannot swap when source is Auto Detect', 'warn'); return;
  }
  const src = E.srcLang.value;
  const tgt = E.tgtLang.value;
  E.srcLang.value = tgt;
  E.tgtLang.value = src;

  const oldSrc = E.srcText.value;
  E.srcText.value = S.translation;
  if (S.translation) showResult(S.translation);
  S.translation = oldSrc;

  updateTgtPill();
  syncPills();
  onTextInput();
  hideDetected();
}

/* ─────────────────────────────────────────
   TRANSLATE  —  Google Translate (no key needed)
───────────────────────────────────────── */
async function doTranslate() {
  const text = E.srcText.value.trim();
  if (!text) { showToast('Please enter text to translate', 'warn'); return; }
  if (S.translating) return;

  const srcCode = E.srcLang.value;
  const tgtCode = E.tgtLang.value;
  if (!tgtCode) { showToast('Please select a target language', 'warn'); return; }

  S.translating = true;
  setLoading(true);

  try {
    const { translatedText, detectedLang } = await googleTranslate(text, srcCode, tgtCode);

    S.translation = translatedText;
    S.srcText     = text;
    S.srcLang     = detectedLang || srcCode;
    S.tgtLang     = tgtCode;

    showResult(translatedText);
    enableOutputBtns(true);

    if (srcCode === 'auto' && detectedLang) {
      E.detectedLang.textContent   = getLangName(detectedLang);
      E.detectedWrap.style.display = 'flex';
    }

    /* Save history */
    const entry = {
      id:      Date.now() + '-' + Math.random().toString(36).slice(2),
      srcText: text,
      tgtText: translatedText,
      srcCode: S.srcLang,
      tgtCode: tgtCode,
      srcName: getLangName(S.srcLang),
      tgtName: getLangName(tgtCode),
      ts:      Date.now(),
    };
    S.history.unshift(entry);
    if (S.history.length > HIST_MAX) S.history.length = HIST_MAX;
    saveHistory();
    renderHistory();
    syncFavButton();

  } catch (err) {
    console.error('[VOXA]', err);
    showToast(err.message || 'Translation failed. Check your internet.', 'err');
    showPlaceholder();
  } finally {
    S.translating = false;
    setLoading(false);
  }
}

/* ─────────────────────────────────────────
   GOOGLE TRANSLATE  (unofficial, free, no key)
   Works in any browser — CORS allowed by Google
───────────────────────────────────────── */
async function googleTranslate(text, sl, tl) {
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}` +
    `&dt=t&dt=ld&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) throw new Error(`Translation service error (HTTP ${res.status})`);

  const data = await res.json();

  if (!data || !Array.isArray(data[0])) {
    throw new Error('Unexpected response from translation service');
  }

  /* data[0] = array of [translatedChunk, originalChunk] pairs */
  const translatedText = data[0]
    .filter(chunk => Array.isArray(chunk) && chunk[0])
    .map(chunk => chunk[0])
    .join('');

  if (!translatedText.trim()) throw new Error('Empty translation returned');

  /* data[2] = detected language when sl=auto */
  const detectedLang = (sl === 'auto' && data[2]) ? data[2] : null;

  return { translatedText, detectedLang };
}

/* ─────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────── */
function setLoading(on) {
  E.btnTranslate.disabled = on;
  if (E.tbLabel) E.tbLabel.style.display = on ? 'none'  : 'inline';
  if (E.tbSpin)  E.tbSpin.style.display  = on ? 'block' : 'none';
  if (E.tbArrow) E.tbArrow.style.display = on ? 'none'  : 'block';

  if (on) {
    E.outPlaceholder.style.display = 'none';
    E.outResult.style.display      = 'none';
    E.outSkeleton.style.display    = 'flex';
    enableOutputBtns(false);
  } else {
    E.outSkeleton.style.display = 'none';
  }
}

function showResult(text) {
  E.outPlaceholder.style.display = 'none';
  E.outSkeleton.style.display    = 'none';
  E.outResult.style.display      = 'block';
  E.outResult.textContent        = text;
}

function showPlaceholder() {
  E.outPlaceholder.style.display = 'flex';
  E.outSkeleton.style.display    = 'none';
  E.outResult.style.display      = 'none';
}

function enableOutputBtns(on) {
  E.btnTts.disabled  = !on;
  E.btnFav.disabled  = !on;
  E.btnCopy.disabled = !on;
  E.btnDl.disabled   = !on;
}

function hideDetected() { E.detectedWrap.style.display = 'none'; }

/* ─────────────────────────────────────────
   CLEAR
───────────────────────────────────────── */
function clearAll() {
  E.srcText.value          = '';
  E.charCt.textContent     = '0 / 5000';
  E.charCt.className       = 'char-ct';
  E.srcStats.style.display = 'none';
  S.translation = '';
  S.srcText     = '';
  clearTimeout(S.autoTimer);
  hideDetected();
  showPlaceholder();
  enableOutputBtns(false);
  E.btnFav.classList.remove('fav-on');
  E.srcText.focus();
}

/* ─────────────────────────────────────────
   MIC (Speech to Text)
───────────────────────────────────────── */
function toggleMic() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported. Use Chrome.', 'err'); return;
  }
  S.micActive ? stopMic() : startMic();
}

function startMic() {
  const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  const raw = E.srcLang.value !== 'auto' ? E.srcLang.value : 'en';
  rec.lang            = toBCP47(raw);
  rec.continuous      = false;
  rec.interimResults  = false;

  rec.onstart  = () => { S.micActive = true; E.btnMic.classList.add('mic-on'); showToast(`Listening (${rec.lang})…`, 'info'); };
  rec.onresult = ev  => {
    const t = ev.results[0][0].transcript;
    E.srcText.value = E.srcText.value ? E.srcText.value + ' ' + t : t;
    onTextInput();
    doTranslate();
  };
  rec.onerror  = ev  => {
    const m = { 'no-speech':'No speech.', 'audio-capture':'No mic.', 'not-allowed':'Mic denied.', 'network':'Network error.' };
    showToast(m[ev.error] || 'Voice error.', 'err');
    stopMic();
  };
  rec.onend = stopMic;
  S.recognition = rec;
  rec.start();
}

function stopMic() {
  S.micActive = false;
  E.btnMic.classList.remove('mic-on');
  try { S.recognition?.stop(); } catch {}
  S.recognition = null;
}

/* ─────────────────────────────────────────
   TTS (Text to Speech)
───────────────────────────────────────── */
function doTTS() {
  if (!('speechSynthesis' in window)) { showToast('TTS not supported.', 'err'); return; }
  if (!S.translation) return;
  window.speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(S.translation);
  u.lang   = toBCP47(E.tgtLang.value || 'en');
  u.rate   = 0.95;
  u.onstart  = () => { E.btnTts.style.color = 'var(--mint)'; E.btnTts.style.borderColor = 'var(--mint)'; };
  u.onend    = () => { E.btnTts.style.color = ''; E.btnTts.style.borderColor = ''; };
  u.onerror  = () => { E.btnTts.style.color = ''; E.btnTts.style.borderColor = ''; };
  window.speechSynthesis.speak(u);
}

/* ─────────────────────────────────────────
   COPY
───────────────────────────────────────── */
async function doCopy() {
  if (!S.translation) return;
  try {
    await navigator.clipboard.writeText(S.translation);
    showToast('Copied!', 'ok');
    flashBtn(E.btnCopy, 'var(--ok)');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = S.translation;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied!', 'ok');
  }
}

/* ─────────────────────────────────────────
   DOWNLOAD
───────────────────────────────────────── */
function doDownload() {
  if (!S.translation) return;
  const content = [
    'VOXA — AI Powered Language Translator',
    `Date: ${new Date().toLocaleString()}`,
    `From: ${getLangName(S.srcLang)}  →  To: ${getLangName(S.tgtLang)}`,
    '', '── Original ──', S.srcText,
    '', '── Translation ──', S.translation,
  ].join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = `voxa_${getLangName(S.tgtLang).replace(/\s+/g,'_').toLowerCase()}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  showToast('Downloaded!', 'ok');
}

/* ─────────────────────────────────────────
   FAVORITES
───────────────────────────────────────── */
function makeFavId() {
  return `${S.srcLang}|${S.tgtLang}|${S.srcText.slice(0, 40)}`;
}

function toggleFavCurrent() {
  if (!S.translation) return;
  const id  = makeFavId();
  const idx = S.favorites.findIndex(f => f.favId === id);
  if (idx > -1) {
    S.favorites.splice(idx, 1);
    E.btnFav.classList.remove('fav-on');
    showToast('Removed from favorites.', 'info');
  } else {
    if (S.favorites.length >= FAV_MAX) S.favorites.pop();
    S.favorites.unshift({
      favId:   id,
      id:      Date.now() + '-' + Math.random().toString(36).slice(2),
      srcText: S.srcText,    tgtText: S.translation,
      srcCode: S.srcLang,    tgtCode: S.tgtLang,
      srcName: getLangName(S.srcLang), tgtName: getLangName(S.tgtLang),
      ts: Date.now(),
    });
    E.btnFav.classList.add('fav-on');
    showToast('Saved to favorites! ⭐', 'ok');
  }
  saveFavorites();
  renderFavorites();
  renderHistory();
}

function syncFavButton() {
  const id = makeFavId();
  E.btnFav.classList.toggle('fav-on', S.favorites.some(f => f.favId === id));
}

function toggleFavFromList(entry) {
  const id  = entry.favId || `${entry.srcCode}|${entry.tgtCode}|${entry.srcText.slice(0,40)}`;
  const idx = S.favorites.findIndex(f => f.favId === id);
  if (idx > -1) {
    S.favorites.splice(idx, 1);
    showToast('Removed from favorites.', 'info');
  } else {
    S.favorites.unshift({ ...entry, favId: id });
    showToast('Saved! ⭐', 'ok');
  }
  saveFavorites();
  renderFavorites();
  renderHistory();
  syncFavButton();
}

/* ─────────────────────────────────────────
   HISTORY & FAVORITES RENDER
───────────────────────────────────────── */
function renderHistory() {
  E.histList.innerHTML = '';
  const empty = !S.history.length;
  E.histEmpty.style.display = empty ? 'block' : 'none';
  if (!empty) S.history.forEach(e => E.histList.appendChild(buildCard(e)));
}

function renderFavorites() {
  E.favList.innerHTML = '';
  const empty = !S.favorites.length;
  E.favEmpty.style.display = empty ? 'block' : 'none';
  if (!empty) S.favorites.forEach(e => E.favList.appendChild(buildCard(e)));
}

function buildCard(entry) {
  const favId = entry.favId || `${entry.srcCode}|${entry.tgtCode}|${entry.srcText.slice(0,40)}`;
  const isFav = S.favorites.some(f => f.favId === favId);

  const div = document.createElement('div');
  div.className = 'list-item';
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');

  div.innerHTML = `
    <div class="list-item-head">
      <div class="list-item-langs">
        <span>${esc(entry.srcName)}</span>
        <span class="arr">→</span>
        <span>${esc(entry.tgtName)}</span>
      </div>
      <button class="star-btn ${isFav ? 'on' : ''}" title="${isFav ? 'Remove' : 'Favorite'}">
        ${isFav ? '⭐' : '☆'}
      </button>
    </div>
    <div class="list-item-src">${esc(clip(entry.srcText, 80))}</div>
    <div class="list-item-tgt">${esc(clip(entry.tgtText, 80))}</div>
    <div class="list-item-time">${timeAgo(entry.ts)}</div>
  `;

  div.addEventListener('click', e => {
    if (e.target.closest('.star-btn')) return;
    restoreEntry(entry);
  });
  div.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restoreEntry(entry); }
  });
  div.querySelector('.star-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavFromList({ ...entry, favId });
  });

  return div;
}

function restoreEntry(entry) {
  E.srcLang.value = entry.srcCode || 'auto';
  E.tgtLang.value = entry.tgtCode || 'en';
  E.srcText.value = entry.srcText;
  S.translation   = entry.tgtText;
  S.srcText       = entry.srcText;
  S.srcLang       = entry.srcCode;
  S.tgtLang       = entry.tgtCode;
  onTextInput();
  showResult(entry.tgtText);
  enableOutputBtns(true);
  updateTgtPill();
  syncPills();
  syncFavButton();
  closeDrawer();
}

function clearHistory() {
  S.history = [];
  saveHistory();
  renderHistory();
  showToast('History cleared.', 'info');
}

/* ─────────────────────────────────────────
   DRAWER
───────────────────────────────────────── */
function openDrawer() {
  S.drawerOpen = true;
  E.overlay.style.display = 'block';
  E.drawer.classList.add('open');
  E.drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  S.drawerOpen = false;
  E.overlay.style.display = 'none';
  E.drawer.classList.remove('open');
  E.drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function switchTab(tab) {
  S.activeTab = tab;
  E.drawerTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  E.tabHistory.style.display   = tab === 'history'   ? 'flex' : 'none';
  E.tabFavorites.style.display = tab === 'favorites' ? 'flex' : 'none';
}

/* ─────────────────────────────────────────
   TOASTS
───────────────────────────────────────── */
const ICONS = { ok:'✓', err:'✕', info:'ℹ', warn:'⚠' };

function showToast(msg, type = 'info', ms = 3500) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${ICONS[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  E.toastBox.appendChild(t);
  const timer = setTimeout(() => dismissToast(t), ms);
  t.addEventListener('click', () => { clearTimeout(timer); dismissToast(t); });
}

function dismissToast(t) {
  t.classList.add('out');
  t.addEventListener('animationend', () => t.remove(), { once: true });
}

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
function esc(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
           .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function clip(s, max) {
  return s && s.length > max ? s.slice(0, max) + '…' : (s || '');
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function flashBtn(btn, colour) {
  btn.style.color = colour;
  btn.style.borderColor = colour;
  setTimeout(() => { btn.style.color = ''; btn.style.borderColor = ''; }, 1200);
}
