/**
 * VOXA — script.js
 * Translation engine: Google Translate unofficial API
 * (works in browser, no API key, no CORS issues)
 */

'use strict';

/* ─────────────────────────────────────────────────────
   LANGUAGE LIST — all languages with codes Google uses
───────────────────────────────────────────────────── */
const LANGUAGES = [
  { code: 'auto',  name: 'Auto Detect' },
  { code: 'af',    name: 'Afrikaans' },
  { code: 'ar',    name: 'Arabic' },
  { code: 'bn',    name: 'Bengali' },
  { code: 'cs',    name: 'Czech' },
  { code: 'da',    name: 'Danish' },
  { code: 'de',    name: 'German' },
  { code: 'el',    name: 'Greek' },
  { code: 'en',    name: 'English' },
  { code: 'es',    name: 'Spanish' },
  { code: 'fi',    name: 'Finnish' },
  { code: 'fr',    name: 'French' },
  { code: 'gu',    name: 'Gujarati' },
  { code: 'he',    name: 'Hebrew' },
  { code: 'hi',    name: 'Hindi' },
  { code: 'hr',    name: 'Croatian' },
  { code: 'hu',    name: 'Hungarian' },
  { code: 'id',    name: 'Indonesian' },
  { code: 'it',    name: 'Italian' },
  { code: 'ja',    name: 'Japanese' },
  { code: 'kn',    name: 'Kannada' },
  { code: 'ko',    name: 'Korean' },
  { code: 'ml',    name: 'Malayalam' },
  { code: 'mr',    name: 'Marathi' },
  { code: 'ms',    name: 'Malay' },
  { code: 'nl',    name: 'Dutch' },
  { code: 'no',    name: 'Norwegian' },
  { code: 'pa',    name: 'Punjabi' },
  { code: 'pl',    name: 'Polish' },
  { code: 'pt',    name: 'Portuguese' },
  { code: 'ro',    name: 'Romanian' },
  { code: 'ru',    name: 'Russian' },
  { code: 'sk',    name: 'Slovak' },
  { code: 'sv',    name: 'Swedish' },
  { code: 'sw',    name: 'Swahili' },
  { code: 'ta',    name: 'Tamil' },
  { code: 'te',    name: 'Telugu' },   // ← Telugu included
  { code: 'th',    name: 'Thai' },
  { code: 'tr',    name: 'Turkish' },
  { code: 'uk',    name: 'Ukrainian' },
  { code: 'ur',    name: 'Urdu' },
  { code: 'vi',    name: 'Vietnamese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
];

/* Speech recognition BCP-47 map */
const SPEECH_MAP = {
  en:'en-US', hi:'hi-IN', te:'te-IN', ta:'ta-IN', kn:'kn-IN',
  ml:'ml-IN', bn:'bn-IN', gu:'gu-IN', mr:'mr-IN', pa:'pa-IN',
  ur:'ur-PK', fr:'fr-FR', de:'de-DE', es:'es-ES', it:'it-IT',
  pt:'pt-BR', ru:'ru-RU', ja:'ja-JP', ko:'ko-KR', ar:'ar-SA',
  nl:'nl-NL', pl:'pl-PL', tr:'tr-TR', sv:'sv-SE', da:'da-DK',
  fi:'fi-FI', vi:'vi-VN', id:'id-ID', uk:'uk-UA', cs:'cs-CZ',
  ro:'ro-RO', hu:'hu-HU', el:'el-GR', he:'he-IL', th:'th-TH',
  zh:'zh-CN', 'zh-CN':'zh-CN', 'zh-TW':'zh-TW',
};
const toBCP47 = code => SPEECH_MAP[code] || code;

/* ─────────────────────────────────────────────────────
   APP STATE
───────────────────────────────────────────────────── */
const state = {
  translating:  false,
  micActive:    false,
  recognition:  null,
  autoTimer:    null,
  translation:  '',
  srcText:      '',
  srcCode:      '',
  tgtCode:      '',
  history:      [],
  favorites:    [],
  activeTab:    'history',
  drawerOpen:   false,
};

/* localStorage keys */
const KEY_THEME = 'voxa_theme';
const KEY_HIST  = 'voxa_hist';
const KEY_FAVS  = 'voxa_favs';

/* ─────────────────────────────────────────────────────
   DOM — grabbed after DOMContentLoaded
───────────────────────────────────────────────────── */
let D = {};

document.addEventListener('DOMContentLoaded', () => {
  /* Grab every element we need */
  D = {
    srcLang:       document.getElementById('src-lang'),
    tgtLang:       document.getElementById('tgt-lang'),
    btnSwap:       document.getElementById('btn-swap'),
    tgtPill:       document.getElementById('tgt-pill'),

    srcText:       document.getElementById('src-text'),
    charCt:        document.getElementById('char-ct'),
    detectedWrap:  document.getElementById('detected-wrap'),
    detectedLang:  document.getElementById('detected-lang'),
    srcStats:      document.getElementById('src-stats'),
    wordCt:        document.getElementById('word-ct'),
    readTime:      document.getElementById('read-time'),

    btnMic:        document.getElementById('btn-mic'),
    btnClear:      document.getElementById('btn-clear'),
    btnTranslate:  document.getElementById('btn-translate'),
    tbLabel:       document.getElementById('tb-label'),
    tbSpin:        document.getElementById('tb-spin'),
    tbArrow:       document.getElementById('tb-arrow'),

    outPlaceholder: document.getElementById('out-placeholder'),
    outSkeleton:    document.getElementById('out-skeleton'),
    outResult:      document.getElementById('out-result'),

    btnTts:        document.getElementById('btn-tts'),
    btnFav:        document.getElementById('btn-fav'),
    btnCopy:       document.getElementById('btn-copy'),
    btnDl:         document.getElementById('btn-dl'),

    btnHistory:    document.getElementById('btn-history'),
    btnTheme:      document.getElementById('btn-theme'),
    themeLabel:    document.getElementById('theme-label'),
    iconMoon:      document.getElementById('icon-moon'),
    iconSun:       document.getElementById('icon-sun'),

    overlay:       document.getElementById('overlay'),
    drawer:        document.getElementById('drawer'),
    btnCloseDrawer:document.getElementById('btn-close-drawer'),
    drawerTabs:    document.querySelectorAll('.dtab'),
    tabHistory:    document.getElementById('tab-history'),
    tabFavorites:  document.getElementById('tab-favorites'),
    histList:      document.getElementById('hist-list'),
    histEmpty:     document.getElementById('hist-empty'),
    favList:       document.getElementById('fav-list'),
    favEmpty:      document.getElementById('fav-empty'),
    btnClrHist:    document.getElementById('btn-clr-hist'),

    quickPills:    document.querySelectorAll('.qpill'),
    toastBox:      document.getElementById('toast-container'),
  };

  /* Verify critical elements exist */
  const missing = ['srcLang','tgtLang','srcText','btnTranslate','outResult']
    .filter(k => !D[k]);
  if (missing.length) {
    console.error('[VOXA] Missing DOM elements:', missing);
    return;
  }

  init();
});

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────── */

  function init() {
  /* Rebuild TO dropdown from LANGUAGES array — guaranteed to work */
  D.tgtLang.innerHTML = '';
  LANGUAGES
    .filter(l => l.code !== 'auto')
    .forEach(({ code, name }) => {
      D.tgtLang.appendChild(new Option(name, code));
    });
  D.tgtLang.value = 'en';

  /* Rebuild FROM dropdown */
  D.srcLang.innerHTML = '';
  LANGUAGES.forEach(({ code, name }) => {
    D.srcLang.appendChild(new Option(name, code));
  });
  D.srcLang.value = 'auto';

  loadTheme();
  loadStorage();
  renderHistory();
  renderFavorites();
  bindEvents();
  syncPills();
  updateTgtPill();
}

/* ─────────────────────────────────────────────────────
   BUILD LANGUAGE DROPDOWNS
───────────────────────────────────────────────────── */

function getLangName(code) {
  if (!code || code === 'auto') return 'Auto';
  const found = LANGUAGES.find(l => l.code === code);
  return found ? found.name : code.toUpperCase();
}

function updateTgtPill() {
  if (D.tgtPill) {
    D.tgtPill.textContent = getLangName(D.tgtLang.value);
  }
}

function syncPills() {
  const tgt = D.tgtLang.value;
  D.quickPills.forEach(p => {
    p.classList.toggle('active', p.dataset.code === tgt);
  });
}

/* ─────────────────────────────────────────────────────
   THEME
───────────────────────────────────────────────────── */
function loadTheme() {
  applyTheme(localStorage.getItem(KEY_THEME) || 'dark');
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  if (D.themeLabel) D.themeLabel.textContent = t === 'dark' ? 'Light' : 'Dark';
  if (D.iconMoon)   D.iconMoon.style.display  = t === 'dark'  ? 'block' : 'none';
  if (D.iconSun)    D.iconSun.style.display   = t === 'light' ? 'block' : 'none';
  localStorage.setItem(KEY_THEME, t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ─────────────────────────────────────────────────────
   STORAGE
───────────────────────────────────────────────────── */
function loadStorage() {
  try { state.history   = JSON.parse(localStorage.getItem(KEY_HIST)) || []; } catch { state.history   = []; }
  try { state.favorites = JSON.parse(localStorage.getItem(KEY_FAVS)) || []; } catch { state.favorites = []; }
}
function saveHistory()   { try { localStorage.setItem(KEY_HIST, JSON.stringify(state.history));   } catch {} }
function saveFavorites() { try { localStorage.setItem(KEY_FAVS, JSON.stringify(state.favorites)); } catch {} }

/* ─────────────────────────────────────────────────────
   BIND EVENTS
───────────────────────────────────────────────────── */
function bindEvents() {
  /* Theme */
  D.btnTheme.addEventListener('click', toggleTheme);

  /* History drawer */
  D.btnHistory.addEventListener('click', openDrawer);
  D.btnCloseDrawer.addEventListener('click', closeDrawer);
  D.overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.drawerOpen) closeDrawer(); });

  /* Drawer tabs */
  D.drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  /* Clear history */
  D.btnClrHist.addEventListener('click', clearHistory);

  /* Language selectors */
  D.tgtLang.addEventListener('change', () => {
    updateTgtPill();
    syncPills();
  });

  /* Swap */
  D.btnSwap.addEventListener('click', swapLanguages);

  /* Textarea */
  D.srcText.addEventListener('input', onTextInput);
  D.srcText.addEventListener('keydown', e => {
    /* Enter = translate, Shift+Enter = new line */
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doTranslate();
    }
  });

  /* Translate button */
  D.btnTranslate.addEventListener('click', doTranslate);

  /* Clear */
  D.btnClear.addEventListener('click', clearAll);

  /* Mic */
  D.btnMic.addEventListener('click', toggleMic);

  /* Output actions */
  D.btnTts.addEventListener('click',  doTTS);
  D.btnFav.addEventListener('click',  toggleFavCurrent);
  D.btnCopy.addEventListener('click', doCopy);
  D.btnDl.addEventListener('click',   doDownload);

  /* Quick pills */
  D.quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      D.tgtLang.value = pill.dataset.code;
      updateTgtPill();
      syncPills();
      /* Auto-translate if text exists */
      if (D.srcText.value.trim().length > 0) doTranslate();
    });
  });
}

/* ─────────────────────────────────────────────────────
   TEXT INPUT HANDLER
───────────────────────────────────────────────────── */
function onTextInput() {
  const text = D.srcText.value;
  const len  = text.length;

  /* Character counter */
  D.charCt.textContent = `${len.toLocaleString()} / 5000`;
  D.charCt.className = 'char-ct' + (len >= 5000 ? ' over' : len >= 4000 ? ' warn' : '');

  /* Stats bar */
  if (text.trim()) {
    const words   = text.trim().split(/\s+/).filter(Boolean).length;
    const minRead = Math.max(1, Math.ceil(words / 200));
    D.wordCt.textContent  = `Words: ${words}`;
    D.readTime.textContent = `~${minRead} min read`;
    D.srcStats.style.display = 'flex';
  } else {
    D.srcStats.style.display = 'none';
  }

  /* Debounce auto-translate (1 second after user stops typing) */
  clearTimeout(state.autoTimer);
  if (text.trim().length >= 3) {
    state.autoTimer = setTimeout(() => {
      if (!state.translating && D.srcText.value.trim().length >= 3) {
        doTranslate();
      }
    }, 1000);
  }
}

/* ─────────────────────────────────────────────────────
   SWAP LANGUAGES
───────────────────────────────────────────────────── */
function swapLanguages() {
  const src = D.srcLang.value;
  const tgt = D.tgtLang.value;

  if (src === 'auto') {
    showToast('Cannot swap when source is Auto Detect', 'warn');
    return;
  }

  /* Swap select values */
  D.srcLang.value = tgt;
  D.tgtLang.value = src;

  /* Swap text content */
  const oldSrc = D.srcText.value;
  const oldTgt = state.translation;
  D.srcText.value = oldTgt;
  state.translation = oldSrc;
  if (oldSrc) showResult(oldSrc);

  updateTgtPill();
  syncPills();
  onTextInput();
  hideDetected();
}

/* ─────────────────────────────────────────────────────
   TRANSLATE  — Google Translate unofficial API
   URL: https://translate.googleapis.com/translate_a/single
   No API key needed. Works from browsers (CORS allowed).
   Response format: [[["translatedText","sourceText",...],...],...]
───────────────────────────────────────────────────── */
async function doTranslate() {
  const text = D.srcText.value.trim();

  if (!text) {
    showToast('Please enter some text to translate', 'warn');
    return;
  }

  /* Guard against parallel requests */
  if (state.translating) return;

  const srcCode = D.srcLang.value;  /* 'auto' or lang code */
  const tgtCode = D.tgtLang.value;

  if (!tgtCode) {
    showToast('Please select a target language', 'warn');
    return;
  }

  /* Same language check */
  if (srcCode !== 'auto' && srcCode === tgtCode) {
    showToast('Source and target languages are the same', 'warn');
    return;
  }

  state.translating = true;
  setLoadingState(true);

  try {
    const result = await googleTranslate(text, srcCode, tgtCode);

    /* Save to state */
    state.translation = result.translatedText;
    state.srcText     = text;
    state.srcCode     = result.detectedLang || srcCode;
    state.tgtCode     = tgtCode;

    /* Show result */
    showResult(result.translatedText);
    enableOutputButtons(true);

    /* Show detected language badge */
    if (srcCode === 'auto' && result.detectedLang) {
      D.detectedLang.textContent    = getLangName(result.detectedLang);
      D.detectedWrap.style.display  = 'flex';
    }

    /* Save to history */
    const entry = {
      id:      Date.now() + Math.random().toString(36).slice(2),
      srcText: text,
      tgtText: result.translatedText,
      srcCode: state.srcCode,
      tgtCode: tgtCode,
      srcName: getLangName(state.srcCode),
      tgtName: getLangName(tgtCode),
      ts:      Date.now(),
    };
    state.history.unshift(entry);
    if (state.history.length > 50) state.history.length = 50;
    saveHistory();
    renderHistory();
    syncFavButton();

  } catch (err) {
    console.error('[VOXA] Translation failed:', err);

    let msg = 'Translation failed. Check your internet connection.';
    if (err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
      msg = 'No internet connection. Please check your network.';
    } else if (err.message) {
      msg = err.message;
    }
    showToast(msg, 'err');
    showPlaceholder();

  } finally {
    state.translating = false;
    setLoadingState(false);
  }
}

/* ─────────────────────────────────────────────────────
   GOOGLE TRANSLATE API CALL
   Uses the unofficial "gtx" client endpoint.
   dt=t  → translated text
   dt=ld → detected language
───────────────────────────────────────────────────── */
async function googleTranslate(text, srcLang, tgtLang) {
  /* Google uses 'zh-CN' and 'zh-TW' — pass through as-is */
  const sl = srcLang === 'auto' ? 'auto' : srcLang;
  const tl = tgtLang;

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sl);
  url.searchParams.set('tl', tl);
  url.searchParams.set('dt', 't');   /* translated text */
  url.searchParams.set('dt', 'ld');  /* detected language */
  url.searchParams.set('q', text);

  /* Build URL manually to allow multiple 'dt' params */
  const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&dt=ld&q=${encodeURIComponent(text)}`;

  const res = await fetch(apiUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Translation service error (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();

  /*
   * Response structure:
   * data[0] = array of translation chunks: [[translatedChunk, originalChunk, ...], ...]
   * data[2] = detected language code (when sl=auto)
   */
  if (!data || !Array.isArray(data) || !data[0]) {
    throw new Error('Unexpected response from translation service.');
  }

  /* Join all translated chunks */
  const translatedText = data[0]
    .filter(chunk => Array.isArray(chunk) && chunk[0])
    .map(chunk => chunk[0])
    .join('');

  if (!translatedText.trim()) {
    throw new Error('Translation returned empty. Try different text.');
  }

  /* Detected language is at data[2] when sl=auto */
  const detectedLang = (srcLang === 'auto' && data[2]) ? data[2] : null;

  return { translatedText, detectedLang };
}

/* ─────────────────────────────────────────────────────
   OUTPUT STATE HELPERS
───────────────────────────────────────────────────── */
function setLoadingState(loading) {
  D.btnTranslate.disabled = loading;

  if (D.tbLabel) D.tbLabel.style.display = loading ? 'none'   : 'inline';
  if (D.tbSpin)  D.tbSpin.style.display  = loading ? 'block'  : 'none';
  if (D.tbArrow) D.tbArrow.style.display = loading ? 'none'   : 'block';

  if (loading) {
    D.outPlaceholder.style.display = 'none';
    D.outResult.style.display      = 'none';
    D.outSkeleton.style.display    = 'flex';
    enableOutputButtons(false);
  } else {
    D.outSkeleton.style.display = 'none';
  }
}

function showResult(text) {
  D.outPlaceholder.style.display = 'none';
  D.outSkeleton.style.display    = 'none';
  D.outResult.style.display      = 'block';
  D.outResult.textContent        = text; /* textContent = XSS safe */
}

function showPlaceholder() {
  D.outPlaceholder.style.display = 'flex';
  D.outSkeleton.style.display    = 'none';
  D.outResult.style.display      = 'none';
}

function enableOutputButtons(on) {
  D.btnTts.disabled  = !on;
  D.btnFav.disabled  = !on;
  D.btnCopy.disabled = !on;
  D.btnDl.disabled   = !on;
}

function hideDetected() {
  D.detectedWrap.style.display = 'none';
}

/* ─────────────────────────────────────────────────────
   CLEAR ALL
───────────────────────────────────────────────────── */
function clearAll() {
  D.srcText.value          = '';
  D.charCt.textContent     = '0 / 5000';
  D.charCt.className       = 'char-ct';
  D.srcStats.style.display = 'none';
  state.translation        = '';
  state.srcText            = '';
  clearTimeout(state.autoTimer);
  hideDetected();
  showPlaceholder();
  enableOutputButtons(false);
  D.btnFav.classList.remove('fav-on');
  D.srcText.focus();
}

/* ─────────────────────────────────────────────────────
   SPEECH TO TEXT (Microphone)
───────────────────────────────────────────────────── */
function toggleMic() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser. Try Chrome.', 'err');
    return;
  }
  state.micActive ? stopMic() : startMic();
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();

  /* Use correct BCP-47 tag for the selected source language */
  const rawCode = D.srcLang.value !== 'auto' ? D.srcLang.value : 'en';
  rec.lang = toBCP47(rawCode);

  rec.continuous     = false;
  rec.interimResults = false;

  rec.onstart = () => {
    state.micActive = true;
    D.btnMic.classList.add('mic-on');
    showToast(`Listening in ${rec.lang}…`, 'info');
  };

  rec.onresult = ev => {
    const transcript = ev.results[0][0].transcript;
    D.srcText.value  = D.srcText.value
      ? D.srcText.value + ' ' + transcript
      : transcript;
    onTextInput();
    doTranslate();
  };

  rec.onerror = ev => {
const msgs = {
      'no-speech':     'No speech detected. Please try again.',
      'audio-capture': 'Microphone not found.',
      'not-allowed':   'Microphone permission denied.',
      'network':       'Network error during voice input.',
    };
    showToast(msgs[ev.error] || 'Voice input error.', 'err');
    stopMic();
  };

  rec.onend = stopMic;
  state.recognition = rec;
  rec.start();
}

function stopMic() {
  state.micActive = false;
  D.btnMic.classList.remove('mic-on');
  try { state.recognition?.stop(); } catch {}
  state.recognition = null;
}

/* ─────────────────────────────────────────────────────
   TEXT TO SPEECH
───────────────────────────────────────────────────── */
function doTTS() {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech not supported in this browser.', 'err');
    return;
  }
  if (!state.translation) return;

  window.speechSynthesis.cancel();

  const u   = new SpeechSynthesisUtterance(state.translation);
  u.lang    = toBCP47(D.tgtLang.value || 'en');
  u.rate    = 0.95;
  u.pitch   = 1.0;

  u.onstart = () => {
    D.btnTts.style.color       = 'var(--mint)';
    D.btnTts.style.borderColor = 'var(--mint)';
  };
  u.onend = u.onerror = () => {
    D.btnTts.style.color       = '';
    D.btnTts.style.borderColor = '';
  };

  window.speechSynthesis.speak(u);
}

/* ─────────────────────────────────────────────────────
   COPY
───────────────────────────────────────────────────── */
async function doCopy() {
  if (!state.translation) return;
  try {
    await navigator.clipboard.writeText(state.translation);
    showToast('Copied to clipboard!', 'ok');
    flashBtn(D.btnCopy, 'var(--ok)');
  } catch {
    /* Fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = state.translation;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Copied!', 'ok');
  }
}

/* ─────────────────────────────────────────────────────
   DOWNLOAD
───────────────────────────────────────────────────── */
function doDownload() {
  if (!state.translation) return;
  const content = [
    'VOXA — AI Powered Language Translator',
    `Date: ${new Date().toLocaleString()}`,
    `From: ${getLangName(state.srcCode)}  →  To: ${getLangName(state.tgtCode)}`,
    '',
    '── Original ──',
    state.srcText,
    '',
    '── Translation ──',
    state.translation,
  ].join('\n');

  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = `voxa_${getLangName(state.tgtCode).replace(/\s+/g,'_').toLowerCase()}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  showToast('Downloaded!', 'ok');
}

/* ─────────────────────────────────────────────────────
   FAVORITES
───────────────────────────────────────────────────── */
function toggleFavCurrent() {
  if (!state.translation) return;

  const id  = `${state.srcCode}|${state.tgtCode}|${state.srcText.slice(0, 40)}`;
  const idx = state.favorites.findIndex(f => f.favId === id);

  if (idx > -1) {
    state.favorites.splice(idx, 1);
    D.btnFav.classList.remove('fav-on');
    showToast('Removed from favorites.', 'info');
  } else {
    if (state.favorites.length >= 100) state.favorites.pop();
    state.favorites.unshift({
      favId:   id,
      id:      Date.now() + Math.random().toString(36).slice(2),
      srcText: state.srcText,
      tgtText: state.translation,
      srcCode: state.srcCode,
      tgtCode: state.tgtCode,
      srcName: getLangName(state.srcCode),
      tgtName: getLangName(state.tgtCode),
      ts:      Date.now(),
    });
    D.btnFav.classList.add('fav-on');
    showToast('Saved to favorites! ⭐', 'ok');
  }
  saveFavorites();
  renderFavorites();
  renderHistory(); /* re-render to sync star icons */
}

function syncFavButton() {
  const id    = `${state.srcCode}|${state.tgtCode}|${state.srcText.slice(0, 40)}`;
  const isFav = state.favorites.some(f => f.favId === id);
  D.btnFav.classList.toggle('fav-on', isFav);
}

function toggleFavFromList(entry) {
  const id  = entry.favId || `${entry.srcCode}|${entry.tgtCode}|${entry.srcText.slice(0, 40)}`;
  const idx = state.favorites.findIndex(f => f.favId === id);
  if (idx > -1) {
    state.favorites.splice(idx, 1);
    showToast('Removed from favorites.', 'info');
  } else {
    state.favorites.unshift({ ...entry, favId: id });
    showToast('Saved! ⭐', 'ok');
  }
  saveFavorites();
  renderFavorites();
  renderHistory();
  syncFavButton();
}

/* ─────────────────────────────────────────────────────
   HISTORY & FAVORITES RENDERING
───────────────────────────────────────────────────── */
function renderHistory() {
  D.histList.innerHTML = '';
  if (!state.history.length) {
    D.histEmpty.style.display = 'block';
    return;
  }
  D.histEmpty.style.display = 'none';
  state.history.forEach(entry => {
    D.histList.appendChild(buildEntry(entry));
  });
}

function renderFavorites() {
  D.favList.innerHTML = '';
  if (!state.favorites.length) {
    D.favEmpty.style.display = 'block';
    return;
  }
  D.favEmpty.style.display = 'none';
  state.favorites.forEach(entry => {
    D.favList.appendChild(buildEntry(entry));
  });
}

function buildEntry(entry) {
  const isFav = state.favorites.some(f =>
    f.favId === (entry.favId || `${entry.srcCode}|${entry.tgtCode}|${entry.srcText.slice(0,40)}`)
  );

  const div = document.createElement('div');
  div.className = 'entry-card';

  div.innerHTML = `
    <div class="ec-head">
      <span class="ec-langs">${esc(entry.srcName)} → ${esc(entry.tgtName)}</span>
      <button class="star-btn ${isFav ? 'starred' : ''}" title="${isFav ? 'Remove favorite' : 'Add favorite'}">
        ${isFav ? '⭐' : '☆'}
      </button>
    </div>
    <p class="ec-src">${esc(clip(entry.srcText, 80))}</p>
    <p class="ec-tgt">${esc(clip(entry.tgtText, 80))}</p>
    <p class="ec-time">${timeAgo(entry.ts)}</p>
  `;

  /* Click card body = restore */
  div.addEventListener('click', e => {
    if (e.target.closest('.star-btn')) return;
    restoreEntry(entry);
  });

  /* Star button */
  div.querySelector('.star-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleFavFromList(entry);
  });

  return div;
}

function restoreEntry(entry) {
  /* Restore source language */
  D.srcLang.value = entry.srcCode || 'auto';
  D.tgtLang.value = entry.tgtCode || 'en';

  /* Restore text */
  D.srcText.value   = entry.srcText;
  state.translation = entry.tgtText;
  state.srcText     = entry.srcText;
  state.srcCode     = entry.srcCode;
  state.tgtCode     = entry.tgtCode;

  onTextInput();
  showResult(entry.tgtText);
  enableOutputButtons(true);
  updateTgtPill();
  syncPills();
  syncFavButton();
  closeDrawer();
}

function clearHistory() {
  state.history = [];
  saveHistory();
  renderHistory();
  showToast('History cleared.', 'info');
}

/* ─────────────────────────────────────────────────────
   HISTORY DRAWER
───────────────────────────────────────────────────── */
function openDrawer() {
  state.drawerOpen = true;
  D.overlay.style.display = 'block';
  D.drawer.classList.add('open');
  D.drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  state.drawerOpen = false;
  D.overlay.style.display = 'none';
  D.drawer.classList.remove('open');
  D.drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function switchTab(tab) {
  state.activeTab = tab;
  D.drawerTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  D.tabHistory.style.display   = tab === 'history'   ? 'flex' : 'none';
  D.tabFavorites.style.display = tab === 'favorites' ? 'flex' : 'none';
}

/* ─────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────────── */
const ICONS = { ok: '✓', err: '✕', info: 'ℹ', warn: '⚠' };

function showToast(msg, type = 'info', ms = 3500) {
  const t   = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${ICONS[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  D.toastBox.appendChild(t);

  const timer = setTimeout(() => dismissToast(t), ms);
  t.addEventListener('click', () => { clearTimeout(timer); dismissToast(t); });
}

function dismissToast(t) {
  t.classList.add('out');
  t.addEventListener('animationend', () => t.remove(), { once: true });
}

/* ─────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────── */
/* HTML-escape to prevent XSS */
function esc(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/* Truncate with ellipsis */
function clip(s, max) {
  return s && s.length > max ? s.slice(0, max) + '…' : (s || '');
}

/* Human-readable time ago */
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* Brief colour flash on a button for feedback */
function flashBtn(btn, colour) {
  btn.style.color       = colour;
  btn.style.borderColor = colour;
  setTimeout(() => { btn.style.color = ''; btn.style.borderColor = ''; }, 1200);
}