/**
 * VOXA — script.js
 * AI Powered Language Translator
 * Clean rewrite — all buttons functional, no broken references.
 */

'use strict';

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
// MyMemory: free, no key needed, 5000 chars/day
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

// LibreTranslate public mirror — fallback
const LT_TRANSLATE = 'https://translate.fedilab.app/translate';
const LT_DETECT    = 'https://translate.fedilab.app/detect';
const LT_LANGS = 'https://translate.fedilab.app/languages?format=json';
const CHAR_MAX  = 5000;
const CHAR_WARN = 4000;
const HIST_MAX  = 50;
const FAV_MAX   = 100;
const AUTO_DELAY = 1000; // ms debounce for auto-translate

// localStorage keys
const K_THEME = 'voxa_theme';
const K_HIST  = 'voxa_hist';
const K_FAVS  = 'voxa_favs';

/* ─────────────────────────────────────────
   SPEECH LANGUAGE MAP  (code → BCP-47)
───────────────────────────────────────── */
const SPEECH_MAP = {
  en:'en-US', hi:'hi-IN', te:'te-IN', ta:'ta-IN', kn:'kn-IN',
  ml:'ml-IN', bn:'bn-IN', gu:'gu-IN', mr:'mr-IN', pa:'pa-IN',
  ur:'ur-PK', fr:'fr-FR', de:'de-DE', es:'es-ES', it:'it-IT',
  pt:'pt-BR', ru:'ru-RU', ja:'ja-JP', zh:'zh-CN', ko:'ko-KR',
  ar:'ar-SA', nl:'nl-NL', pl:'pl-PL', tr:'tr-TR', sv:'sv-SE',
  da:'da-DK', fi:'fi-FI', vi:'vi-VN', id:'id-ID', uk:'uk-UA',
  cs:'cs-CZ', ro:'ro-RO', hu:'hu-HU', el:'el-GR', he:'he-IL',
  th:'th-TH',
};
const bcp47 = code => SPEECH_MAP[code] || `${code}-${code.toUpperCase()}`;

/* ─────────────────────────────────────────
   BUILT-IN LANGUAGE LIST (fallback)
───────────────────────────────────────── */
const LANG_LIST = [
  {code:'en',name:'English'},{code:'es',name:'Spanish'},{code:'fr',name:'French'},
  {code:'de',name:'German'},{code:'it',name:'Italian'},{code:'pt',name:'Portuguese'},
  {code:'ru',name:'Russian'},{code:'ja',name:'Japanese'},{code:'zh',name:'Chinese'},
  {code:'ar',name:'Arabic'},{code:'ko',name:'Korean'},{code:'nl',name:'Dutch'},
  {code:'pl',name:'Polish'},{code:'tr',name:'Turkish'},{code:'sv',name:'Swedish'},
  {code:'da',name:'Danish'},{code:'fi',name:'Finnish'},{code:'hi',name:'Hindi'},
  {code:'te',name:'Telugu'},{code:'ta',name:'Tamil'},{code:'kn',name:'Kannada'},
  {code:'ml',name:'Malayalam'},{code:'bn',name:'Bengali'},{code:'gu',name:'Gujarati'},
  {code:'mr',name:'Marathi'},{code:'pa',name:'Punjabi'},{code:'ur',name:'Urdu'},
  {code:'vi',name:'Vietnamese'},{code:'id',name:'Indonesian'},{code:'uk',name:'Ukrainian'},
  {code:'cs',name:'Czech'},{code:'ro',name:'Romanian'},{code:'hu',name:'Hungarian'},
  {code:'el',name:'Greek'},{code:'he',name:'Hebrew'},{code:'th',name:'Thai'},
];

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
const S = {
  langs:       [],
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
   ELEMENT GETTERS  (fail-safe)
───────────────────────────────────────── */
const el = id => document.getElementById(id);

// Cache all needed elements once DOM is ready
let E = {};
function cacheElements() {
  E = {
    // Header
    btnHistory:      el('btn-history'),
    btnTheme:        el('btn-theme'),
    themeLabel:      el('theme-label'),
    iconMoon:        document.querySelector('.icon-moon'),
    iconSun:         document.querySelector('.icon-sun'),
    // Lang selectors
    sourceLang:      el('source-lang'),
    targetLang:      el('target-lang'),
    btnSwap:         el('btn-swap'),
    targetPill:      el('target-pill'),
    // Source panel
    sourceText:      el('source-text'),
    charCount:       el('char-count'),
    detectedBadge:   el('detected-badge'),
    detectedName:    el('detected-name'),
    statsBar:        el('stats-bar'),
    statWords:       el('stat-words'),
    statRead:        el('stat-read'),
    btnMic:          el('btn-mic'),
    btnClear:        el('btn-clear'),
    btnTranslate:    el('btn-translate'),
    tbText:          document.querySelector('.tb-text'),
    tbSpinner:       document.querySelector('.tb-spinner'),
    tbArrow:         document.querySelector('.tb-arrow'),
    // Target panel
    outputPlaceholder: el('output-placeholder'),
    outputSkeleton:  el('output-skeleton'),
    outputText:      el('output-text'),
    btnTts:          el('btn-tts'),
    btnFav:          el('btn-fav'),
    btnCopy:         el('btn-copy'),
    btnDownload:     el('btn-download'),
    // Quick pills
    quickPills:      document.querySelectorAll('.qpill'),
    // Drawer
    drawerOverlay:   el('drawer-overlay'),
    historyDrawer:   el('history-drawer'),
    btnCloseDrawer:  el('btn-close-drawer'),
    drawerTabs:      document.querySelectorAll('.dtab'),
    tabHistory:      el('tab-history'),
    tabFavorites:    el('tab-favorites'),
    historyList:     el('history-list'),
    historyEmpty:    el('history-empty'),
    favoritesList:   el('favorites-list'),
    favoritesEmpty:  el('favorites-empty'),
    btnClearHist:    el('btn-clear-history'),
    // Toast
    toastContainer:  el('toast-container'),
  };
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  loadTheme();
  loadStorage();
  bindEvents();
  await loadLanguages();
  setDefaultTarget();
  renderHistory();
  renderFavorites();
});

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function loadTheme() {
  applyTheme(localStorage.getItem(K_THEME) || 'dark');
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  if (E.themeLabel)  E.themeLabel.textContent  = t === 'dark' ? 'Light' : 'Dark';
  if (E.iconMoon)    E.iconMoon.style.display   = t === 'dark' ? 'block' : 'none';
  if (E.iconSun)     E.iconSun.style.display    = t === 'light' ? 'block' : 'none';
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
  try { S.history   = JSON.parse(localStorage.getItem(K_HIST))  || []; } catch { S.history   = []; }
  try { S.favorites = JSON.parse(localStorage.getItem(K_FAVS))  || []; } catch { S.favorites = []; }
}

function saveHistory()   { try { localStorage.setItem(K_HIST, JSON.stringify(S.history));   } catch {} }
function saveFavorites() { try { localStorage.setItem(K_FAVS, JSON.stringify(S.favorites)); } catch {} }

/* ─────────────────────────────────────────
   LANGUAGE LOADING
───────────────────────────────────────── */
async function loadLanguages() {
  try {
    const res = await fetch(LT_LANGS, {
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    S.langs = Array.isArray(data) && data.length > 5
      ? data
      : [...LANG_LIST];

  } catch {
    S.langs = [...LANG_LIST];
  }

  // Force Telugu
  if (!S.langs.some(lang => lang.code === 'te')) {
    S.langs.push({
      code: 'te',
      name: 'Telugu'
    });
  }

  populateSelects();
}
function populateSelects() {
  // Source — keep "Auto Detect" as first option
  while (E.sourceLang.options.length > 1) E.sourceLang.remove(1);
  E.targetLang.innerHTML = '';

  S.langs.forEach(({ code, name }) => {
    E.sourceLang.add(new Option(name, code));
    E.targetLang.add(new Option(name, code));
  });
}

function setDefaultTarget() {
  const opts = E.targetLang.options;
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].value === 'en') { E.targetLang.selectedIndex = i; break; }
  }
  refreshTargetPill();
}

function langName(code) {
  if (!code || code === 'auto') return 'Auto';
  const found = S.langs.find(l => l.code === code);
  return found ? found.name : code.toUpperCase();
}

function refreshTargetPill() {
  const sel = E.targetLang.selectedOptions[0];
  if (sel && E.targetPill) E.targetPill.textContent = sel.text;
}

/* ─────────────────────────────────────────
   EVENT BINDING
───────────────────────────────────────── */
function bindEvents() {

  // Header
  E.btnTheme.addEventListener('click', toggleTheme);
  E.btnHistory.addEventListener('click', openDrawer);

  // Language selectors
  E.targetLang.addEventListener('change', () => {
    refreshTargetPill();
    syncQuickPills();
  });
  E.sourceLang.addEventListener('change', hideDetected);

  // Swap
  E.btnSwap.addEventListener('click', swapLangs);

  // Source textarea
  E.sourceText.addEventListener('input', onSourceInput);
  E.sourceText.addEventListener('keydown', (e) => {
    // Enter = translate, Shift+Enter = new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doTranslate();
    }
  });

  // Buttons
  E.btnTranslate.addEventListener('click', doTranslate);
  E.btnClear.addEventListener('click', clearAll);
  E.btnMic.addEventListener('click', toggleMic);
  E.btnTts.addEventListener('click', doTts);
  E.btnFav.addEventListener('click', toggleFavCurrent);
  E.btnCopy.addEventListener('click', doCopy);
  E.btnDownload.addEventListener('click', doDownload);

  // Quick pills
  E.quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      E.targetLang.value = pill.dataset.code;
      refreshTargetPill();
      syncQuickPills();
      if (E.sourceText.value.trim()) doTranslate();
    });
  });

  // Drawer
  E.btnCloseDrawer.addEventListener('click', closeDrawer);
  E.drawerOverlay.addEventListener('click', closeDrawer);
  E.btnClearHist.addEventListener('click', clearHistory);

  // Drawer tabs
  E.drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Escape closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.drawerOpen) closeDrawer();
  });
}

/* ─────────────────────────────────────────
   SOURCE INPUT HANDLER
───────────────────────────────────────── */
function onSourceInput() {
  updateCharCount();
  updateStats();
  hideDetected();
  scheduleAutoTranslate();
}

function updateCharCount() {
  const len = E.sourceText.value.length;
  E.charCount.textContent = `${len.toLocaleString()} / ${CHAR_MAX.toLocaleString()}`;
  E.charCount.classList.toggle('warn', len >= CHAR_WARN && len < CHAR_MAX);
  E.charCount.classList.toggle('over', len >= CHAR_MAX);
}

function updateStats() {
  const txt = E.sourceText.value.trim();
  if (!txt) { E.statsBar.style.display = 'none'; return; }
  const words   = txt.split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.ceil(words / 200));
  E.statWords.textContent = `Words: ${words.toLocaleString()}`;
  E.statRead.textContent  = `~${readMin} min read`;
  E.statsBar.style.display = 'flex';
}

function scheduleAutoTranslate() {
  clearTimeout(S.autoTimer);
  const txt = E.sourceText.value.trim();
  if (txt.length < 3) return;
  S.autoTimer = setTimeout(() => {
    if (!S.translating && E.sourceText.value.trim()) doTranslate();
  }, AUTO_DELAY);
}

/* ─────────────────────────────────────────
   LANGUAGE SWAP
───────────────────────────────────────── */
function swapLangs() {
  if (E.sourceLang.value === 'auto') {
    showToast('Cannot swap when source is Auto Detect.', 'hey'); return;
  }
  const src = E.sourceLang.value;
  const tgt = E.targetLang.value;

  E.sourceLang.value = tgt;
  E.targetLang.value = src;

  // Also swap text
  const srcTxt = E.sourceText.value;
  E.sourceText.value = S.translation;
  S.translation = srcTxt;
  showOutputText(srcTxt);

  updateCharCount();
  updateStats();
  refreshTargetPill();
  syncQuickPills();
  hideDetected();
}

/* ─────────────────────────────────────────
   TRANSLATE
───────────────────────────────────────── */
async function doTranslate() {
  const text = E.sourceText.value.trim();
  if (!text) { showToast('Please enter text to translate.', 'hey'); return; }
  if (S.translating) return;

  const srcCode = E.sourceLang.value; // 'auto' or code
  const tgtCode = E.targetLang.value;
  if (!tgtCode) { showToast('Please select a target language.', 'hey'); return; }

  S.translating = true;
  setLoadingUI(true);

  try {
    // Detect language if auto
    let resolvedSrc = srcCode;
    if (srcCode === 'auto') {
      resolvedSrc = await detectLang(text);
    }

    // Try MyMemory first, then LibreTranslate
    let result = '';

    try {
  result = await myMemoryTranslate(text, resolvedSrc, tgtCode);
} catch (e1) {
  result = await libreTranslate(text, resolvedSrc, tgtCode);
}

    // Success
    S.translation = result;
    S.srcText     = text;
    S.srcLang     = resolvedSrc;
    S.tgtLang     = tgtCode;

    showOutputText(result);
    enableOutputBtns(true);

    if (srcCode === 'auto' && resolvedSrc !== 'auto') {
      showDetected(resolvedSrc);
    }

    // Save to history
    const entry = {
      id:        genId(),
      srcText:   text,
      tgtText:   result,
      srcCode:   resolvedSrc,
      tgtCode:   tgtCode,
      srcName:   langName(resolvedSrc),
      tgtName:   langName(tgtCode),
      ts:        Date.now(),
    };
    S.history.unshift(entry);
    if (S.history.length > HIST_MAX) S.history.length = HIST_MAX;
    saveHistory();
    renderHistory();

    // Sync fav button
    syncFavBtn();

  } catch (err) {
    console.error('[VOXA] Translation error:', err);
    let msg = 'Translation failed. Please try again.';
    if (err.name === 'TimeoutError' || err.name === 'AbortError') msg = 'Request timed out.';
    else if (err.message?.includes('fetch')) msg = 'Network error. Check your connection.';
    else if (err.message) msg = err.message;
    showToast(msg, 'bad');
    showOutputPlaceholder();

  } finally {
    S.translating = false;
    setLoadingUI(false);
  }
}

/* ─────────────────────────────────────────
   API CALLS
───────────────────────────────────────── */
async function myMemoryTranslate(text, src, tgt) {
  const srcCode = src === 'auto' ? 'en' : src;
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(srcCode + '|' + tgt)}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = await res.json();
  if (data.responseStatus === 429) throw new Error('MyMemory rate limit reached.');
  if (!data.responseData?.translatedText) throw new Error('Empty response from MyMemory.');

  const t = data.responseData.translatedText;

if (
  !t ||
  t.toUpperCase().includes('PLEASE SELECT') ||
  (src !== tgt && t.trim().toLowerCase() === text.trim().toLowerCase())
) {
  throw new Error('Translation unavailable from MyMemory.');
}

return t;
}

async function libreTranslate(text, src, tgt) {
  const res = await fetch(LT_TRANSLATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: src === 'auto' ? 'auto' : src, target: tgt, format: 'text' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `LibreTranslate HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.translatedText) throw new Error('Empty response from LibreTranslate.');
  return data.translatedText;
}

async function detectLang(text) {
  try {
    const res = await fetch(LT_DETECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return 'auto';
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.language) return data[0].language;
  } catch {}
  return 'auto';
}

/* ─────────────────────────────────────────
   OUTPUT UI HELPERS
───────────────────────────────────────── */
function setLoadingUI(loading) {
  E.btnTranslate.disabled = loading;

  if (E.tbText)    E.tbText.style.display    = loading ? 'none'  : 'inline';
  if (E.tbSpinner) E.tbSpinner.style.display = loading ? 'block' : 'none';
  if (E.tbArrow)   E.tbArrow.style.display   = loading ? 'none'  : 'block';

  if (loading) {
    E.outputPlaceholder.style.display = 'none';
    E.outputText.style.display        = 'none';
    E.outputSkeleton.style.display    = 'flex';
  } else {
    E.outputSkeleton.style.display    = 'none';
  }
}

function showOutputText(text) {
  E.outputPlaceholder.style.display = 'none';
  E.outputSkeleton.style.display    = 'none';
  E.outputText.style.display        = 'block';
  E.outputText.textContent          = text; // textContent = safe, no XSS
}

function showOutputPlaceholder() {
  E.outputPlaceholder.style.display = 'flex';
  E.outputSkeleton.style.display    = 'none';
  E.outputText.style.display        = 'none';
}

function enableOutputBtns(on) {
  E.btnTts.disabled      = !on;
  E.btnFav.disabled      = !on;
  E.btnCopy.disabled     = !on;
  E.btnDownload.disabled = !on;
}

function showDetected(code) {
  E.detectedName.textContent    = langName(code);
  E.detectedBadge.style.display = 'flex';
}

function hideDetected() {
  E.detectedBadge.style.display = 'none';
}

function syncQuickPills() {
  const tgt = E.targetLang.value;
  E.quickPills.forEach(p => p.classList.toggle('active', p.dataset.code === tgt));
}

/* ─────────────────────────────────────────
   CLEAR
───────────────────────────────────────── */
function clearAll() {
  E.sourceText.value = '';
  updateCharCount();
  E.statsBar.style.display = 'none';
  hideDetected();
  showOutputPlaceholder();
  enableOutputBtns(false);
  S.translation = '';
  S.srcText     = '';
  clearTimeout(S.autoTimer);
  E.btnFav.classList.remove('fav-on');
  E.sourceText.focus();
}

/* ─────────────────────────────────────────
   SPEECH TO TEXT
───────────────────────────────────────── */
function toggleMic() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Speech recognition not supported in this browser.', 'bad'); return;
  }
  S.micActive ? stopMic() : startMic();
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  const rawCode = E.sourceLang.value !== 'auto' ? E.sourceLang.value : 'en';
  rec.lang = bcp47(rawCode);
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => {
    S.micActive = true;
    E.btnMic.classList.add('mic-on');
    showToast(`Listening (${rec.lang})…`, 'info');
  };

  rec.onresult = (ev) => {
    const t = ev.results[0][0].transcript;
    E.sourceText.value = (E.sourceText.value ? E.sourceText.value + ' ' : '') + t;
    updateCharCount();
    updateStats();
    doTranslate();
  };

  rec.onerror = (ev) => {
    const msgs = {
      'no-speech':'No speech detected.','audio-capture':'Mic unavailable.',
      'not-allowed':'Mic permission denied.','network':'Network error.',
    };
    showToast(msgs[ev.error] || 'Voice error.', 'bad');
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
   TEXT TO SPEECH
───────────────────────────────────────── */
function doTts() {
  if (!('speechSynthesis' in window)) {
    showToast('TTS not supported in this browser.', 'bad'); return;
  }
  if (!S.translation) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(S.translation);
  u.lang  = bcp47(E.targetLang.value || 'en');
  u.rate  = 0.95;
  u.onstart = () => { E.btnTts.style.color = 'var(--mint)'; E.btnTts.style.borderColor = 'var(--mint)'; };
  u.onend = u.onerror = () => { E.btnTts.style.color = ''; E.btnTts.style.borderColor = ''; };
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
    flash(E.btnCopy, 'var(--ok)');
  } catch {
    // Older browser fallback
    const ta = Object.assign(document.createElement('textarea'), {
      value: S.translation,
      style: 'position:fixed;opacity:0',
    });
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
    `From: ${langName(S.srcLang)}  →  To: ${langName(S.tgtLang)}`,
    '', '── Original ──', S.srcText,
    '', '── Translation ──', S.translation,
  ].join('\n');

  const a = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })),
    download: `voxa_${langName(S.tgtLang).toLowerCase()}_${Date.now()}.txt`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  showToast('Downloaded!', 'ok');
}

/* ─────────────────────────────────────────
   FAVORITES
───────────────────────────────────────── */
function toggleFavCurrent() {
  if (!S.translation) return;
  const id = makeEntryId(S.srcLang, S.tgtLang, S.srcText);
  const idx = S.favorites.findIndex(f => f.id === id);

  if (idx > -1) {
    S.favorites.splice(idx, 1);
    E.btnFav.classList.remove('fav-on');
    showToast('Removed from favorites.', 'info');
  } else {
    if (S.favorites.length >= FAV_MAX) S.favorites.pop();
    S.favorites.unshift({
      id, srcText: S.srcText, tgtText: S.translation,
      srcCode: S.srcLang, tgtCode: S.tgtLang,
      srcName: langName(S.srcLang), tgtName: langName(S.tgtLang),
      ts: Date.now(),
    });
    E.btnFav.classList.add('fav-on');
    showToast('Saved to favorites! ⭐', 'ok');
  }
  saveFavorites();
  renderFavorites();
}

function syncFavBtn() {
  const id  = makeEntryId(S.srcLang, S.tgtLang, S.srcText);
  const isFav = S.favorites.some(f => f.id === id);
  E.btnFav.classList.toggle('fav-on', isFav);
}

function toggleFavById(entry) {
  const idx = S.favorites.findIndex(f => f.id === entry.id);
  if (idx > -1) {
    S.favorites.splice(idx, 1);
    showToast('Removed from favorites.', 'info');
  } else {
    S.favorites.unshift({ ...entry });
    showToast('Saved! ⭐', 'ok');
  }
  saveFavorites();
  renderHistory();
  renderFavorites();
  syncFavBtn();
}

/* ─────────────────────────────────────────
   HISTORY RENDERING
───────────────────────────────────────── */
function renderHistory() {
  E.historyList.innerHTML = '';
  if (!S.history.length) {
    E.historyEmpty.style.display  = 'flex';
    return;
  }
  E.historyEmpty.style.display = 'none';
  S.history.forEach(entry => E.historyList.appendChild(buildItem(entry)));
}

function renderFavorites() {
  E.favoritesList.innerHTML = '';
  if (!S.favorites.length) {
    E.favoritesEmpty.style.display = 'flex';
    return;
  }
  E.favoritesEmpty.style.display = 'none';
  S.favorites.forEach(entry => E.favoritesList.appendChild(buildItem(entry)));
}

function buildItem(entry) {
  const isFav  = S.favorites.some(f => f.id === entry.id);
  const div    = document.createElement('div');
  div.className = 'list-item';
  div.setAttribute('tabindex', '0');
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `Restore: ${entry.srcText.slice(0, 40)}`);

  div.innerHTML = `
    <div class="list-item-head">
      <div class="list-item-langs">
        <span>${esc(entry.srcName)}</span>
        <span class="arr">→</span>
        <span>${esc(entry.tgtName)}</span>
      </div>
      <button class="star-btn ${isFav ? 'on' : ''}" title="${isFav ? 'Remove favorite' : 'Add favorite'}">
        ${isFav ? '⭐' : '☆'}
      </button>
    </div>
    <div class="list-item-src">${esc(clip(entry.srcText, 80))}</div>
    <div class="list-item-tgt">${esc(clip(entry.tgtText, 80))}</div>
    <div class="list-item-time">${timeAgo(entry.ts)}</div>
  `;

  // Click item = restore
  div.addEventListener('click', (e) => {
    if (e.target.closest('.star-btn')) return;
    restoreEntry(entry);
  });
  div.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restoreEntry(entry); }
  });

  // Star button
  div.querySelector('.star-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavById(entry);
  });

  return div;
}

function restoreEntry(entry) {
  E.sourceText.value = entry.srcText;
  if (entry.srcCode && entry.srcCode !== 'auto') E.sourceLang.value = entry.srcCode;
  else E.sourceLang.value = 'auto';
  E.targetLang.value = entry.tgtCode;

  refreshTargetPill();
  syncQuickPills();
  updateCharCount();
  updateStats();

  S.translation = entry.tgtText;
  S.srcText     = entry.srcText;
  S.srcLang     = entry.srcCode;
  S.tgtLang     = entry.tgtCode;

  showOutputText(entry.tgtText);
  enableOutputBtns(true);
  syncFavBtn();
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
  E.drawerOverlay.style.display = 'block';
  E.historyDrawer.classList.add('open');
  E.historyDrawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  S.drawerOpen = false;
  E.drawerOverlay.style.display = 'none';
  E.historyDrawer.classList.remove('open');
  E.historyDrawer.setAttribute('aria-hidden', 'true');
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
const TOAST_ICONS = { ok:'✓', bad:'✕', info:'ℹ', hey:'⚠' };

function showToast(msg, type = 'info', ms = 3400) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${TOAST_ICONS[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  E.toastContainer.appendChild(t);
  const timer = setTimeout(() => dismiss(t), ms);
  t.addEventListener('click', () => { clearTimeout(timer); dismiss(t); });
}

function dismiss(t) {
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
  return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function makeEntryId(src, tgt, text) {
  return `${src}_${tgt}_${text.slice(0,30)}`;
}

function flash(btn, color) {
  btn.style.color = color;
  btn.style.borderColor = color;
  setTimeout(() => { btn.style.color = ''; btn.style.borderColor = ''; }, 1200);
}
