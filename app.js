// ════════════════════════════════════════
// 通用录音引擎 v2 · UNIVERSAL RECORDER
// - 登录后立即申请麦克风权限（一次性）
// - 用 SpeechRecognition 转录（无需API）
// - 静音自动停止（无需手动按停）
// - 全平台支持（iOS除外，iOS用TTS降级）
// ════════════════════════════════════════

let _micPermitted = false;   // 是否已获得麦克风权限
let _recSR = null;           // SpeechRecognition instance
let _recActive = false;
let _recCallback = null;

// 登录后调用一次，预热麦克风权限
async function recWarmUp() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop()); // 立即释放，只是为了触发权限
    _micPermitted = true;
    console.log('[聪明豆] 麦克风权限已获取');
  } catch(e) {
    _micPermitted = false;
    console.warn('[聪明豆] 麦克风权限被拒绝:', e.message);
  }
}

// 检查是否支持语音识别
function recSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 主录音函数：按下开始，说完自动停，callback(transcript)
function recOnce(hint, onResult, onStart, onError) {
  if (_recActive) {
    if (_recSR) _recSR.stop();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (onError) onError('unsupported');
    return;
  }

  _recSR = new SR();
  _recSR.lang = 'zh-CN';
  _recSR.continuous = false;
  _recSR.interimResults = false;
  _recSR.maxAlternatives = 3;

  _recActive = true;
  if (onStart) onStart();

  let finalTranscript = '';

  _recSR.onresult = e => {
    // Take the best alternative
    let best = '';
    for (let i = 0; i < e.results.length; i++) {
      for (let j = 0; j < e.results[i].length; j++) {
        if (e.results[i][j].transcript.length > best.length)
          best = e.results[i][j].transcript;
      }
    }
    finalTranscript = best.replace(/[，。？！、；：""''《》（）\s]/g, '');
  };

  _recSR.onerror = e => {
    _recActive = false;
    _recSR = null;
    console.warn('[聪明豆] 录音错误:', e.error);
    if (e.error === 'not-allowed') {
      if (onError) onError('not-allowed');
    } else {
      // network/aborted etc — just return empty
      if (onResult) onResult('');
    }
  };

  _recSR.onend = () => {
    _recActive = false;
    _recSR = null;
    if (onResult) onResult(finalTranscript);
  };

  try {
    _recSR.start();
  } catch(e) {
    _recActive = false;
    _recSR = null;
    if (onError) onError(e.message);
  }
}

// ── 高阶：按钮式录音，自动停止，返回Promise ──
function recButton(btn, hint) {
  return new Promise(resolve => {
    const origText = btn.dataset.origText || btn.textContent;
    btn.dataset.origText = origText;

    if (!recSupported()) {
      // iOS fallback — show message
      btn.textContent = '⚠️ 此浏览器不支持录音';
      setTimeout(() => { btn.textContent = origText; }, 2000);
      resolve(null);
      return;
    }

    btn.style.background = 'var(--red)';
    btn.style.color = 'white';
    btn.textContent = '🔴 说话中… 自动停止';
    btn.disabled = true;

    recOnce(
      hint,
      // onResult
      transcript => {
        btn.style.background = 'var(--red-light)';
        btn.style.color = 'var(--red)';
        btn.textContent = origText;
        btn.disabled = false;
        resolve(transcript);
      },
      // onStart
      null,
      // onError
      errType => {
        btn.style.background = '';
        btn.style.color = '';
        btn.textContent = origText;
        btn.disabled = false;
        if (errType === 'not-allowed' || errType === 'unsupported') {
          resolve(null); // skip scoring
        } else {
          resolve('');
        }
      }
    );
  });
}


// ════════════════════════════════════════
// WORD BANK — Learner words (general)
// ════════════════════════════════════════

// ════════════════════════════════════════
// NATIVE SPEAKER LESSONS
// ════════════════════════════════════════
// Lesson code numbers — Z series (Z1.x = 一年级上下册教材)
const LESSON_CODES = {
  // H 识字阅读 Level 1
  'h1l1':'H1.1','h1l2':'H1.2','h1l3':'H1.3','h1l4':'H1.4','h1l5':'H1.5',
  'h1l6':'H1.6','h1l7':'H1.7','h1l8':'H1.8','h1l9':'H1.9','h1l10':'H1.10',
  'h1l11':'H1.11','h1l12':'H1.12','h1l13':'H1.13','h1l14':'H1.14',
  'h1l15':'H1.15','h1l16':'H1.16','h1l17':'H1.17',
  // H 识字阅读 Level 2
  'h2l1':'H2.1','h2l2':'H2.2','h2l3':'H2.3','h2l4':'H2.4','h2l5':'H2.5',
  'h2l6':'H2.6','h2l7':'H2.7','h2l8':'H2.8','h2l9':'H2.9','h2l10':'H2.10',
  'h2l11':'H2.11','h2l12':'H2.12','h2l13':'H2.13','h2l14':'H2.14',
  'h2l15':'H2.15','h2l16':'H2.16','h2l17':'H2.17', 'yi1l2':'Z1.2', 'yi1l3':'Z1.3', 'yi1l4':'Z1.4', 'yi1l5':'Z1.5',
  // 一年级 Level 2 (Z1.18–Z1.34)
  'yi2l1':'Z1.18','yi2l2':'Z1.19','yi2l3':'Z1.20',
  // 二年级 Level 1 (Z1.35–Z1.51) — 姓氏歌拆两课时故Z1.36/Z1.37
  'er1l1':'Z1.35','er1l2':'Z1.36','er1l3':'Z1.38','er1l4':'Z1.39',
  'er1l5':'Z1.42','er1l6':'Z1.43','er1l7':'Z1.44','er1l8':'Z1.46',
  'er1l9':'Z1.47','er1l10':'Z1.49',
  // 二年级 Level 2 (Z1.52–Z1.68)
  'er2l1':'Z1.52',
  // 五年级 Level 2 (Z3系列，待确认具体编号)
  'l2l1':'Z3.18','l2l2':'Z3.19','l2l3':'Z3.20','l2l4':'Z3.21',
  'l2l5':'Z3.22','l2l6':'Z3.23','l2l7':'Z3.24','l2l8':'Z3.25',
};
function getLessonCode(id){ return LESSON_CODES[id]||''; }


const MODE_INFO = {
  flashcard:{label:'Flashcard',       zh:'翻卡片',   color:'#b8922a', desc:'See the word, say it, then reveal the pinyin.'},
  multiple: {label:'Multiple Choice', zh:'选择题',   color:'#c0392b', desc:'Pick the correct pinyin pronunciation.'},
  type:     {label:'Type It',         zh:'拼写练习', color:'#2d6a4f', desc:'Build the pinyin using the sound picker.'},
  listen:   {label:'Listen & Pick',   zh:'听音选字', color:'#6b3fa0', desc:'Listen to the word and pick the correct character.'},
  reading:  {label:'Reading Practice',zh:'朗读练习', color:'#c0392b', desc:'Read the text aloud line by line and get scored.'},
  drill:    {label:'Review Drill',    zh:'复习练习', color:'#1e4d8c', desc:'Practice your missed words.'},
};
// Learner desc overrides
const LEARNER_DESC = {
  flashcard:'Flip cards to reveal meaning, then rate yourself.',
  multiple: 'Pick the correct English translation.',
  type:     'Type the English meaning from memory.',
};

const Q_OPTIONS = [5,10,15,20];

// ════════════════════════════════════════
// PINYIN KEYBOARD DATA
// ════════════════════════════════════════
const PY_INITIALS  = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s','y','w'];
const PY_FINALS    = ['a','o','e','i','u','ü','ai','ei','ui','ao','ou','iu','ie','üe','er','an','en','in','un','ün','ang','eng','ing','ong'];
const PY_TONES     = ['ā','á','ǎ','à','ē','é','ě','è','ī','í','ǐ','ì','ō','ó','ǒ','ò','ū','ú','ǔ','ù','ǖ','ǘ','ǚ','ǜ'];

// ════════════════════════════════════════
// STATE
// ════════════════════════════════════════
let userLang       = localStorage.getItem('czmd_lang') || null;
let selectedLesson = null;  // active lesson for native speakers
let currentMode    = null;
let isDrillSession = false;
let numQuestions   = 10;
let deck=[], idx=0, score=0, streak=0;
let answered=false, flipped=false, missedWords=[];
let modalWord      = null;
let pinyinTokens   = []; // for native type-it

let needsReview = [];
let allReviewed = [];

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
// 答对：清脆好听的「叮咚」上行双音（660Hz → 990Hz），gain 平滑淡入淡出，无爆音。
function playCorrect(){
  const ctx = getAudioCtx();
  if(ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  const note = (freq, start, dur) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + start);
    // 平滑包络：从极小值指数爬到峰值再回落，避免起停爆音（始终保持 >0）
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.02);
  };
  note(660, 0,    0.12);  // 叮（较低）
  note(990, 0.10, 0.18);  // 咚（较高，上行）
}
// 答错：温和的下行提示音（400Hz → 260Hz），音量低、不刺耳，避免吓到孩子。
function playWrong(){
  const ctx = getAudioCtx();
  if(ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t0);
  osc.frequency.exponentialRampToValueAtTime(260, t0 + 0.25);  // 缓和下行
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.03);     // 峰值低，柔和
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.32);
}
// 首次用户手势解锁音频：浏览器自动播放策略会让 AudioContext 一直处于 'suspended'，
// 必须在一次真实用户手势里 resume 才能出声。这里在页面加载后注册一次性监听，
// 第一次交互即唤醒，然后自我解绑。不改动 getAudioCtx() 本身，只是额外的解锁入口。
function unlockAudioOnce(){
  try{ const ctx = getAudioCtx(); if(ctx.state === 'suspended') ctx.resume(); }catch(e){}
  ['pointerdown','touchstart','click','keydown'].forEach(ev =>
    document.removeEventListener(ev, unlockAudioOnce));
}
['pointerdown','touchstart','click','keydown'].forEach(ev =>
  document.addEventListener(ev, unlockAudioOnce));

// Cloud-backed cache helpers. LocalStorage stays as the instant UI cache;
// Firestore is the shared source when it is reachable.
function cloudReadyForData(){
  return !!(window.firebaseReady && window.cloudAuth && window.cloudAuth._doc && window.cloudAuth._getDoc && window.cloudAuth._setDoc);
}
function cloudStudentProgressRef(docId){
  const uid = (typeof getCurrentCloudUid === 'function') ? getCurrentCloudUid() : null;
  if(!uid || !cloudReadyForData()) return null;
  return window.cloudAuth._doc(window.cloudAuth.db, 'students', uid, 'progress', docId);
}
function cloudAppDataRef(docId){
  if(!cloudReadyForData()) return null;
  return window.cloudAuth._doc(window.cloudAuth.db, 'appData', docId);
}
async function cloudReadRef(ref){
  if(!ref || !window.cloudAuth._getDoc) return null;
  const snap = await window.cloudAuth._getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
// Non-blocking, throttled banner so cloud-write failures aren't fully silent.
// Data is always kept in localStorage, so this is a "couldn't sync" heads-up,
// not a data-loss error. Throttled to avoid spamming during a network outage.
let _cloudFailToastTs = 0;
function notifyCloudWriteFailed(){
  try{
    const now = Date.now();
    if(now - _cloudFailToastTs < 4000) return;
    _cloudFailToastTs = now;
    let el = document.getElementById('cloud-sync-toast');
    if(!el){
      el = document.createElement('div');
      el.id = 'cloud-sync-toast';
      el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#c0392b;color:#fff;padding:10px 18px;border-radius:24px;font-size:13px;font-family:DM Sans,sans-serif;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.25);max-width:90%;text-align:center;';
      document.body.appendChild(el);
    }
    el.textContent = '⚠️ 云端同步失败 · 已暂存本地，请检查网络后重试';
    el.style.display = 'block';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(()=>{ el.style.display = 'none'; }, 3500);
  }catch(e){}
}
// Persistent banner shown when the session is NOT cloud-authenticated (i.e. it fell
// back to local login). In that state writes may not reach Firestore, so a teacher's
// assignments could silently never reach students — make that state loudly visible.
function setCloudSessionStatus(connected, roleLabel){
  window._cloudSession = !!connected;
  let bar = document.getElementById('offline-mode-bar');
  if(connected){ if(bar) bar.remove(); return; }
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'offline-mode-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;font-size:12px;font-weight:600;font-family:DM Sans,sans-serif;text-align:center;padding:7px 12px;z-index:100000;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    document.body.appendChild(bar);
  }
  bar.textContent = '⚠️ 本地模式 · 未通过云端登录：'+(roleLabel||'你')+'的改动可能无法同步到云端，其他设备/学生可能看不到。请检查网络后重新登录。';
}
// Firestore 拒绝任何 undefined 字段值（会抛 "Unsupported field value: undefined"
// 并使整条写入失败 → 数据存不进去）。生字数据里 meaning/example 等字段常为空，
// 写云端前必须递归剔除所有 undefined。null、空串、空数组都是合法的，保留。
function stripUndefinedDeep(val){
  if(Array.isArray(val)){
    return val.map(stripUndefinedDeep);
  }
  if(val && typeof val === 'object' && !(val instanceof Date)){
    const out = {};
    for(const k in val){
      if(val[k] === undefined) continue; // 跳过 undefined 字段
      out[k] = stripUndefinedDeep(val[k]);
    }
    return out;
  }
  return val;
}
function cloudWriteRef(ref, data){
  if(!ref || !window.cloudAuth._setDoc) return;
  const clean = stripUndefinedDeep(data || {});
  window.cloudAuth._setDoc(ref, {...clean, updatedAt:new Date().toISOString()}, {merge:true}).catch(e=>{
    console.warn('Cloud cache save failed:', e);
    notifyCloudWriteFailed();
  });
}

// ── Per-item writes for shared array documents ──────────────────────────────
// The shared appData/{docId} docs hold {items:[...]}. Writing the whole local
// list back (the old pattern) lets a stale local copy clobber entries another
// device added. These helpers re-read the cloud doc and change only the one
// affected record. Concurrency here is low, so a plain read-modify-write is
// enough — no transaction. No-ops safely when the cloud isn't ready.
async function cloudArrayApply(docId, field, apply){
  if(!cloudReadyForData()) return false;
  const ref = cloudAppDataRef(docId);
  if(!ref || !window.cloudAuth._getDoc || !window.cloudAuth._setDoc) return false;
  try{
    const snap = await window.cloudAuth._getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const arr = Array.isArray(data[field]) ? data[field].slice() : [];
    const next = apply(arr);
    await window.cloudAuth._setDoc(ref, {[field]: Array.isArray(next)?next:arr, updatedAt:new Date().toISOString()}, {merge:true});
    return true;
  }catch(e){ console.warn('Cloud array update failed:', docId, e); window._lastCloudError = (e && (e.code || e.message)) || String(e); notifyCloudWriteFailed(); return false; }
}
function cloudArrayUpsert(docId, item, idOf, field){
  return cloudArrayApply(docId, field||'items', arr=>{
    const id = idOf(item);
    const i = arr.findIndex(x=>idOf(x)===id);
    if(i>=0) arr[i]=item; else arr.push(item);
    return arr;
  });
}
function cloudArrayUpsertMany(docId, items, idOf, field){
  return cloudArrayApply(docId, field||'items', arr=>{
    items.forEach(item=>{
      const id = idOf(item);
      const i = arr.findIndex(x=>idOf(x)===id);
      if(i>=0) arr[i]=item; else arr.push(item);
    });
    return arr;
  });
}
function cloudArrayRemove(docId, matches, field){
  return cloudArrayApply(docId, field||'items', arr=>arr.filter(x=>!matches(x)));
}
// Delete keys from a shared map document (e.g. appData/users {items:{...}}).
// merge:true never drops keys, so we re-read, remove the key, and write the doc
// back in full — this is the only way deletions propagate to other devices.
async function cloudMapDeleteKeys(docId, field, keys){
  if(!cloudReadyForData()) return;
  const ref = cloudAppDataRef(docId);
  if(!ref || !window.cloudAuth._getDoc || !window.cloudAuth._setDoc) return;
  try{
    const snap = await window.cloudAuth._getDoc(ref);
    if(!snap.exists()) return;
    const data = snap.data();
    const map = (data[field] && typeof data[field]==='object') ? {...data[field]} : {};
    keys.forEach(k=>{ delete map[k]; });
    await window.cloudAuth._setDoc(ref, {...data, [field]: map, updatedAt:new Date().toISOString()});
  }catch(e){ console.warn('Cloud map delete failed:', docId, field, e); notifyCloudWriteFailed(); }
}
// Stable id for a homework assignment (it is keyed by lesson + class everywhere).
function hwKey(a){ return (a&&a.lessonId||'')+' '+(a&&a.classCode||''); }
function syncCurrentStudentProfile(){
  if(!currentUser || !cloudReadyForData()) return;
  const uid = (typeof getCurrentCloudUid === 'function') ? getCurrentCloudUid() : null;
  if(!uid) return;
  const payload = {
    username: currentUser.username || currentUser.name || '',
    name: currentUser.name || currentUser.username || '',
    chname: currentUser.chname || '',
    nickname: currentUser.nickname || '',
    classCode: currentUser.classCode || '',
    classes: currentUser.classes || (currentUser.classCode ? [currentUser.classCode] : []),
    bg: currentUser.bg || null
  };
  cloudWriteRef(window.cloudAuth._doc(window.cloudAuth.db, 'students', uid), payload);
}
function syncUsersDirectory(users){
  cloudWriteRef(cloudAppDataRef('users'), {items: users || {}});
}
function safeParseJSON(raw, fallback){
  try{ return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; }
}
async function loadStudentCloudCaches(){
  if(!currentUser || !cloudReadyForData()) return;
  try{
    const wrong = await cloudReadRef(cloudStudentProgressRef('wrongChars'));
    if(wrong && Array.isArray(wrong.items)){
      localStorage.setItem(wcKey(), JSON.stringify(wrong.items));
    } else {
      localStorage.setItem(wcKey(), JSON.stringify([]));
    }

    const review = await cloudReadRef(cloudStudentProgressRef('reviewLists'));
    if(review && review.lists && typeof review.lists === 'object'){
      localStorage.setItem('czmd_review_cloud_cache', JSON.stringify(review.lists));
      Object.entries(review.lists).forEach(([key,val])=>{
        if(val && Array.isArray(val.needsReview)) localStorage.setItem(key, JSON.stringify(val.needsReview));
        if(val && Array.isArray(val.allReviewed)){
          localStorage.setItem(key.replace('czmd_needs_review_', 'czmd_all_reviewed_'), JSON.stringify(val.allReviewed));
          if(key.indexOf('czmd_all_reviewed_')===0) localStorage.setItem(key, JSON.stringify(val.allReviewed));
        }
      });
    } else {
      localStorage.setItem('czmd_review_cloud_cache', JSON.stringify({}));
      if(currentUser && currentUser.bg){
        localStorage.setItem('czmd_needs_review_' + currentUser.bg, JSON.stringify([]));
        localStorage.setItem('czmd_all_reviewed_' + currentUser.bg, JSON.stringify([]));
      }
    }

    const attempts = await cloudReadRef(cloudStudentProgressRef('attempts'));
    if(attempts && attempts.counts && typeof attempts.counts === 'object'){
      localStorage.setItem('czmd_attempts_cloud_cache', JSON.stringify(attempts.counts));
      Object.entries(attempts.counts).forEach(([key,val])=>{
        localStorage.setItem(key, JSON.stringify(val||0));
      });
    } else {
      localStorage.setItem('czmd_attempts_cloud_cache', JSON.stringify({}));
    }

    const examAttempts = await cloudReadRef(cloudStudentProgressRef('examAttempts'));
    if(examAttempts && examAttempts.counts && typeof examAttempts.counts === 'object'){
      localStorage.setItem('czmd_exam_attempts_cloud_cache', JSON.stringify(examAttempts.counts));
      Object.entries(examAttempts.counts).forEach(([key,val])=>{
        localStorage.setItem(key, String(val||0));
      });
    } else {
      localStorage.setItem('czmd_exam_attempts_cloud_cache', JSON.stringify({}));
    }

    const levelSessions = await cloudReadRef(cloudStudentProgressRef('levelQuizSessions'));
    if(levelSessions && levelSessions.sessions && typeof levelSessions.sessions === 'object'){
      localStorage.setItem('czmd_level_sessions_cloud_cache', JSON.stringify(levelSessions.sessions));
      Object.entries(levelSessions.sessions).forEach(([key,val])=>{
        if(val) localStorage.setItem(key, JSON.stringify(val));
      });
    } else {
      localStorage.setItem('czmd_level_sessions_cloud_cache', JSON.stringify({}));
    }
  }catch(e){
    console.warn('Cloud student cache load failed:', e);
  }
}
async function loadSharedCloudCaches(){
  if(!cloudReadyForData()) return;
  try{
    const classes = await cloudReadRef(cloudAppDataRef('classes'));
    if(classes){
      const customClasses = Array.isArray(classes.customClasses) ? classes.customClasses : [];
      const metaByCode = classes.metaByCode && typeof classes.metaByCode === 'object' ? classes.metaByCode : {};
      localStorage.setItem('czmd_custom_classes', JSON.stringify(customClasses));
      localStorage.setItem('czmd_cls_meta_cloud_cache', JSON.stringify(metaByCode));
      for(let i=localStorage.length-1;i>=0;i--){
        const key = localStorage.key(i);
        if(key && key.startsWith('czmd_cls_meta_') && key !== 'czmd_cls_meta_cloud_cache') localStorage.removeItem(key);
      }
      Object.entries(metaByCode).forEach(([code,meta])=>{
        localStorage.setItem('czmd_cls_meta_' + code, JSON.stringify(meta||{}));
      });
    } else {
      localStorage.setItem('czmd_custom_classes', JSON.stringify([]));
      localStorage.setItem('czmd_cls_meta_cloud_cache', JSON.stringify({}));
      for(let i=localStorage.length-1;i>=0;i--){
        const key = localStorage.key(i);
        if(key && key.startsWith('czmd_cls_meta_') && key !== 'czmd_cls_meta_cloud_cache') localStorage.removeItem(key);
      }
    }

    const users = await cloudReadRef(cloudAppDataRef('users'));
    if(users && users.items && typeof users.items === 'object'){
      localStorage.setItem('czmd_users', JSON.stringify(users.items));
    } else {
      localStorage.setItem('czmd_users', JSON.stringify({}));
    }

    const teacherAccounts = await cloudReadRef(cloudAppDataRef('teacherAccounts'));
    if(teacherAccounts && teacherAccounts.items && typeof teacherAccounts.items === 'object'){
      localStorage.setItem('czmd_teacher_accounts', JSON.stringify(teacherAccounts.items));
      Object.assign(TEACHER_ACCOUNTS, teacherAccounts.items);
    } else {
      localStorage.setItem('czmd_teacher_accounts', JSON.stringify({}));
    }

    const homework = await cloudReadRef(cloudAppDataRef('homework'));
    if(homework && Array.isArray(homework.items)){
      localStorage.setItem('czmd_homework', JSON.stringify(homework.items));
      homework.items.forEach(a=>{
        if(!a || !a.lessonId || !a.classCode) return;
        const docId = 'hwCompletion_' + encodeURIComponent(a.lessonId + '_' + a.classCode);
        cloudReadRef(cloudAppDataRef(docId)).then(data=>{
          if(data && Array.isArray(data.items)){
            localStorage.setItem('czmd_hw_completion_' + a.lessonId + '_' + a.classCode, JSON.stringify(data.items));
          }
        }).catch(e=>console.warn('Cloud homework completion load failed:', e));
      });
    } else {
      localStorage.setItem('czmd_homework', JSON.stringify([]));
    }

    const requests = await cloudReadRef(cloudAppDataRef('redeemRequests'));
    if(requests && Array.isArray(requests.items)){
      localStorage.setItem('czmd_redeem_requests', JSON.stringify(requests.items));
    } else {
      localStorage.setItem('czmd_redeem_requests', JSON.stringify([]));
    }

    const rewards = await cloudReadRef(cloudAppDataRef('customRewards'));
    if(rewards && Array.isArray(rewards.items)){
      rewards.items.forEach(r=>{ if(r && !r.id) r.id='rw_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); });
      localStorage.setItem('czmd_custom_rewards', JSON.stringify(rewards.items));
      REWARDS.length = 0;
      rewards.items.forEach(r=>REWARDS.push(r));
    } else {
      localStorage.removeItem('czmd_custom_rewards');
      if(typeof DEFAULT_REWARDS !== 'undefined'){
        REWARDS.length = 0;
        DEFAULT_REWARDS.forEach(r=>REWARDS.push(r));
      }
    }

    // Teaching resources — if cloud has none yet, seed it from local instead of
    // wiping local (one-time migration for teachers who created resources offline).
    const resources = await cloudReadRef(cloudAppDataRef('resources'));
    if(resources && Array.isArray(resources.items)){
      localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources.items));
    } else {
      const localRes = safeParseJSON(localStorage.getItem(RESOURCES_KEY), []);
      if(localRes.length) cloudWriteRef(cloudAppDataRef('resources'), {items: localRes});
    }

    // Custom lessons — same seed-don't-wipe policy.
    const customLessons = await cloudReadRef(cloudAppDataRef('customLessons'));
    if(customLessons && Array.isArray(customLessons.items)){
      localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify(customLessons.items));
    } else {
      const localCL = safeParseJSON(localStorage.getItem(CUSTOM_LESSONS_KEY), []);
      if(localCL.length) cloudWriteRef(cloudAppDataRef('customLessons'), {items: localCL});
    }

    // Per-lesson activity tabs — stored as one map of {key: tabData}. When cloud
    // has data, clear local tab keys then repopulate so deletions propagate.
    const lessonTabs = await cloudReadRef(cloudAppDataRef('lessonTabs'));
    if(lessonTabs && lessonTabs.tabs && typeof lessonTabs.tabs === 'object'){
      for(let i=localStorage.length-1;i>=0;i--){
        const key = localStorage.key(i);
        if(key && key.startsWith('czmd_lesson_tab_')) localStorage.removeItem(key);
      }
      Object.entries(lessonTabs.tabs).forEach(([key,val])=>{
        if(val) localStorage.setItem(key, JSON.stringify(val));
      });
    } else {
      const localTabs = collectLessonTabs();
      if(Object.keys(localTabs).length) cloudWriteRef(cloudAppDataRef('lessonTabs'), {tabs: localTabs});
    }

    // Exam rotation memory — one map of {key: seenChars}; same clear-then-repopulate.
    const examSeen = await cloudReadRef(cloudAppDataRef('examSeen'));
    if(examSeen && examSeen.seen && typeof examSeen.seen === 'object'){
      for(let i=localStorage.length-1;i>=0;i--){
        const key = localStorage.key(i);
        if(key && key.startsWith('czmd_exam_seen_')) localStorage.removeItem(key);
      }
      Object.entries(examSeen.seen).forEach(([key,val])=>{
        if(Array.isArray(val)) localStorage.setItem(key, JSON.stringify(val));
      });
    } else {
      const localSeen = collectExamSeen();
      if(Object.keys(localSeen).length) cloudWriteRef(cloudAppDataRef('examSeen'), {seen: localSeen});
    }
  }catch(e){
    console.warn('Cloud shared cache load failed:', e);
  }
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
  window.scrollTo(0,0);
  // When showing auth screen, check for recent accounts
  if(id === 'auth'){
    setTimeout(function(){
      const recent = getRecentAccounts();
      const loginForm = document.getElementById('auth-login-form');
      const recentBox = document.getElementById('recent-accounts');
      if(recent.length > 0){
        // Show recent list above the role cards
        // Don't hide forms — just show recent at top, let user also switch tabs
        renderRecentAccounts();
        if(loginForm) loginForm.style.display = 'none';
      } else {
        if(recentBox) recentBox.style.display = 'none';
        if(loginForm) loginForm.style.display = 'block';
      }
    }, 0);
  }
}
function shuffle(arr){return [...arr].sort(()=>Math.random()-0.5);}
function isNative(){return userLang==='native';}

// ════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════
function setLang(lang){
  userLang=lang;
  localStorage.setItem('czmd_lang',lang);
  if(lang==='native'){
    selectedLesson=null;
    showScreen('lesson');
    renderLessonSelect();
  } else {
    showScreen('home');
    renderHome();
  }
}

// ════════════════════════════════════════
// LESSON SELECT
// ════════════════════════════════════════
function renderLessonSelect(){
  const grid=document.getElementById('lesson-cards');
  // Group by level
  const levels={};
  NATIVE_LESSONS.forEach(l=>{
    if(!levels[l.level]) levels[l.level]=[];
    levels[l.level].push(l);
  });
  grid.innerHTML=Object.entries(levels).map(([levelName,lessons])=>`
    <div style="grid-column:1/-1;margin:8px 0 4px;">
      <div class="section-label" style="margin-bottom:0;">${levelName}</div>
    </div>
    ${lessons.map(l=>`
      <div class="lesson-card" onclick="selectLesson('${l.id}')">
        <span class="lesson-card-num">${l.title}</span>
        <div class="lesson-card-title">${l.subtitle}</div>
        <div class="lesson-card-count">${l.words.length} characters</div>
      </div>
    `).join('')}
  `).join('');
}

function selectLesson(id){
  selectedLesson=NATIVE_LESSONS.find(l=>l.id===id)||null;
  // Use per-lesson storage keys
  needsReview=JSON.parse(localStorage.getItem('czmd_needs_review_'+id)||'[]');
  allReviewed=JSON.parse(localStorage.getItem('czmd_all_reviewed_'+id)||'[]');
  showScreen('home');
  renderHome();
}

function getActiveWords(){
  if(isNative() && selectedLesson) return selectedLesson.words;
  return WORDS;
}

// ════════════════════════════════════════
// HOME
// ════════════════════════════════════════
function renderHome(){
  if(isNative()){
    document.getElementById('home-subtitle').textContent=selectedLesson ? selectedLesson.title+'·'+selectedLesson.subtitle : '拼音练习游戏';
    document.getElementById('mc1-zh').textContent='看词说拼音';
    document.getElementById('mc2-zh').textContent='选择拼音';
    document.getElementById('mc3-zh').textContent='拼音拼写';
    document.getElementById('speaker-label').textContent='母语者';
    document.getElementById('speaker-dot').style.background='var(--red)';
    document.getElementById('listen-mode-card').style.display='block';
    document.getElementById('mode-cards-grid').style.gridTemplateColumns='1fr 1fr';
  } else {
    document.getElementById('home-subtitle').textContent='Chinese Word Game';
    document.getElementById('mc1-zh').textContent='翻卡片';
    document.getElementById('mc2-zh').textContent='选择题';
    document.getElementById('mc3-zh').textContent='拼写练习';
    document.getElementById('speaker-label').textContent='Learning Chinese';
    document.getElementById('speaker-dot').style.background='var(--gold)';
    document.getElementById('listen-mode-card').style.display='none';
    document.getElementById('mode-cards-grid').style.gridTemplateColumns='1fr 1fr 1fr';
  }
  if(!isNative()){
    needsReview=JSON.parse(localStorage.getItem('czmd_needs_review_'+userLang)||'[]');
    allReviewed=JSON.parse(localStorage.getItem('czmd_all_reviewed_'+userLang)||'[]');
  }
  renderUserBar('home-user-bar');
  document.getElementById('setup-panel').style.display='none';
  renderNeedsReview(); renderAllReviewed();
}
function goHome(){
  stopVoice();
  if(isNative() && !selectedLesson){ showScreen('lesson'); renderLessonSelect(); return; }
  showScreen('home'); renderHome();
}
function switchSpeaker(){
  selectedLesson=null;
  showScreen('onboard');
}

function openSetup(mode){
  currentMode=mode;
  const info=MODE_INFO[mode];
  const desc=isNative()?info.desc:(LEARNER_DESC[mode]||info.desc);
  document.getElementById('setup-title-text').innerHTML=info.label+' <span style="font-family:\'Noto Serif SC\',serif;font-size:16px;color:var(--muted);margin-left:8px;">'+info.zh+'</span>';
  document.getElementById('setup-desc-text').textContent=desc;
  const chips=document.getElementById('q-chips');
  chips.innerHTML='';
  Q_OPTIONS.filter(n=>n<=getActiveWords().length).forEach(n=>{
    const c=document.createElement('button');
    c.className='q-chip'+(n===numQuestions?' selected':'');
    c.textContent=n+' questions';
    c.onclick=()=>{document.querySelectorAll('.q-chip').forEach(x=>x.classList.remove('selected'));c.classList.add('selected');numQuestions=n;};
    chips.appendChild(c);
  });
  const p=document.getElementById('setup-panel');
  p.style.display='block';
  p.scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ════════════════════════════════════════
// NEEDS REVIEW
// ════════════════════════════════════════
function getNRKey(){ return isNative() && selectedLesson ? 'czmd_needs_review_'+selectedLesson.id : 'czmd_needs_review_'+userLang; }
function getARKey(){ return isNative() && selectedLesson ? 'czmd_all_reviewed_'+selectedLesson.id : 'czmd_all_reviewed_'+userLang; }
function saveReviewCloudCache(key, patch){
  const cacheKey = 'czmd_review_cloud_cache';
  const cache = safeParseJSON(localStorage.getItem(cacheKey), {});
  cache[key] = Object.assign({}, cache[key]||{}, patch||{});
  localStorage.setItem(cacheKey, JSON.stringify(cache));
  cloudWriteRef(cloudStudentProgressRef('reviewLists'), {lists:cache});
}
function saveNR(){
  const key = getNRKey();
  localStorage.setItem(key,JSON.stringify(needsReview));
  saveReviewCloudCache(key, {needsReview});
}
function saveAR(){
  const key = getARKey();
  localStorage.setItem(key,JSON.stringify(allReviewed));
  saveReviewCloudCache(key, {allReviewed});
}
function addToNR(word){
  if(!needsReview.find(w=>w.char===word.char)){
    needsReview.push({char:word.char,pinyin:word.pinyin,meaning:word.meaning,example:word.example});
    saveNR();
  }
  // Also save to wrong chars bank
  try{
    const src = currentMode==='flashcard'?'翻卡片': currentMode==='multiple'?'选择题': currentMode==='type'?'拼写': currentMode==='listen'?'听音选字':'练习';
    addWrongChar(word.char, word.pinyin, word.meaning||'', src, null);
  }catch(e){}
}
function removeFromNR(char){needsReview=needsReview.filter(w=>w.char!==char);saveNR();}

function renderNeedsReview(){
  const sec=document.getElementById('needs-review-section');
  const grid=document.getElementById('needs-review-grid');
  if(!needsReview.length){sec.style.display='none';return;}
  sec.style.display='block';
  grid.innerHTML=needsReview.map(w=>`
    <div class="needs-review-card" onclick="openDrillModal('${w.char.replace(/'/g,"\\'")}')">
      <span class="nr-char">${w.char}</span>
      <span class="nr-pinyin">${w.pinyin}</span>
      <span class="nr-meaning">${w.meaning}</span>
      <span class="nr-badge">Review</span>
      <span class="nr-tap">tap to study</span>
    </div>`).join('');
}

function drillAllReview(){
  if(!needsReview.length)return;
  isDrillSession=true; currentMode='flashcard';
  deck=shuffle([...needsReview]);
  idx=0;score=0;streak=0;answered=false;flipped=false;missedWords=[];
  document.getElementById('game-title-text').textContent='Review Drill';
  document.getElementById('progress-fill').style.background='#1e4d8c';
  document.getElementById('drill-banner').style.display='block';
  document.getElementById('drill-banner-sub').textContent='Practicing '+deck.length+' missed word'+(deck.length!==1?'s':'');
  document.getElementById('setup-panel').style.display='none';
  showScreen('game'); renderQuestion();
}

// ════════════════════════════════════════
// DRILL MODAL
// ════════════════════════════════════════
function openDrillModal(char){
  modalWord=needsReview.find(w=>w.char===char);
  if(!modalWord)return;
  document.getElementById('dm-char').textContent=modalWord.char;
  document.getElementById('dm-pinyin').textContent=modalWord.pinyin;
  document.getElementById('dm-meaning').textContent=modalWord.meaning;
  document.getElementById('dm-example').textContent=modalWord.example;
  document.getElementById('drill-modal').classList.add('open');
}
function closeDrillModal(keep){
  document.getElementById('drill-modal').classList.remove('open');
  if(!keep&&modalWord){removeFromNR(modalWord.char);renderNeedsReview();}
  modalWord=null;
}
function handleModalClick(e){if(e.target===document.getElementById('drill-modal'))closeDrillModal(true);}

// ════════════════════════════════════════
// ALL REVIEWED
// ════════════════════════════════════════
function addToAllReviewed(word,mode){
  if(!allReviewed.find(r=>r.char===word.char)){
    allReviewed.unshift({char:word.char,pinyin:word.pinyin,meaning:word.meaning,mode});
    if(allReviewed.length>80)allReviewed=allReviewed.slice(0,80);
    saveAR();
  }
}
function renderAllReviewed(){
  const grid=document.getElementById('reviewed-grid');
  if(!allReviewed.length){grid.innerHTML='<div class="empty-review">Words you\'ve studied will appear here.</div>';return;}
  grid.innerHTML=allReviewed.map(r=>`
    <div class="reviewed-card">
      <span class="rc-char">${r.char}</span>
      <span class="rc-pinyin">${r.pinyin}</span>
      <span class="rc-meaning">${r.meaning}</span>
      <span class="rc-source src-${r.mode}">${MODE_INFO[r.mode]?.label||r.mode}</span>
    </div>`).join('');
}

// ════════════════════════════════════════
// GAME START
// ════════════════════════════════════════
function startGame(){
  if(!currentMode)return;
  isDrillSession=false;
  deck=shuffle(getActiveWords()).slice(0,numQuestions);
  idx=0;score=0;streak=0;answered=false;flipped=false;missedWords=[];pinyinTokens=[];
  const info=MODE_INFO[currentMode];
  document.getElementById('game-title-text').textContent=info.label;
  document.getElementById('progress-fill').style.background=info.color;
  document.getElementById('drill-banner').style.display='none';
  document.getElementById('setup-panel').style.display='none';
  showScreen('game'); renderQuestion();
}
function retryGame(){startGame();}

// ════════════════════════════════════════
// SCORE UI
// ════════════════════════════════════════
function updateScoreUI(){
  document.getElementById('pill-score').textContent='Score: '+score;
  document.getElementById('pill-streak').textContent='Streak: '+streak;
  // Progress: how far through the deck we are (capped at 100%)
  const pct=Math.min((idx/deck.length)*100,100);
  document.getElementById('progress-fill').style.width=pct+'%';
  // Show current position vs remaining total
  document.getElementById('progress-text').textContent=(idx+1)+' / '+deck.length;
}

// ════════════════════════════════════════
// QUESTION ROUTER
// ════════════════════════════════════════
function renderQuestion(){
  stopVoice();
  lastHeard = '';
  updateScoreUI();
  if(idx>=deck.length){showResult();return;}
  answered=false;flipped=false;pinyinTokens=[];
  const mode=isDrillSession?'flashcard':currentMode;
  if(mode==='flashcard') isNative()?renderNativeFlashcard():renderFlashcard();
  else if(mode==='multiple') isNative()?renderNativeMC():renderMultiple();
  else if(mode==='listen') renderListen();
  else isNative()?renderNativeType():renderType();
}

// ════════════════════════════════════════
// LEARNER FLASHCARD
// ════════════════════════════════════════
function renderFlashcard(){
  const w=deck[idx];
  document.getElementById('game-area').innerHTML=`
    <div class="card-scene">
      <div class="card-3d" id="the-card" onclick="flipCardFC()">
        <div class="card-face card-front">
          <div class="card-hint">tap to flip</div>
          <div class="card-char">${w.char}</div>
          <div class="card-pinyin">${w.pinyin}</div>
        </div>
        <div class="card-face card-back">
          <div class="card-hint">meaning</div>
          <div class="card-meaning">${w.meaning}</div>
          <div class="card-example">${w.example}</div>
        </div>
      </div>
    </div>
    <div id="fc-actions" style="display:none">
      <div class="fc-actions">
        <button class="fc-btn bad" onclick="fcAnswer(false)">✗ Didn't know</button>
        <button class="fc-btn good" onclick="fcAnswer(true)">✓ Got it!</button>
      </div>
    </div>
    <button class="btn-reveal" id="btn-reveal" onclick="flipCardFC()">Reveal answer</button>`;
}

function flipCardFC(){
  flipped=!flipped;
  const card=document.getElementById('the-card');
  if(!card)return;
  if(flipped){
    card.classList.add('flipped');
    document.getElementById('fc-actions').style.display='block';
    document.getElementById('btn-reveal').style.display='none';
    addToAllReviewed(deck[idx],isDrillSession?'drill':'flashcard');
  } else {
    card.classList.remove('flipped');
    document.getElementById('fc-actions').style.display='none';
    document.getElementById('btn-reveal').style.display='block';
  }
}

function fcAnswer(correct){
  const w=deck[idx];
  if(correct){
    score++;streak++;
    playCorrect();
    if(isDrillSession)removeFromNR(w.char);
  } else {
    if(!missedWords.find(m=>m.char===w.char)){
      streak=0;
      missedWords.push(w);addToNR(w);
      playWrong();
    }
  }
  idx++;renderQuestion();
}

// ════════════════════════════════════════
// NATIVE FLASHCARD — with voice recognition
// ════════════════════════════════════════
let voiceRecognition = null;
let lastHeard = '';

function renderNativeFlashcard(){
  const w=deck[idx];
  addToAllReviewed(w,isDrillSession?'drill':'flashcard');
  const hasVoice = !!( window.SpeechRecognition || window.webkitSpeechRecognition );
  document.getElementById('game-area').innerHTML=`
    <div class="native-card">
      <div class="native-prompt-label">What is the pinyin for…</div>
      <div class="native-char-big">${w.char}</div>
      ${hasVoice ? `
        <button class="mic-btn" id="mic-btn" onclick="startVoice()">
          <span class="mic-icon">🎙️</span> Say the pinyin
        </button>
        <div class="voice-result" id="voice-result">Press the mic and speak</div>
      ` : ''}
    </div>
    <div id="native-reveal" style="display:none">
      <div class="native-reveal-card native-reveal-wrong">
        ${isNoPinyinLevel() ? `
          <div style="font-size:13px;color:var(--red);font-weight:500;margin-bottom:4px;">读错了，听一听正确的读法：</div>
          <div style="font-size:11px;color:var(--red);opacity:0.75;margin-bottom:12px;">Not quite! Listen to the correct pronunciation:</div>
          <div class="native-reveal-char" style="font-size:72px;">${w.char}</div>
          <button class="listen-play-btn" id="reveal-listen-btn" onclick="speakChinese('${w.char}')" style="margin:14px auto 0;display:inline-flex;">
            <span>🔊</span> 再听一遍 · Listen again
          </button>
        ` : `
          <div class="native-reveal-pinyin-wrong">${w.pinyin}</div>
          <div class="native-reveal-char">${w.char}</div>
          <div class="native-reveal-example">${w.example}</div>
        `}
      </div>
      <button class="btn-reveal-next" onclick="fcRevealNext()">好的，下一个 · Got it, next →</button>
    </div>
    <button class="btn-reveal" id="btn-reveal" onclick="revealNativeFC()">我不会，听答案 · I don't know, play answer</button>`;
}

function revealNativeFC(){
  stopVoice();
  if(!answered){
    const w=deck[idx];
    if(!missedWords.find(m=>m.char===w.char)){ missedWords.push(w); addToNR(w); }
    streak=0;
    playWrong();
  }
  answered=true;
  document.getElementById('native-reveal').style.display='block';
  document.getElementById('btn-reveal').style.display='none';
  // For no-pinyin levels, auto-play the correct pronunciation
  if(isNoPinyinLevel()){
    setTimeout(()=>speakChinese(deck[idx].char), 600);
  }
}

function fcRevealNext(){
  idx++; renderQuestion();
}

function startVoice(){
  if(answered) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) return;
  getAudioCtx();

  stopVoice();

  const btn = document.getElementById('mic-btn');
  const res = document.getElementById('voice-result');

  // Clear stale state from previous attempt
  lastHeard = '';
  if(res){ res.textContent='Listening…'; res.className='voice-result'; }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = 'zh-CN';
  voiceRecognition.interimResults = true;   // catch partial results too
  voiceRecognition.maxAlternatives = 8;
  voiceRecognition.continuous = false;

  if(btn){ btn.classList.add('listening'); btn.classList.remove('heard'); btn.innerHTML='<span class="mic-icon">🔴</span> Listening…'; btn.disabled=true; }
  if(res){ res.textContent='Listening…'; res.className='voice-result'; }

  const w = deck[idx];
  const stripTones = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const correctPinyin = stripTones(w.pinyin);
  const syllables = correctPinyin.split(' ');

  function checkMatch(transcript){
    const raw = transcript.trim();
    const alt = raw.toLowerCase();
    const altStripped = stripTones(alt);
    // 1. Exact pinyin match (tones stripped)
    if(altStripped === correctPinyin) return true;
    // 2. Character match (browser returns hanzi for single-char words)
    if(alt === w.char || alt.replace(/\s/g,'') === w.char) return true;
    // 3. Multi-syllable: all syllables present
    if(syllables.length > 1 && syllables.every(syl => altStripped.includes(syl))) return true;
    // 4. Single syllable: whole word match only
    if(syllables.length === 1 && altStripped.split(/\s+/).includes(correctPinyin)) return true;
    return false;
  }

  let allTranscripts = [];
  let errorType = '';

  voiceRecognition.onresult = (e) => {
    allTranscripts = [];
    for(let r = 0; r < e.results.length; r++){
      for(let i = 0; i < e.results[r].length; i++){
        allTranscripts.push(e.results[r][i].transcript.trim());
      }
    }
    if(allTranscripts.length){
      lastHeard = allTranscripts[0];
      const res2 = document.getElementById('voice-result');
      if(res2){ res2.textContent = '👂 Hearing: "' + lastHeard + '"…'; res2.className='voice-result'; }
    }
  };

  voiceRecognition.onerror = (e) => {
    errorType = e.error;
    // Only handle non-recoverable errors (not no-speech — let onend handle that)
    if(e.error !== 'no-speech'){
      const btn2 = document.getElementById('mic-btn');
      const res2 = document.getElementById('voice-result');
      if(btn2){ btn2.classList.remove('listening'); btn2.innerHTML='<span class="mic-icon">🎙️</span> Try again'; btn2.disabled=false; }
      if(res2){ res2.textContent='Mic error: '+e.error; res2.className='voice-result no-match'; }
    }
  };

  voiceRecognition.onend = () => {
    // Skip if a non-recoverable error already showed a message
    if(errorType && errorType !== 'no-speech') return;
    // Small delay to let onresult finish populating allTranscripts
    setTimeout(() => {
      const btn2 = document.getElementById('mic-btn');
      const res2 = document.getElementById('voice-result');

      const transcriptsToCheck = allTranscripts.length ? allTranscripts : [];

      if(!transcriptsToCheck.length){
        // Chrome fires no-speech even when user clearly spoke and said it correctly.
        // If we got no transcript, give the benefit of the doubt — mark correct.
        if(btn2){ btn2.classList.remove('listening'); btn2.classList.add('heard'); btn2.innerHTML='<span class="mic-icon">🎙️</span> Say the pinyin'; btn2.disabled=false; }
        if(res2){ res2.textContent='✓ Sounds right — moving on!'; res2.className='voice-result match'; }
        playCorrect();
        stopVoice();
        answered = true;
        const reveal0 = document.getElementById('native-reveal');
        const revBtn0 = document.getElementById('btn-reveal');
        if(reveal0) reveal0.style.display='block';
        if(revBtn0) revBtn0.style.display='none';
        setTimeout(()=>{ score++; streak++; if(isDrillSession)removeFromNR(w.char); idx++; renderQuestion(); }, 1500);
        return;
      }

      let matched = false;
      for(const t of transcriptsToCheck){
        if(checkMatch(t)){ matched = true; break; }
      }
      lastHeard = transcriptsToCheck[0];

      if(btn2){ btn2.classList.remove('listening','heard'); btn2.disabled=false; }

      if(matched){
        if(btn2){ btn2.classList.add('heard'); btn2.innerHTML='<span class="mic-icon">🎙️</span> Say the pinyin'; }
        if(res2){ res2.textContent='✓ Heard: "'+lastHeard+'" — correct!'; res2.className='voice-result match'; }
        playCorrect();
        stopVoice();
        answered = true;
        // Hide "我不会" button — student got it right, no need to show it
        const revBtn = document.getElementById('btn-reveal');
        if(revBtn) revBtn.style.display='none';
        setTimeout(()=>{ score++; streak++; if(isDrillSession)removeFromNR(w.char); idx++; renderQuestion(); }, 1500);
      } else {
        if(btn2){ btn2.innerHTML='<span class="mic-icon">🎙️</span> Try again'; }
        if(res2){ res2.textContent='✗ Heard: "'+lastHeard+'" — try again or tap Reveal'; res2.className='voice-result no-match'; }
        playWrong();
        if(isNoPinyinLevel()) setTimeout(()=>speakChinese(deck[idx].char), 600);
      }
    }, 150);
  };

  voiceRecognition.start();
}

function stopVoice(){
  if(voiceRecognition){ try{ voiceRecognition.stop(); }catch(e){} voiceRecognition=null; }
}

// ════════════════════════════════════════
// LEARNER MULTIPLE CHOICE
// ════════════════════════════════════════
function renderMultiple(){
  const w=deck[idx];
  addToAllReviewed(w,'multiple');
  const distractors=shuffle(getActiveWords().filter(x=>x.char!==w.char)).slice(0,3);
  const opts=shuffle([w,...distractors]);
  document.getElementById('game-area').innerHTML=`
    <div class="mc-question">
      <div class="card-hint">what does this mean?</div>
      <div class="mc-char">${w.char}</div>
      <div class="mc-pinyin">${w.pinyin}</div>
    </div>
    <div class="mc-opts">
      ${opts.map((o,i)=>`<button class="mc-opt" id="opt-${i}" onclick="pickOpt(${i},${o.char===w.char})">${o.meaning}</button>`).join('')}
    </div>
    <div class="feedback-bar" id="feedback"></div>
    <button class="btn-next" id="btn-next" onclick="next()" disabled>Next →</button>`;
}

function pickOpt(i,correct){
  if(answered)return; answered=true;
  const w=deck[idx];
  const fb=document.getElementById('feedback');
  if(correct){
    document.getElementById('opt-'+i).classList.add('correct');
    score++;streak++;
    playCorrect();
    fb.textContent='✓ Correct!';fb.className='feedback-bar good';
  } else {
    document.getElementById('opt-'+i).classList.add('wrong');
    streak=0;
    missedWords.push(w);addToNR(w);
    playWrong();
    fb.textContent='✗ The answer was: '+w.meaning;fb.className='feedback-bar bad';
    document.querySelectorAll('.mc-opt').forEach(btn=>{if(btn.textContent.trim()===w.meaning)btn.classList.add('correct');});
  }
  document.querySelectorAll('.mc-opt').forEach(b=>b.disabled=true);
  document.getElementById('btn-next').disabled=false;
  updateScoreUI();
}

// ════════════════════════════════════════
// NATIVE MULTIPLE CHOICE
// Show English meaning → pick correct pinyin from 4 options
// ════════════════════════════════════════
function renderNativeMC(){
  const w=deck[idx];
  addToAllReviewed(w,'multiple');
  const distractors=shuffle(getActiveWords().filter(x=>x.char!==w.char)).slice(0,3);
  const opts=shuffle([w,...distractors]);
  document.getElementById('game-area').innerHTML=`
    <div class="native-mc-question">
      <div class="native-mc-prompt">Choose the correct pinyin for</div>
      <div class="native-mc-char-big">${w.char}</div>
    </div>
    <div class="native-mc-opts">
      ${opts.map((o,i)=>`<button class="native-mc-opt" id="nopt-${i}" onclick="pickNativeOpt(${i},${o.char===w.char})">${o.pinyin}</button>`).join('')}
    </div>
    <div class="feedback-bar" id="feedback"></div>
    <button class="btn-next" id="btn-next" onclick="next()" disabled>Next →</button>`;
}

function pickNativeOpt(i,correct){
  if(answered)return; answered=true;
  const w=deck[idx];
  const fb=document.getElementById('feedback');
  if(correct){
    document.getElementById('nopt-'+i).classList.add('correct');
    score++;streak++;
    playCorrect();
    fb.textContent='✓ Correct! '+w.pinyin;fb.className='feedback-bar good';
  } else {
    document.getElementById('nopt-'+i).classList.add('wrong');
    streak=0;
    missedWords.push(w);addToNR(w);
    playWrong();
    fb.textContent='✗ The correct pinyin is: '+w.pinyin;fb.className='feedback-bar bad';
    document.querySelectorAll('.native-mc-opt').forEach(btn=>{if(btn.textContent.trim()===w.pinyin)btn.classList.add('correct');});
  }
  document.querySelectorAll('.native-mc-opt').forEach(b=>b.disabled=true);
  document.getElementById('btn-next').disabled=false;
  updateScoreUI();
}

// ════════════════════════════════════════
// LEARNER TYPE IT
// ════════════════════════════════════════
function renderType(){
  const w=deck[idx];
  addToAllReviewed(w,'type');
  document.getElementById('game-area').innerHTML=`
    <div class="type-card">
      <div class="card-hint">type the english meaning</div>
      <div class="card-char">${w.char}</div>
      <div class="card-pinyin">${w.pinyin}</div>
    </div>
    <input class="type-input" id="type-in" placeholder="Type meaning in English…" onkeydown="if(event.key==='Enter')checkType()" autocomplete="off"/>
    <button class="btn-check" id="btn-check" onclick="checkType()">Check</button>
    <div class="feedback-bar" id="feedback"></div>
    <button class="btn-next" id="btn-next" onclick="next()" disabled>Next →</button>`;
  setTimeout(()=>{const el=document.getElementById('type-in');if(el)el.focus();},50);
}

function checkType(){
  if(answered)return;
  const val=(document.getElementById('type-in').value||'').trim().toLowerCase();
  if(!val)return;
  const w=deck[idx];
  const keywords=w.meaning.toLowerCase().split(/[\s\/\(\),]+/).filter(k=>k.length>2);
  const hit=keywords.some(k=>val.includes(k));
  answered=true;
  const inp=document.getElementById('type-in');
  const fb=document.getElementById('feedback');
  document.getElementById('btn-check').disabled=true;
  inp.disabled=true;
  if(hit){
    inp.classList.add('correct');score++;streak++;
    playCorrect();
    fb.textContent='✓ Correct! ('+w.meaning+')';fb.className='feedback-bar good';
  } else {
    inp.classList.add('wrong');streak=0;
    missedWords.push(w);addToNR(w);
    playWrong();
    fb.textContent='✗ Answer: '+w.meaning;fb.className='feedback-bar bad';
  }
  document.getElementById('btn-next').disabled=false;
  updateScoreUI();
}

// ════════════════════════════════════════
// NATIVE TYPE IT — text input + toned vowels
// ════════════════════════════════════════
function renderNativeType(){
  const w=deck[idx];
  addToAllReviewed(w,'type');
  pinyinTokens=[];
  document.getElementById('game-area').innerHTML=`
    <div class="native-type-prompt">
      <div class="native-type-label">Type the pinyin for</div>
      <div class="native-type-char-big">${w.char}</div>
    </div>
    <div class="pinyin-builder-wrap">
      <div class="pinyin-left">
        <input class="type-input" id="native-type-in" placeholder="Type pinyin here…"
          onkeydown="if(event.key==='Enter')checkNativeType()" autocomplete="off" spellcheck="false"/>
        <div class="feedback-bar" id="feedback"></div>
        <button class="btn-check" id="py-submit" onclick="checkNativeType()">Check ✓</button>
        <button class="btn-next" id="btn-next" onclick="next()" disabled style="margin-top:10px;">Next →</button>
      </div>
      <div class="pinyin-panel" id="pinyin-panel">
        <div class="pinyin-panel-section">
          <div class="pinyin-panel-label">Toned vowels — click to insert</div>
          <div class="pinyin-panel-row">${PY_TONES.map(s=>`<button class="py-btn tone" onclick="pyInsert('${s}')">${s}</button>`).join('')}</div>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{const el=document.getElementById('native-type-in');if(el)el.focus();},50);
}

function pyInsert(s){
  const inp=document.getElementById('native-type-in');
  if(!inp||answered)return;
  const start=inp.selectionStart;
  const end=inp.selectionEnd;
  const val=inp.value;
  inp.value=val.slice(0,start)+s+val.slice(end);
  inp.selectionStart=inp.selectionEnd=start+s.length;
  inp.focus();
}

function checkNativeType(){
  const inp=document.getElementById('native-type-in');
  if(answered||!inp||!inp.value.trim())return;
  answered=true;
  const w=deck[idx];
  const typed=inp.value.replace(/\s+/g,' ').trim().toLowerCase();
  const correct=w.pinyin.toLowerCase().trim();
  const stripTones=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const hit=(typed===correct)||(stripTones(typed)===stripTones(correct));
  const fb=document.getElementById('feedback');
  document.getElementById('py-submit').disabled=true;
  inp.disabled=true;
  if(hit){
    inp.classList.add('correct');score++;streak++;
    playCorrect();
    fb.textContent='✓ Correct! '+w.pinyin;fb.className='feedback-bar good';
  } else {
    inp.classList.add('wrong');streak=0;
    missedWords.push(w);addToNR(w);
    playWrong();
    fb.textContent='✗ Correct pinyin: '+w.pinyin;fb.className='feedback-bar bad';
  }
  document.getElementById('btn-next').disabled=false;
  updateScoreUI();
}

// ════════════════════════════════════════
// NEXT
// ════════════════════════════════════════

// Smart speak: use real audio if available, else TTS
function speakLesson(lessonId, text, onEnd){
  if(LESSON_AUDIO[lessonId]){
    playLessonAudio(lessonId, onEnd);
  } else {
    speakChinese(text, onEnd);
  }
}

function speakChinese(text, onEnd){
  // 先取消队列里残留的语音，否则连续点击/重复调用时新的 speak 会被忽略，
  // 表现为"点了没反应"。cancel 后再 speak 保证每次都能立即重新播放。
  try{ window.speechSynthesis.cancel(); }catch(e){}
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = 0.65;
  utt.pitch = 1.05;
  utt.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v=>v.lang==='zh-CN' && v.localService)
    || voices.find(v=>v.lang==='zh-CN' && v.name.includes('Tingting'))
    || voices.find(v=>v.lang==='zh-CN' && v.name.includes('Hanhan'))
    || voices.find(v=>v.lang==='zh-CN' && v.name.includes('Meijia'))
    || voices.find(v=>v.lang.startsWith('zh'));
  if(preferred) utt.voice = preferred;
  if(onEnd) utt.onend = onEnd;
  if(!voices.length){
    window.speechSynthesis.onvoiceschanged = ()=>{ window.speechSynthesis.speak(utt); };
  } else {
    window.speechSynthesis.speak(utt);
  }
}

// ── Lesson audio files (real human recordings) ──
// MP3 files must be in the SAME FOLDER as this HTML file
// 文件名不变，和HTML放在同一个文件夹

let currentAudio = null;

function stopLessonAudio(){
  if(currentAudio){ try{currentAudio.pause(); currentAudio.currentTime=0;}catch(e){} currentAudio=null; }
}
function stopCurrentAudio(){ stopLessonAudio(); }

function hasRealAudio(lessonId){
  return !!(LESSON_AUDIO[lessonId]);
}

// Play the full lesson recording — used by reading practice Listen button
function playLessonAudio(lessonId, onEnd){
  const file = LESSON_AUDIO[lessonId];
  if(!file) return false;
  stopCurrentAudio();
  window.speechSynthesis.cancel();
  const audio = new Audio(file);
  currentAudio = audio;
  audio.onended = ()=>{ currentAudio=null; if(onEnd) onEnd(); };
  audio.onerror = ()=>{ currentAudio=null; if(onEnd) onEnd(); };
  audio.play().catch(()=>{ currentAudio=null; if(onEnd) onEnd(); });
  return true;
}

// Play single character using real audio if lesson has recording,
// otherwise fall back to TTS
function speakChar(char, lessonId, onEnd){
  // For single chars we always use TTS — recordings are full-text only
  speakChinese(char, onEnd);
}

function isNoPinyinLevel(){
  const noPinyin = ['一年级 Level 1','一年级 Level 2','二年级 Level 1','H 识字阅读 Level 1','H 识字阅读 Level 2'];
  return selectedLesson && noPinyin.includes(selectedLesson.level);
}

// ════════════════════════════════════════
// LISTEN & PICK MODE
// ════════════════════════════════════════
function renderListen(){
  const w = deck[idx];
  addToAllReviewed(w, 'listen');
  const activeWords = getActiveWords();
  const distractors = shuffle(activeWords.filter(x => x.char !== w.char)).slice(0, 3);
  const opts = shuffle([w, ...distractors]);

  document.getElementById('game-area').innerHTML=`
    <div class="listen-card">
      <div class="listen-prompt">听一听，选出正确的字 · Listen and pick the correct character</div>
      <button class="listen-play-btn" id="listen-play-btn" onclick="playListenWord()">
        <span>🔊</span> 播放 · Play
      </button>
      <div class="listen-hint">点击播放按钮，然后选字 · Press play, then choose a character</div>
    </div>
    <div class="listen-opts">
      ${opts.map((o,i)=>`<button class="listen-opt" id="lopt-${i}" onclick="pickListenOpt(${i},${o.char===w.char})">${o.char}</button>`).join('')}
    </div>
    <div class="feedback-bar" id="feedback"></div>
    <button class="btn-next" id="btn-next" onclick="next()" disabled>Next →</button>`;

  // Auto-play on load
  setTimeout(()=>playListenWord(), 400);
}

function playListenWord(){
  if(answered) return;
  const btn = document.getElementById('listen-play-btn');
  if(btn){ btn.classList.add('playing'); btn.innerHTML='<span>🔊</span> 播放中… · Playing…'; btn.disabled=true; }
  speakChinese(deck[idx].char, ()=>{
    const b = document.getElementById('listen-play-btn');
    if(b){ b.classList.remove('playing'); b.innerHTML='<span>🔊</span> 再听一次 · Listen again'; b.disabled=false; }
  });
}

function pickListenOpt(i, correct){
  if(answered) return;
  answered = true;
  const w = deck[idx];
  const fb = document.getElementById('feedback');
  const playBtn = document.getElementById('listen-play-btn');

  if(correct){
    document.getElementById('lopt-'+i).classList.add('correct');
    score++; streak++;
    playCorrect();
    fb.textContent = '✓ 对了！ Correct!'; fb.className = 'feedback-bar good';
    // Replace play button with encouraging message
    if(playBtn){ playBtn.outerHTML=`<div style="text-align:center;font-size:22px;padding:12px;">🌟 很棒！Well done!</div>`; }
  } else {
    document.getElementById('lopt-'+i).classList.add('wrong');
    streak = 0;
    missedWords.push(w); addToNR(w);
    playWrong();
    fb.textContent = '✗ 正确答案是 · The answer is: ' + w.char; fb.className = 'feedback-bar bad';
    // Highlight correct answer
    document.querySelectorAll('.listen-opt').forEach(btn=>{
      if(btn.textContent.trim()===w.char) btn.classList.add('correct');
    });
    // Replace play button with replay button for the correct character
    if(playBtn){
      playBtn.disabled=false;
      playBtn.classList.remove('playing');
      playBtn.innerHTML='<span>🔊</span> 再听一次 · Listen again';
      playBtn.onclick=()=>{ try{window.speechSynthesis.cancel();}catch(e){} speakChinese(w.char); };
    }
    if(isNoPinyinLevel()) setTimeout(()=>speakChinese(w.char), 600);
  }
  document.querySelectorAll('.listen-opt').forEach(b=>b.disabled=true);
  document.getElementById('btn-next').disabled = false;
  updateScoreUI();
}

function next(){idx++;renderQuestion();}

// ════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════
function showResult(){
  const total=deck.length;
  const pct=Math.round((score/total)*100);
  if(selectedLesson) submitHWCompletion(selectedLesson.id, currentMode, pct);
  if(selectedLesson) submitHWCompletion(selectedLesson.id, currentMode, pct);
  const info=MODE_INFO[isDrillSession?'drill':currentMode];
  let emoji='📚',grade='Keep practicing',gradeClass='grade-c';
  if(pct===100){emoji='🏆';grade='Perfect!';gradeClass='grade-s';}
  else if(pct>=80){emoji='🌟';grade='Excellent!';gradeClass='grade-a';}
  else if(pct>=60){emoji='👍';grade='Good job!';gradeClass='grade-b';}

  document.getElementById('result-emoji').textContent=emoji;
  document.getElementById('result-mode-label').textContent=info.label+' · '+info.zh;
  document.getElementById('result-score-big').innerHTML=`<span>${score}</span> / ${total}`;
  document.getElementById('result-label').textContent=pct+'% correct';
  const g=document.getElementById('result-grade');
  g.textContent=grade;g.className='result-grade '+gradeClass;

  const ms=document.getElementById('missed-section');
  if(missedWords.length){
    ms.innerHTML=`
      <div class="section-label" style="margin-bottom:10px;">Missed — added to review list (${missedWords.length})</div>
      <div class="missed-list">
        ${missedWords.map(w=>`
          <div class="missed-item">
            <span class="missed-char">${w.char}</span>
            <span class="missed-pinyin">${w.pinyin}</span>
            <span class="missed-meaning">${w.meaning}</span>
          </div>`).join('')}
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--muted);">These are now in your <strong>Needs review</strong> list on the home screen.</p>`;
  } else {ms.innerHTML='';}

  // Award points: accuracy-based + session-count bonus
  const lessonId = selectedLesson ? selectedLesson.id : (isDrillSession ? 'drill' : null);
  const modeLabel = MODE_INFO[isDrillSession?'drill':currentMode]?.zh || currentMode;
  const result = recordLessonPlay(lessonId, modeLabel, pct);
  showPointsToast(result);

  showScreen('result');
}
// ════════════════════════════════════════
// AUTH SYSTEM
// ════════════════════════════════════════
let currentUser = null; // {name, classCode, bg}

function loadUsers(){ return JSON.parse(localStorage.getItem('czmd_users')||'{}'); }
function saveUsers(users){
  localStorage.setItem('czmd_users',JSON.stringify(users));
  syncUsersDirectory(users);
}
function userKey(name,cls){ return (name.trim()+':'+cls.trim()).toLowerCase(); }

function switchAuthTab(tab){
  ['student','teacher','admin'].forEach(t=>{
    const card = document.getElementById('card-'+t);
    if(card) card.classList.toggle('active', t===tab||(t==='student'&&tab==='login'));
  });
  document.getElementById('auth-login-form').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = tab==='register' ? 'block' : 'none';
  document.getElementById('auth-teacher-form').style.display  = tab==='teacher'  ? 'block' : 'none';
  document.getElementById('auth-admin-form').style.display    = tab==='admin'    ? 'block' : 'none';
}

function doRegister(){
  const username = document.getElementById('reg-name').value.trim().toUpperCase().replace(/\s+/g,'');
  const chname   = document.getElementById('reg-chname').value.trim();
  const cls      = document.getElementById('reg-class').value.trim().toUpperCase();
  const err      = document.getElementById('reg-err');
  if(!username){ err.textContent='请输入英文用户名 · Please enter a username.'; return; }
  if(!/^[A-Z0-9_]+$/.test(username)){ err.textContent='用户名只能含英文字母和数字 · Letters and numbers only.'; return; }
  if(!cls){ err.textContent='Please enter a class code.'; return; }
  const users = loadUsers();
  const key = userKey(username, cls);
  if(users[key]){ err.textContent='Account already exists. Please log in.'; return; }
  users[key] = { username, name: chname||username, classCode: cls, classes:[cls], bg: null };
  saveUsers(users);
  err.textContent='';
  loginUser(users[key]);
}

async function doLogin(){
  const raw  = document.getElementById('login-name').value.trim().toUpperCase().replace(/\s+/g,'');
  const pwd  = document.getElementById('login-pwd').value;
  const err  = document.getElementById('login-err');
  if(!raw){ err.textContent='Please enter your username.'; return; }
  if(!pwd){ err.textContent='Please enter your password.'; return; }

  // ☁️ 优先走云端登录（用户名即唯一账号；班级从云端资料读取，无需学生输入）
  if(window.firebaseReady && window.cloudAuth){
    err.textContent = '☁️ 云端登录中... · Connecting to cloud...';
    try {
      const result = await window.cloudAuth.loginStudent(raw, pwd);
      if(result.ok){
        err.textContent = '';
        const profileClasses = result.profile.classes
          || (result.profile.classCode ? [result.profile.classCode] : []);
        const user = {
          username: result.profile.username || raw,
          name: result.profile.name || result.profile.username || raw,
          chname: result.profile.chname || '',
          classCode: result.profile.classCode || profileClasses[0] || '',
          classes: profileClasses,
          bg: result.profile.bg || null,
          _cloudUid: result.uid,
          _fromCloud: true
        };
        setCloudSessionStatus(true);
        loginUser(user);
        // 也同步到 localStorage（双轨保险）
        try {
          const users = loadUsers();
          users[userKey(raw, user.classCode)] = user;
          saveUsers(users);
        } catch(e){}
        return;
      } else {
        // 云端登录失败，可能是：用户不存在、密码错、网络问题
        // 不立刻报错——尝试本地登录作为兜底
        console.log('☁️ 云端登录失败:', result.error, '尝试本地登录...');
      }
    } catch(e) {
      console.log('☁️ 云端登录异常:', e.message);
    }
  }

  // ─── 兜底：本地登录（兼容尚未上云的账号），按用户名匹配 ───
  const users = loadUsers();
  const match = Object.values(users).find(u=>(u.username||u.name||'').toUpperCase()===raw);
  if(match){
    err.textContent = '';
    setCloudSessionStatus(false, '你');
    loginUser(match);
    return;
  }
  err.textContent = '账号或密码错误 · Wrong username or password. 初始密码是 YUCAICHINESE';
}

function loginUser(user){
  currentUser = user;
  localStorage.setItem('czmd_current_user', JSON.stringify(user));
  addRecentAccount(user); // save to recent list
  syncCurrentStudentProfile();
  loadUserPointsFromCloud();
  loadStudentCloudCaches().then(()=>{
    if(typeof renderHome === 'function' && document.getElementById('screen-home')?.classList.contains('active')) renderHome();
    if(typeof renderWrongChars === 'function' && document.getElementById('screen-wrong-chars')?.classList.contains('active')) renderWrongChars();
    if(typeof renderLevelMap === 'function' && document.getElementById('screen-levelmap')?.classList.contains('active')) renderLevelMap();
  });
  // Shared cache holds assigned homework + 识字测验; when it finishes loading,
  // re-render so the red-dot badges (incl. the 识字测验 dot) reflect new assignments.
  loadSharedCloudCaches().then(()=>{
    if(typeof renderLevelMap === 'function' && document.getElementById('screen-levelmap')?.classList.contains('active')) renderLevelMap();
    if(typeof renderStudentHW === 'function' && document.getElementById('screen-student-hw')?.classList.contains('active')) renderStudentHW();
  });
  if(!user.bg){
    showScreen('background');
  } else {
    userLang = user.bg;
    afterLogin();
  }
}

function setBg(bg){
  if(!currentUser) return;
  currentUser.bg = bg;
  userLang = bg;
  const users = loadUsers();
  const key = userKey(currentUser.name, currentUser.classCode);
  if(users[key]) users[key].bg = bg;
  saveUsers(users);
  localStorage.setItem('czmd_current_user', JSON.stringify(currentUser));
  syncCurrentStudentProfile();
  afterLogin();
}

function afterLogin(){
  // Warmup mic permission silently in background (one-time, no popup on mobile)
  // recWarmUp removed — mic permission requested only when student actually starts recording
  if(userLang === 'native'){
    showScreen('levelmap');
    renderLevelMap();
  } else {
    showScreen('home');
    renderHome();
  }
  maybeShowExamDueReminder();   // ★ 识字测验到期提醒（每天最多一次）
}

// ── 识字测验到期提醒 · 登录时检查，每个学生每天最多弹一次 ──
// 条件：是识字测验作业 + 该学生没做完(attempts===0) + 截止日在未来 0~3 天内且未过期。
// 每日限频键: czmd_exam_due_reminder_<userKey> = 'YYYY-MM-DD'（仅本地，不写云端）
function maybeShowExamDueReminder(){
  if(!currentUser) return;
  const u = userKey(currentUser.name||currentUser.username, currentUser.classCode);
  const stampKey = 'czmd_exam_due_reminder_'+u;
  const today = new Date().toLocaleDateString('zh-CN');
  if(localStorage.getItem(stampKey) === today) return;   // 今天已经弹过

  let list;
  try{ list = getAssignedHW(); }catch(e){ return; }
  if(!Array.isArray(list)) return;
  const classes = (currentUser.classes && currentUser.classes.length) ? currentUser.classes : [currentUser.classCode];
  const MS_DAY = 86400000;
  const now = new Date();
  const td = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = [];
  list.forEach(a => {
    if(!a.lessonId || a.lessonId.indexOf('__exam__:') !== 0) return;   // (a) 是识字测验
    if(!classes.includes(a.classCode)) return;
    if(!a.dueDate) return;                                             // 没有截止日 → 不算"快到期"
    if(typeof isHWExpired === 'function' && isHWExpired(a)) return;    // (c) 已过期不提醒
    const packKey = a.lessonId.replace('__exam__:','');
    const pack = (typeof getExamPack === 'function') ? getExamPack(packKey) : null;
    if(!pack || !pack.chars || !pack.chars.length) return;            // 空字库不提醒
    // (b) 没做完：复用 attempts 完成判据（完成一次即 attempts>=1）
    if(typeof getExamAttempts === 'function' && getExamAttempts(packKey, a.classCode) >= 1) return;
    // (c) 还剩几天（按日历日，截止当天=0）
    const dueD = new Date(a.dueDate);
    const dd = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate());
    const daysLeft = Math.round((dd - td) / MS_DAY);
    if(daysLeft < 0 || daysLeft > 3) return;
    due.push({ packKey: packKey, classCode: a.classCode, title: pack.title, daysLeft: daysLeft });
  });

  if(!due.length) return;
  showExamDueReminder(due);
  localStorage.setItem(stampKey, today);   // 真正弹出后才记当天，没东西可弹时不占名额
}

// 到期提醒弹窗（复用 showAssignSuccess 的居中模态 + 配色，可关闭 + 「去做」直达测验）
function showExamDueReminder(due){
  const old = document.getElementById('exam-due-reminder-overlay');
  if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'exam-due-reminder-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease;';
  const items = due.map(d => {
    const when = d.daysLeft <= 0 ? '今天截止' : ('还剩 '+d.daysLeft+' 天');
    return '<div style="background:var(--paper2);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;">'
      + '<div style="flex:1;min-width:0;">'
      + '  <div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:3px;">📋 '+d.title+'</div>'
      + '  <div style="font-size:12px;color:var(--muted);">班级 '+d.classCode+' · <span style="color:var(--gold);font-weight:600;">⏰ '+when+'</span></div>'
      + '</div>'
      + '<button onclick="document.getElementById(\'exam-due-reminder-overlay\').remove(); startExamQuiz(\''+d.packKey+'\',\''+d.classCode+'\')" style="flex-shrink:0;padding:10px 18px;border-radius:12px;border:none;background:var(--blue);color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">去做 →</button>'
      + '</div>';
  }).join('');
  ov.innerHTML =
    '<div style="background:white;border-radius:24px;padding:30px 26px;max-width:480px;width:100%;box-shadow:0 12px 48px rgba(0,0,0,0.25);text-align:center;">'
    + '  <div style="font-size:60px;line-height:1;margin-bottom:8px;">⏰</div>'
    + '  <div style="font-size:21px;font-weight:700;color:var(--blue);margin-bottom:4px;">'
    +      (due.length > 1 ? ('你有 '+due.length+' 个识字测验快到期啦') : '有 1 个识字测验快到期啦')
    + '  </div>'
    + '  <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">趁现在做完，给自己加油 💪 · Almost due — you got this!</div>'
    + '  <div>'+items+'</div>'
    + '  <button onclick="document.getElementById(\'exam-due-reminder-overlay\').remove()" style="margin-top:12px;padding:12px 32px;border-radius:14px;border:1px solid var(--border);background:white;color:var(--muted);font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">知道了</button>'
    + '</div>';
  document.body.appendChild(ov);
}

function doLogout(){
  currentUser = null;
  localStorage.removeItem('czmd_current_user');
  showScreen('auth');
}

function renderUserBar(containerId){
  const el = document.getElementById(containerId);
  if(!el || !currentUser) return;
  const displayName = currentUser.name && currentUser.name !== currentUser.username ? currentUser.name : '';
  const username = currentUser.username || currentUser.name;
  el.innerHTML=`
    <div class="user-bar-info" style="cursor:pointer;" onclick="openStudentProfile()">
      <span class="user-bar-name">${username}</span>
      ${displayName?`<span style="font-size:13px;color:var(--muted);margin-left:6px;">· ${displayName}</span>`:''}
      <span class="user-bar-class"> · ${currentUser.classCode}</span>
    </div>
    <div class="user-bar-actions">
      <button class="user-bar-btn" onclick="openStudentProfile()">✏️ 个人资料 · Profile</button>
      <button class="user-bar-btn" onclick="doLogout()">Log out</button>
    </div>`;
}

// ════════════════════════════════════════
// LEVEL MAP
// ════════════════════════════════════════
const LEVEL_COLORS = {
  '一年级 Level 1':'#e67e22',
  '一年级 Level 2':'#d35400',
  '二年级 Level 1':'#27ae60',
  '二年级 Level 2':'#1e8449',
  '三年级 Level 1':'#2980b9',
  '三年级 Level 2':'#1a5276',
  '四年级 Level 1':'#8e44ad',
  '四年级 Level 2':'#6c3483',
  '五年级 Level 1':'#c0392b',
  '五年级 Level 2':'#922b21',
};

// ════════════════════════════════════════
// UNIT REVIEW DATA
// ════════════════════════════════════════
const UNIT_REVIEWS = {
  '一年级 Level 1': [
    {
      unit: '第一单元',
      chars: [
        {char:'天',pinyin:'tiān'},{char:'地',pinyin:'dì'},{char:'人',pinyin:'rén'},
        {char:'你',pinyin:'nǐ'},{char:'我',pinyin:'wǒ'},{char:'他',pinyin:'tā'},
        {char:'一',pinyin:'yī'},{char:'二',pinyin:'èr'},{char:'三',pinyin:'sān'},
        {char:'四',pinyin:'sì'},{char:'五',pinyin:'wǔ'},{char:'上',pinyin:'shàng'},
        {char:'下',pinyin:'xià'},{char:'口',pinyin:'kǒu'},{char:'耳',pinyin:'ěr'},
        {char:'目',pinyin:'mù'},{char:'手',pinyin:'shǒu'},{char:'足',pinyin:'zú'},
        {char:'站',pinyin:'zhàn'},{char:'坐',pinyin:'zuò'},
      ]
    },
    {
      unit: '第二单元',
      chars: [
        {char:'爸',pinyin:'bà'},{char:'妈',pinyin:'mā'},{char:'本',pinyin:'běn'},
        {char:'学',pinyin:'xué'},{char:'校',pinyin:'xiào'},{char:'班',pinyin:'bān'},
        {char:'级',pinyin:'jí'},{char:'大',pinyin:'dà'},{char:'马',pinyin:'mǎ'},
        {char:'路',pinyin:'lù'},{char:'土',pinyin:'tǔ'},{char:'姓',pinyin:'xìng'},
        {char:'名',pinyin:'míng'},{char:'王',pinyin:'wáng'},
      ]
    },
    {
      unit: '第三单元',
      chars: [
        {char:'哥',pinyin:'gē'},{char:'大',pinyin:'dà'},{char:'花',pinyin:'huā'},
        {char:'木',pinyin:'mù'},{char:'子',pinyin:'zǐ'},{char:'己',pinyin:'jǐ'},
        {char:'江',pinyin:'jiāng'},{char:'星',pinyin:'xīng'},{char:'气',pinyin:'qì'},
        {char:'雨',pinyin:'yǔ'},{char:'文',pinyin:'wén'},{char:'书',pinyin:'shū'},
        {char:'写',pinyin:'xiě'},{char:'会',pinyin:'huì'},{char:'卓',pinyin:'zhuō'},
        {char:'志',pinyin:'zhì'},{char:'读',pinyin:'dú'},{char:'呀',pinyin:'ya'},
        {char:'无',pinyin:'wú'},{char:'树',pinyin:'shù'},
      ]
    },
  ],
};

function renderLevelMap(){
  renderUserBar('levelmap-user-bar');

  // 1. 课后作业 计数（不含识字测验）
  const myHW = currentUser ? getAssignedHW().filter(a=>
    a.classCode===currentUser.classCode &&
    !isHWExpired(a) &&
    !(a.lessonId && a.lessonId.indexOf('__exam__:')===0)
  ) : [];

  // 2. 识字测验 计数（仅未做满 2 次 + 未过期）
  let myExams = [];
  if(currentUser){
    const classes = currentUser.classes && currentUser.classes.length
      ? currentUser.classes : [currentUser.classCode];
    myExams = getAssignedHW().filter(a =>
      a.lessonId && a.lessonId.indexOf('__exam__:')===0 &&
      classes.includes(a.classCode) &&
      !isHWExpired(a)
    );
    // 过滤已做满 2 次的
    if(typeof getExamAttempts === 'function' && typeof EXAM_MAX_ATTEMPTS !== 'undefined'){
      myExams = myExams.filter(a => {
        const packKey = a.lessonId.replace('__exam__:','');
        return getExamAttempts(packKey, a.classCode) < EXAM_MAX_ATTEMPTS;
      });
    }
  }

  const totalPending = myHW.length + myExams.length;

  // 3. 顶部任务提示行（有任何未完成任务就显示）
  const alertEl = document.getElementById('student-task-alert');
  if(alertEl){
    if(totalPending > 0){
      // 中文 + 英文双语
      const parts = [];
      if(myHW.length > 0) parts.push(myHW.length+' 项课后作业');
      if(myExams.length > 0) parts.push(myExams.length+' 项识字测验');
      const cnText = parts.join(' · ');
      const enParts = [];
      if(myHW.length > 0) enParts.push(myHW.length+' homework');
      if(myExams.length > 0) enParts.push(myExams.length+' character quiz'+(myExams.length>1?'es':''));
      const enText = enParts.join(' · ');
      alertEl.style.display = 'block';
      alertEl.className = 'task-alert-bar';
      alertEl.innerHTML =
        '<span class="ta-dot"></span>'
        + '<span class="ta-text-cn">📢 你有 '+cnText+' 待完成！</span>'
        + '<span class="ta-text-en">'+enText+' waiting!</span>';
    } else {
      alertEl.style.display = 'none';
    }
  }

  // 4. 课后作业 卡片
  const box = document.getElementById('hw-student-box');
  if(box){
    if(myHW.length>0){
      box.classList.add('has-hw');
      const dotBadge = document.getElementById('hw-dot-badge');
      if(dotBadge) dotBadge.style.display = 'block';
    } else {
      box.classList.remove('has-hw');
      const dotBadge = document.getElementById('hw-dot-badge');
      if(dotBadge) dotBadge.style.display = 'none';
    }
  }

  // 5. 识字测试 卡片（有识字测验任务时显示红点）
  const ctBox = document.getElementById('ct-student-box');
  if(ctBox){
    if(myExams.length>0){
      ctBox.classList.add('has-hw');
      const dotBadge = document.getElementById('ct-dot-badge');
      if(dotBadge) dotBadge.style.display = 'block';
    } else {
      ctBox.classList.remove('has-hw');
      const dotBadge = document.getElementById('ct-dot-badge');
      if(dotBadge) dotBadge.style.display = 'none';
    }
  }
}

function openMiniModule(type){
  showScreen('module-'+type);
  if(type==='writing') initWritingModule();
  if(type==='literacy'){
    // 看字选图卡片标签：动态显示题库总数 + 每轮题数（总数随 WORDPIC_BANK 自动更新）
    const el = document.getElementById('wordpic-stat-label');
    if(el && typeof WORDPIC_BANK !== 'undefined'){
      el.textContent = WORDPIC_BANK.length + '个词·每轮' + WP_ROUND_SIZE + '题 · '
                     + WORDPIC_BANK.length + ' words · ' + WP_ROUND_SIZE + ' per round';
    }
  }
}

// ════════════════════════════════════════
// 写字练习 · HANDWRITING PRACTICE（Hanzi Writer 笔顺动画版）
// ════════════════════════════════════════

// 笔顺动画用开源库 Hanzi Writer 动态渲染，无需为每个字准备图片，无水印、无版权问题。
// 字形数据做题时在线从 jsDelivr CDN 加载（学生本来就要联网上传做题数据，所以可用）。
// 如要添加新字，在 WRITING_CHARS 里加一行即可，strokes 填笔画数（仅用于显示和评分）。

// 笔顺动画用 Hanzi Writer（开源、免费、无水印）；字形数据在线从 jsDelivr CDN 加载
let wHanziDemo = null;

function wRenderHanziDemo(elId, char, size){
  const el = document.getElementById(elId);
  if(!el) return;
  // 兜底：库没加载到 / 该字无数据时，显示一个清晰的纯文字
  const fallback = function(){
    el.innerHTML = '<div style="font-family:\'Noto Serif SC\',serif;font-size:'+Math.round(size*0.62)+'px;color:var(--ink);display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;">'+char+'</div>';
  };
  if(typeof HanziWriter === 'undefined'){ fallback(); return; }
  el.innerHTML = '';
  try {
    wHanziDemo = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 8,
      showOutline: true,
      showCharacter: false,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 350,
      delayBetweenLoops: 1600,
      strokeColor: '#1a237e',
      outlineColor: '#d9e2ef',
      radicalColor: '#c0392b',
      onLoadCharDataError: fallback
    });
    wHanziDemo.loopCharacterAnimation();
  } catch(e){ fallback(); }
}

function wReplayHanziDemo(){
  if(wHanziDemo && wHanziDemo.animateCharacter) wHanziDemo.animateCharacter();
}

let wCurrentIdx=0, wCanvas=null, wCtx=null;
let wDrawing=false, wUserPath=[], wPracticeCount=0;

function initWritingModule(){ wCurrentIdx=0; renderWritingHome(); }

function renderWritingHome(){
  document.getElementById('writing-content').innerHTML=`
    <div style="font-size:13px;color:var(--muted);margin-bottom:14px;text-align:center;">选择一个字开始练习 · Pick a character to practice</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px;">
      ${WRITING_CHARS.map((w,i)=>`
        <div onclick="startWritingChar(${i})"
          style="background:white;border:2px solid var(--border);border-radius:14px;padding:14px 6px;text-align:center;cursor:pointer;transition:all 0.15s;"
          onmouseover="this.style.borderColor='var(--gold)';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
          <div style="font-family:'Noto Serif SC',serif;font-size:32px;color:var(--ink);">${w.char}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${w.pinyin}</div>
          <div style="font-size:10px;color:var(--blue);margin-top:2px;">${w.strokes}笔</div>
        </div>`).join('')}
    </div>
    <div style="background:var(--gold-light);border:1px solid var(--gold);border-radius:var(--radius);padding:12px 16px;font-size:12px;color:#5d4037;line-height:1.9;">
      <strong>练习方法 · How to practice</strong><br>
      1️⃣ 左边看笔顺动画，记住每一笔的方向 · Watch the stroke-order animation<br>
      2️⃣ 在右边按笔顺一笔一笔地写，写对才能进入下一笔 · Trace each stroke in order<br>
      3️⃣ 把整个字写完算一遍，写满3遍得积分 · Finish the character 3 times to earn points!
    </div>`;
}

function startWritingChar(idx){
  wCurrentIdx=idx; wPracticeCount=0; wRoundScores=[]; wAllStrokes=[]; renderWritingPractice();
}

function renderWritingPractice(){
  const ch=WRITING_CHARS[wCurrentIdx];
  const size=Math.min(window.innerWidth-56, 260);

  document.getElementById('writing-content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <button onclick="renderWritingHome()" style="background:var(--paper2);border:1px solid var(--border);border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">← 返回</button>
      <div style="text-align:center;">
        <span style="font-family:'Noto Serif SC',serif;font-size:28px;color:var(--ink);">${ch.char}</span>
        <span style="font-size:15px;color:var(--muted);margin-left:8px;">${ch.pinyin}</span>
      </div>
      <div style="font-size:12px;color:var(--blue);background:var(--blue-light);padding:4px 10px;border-radius:10px;">${ch.strokes}笔</div>
    </div>

    <!-- 练习进度（醒目）：3 遍点亮指示 + 双语回合 + 规则强调 -->
    <div style="background:var(--blue-light);border:1.5px solid #cce0f5;border-radius:14px;padding:12px 14px;margin-bottom:14px;text-align:center;">
      <div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-bottom:8px;" id="w-practice-dots">
        ${[0,1,2].map(i=>`<div id="w-dot-${i}" style="width:20px;height:20px;border-radius:50%;transition:all 0.2s;background:${i<wPracticeCount?'var(--green)':'#cdd8e8'};border:2px solid ${i<wPracticeCount?'var(--green)':'#b6c6df'};box-shadow:${i<wPracticeCount?'0 2px 6px rgba(45,106,79,0.35)':'none'};"></div>`).join('')}
      </div>
      <div id="w-round-label" style="font-size:15px;font-weight:700;color:var(--blue);">第 ${Math.min(wPracticeCount+1,3)} 遍 / 共 3 遍 · Round ${Math.min(wPracticeCount+1,3)} of 3</div>
      <div style="font-size:11px;color:var(--ink);margin-top:4px;line-height:1.4;"><strong style="color:var(--red);">同一个字要写满 3 遍</strong>才能进入下一个字<br><span style="font-size:10px;color:var(--muted);">Write the character 3 times to move on</span></div>
    </div>

    <div style="display:flex;gap:14px;justify-content:center;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;">

      <!-- 左：笔顺动画（Hanzi Writer） -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);">笔顺示范 · Stroke Order</div>
        <div style="border:2.5px solid var(--red);border-radius:14px;overflow:hidden;background:#fff8f4;padding:4px;position:relative;">
          <div id="w-hanzi-demo" onclick="wReplayHanziDemo()" title="点击重播" style="width:${size}px;height:${size}px;background:#fff8f4;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;"></div>
          <div id="w-gif-badge" style="position:absolute;bottom:8px;right:8px;background:rgba(192,57,43,0.85);color:white;font-size:10px;padding:2px 7px;border-radius:8px;">笔顺动画</div>
        </div>
        <div style="font-size:11px;color:var(--muted);text-align:center;">看清楚每一笔再开始写（点动画可重播）<br>Study carefully before writing</div>
      </div>

      <!-- 右：跟着写（Hanzi Writer quiz，逐笔真判定） -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);">跟着写 · Practice</div>
        <div style="position:relative;border:2.5px solid var(--blue);border-radius:14px;overflow:hidden;background:white;" id="w-quiz-wrap">
          <!-- 田字格背景 SVG -->
          <svg style="position:absolute;top:0;left:0;pointer-events:none;z-index:1;" viewBox="0 0 100 100" width="${size}" height="${size}">
            <rect width="100" height="100" fill="white"/>
            <line x1="50" y1="2" x2="50" y2="98" stroke="#cce0f5" stroke-width="1" stroke-dasharray="4,3"/>
            <line x1="2" y1="50" x2="98" y2="50" stroke="#cce0f5" stroke-width="1" stroke-dasharray="4,3"/>
            <line x1="2" y1="2" x2="98" y2="98" stroke="#eee" stroke-width="0.6"/>
            <line x1="98" y1="2" x2="2" y2="98" stroke="#eee" stroke-width="0.6"/>
            <rect x="1" y="1" width="98" height="98" fill="none" stroke="#cce0f5" stroke-width="1.5"/>
          </svg>
          <!-- Hanzi Writer 测验区（逐笔判定笔顺/方向/形状） -->
          <div id="w-quiz" style="position:relative;z-index:2;width:${size}px;height:${size}px;"></div>
        </div>
        <div style="display:flex;gap:6px;width:${size}px;">
          <button onclick="wRestartQuiz()" style="flex:1;background:var(--paper2);color:var(--muted);border:1px solid var(--border);border-radius:10px;padding:8px 6px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">↺ 这一遍重写</button>
        </div>
      </div>
    </div>

    <div id="w-feedback" style="min-height:36px;text-align:center;"></div>
  `;

  // 左侧：循环播放笔顺动画
  wRenderHanziDemo('w-hanzi-demo', ch.char, size);
  // 右侧：逐笔测验（Hanzi Writer 真正判定笔顺/方向/字形对错）
  wInitQuiz(ch.char, size);
}

let wQuiz = null;       // Hanzi Writer 测验实例
let wQuizMistakes = 0;  // 当前这一遍写错的次数

function wInitQuiz(char, size){
  const el = document.getElementById('w-quiz');
  if(!el) return;
  if(typeof HanziWriter === 'undefined'){
    el.innerHTML = '<div style="padding:24px 12px;font-size:12px;color:var(--red);text-align:center;">笔顺库未加载，请检查网络后刷新页面</div>';
    return;
  }
  el.innerHTML = '';
  try {
    wQuiz = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 8,
      showCharacter: false,
      showOutline: true,
      drawingWidth: Math.max(18, Math.round(size*0.10)),
      strokeColor: '#1a237e',
      outlineColor: '#d9e2ef',
      drawingColor: '#1a237e',
      highlightColor: '#2d6a4f',
      onLoadCharDataError: function(){
        el.innerHTML = '<div style="padding:24px 12px;font-size:12px;color:var(--red);text-align:center;">这个字暂时没有笔顺数据</div>';
      }
    });
    wStartQuizRound(char);
  } catch(e){
    el.innerHTML = '<div style="padding:24px 12px;font-size:12px;color:var(--red);text-align:center;">加载失败，请刷新重试</div>';
  }
}

function wStartQuizRound(char){
  if(!wQuiz) return;
  wQuizMistakes = 0;
  const fb=document.getElementById('w-feedback');
  if(fb) fb.innerHTML='<div style="color:var(--muted);font-size:13px;">从第一笔开始，按笔顺写 · Trace stroke by stroke</div>';
  wQuiz.quiz({
    leniency: 1.3,
    showHintAfterMisses: 3,
    markStrokeCorrectAfterMisses: 5,
    onMistake: function(s){
      wQuizMistakes++;
      const fb=document.getElementById('w-feedback');
      if(fb) fb.innerHTML='<div style="color:var(--red);font-size:13px;font-weight:500;">✗ 这一笔不对，再试试（错3次会自动提示）· Try again</div>';
      if(typeof playWrong==='function') playWrong();
    },
    onCorrectStroke: function(s){
      const fb=document.getElementById('w-feedback');
      if(fb) fb.innerHTML='<div style="color:var(--green);font-size:13px;">✓ 对！还剩 '+s.strokesRemaining+' 笔 · '+s.strokesRemaining+' left</div>';
    },
    onComplete: function(summary){ wOnQuizComplete(summary); }
  });
}

function wRestartQuiz(){
  const ch = WRITING_CHARS[wCurrentIdx];
  if(ch) wStartQuizRound(ch.char);
}

function wOnQuizComplete(summary){
  const mistakes = summary ? (summary.totalMistakes||0) : 0;
  // 分数：一笔不错=100，每写错一笔扣12分，最低60
  const score = Math.max(60, 100 - mistakes*12);
  wRoundScores.push(score);
  wPracticeCount++;

  // 更新进度点
  for(let i=0;i<3;i++){
    const dot=document.getElementById('w-dot-'+i);
    if(dot) dot.style.background=i<wPracticeCount?'var(--green)':'var(--border)';
  }
  const labelEl=document.getElementById('w-round-label');
  if(labelEl){ const r=Math.min(wPracticeCount+1,3); labelEl.textContent='第 '+r+' 遍 / 共 3 遍 · Round '+r+' of 3'; }

  if(typeof playCorrect==='function') playCorrect();
  const fb=document.getElementById('w-feedback');

  if(wPracticeCount>=3){
    // 刚满 3 遍：明确祝贺 + 提示去下一字（保留原有进入下一字逻辑，稍延时让提示看清，不突然）
    if(fb) fb.innerHTML='<div style="color:var(--green);font-size:15px;font-weight:600;">🎉 太棒了！这个字写好啦，去下一个字 · Great! Next character!</div>';
    setTimeout(wShowComplete, 1100);
  } else {
    // 还没满 3 遍：告诉他这一遍记下了、还差几遍
    const remain = 3 - wPracticeCount;
    if(fb) fb.innerHTML='<div style="color:var(--green);font-size:15px;font-weight:600;">写得好！再写 '+remain+' 遍就过关啦 · '+remain+' more to go!</div>';
    const ch = WRITING_CHARS[wCurrentIdx];
    setTimeout(function(){ if(ch) wStartQuizRound(ch.char); }, 1200);
  }
}

function wGetPos(e){
  const r=wCanvas.getBoundingClientRect(),s=e.touches?e.touches[0]:e;
  return{x:(s.clientX-r.left),y:(s.clientY-r.top)};
}
let wAllStrokes = []; // all strokes: array of arrays of points
let wCurrentStroke = [];

function wStartDraw(e){
  e.preventDefault(); wDrawing=true;
  const p=wGetPos(e);
  wCtx.beginPath(); wCtx.moveTo(p.x,p.y);
  wCurrentStroke=[p];
}
function wDraw(e){
  e.preventDefault(); if(!wDrawing)return;
  const p=wGetPos(e);
  wCurrentStroke.push(p);
  wCtx.lineTo(p.x,p.y); wCtx.stroke();
  wCtx.beginPath(); wCtx.moveTo(p.x,p.y);
}
function wEndDraw(e){
  e.preventDefault(); wDrawing=false;
  if(wCurrentStroke.length>1) wAllStrokes.push(wCurrentStroke);
  wCurrentStroke=[];
}
function wClearCanvas(){
  if(wCtx)wCtx.clearRect(0,0,wCanvas.width,wCanvas.height);
  wUserPath=[]; wAllStrokes=[]; wCurrentStroke=[];
  const fb=document.getElementById('w-feedback'); if(fb)fb.innerHTML='';
}

// Score writing: strict checks based on stroke geometry
function wScoreWriting(){
  const ch = WRITING_CHARS[wCurrentIdx];
  const expectedStrokes = ch.strokes || 4;
  const size = wCanvas ? wCanvas.width : 260;
  const strokes = wAllStrokes;

  // Must have drawn at least 1 stroke
  if(!strokes.length) return 0;

  const strokeCount = strokes.length;

  // ── Check 1: stroke count must be within reasonable range ──
  // Allow 1 to (expectedStrokes + 2) strokes
  if(strokeCount > expectedStrokes + 2) return 0; // too many = scribbling

  // ── Check 2: each individual stroke must be a real stroke (not just a dot) ──
  // Min stroke length = 8% of canvas
  const minStrokeLen = size * 0.08;
  let shortStrokes = 0;
  let totalLength = 0;
  strokes.forEach(stroke => {
    let len = 0;
    for(let i=1;i<stroke.length;i++){
      const dx=stroke[i].x-stroke[i-1].x, dy=stroke[i].y-stroke[i-1].y;
      len += Math.sqrt(dx*dx+dy*dy);
    }
    if(len < minStrokeLen) shortStrokes++;
    totalLength += len;
  });
  // More than 1 stroke too short = dots/taps not real strokes
  if(shortStrokes > 1) return 0;

  // ── Check 3: total path length must be meaningful ──
  // Each stroke should average at least 15% of canvas width
  const minTotal = expectedStrokes * size * 0.15;
  if(totalLength < minTotal) return 0;

  // ── Check 4: bounding box must be large enough ──
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  strokes.forEach(stroke => stroke.forEach(p => {
    if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x;
    if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y;
  }));
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  // Must span at least 35% in BOTH dimensions
  if(bboxW < size*0.35 || bboxH < size*0.35) return 0;

  // ── Check 5: strokes must not all be in the same area ──
  // Each stroke should have a different average Y position (not stacked)
  if(strokeCount >= 2){
    const avgYs = strokes.map(stroke => {
      return stroke.reduce((s,p)=>s+p.y,0)/stroke.length;
    });
    // Check that strokes aren't all in exactly the same row (within 10% of canvas)
    const yRange = Math.max(...avgYs) - Math.min(...avgYs);
    // For chars with 3+ strokes, require vertical spread
    if(expectedStrokes >= 3 && strokeCount >= 2 && yRange < size * 0.10) return 0;
  }

  // All checks passed — score 60-100 based on quality
  const lenScore    = Math.min(100, Math.round(totalLength / (expectedStrokes * size * 0.25) * 70));
  const bboxScore   = Math.min(100, Math.round(((bboxW/size) + (bboxH/size)) / 2 * 100));
  return Math.max(60, Math.round(lenScore*0.5 + bboxScore*0.5));
}

let wRoundScores = []; // scores for each of 3 rounds

function wSubmitPractice(){
  if(!wCanvas) return;
  const imageData=wCtx.getImageData(0,0,wCanvas.width,wCanvas.height);
  const hasStrokes=imageData.data.some((v,i)=>i%4===3&&v>10);
  const fb=document.getElementById('w-feedback');

  if(!hasStrokes){
    fb.innerHTML='<div style="color:var(--red);font-size:13px;">还没写呢！请先在格子里写字</div>';
    return;
  }

  const score = wScoreWriting();
  const passed = score > 0; // 0 = failed geometric checks

  if(!passed){
    const ch2 = WRITING_CHARS[wCurrentIdx];
    const exp = ch2.strokes||4;
    const got = wAllStrokes.length;
    let hint = '';
    if(got > exp+2) hint = '笔画太多了（'+got+'笔），这个字只有'+exp+'笔 · Too many strokes';
    else if(got===0) hint = '请在格子里写字 · Please write the character';
    else hint = '请认真临摹，覆盖整个格子 · Write more carefully, fill the grid';
    fb.innerHTML='<div style="color:var(--red);font-size:13px;font-weight:500;">✗ '+hint+'</div>';
    playWrong();
    const wrap=document.getElementById('w-canvas-wrap');
    if(wrap){wrap.style.borderColor='var(--red)';setTimeout(()=>{if(wrap)wrap.style.borderColor='var(--blue)';},800);}
    return;
  }

  wRoundScores.push(score);
  wPracticeCount++;

  // Update progress dots
  for(let i=0;i<3;i++){
    const dot=document.getElementById('w-dot-'+i);
    if(dot) dot.style.background=i<wPracticeCount?'var(--green)':'var(--border)';
  }
  const labelEl=document.getElementById('w-round-label');
  if(labelEl){ const r=Math.min(wPracticeCount+1,3); labelEl.textContent='第 '+r+' 遍 / 共 3 遍 · Round '+r+' of 3'; }

  if(wPracticeCount>=3){
    fb.innerHTML='<div style="color:var(--green);font-size:15px;font-weight:600;">🎉 太棒了！这个字写好啦，去下一个字 · Great! Next character!</div>';
    setTimeout(wShowComplete,1100);
  } else {
    const remain = 3 - wPracticeCount;
    fb.innerHTML='<div style="color:var(--green);font-size:15px;font-weight:600;">写得好！再写 '+remain+' 遍就过关啦 · '+remain+' more to go!</div>';
    playCorrect();
    setTimeout(wClearCanvas,800);
  }
}

function wShowComplete(){
  const ch = WRITING_CHARS[wCurrentIdx];
  const pts = 5; // fixed 5 pts for completing 3 rounds
  const avgScore = wRoundScores.length ? Math.round(wRoundScores.reduce((a,b)=>a+b,0)/wRoundScores.length) : 0;
  const size = Math.min(window.innerWidth-56, 220);
  const emoji = avgScore>=70?'🌟':avgScore>=50?'⭐':'💪';
  const msg   = avgScore>=70?'写得很棒！':avgScore>=50?'继续加油！':'多多练习！';

  document.getElementById('writing-content').innerHTML =
    '<div style="text-align:center;padding:20px 0;">'
    + '<div style="font-size:56px;margin-bottom:8px;">'+emoji+'</div>'
    + '<div style="font-family:Noto Serif SC,serif;font-size:80px;color:var(--ink);line-height:1;margin-bottom:8px;">'+ch.char+'</div>'
    + '<div style="font-size:15px;color:var(--muted);margin-bottom:4px;">'+ch.pinyin+'</div>'
    + '<div style="font-size:20px;color:var(--green);margin-bottom:6px;">'+msg+'</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:20px;">完成3次练习！3 rounds done</div>'
    + '<div style="display:inline-block;border:2px solid var(--red);border-radius:14px;overflow:hidden;margin-bottom:20px;padding:4px;background:#fff8f4;">'
    + '<div id="w-hanzi-complete" style="width:'+size+'px;height:'+size+'px;"></div>'
    + '</div>'
    + '<div style="background:var(--gold-light);border:2px solid var(--gold);border-radius:20px;padding:16px;max-width:130px;margin:0 auto 24px;">'
    + '<div style="font-size:40px;font-weight:800;color:var(--gold);">+'+pts+'</div>'
    + '<div style="font-size:12px;color:var(--gold);">积分</div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'
    + '<button onclick="wRoundScores=[];startWritingChar('+wCurrentIdx+')" class="auth-btn" style="display:inline-block;width:auto;padding:10px 20px;">🔄 再练一次</button>'
    + (wCurrentIdx<WRITING_CHARS.length-1 ? '<button onclick="wRoundScores=[];startWritingChar('+(wCurrentIdx+1)+')" class="auth-btn" style="display:inline-block;width:auto;padding:10px 20px;background:var(--green);">下一个字 →</button>' : '')
    + '<button onclick="renderWritingHome()" class="auth-btn" style="display:inline-block;width:auto;padding:10px 20px;background:var(--paper2);color:var(--ink);">选其他字</button>'
    + '</div></div>';

  wRenderHanziDemo('w-hanzi-complete', ch.char, size);
  playCorrect();
  // Award 5 pts only for 3 completed rounds
  const result = recordLessonPlay(selectedLesson ? selectedLesson.id : 'writing', 'writing', avgScore);
  const data = getUserData();
  data.total = (data.total||0) + pts;
  if(!data.history) data.history = [];
  data.history.unshift({date:new Date().toLocaleDateString('zh-CN'), lesson:'写字练习', mode:'写字', count:1, pts:pts, reason:'完成3次写字练习 +'+pts+'分'});
  saveUserData(data);
}

// ════════════════════════════════════════
// 采蘑菇游戏
// ════════════════════════════════════════


// Ding sound using Web Audio API
function playDing(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type='sine'; osc.frequency.setValueAtTime(1047,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400,ctx.currentTime+0.1);
    gain.gain.setValueAtTime(0.5,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.6);
  }catch(e){}
}

let wbQuestions = [];
let wbIdx = 0;
let wbCorrect = 0;
let wbTimer = 60;
let wbTimerInterval = null;
let wbAnswered = false;

function startWordBuilder(){
  wbQuestions = shuffle([...WB_DATA]).slice(0, 10);
  wbIdx = 0;
  wbCorrect = 0;
  wbTimer = 60;
  wbAnswered = false;
  showScreen('wordbuilder');
  renderWBGame();
  clearInterval(wbTimerInterval);
  wbTimerInterval = setInterval(()=>{
    wbTimer--;
    const el = document.getElementById('wb-timer');
    if(el){
      el.textContent = wbTimer + 's';
      if(wbTimer<=10){ el.style.color='var(--red)'; el.style.fontWeight='800'; }
    }
    if(wbTimer<=0){ clearInterval(wbTimerInterval); wbShowResult(); }
  }, 1000);
}

function exitWordBuilder(){
  clearInterval(wbTimerInterval);
  showScreen('module-literacy');
}

function renderWBGame(){
  if(wbIdx >= wbQuestions.length){ clearInterval(wbTimerInterval); wbShowResult(); return; }
  const q = wbQuestions[wbIdx];
  const opts = shuffle([q.correct, ...q.wrongs]);
  const container = document.getElementById('wb-container');

  container.innerHTML = `
    <!-- Top bar: rules left, timer+progress right -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:10px;">

      <!-- Rules (always visible, top-left) -->
      <div style="background:#fff8e1;border:1.5px solid #ffcc02;border-radius:14px;padding:8px 12px;font-size:11px;color:#5d4037;line-height:1.7;max-width:180px;flex-shrink:0;">
        <div style="font-weight:700;margin-bottom:2px;font-size:12px;">🧩 游戏规则 · Rules</div>
        看字，选出能组成<strong>词语</strong>的选项<br>
        See the char — pick the word it makes!<br>
        ✅ 答对得分 · Correct = points<br>
        ⏱ 60秒 · 60 seconds<br>
        🏆 满分30分 · Max 30 pts
      </div>

      <!-- Timer + progress -->
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div style="background:#fff3e0;border:2px solid #ffb74d;border-radius:14px;padding:6px 16px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#e65100;min-width:40px;" id="wb-timer">${wbTimer}s</div>
        </div>
        <div style="font-size:11px;color:var(--muted);text-align:right;">${wbIdx+1} / 10 题</div>
        <div style="background:var(--paper2);border-radius:6px;height:6px;width:100px;overflow:hidden;">
          <div style="background:#ff8f00;height:100%;border-radius:6px;width:${(wbIdx/10)*100}%;transition:width 0.3s;"></div>
        </div>
      </div>
    </div>

    <!-- Character card (楷体, big square) -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-family:'KaiTi','楷体','STKaiti','Noto Serif SC',serif;
        font-size:96px;font-weight:700;color:var(--ink);
        width:150px;height:150px;display:inline-flex;align-items:center;justify-content:center;
        background:white;border:3px solid #ffb74d;border-radius:24px;
        box-shadow:0 6px 24px rgba(255,143,0,0.25);">${q.char}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:10px;">
        选出能和「${q.char}」组成词语的选项<br>
        <span style="font-size:11px;">Pick the word that includes「${q.char}」</span>
      </div>
    </div>

    <!-- 3 options -->
    <div style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin:0 auto;" id="wb-opts">
      ${opts.map((opt,i)=>`
        <button id="wb-opt-${i}" onclick="wbPick(${i},'${opt}','${q.correct}')"
          style="font-family:'Noto Serif SC',serif;font-size:30px;font-weight:700;letter-spacing:6px;
          background:white;border:2.5px solid #ffb74d;border-radius:18px;
          padding:18px 24px;cursor:pointer;color:var(--ink);
          transition:all 0.15s;box-shadow:0 2px 10px rgba(255,143,0,0.12);"
          onmouseover="if(!this.dataset.answered)this.style.background='#fff8e1'"
          onmouseout="if(!this.dataset.answered)this.style.background='white'">
          ${opt}
        </button>`).join('')}
    </div>
  `;
}

function wbPick(btnIdx, picked, correct){
  if(wbAnswered) return;
  wbAnswered = true;
  const isCorrect = picked === correct;

  // Disable all buttons
  for(let i=0;i<3;i++){
    const b=document.getElementById('wb-opt-'+i);
    if(b){b.dataset.answered='1';b.style.cursor='default';b.onmouseover=null;b.onmouseout=null;}
  }

  const btn = document.getElementById('wb-opt-'+btnIdx);
  if(isCorrect){
    btn.style.background='#c8e6c9'; btn.style.borderColor='#2e7d32'; btn.style.color='#1b5e20';
    btn.innerHTML += ' ✓';
    playDing();  // 丁的声音
    wbCorrect++;
  } else {
    btn.style.background='#ffebee'; btn.style.borderColor='#ef9a9a'; btn.style.color='#c62828';
    btn.innerHTML += ' ✗';
    playWrong();
    // Reveal correct
    document.querySelectorAll('[id^="wb-opt-"]').forEach(b=>{
      if(b.textContent.trim().replace(' ✗','')===correct){
        b.style.background='#e8f5e9'; b.style.borderColor='#81c784'; b.style.color='#2e7d32';
      }
    });
  }

  setTimeout(()=>{
    wbIdx++; wbAnswered=false; renderWBGame();
  }, isCorrect ? 600 : 1100);
}

function wbShowResult(){
  clearInterval(wbTimerInterval);
  // Scoring: max 30pts, scaled by accuracy
  // 100% = 30pts, 95% = 24pts, 85% = 15pts, 80% = 9pts, <80% = 3pts
  const pct = Math.round((wbCorrect/10)*100);
  let pts = 0;
  if(pct===100)     pts=30;
  else if(pct>=95)  pts=24;
  else if(pct>=85)  pts=15;
  else if(pct>=80)  pts=9;
  else if(pct>=60)  pts=3;
  else              pts=0;

  let grade='', gradeColor='', gradeEmoji='';
  if(wbCorrect===10){grade='太棒了！Perfect!';gradeColor='#2e7d32';gradeEmoji='🌟';}
  else if(wbCorrect>=9){grade='优秀！Excellent!';gradeColor='#2e7d32';gradeEmoji='⭐';}
  else if(wbCorrect>=8){grade='很好！Great!';gradeColor='#f57c00';gradeEmoji='👍';}
  else if(wbCorrect>=6){grade='不错！Good job!';gradeColor='#f57c00';gradeEmoji='🙂';}
  else{grade='继续加油！Keep going!';gradeColor='var(--red)';gradeEmoji='💪';}

  document.getElementById('wb-container').innerHTML=`
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:72px;margin-bottom:12px;">${gradeEmoji}</div>
      <div style="font-family:serif;font-size:24px;margin-bottom:8px;color:${gradeColor};">${grade}</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:24px;">答对 ${wbCorrect} / 10 题 · ${pct}% correct</div>

      <!-- Score display -->
      <div style="background:#fff8e1;border:2px solid #ffb74d;border-radius:20px;padding:20px;max-width:200px;margin:0 auto 24px;">
        <div style="font-size:52px;font-weight:800;color:#e65100;">${pts}</div>
        <div style="font-size:13px;color:#f57c00;">/ 30 满分 · Max points</div>
      </div>

      <!-- Scoring legend -->
      <div style="font-size:11px;color:var(--muted);margin-bottom:24px;line-height:2;">
        100% = 30分 · 95%+ = 24分 · 85%+ = 15分 · 80%+ = 9分
      </div>

      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="auth-btn" onclick="startWordBuilder()" style="display:inline-block;width:auto;padding:10px 24px;">🔄 再玩一次 · Play again</button>
        <button class="auth-btn" onclick="exitWordBuilder()" style="display:inline-block;width:auto;padding:10px 24px;background:var(--paper2);color:var(--ink);">← 返回</button>
      </div>
    </div>`;

  const result = recordLessonPlay(selectedLesson ? selectedLesson.id : 'wordbuilder', '拼字游戏', pct);
  showPointsToast(result);
}

// ════════════════════════════════════════
// 采蘑菇游戏 · MUSHROOM PICKING GAME
// ════════════════════════════════════════

const COMMON_CHARS_200 = [
  // Numbers & basic concepts (very easy)
  '一','二','三','四','五','六','七','八','九','十',
  '大','小','上','下','中','多','少','好','不','有',
  // Body & family (easy, concrete)
  '人','手','眼','耳','口','头','心','爸','妈','我',
  '你','他','她','们','爷','奶','哥','姐','弟','妹',
  // Animals (fun, visual)
  '猫','狗','鸟','鱼','牛','羊','马','鸡','兔','鹅',
  // Nature (simple)
  '山','水','火','土','木','日','月','云','风','雨',
  '花','草','树','天','地','星','石','田','叶','果',
  // Colors
  '红','黄','蓝','绿','白','黑',
  // Actions (high frequency)
  '吃','喝','走','跑','看','听','说','写','来','去',
  '玩','笑','哭','爱','飞','跳','唱','画','读','学',
  // Common adjectives
  '快','慢','长','短','高','胖','热','冷','甜','香',
  // Objects (familiar)
  '书','笔','车','门','灯','桌','床','包','球','伞',
];

let mgCurrentChars = [];
let mgTargetChar = '';
let mgTargetIdx = -1;
let mgScore = 0;
let mgRound = 0;
let mgBasket = [];
let mgBunnyPos = {x:0, y:0};
let mgAnimating = false;
let mgWrong = 0;   // 当前目标字已点错次数（每个新目标字归零；达 3 次揭晓答案）

function startMushroomGame(){
  mgScore = 0;
  mgRound = 0;
  mgBasket = [];
  mgAnimating = false;
  showScreen('mushroom');
  mgNewRound();
}

function exitMushroomGame(){
  window.speechSynthesis.cancel();
  showScreen('module-literacy');
}

function mgNewRound(){
  mgRound++;
  mgAnimating = false;
  mgWrong = 0;
  // Pick 12 random unique chars
  const pool = shuffle([...COMMON_CHARS_200]).slice(0, 12);
  mgTargetIdx = Math.floor(Math.random() * 12);
  mgTargetChar = pool[mgTargetIdx];
  mgCurrentChars = pool;
  renderMushroomGame();
  setTimeout(()=> speakMushroomTarget(), 600);
}

function speakMushroomTarget(){
  speakChinese(mgTargetChar);
}

function renderMushroomGame(){
  const container = document.getElementById('mushroom-game-container');
  container.innerHTML = `
    <style>
      #mg-bunny-el { position:absolute; font-size:44px; transition:left 0.5s cubic-bezier(.4,0,.2,1), top 0.5s cubic-bezier(.4,0,.2,1); z-index:10; pointer-events:none; transform-origin:center bottom; }
      @keyframes mg-bounce{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes mg-celebrate{ 0%{transform:scale(1) rotate(0deg)} 30%{transform:scale(1.4) rotate(-10deg)} 60%{transform:scale(1.3) rotate(10deg)} 100%{transform:scale(1) rotate(0deg)} }
      @keyframes mg-wrong{ 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      .mg-mushroom { background:white; border:3px solid #81c784; border-radius:20px; padding:16px 8px 12px; text-align:center; cursor:pointer; transition:transform 0.15s, border-color 0.15s, background 0.15s; position:relative; }
      .mg-mushroom:hover { transform:scale(1.05); border-color:#2e7d32; }
      .mg-mushroom .mg-char { font-family:'Noto Serif SC',serif; font-size:38px; font-weight:700; color:#1b5e20; line-height:1; }
      .mg-mushroom .mg-icon { font-size:32px; display:block; margin-bottom:6px; }
      .mg-replay { max-width:100%; }
      /* 窄屏：缩小双语 UI 文字，确保标题/分数/提示/按钮不溢出、不错位（不影响蘑菇格子题目汉字） */
      @media(max-width:560px){
        .mg-title { font-size:15px; }
        .mg-score { font-size:16px; }
        .mg-instr { font-size:11px; }
        .mg-replay { font-size:13px; padding:8px 16px; }
      }
    </style>

    <!-- Header bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div>
        <div class="mg-title" style="font-family:serif;font-size:18px;color:#2e7d32;">采蘑菇 · Pick Mushrooms 🍄</div>
        <div style="font-size:11px;color:var(--muted);">第 ${mgRound} 轮 · Round ${mgRound}</div>
      </div>
      <div style="background:#e8f5e9;border:2px solid #81c784;border-radius:16px;padding:6px 14px;text-align:center;">
        <div class="mg-score" style="font-size:20px;font-weight:700;color:#2e7d32;">${mgScore} 分 · pts</div>
      </div>
    </div>

    <!-- Bunny + instruction area -->
    <div style="background:linear-gradient(135deg,#f1f8e9,#dcedc8);border-radius:18px;padding:14px 16px;margin-bottom:14px;position:relative;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:14px;">
        <!-- Basket & bunny (positioned) -->
        <div id="mg-bunny-area" style="position:relative;width:64px;height:64px;flex-shrink:0;">
          <div style="font-size:48px;line-height:1;" id="mg-bunny-el">🐰</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div class="mg-instr" style="font-size:12px;color:#33691e;margin-bottom:8px;font-weight:500;">听到这个字，找到它！<br><span style="font-size:10px;color:#558b2f;font-weight:400;">Listen and find the character!</span></div>
          <button onclick="speakMushroomTarget()" class="mg-replay" style="background:#2e7d32;color:white;border:none;border-radius:20px;padding:9px 22px;font-size:15px;cursor:pointer;font-family:DM Sans,sans-serif;">🔊 再听一次 · Replay</button>
        </div>
        <div style="text-align:center;flex-shrink:0;">
          <div style="font-size:40px;">🧺</div>
          <div style="font-size:18px;min-width:36px;">${mgBasket.slice(-2).join('')}</div>
          <div style="font-size:10px;color:#388e3c;">${mgBasket.length} 个 · picked</div>
        </div>
      </div>
      <!-- 揭晓提示（点错 3 次后显示） -->
      <div id="mg-reveal-hint" style="display:none;text-align:center;margin-top:10px;font-size:13px;font-weight:600;color:#2e7d32;">这个字在这里哦！· Here it is! 🐰</div>
      <!-- 规则小字提示（中英双语，温和） -->
      <div class="mg-rule" style="text-align:center;margin-top:8px;font-size:10px;color:#7cb342;line-height:1.35;">试 3 次还没找到，就会告诉你答案哦<br><span style="opacity:0.85;">Try 3 times — if you can't find it, we'll show you the answer</span></div>
    </div>

    <!-- Mushroom grid: 4x3 -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;" id="mg-grid">
      ${mgCurrentChars.map((ch, idx)=>`
        <div class="mg-mushroom" id="mg-${idx}" onclick="mgPickMushroom(${idx})">
          <span class="mg-icon">🍄</span>
          <div class="mg-char">${ch}</div>
        </div>`).join('')}
    </div>

    <!-- Skip -->
    <div style="text-align:center;">
      <button onclick="mgSkip()" style="background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:20px;padding:6px 18px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">跳过 · Skip</button>
    </div>
  `;

  // Position bunny at basket (left side initially)
  mgMoveBunnyTo('home');
}

function mgGetCellPos(idx){
  const grid = document.getElementById('mg-grid');
  const cell = document.getElementById('mg-'+idx);
  const area = document.getElementById('mg-bunny-area');
  if(!grid||!cell||!area) return null;
  const gridR = grid.getBoundingClientRect();
  const cellR = cell.getBoundingClientRect();
  const areaR = area.getBoundingClientRect();
  // Position relative to mg-bunny-area's parent (the flex container)
  return {
    x: cellR.left - areaR.left + cellR.width/2 - 24,
    y: cellR.top - areaR.top + cellR.height/2 - 24,
  };
}

function mgMoveBunnyTo(target, idx){
  const bunny = document.getElementById('mg-bunny-el');
  if(!bunny) return;
  if(target==='home'){
    bunny.style.left='0px';
    bunny.style.top='0px';
    bunny.style.animation='mg-bounce 0.8s infinite';
    return;
  }
  const pos = mgGetCellPos(idx);
  if(!pos) return;
  bunny.style.animation='none';
  bunny.style.left = pos.x+'px';
  bunny.style.top = pos.y+'px';
}

function mgPickMushroom(idx){
  if(mgAnimating) return;
  const picked = mgCurrentChars[idx];
  const cell = document.getElementById('mg-'+idx);
  if(!cell) return;

  // Move bunny to this mushroom
  mgMoveBunnyTo('cell', idx);

  if(picked === mgTargetChar){
    mgAnimating = true;
    // Correct!
    cell.style.animation='mg-celebrate 0.5s ease';
    cell.style.background='#c8e6c9';
    cell.style.borderColor='#2e7d32';
    cell.innerHTML=`<div style="font-size:48px;padding:8px;">✅</div>`;
    playCorrect();
    mgScore += 10;
    mgBasket.push(picked);

    // Bunny celebrate
    const bunny = document.getElementById('mg-bunny-el');
    if(bunny){ bunny.style.animation='mg-celebrate 0.5s ease'; bunny.textContent='🐰'; }

    setTimeout(()=>{
      cell.style.opacity='0';
      cell.style.transform='scale(0) translateY(-30px)';
      setTimeout(()=>{
        mgMoveBunnyTo('home');
        mgNewRound();
      }, 400);
    }, 700);

  } else {
    // Wrong — 记错字本（复用现有 addWrongChar，去重由它内部处理；拼音用 krGetPinyin 安全取，取不到留空）
    if(typeof addWrongChar === 'function'){
      addWrongChar(picked, (typeof krGetPinyin==='function'?krGetPinyin(picked):''), '', '采蘑菇', '');
    }
    mgWrong++;
    cell.style.animation='mg-wrong 0.3s ease';
    playWrong();

    if(mgWrong >= 3){
      // 点错累计 3 次 → 揭晓答案（不加分！），高亮正确蘑菇并温和提示，短暂停留后进入下一字
      mgAnimating = true;
      // 把"没找到的目标字本身"也记入错字本（这才是学生真正不认识的字）
      if(typeof addWrongChar === 'function'){
        addWrongChar(mgTargetChar, (typeof krGetPinyin==='function'?krGetPinyin(mgTargetChar):''), '', '采蘑菇', '');
      }
      const target = document.getElementById('mg-'+mgTargetIdx);
      if(target){
        target.style.animation='mg-celebrate 0.5s ease';
        target.style.background='#c8e6c9';
        target.style.borderColor='#2e7d32';
        // 仅替换图标层，保留题目汉字不动
        const icon = target.querySelector('.mg-icon');
        if(icon) icon.textContent='👉';
      }
      const bunny = document.getElementById('mg-bunny-el');
      if(bunny){ bunny.textContent='🐰'; }
      mgMoveBunnyTo('cell', mgTargetIdx);
      const reveal = document.getElementById('mg-reveal-hint');
      if(reveal) reveal.style.display='block';
      setTimeout(()=>{
        mgMoveBunnyTo('home');
        mgNewRound();
      }, 1800);
    } else {
      setTimeout(()=>{
        cell.style.animation='';
        // Move bunny back and replay audio
        setTimeout(()=> speakMushroomTarget(), 200);
      }, 350);
    }
  }
}

function mgSkip(){
  window.speechSynthesis.cancel();
  mgAnimating = false;
  mgNewRound();
}

(function addMGStyles(){
  if(document.getElementById('mg-styles')) return;
  const s=document.createElement('style');
  s.id='mg-styles';
  s.textContent='@keyframes mg-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}';
  document.head.appendChild(s);
})();

// ════════════════════════════════════════
// 看字选图 · WORD TO PICTURE GAME
// ════════════════════════════════════════
// 题库 WORDPIC_BANK 在 data.js（{w, img}）。本版只用本局临时分，不接全局积分。
const WP_ROUND_SIZE = 10;   // 每局题数
const WP_MAX_WRONG  = 3;    // 单题最多点错几次（用尽则公布答案）

let wpQuestions = [];
let wpIdx = 0;
let wpScore = 0;
let wpWrong = 0;
let wpAnswered = false;
let wpCorrectIdx = -1;

// 看字选图 · 互斥组：同一组内的词不能互相作为对方的干扰项（图意太像 / 同图，易混淆）。
// 维护：以后要加新规则，往数组里再加一行 [...] 即可。
const WORDPIC_EXCLUSIVE_GROUPS = [
  ['夜晚','月亮'],                 // 都是夜/月，图意太像
  ['下','掉落'],                   // 共用同一张下箭头图
  ['上','下','左','右','掉落'],     // 方向箭头，互相易混
  ['笑','爸爸','妈妈','爷爷','奶奶'], // 笑脸表情 vs 带笑容的人脸（含爷爷奶奶），图意太像
];
// 两个词是否互斥（同处任一互斥组）
function wpExclusive(a, b){
  return WORDPIC_EXCLUSIVE_GROUPS.some(g => g.includes(a) && g.includes(b));
}

function startWordPicGame(){
  wpQuestions = shuffle([...WORDPIC_BANK]).slice(0, Math.min(WP_ROUND_SIZE, WORDPIC_BANK.length));
  wpIdx = 0;
  wpScore = 0;
  showScreen('wordpic');
  renderWordPicQuestion();
}

function exitWordPicGame(){
  showScreen('module-literacy');
}

// 图片加载失败时显示浅色占位，避免布局崩
function wpImgError(img){
  img.onerror = null;
  img.style.display = 'none';
  const ph = img.parentElement.querySelector('.wp-img-ph');
  if(ph) ph.style.display = 'flex';
}

function renderWordPicQuestion(){
  const q = wpQuestions[wpIdx];
  wpAnswered = false;
  wpWrong = 0;

  // 选项 = 1 正确 + 2 干扰，位置打乱
  // ★ 干扰项不仅要词不同，图也必须不同（有的词共用同一张图，如「下」和「掉落」都用下箭头），
  //   否则同一题会出现两张一样的图、无法作答。这里按 img 去重，保证三张图互不相同。
  const usedImgs = new Set([q.img]);
  const distractors = [];
  for(const cand of shuffle(WORDPIC_BANK.filter(x => x.w !== q.w))){
    if(usedImgs.has(cand.img)) continue;                              // 三张图必须互不相同
    if(wpExclusive(cand.w, q.w)) continue;                           // 不与正确答案同处互斥组
    if(distractors.some(d => wpExclusive(cand.w, d.w))) continue;    // 也不与已选干扰项互斥
    usedImgs.add(cand.img);
    distractors.push(cand);
    if(distractors.length === 2) break;
  }
  const options = shuffle([q, ...distractors]);
  wpCorrectIdx = options.findIndex(o => o.w === q.w);

  const container = document.getElementById('wordpic-container');
  container.innerHTML = `
    <style>
      /* 字号写在类里（非内联），窄屏 @media 才能覆盖，确保双语 UI 不溢出/错位 */
      .wp-title { font-family:serif; font-size:18px; color:var(--blue); }
      .wp-qnum  { font-size:11px; color:var(--muted); }
      .wp-score { font-size:20px; font-weight:700; color:var(--blue); }
      .wp-ask   { font-size:12px; color:#1976d2; margin-bottom:10px; font-weight:500; }
      .wp-ask-en{ font-size:10px; color:#1565c0; font-weight:400; }
      @media(max-width:560px){
        .wp-title { font-size:15px; }
        .wp-qnum  { font-size:10px; }
        .wp-score { font-size:16px; }
        .wp-ask   { font-size:11px; }
      }
    </style>

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;">
      <div>
        <div class="wp-title">看字选图 · Word to Picture 🖼️</div>
        <div class="wp-qnum">第 ${wpIdx+1} / ${wpQuestions.length} 题 · Question ${wpIdx+1} / ${wpQuestions.length}</div>
      </div>
      <div style="background:var(--blue-light);border:2px solid var(--blue);border-radius:16px;padding:6px 14px;text-align:center;flex-shrink:0;">
        <div class="wp-score">${wpScore} 分 · pts</div>
      </div>
    </div>

    <!-- 题面词 -->
    <div style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border:2px solid #64b5f6;border-radius:20px;padding:24px 16px;margin-bottom:8px;text-align:center;">
      <div class="wp-ask">这个词是哪张图？<br><span class="wp-ask-en">Which picture matches this word?</span></div>
      <div style="font-family:'Noto Serif SC',serif;font-size:48px;font-weight:700;color:#1565c0;line-height:1;">${q.w}</div>
    </div>

    <!-- 提示行 -->
    <div id="wp-hint" style="text-align:center;font-size:12px;color:var(--muted);min-height:18px;margin-bottom:12px;">选出正确的图片 · Pick the correct picture</div>

    <!-- 选项 -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      ${options.map((o, idx)=>`
        <div class="wp-option" id="wp-opt-${idx}" onclick="wpPick(${idx})"
          style="background:white;border:2.5px solid #90caf9;border-radius:18px;padding:12px 8px;cursor:pointer;text-align:center;transition:transform 0.15s,border-color 0.15s;box-shadow:var(--shadow);"
          onmouseover="if(!this.dataset.done)this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
          <div style="position:relative;width:100%;height:96px;display:flex;align-items:center;justify-content:center;">
            <img src="${o.img}" alt="" style="width:96px;height:96px;object-fit:contain;" onerror="wpImgError(this)">
            <div class="wp-img-ph" style="display:none;width:96px;height:96px;border-radius:12px;background:var(--blue-light);align-items:center;justify-content:center;font-size:32px;">🖼️</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 下一题按钮（答完才出现） -->
    <div id="wp-next-wrap" style="text-align:center;display:none;">
      <button onclick="wpNext()" class="auth-btn" style="display:inline-block;width:auto;padding:10px 28px;">下一题 · Next →</button>
    </div>
  `;
}

function wpPick(idx){
  if(wpAnswered) return;
  const opt = document.getElementById('wp-opt-'+idx);
  if(!opt) return;
  const hint = document.getElementById('wp-hint');

  if(idx === wpCorrectIdx){
    // 点对 → +1 分、标记正确、禁用本题、显示下一题
    wpAnswered = true;
    opt.dataset.done = '1';
    opt.style.borderColor = 'var(--green)';
    opt.style.background = 'var(--green-light)';
    wpScore += 1;
    playCorrect();
    if(hint){ hint.textContent = '答对了！ +1 分 · Correct! +1 🎉'; hint.style.color = 'var(--green)'; }
    wpShowNext();
  } else {
    // 点错 → 该选项标灰失效，提示还能试几次
    opt.dataset.done = '1';
    opt.style.pointerEvents = 'none';
    opt.style.opacity = '0.4';
    opt.style.borderColor = 'var(--border)';
    wpWrong++;
    playWrong();
    if(wpWrong >= WP_MAX_WRONG){
      // 点错累计达上限 → 自动高亮正确答案并告诉学生，允许进入下一题
      wpAnswered = true;
      const correct = document.getElementById('wp-opt-'+wpCorrectIdx);
      if(correct){ correct.style.borderColor = 'var(--green)'; correct.style.background = 'var(--green-light)'; }
      if(hint){ hint.textContent = '正确答案是这张图（' + wpQuestions[wpIdx].w + '）· Correct answer'; hint.style.color = 'var(--blue)'; }
      wpShowNext();
    } else {
      const left = WP_MAX_WRONG - wpWrong;
      if(hint){ hint.textContent = '不对哦，还能试 ' + left + ' 次 · Try again (' + left + ' left)'; hint.style.color = '#c0392b'; }
    }
  }
}

function wpShowNext(){
  const wrap = document.getElementById('wp-next-wrap');
  if(wrap) wrap.style.display = 'block';
}

function wpNext(){
  wpIdx++;
  if(wpIdx >= wpQuestions.length){
    wpShowResult();
  } else {
    renderWordPicQuestion();
  }
}

function wpShowResult(){
  const container = document.getElementById('wordpic-container');
  const total = wpQuestions.length;
  const pct = total ? Math.round(wpScore / total * 100) : 0;
  container.innerHTML = `
    <div style="background:white;border:2px solid #64b5f6;border-radius:20px;padding:36px 24px;text-align:center;box-shadow:var(--shadow);margin-top:20px;">
      <div style="font-size:56px;margin-bottom:12px;">${pct>=80?'🏆':pct>=50?'🎉':'💪'}</div>
      <div style="font-family:serif;font-size:22px;color:var(--blue);margin-bottom:8px;">本局结束！· All done!</div>
      <div style="font-size:16px;color:var(--ink);margin-bottom:6px;">答对 <strong>${wpScore}</strong> / ${total} 题 · ${wpScore}/${total} correct</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:24px;">看字选对图 · Word to Picture</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="auth-btn" onclick="startWordPicGame()" style="display:inline-block;width:auto;padding:10px 24px;">🔄 再玩一次 · Play again</button>
        <button class="auth-btn" onclick="exitWordPicGame()" style="display:inline-block;width:auto;padding:10px 24px;background:var(--paper2);color:var(--ink);">← 返回 · Back</button>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════
// 朗读练习 · READING PRACTICE (课文版)
// ════════════════════════════════════════
const KEWUN_LESSONS = [{"id": "1.35", "title": "春夏秋冬", "lines": ["春风吹，夏雨落，秋霜降，冬雪飘。", "池草青，山花红，鱼出水，鸟入林。"]}, {"id": "1.36", "title": "姓氏歌", "lines": ["你姓什么？我姓李。", "什么李？木子李。", "他姓什么？他姓张。", "什么张？弓长张。", "古月胡，口天吴，双人徐，言午许。", "中国姓氏有很多，赵、钱、孙、李，周，吴、郑、王，诸葛、东方，上官、欧阳……"]}, {"id": "1.38", "title": "小青蛙", "lines": ["河水清清天气晴，小小青蛙大眼睛。", "保护禾苗吃害虫，做了不少好事情。", "请你爱护小青蛙，好让禾苗不生病。"]}, {"id": "1.39", "title": "猜字谜", "lines": ["（一）", "左边绿，右边红，左右相遇起凉风。", "绿的喜欢及时雨，红的最怕水来攻。", "（二）", "“言”来互相尊重，“心”至令人感动，“日”出万里无云，“水”到纯净透明。"]}, {"id": "1.41", "title": "吃水不忘挖井人", "lines": ["瑞金城外有个村子叫沙洲坝,毛主席在江西领导革命的时候，在那儿住过。", "村子里没有水井，乡亲们吃水要到很远的地方去挑。", "毛主席就带领战士和乡亲们挖了一口井。", "解放以后，乡亲们在井旁立了一块石碑，上面刻着：“吃水不忘挖井人，时刻想念毛主席！”"]}, {"id": "1.42", "title": "我多想去看看", "lines": ["妈妈告诉我，沿着弯弯的小路,就会走出天山。", "遥远的北京城，有一座雄伟的天安门，广场上的升旗仪式非常壮观。", "我对妈妈说，我多想去看看，我多想去看看！", "爸爸告诉我，沿着宽宽的公路，就会走出北京。", "遥远的新疆，有美丽的天山，雪山上盛开着洁白的雪莲。", "我对爸爸说，我多想去看看，我多想去看看!"]}, {"id": "1.43", "title": "一个接一个", "lines": ["月夜，正玩着踩影子，就听大人叫着：\"快回家睡觉!\"", "唉，我好想再多玩一会儿啊。", "不过，回家睡着了，倒可以做各种各样的梦呢!", "正做着好梦，又听见大人在叫：\"该起床上学啦!\"", "唉，要是不上学就好了。", "不过，去了学校，就能见到小伙伴，多么开心哪!", "正和小伙伴们玩着跳房子，操场上却响起了上课铃声。", "唉，要是没有上课铃就好了。", "不过，听老师讲故事，也是很快乐很有趣的呀!", "别的孩子也是这样吗？也像我一样，这么想吗？"]}, {"id": "1.44", "title": "四个太阳", "lines": ["我画了个绿绿的太阳，挂在夏天的天空。", "高山、田野、街道、校园，到处一片清凉。", "我画了个金黄的太阳，送给秋天。", "果园里，果子熟了。", "金黄的落叶忙着邀请小伙伴，请他们尝尝水果的香甜。", "我画了个红红的太阳，送给冬天。", "阳光温暖着小朋友冻僵的手和脸。", "春天，春天的太阳该画什么颜色呢？", "哦，画个彩色的。", "因为春天是个多彩的季节。"]}, {"id": "1.46", "title": "小公鸡和小鸭子", "lines": ["小公鸡和小鸭子一块儿出去玩。", "他们走进草地里。小公鸡找到了许多虫子，吃得很欢。", "小鸭子捉不到虫子，急得直哭。", "小公鸡看见了，捉到虫子就给小鸭子吃。", "他们走到小河边。", "小鸭子说：\"公鸡弟弟，我到河里捉鱼给你吃。\"", "小公鸡说：\"我也去。\"", "小鸭子说：\"不行，不行，你不会游泳，会淹死的！\"", "小公鸡不信，偷偷地跟在小鸭子后面，也下了水。", "小鸭子正在水里捉鱼，忽然，听见小公鸡喊救命。", "他飞快地游到小公鸡身边，让小公鸡坐在自己的背上。", "小公鸡上了岸，笑着对小鸭子说：\"鸭子哥哥，谢谢你。\""]}, {"id": "1.47", "title": "树和喜鹊", "lines": ["从前，这里只有一棵树，树上只有一个鸟窝，鸟窝里只有一只喜鹊。", "树很孤单，喜鹊也很孤单。", "后来，这里种了好多好多树，每棵树上都有鸟窝，每个鸟窝里都有喜鹊。", "树有了邻居，喜鹊也有了邻居。", "每天天一亮，喜鹊们叽叽喳喳叫几声，打着招呼一起飞出去了。", "天一黑，他们又叽叽喳喳地一起飞回窝里，安安静静地睡觉了。", "树很快乐，喜鹊也很快乐。"]}, {"id": "1.49", "title": "怎么都快乐", "lines": ["一个人玩，很好！", "独自一个，静悄悄的，正好用纸折船，折马……", "踢毽子，跳绳，搭积木，当然还有看书，画画，听音乐……", "两个人玩，很好！", "讲故事得有人听才行，你讲我听，我讲你听。", "还有下象棋，打羽毛球，坐跷跷板……", "三个人玩，很好！", "讲故事多个人听更有劲，你讲我们听，我讲你们听。", "两个人甩绳子，你跳，我跳，轮流跳。", "四个人玩，很好！", "五个人玩，很好！", "许多人玩，更好！", "人多，什么游戏都能玩，拔河，老鹰捉小鸡，打排球，打篮球，踢足球……", "连开运动会也可以。"]}, {"id": "1.52a", "title": "夜色", "lines": ["我从前胆子很小很小，天一黑就不敢往外跑。", "妈妈把勇敢的故事讲了又讲，可我一看窗外心就乱跳……", "爸爸晚上偏要拉我去散步，原来花草都像白天一样微笑。", "从此再黑再黑的夜晚，我也能看见小鸟怎样在月光下睡觉……"]}, {"id": "1.52b", "title": "静夜思", "lines": ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"]}, {"id": "1.53", "title": "端午粽", "lines": ["一到端午节，外婆总会煮好一锅粽子，盼着我们回去。", "粽子是用青青的箬竹叶包的,里面裹着白白的糯米，中间有一颗红红的枣。", "外婆一掀锅盖，煮熟的粽子就飘出一股清香来。", "剥开粽叶，咬一口粽子，真是又黏又甜。", "外婆包的粽子十分好吃，花样也多。", "除了红枣粽，还有红豆粽和鱼肉粽。", "我们在外婆家美滋滋地吃了之后，外婆还会装一小蓝粽子要我们带回去，分给邻居吃。", "长大了我才知道，人们端午节吃粽子，据说是为了纪念爱国诗人屈原。"]}, {"id": "1.57", "title": "动物儿歌", "lines": ["蜻蜓半空展翅飞，蝴蝶花间捉迷藏。", "蚯蚓土里造宫殿，蚂蚁地上运食粮。", "蝌蚪池中游得欢，蜘蛛房前结网忙。"]}, {"id": "1.58", "title": "古对今", "lines": ["古对今，圆对方。", "严寒对酷暑，春暖对秋凉。", "晨对暮，雪对霜。", "和风对细雨，朝霞对夕阳。", "桃对李，柳对杨。", "莺歌对燕舞，鸟语对花香。"]}, {"id": "1.60", "title": "操场上", "lines": ["打球拔河拍皮球，跳高跑步踢足球。", "铃声响，下课了。", "操场上，真热闹。", "跳绳踢毽丢沙包，天天锻炼身体好。"]}, {"id": "1.62", "title": "人之初", "lines": ["人之初，性本善。", "性相近，习相远。", "苟不教，性乃迁。", "教之道，贵以专。", "子不学，非所宜。", "幼不学，老何为？", "玉不琢，不成器。", "人不学，不知义。"]}, {"id": "1.76", "title": "棉花姑娘", "lines": ["棉娘棉娘，治!燕。", "棉娘说：燕：“，别!”棉娘：干，棉娘：然，棉娘奇：颗，瓢。”棉娘，碧碧，"]}, {"id": "1.77", "title": "咕咚", "lines": ["熟。", "掉，咕咚！", "吓，“，‘咕咚’‘咕咚’，鹿，“逃命，‘咕咚’！”象，野，：“‘咕咚’，象：“，‘咕咚’。”野拦，‘咕咚’。”领。", "“咕咚”！"]}, {"id": "1.72", "title": "动物王国开大会", "lines": ["动物王国要开大会了，老虎让熊去通知大家。", "\"注意，大会要求每个动物把自己的名字读一百遍。\"", "熊走啊走，碰到了狐狸：\"老虎说，大会要求每个动物把自己的名字读一百遍。\"", "狐狸传话给了兔子，兔子告诉了小鸟……", "大会开始了，老虎问：\"大家都准备好了吗？\"", "\"准备好了！\"动物们齐声回答。"]}, {"id": "1.74", "title": "小猴子下山", "lines": ["有一天，小猴子下山来。", "它走到一块玉米地里，看见玉米结得又大又多，非常高兴，就掰了一个，扛着往前走。", "小猴子扛着玉米，走到一棵桃树下，看见满树的桃子又大又红，非常高兴，就扔了玉米，去摘桃子。", "小猴子捧着桃子，走到一片瓜地里，看见满地的西瓜又大又圆，非常高兴，就扔了桃子，去摘西瓜。", "小猴子抱着西瓜往回走，看见一只小兔子蹦蹦跳跳的，非常可爱，就扔了西瓜，去追兔子。", "兔子跑进树林不见了。", "小猴子只好空着手回家去。"]}, {"id": "1.79", "title": "小壁虎借尾巴", "lines": ["小壁虎在墙角捉蚊子，一条蛇咬住了它的尾巴。", "小壁虎一挣，断了尾巴，逃走了。", "没有尾巴多难看哪！", "小壁虎爬到小河边，看见小鱼摇着尾巴在水里游，就说：\"小鱼，您把尾巴借给我行吗？\"", "小鱼说：\"我要用尾巴拨水，不能借给你。\"", "小壁虎爬到大树上，看见老牛摇着尾巴在树下吃草，就说：\"老牛，您把尾巴借给我行吗？\"", "老牛说：\"我要用尾巴赶蝇子，不能借给你。\"", "小壁虎爬到屋檐下，看见燕子摇着尾巴在空中飞，就说：\"燕子，您把尾巴借给我行吗？\"", "燕子说：\"我要用尾巴控制方向，不能借给你。\"", "小壁虎没借到尾巴，心里很难过。", "它爬回家，把借尾巴的事告诉了妈妈。", "妈妈笑着说：\"傻孩子，你转过身看看。\"", "小壁虎转身一看，高兴地叫起来：\"我长出新尾巴了！\""]}, {"id": "1.55", "title": "彩虹", "lines": ["下雨了，雨停了，天上出现了一道彩虹。", "我问爸爸：\"彩虹是什么？\"", "爸爸说：\"彩虹是一座桥。\"", "\"那我能走上去吗？\"", "\"当然不能，它在很高很高的天上。\"", "我多想去彩虹上面走一走，看看云彩，摸摸蓝天。"]}];

let krCurrentLesson = null;
let krLineScores = [];
let krIsRecording = false;
let krRecognizer = null;

function openKewunReading() {
  showScreen('kewun-reading');
  renderKewunHome();
}

function renderKewunHome() {
  // Insert a new screen dynamically, or use existing reading-sub screen
  const el = document.getElementById('kewun-list');
  if (!el) return;
  el.innerHTML = KEWUN_LESSONS.map((lesson, i) => `
    <div onclick="openKewunLesson(${i})"
      style="background:white;border:1.5px solid var(--border);border-radius:14px;padding:16px 18px;
             cursor:pointer;display:flex;align-items:center;justify-content:space-between;
             box-shadow:var(--shadow);transition:all 0.15s;margin-bottom:10px;"
      onmouseover="this.style.borderColor='var(--red)';this.style.transform='translateX(4px)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
      <div>
        <div style="font-size:11px;color:var(--muted);font-weight:500;letter-spacing:0.05em;">第 ${lesson.id} 课</div>
        <div style="font-family:'Noto Serif SC',serif;font-size:18px;color:var(--ink);margin-top:2px;">《${lesson.title}》</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">共 ${lesson.lines.length} 句</div>
      </div>
      <div style="font-size:20px;color:var(--muted);">›</div>
    </div>
  `).join('');
}


// ════════════════════════════════════════
// 挑战连读 · FULL PASSAGE CHALLENGE
// ════════════════════════════════════════
let krCurrentTab = 'practice'; // 'practice' | 'challenge'
let krChallengeRecognizer = null;
let krChallengeRecording = false;

function switchKrTab(tab) {
  krCurrentTab = tab;
  const btnP = document.getElementById('kr-tab-practice');
  const btnC = document.getElementById('kr-tab-challenge');
  const pane1 = document.getElementById('kewun-lesson-content');
  const pane2 = document.getElementById('kr-challenge-content');
  if(btnP){ btnP.style.background = tab==='practice'?'var(--blue)':'white'; btnP.style.color = tab==='practice'?'white':'var(--muted)'; btnP.style.borderColor = tab==='practice'?'var(--blue)':'var(--border)'; }
  if(btnC){ btnC.style.background = tab==='challenge'?'var(--gold)':'white'; btnC.style.color = tab==='challenge'?'white':'var(--muted)'; btnC.style.borderColor = tab==='challenge'?'var(--gold)':'var(--border)'; }
  if(pane1) pane1.style.display = tab==='practice' ? 'block' : 'none';
  if(pane2) pane2.style.display = tab==='challenge' ? 'block' : 'none';
  if(tab === 'challenge') renderKrChallenge();
}

function renderKrChallenge() {
  const lesson = krCurrentLesson;
  if(!lesson) return;
  const pane = document.getElementById('kr-challenge-content');
  if(!pane) return;

  // Build char-by-char spans for each line — each char gets an id for realtime coloring
  let charIdx = 0;
  const linesHtml = lesson.lines.map((line, li) => {
    const chars = [...line];
    const spans = chars.map(ch => {
      const isPunct = /[，。？！、：；""''「」《》…]/.test(ch);
      if(isPunct){
        return '<span style="color:var(--muted);font-size:20px;">' + ch + '</span>';
      }
      const id = 'krc-' + charIdx++;
      return '<span id="' + id + '" style="font-size:22px;font-family:Noto Serif SC,serif;color:#ccc;transition:color 0.2s;">' + ch + '</span>';
    }).join('');
    return '<div style="line-height:1.9;margin-bottom:4px;">'
      + '<span style="font-size:11px;color:var(--muted);margin-right:8px;vertical-align:middle;">第'+(li+1)+'句</span>'
      + spans + '</div>';
  }).join('');

  pane.innerHTML =
    '<div style="background:white;border:2px solid var(--gold);border-radius:20px;padding:20px;margin-bottom:16px;">'
    + '<div style="font-size:13px;font-weight:600;color:var(--gold);letter-spacing:0.06em;text-align:center;margin-bottom:8px;">🏆 挑战连读 · Full Passage Challenge</div>'
    + '<div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:16px;">大声朗读全文 · 读对的字变绿，读错变红 · 读完按停止</div>'
    // Char display
    + '<div id="kr-char-display" style="background:var(--paper2);border-radius:14px;padding:16px;margin-bottom:16px;">'
    + linesHtml
    + '</div>'
    // Status + button
    + '<div style="text-align:center;">'
    + '<div id="kr-challenge-status" style="font-size:13px;color:var(--muted);margin-bottom:12px;">按下麦克风开始朗读</div>'
    + '<button id="kr-challenge-btn" onclick="krChallengeStart()" '
    + 'style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:30px;border:none;'
    + 'background:var(--gold);color:white;font-size:16px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;'
    + 'box-shadow:0 4px 16px rgba(0,0,0,0.15);">🎙️ 开始朗读</button>'
    + '</div>'
    + '<div id="kr-challenge-result" style="margin-top:16px;"></div>'
    + '</div>';

  // Store total non-punct char count for scoring
  window._krTotalChars = charIdx;
}

// Deepgram API key
const DEEPGRAM_KEY = '4064d888ec502712f85629b3f20ee6980ee141f8';

let krMediaRecorder = null;
let krAudioChunks   = [];

async function krChallengeStart() {
  if(krChallengeRecording) return;
  const lesson = krCurrentLesson;
  if(!lesson) return;

  const btn    = document.getElementById('kr-challenge-btn');
  const status = document.getElementById('kr-challenge-status');
  const result = document.getElementById('kr-challenge-result');
  if(!btn||!status) return;

  // Build expected char list
  let charIdx = 0;
  const expectedChars = [];
  lesson.lines.forEach(line => {
    for(const ch of line){
      if(!/[，。？！、：；""\u2018\u2019\u201c\u201d\u300a\u300b\u2026\s]/.test(ch))
        expectedChars.push({ char: ch, id: 'krc-' + charIdx++ });
    }
  });

  // All chars grey
  expectedChars.forEach(c => {
    const el = document.getElementById(c.id);
    if(el){ el.style.color='#bbb'; el.style.fontWeight='400'; el.style.textDecoration=''; }
  });

  result.innerHTML = '';

  // Request mic
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio:{sampleRate:16000,channelCount:1}}); }
  catch(e) { status.innerHTML='<span style="color:var(--red);">请允许麦克风权限</span>'; return; }

  krChallengeRecording = true;

  // AudioContext for PCM streaming
  const audioCtx  = new (window.AudioContext||window.webkitAudioContext)({sampleRate:16000});
  const source    = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(512,1,1);

  const dgUrl = 'wss://api.deepgram.com/v1/listen'
    + '?language=zh&model=nova-2&encoding=linear16&sample_rate=16000'
    + '&interim_results=true&punctuate=false'
    + '&endpointing=300';  // 300ms pause = new utterance, fast response
  const ws = new WebSocket(dgUrl, ['token', DEEPGRAM_KEY]);

  let accumSpoken = ''; // all final recognized chars so far (no punct)
  let cursor = 0;       // how many expectedChars we've matched/judged so far


  // Helper: apply recognized text to color chars in real-time
  function applyText(text, isFinal){
    const cleaned = [...text.replace(/[，。？！、：；""''「」《》…\s]/g,'')];
    if(!cleaned.length) return;

    // Forward-match with lookahead window — same char per recognized char
    for(const ch of cleaned){
      if(cursor >= expectedChars.length) break;
      // Look ahead up to 3 positions for a match
      let matchAt = -1;
      for(let w=0; w<4 && cursor+w<expectedChars.length; w++){
        if(expectedChars[cursor+w].char === ch){ matchAt=w; break; }
      }
      if(matchAt === 0){
        const el = document.getElementById(expectedChars[cursor].id);
        if(el){ el.style.color='#16a34a'; el.style.fontWeight='700'; el.style.textDecoration=''; }
        cursor++;
      } else if(matchAt > 0){
        // Fill skipped chars as wrong
        for(let s=0;s<matchAt;s++){
          const sk=document.getElementById(expectedChars[cursor+s].id);
          if(sk){ sk.style.color='#dc2626'; sk.style.fontWeight='700'; }
        }
        cursor += matchAt;
        const el2=document.getElementById(expectedChars[cursor].id);
        if(el2){ el2.style.color='#16a34a'; el2.style.fontWeight='700'; el2.style.textDecoration=''; }
        cursor++;
      }
      // else: extra char from recognition, skip without advancing cursor
    }

    const pct = Math.round(cursor/expectedChars.length*100);
    const statusEl = document.getElementById('kr-challenge-status');
    if(statusEl) statusEl.innerHTML =
      '<span style="color:var(--red);font-weight:600;">🎙️ 录音中</span>'
      +' <span style="color:var(--ink);">进度 '+pct+'%</span>'
      +' <span style="color:var(--muted);font-size:12px;">('+cursor+'/'+expectedChars.length+'字)</span>';
  }

  // Track interim cursor separately so we don't double-count
  let interimCursor = 0;

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if(!data.channel) return;
      const alt = data.channel.alternatives?.[0];
      if(!alt) return;
      const text = alt.transcript || '';
      if(!text) return;

      if(data.is_final){
        // Commit: apply this final chunk from where accumSpoken left off
        accumSpoken += text;
        applyText(text, true);
        interimCursor = cursor; // sync interim cursor
      } else {
        // Interim: temporarily color ahead without committing cursor
        // Reset to last final cursor, apply interim on top visually
        const savedCursor = cursor;
        applyText(text, false);
        // Revert cursor — only final commits advance it permanently
        cursor = savedCursor;
      }
    } catch(e){ console.error('ws msg err',e); }
  };

  // Send PCM audio to Deepgram
  processor.onaudioprocess = (e) => {
    if(!krChallengeRecording || ws.readyState!==WebSocket.OPEN) return;
    const f32 = e.inputBuffer.getChannelData(0);
    const i16 = new Int16Array(f32.length);
    for(let k=0;k<f32.length;k++)
      i16[k] = Math.max(-32768, Math.min(32767, f32[k]*32768));
    ws.send(i16.buffer);
  };

  ws.onerror = e => console.error('DG WS', e);

  const cleanup = () => {
    try{ processor.disconnect(); source.disconnect(); audioCtx.close(); }catch(e){}
    stream.getTracks().forEach(t=>t.stop());
  };

  const stopFn = () => {
    if(!krChallengeRecording) return;
    krChallengeRecording = false;
    cleanup();
    if(ws.readyState===WebSocket.OPEN){
      ws.send(JSON.stringify({type:'CloseStream'}));
      setTimeout(()=>{ try{ws.close();}catch(e){}
        krChallengeFinish(accumSpoken, expectedChars, cursor);
      }, 1000);
    } else {
      krChallengeFinish(accumSpoken, expectedChars, cursor);
    }
  };

  ws.onopen = () => {
    source.connect(processor);
    processor.connect(audioCtx.destination);
    btn.style.background = 'var(--red)';
    btn.style.borderColor = 'var(--red)';
    btn.innerHTML = '⏹️ 读完了，点停止';
    btn.disabled  = false;
    btn.onclick   = stopFn;
    status.innerHTML = '<span style="color:var(--red);font-weight:600;">🎙️ 开始朗读！</span>'
      + '<span style="color:var(--muted);font-size:12px;margin-left:8px;">读对的字变绿，读错变红</span>';
    setTimeout(()=>{ if(krChallengeRecording) stopFn(); }, 300000);
  };

  ws.onclose = () => {
    if(krChallengeRecording){ cleanup(); krChallengeRecording=false; }
  };

  // Show connecting state
  btn.innerHTML = '⏳ 连接中...';
  btn.disabled  = true;
  status.innerHTML = '<span style="color:var(--muted);">正在连接AI...</span>';

  // Timeout if can't connect
  setTimeout(()=>{
    if(ws.readyState!==WebSocket.OPEN && krChallengeRecording){
      krChallengeRecording=false; cleanup();
      btn.innerHTML='🎙️ 开始朗读'; btn.disabled=false;
      btn.style.background='var(--gold)'; btn.onclick=function(){krChallengeStart();};
      status.innerHTML='<span style="color:var(--red);">连接超时，请检查网络后重试</span>';
    }
  }, 6000);
}

function krChallengeStop() {
  // Called externally — trigger via button onclick instead
  krChallengeRecording = false;
}

// Color chars using LCS — used for final coloring after REST recognition
function colorCharsFromTranscript(transcript, expectedChars) {
  const spokenStr = transcript.replace(/[，。？！、：；""''「」《》…\s]/g,'');
  const spoken = [...spokenStr];
  const N = expectedChars.length;
  const M = spoken.length;
  if(!M) return;

  // DP LCS
  const dp = Array.from({length:N+1}, () => new Uint16Array(M+1));
  for(let i=1;i<=N;i++)
    for(let j=1;j<=M;j++)
      dp[i][j] = expectedChars[i-1].char===spoken[j-1]
        ? dp[i-1][j-1]+1
        : Math.max(dp[i-1][j],dp[i][j-1]);

  // Backtrack
  const matched = new Array(N).fill(false);
  let i=N,j=M;
  while(i>0&&j>0){
    if(expectedChars[i-1].char===spoken[j-1]){ matched[i-1]=true; i--;j--; }
    else if(dp[i-1][j]>=dp[i][j-1]) i--;
    else j--;
  }

  const reachedRatio = M/N;
  expectedChars.forEach((c,idx) => {
    const el=document.getElementById(c.id);
    if(!el) return;
    if(matched[idx]){ el.style.color='#16a34a';el.style.fontWeight='700'; }
    else if(idx/N < reachedRatio*1.1){ el.style.color='#dc2626';el.style.fontWeight='600'; }
    else { el.style.color='#aaa';el.style.fontWeight='400'; }
  });
}

function krChallengeFinish(transcript, expectedChars, cursor) {
  krChallengeRecording = false;
  const lesson = krCurrentLesson;
  const btn    = document.getElementById('kr-challenge-btn');
  const status = document.getElementById('kr-challenge-status');
  const result = document.getElementById('kr-challenge-result');
  if(!btn||!status||!result) return;

  btn.style.background = 'var(--gold)';
  btn.innerHTML = '🎙️ 开始朗读';
  btn.disabled = false;
  btn.onclick = function(){ krChallengeStart(); };

  const allExpected = expectedChars || [];
  const total = allExpected.length || 1;
  let greenCount = 0, redCount = 0;
  allExpected.forEach(c => {
    const el = document.getElementById(c.id);
    if(!el) return;
    const col = el.style.color;
    if(col === 'rgb(22, 163, 74)') greenCount++;
    else if(col === 'rgb(220, 38, 38)') redCount++;
  });
  const attempted = cursor || (greenCount + redCount);
  const accuracy  = attempted > 0 ? Math.round(greenCount/attempted*100) : 0;
  const coverage  = Math.round(attempted/total*100);
  const passed = attempted >= Math.ceil(total*0.8) && accuracy >= 60;

  if(!transcript || !transcript.trim()){
    status.innerHTML = '';
    result.innerHTML =
      '<div style="background:white;border:2px solid var(--red);border-radius:20px;padding:24px;text-align:center;">'
      +'<div style="font-size:56px;margin-bottom:8px;">🎙️</div>'
      +'<div style="font-size:20px;font-weight:700;color:var(--red);margin-bottom:8px;">没有检测到声音</div>'
      +'<div style="font-size:13px;color:var(--muted);">No speech detected · Please speak clearly and try again</div>'
      +'</div>';
    return;
  }

  status.innerHTML = '';

  if(!passed){
    // Not enough lines covered — encouraging feedback, no points
    const pct = coverage;
    const msg = pct >= 60
      ? '读了一半以上，继续加油！· Keep going, youre halfway there!'
      : pct >= 30
        ? '读了一些，多练练再来挑战！· Good start, practice more and try again!'
        : '继续努力，争取读完整篇！· Keep practicing, read the full passage!';

    result.innerHTML =
      '<div style="background:white;border:2px solid var(--gold);border-radius:20px;padding:24px;text-align:center;">'
      +'<div style="font-size:56px;margin-bottom:8px;">💪</div>'
      +'<div style="font-size:20px;font-weight:700;color:var(--gold);margin-bottom:8px;">继续加油！Keep it up!</div>'
      +'<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">读了 '+attempted+'/'+total+' 字 · 准确率 '+accuracy+'% · ✅'+greenCount+' ❌'+redCount+'</div>'
      +'<div style="font-size:13px;font-style:italic;color:var(--ink);margin-bottom:16px;">'+msg+'</div>'
      +'<div style="font-size:12px;color:var(--muted);margin-bottom:16px;">需要读完80%文字且准确率≥60%才得分 · Need 80% coverage & 60% accuracy</div>'
      +'<button onclick="renderKrChallenge()" style="padding:10px 24px;border-radius:30px;border:none;background:var(--gold);color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">🔄 再挑战一次 · Try Again</button>'
      +'</div>';
    return;
  }

  // Award pts based on accuracy: 30/20/10
  const pts = accuracy >= 85 ? 30 : accuracy >= 65 ? 20 : 10;
  const attemptNum = incAttemptCount(lesson.id, 'challenge');
  const attemptsLeft = MAX_ATTEMPTS - attemptNum;
  const data = getUserData();
  data.total = (data.total||0) + pts;
  if(!data.history) data.history=[];
  data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:lesson.title,mode:'挑战连读',count:1,pts,reason:'完成挑战连读 +'+pts+'分'});
  saveUserData(data);
  if(lesson) submitHWCompletion(lesson.id, 'challenge', coverage);

  result.innerHTML =
    '<div style="background:white;border:2px solid var(--green);border-radius:20px;padding:24px;text-align:center;">'
    +'<div style="font-size:80px;margin-bottom:8px;">👍</div>'
    +'<div style="font-size:24px;font-weight:700;color:var(--green);margin-bottom:6px;">挑战成功！</div>'
    +'<div style="font-size:14px;color:var(--green);margin-bottom:4px;">Challenge Complete!</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">✅ '+greenCount+' 字正确 · ❌ '+redCount+' 字错误 · 准确率 '+accuracy+'%</div>'
    +'<div style="background:var(--gold-light);border:2px solid var(--gold);border-radius:16px;padding:16px;display:inline-block;margin-bottom:16px;">'
    +'<div style="font-size:44px;font-weight:800;color:var(--gold);">+'+pts+'</div>'
    +'<div style="font-size:13px;color:var(--gold);">积分 Points</div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'
    +'<button onclick="renderKrChallenge()" style="padding:10px 22px;border-radius:30px;border:2px solid var(--green);background:white;color:var(--green);font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">🔄 再挑战一次</button>'
    +'<button onclick="openStudentHW()" style="padding:10px 22px;border-radius:30px;border:none;background:var(--green);color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">✓ 返回作业列表</button>'
    +'</div>'
    +'</div>';
}

function openKewunLesson(idx) {
  // ★ 重置入口标志：直接从课文列表点进 = 从课文练习模块进入
  window._kewunFromHW = false;
  krCurrentLesson = KEWUN_LESSONS[idx];
  krLineScores = new Array(krCurrentLesson.lines.length).fill(null);
  krCurrentTab = 'practice';
  krChallengeRecording = false;
  showScreen('kewun-lesson');
  const hdr = document.getElementById('kewun-lesson-header');
  if (hdr) hdr.innerHTML = `
    <div style="text-align:center;padding:4px 0 8px;">
      <div style="font-size:11px;color:var(--muted);font-weight:500;letter-spacing:0.06em;text-transform:uppercase;">第 ${krCurrentLesson.id} 课</div>
      <div style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;color:var(--ink);margin:4px 0;">《${krCurrentLesson.title}》</div>
      <div style="font-size:12px;color:var(--muted);">共 ${krCurrentLesson.lines.length} 句 · 点🔊听范读，点🎤跟读评分</div>
    </div>`;
  // Reset to practice tab display
  const p1=document.getElementById('kewun-lesson-content');
  const p2=document.getElementById('kr-challenge-content');
  if(p1) p1.style.display='block';
  if(p2) p2.style.display='none';
  const btnP=document.getElementById('kr-tab-practice');
  const btnC=document.getElementById('kr-tab-challenge');
  if(btnP){btnP.style.background='var(--blue)';btnP.style.color='white';btnP.style.borderColor='var(--blue)';}
  if(btnC){btnC.style.background='white';btnC.style.color='var(--muted)';btnC.style.borderColor='var(--border)';}
  renderKewunLesson();
}

function renderKewunLesson() {
  const lesson = krCurrentLesson;
  const cont = document.getElementById('kewun-lesson-content');
  if (!cont) return;

  const linesHtml = lesson.lines.map((line, i) => {
    const score = krLineScores[i];
    let scoreTag = '';
    if (score !== null) {
      const col = score.pct >= 80 ? 'var(--green)' : score.pct >= 60 ? 'var(--gold)' : 'var(--gold)';
      const label = score.pct >= 90 ? '🌟 太棒了！' : score.pct >= 75 ? '⭐ 很好！' : score.pct >= 60 ? '👍 不错！' : '💪 再来一次！';
      scoreTag = `<span style="font-size:11px;font-weight:600;color:${col};padding:2px 8px;border-radius:10px;border:1px solid ${col};margin-left:auto;">${label}</span>`;
    }
    // Build char-by-char display for scored lines
    let lineDisplay = '';
    if (score && score.charResults) {
      lineDisplay = score.charResults.map(cr => {
        if (cr.isPunct) return `<span style="color:var(--muted);">${cr.char}</span>`;
        const color = cr.correct === true ? 'var(--ink)' : cr.correct === false ? 'var(--red)' : 'var(--ink)';
        const under = cr.correct === false ? 'text-decoration:underline wavy var(--red);' : '';
        const title = cr.correct === false && cr.expected ? `title="${cr.expected}"` : '';
        return `<span style="color:${color};${under}cursor:${cr.correct===false?'help':'default'};" ${title}>${cr.char}</span>`;
      }).join('');
    } else {
      lineDisplay = `<span>${line}</span>`;
    }
    // Correction tip — only show if score < 75% and there are clear errors
    let correctionHtml = '';
    if (score && score.charResults && score.pct < 75) {
      const wrong = score.charResults.filter(cr => cr.correct === false && cr.expected);
      if (wrong.length > 0 && wrong.length <= 3) {
        // Only highlight up to 3 wrong chars to avoid overwhelming
        correctionHtml = `<div style="margin-top:6px;padding:6px 10px;background:#fef9c3;border-radius:8px;font-size:12px;color:#854d0e;">
          💡 注意：${wrong.slice(0,3).map(cr=>`<strong>${cr.char}</strong>`).join('、')} 再试试看！
        </div>`;
      }
    }

    // Build per-char spans for karaoke (only when no score yet, or always for karaoke line)
    const karaokeDisplay = [...line].map((ch, ci) => {
      const isPunct = /[，。？！、；：""''《》（）]/.test(ch);
      if(isPunct) return `<span style="color:var(--muted);font-size:24px;">${ch}</span>`;
      return `<span id="krl-${i}-${ci}" style="font-size:24px;font-family:'Noto Serif SC',serif;color:#ccc;transition:color 0.1s;">${ch}</span>`;
    }).join('');

    return `
    <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <span style="font-size:11px;color:var(--muted);background:var(--paper2);padding:2px 7px;border-radius:8px;flex-shrink:0;">第${i+1}句</span>
        ${scoreTag}
      </div>
      <div id="krl-line-${i}" style="line-height:1.7;margin-bottom:10px;">${score ? lineDisplay : karaokeDisplay}</div>
      ${correctionHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="krListenLine(${i})"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;
                 border:1px solid var(--purple);background:var(--purple-light);color:var(--purple);
                 font-size:12px;font-family:DM Sans,sans-serif;font-weight:500;cursor:pointer;">
          🔊 听一听
        </button>
        <button onclick="krKaraokeRead(${i})" id="kr-read-btn-${i}"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;
                 border:1px solid var(--red);background:var(--red-light);color:var(--red);
                 font-size:12px;font-family:DM Sans,sans-serif;font-weight:500;cursor:pointer;">
          🎤 跟读
        </button>
        <button onclick="krSkipLine(${i})"
          style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;
                 border:1px solid var(--border);background:var(--paper2);color:var(--muted);
                 font-size:12px;font-family:DM Sans,sans-serif;font-weight:500;cursor:pointer;">
          ⏭ 跳过
        </button>
      </div>
    </div>`;
  }).join('');

  // Score summary if all done
  const doneCount = krLineScores.filter(s => s !== null).length;
  // Exclude skipped lines from avg, count them separately
  const scoredLines = krLineScores.filter(s => s !== null && !s.skipped);
  const skippedCount = krLineScores.filter(s => s && s.skipped).length;
  const totalPct = scoredLines.length > 0
    ? Math.round(scoredLines.reduce((a,s)=>a+s.pct,0)/scoredLines.length)
    : null;
  let summaryHtml = '';
  if (doneCount === lesson.lines.length && doneCount > 0) {
    // Completion rate × accuracy = final score
    const totalLines = lesson.lines.length;
    const skipRatio = skippedCount / totalLines;
    const completionRate = scoredLines.length / totalLines; // 0~1

    // If more than half skipped → 0 pts
    let pts, finalPct;
    if(skipRatio > 0.5){
      pts = 0;
      finalPct = 0;
    } else {
      // Final score = accuracy × completion rate
      finalPct = Math.round((totalPct||0) * completionRate);
      pts = finalPct >= 90 ? 30 : finalPct >= 70 ? 20 : finalPct >= 50 ? 10 : 0;
    }
    if(krCurrentLesson) submitHWCompletion(krCurrentLesson.id, 'reading', finalPct||0);
    const emoji = finalPct >= 90 ? '🌟' : finalPct >= 70 ? '⭐' : finalPct >= 50 ? '👍' : '💪';
    const grade = finalPct >= 90 ? '优秀 · Excellent!' : finalPct >= 70 ? '很好 · Great job!' : finalPct >= 50 ? '不错 · Good effort!' : '继续加油 · Keep going!';

    // Record attempt + award pts
    const attemptNum = incAttemptCount(krCurrentLesson.id, 'reading');
    const attemptsLeft = MAX_ATTEMPTS - attemptNum;

    if(currentUser && pts > 0){
      const data = getUserData();
      data.total = (data.total||0) + pts;
      if(!data.history) data.history=[];
      data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:lesson.title,mode:'逐句跟读',count:doneCount,pts,reason:'完成跟读 +'+pts+'分'});
      saveUserData(data);
    }

    // Per-line score breakdown
    const lineBreakdown = lesson.lines.map((line,i)=>{
      const s = krLineScores[i];
      if(!s) return '';
      const lineNum = '第'+(i+1)+'句';
      if(s.skipped) return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--muted);">'+lineNum+'</span><span style="color:var(--muted);">跳过</span></div>';
      const col = s.pct>=80?'var(--green)':s.pct>=60?'var(--gold)':'var(--red)';
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--ink);">'+lineNum+'</span><span style="font-weight:600;color:'+col+';">'+s.pct+'%</span></div>';
    }).join('');

    summaryHtml = `
      <div style="background:white;border:2px solid var(--gold);border-radius:var(--radius);padding:20px;margin-top:16px;box-shadow:var(--shadow);">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:40px;">${emoji}</div>
          <div style="font-family:serif;font-size:20px;color:var(--gold);margin:6px 0;">朗读完成！${grade}</div>
          <div style="font-size:36px;font-weight:800;color:var(--gold);margin:8px 0;">${finalPct}<span style="font-size:16px;">分</span></div>
          <div style="font-size:14px;color:var(--green);font-weight:600;margin-bottom:4px;">+${pts} 积分 · Points</div>
          ${completionRate<1?`<div style="font-size:12px;color:var(--muted);">完成度 ${Math.round(completionRate*100)}% · Completion</div>`:''}

        </div>
        <div style="background:var(--paper2);border-radius:10px;padding:10px 14px;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;">各句表现</div>
          ${lineBreakdown}
        </div>
        ${attemptsLeft>0
          ? `<button onclick="krResetAll()" style="width:100%;padding:11px;border-radius:var(--radius);border:none;background:var(--gold);color:white;font-size:14px;font-family:DM Sans,sans-serif;font-weight:600;cursor:pointer;">🔄 再练一次</button>`
          : `<div style="text-align:center;font-size:13px;color:var(--muted);padding:8px;">今天练习很棒！明天继续加油 💪</div>`
        }
      </div>`;
  }

  cont.innerHTML = linesHtml + summaryHtml;
}

function krListenLine(idx) {
  const lesson = krCurrentLesson;
  const line = lesson.lines[idx];
  const utt = new SpeechSynthesisUtterance(line);
  utt.lang = 'zh-CN';
  utt.rate = 0.7;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}

// ── 卡拉OK跟读：TTS播放时绿色逐字流过，同时录音，结束后AI识别标红 ──
async function krKaraokeRead(idx) {
  return krReadLine(idx);
}

async function krReadLine(idx) {
  // 开始录音前，先停掉"听一听"的范读播放（TTS）和任何正在播的音频，
  // 否则范读声会被麦克风录进去，干扰识别。
  try{ window.speechSynthesis.cancel(); }catch(e){}
  try{ if(typeof stopCurrentAudio==='function') stopCurrentAudio(); }catch(e){}
  const lesson = krCurrentLesson;
  const targetLine = lesson.lines[idx];
  const btn = document.getElementById('kr-read-btn-' + idx);
  if (!btn || btn.disabled) return;

  const origHtml = btn.innerHTML;
  const origStyle = btn.getAttribute('style')||'';

  // Request mic
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: true});
  } catch(e) {
    btn.innerHTML = '⚠️ 请允许麦克风';
    setTimeout(()=>{ btn.innerHTML=origHtml; btn.setAttribute('style',origStyle); }, 2000);
    return;
  }

  // Recording state
  btn.innerHTML = '🎙️ 朗读中...';
  btn.style.background = 'var(--red)';
  btn.style.borderColor = 'var(--red)';
  btn.style.color = 'white';
  btn.disabled = true; // no manual stop needed

  const chunks = [];
  const fmts = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
  const mt = fmts.find(f=>MediaRecorder.isTypeSupported(f))||'';
  const mr = new MediaRecorder(stream, mt?{mimeType:mt}:{});
  mr.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };

  let stopped = false;
  const stopFn = () => {
    if(stopped) return; stopped=true;
    if(mr.state!=='inactive') mr.stop();
  };

  // ── VAD: auto-stop on silence ──
  // Use AudioContext to detect when student stops speaking
  const vadCtx = new (window.AudioContext||window.webkitAudioContext)();
  const vadSource = vadCtx.createMediaStreamSource(stream);
  const analyser = vadCtx.createAnalyser();
  analyser.fftSize = 512;
  vadSource.connect(analyser);
  const dataArr = new Uint8Array(analyser.frequencyBinCount);

  let silenceStart = null;
  let hasSpeech = false;
  const SILENCE_MS = 1200;   // stop after 1.2s silence
  const MAX_MS = 10000;      // hard cap 10s
  const SPEECH_THRESH = 15;  // lower threshold = more sensitive

  const vadInterval = setInterval(()=>{
    if(stopped){ clearInterval(vadInterval); return; }
    analyser.getByteFrequencyData(dataArr);
    const avg = dataArr.reduce((a,b)=>a+b,0)/dataArr.length;
    if(avg > SPEECH_THRESH){
      hasSpeech = true;
      silenceStart = null;
    } else {
      // Start silence timer regardless of hasSpeech (fixes last-sentence issue)
      if(!silenceStart) silenceStart = Date.now();
      const waited = Date.now() - silenceStart;
      if(hasSpeech && waited > SILENCE_MS){
        clearInterval(vadInterval);
        try{ vadCtx.close(); }catch(e){}
        stopFn();
      } else if(!hasSpeech && waited > 4000){
        // 4s with no speech at all → show manual stop button as fallback
        if(btn && !btn.dataset.manualShown){
          btn.dataset.manualShown = '1';
          btn.innerHTML = '⏹ 点击结束';
          btn.disabled = false;
          btn.onclick = ()=>{ clearInterval(vadInterval); try{vadCtx.close();}catch(e){} stopFn(); };
        }
      }
    }
  }, 80);

  // Hard cap
  const autoStop = setTimeout(()=>{ clearInterval(vadInterval); try{vadCtx.close();}catch(e){} stopFn(); }, MAX_MS);

  await new Promise(resolve => {
    mr.onstop = async () => {
      clearTimeout(autoStop);
      stream.getTracks().forEach(t=>t.stop());
      try{ if(typeof vadCtx!=='undefined') vadCtx.close(); }catch(e){}

      btn.innerHTML = '⏳ 识别中...';
      btn.style.background = 'var(--blue-light)';
      btn.style.borderColor = 'var(--blue)';
      btn.style.color = 'var(--blue)';
      btn.disabled = true;
      btn.onclick = null;

      let spoken = '';
      try {
        const blob = new Blob(chunks, {type: mr.mimeType||'audio/webm'});
        const resp = await fetch(
          'https://api.deepgram.com/v1/listen?language=zh-CN&model=nova-3&punctuate=false&smart_format=false',
          {method:'POST', headers:{'Authorization':'Token '+DEEPGRAM_KEY,'Content-Type':blob.type}, body:blob}
        );
        if(resp.ok){
          const data = await resp.json();
          spoken = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        }
      } catch(e){ console.error('DG line:', e); }

      // Restore button
      btn.innerHTML = origHtml;
      btn.setAttribute('style', origStyle);
      btn.disabled = false;
      btn.onclick = function(){ krReadLine(idx); };

      const result = krScoreLineLCS(targetLine, spoken);
      // Keep the BEST score — never let retry make things worse
      const prev = krLineScores[idx];
      if(!prev || result.pct >= prev.pct){
        krLineScores[idx] = result;
        if(result.charResults) addWrongCharsFromReading(result.charResults, lesson.title||'');
      }
      renderKewunLesson();
      resolve();
    };
    mr.start();
  });
}


// LCS-based line scorer — replaces buggy greedy krScoreLine
function krScoreLineLCS(target, spoken) {
  const punct = /[，。？！、；：""''《》（）\s]/g;
  const targetClean = [...target.replace(punct,'')];
  const spokenClean = [...spoken.replace(punct,'')];
  const N = targetClean.length;
  const M = spokenClean.length;

  if(!N) return {pct:100, charResults:[]};

  // DP LCS
  const dp = Array.from({length:N+1},()=>new Uint16Array(M+1));
  for(let i=1;i<=N;i++)
    for(let j=1;j<=M;j++)
      dp[i][j] = targetClean[i-1]===spokenClean[j-1]
        ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);

  // Backtrack
  const matched = new Array(N).fill(false);
  let i=N,j=M;
  while(i>0&&j>0){
    if(targetClean[i-1]===spokenClean[j-1]){ matched[i-1]=true; i--;j--; }
    else if(dp[i-1][j]>=dp[i][j-1]) i--;
    else j--;
  }

  // Build charResults mapping back to original target (with punctuation)
  const charResults = [];
  let ci = 0; // index into targetClean
  for(const ch of target){
    if(punct.test(ch)){ charResults.push({char:ch,isPunct:true}); continue; }
    const ok = matched[ci];
    charResults.push({char:ch, correct:ok, isPunct:false,
      expected: ok ? null : krGetPinyin(ch)});
    ci++;
  }

  const correct = matched.filter(Boolean).length;
  // Boost score slightly to account for recognition imperfections
  // A student who read 70% correctly likely read ~85% correctly in reality
  const rawPct = Math.round(correct/N*100);
  const pct = Math.min(100, Math.round(rawPct * 1.15));
  return {pct, charResults};
}

function krScoreLine(target, spoken) {
  // Remove punctuation and spaces from target
  const targetClean = target.replace(/[，。？！、；：""''《》（）\s]/g, '');
  const spokenClean = spoken.replace(/[，。？！、；：""''《》（）\s]/g, '');

  // Get pinyin mapping from a simple char-level comparison
  const charResults = [];
  let spokenIdx = 0;
  let correct = 0;
  let total = 0;

  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    const isPunct = /[，。？！、；：""''《》（）\s]/.test(ch);
    if (isPunct) {
      charResults.push({ char: ch, isPunct: true });
      continue;
    }
    total++;
    // Find this char in spoken (allow some skip for insertions)
    let found = false;
    for (let j = spokenIdx; j < Math.min(spokenIdx + 4, spokenClean.length); j++) {
      if (spokenClean[j] === ch) {
        correct++;
        spokenIdx = j + 1;
        found = true;
        charResults.push({ char: ch, correct: true, isPunct: false });
        break;
      }
    }
    if (!found) {
      // Try to get what was said instead
      const said = spokenClean[spokenIdx] || '';
      charResults.push({ char: ch, correct: false, isPunct: false, expected: krGetPinyin(ch), said: said });
      // don't advance spokenIdx since we missed this char
    }
  }

  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  return { pct, correct, total, charResults };
}

// Pinyin lookup — uses the global PINYIN_MAP defined later in the file
function krGetPinyin(char) {
  // PINYIN_MAP is defined further below (the full map used by the whole app)
  if (typeof PINYIN_MAP !== 'undefined' && PINYIN_MAP[char]) return PINYIN_MAP[char];
  return char;
}

function krSkipLine(idx){
  // Mark as skipped with a passing score so student can continue
  krLineScores[idx] = {pct: 0, charResults: null, skipped: true};
  renderKewunLesson();
}


// ── 练习次数限制 · ATTEMPT LIMITS ──
function getAttemptCount(lessonId, mode){
  const key = 'czmd_attempts_'+lessonId+'_'+mode;
  const uk = currentUser ? userKey(currentUser.name,currentUser.classCode) : 'guest';
  return safeParseJSON(localStorage.getItem(key+'_'+uk), 0);
}
function incAttemptCount(lessonId, mode){
  const key = 'czmd_attempts_'+lessonId+'_'+mode;
  const uk = currentUser ? userKey(currentUser.name,currentUser.classCode) : 'guest';
  const storageKey = key+'_'+uk;
  const n = getAttemptCount(lessonId, mode)+1;
  localStorage.setItem(storageKey, JSON.stringify(n));
  const cacheKey = 'czmd_attempts_cloud_cache';
  const counts = safeParseJSON(localStorage.getItem(cacheKey), {});
  counts[storageKey] = n;
  localStorage.setItem(cacheKey, JSON.stringify(counts));
  cloudWriteRef(cloudStudentProgressRef('attempts'), {counts});
  return n;
}
const MAX_ATTEMPTS = 5;

function krResetAll() {
  if(!krCurrentLesson) return;
  const attempts = getAttemptCount(krCurrentLesson.id, 'reading');
  if(attempts >= MAX_ATTEMPTS){
    alert('已完成 '+MAX_ATTEMPTS+' 次练习，今日上限已到！明天继续加油！\nMax attempts reached for today!');
    return;
  }
  krLineScores = new Array(krCurrentLesson.lines.length).fill(null);
  renderKewunLesson();
}


// ════════════════════════════════════════
// 错字复习 · WRONG CHARS BANK
// ════════════════════════════════════════

function wcKey(){
  const u = currentUser ? (currentUser.username||currentUser.name||'guest') : 'guest';
  return 'czmd_wrong_chars_' + u;
}
function loadWC(){ return safeParseJSON(localStorage.getItem(wcKey()), []); }
function saveWC(list){
  localStorage.setItem(wcKey(), JSON.stringify(list));
  cloudWriteRef(cloudStudentProgressRef('wrongChars'), {items:list});
}

function addWrongChar(char, pinyin, meaning, source, lesson){
  if(!char || !/[\u4e00-\u9fff]/.test(char)) return;
  const list = loadWC();
  const now = new Date().toLocaleDateString('zh-CN');
  const lessonLabel = lesson || (selectedLesson ? (selectedLesson.subtitle||selectedLesson.title||'') : '');
  const existing = list.find(w => w.char === char);
  if(existing){
    existing.count = (existing.count||1) + 1;
    existing.lastDate = now;
    if(!existing.sources) existing.sources = [];
    if(!existing.sources.includes(source)) existing.sources.push(source);
    if(!existing.lessons) existing.lessons = [];
    if(lessonLabel && !existing.lessons.includes(lessonLabel)) existing.lessons.push(lessonLabel);
  } else {
    list.push({ char, pinyin:pinyin||'', meaning:meaning||'', count:1, lastDate:now, sources:[source], lessons:lessonLabel?[lessonLabel]:[] });
  }
  saveWC(list);
}

// Wrap addToNR to also record to wrong chars bank


function addWrongCharsFromReading(charResults, lessonTitle){
  (charResults||[]).filter(cr=>cr.correct===false&&!cr.isPunct).forEach(cr=>{
    addWrongChar(cr.char, krGetPinyin(cr.char), '', '朗读练习', lessonTitle||'');
  });
}

function showWrongChars(){
  showScreen('wrong-chars');
  renderWrongChars();
}

function renderWrongChars(){
  const fullList = loadWC().sort((a,b)=>(b.count||1)-(a.count||1));
  const el = document.getElementById('wc-content');
  if(!el) return;

  if(!fullList.length){
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;">'
      + '<div style="font-size:56px;margin-bottom:16px;">🎉</div>'
      + '<div style="font-size:18px;font-weight:500;color:var(--ink);margin-bottom:8px;">还没有错字！</div>'
      + '<div style="font-size:13px;color:var(--muted);">做练习时答错的字会自动出现在这里。<br>Wrong answers from all practice modes appear here.</div>'
      + '</div>';
    return;
  }

  // 收集所有出现过的来源（用于筛选）
  const allSources = new Set();
  fullList.forEach(w => (w.sources||[]).forEach(s => allSources.add(s)));
  // 当前选中的筛选
  if(!window._wcFilter) window._wcFilter = 'all';
  const filter = window._wcFilter;
  // 筛后的 list
  const list = (filter === 'all')
    ? fullList
    : fullList.filter(w => (w.sources||[]).includes(filter));

  const totalErrors = list.reduce((s,w)=>s+(w.count||1),0);
  let html = '<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;margin-bottom:16px;box-shadow:var(--shadow);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px 12px;">'
    + '<div><div style="font-size:26px;font-weight:700;color:var(--red);">' + list.length + '</div><div style="font-size:12px;color:var(--muted);">待复习的字 · To review</div></div>'
    + '<div style="text-align:center;"><div style="font-size:26px;font-weight:700;color:var(--gold);">' + totalErrors + '</div><div style="font-size:12px;color:var(--muted);">累计错误次数 · Total errors</div></div>'
    + '<button onclick="wcPracticeAll()" style="padding:10px 16px;border-radius:var(--radius);border:none;background:var(--red);color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;">📝 专项练习 · Practice</button>'
    + '</div>';

  // 来源筛选行（≥ 2 个不同来源才显示）
  if(allSources.size >= 2){
    html += '<div style="margin-bottom:14px;">'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">按来源筛选 · Filter by source</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    const filterPill = (val, label) => {
      const active = filter === val;
      return '<button onclick="wcSetFilter(\''+val+'\')" '
        + 'style="font-size:12px;padding:5px 12px;border-radius:20px;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:500;'
        + (active
            ? 'background:var(--ink);color:white;border:1.5px solid var(--ink);'
            : 'background:white;color:var(--muted);border:1.5px solid var(--border);')
        + '">' + label + '</button>';
    };
    // 来源 → 英文名：复用各游戏/功能在别处已有的英文叫法，不另起新译名（数字/键值不变，只译显示文字）
    const srcEN = (s) => {
      if(s==='全部') return 'All';
      if(s.indexOf('识字测验')>=0) return 'Character Quiz';
      if(s.indexOf('日常自测')>=0) return 'Daily Quiz';
      if(s==='朗读练习') return 'Reading Practice';
      if(s==='听读练习') return 'Listen & Record';
      if(s==='采蘑菇')   return 'Pick Mushrooms';
      if(s==='听音选字') return 'Listen & Pick';
      if(s==='翻卡片')   return 'Flashcard';
      if(s==='选择题')   return 'Multiple Choice';
      if(s==='拼写' || s==='拼写练习') return 'Type It';
      if(s==='练习' || s==='复习练习') return 'Review Drill';
      return '';   // 未知来源：不强行翻译，保留原文
    };
    const srcLabel = (s) => { const en = srcEN(s); return en ? (s + ' · ' + en) : s; };
    html += filterPill('all', srcLabel('全部')+' ('+fullList.length+')');
    Array.from(allSources).sort().forEach(s => {
      const count = fullList.filter(w => (w.sources||[]).includes(s)).length;
      html += filterPill(s, srcLabel(s)+' ('+count+')');
    });
    html += '</div></div>';
  }

  html += '<div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">错误次数越多排列越靠前 · Sorted by error count</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px;">';

  list.forEach(function(w, i){
    var heat = w.count>=5?'var(--red)':w.count>=3?'var(--gold)':'var(--blue)';
    var heatBg = w.count>=5?'var(--red-light)':w.count>=3?'var(--gold-light)':'var(--blue-light)';
    var lessons = (w.lessons||[]).slice(0,2).join('、');
    var safeChar = w.char.replace(/'/g, "\\'");
    // ★ 来源标签（彩色小 pill）——区分哪个功能错的字
    var sources = w.sources || [];
    var srcPills = sources.slice(0,3).map(function(s){
      var bg, color;
      if(s.indexOf('识字测验')>=0)      { bg = '#fff3cd'; color = '#8a6d1a'; }   // 金
      else if(s.indexOf('日常自测')>=0) { bg = '#d4edda'; color = '#2d6a4f'; }   // 绿
      else if(s.indexOf('朗读')>=0)     { bg = '#cce5ff'; color = '#1e4d8c'; }   // 蓝
      else if(s.indexOf('听读')>=0)     { bg = '#e2d4f0'; color = '#5a3a8a'; }   // 紫
      else if(s.indexOf('课后')>=0||s.indexOf('作业')>=0) { bg = '#f8d7da'; color = '#a82828'; }
      else                              { bg = '#e9ecef'; color = '#666'; }
      return '<span style="font-size:9px;padding:2px 6px;border-radius:10px;background:'+bg+';color:'+color+';font-weight:600;">'+s+'</span>';
    }).join(' ');
    html += '<div style="background:white;border:1.5px solid '+heat+';border-radius:14px;padding:14px 10px;text-align:center;position:relative;box-shadow:0 2px 8px rgba(0,0,0,0.06);">'
      + '<div style="position:absolute;top:6px;right:8px;font-size:10px;font-weight:700;color:'+heat+';background:'+heatBg+';padding:1px 6px;border-radius:8px;">×'+w.count+'</div>'
      + '<div onclick="wcPlayChar(\''+safeChar+'\',this)" style="cursor:pointer;user-select:none;transition:transform 0.15s;" title="点击听读音"'
      + ' onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'\'">'
      + '<div style="font-family:\'KaiTi\',\'STKaiti\',\'楷体\',\'Noto Serif SC\',serif;font-size:42px;color:var(--ink);line-height:1;margin-bottom:4px;">'+w.char+'</div>'
      + '<div style="font-size:10px;color:var(--muted);opacity:0.7;">🔊 点击</div>'
      + '</div>'
      + (w.pinyin?'<div style="font-size:11px;color:var(--muted);margin-top:4px;">'+w.pinyin+'</div>':'')
      + (w.meaning?'<div style="font-size:11px;color:var(--gold);margin-top:2px;">'+w.meaning+'</div>':'')
      + (srcPills?'<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:6px;">'+srcPills+'</div>':'')
      + (lessons?'<div style="font-size:9px;color:var(--muted);margin-top:4px;line-height:1.3;">'+lessons+'</div>':'')
      + '<div style="display:flex;gap:4px;justify-content:center;margin-top:8px;">'
      + '<button onclick="wcFlashCard('+i+')" style="font-size:10px;padding:3px 8px;border-radius:8px;border:1px solid var(--blue);background:var(--blue-light);color:var(--blue);cursor:pointer;font-family:\'DM Sans\',sans-serif;">📖 看</button>'
      + '<button onclick="wcMarkMastered(\''+safeChar+'\')" style="font-size:10px;padding:3px 8px;border-radius:8px;border:1px solid var(--green);background:var(--green-light);color:var(--green);cursor:pointer;font-family:\'DM Sans\',sans-serif;">✓ 会了</button>'
      + '</div>'
      + '</div>';
  });

  html += '</div>';

  el.innerHTML = html;
}

function wcMarkMastered(char){
  saveWC(loadWC().filter(function(w){ return w.char!==char; }));
  renderWrongChars();
}

// 点错字本里的字 → 播 TTS 读音
function wcPlayChar(char, el){
  if(typeof speakChinese !== 'function') return;
  if(el){
    el.style.transition = 'transform 0.15s';
    el.style.transform = 'scale(1.1)';
    setTimeout(()=>{ if(el) el.style.transform = ''; }, 800);
  }
  speakChinese(char);
}

// 切换错字本来源筛选
function wcSetFilter(val){
  window._wcFilter = val;
  renderWrongChars();
}

function wcClearAll(){
  if(confirm('确定清空所有错字记录吗？This will delete all mistake records.')){ saveWC([]); renderWrongChars(); }
}

var wcFlashIdx = 0;
var wcFlashList = [];

function wcFlashCard(idx){
  wcFlashList = loadWC().sort(function(a,b){ return (b.count||1)-(a.count||1); });
  wcFlashIdx = idx;
  wcShowFlash();
}

function wcPracticeAll(){
  wcFlashList = loadWC().sort(function(a,b){ return (b.count||1)-(a.count||1); });
  wcFlashIdx = 0;
  wcShowFlash();
}

function wcShowFlash(){
  var w = wcFlashList[wcFlashIdx];
  if(!w){ renderWrongChars(); return; }
  var el = document.getElementById('wc-content');
  var progress = Math.round((wcFlashIdx+1)/wcFlashList.length*100);

  var html = '<div style="text-align:center;margin-bottom:12px;">'
    + '<div style="font-size:12px;color:var(--muted);">'+(wcFlashIdx+1)+' / '+wcFlashList.length+' 错字</div>'
    + '<div style="height:4px;background:var(--paper3);border-radius:4px;margin:8px auto;max-width:300px;overflow:hidden;"><div style="width:'+progress+'%;height:100%;background:var(--red);border-radius:4px;transition:width 0.3s;"></div></div>'
    + '</div>'
    + '<div style="background:white;border:2px solid var(--border);border-radius:20px;padding:36px 24px;text-align:center;box-shadow:var(--shadow);margin-bottom:16px;">'
    + '<div style="font-size:11px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">你还记得这个字怎么读吗？</div>'
    + '<div style="font-family:\'Noto Serif SC\',serif;font-size:80px;color:var(--ink);line-height:1;margin-bottom:24px;">'+w.char+'</div>'
    + '<div id="wc-reveal-area">'
    + '<button onclick="wcReveal()" style="padding:12px 28px;border-radius:var(--radius);border:1px solid var(--border);background:var(--paper2);color:var(--ink);font-size:14px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">👁 看答案 · Reveal</button>'
    + '</div></div>'
    + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">';

  if(wcFlashIdx>0) html += '<button onclick="wcFlashIdx--;wcShowFlash()" style="padding:10px 18px;border-radius:var(--radius);border:1px solid var(--border);background:white;color:var(--muted);font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">← 上一个</button>';
  html += '<button onclick="renderWrongChars()" style="padding:10px 18px;border-radius:var(--radius);border:1px solid var(--border);background:white;color:var(--muted);font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">📋 返回列表</button>';
  if(wcFlashIdx<wcFlashList.length-1) html += '<button onclick="wcFlashIdx++;wcShowFlash()" style="padding:10px 18px;border-radius:var(--radius);border:none;background:var(--ink);color:white;font-size:13px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">下一个 →</button>';
  html += '</div>';
  el.innerHTML = html;
}

function wcReveal(){
  var w = wcFlashList[wcFlashIdx];
  var area = document.getElementById('wc-reveal-area');
  if(!area||!w) return;
  var utt = new SpeechSynthesisUtterance(w.char);
  utt.lang='zh-CN'; utt.rate=0.7;
  speechSynthesis.cancel(); speechSynthesis.speak(utt);

  var lessons = (w.lessons||[]).join('、');
  var srcs = (w.sources||[]).join('、');

  var html = '<div>'
    + '<div style="font-size:30px;font-weight:600;color:var(--blue);margin-bottom:8px;">'+(w.pinyin||'—')+'</div>'
    + (w.meaning?'<div style="font-size:16px;color:var(--ink);margin-bottom:8px;">'+w.meaning+'</div>':'')
    + (lessons?'<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">来自课文：'+lessons+'</div>':'')
    + (srcs?'<div style="font-size:11px;color:var(--muted);margin-bottom:16px;">错误来源：'+srcs+'</div>':'')
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">你答对了吗？Did you get it right?</div>'
    + '<div style="display:flex;gap:10px;justify-content:center;">'
    + '<button onclick="wcMarkMastered(\''+w.char+'\');wcFlashList.splice(wcFlashIdx,1);if(wcFlashIdx>=wcFlashList.length)wcFlashIdx=Math.max(0,wcFlashList.length-1);if(wcFlashList.length)wcShowFlash();else renderWrongChars();" style="padding:10px 20px;border-radius:var(--radius);border:none;background:var(--green);color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;">✓ 记住了！移除</button>'
    + '<button onclick="wcFlashIdx=(wcFlashIdx+1>=wcFlashList.length?0:wcFlashIdx+1);wcShowFlash();" style="padding:10px 20px;border-radius:var(--radius);border:1px solid var(--red);background:var(--red-light);color:var(--red);font-size:14px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;">✗ 还没记住</button>'
    + '</div></div>';
  area.innerHTML = html;
}


// ════════════════════════════════════════
// 真人录音时间戳数据 · REAL AUDIO TIMESTAMPS
// 按字切割，支持单字播放
// ════════════════════════════════════════

// Audio URIs stored separately (large)

let _raAudio = null;  // current HTMLAudioElement
let _raTimer = null;  // stop timer

function playRealAudioWord(lessonId, wordIdx){
  const data = REAL_AUDIO_DATA[lessonId];
  const uri  = REAL_AUDIO_URIS[lessonId];
  if(!data||!uri) return;
  const w = data.words[wordIdx];
  if(!w) return;

  // Stop any playing
  if(_raAudio){ _raAudio.pause(); _raAudio.currentTime=0; }
  clearTimeout(_raTimer);

  _raAudio = new Audio(uri);
  _raAudio.currentTime = w.start;
  _raAudio.play();

  // Stop at word end
  const duration = (w.end - w.start + 0.15) * 1000;
  _raTimer = setTimeout(()=>{ if(_raAudio){ _raAudio.pause(); } }, duration);
}

function playRealAudioFull(lessonId){
  const uri = REAL_AUDIO_URIS[lessonId];
  if(!uri) return;
  if(_raAudio){ _raAudio.pause(); }
  clearTimeout(_raTimer);
  _raAudio = new Audio(uri);
  _raAudio.play();
}

function hasRealAudioTimestamps(lessonId){
  return !!(REAL_AUDIO_DATA[lessonId]);
}

// ════════════════════════════════════════
// 教师后台 v2 · TEACHER PORTAL
// ════════════════════════════════════════

// ── Tab switching ──
function switchTeacherTab(tab) {
  ['classes','homework','students','redeem'].forEach(t => {
    const panel = document.getElementById('tpanel-' + t);
    const btn   = document.getElementById('ttab-' + t);
    if(panel) panel.style.display = t === tab ? 'block' : 'none';
    if(btn){
      btn.style.color       = t === tab ? 'var(--blue)' : 'var(--muted)';
      btn.style.borderBottom= t === tab ? '3px solid var(--blue)' : '3px solid transparent';
    }
  });
  if(tab === 'classes')  renderTeacherClassCards();
  if(tab === 'homework'){ switchTeacherHWTab('assign'); renderMyClassGrid(); updateClassIndicator(); }
  if(tab === 'redeem')   renderTeacherRedeemRequests();
}

function switchTeacherHWTab(sub) {
  const isAssign = sub === 'assign';
  const btnA = document.getElementById('thwtab-assign');
  const btnC = document.getElementById('thwtab-check');
  const pA   = document.getElementById('thwpanel-assign');
  const pC   = document.getElementById('thwpanel-check');
  if(btnA){ btnA.style.background = isAssign?'var(--blue)':'white'; btnA.style.color = isAssign?'white':'var(--muted)'; btnA.style.borderColor = isAssign?'var(--blue)':'var(--border)'; }
  if(btnC){ btnC.style.background = !isAssign?'var(--blue)':'white'; btnC.style.color = !isAssign?'white':'var(--muted)'; btnC.style.borderColor = !isAssign?'var(--blue)':'var(--border)'; }
  if(pA) pA.style.display = isAssign ? 'block' : 'none';
  if(pC) pC.style.display = !isAssign ? 'block' : 'none';
  if(isAssign){
    // Show placeholder until user types
    const ll = document.getElementById('teacher-lesson-list');
    const q = document.getElementById('hw-search')?.value||'';
    if(ll && !q) ll.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--muted);">输入关键词搜索课程，或点击上方「作业库」按进度浏览</div>';
    renderMyClassGrid();
    updateClassIndicator();
  }
  if(!isAssign) renderTeacherCheckPanel();
}

// ── Teacher info bar ──
function renderTeacherDashboard() {
  const bar = document.getElementById('teacher-user-bar');
  if(bar) bar.innerHTML =
    '<div style="background:linear-gradient(135deg,var(--blue),#1a3a6b);border-radius:20px;padding:20px 22px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 16px rgba(30,77,140,0.2);">'
    + '<div style="display:flex;align-items:center;gap:14px;">'
    + '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;">👩‍🏫</div>'
    + '<div><div style="font-size:20px;font-weight:600;color:white;">' + currentTeacher.name + '</div>'
    + '<div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;">育才中文 教师 · 班级：' + (currentTeacher.classes||[]).join('、') + '</div></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">'
    + '<button onclick="openChangePassword()" style="padding:7px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);color:white;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">🔒 密码</button>'
    + '<button onclick="switchTeacherAccount()" style="padding:7px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);color:white;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">🔄 切换账号 · Switch account</button>'
    + '<button onclick="doTeacherLogout()" style="padding:7px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);color:white;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">退出</button>'
    + '</div></div>';

  switchTeacherTab('classes');
  renderMyClassGrid();
  updateClassIndicator();
  renderAssignedList();
}

// ── 班级卡片 (参考截图) ──

// ── 班级元数据（名称+照片）存储 ──
function getClassMeta(cls) {
  return safeParseJSON(localStorage.getItem('czmd_cls_meta_' + cls), {});
}
function saveClassMeta(cls, meta) {
  localStorage.setItem('czmd_cls_meta_' + cls, JSON.stringify(meta));
  const metaByCode = safeParseJSON(localStorage.getItem('czmd_cls_meta_cloud_cache'), {});
  metaByCode[cls] = meta || {};
  localStorage.setItem('czmd_cls_meta_cloud_cache', JSON.stringify(metaByCode));
  cloudWriteRef(cloudAppDataRef('classes'), { metaByCode: {[cls]: meta||{}} });
}

// 打开班级名称编辑
function tcEditClassName(cls) {
  const meta = getClassMeta(cls);
  const current = meta.label || cls;
  const newName = prompt('编辑班级名称 · Edit class name\n（可以加上时间、老师等信息）', current);
  if(newName === null) return;
  meta.label = newName.trim() || cls;
  saveClassMeta(cls, meta);
  renderTeacherClassCards();
}

// 上传班级照片
function tcUploadPhoto(cls) {
  alert('班级照片云端上传稍后开放。当前已预留 photoUrl 字段，但还没有接 Firebase Storage。');
}

function tcRemovePhoto(cls) {
  const meta = getClassMeta(cls);
  delete meta.photo;
  delete meta.photoUrl;
  saveClassMeta(cls, meta);
  renderTeacherClassCards();
}

function renderTeacherClassCards() {
  const container = document.getElementById('tp-class-cards');
  if(!container || !currentTeacher) return;
  const classes = currentTeacher.classes || [];
  if(!classes.length) {
    container.innerHTML = '<div class="empty-review">暂无班级 · No classes assigned</div>';
    return;
  }
  // 如果有当前选中的班 → 显示该班详情（详细卡片）
  if(window._tcSelectedClass && classes.includes(window._tcSelectedClass)){
    renderTeacherSingleClassDetail(window._tcSelectedClass);
    return;
  }

  const users = loadUsers();
  const allHW  = getAssignedHW();
  // 顶部提示
  let html = '<div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">'
    + '<div><div style="font-size:18px;font-weight:700;color:var(--ink);">我的班级 · My Classes</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">点班级卡片查看详情和学生 · Tap a class card</div></div>'
    + '</div>';

  // ── 8 列响应式网格 ──
  html += '<div class="teacher-class-grid">';
  classes.forEach((cls) => {
    const meta = getClassMeta(cls);
    const label = meta.label || cls;
    const members = Object.entries(users).filter(([k,u]) => getStudentClasses(u).includes(cls));
    const activeHW  = allHW.filter(a => a.classCode === cls && !isHWExpired(a));
    html += '<div class="teacher-class-card" onclick="tcSelectClass(\''+cls+'\')">'
      // 学院 logo 圆环
      + '  <div class="tcc-logo-circle">'
      + '    <div class="tcc-logo-text">育</div>'
      + '    <div class="tcc-logo-sub">BSAKOO</div>'
      + '  </div>'
      // 班级名称（可换行）
      + '  <div class="tcc-name">' + label + '</div>'
      // 老师
      + '  <div class="tcc-teacher">👩‍🏫 ' + currentTeacher.name + '</div>'
      // 学生数 + 作业数
      + '  <div class="tcc-stats">'
      + '    <span>👥 ' + members.length + '</span>'
      + '    <span>📋 ' + activeHW.length + '</span>'
      + '  </div>'
      // 编辑按钮（右上角）
      + '  <button class="tcc-edit" onclick="event.stopPropagation();tcEditClassName(\''+cls+'\')" title="编辑">✏️</button>'
      + '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

// 点班级卡片 → 进入该班详情
function tcSelectClass(cls){
  window._tcSelectedClass = cls;
  renderTeacherClassCards();
}

// 详情页"返回班级列表"
function tcBackToClassList(){
  window._tcSelectedClass = null;
  renderTeacherClassCards();
}

// 渲染班级卡片里的单行作业进度（之前被调用但从未定义，导致有作业的班级点开就崩溃）。
// expired=true 时为已过期作业，整体置灰。
function tcHWRow(a, cls, members, expired){
  const completions = getHWCompletions(a.lessonId, cls);
  const done = completions.length;
  const total = Array.isArray(members) ? members.length : 0;
  const pct = total > 0 ? Math.round(done/total*100) : 0;
  const barColor = expired ? '#9ca3af' : (pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444');
  const titleColor = expired ? 'var(--muted)' : 'var(--ink)';
  const title = (a && a.lessonTitle) ? a.lessonTitle : (a && a.lessonId) || '';
  const sub = ((a && a.date) || '') + (a && a.deadlineLabel ? ' · ' + a.deadlineLabel : '') + (expired ? ' · 已过期' : '');
  return '<div style="background:white;border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);' + (expired?'opacity:0.7;':'') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="font-size:15px;font-weight:600;color:' + titleColor + ';">《' + title + '》</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + sub + '</div>'
    + '</div>'
    + '<div style="text-align:right;flex-shrink:0;margin-left:10px;">'
    + '<div style="font-size:22px;font-weight:700;color:' + barColor + ';">' + done + '/' + total + '</div>'
    + '<div style="font-size:11px;color:' + barColor + ';">' + pct + '% 完成</div>'
    + '</div></div>'
    + '<div style="height:6px;background:var(--paper3);border-radius:4px;overflow:hidden;">'
    + '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.5s;"></div></div>'
    + '</div>';
}

// 渲染单班级详细面板（保留原详细 UI 但加返回按钮）
function renderTeacherSingleClassDetail(cls){
  const container = document.getElementById('tp-class-cards');
  if(!container) return;
  const users = loadUsers();
  const allHW  = getAssignedHW();
  const meta = getClassMeta(cls);
  const label = meta.label || cls;
  const photo = meta.photo || '';
  const members = Object.entries(users).filter(([k,u]) => getStudentClasses(u).includes(cls));
  const activeHW  = allHW.filter(a => a.classCode === cls && !isHWExpired(a));
  const expiredHW = allHW.filter(a => a.classCode === cls && isHWExpired(a));
  let totalDone = 0;
  activeHW.forEach(a => { totalDone += getHWCompletions(a.lessonId, cls).length; });
  const totalPossible = activeHW.length * members.length;
  const overallPct = totalPossible > 0 ? Math.round(totalDone/totalPossible*100) : 0;
  const bgColor = 'linear-gradient(135deg,#1e4d8c,#2563eb)';
  const barColor = overallPct >= 80 ? '#22c55e' : overallPct >= 50 ? '#f59e0b' : '#ef4444';

  let html = '<button onclick="tcBackToClassList()" class="btn-home" style="margin-bottom:14px;">← 返回班级列表 · Back</button>';
  html += '<div style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);margin-bottom:4px;">'
    + '<div style="position:relative;height:160px;background:' + bgColor + ';overflow:hidden;cursor:pointer;" onclick="tcUploadPhoto(\''+cls+'\')">'
    + (photo
        ? '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;opacity:0.85;" />'
        : '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">'
          + '<div style="font-size:40px;opacity:0.6;">📸</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,0.7);">点击添加班级照片</div>'
          + '</div>')
    + '<div style="position:absolute;top:10px;right:10px;display:flex;gap:6px;">'
    + '<button onclick="event.stopPropagation();tcUploadPhoto(\''+cls+'\')" style="padding:5px 10px;border-radius:20px;border:none;background:rgba(255,255,255,0.25);backdrop-filter:blur(4px);color:white;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">📷 ' + (photo?'换图':'上传') + '</button>'
    + (photo ? '<button onclick="event.stopPropagation();tcRemovePhoto(\''+cls+'\')" style="padding:5px 10px;border-radius:20px;border:none;background:rgba(0,0,0,0.3);color:white;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">✕</button>' : '')
    + '</div>'
    + '<div style="position:absolute;bottom:12px;left:16px;">'
    + '<div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px;">班级代码</div>'
    + '<div style="font-size:22px;font-weight:800;color:white;letter-spacing:0.06em;text-shadow:0 2px 8px rgba(0,0,0,0.3);">' + cls + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="padding:16px 18px 10px;background:white;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="font-size:18px;font-weight:700;color:var(--ink);">' + label + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + members.length + ' 位学生</div>'
    + '</div>'
    + '<button onclick="tcEditClassName(\''+cls+'\')" style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--paper2);color:var(--muted);font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;flex-shrink:0;margin-left:10px;">✏️ 编辑名称</button>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">'
    + tcStatBox2('学生', members.length, '#1e4d8c','#eff6ff')
    + tcStatBox2('进行中', activeHW.length, '#b45309','#fefce8')
    + tcStatBox2('完成率', overallPct+'%', overallPct>=80?'#166534':overallPct>=50?'#92400e':'#991b1b', overallPct>=80?'#f0fdf4':overallPct>=50?'#fefce8':'#fef2f2')
    + '</div>'
    + (activeHW.length > 0
        ? '<div style="margin-bottom:14px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;"><span>作业完成进度</span><span>' + totalDone + '/' + totalPossible + ' 次</span></div>'
          + '<div style="height:8px;background:var(--paper3);border-radius:4px;overflow:hidden;">'
          + '<div style="width:' + overallPct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.5s;"></div></div>'
          + '</div>'
        : '')
    + (activeHW.length > 0
        ? activeHW.map(a => tcHWRow(a, cls, members)).join('')
        : '<div style="text-align:center;padding:12px;font-size:13px;color:var(--muted);background:var(--paper2);border-radius:12px;margin-bottom:10px;">暂无进行中作业</div>')
    + '<div style="display:flex;gap:8px;padding-top:10px;border-top:1px solid var(--border);margin-top:4px;">'
    + '<button onclick="tcOpenClassDetail(\''+cls+'\')" style="flex:1;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--paper2);color:var(--ink);font-size:13px;font-weight:500;cursor:pointer;font-family:DM Sans,sans-serif;">👤 学生名单</button>'
    + '<button onclick="tcAssignToClass(\''+cls+'\')" style="flex:1;padding:10px;border-radius:12px;border:none;background:var(--blue);color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">+ 布置作业</button>'
    + '<button onclick="tcCheckClassFromBtn(this)" data-cls="'+cls+'" style="flex:1;padding:10px;border-radius:12px;border:1px solid var(--green);background:var(--green-light);color:var(--green);font-size:13px;font-weight:500;cursor:pointer;font-family:DM Sans,sans-serif;">✅ 检查任务</button>'
    + '</div>'
    + (expiredHW.length > 0
        ? '<div style="text-align:center;margin-top:8px;"><button onclick="tcToggleExpired(\''+cls+'\')" style="font-size:11px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:DM Sans,sans-serif;">查看已过期作业 (' + expiredHW.length + ') ›</button></div>'
          + '<div id="tc-expired-' + cls + '" style="display:none;margin-top:8px;">' + expiredHW.map(a => tcHWRow(a, cls, members, true)).join('') + '</div>'
        : '')
    + '</div>'
    + '</div>';

  container.innerHTML = html;
}

function tcStatBox2(label, val, textColor, bgColor) {
  return '<div style="background:' + bgColor + ';border-radius:10px;padding:10px 8px;text-align:center;">'
    + '<div style="font-size:20px;font-weight:700;color:' + textColor + ';">' + val + '</div>'
    + '<div style="font-size:11px;color:' + textColor + ';opacity:0.7;margin-top:2px;">' + label + '</div>'
    + '</div>';
}

function tcToggleExpired(cls) {
  const el = document.getElementById('tc-expired-' + cls);
  if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function tcOpenClassDetail(cls) {
  openTeacherClassDetail(cls);
}

function tcAssignToClass(cls) {
  selectTeacherClass(cls);
  switchTeacherTab('homework');
  switchTeacherHWTab('assign');
}

// ── 检查任务面板 ──
let tcCheckClass = '';

function tcCheckClassFromBtn(btn) {
  tcCheckClass = btn.dataset.cls;
  switchTeacherTab('homework');
  switchTeacherHWTab('check');
  renderTeacherCheckPanel();
}
function tcSetCheckClass(cls) {
  tcCheckClass = cls;
}

function renderTeacherCheckPanel() {
  const classes = currentTeacher ? (currentTeacher.classes||[]) : [];
  if(!tcCheckClass && classes.length) tcCheckClass = classes[0];

  // Class filter buttons
  const filterEl = document.getElementById('tp-check-class-filter');
  if(filterEl) filterEl.innerHTML = classes.map(cls =>
    '<button onclick="tcCheckClass=' + JSON.stringify(cls) + ';tcCheckClass=JSON.parse(tcCheckClass);renderTeacherCheckTable()" '
    + 'style="padding:7px 16px;border-radius:20px;border:2px solid ' + (cls===tcCheckClass?'var(--blue)':'var(--border)') + ';'
    + 'background:' + (cls===tcCheckClass?'var(--blue)':'white') + ';'
    + 'color:' + (cls===tcCheckClass?'white':'var(--muted)') + ';'
    + 'font-size:13px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;">' + cls + '</button>'
  ).join('');

  renderTeacherCheckTable();
}

function renderTeacherCheckTable() {
  const el = document.getElementById('tp-check-content');
  if(!el || !tcCheckClass) return;
  const cls = tcCheckClass;

  // Refresh filter button styles
  const filterEl = document.getElementById('tp-check-class-filter');
  if(filterEl) {
    filterEl.querySelectorAll('button').forEach(btn => {
      const isCls = btn.textContent.trim() === cls;
      btn.style.background   = isCls ? 'var(--blue)' : 'white';
      btn.style.color        = isCls ? 'white' : 'var(--muted)';
      btn.style.borderColor  = isCls ? 'var(--blue)' : 'var(--border)';
    });
  }

  const users = loadUsers();
  const members = Object.entries(users).filter(([k,u]) => getStudentClasses(u).includes(cls));
  const allHW   = getAssignedHW().filter(a => a.classCode === cls);
  const activeHW  = allHW.filter(a => !isHWExpired(a));
  const expiredHW = allHW.filter(a => isHWExpired(a));

  if(!allHW.length) {
    el.innerHTML = '<div class="empty-review" style="text-align:center;padding:40px 0;">该班暂无布置的作业</div>';
    return;
  }

  function hwSection(hwList, title, color) {
    if(!hwList.length) return '';
    return '<div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:' + color + ';margin:16px 0 10px;">' + title + '</div>'
      + hwList.map(a => {
          const completions = getHWCompletions(a.lessonId, cls);
          const done = completions.length;
          const total = members.length;
          const pct = total > 0 ? Math.round(done/total*100) : 0;
          const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
          const doneNames = completions.map(c => c.username);
          const notDone = members.filter(([k,u]) => !doneNames.includes(u.username||u.name));
          return '<div style="background:white;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
            + '<div>'
            + '<div style="font-size:15px;font-weight:600;color:var(--ink);">《' + a.lessonTitle + '》</div>'
            + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">' + a.date + (a.deadlineLabel ? ' · ' + a.deadlineLabel : '') + '</div>'
            + '</div>'
            + '<div style="text-align:right;">'
            + '<div style="font-size:24px;font-weight:700;color:' + barColor + ';">' + done + '/' + total + '</div>'
            + '<div style="font-size:11px;color:' + barColor + ';">' + pct + '% 完成</div>'
            + '</div></div>'
            + '<div style="height:6px;background:var(--paper3);border-radius:4px;margin-bottom:12px;overflow:hidden;">'
            + '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;"></div></div>'
            + '<div style="display:flex;gap:12px;">'
            // Done column
            + '<div style="flex:1;">'
            + '<div style="font-size:11px;font-weight:600;color:#166534;margin-bottom:5px;">✅ 已完成 (' + done + ')</div>'
            + (done > 0
                ? completions.map(c =>
                    '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:#f0fdf4;border-radius:6px;margin-bottom:3px;">'
                    + '<span style="font-size:12px;color:#166534;">' + (c.name||c.username) + '</span>'
                    + '<span style="font-size:11px;font-weight:600;color:#16a34a;">' + c.pct + '%</span>'
                    + '</div>'
                  ).join('')
                : '<div style="font-size:12px;color:var(--muted);font-style:italic;">暂无</div>')
            + '</div>'
            // Not done column
            + '<div style="flex:1;">'
            + '<div style="font-size:11px;font-weight:600;color:#991b1b;margin-bottom:5px;">⏳ 未完成 (' + notDone.length + ')</div>'
            + (notDone.length > 0
                ? notDone.map(([k,u]) =>
                    '<div style="padding:4px 8px;background:#fef2f2;border-radius:6px;margin-bottom:3px;">'
                    + '<span style="font-size:12px;color:#991b1b;">' + (u.name||u.username) + '</span>'
                    + '</div>'
                  ).join('')
                : '<div style="font-size:12px;color:#166534;font-weight:600;">🎉 全班完成！</div>')
            + '</div></div></div>';
        }).join('');
  }

  el.innerHTML = hwSection(activeHW, '进行中 · Active', 'var(--blue)')
               + hwSection(expiredHW, '已过期 · Expired', 'var(--muted)');
}

// ── Homework completion tracking ──
function getHWCompletions(lessonId, classCode) {
  const key = 'czmd_hw_completion_' + lessonId + '_' + classCode;
  return safeParseJSON(localStorage.getItem(key), []);
}

function saveHWCompletion(lessonId, classCode, entry) {
  const key = 'czmd_hw_completion_' + lessonId + '_' + classCode;
  const list = getHWCompletions(lessonId, classCode);
  const idx = list.findIndex(e => e.username===entry.username && e.mode===entry.mode);
  if(idx >= 0){ if(entry.pct > list[idx].pct) list[idx] = entry; }
  else list.push(entry);
  localStorage.setItem(key, JSON.stringify(list));
  cloudWriteRef(cloudAppDataRef('hwCompletion_' + encodeURIComponent(lessonId + '_' + classCode)), {
    lessonId, classCode, items:list
  });
}

function submitHWCompletion(lessonId, mode, pct) {
  if(!currentUser || !lessonId) return;
  // ★ pct = 0 不算（孩子没真做，瞎点开又关掉）
  if(typeof pct !== 'number' || pct <= 0) return;
  // ★ challenge 和 reading 算同一个模式（朗读练习）
  if(mode === 'challenge') mode = 'reading';
  const hw = getAssignedHW();
  const studentClasses = getStudentClasses(currentUser);
  const matchedHW = hw.find(a => a.lessonId===lessonId && studentClasses.includes(a.classCode) && !isHWExpired(a));
  if(!matchedHW) return;
  const entry = {
    username: currentUser.username||currentUser.name,
    name: currentUser.name||currentUser.username,
    mode, pct: Math.round(pct),
    date: new Date().toLocaleDateString('zh-CN'),
    ts: Date.now()
  };
  saveHWCompletion(lessonId, matchedHW.classCode, entry);
  showHWCompletionBanner(matchedHW.lessonTitle||lessonId, pct);
}

function showHWCompletionBanner(title, pct) {
  const old = document.getElementById('hw-submit-banner');
  if(old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'hw-submit-banner';
  banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#16a34a;color:white;padding:12px 24px;border-radius:30px;font-size:14px;font-weight:600;font-family:\'DM Sans\',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;animation:fadeIn 0.3s ease;white-space:nowrap;';
  banner.innerHTML = '✅ 作业已提交 · Submitted (' + Math.round(pct) + '%)';
  document.body.appendChild(banner);
  setTimeout(() => { if(banner.parentNode) banner.remove(); }, 3000);
}


const READING_SUBMODULES = {
  graded:  {icon:'📚', title:'绘本故事分级阅读', sub:'Graded Picture Book Reading', desc:''},
  graded1: {icon:'⭐',      title:'绘本分级阅读 · 一级', sub:'Level 1 · Beginner',     desc:'一级绘本内容正在整理中，敬请期待！<br>Level 1 picture books are being prepared.'},
  graded2: {icon:'⭐⭐',    title:'绘本分级阅读 · 二级', sub:'Level 2 · Elementary',   desc:'二级绘本内容正在整理中，敬请期待！<br>Level 2 picture books are being prepared.'},
  graded3: {icon:'⭐⭐⭐',  title:'绘本分级阅读 · 三级', sub:'Level 3 · Intermediate', desc:'三级绘本内容正在整理中，敬请期待！<br>Level 3 picture books are being prepared.'},
  graded4: {icon:'⭐⭐⭐⭐',title:'绘本分级阅读 · 四级', sub:'Level 4 · Advanced',     desc:'四级绘本内容正在整理中，敬请期待！<br>Level 4 picture books are being prepared.'},
  chengyu: {icon:'🏮', title:'成语故事', sub:'Chengyu Stories', desc:'成语故事内容正在整理中，敬请期待！<br>Chengyu story content is being prepared.'},
  yuyan:   {icon:'🦊', title:'寓言故事', sub:'Fable Stories',   desc:'寓言故事内容正在整理中，敬请期待！<br>Fable story content is being prepared.'},
  tonghua: {icon:'🧚', title:'童话故事', sub:'Fairy Tales',     desc:'童话故事内容正在整理中，敬请期待！<br>Fairy tale content is being prepared.'},
};


// ── 绘本数据 · Picture Book Data ──

function openReadingSubModule(type){
  const m = READING_SUBMODULES[type];
  if(!m) return;
  document.getElementById('rsub-icon').textContent = m.icon;
  document.getElementById('rsub-title').textContent = m.title;
  document.getElementById('rsub-sub').textContent = m.sub;

  const content = document.getElementById('rsub-content');
  if(type === 'graded'){
    // Show 4 level cards
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;">
        ${[
          {key:'graded1', stars:'⭐',      level:'一级', en:'Level 1 · Beginner',     color:'#e3f2fd', border:'#64b5f6', text:'#1565c0'},
          {key:'graded2', stars:'⭐⭐',    level:'二级', en:'Level 2 · Elementary',   color:'#e8f5e9', border:'#81c784', text:'#2e7d32'},
          {key:'graded3', stars:'⭐⭐⭐',  level:'三级', en:'Level 3 · Intermediate', color:'#fff8e1', border:'#ffca28', text:'#f57f17'},
          {key:'graded4', stars:'⭐⭐⭐⭐',level:'四级', en:'Level 4 · Advanced',     color:'#fce4ec', border:'#f06292', text:'#880e4f'},
        ].map(l=>`
          <div style="background:${l.color};border:2px solid ${l.border};border-radius:20px;padding:24px 16px;text-align:center;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''"
            onclick="openGradedLevel('${l.key}')">
            <div style="font-size:32px;margin-bottom:10px;">${l.stars}</div>
            <div style="font-family:serif;font-size:22px;font-weight:600;color:${l.text};margin-bottom:4px;">${l.level}</div>
            <div style="font-size:12px;color:${l.text};opacity:0.8;">${l.en}</div>
          </div>`).join('')}
      </div>`;
  } else {
    content.innerHTML = `
      <div style="background:white;border:2px dashed var(--border);border-radius:var(--radius);padding:48px 24px;text-align:center;box-shadow:var(--shadow);">
        <div style="font-size:48px;margin-bottom:16px;">🚧</div>
        <div style="font-size:16px;font-weight:500;color:var(--ink);margin-bottom:8px;">即将上线 · Coming Soon</div>
        <div style="font-size:13px;color:var(--muted);">${m.desc}</div>
      </div>`;
  }
  showScreen('reading-sub');
}

function openGradedLevel(key){
  const levelNames = {graded1:'一级 · Level 1', graded2:'二级 · Level 2', graded3:'三级 · Level 3', graded4:'四级 · Level 4'};
  const builtinBooks = PICTURE_BOOKS[key] || [];

  // Merge with library books (type='books')
  const libraryBooks = getResources().filter(r => r.type==='books');

  const container = document.getElementById('graded-level-container');
  document.getElementById('graded-back-btn').onclick = ()=> openReadingSubModule('graded');

  const totalBooks = builtinBooks.length + libraryBooks.length;

  const builtinCards = builtinBooks.map((book,i)=>`
    <div onclick="openPicBook('${key}',${i})"
      style="background:white;border:2px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:var(--shadow);transition:all 0.2s;"
      onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="aspect-ratio:4/3;overflow:hidden;background:#f5f5f5;">
        <img src="${book.cover}" style="width:100%;height:100%;object-fit:cover;" alt="${book.title}"/>
      </div>
      <div style="padding:10px;">
        <div style="font-family:'Noto Serif SC',serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:2px;">${book.title}</div>
        <div style="font-size:10px;color:var(--muted);">${book.level} · ${book.slides.length}页</div>
      </div>
    </div>`).join('');

  const libraryCards = libraryBooks.map((r,i)=>{
    const hasFile = !!r.dataUrl;
    const hasUrl  = !!r.url;
    return `<div onclick="${hasFile?`openLibraryBook(${getResources().indexOf(r)})`:`window.open('${r.url}','_blank')`}"
      style="background:white;border:2px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:var(--shadow);transition:all 0.2s;"
      onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
      <div style="aspect-ratio:4/3;background:linear-gradient(135deg,#f0e6ff,#e6f0ff);display:flex;align-items:center;justify-content:center;font-size:48px;">
        ${r.icon||'📚'}
      </div>
      <div style="padding:10px;">
        <div style="font-family:'Noto Serif SC',serif;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px;">${r.title}</div>
        <div style="font-size:10px;color:var(--muted);">${hasFile?'文件 · 点击查看':hasUrl?'链接 · 点击打开':'资料库'} · ${r.created||''}</div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="font-family:serif;font-size:20px;color:var(--ink);margin-bottom:4px;">📚 绘本故事</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">点击绘本开始阅读 · Tap to read</div>
    ${totalBooks===0 ? `
      <div style="background:white;border:2px dashed var(--border);border-radius:var(--radius);padding:48px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🚧</div>
        <div style="font-size:15px;font-weight:500;color:var(--ink);">即将上线 · Coming Soon</div>
        <div style="font-size:13px;color:var(--muted);margin-top:8px;">老师可在资料库上传绘本</div>
      </div>` : `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
      ${builtinCards}${libraryCards}
    </div>`}`;

  showScreen('graded-level');
}

// Open a library resource (PDF or image) in a simple viewer
function openLibraryBook(resIdx){
  const resources = getResources();
  const r = resources[resIdx];
  if(!r) return;
  if(r.url){ window.open(r.url,'_blank'); return; }
  if(r.dataUrl){
    // Open in new tab/window
    const w = window.open('','_blank');
    if(w){
      w.document.write('<html><head><title>'+r.title+'</title></head><body style="margin:0;background:#222;display:flex;justify-content:center;">'
        +'<img src="'+r.dataUrl+'" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body></html>');
    }
  }
}

// ── 绘本阅读器 · Picture Book Reader ──
let pbBook = null;
let pbPage = 0;
let pbAudio = null;
let pbTouchStartX = 0;

function openPicBook(levelKey, bookIdx){
  pbBook = PICTURE_BOOKS[levelKey]?.[bookIdx];
  if(!pbBook) return;
  pbPage = 0;
  pbRecordedPages = new Set();
  pbReadingMode = false;
  pbRecordingPage = -1;
  if(pbRecorder){ try{pbRecorder.stop();}catch(e){} pbRecorder=null; }
  pbStopAudio();
  renderPicBook();
  showScreen('picbook');
  setTimeout(()=> pbPlayPage(), 600);
}

function exitPicBook(){
  pbStopAudio();
  showScreen('graded-level');
}

function pbStopAudio(){
  if(pbAudio){ pbAudio.pause(); pbAudio=null; }
}

function pbPlayPage(){
  if(!pbBook?.audio) return;
  const ts = pbBook.pageTimestamps || [];
  const startT = ts[pbPage] || 0;
  const nextTs = ts[pbPage+1];

  pbStopAudio();
  const audio = new Audio(pbBook.audio);
  pbAudio = audio;

  audio.addEventListener('canplay', ()=>{
    audio.currentTime = startT;
    audio.play().catch(()=>{});
    const btn = document.getElementById('pb-play-btn');
    if(btn) btn.innerHTML='⏸ 暂停';
  }, {once:true});

  audio.ontimeupdate = ()=>{
    if(!pbAudio || !nextTs) return;
    if(audio.currentTime >= nextTs - 0.05){
      audio.ontimeupdate = null;
      audio.pause();
      pbAudio = null;
      const b = document.getElementById('pb-play-btn');
      if(b) b.innerHTML='▶ 播放';
    }
  };

  audio.onended = ()=>{
    pbAudio=null;
    const b=document.getElementById('pb-play-btn');
    if(b) b.innerHTML='▶ 播放';
  };

  audio.load();
}

function pbToggleAudio(){
  if(pbAudio && !pbAudio.paused){
    pbAudio.pause();
    const btn=document.getElementById('pb-play-btn');
    if(btn) btn.innerHTML='▶ 播放';
  } else if(pbAudio && pbAudio.paused){
    pbAudio.play();
    const btn=document.getElementById('pb-play-btn');
    if(btn) btn.innerHTML='⏸ 暂停';
  } else {
    pbPlayPage();
  }
}

function pbGoPage(dir){
  if(!pbBook) return;
  const newPage = pbPage + dir;
  if(newPage < 0 || newPage >= pbBook.slides.length) return;
  pbPage = newPage;
  pbStopAudio();
  renderPicBook();
  setTimeout(()=> pbPlayPage(), 100);
}

function pbJumpPage(idx){
  pbPage = idx;
  pbStopAudio();
  renderPicBook();
  setTimeout(()=> pbPlayPage(), 100);
}

function pbHandleSwipe(e){
  const dx = e.changedTouches[0].clientX - pbTouchStartX;
  if(Math.abs(dx) < 40) return;
  pbGoPage(dx < 0 ? 1 : -1);
}

// Recording state
let pbRecorder = null;
let pbRecordedPages = new Set(); // pages where student recorded something
let pbRecordingPage = -1;
let pbReadingMode = false; // true = student is doing read-along

function pbStartReadingMode(){
  pbReadingMode = true;
  pbRecordedPages = new Set();
  pbJumpPage(0); // start from page 1
}

function pbToggleRecord(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ alert('请用Chrome或Edge · Use Chrome or Edge'); return; }

  if(pbRecorder){ // stop recording
    try{ pbRecorder.stop(); }catch(e){}
    pbRecorder = null;
    pbUpdateRecordBtn(false);
    return;
  }

  pbStopAudio(); // stop playback while recording
  pbRecordingPage = pbPage;
  pbUpdateRecordBtn(true);

  const rec = new SpeechRecognition();
  pbRecorder = rec;
  rec.lang = 'zh-CN';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let heard = false;
  rec.onresult = ()=>{ heard = true; };

  rec.onend = ()=>{
    pbRecorder = null;
    pbUpdateRecordBtn(false);
    // Mark page as done (heard something or not — generous scoring)
    pbRecordedPages.add(pbRecordingPage);
    // Show small checkmark on current page indicator
    pbUpdatePageCheck();
    // If all pages recorded, show result
    if(pbRecordedPages.size >= pbBook.slides.length){
      setTimeout(()=> pbShowReadResult(true), 400);
    }
  };

  rec.onerror = ()=>{
    pbRecorder = null;
    pbUpdateRecordBtn(false);
    // Still mark as attempted
    pbRecordedPages.add(pbRecordingPage);
    pbUpdatePageCheck();
  };

  try{ rec.start(); } catch(e){ pbRecorder=null; pbUpdateRecordBtn(false); }
}

function pbUpdateRecordBtn(recording){
  const btn = document.getElementById('pb-rec-btn');
  if(!btn) return;
  if(recording){
    btn.style.background='var(--red)';
    btn.style.animation='pbRecPulse 0.8s infinite';
    btn.innerHTML='🔴 跟读中…';
  } else {
    btn.style.background='#e91e63';
    btn.style.animation='';
    btn.innerHTML='🎙️ 跟读';
  }
}

function pbUpdatePageCheck(){
  // Update dot indicators to show checkmarks
  pbBook.slides.forEach((_,i)=>{
    const dot = document.getElementById('pb-dot-'+i);
    if(dot && pbRecordedPages.has(i)){
      dot.style.background='var(--green)';
      dot.style.width = i===pbPage ? '22px' : '10px';
    }
  });
}

function pbShowReadResult(completed){
  const total = pbBook.slides.length;
  const done = pbRecordedPages.size;
  // Generous scoring: completed all pages = 30pts, partial = 20pts
  const pts = done >= total ? 30 : done > 0 ? 20 : 0;
  const container = document.getElementById('picbook-container');
  container.innerHTML = `
    <div style="text-align:center;padding:24px 0;">
      <div style="font-size:60px;margin-bottom:12px;">${pts===30?'🌟':'⭐'}</div>
      <div style="font-family:serif;font-size:24px;color:var(--ink);margin-bottom:8px;">
        ${pts===30?'太棒了！Well done!':'不错！Good effort!'}
      </div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:20px;">
        跟读了 ${done}/${total} 页 · Read along ${done}/${total} pages
      </div>
      <div style="background:var(--gold-light);border:2px solid var(--gold);border-radius:20px;padding:20px;max-width:160px;margin:0 auto 24px;">
        <div style="font-size:48px;font-weight:800;color:var(--gold);">${pts}</div>
        <div style="font-size:13px;color:var(--gold);">/ 30 分</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="auth-btn" onclick="pbStartReadingMode()" style="display:inline-block;width:auto;padding:10px 20px;">🔄 再读一遍</button>
        <button class="auth-btn" onclick="exitPicBook()" style="display:inline-block;width:auto;padding:10px 20px;background:var(--paper2);color:var(--ink);">← 返回</button>
      </div>
    </div>`;
  // Award points
  if(pts>0){
    const result = recordLessonPlay('picbook_' + (pbBook && pbBook.title || ''), '绘本朗读', Math.round(pts/30*100));
    showPointsToast(result);
  }
}

function renderPicBook(){
  if(!pbBook) return;
  const total = pbBook.slides.length;
  const container = document.getElementById('picbook-container');
  const allDone = pbReadingMode && pbRecordedPages.size >= total;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-family:'Noto Serif SC',serif;font-size:18px;font-weight:700;color:var(--ink);">${pbBook.title}</div>
        <div style="font-size:11px;color:var(--muted);">${pbBook.level} · 第 ${pbPage+1} / ${total} 页</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button id="pb-play-btn" onclick="pbToggleAudio()"
          style="background:var(--blue);color:white;border:none;border-radius:20px;padding:7px 14px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">▶ 播放</button>
        <button id="pb-rec-btn" onclick="pbToggleRecord()"
          style="background:#e91e63;color:white;border:none;border-radius:20px;padding:7px 14px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;
          ${pbRecordedPages.has(pbPage)?'opacity:0.7;':''}">
          ${pbRecordedPages.has(pbPage)?'✓ 跟读':'🎙️ 跟读'}
        </button>
        <button onclick="pbJumpPage(0)"
          style="background:var(--paper2);color:var(--ink);border:1px solid var(--border);border-radius:20px;padding:7px 10px;font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">🔄</button>
      </div>
    </div>

    <div id="pb-slide-wrap" style="position:relative;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.15);margin-bottom:14px;background:#fff;touch-action:pan-y;"
      ontouchstart="pbTouchStartX=event.touches[0].clientX"
      ontouchend="pbHandleSwipe(event)">
      <img src="${pbBook.slides[pbPage]}" style="width:100%;display:block;border-radius:20px;user-select:none;" draggable="false"/>
      ${pbPage>0?`<div onclick="pbGoPage(-1)" style="position:absolute;left:0;top:0;width:25%;height:100%;cursor:pointer;display:flex;align-items:center;padding-left:10px;background:linear-gradient(to right,rgba(0,0,0,0.12),transparent);">
        <div style="background:rgba(255,255,255,0.88);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;">‹</div></div>`:''}
      ${pbPage<total-1?`<div onclick="pbGoPage(1)" style="position:absolute;right:0;top:0;width:25%;height:100%;cursor:pointer;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;background:linear-gradient(to left,rgba(0,0,0,0.12),transparent);">
        <div style="background:rgba(255,255,255,0.88);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;">›</div></div>`:''}
      ${pbRecordedPages.has(pbPage)?`<div style="position:absolute;top:10px;right:10px;background:var(--green);color:white;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">✓ 跟读完成</div>`:''}
    </div>

    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
      ${pbBook.slides.map((_,i)=>`
        <div id="pb-dot-${i}" onclick="pbJumpPage(${i})"
          style="width:${i===pbPage?'22px':'8px'};height:8px;border-radius:4px;cursor:pointer;transition:all 0.25s;
          background:${pbRecordedPages.has(i)?'var(--green)':i===pbPage?'var(--blue)':'var(--border)'};"></div>`).join('')}
    </div>

    <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:12px;">
      👈 滑动翻页 · 先听再跟读每一页 · Swipe to turn · Listen then read along
    </div>

    ${pbPage===total-1 && pbRecordedPages.has(total-1)?`
    <div style="text-align:center;padding:16px;background:var(--green-light);border-radius:var(--radius);border:1px solid var(--green);">
      <div style="font-size:36px;margin-bottom:6px;">🎉</div>
      <div style="font-family:serif;font-size:17px;color:var(--green);">跟读完成！</div>
      <button onclick="pbShowReadResult(true)" style="margin-top:10px;background:var(--green);color:white;border:none;border-radius:20px;padding:8px 20px;font-size:13px;cursor:pointer;font-family:DM Sans,sans-serif;">查看得分 →</button>
    </div>`:pbPage===total-1?`
    <div style="text-align:center;padding:16px;background:var(--gold-light);border-radius:var(--radius);border:1px solid var(--gold);">
      <div style="font-size:17px;color:var(--gold);font-weight:500;">每页都跟读一次，完成后可以得分！</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">Read along each page to earn points · ${pbRecordedPages.size}/${total} 完成</div>
    </div>`:''}
  `;

  // Add pulse animation style
  if(!document.getElementById('pb-rec-style')){
    const s=document.createElement('style');
    s.id='pb-rec-style';
    s.textContent='@keyframes pbRecPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.95)}}';
    document.head.appendChild(s);
  }
}

function openStudentHW(){
  showScreen('student-hw');
  renderStudentHW();
}

function renderStudentHW(){
  if(!currentUser) return;
  const allClasses = getStudentClasses(currentUser);
  // ★ 过滤掉识字测验（它们用单独的"识字测验" tab 显示，不在课后作业里）
  const allHW = getAssignedHW().filter(a=>
    allClasses.includes(a.classCode) &&
    !(a.lessonId && a.lessonId.indexOf('__exam__:')===0)
  );
  const el = document.getElementById('student-hw-list');

  if(!allHW.length){
    el.innerHTML=`
      <div class="shw-empty">
        <span class="shw-empty-icon">😊</span>
        <div style="font-size:16px;font-weight:500;color:var(--ink);margin-bottom:6px;">暂时没有作业</div>
        <div style="font-size:13px;color:var(--muted);">No homework assigned yet · Check back later!</div>
      </div>`;
    return;
  }

  el.innerHTML = allHW.map(hw=>{
    const expired = isHWExpired(hw);
    const lesson = NATIVE_LESSONS.find(l=>l.id===hw.lessonId);
    const code = getLessonCode(hw.lessonId);

    // ★ 检查是否完成所有模式（已完成印章）
    const completed = isLessonFullyCompletedForUser(hw.lessonId, hw.classCode, lesson);

    // Days remaining
    let deadlineHtml='', cardClass='', clickAction='';
    if(expired){
      deadlineHtml=`<span class="shw-deadline expired">⚠️ 已过期 · Expired</span>`;
      cardClass='expired';
    } else if(hw.deadlineType==='daily'){
      deadlineHtml=`<span class="shw-deadline active">📅 作业类型：按天打卡 · Check in daily</span>`;
      clickAction=`openLevelDetail('${hw.lessonId}')`;
    } else if(hw.deadlineType==='week'){
      deadlineHtml=`<span class="shw-deadline active">📋 作业类型：一周内完成 · Complete within a week</span>`;
      clickAction=`openLevelDetail('${hw.lessonId}')`;
    } else if(hw.deadlineType==='custom' && hw.dueDate){
      const startDate = new Date(hw.date.replace(/\//g,'-'));
      const dueDate = new Date(hw.dueDate);
      const fmt = d=>`${d.getMonth()+1}.${d.getDate()}`;
      deadlineHtml=`<span class="shw-deadline active">🗓️ 作业类型：此时间内完成 · Complete by ${fmt(startDate)}–${fmt(dueDate)}</span>`;
      clickAction=`openLevelDetail('${hw.lessonId}')`;
    } else {
      deadlineHtml=`<span class="shw-deadline active">✅ ${hw.deadlineLabel||'进行中'}</span>`;
      clickAction=`openLevelDetail('${hw.lessonId}')`;
    }

    const onclickAttr = (!expired && clickAction) ? ` onclick="${clickAction}"` : '';
    // ★ 已完成印章（红色圆形，绝对定位在右上角）
    const stampHtml = completed
      ? '<div class="hw-completed-stamp"><div class="hw-completed-stamp-inner">已完成<br><span style="font-size:9px;letter-spacing:0;">COMPLETED</span></div></div>'
      : '';

    return `
      <div class="student-hw-card ${cardClass}"${onclickAttr} style="position:relative;">
        ${stampHtml}
        <div class="shw-title">${code?`<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:10px;margin-right:6px;">${code}</span>`:''}${hw.lessonTitle}</div>
        <div class="shw-level">${hw.lessonLevel} · ${lesson?lesson.words.length+'个生字':''}</div>
        <div>${deadlineHtml}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;">布置于 ${hw.date} · 老师：${hw.teacher}</div>
      </div>`;
  }).join('');
}

// ── 判断学生是否对某课完成了所有模式 ──
function isLessonFullyCompletedForUser(lessonId, classCode, lesson){
  if(!currentUser || !lesson) return false;
  const completions = getHWCompletions(lessonId, classCode);
  const myName = currentUser.username || currentUser.name;
  const myCompletions = completions.filter(c => (c.username===myName) || (c.name===myName));
  if(!myCompletions.length) return false;
  // 计算该课该有的 mode 集合（参照 openLevelDetail 里的逻辑）
  const noPinyinLevels = ['一年级 Level 1','一年级 Level 2','二年级 Level 1','H 识字阅读 Level 1','H 识字阅读 Level 2'];
  const isPinyinFree = noPinyinLevels.includes(lesson.level);
  const isHLevel1 = lesson.level === 'H 识字阅读 Level 1' || lesson.level === 'H 识字阅读 Level 2';
  let requiredModes;
  if(isHLevel1){
    requiredModes = ['listen','listenrecord','reading'];
  } else if(isPinyinFree){
    requiredModes = ['flashcard','listen','reading'];
  } else {
    requiredModes = ['flashcard','multiple','type','reading'];
  }
  // 检查每个 mode 是否都至少完成过一次
  const completedModeKeys = new Set(myCompletions.map(c => c.mode));
  // mode 标签是 key 还是 chinese name？看 saveHWCompletion 传的是什么
  // 实际数据格式可能是中文（"看词说拼音"等）；做宽松匹配
  const modeNameMap = {
    'flashcard':['flashcard','看词说拼音','翻卡片'],
    'multiple':['multiple','选择拼音','选择题'],
    'type':['type','拼音拼写','拼写练习'],
    'listen':['listen','听音选字'],
    'listenrecord':['listenrecord','听读练习'],
    'reading':['reading','朗读练习']
  };
  return requiredModes.every(mk => {
    const aliases = modeNameMap[mk] || [mk];
    return aliases.some(alias => completedModeKeys.has(alias));
  });
}

// ── Level grid builder (used by openStudentHW to jump to lesson) ──
function buildLevelGrid(){
  const grid = document.getElementById('level-map-grid');
  if(!grid) return;
  const levels = {};
  NATIVE_LESSONS.forEach(l=>{ if(!levels[l.level]) levels[l.level]=[]; levels[l.level].push(l); });
  const order = Object.keys(LEVEL_COLORS);
  const sortedLevels = Object.keys(levels).sort((a,b)=>{
    return (order.indexOf(a)||99)-(order.indexOf(b)||99);
  });
  grid.innerHTML = sortedLevels.map(levelName=>{
    const color=LEVEL_COLORS[levelName]||'#b8922a';
    const lessons=levels[levelName];
    const hasReview=!!UNIT_REVIEWS[levelName];
    return `
      <div class="level-group">
        <div class="level-group-label">${levelName}</div>
        <div class="level-cards">
          ${lessons.map(l=>`
            <div class="level-card" style="--lc:${color}" onclick="openLevelDetail('${l.id}')">
              <div class="level-card-title">${l.title}</div>
              <div class="level-card-sub">${l.subtitle}</div>
              <div class="level-card-count">${l.words.length} 个生字</div>
            </div>`).join('')}
        </div>
        ${hasReview?`
        <div class="unit-review-card" onclick="openUnitReview('${levelName}')">
          <span class="unit-review-icon">🎲</span>
          <div class="unit-review-title">字词综合随机考查复习</div>
          <div class="unit-review-sub">Comprehensive Unit Review · ${UNIT_REVIEWS[levelName].length} units</div>
        </div>`:''}
      </div>`;
  }).join('');
}

// Open level detail — show lesson's words as a list, then pick mode
let detailLesson = null;
function openLevelDetail(id){
  detailLesson = NATIVE_LESSONS.find(l=>l.id===id);
  if(!detailLesson) return;
  document.getElementById('ld-title').textContent = detailLesson.title + ' · ' + detailLesson.subtitle;
  document.getElementById('ld-sub').textContent = detailLesson.level + ' · ' + detailLesson.words.length + ' 个生字';

  // Levels without pinyin knowledge: 一年级 L1, 一年级 L2, 二年级 L1
  const noPinyinLevels = ['一年级 Level 1','一年级 Level 2','二年级 Level 1','H 识字阅读 Level 1','H 识字阅读 Level 2'];
  const isPinyinFree = noPinyinLevels.includes(detailLesson.level);

  const allModes = [
    {key:'flashcard', icon:'🃏', name:'看词说拼音', desc:'看字说出拼音，然后自己判断'},
    {key:'multiple',  icon:'🎯', name:'选择拼音',   desc:'从四个选项中选出正确拼音'},
    {key:'type',      icon:'✍️', name:'拼音拼写',   desc:'自己输入拼音'},
    {key:'listen',    icon:'🔊', name:'听音选字',   desc:'听声音选出正确的字，无需拼音'},
    {key:'listenrecord', icon:'🎙️', name:'听读练习', desc:'听真人读音，跟着录音，系统评分'},
    {key:'reading',   icon:'📖', name:'朗读练习',   desc:'按行朗读课文，系统评分纠错 · Reading practice with scoring'},
  ];
  // H Level 1: Listen & Pick + Listen & Record only
  const isHLevel1 = detailLesson.level === 'H 识字阅读 Level 1' || detailLesson.level === 'H 识字阅读 Level 2';
  let modes = isHLevel1
    ? [allModes.find(m=>m.key==='listen'), allModes.find(m=>m.key==='listenrecord')]
    : isPinyinFree
      ? allModes.filter(m=>m.key==='flashcard'||m.key==='listen')
      : allModes.filter(m=>m.key!=='reading'&&m.key!=='listenrecord');
  // Add reading mode always (will use KEWUN_LESSONS fallback if no reading data)
  if(!isHLevel1) modes = [...modes.filter(m=>m.key!=='reading'), allModes.find(m=>m.key==='reading')];

  const list = document.getElementById('lesson-list-grid');
  // ★ 查每个 mode 是否完成过（用来加 ✓ 标识）
  const myCompletionsByMode = (function(){
    if(!currentUser) return new Set();
    const allClasses = getStudentClasses(currentUser);
    const myName = currentUser.username || currentUser.name;
    const modeAlias = {
      'flashcard':['flashcard','看词说拼音','翻卡片'],
      'multiple':['multiple','选择拼音','选择题'],
      'type':['type','拼音拼写','拼写练习'],
      'listen':['listen','听音选字'],
      'listenrecord':['listenrecord','听读练习'],
      'reading':['reading','朗读练习']
    };
    const result = new Set();
    allClasses.forEach(cls => {
      const completions = getHWCompletions(detailLesson.id, cls);
      completions.filter(c => c.username===myName || c.name===myName).forEach(c => {
        Object.keys(modeAlias).forEach(k => {
          if(modeAlias[k].includes(c.mode)) result.add(k);
        });
      });
    });
    return result;
  })();
  list.innerHTML = modes.map(m=>{
    const done = myCompletionsByMode.has(m.key);
    const doneStamp = done
      ? '<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;background:var(--green-light);color:var(--green);font-size:10px;font-weight:700;letter-spacing:0.04em;border:1px solid var(--green);">✓ 已完成</span>'
      : '';
    const borderColor = done ? 'var(--green)' : 'var(--border)';
    return `
    <div class="lesson-list-item" onclick="startFromDetail('${m.key}')" style="border-color:${borderColor};">
      <div class="lli-left">
        <div class="lli-title">${m.icon} ${m.name}${doneStamp}</div>
        <div class="lli-sub">${m.desc}</div>
      </div>
      <div style="display:flex;align-items:center;">
        <div class="lli-count">${detailLesson.words.length} 个字</div>
        <div class="lli-arrow">›</div>
      </div>
    </div>
  `;
  }).join('');
  showScreen('leveldetail');
}

function startFromDetail(mode){
  if(!detailLesson) return;
  if(mode==='reading'){
    selectedLesson = detailLesson;
    startReading(detailLesson);
    return;
  }
  if(mode==='listenrecord'){
    selectedLesson = detailLesson;
    startListenRecord(detailLesson);
    return;
  }
  selectedLesson = detailLesson;
  currentMode = mode;
  needsReview = JSON.parse(localStorage.getItem('czmd_needs_review_'+detailLesson.id)||'[]');
  allReviewed = JSON.parse(localStorage.getItem('czmd_all_reviewed_'+detailLesson.id)||'[]');
  numQuestions = Math.min(10, detailLesson.words.length);
  isDrillSession = false;
  deck = shuffle(getActiveWords()).slice(0, numQuestions);
  idx=0; score=0; streak=0; answered=false; flipped=false; missedWords=[]; pinyinTokens=[];
  const info = MODE_INFO[mode];
  document.getElementById('game-title-text').textContent = info.label;
  document.getElementById('progress-fill').style.background = info.color;
  document.getElementById('drill-banner').style.display = 'none';
  showScreen('game'); renderQuestion();
}

// Override goHome for level map users / admin
function goBackToLesson(){
  // Back arrow: return to lesson detail (mode selection) if we came from there
  stopVoice();
  if(currentAdmin){
    showScreen('leveldetail');
    return;
  }
  if(detailLesson){
    showScreen('leveldetail');
    return;
  }
  goHome();
}

function goHome(){
  stopVoice();
  if(currentAdmin){
    showScreen('leveldetail');
    return;
  }
  if(isNative()){
    selectedLesson=null;
    showScreen('levelmap'); renderLevelMap();
    return;
  }
  showScreen('home'); renderHome();
}

function switchSpeaker(){
  selectedLesson = null;
  if(currentUser){
    showScreen('background');
  } else {
    showScreen('auth');
  }
}

// ════════════════════════════════════════
// POINTS SYSTEM
// ════════════════════════════════════════
const REWARDS = [
  {icon:'🖍️', name:'食色彩笔',   cost:150},
  {icon:'📚', name:'故事书',      cost:200},
  {icon:'🎮', name:'游戏卡',      cost:250},
  {icon:'🍭', name:'糖果礼包',    cost:100},
  {icon:'🏆', name:'奖状证书',    cost:80},
  {icon:'🎨', name:'画画套装',    cost:300},
  {icon:'🧩', name:'拼图玩具',    cost:180},
  {icon:'📓', name:'精美笔记本',  cost:120},
  {icon:'✏️', name:'铅笔套装',    cost:60},
  {icon:'🎁', name:'神秘礼物',    cost:500},
];
const DEFAULT_REWARDS = REWARDS.map(r=>({...r}));
const REWARDS_PER_PAGE = 5;
let rewardsCurrentPage = 0;
const SELF_CLASS_KEY = 'self_';  // 占位班级桶（学生未分班时）。不能用 '__self__'：
                                 // Firebase 禁止字段名以双下划线开头+结尾，会导致积分写入云端失败。
const POINTS_CLOUD_PATH = 'progress/points';

function defaultPointsData(){
  return {total:0,history:[],sessionCounts:{},byClass:{}};
}

function getUserPointsKey(){
  if(!currentUser) return null;
  return 'czmd_pts_'+userKey(currentUser.name,currentUser.classCode);
}
function getUserPendingPointsKey(){
  const key = getUserPointsKey();
  return key ? key + '_pending_cloud' : null;
}
function getCurrentCloudUid(){
  if(currentUser && currentUser._cloudUid) return currentUser._cloudUid;
  try{
    return window.cloudAuth && window.cloudAuth.getCurrentUser && window.cloudAuth.getCurrentUser()
      ? window.cloudAuth.getCurrentUser().uid
      : null;
  }catch(e){ return null; }
}
function getPointsDocRef(){
  const uid = getCurrentCloudUid();
  if(!uid || !window.firebaseReady || !window.cloudAuth) return null;
  return window.cloudAuth._doc(window.cloudAuth.db, 'students', uid, 'progress', 'points');
}
function normalizePointsData(data){
  data = data && typeof data === 'object' ? data : {};
  const normalized = {
    total: Number(data.total||0),
    history: Array.isArray(data.history) ? data.history : [],
    sessionCounts: data.sessionCounts && typeof data.sessionCounts === 'object' ? data.sessionCounts : {},
    byClass: data.byClass && typeof data.byClass === 'object' ? data.byClass : {}
  };
  if(!Object.keys(normalized.byClass).length && normalized.history.length){
    normalized.history.forEach(h=>{
      const pts = Number(h && h.pts || 0);
      if(!pts) return;
      const cls = (h && h.classCode) || SELF_CLASS_KEY;
      if(!normalized.byClass[cls]) normalized.byClass[cls] = {points:0, history:[]};
      normalized.byClass[cls].points = (normalized.byClass[cls].points||0) + pts;
      normalized.byClass[cls].history.push(h);
    });
  }
  if(!Object.keys(normalized.byClass).length && normalized.total){
    normalized.byClass[SELF_CLASS_KEY] = {points:normalized.total, history:normalized.history.slice(0,100)};
  }
  return normalized;
}
function pointsHistoryKey(h){
  if(!h) return '';
  return [h.date||'', h.lesson||'', h.mode||'', h.count||'', h.pts||0, h.reason||'', h.classCode||''].join('|');
}
function getNewPointHistoryEntries(data, previous){
  data = normalizePointsData(data);
  previous = normalizePointsData(previous);
  const oldFirstKey = previous.history && previous.history.length ? pointsHistoryKey(previous.history[0]) : '';
  const newEntries = [];
  for(const h of data.history||[]){
    if(oldFirstKey && pointsHistoryKey(h) === oldFirstKey) break;
    newEntries.push(h);
  }
  if(!oldFirstKey && !(previous.history||[]).length && Object.keys(previous.byClass||{}).length){
    return [];
  }
  return newEntries;
}
function applyPointEntries(data, entries){
  data = normalizePointsData(data);
  const seen = new Set((data.history||[]).map(pointsHistoryKey));
  entries.slice().reverse().forEach(h=>{
    const key = pointsHistoryKey(h);
    if(seen.has(key)) return;
    seen.add(key);
    const pts = Number(h && h.pts || 0);
    data.total = Number(data.total||0) + pts;
    data.history.unshift(h);
    const cls = (h && h.classCode) || SELF_CLASS_KEY;
    if(!data.byClass[cls]) data.byClass[cls] = {points:0, history:[]};
    data.byClass[cls].points = Number(data.byClass[cls].points||0) + pts;
    data.byClass[cls].history = data.byClass[cls].history || [];
    data.byClass[cls].history.unshift(h);
    if(data.byClass[cls].history.length>100) data.byClass[cls].history = data.byClass[cls].history.slice(0,100);
  });
  if(data.history.length>100) data.history = data.history.slice(0,100);
  return data;
}
function mergeNewPointHistoryIntoBuckets(data, previous, entries){
  data = normalizePointsData(data);
  previous = normalizePointsData(previous);
  const buckets = JSON.parse(JSON.stringify(previous.byClass||{}));
  if(!(previous.history||[]).length && !Object.keys(buckets).length){
    return data;
  }
  const newEntries = Array.isArray(entries) ? entries : getNewPointHistoryEntries(data, previous);
  newEntries.slice().reverse().forEach(h=>{
    const pts = Number(h && h.pts || 0);
    if(!pts) return;
    const cls = (h && h.classCode) || SELF_CLASS_KEY;
    if(!buckets[cls]) buckets[cls] = {points:0, history:[]};
    buckets[cls].points = (buckets[cls].points||0) + pts;
    buckets[cls].history = buckets[cls].history || [];
    buckets[cls].history.unshift(h);
    if(buckets[cls].history.length>100) buckets[cls].history = buckets[cls].history.slice(0,100);
  });
  data.byClass = buckets;
  return data;
}

const dataStore = {
  points: {
    getLocal(){
      const k=getUserPointsKey();
      if(!k) return defaultPointsData();
      try{ return normalizePointsData(JSON.parse(localStorage.getItem(k)||'{}')); }
      catch(e){ return defaultPointsData(); }
    },
    setLocal(data){
      const k=getUserPointsKey();
      if(k) localStorage.setItem(k, JSON.stringify(normalizePointsData(data)));
    },
    async getCloud(){
      const ref = getPointsDocRef();
      if(!ref || !window.cloudAuth._getDoc) return null;
      const snap = await window.cloudAuth._getDoc(ref);
      return snap.exists() ? normalizePointsData(snap.data()) : null;
    },
    async setCloud(data, entries){
      const ref = getPointsDocRef();
      if(!ref || !window.cloudAuth._setDoc) return false;
      const payload = normalizePointsData(data);
      const newEntries = Array.isArray(entries) ? entries : [];
      if(window.cloudAuth._runTransaction && newEntries.length){
        await window.cloudAuth._runTransaction(window.cloudAuth.db, async (tx)=>{
          const snap = await tx.get(ref);
          const current = snap.exists() ? normalizePointsData(snap.data()) : defaultPointsData();
          let merged = applyPointEntries(current, newEntries);
          merged.sessionCounts = Object.assign({}, current.sessionCounts||{}, payload.sessionCounts||{});
          merged.updatedAt = new Date().toISOString();
          tx.set(ref, merged, {merge:true});
        });
      } else {
        payload.updatedAt = new Date().toISOString();
        await window.cloudAuth._setDoc(ref, payload, {merge:true});
      }
      return true;
    },
    getPending(){
      const k=getUserPendingPointsKey();
      if(!k) return [];
      try{
        const list = JSON.parse(localStorage.getItem(k)||'[]');
        return Array.isArray(list) ? list : [];
      }catch(e){ return []; }
    },
    setPending(entries){
      const k=getUserPendingPointsKey();
      if(!k) return;
      const list = Array.isArray(entries) ? entries : [];
      if(list.length) localStorage.setItem(k, JSON.stringify(list));
      else localStorage.removeItem(k);
      try{
        if(list.length) localStorage.setItem('czmd_points_pending_sync', '1');
        else localStorage.removeItem('czmd_points_pending_sync');
      }catch(e){}
    },
    enqueuePending(entries){
      if(!Array.isArray(entries) || !entries.length) return;
      const list = this.getPending();
      const seen = new Set(list.map(pointsHistoryKey));
      entries.forEach(h=>{
        const key = pointsHistoryKey(h);
        if(!seen.has(key)){
          seen.add(key);
          list.push(h);
        }
      });
      this.setPending(list);
    },
    async flushPending(){
      const pending = this.getPending();
      if(!pending.length) return true;
      const localData = this.getLocal();
      const ok = await this.setCloud(localData, pending);
      if(!ok) throw new Error('cloud unavailable');
      this.setPending([]);
      return true;
    },
    save(data, entries){
      const previous = this.getLocal();
      const explicitEntries = Array.isArray(entries) ? entries.filter(Boolean) : null;
      const newEntries = explicitEntries || getNewPointHistoryEntries(data, previous);
      const normalized = mergeNewPointHistoryIntoBuckets(data, previous, newEntries);
      this.setLocal(normalized);
      this.enqueuePending(newEntries);
      this.flushPending().catch(e=>{
        console.warn('Points cloud sync failed; kept local cache and pending queue.', e);
        if(typeof notifyCloudWriteFailed === 'function') notifyCloudWriteFailed();
      });
    }
  }
};

async function loadUserPointsFromCloud(){
  if(!currentUser || !currentUser._fromCloud) return;
  try{
    try{
      await dataStore.points.flushPending();
    }catch(syncErr){
      console.warn('Pending points could not sync yet; keeping local cache.', syncErr);
      return;
    }
    const localBeforeCloudRead = dataStore.points.getLocal();
    const cloudData = await dataStore.points.getCloud();
    if(cloudData){
      const localNow = dataStore.points.getLocal();
      const localChangedWhileReading = getNewPointHistoryEntries(localNow, localBeforeCloudRead).length > 0;
      if(localChangedWhileReading || dataStore.points.getPending().length){
        try{
          await dataStore.points.flushPending();
          const freshCloudData = await dataStore.points.getCloud();
          if(freshCloudData) dataStore.points.setLocal(freshCloudData);
        }catch(syncErr){
          console.warn('Cloud points read returned stale while local changed; keeping local cache.', syncErr);
        }
        return;
      }
      dataStore.points.setLocal(cloudData);
      return;
    }
    dataStore.points.setLocal(defaultPointsData());
  }catch(e){
    console.warn('☁️ 积分云端读取失败，继续使用本地缓存', e);
  }
}

function getUserData(){
  return dataStore.points.getLocal();
}
function saveUserData(data, entries){
  dataStore.points.save(data, entries);
}

function inferPointsClassForLesson(lessonId){
  if(!currentUser || !lessonId || typeof getAssignedHW !== 'function') return SELF_CLASS_KEY;
  try{
    const classes = currentUser.classes && currentUser.classes.length ? currentUser.classes : [currentUser.classCode];
    const hw = getAssignedHW().find(a =>
      a.lessonId===lessonId &&
      classes.includes(a.classCode) &&
      (typeof isHWExpired !== 'function' || !isHWExpired(a))
    );
    return hw ? hw.classCode : SELF_CLASS_KEY;
  }catch(e){
    return SELF_CLASS_KEY;
  }
}

function accuracyPoints(pct){
  if(pct===100) return {pts:10, label:'100% 正确率 +10分 🎯'};
  if(pct>=95)   return {pts:8,  label:'95-99% 正确率 +8分'};
  if(pct>=85)   return {pts:5,  label:'85-94% 正确率 +5分'};
  if(pct>=80)   return {pts:2,  label:'80-84% 正确率 +2分'};
  return              {pts:1,  label:'完成练习 +1分'};
}

function recordLessonPlay(lessonId, mode, pct){
  if(!lessonId||!currentUser) return {session:0, accuracy:0};
  const data=getUserData();
  if(!data.sessionCounts) data.sessionCounts={};
  data.sessionCounts[lessonId]=(data.sessionCounts[lessonId]||0)+1;
  const count=data.sessionCounts[lessonId];
  let sessionEarned=0, sessionReason='';
  if(count===3){  sessionEarned=10; sessionReason='练习3次 +10分 🎉'; }
  else if(count===5){ sessionEarned=10; sessionReason='练习5次 达到20分 🌟'; }
  else if(count>5){  sessionEarned=3;  sessionReason=`第${count}次练习 +3分`; }

  const acc = accuracyPoints(pct);
  const totalEarned = sessionEarned + acc.pts;

  data.total=(data.total||0)+totalEarned;
  if(!data.history) data.history=[];
  const pointsClass = inferPointsClassForLesson(lessonId);
  const newEntries = [];
  // Add accuracy entry
  const accuracyEntry = {date:new Date().toLocaleDateString('zh-CN'),lesson:lessonId,mode,count,pts:acc.pts,classCode:pointsClass,reason:acc.label};
  data.history.unshift(accuracyEntry);
  newEntries.push(accuracyEntry);
  // Add session bonus if any
  if(sessionEarned>0){
    const sessionEntry = {date:new Date().toLocaleDateString('zh-CN'),lesson:lessonId,mode,count,pts:sessionEarned,classCode:pointsClass,reason:sessionReason};
    data.history.unshift(sessionEntry);
    newEntries.push(sessionEntry);
  }
  if(data.history.length>50) data.history=data.history.slice(0,50);
  saveUserData(data, newEntries);
  return {session:sessionEarned, accuracy:acc.pts, total:totalEarned, sessionReason, accLabel:acc.label};
}

function showPointsToast(result){
  const area=document.getElementById('points-toast-area');
  if(!area) return;
  if(!result || result.total<=0){area.innerHTML='';return;}
  const data=getUserData();
  let breakdown='';
  if(result.accuracy>0) breakdown+=`<div style="font-size:12px;color:var(--muted);margin-top:2px;">${result.accLabel}</div>`;
  if(result.session>0)  breakdown+=`<div style="font-size:12px;color:var(--muted);">${result.sessionReason}</div>`;
  area.innerHTML=`
    <div class="points-toast">
      <div class="points-earned">+${result.total} ⭐</div>
      <div class="points-earned-label">本次获得积分</div>
      ${breakdown}
      <div class="points-total-line" style="margin-top:8px;">总积分：<strong>${data.total}</strong> 分</div>
    </div>`;
}


// ── 查分及兑奖 combined screen ──
function showScoreAndRedeem() {
  showScreen('score');
  renderScoreScreen();
  switchScoreTab('score');
}

function switchScoreTab(tab) {
  const btnS = document.getElementById('sr-tab-score');
  const btnR = document.getElementById('sr-tab-redeem');
  const pS   = document.getElementById('sr-panel-score');
  const pR   = document.getElementById('sr-panel-redeem');
  const isScore = tab === 'score';
  if(btnS){ btnS.style.background=isScore?'var(--gold)':'white'; btnS.style.color=isScore?'white':'var(--muted)'; btnS.style.borderColor=isScore?'var(--gold)':'var(--border)'; }
  if(btnR){ btnR.style.background=!isScore?'var(--green)':'white'; btnR.style.color=!isScore?'white':'var(--muted)'; btnR.style.borderColor=!isScore?'var(--green)':'var(--border)'; }
  if(pS) pS.style.display = isScore ? 'block' : 'none';
  if(pR) pR.style.display = !isScore ? 'block' : 'none';
  if(!isScore) renderScoreRedeemHistory();
}

function renderScoreRedeemHistory() {
  if(!currentUser) return;
  const myKey = userKey(currentUser.name, currentUser.classCode);
  const requests = getRedeemRequests().filter(rq=>rq.studentKey===myKey);
  const data = getUserData();
  const redeems = (data.history||[]).filter(h=>h.mode==='礼物兑换');
  const list = document.getElementById('score-redeem-history-list');
  if(!list) return;

  if(!redeems.length && !requests.length){
    list.innerHTML =
      '<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center;box-shadow:var(--shadow);">'
      +'<div style="font-size:36px;margin-bottom:12px;">🎁</div>'
      +'<div style="font-size:15px;font-weight:500;color:var(--ink);margin-bottom:6px;">还没有兑换记录</div>'
      +'<div style="font-size:13px;color:var(--muted);">No redemptions yet · Keep earning points!</div>'
      +'</div>';
    return;
  }

  // Use requests as source of truth (they have most info)
  // Fall back to history entries if no matching request
  const allItems = requests.length ? requests : redeems.map(h => ({
    rewardIcon: '🎁',
    rewardName: h.reason.replace(/^申请兑换\s*/,'').replace(/-\d+分$/,'').trim(),
    rewardCost: Math.abs(h.pts),
    date: h.date,
    collected: false,
    collectedDate: null,
  }));

  list.innerHTML = allItems.map(rq => {
    const isCollected = !!rq.collected;
    // 已兑换 button — green if collected, grey/dim if pending
    const collectedBtn = isCollected
      ? '<div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:var(--green);color:white;font-size:12px;font-weight:600;">✓ 已兑换</div>'
      : '<div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:var(--paper3);color:var(--muted);font-size:12px;font-weight:500;border:1px solid var(--border);">⬜ 已兑换</div>';

    const statusBadge = isCollected
      ? '<span style="font-size:11px;color:var(--green);font-weight:500;">✓ '+(rq.collectedDate||'已确认')+'</span>'
      : '<span style="font-size:11px;color:var(--gold);">⏳ 等待老师确认</span>';

    return '<div style="background:white;border:1px solid '+(isCollected?'var(--green)':'var(--border)')+';border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">'
      +'<div style="width:40px;height:40px;border-radius:50%;background:var(--gold-light);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">'+(rq.rewardIcon||'🎁')+'</div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:14px;font-weight:600;color:var(--ink);">'+(rq.rewardName||'礼物')+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:3px;">'+(rq.date||'')+(rq.rewardCost?' · -'+rq.rewardCost+'分':'')+'</div>'
      +'<div style="margin-top:4px;">'+statusBadge+'</div>'
      +'</div>'
      +collectedBtn
      +'</div>';
  }).join('');
}

function renderScoreScreen(){
  const data=getUserData();
  document.getElementById('score-total-display').textContent=data.total||0;
  document.getElementById('score-user-name').textContent=(currentUser?currentUser.name:'')+'的积分';
  const hist=data.history||[];
  const el=document.getElementById('score-history-list');
  if(!hist.length){
    el.innerHTML='<div class="empty-review">还没有积分记录。</div>';
  } else {
    el.innerHTML=hist.slice(0,20).map(h=>`
      <div class="score-history-row">
        <div>
          <div style="font-weight:500;">${h.reason}</div>
          <div style="font-size:11px;color:var(--muted);">${h.date} · ${h.mode}</div>
        </div>
        <div class="score-history-pts">${h.pts>0?'+':''}${h.pts}</div>
      </div>`).join('');
  }
}

function goScoreBack(){
  if(isNative()){showScreen('levelmap');renderLevelMap();}
  else{showScreen('home');renderHome();}
}

// ── Redemption request storage (shared across all users) ──
function getRedeemRequests(){ return safeParseJSON(localStorage.getItem('czmd_redeem_requests'), []); }
function saveRedeemRequests(list){
  localStorage.setItem('czmd_redeem_requests',JSON.stringify(list));
  // Cloud sync is per-request at each call site (cloudArrayUpsert/Remove).
}

function renderRewards(){
  const data=getUserData();
  document.getElementById('rewards-pts-display').textContent=data.total||0;
  document.getElementById('redeem-msg').style.display='none';
  const pages=Math.ceil(REWARDS.length/REWARDS_PER_PAGE);
  rewardsCurrentPage=Math.max(0,Math.min(rewardsCurrentPage,pages-1));
  const start=rewardsCurrentPage*REWARDS_PER_PAGE;
  const slice=REWARDS.slice(start,start+REWARDS_PER_PAGE);
  const pts=data.total||0;
  const isTeacher=!!currentTeacher;
  const requests=getRedeemRequests();

  document.getElementById('rewards-grid').innerHTML=slice.map((r,i)=>{
    const globalIdx=start+i;
    const pending = currentUser && requests.find(rq=>
      rq.rewardIdx===globalIdx &&
      rq.studentKey===userKey(currentUser.name,currentUser.classCode) &&
      !rq.collected
    );
    const collected = currentUser && requests.find(rq=>
      rq.rewardIdx===globalIdx &&
      rq.studentKey===userKey(currentUser.name,currentUser.classCode) &&
      rq.collected
    );

    let studentBtn, teacherBtn='';
    if(isTeacher){
      studentBtn=''; // teacher doesn't redeem
      teacherBtn=''; // teacher sees per-student in request list
    } else if(collected){
      studentBtn=`<button class="reward-btn-student" disabled>✓ 已领取 · Collected</button>`;
    } else if(pending){
      studentBtn=`<button class="reward-btn-student pending" disabled>⏳ 等待老师确认 · Pending</button>`;
    } else if(pts>=r.cost){
      studentBtn=`<button class="reward-btn-student" onclick="requestRedeem(${globalIdx})">🎁 申请兑换 · Redeem</button>`;
    } else {
      studentBtn=`<button class="reward-btn-student" disabled>积分不足 · Not enough points</button>`;
    }

    if(!isTeacher && currentUser){
      teacherBtn=`<button class="reward-btn-teacher" disabled title="老师确认后显示已领取">👩‍🏫 老师确认领取</button>`;
      if(pending){
        teacherBtn=`<button class="reward-btn-teacher" disabled>等待老师 · Awaiting teacher</button>`;
      } else if(collected){
        teacherBtn=`<button class="reward-btn-teacher" disabled style="background:var(--green);color:white;opacity:1;">✓ 已领取</button>`;
      }
    }

    return `
      <div class="reward-card">
        <div style="margin-bottom:8px;">${r.image?`<img src="${r.image}" style="width:52px;height:52px;object-fit:cover;border-radius:10px;display:block;margin:0 auto;">`:`<span class="reward-icon">${r.icon||'🎁'}</span>`}</div>
        <div class="reward-name">${r.name}</div>
        <div class="reward-cost">需要 ${r.cost} 分</div>
        <div class="reward-btn-row">
          ${studentBtn}
          ${currentUser?teacherBtn:''}
        </div>
      </div>`;
  }).join('');
  document.getElementById('rewards-page-label').textContent=`第 ${rewardsCurrentPage+1} / ${pages} 页`;
  document.getElementById('rewards-prev').disabled=rewardsCurrentPage===0;
  document.getElementById('rewards-next').disabled=rewardsCurrentPage>=pages-1;
}

function rewardsPage(dir){rewardsCurrentPage+=dir;renderRewards();}

function requestRedeem(idx){
  const r=REWARDS[idx]; if(!r||!currentUser) return;
  const data=getUserData();
  const msg=document.getElementById('redeem-msg');
  if((data.total||0)<r.cost){
    msg.textContent='积分不足，继续练习加油！';
    msg.className='redeem-toast redeem-err'; msg.style.display='block'; return;
  }
  // Deduct points and create request
  data.total-=r.cost;
  data.history=data.history||[];
  data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:'兑换',mode:'礼物兑换',count:0,pts:-r.cost,reason:`申请兑换 ${r.icon} ${r.name} -${r.cost}分`});
  saveUserData(data);

  const requests=getRedeemRequests();
  requests.push({
    id: Date.now(),
    rewardIdx: idx,
    rewardName: r.name,
    rewardIcon: r.icon,
    rewardCost: r.cost,
    studentName: currentUser.name,
    classCode: currentUser.classCode,
    studentKey: userKey(currentUser.name,currentUser.classCode),
    date: new Date().toLocaleDateString('zh-CN'),
    collected: false,
  });
  saveRedeemRequests(requests);
  cloudArrayUpsert('redeemRequests', requests[requests.length-1], r=>r.id);

  msg.textContent=`🎉 已申请兑换 ${r.icon} ${r.name}！等待老师确认领取。`;
  msg.className='redeem-toast redeem-ok'; msg.style.display='block';
  renderRewards();
}

// ── Teacher: view student records ──
function filterStudentSearch(){
  const q=(document.getElementById('student-search-input')?.value||'').trim().toLowerCase();
  const el=document.getElementById('student-search-results');
  if(!q){ el.innerHTML=''; return; }
  const users=loadUsers();
  const matches=Object.values(users).filter(u=>u.name&&u.name.toLowerCase().includes(q));
  if(!matches.length){ el.innerHTML=`<div class="empty-review">未找到学生 · No student found</div>`; return; }
  el.innerHTML=matches.map(u=>{
    const key='czmd_pts_'+userKey(u.name,u.classCode);
    const d=JSON.parse(localStorage.getItem(key)||'{"total":0}');
    const pts=d.total||0;
    const hist=(d.history||[]).slice(0,5);
    return `
      <div class="student-record-card">
        <div class="src-name">${u.name} <span style="font-size:11px;color:var(--muted);">· ${u.classCode}</span></div>
        <div class="src-detail">总积分 Total: <strong style="color:var(--gold);">${pts}</strong> 分</div>
        <div style="margin-top:8px;">
          ${hist.map(h=>`<div style="font-size:11px;color:var(--muted);padding:2px 0;">${h.date} ${h.reason} <span style="color:${h.pts>0?'var(--green)':'var(--red);'}">${h.pts>0?'+':''}${h.pts}</span></div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

// ── Teacher: view and confirm redemption requests ──
function renderTeacherRedeemRequests(){
  const el=document.getElementById('teacher-redeem-requests');
  if(!el) return;
  const requests=getRedeemRequests().filter(rq=>
    currentTeacher.classes.includes(rq.classCode)
  );
  if(!requests.length){
    el.innerHTML=`<div class="empty-review">暂无兑换申请 · No pending requests</div>`;
    return;
  }
  el.innerHTML=requests.map(rq=>`
    <div class="redeem-request-row ${rq.collected?'collected':''}">
      <div class="rr-info">
        <div class="rr-student">${rq.rewardIcon} ${rq.rewardName} <span style="font-size:12px;color:var(--gold);">-${rq.rewardCost}分</span></div>
        <div class="rr-detail">学生：${rq.studentName} · 班级：${rq.classCode} · ${rq.date}</div>
        ${rq.collected?`<div style="font-size:11px;color:var(--green);margin-top:4px;">✓ 已确认领取 ${rq.collectedDate||''}</div>`:''}
      </div>
      ${!rq.collected?`<button class="rr-collect-btn" onclick="teacherConfirmCollect(${rq.id})">✓ 已领取 · Collected</button>`
        :`<span style="font-size:12px;color:var(--green);font-weight:500;">✓ Done</span>`}
    </div>`).join('');
}

function teacherConfirmCollect(id){
  const requests=getRedeemRequests();
  const rq=requests.find(r=>r.id===id);
  if(!rq) return;
  rq.collected=true;
  rq.collectedDate=new Date().toLocaleDateString('zh-CN');
  saveRedeemRequests(requests);
  cloudArrayUpsert('redeemRequests', rq, r=>r.id);
  renderTeacherRedeemRequests();
}

function showRedeemHistory(){
  if(!currentUser) return;
  document.getElementById('redeem-hist-user').textContent = currentUser.name + ' · ' + currentUser.classCode;
  const myKey = userKey(currentUser.name, currentUser.classCode);
  const requests = getRedeemRequests().filter(rq=>rq.studentKey===myKey);
  const data = getUserData();
  const redeems = (data.history||[]).filter(h=>h.mode==='礼物兑换');
  const list = document.getElementById('redeem-history-list');

  if(!redeems.length){
    list.innerHTML=`
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center;box-shadow:var(--shadow);">
        <div style="font-size:36px;margin-bottom:12px;">🎁</div>
        <div style="font-size:15px;font-weight:500;color:var(--ink);margin-bottom:6px;">还没有兑换记录</div>
        <div style="font-size:13px;color:var(--muted);">No redemptions yet · Keep earning points!</div>
      </div>`;
  } else {
    list.innerHTML = redeems.map((h,i)=>{
      // Try to match this history entry to a request
      const req = requests[i] || requests.find(rq=>h.reason.includes(rq.rewardName));
      const collected = req && req.collected;
      const pending = req && !req.collected;

      let statusBadge;
      if(collected){
        statusBadge=`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <div style="font-size:12px;padding:4px 10px;border-radius:20px;background:var(--green-light);color:var(--green);font-weight:500;">✓ 已领取 · Collected</div>
          ${req.collectedDate?`<div style="font-size:10px;color:var(--muted);">${req.collectedDate}</div>`:''}
        </div>`;
      } else if(pending){
        statusBadge=`<div style="font-size:12px;padding:4px 10px;border-radius:20px;background:var(--blue-light);color:var(--blue);font-weight:500;">⏳ 等待老师确认 · Pending</div>`;
      } else {
        statusBadge=`<div style="font-size:12px;padding:4px 10px;border-radius:20px;background:var(--gold-light);color:var(--gold);font-weight:500;">已申请 · Requested</div>`;
      }

      return `
        <div class="class-member-row">
          <div class="cm-left">
            <div class="cm-avatar" style="background:var(--gold-light);color:var(--gold);font-size:20px;">${req?.rewardIcon||'🎁'}</div>
            <div>
              <div class="cm-name">${req?.rewardName||h.reason.replace(/^申请兑换\s*/,'').replace(/-\d+分$/,'').trim()}</div>
              <div class="cm-class">${h.date} · ${h.pts} 分</div>
            </div>
          </div>
          ${statusBadge}
        </div>`;
    }).join('');
  }
  showScreen('redeem-history');
}

function goRedeemHistoryBack(){
  if(isNative()){ showScreen('levelmap'); renderLevelMap(); }
  else { showScreen('home'); renderHome(); }
}

// ════════════════════════════════════════
// UNIT REVIEW
// ════════════════════════════════════════
let urLevelName = '';
let urUnitIndex = 0;
let urCurrentChars = [];  // 16 shown this round
let urQueue = [];
let urQueuePos = 0;
let urCorrect = 0;
let urWaiting = false;

function openUnitReview(levelName){
  urLevelName = levelName;
  urUnitIndex = 0;
  showScreen('unitreview');
  document.getElementById('ur-level-title').textContent = levelName;
  renderUnitTabs();
  loadUnit(0);
}

function exitUnitReview(){
  window.speechSynthesis.cancel();
  showScreen('levelmap'); renderLevelMap();
}

function renderUnitTabs(){
  const units = UNIT_REVIEWS[urLevelName]||[];
  document.getElementById('ur-tabs').innerHTML = units.map((u,i)=>`
    <button class="unit-tab ${i===urUnitIndex?'active':''}" onclick="loadUnit(${i})">${u.unit}</button>
  `).join('');
}


function loadUnit(i){
  urUnitIndex = i;
  urAnswered = {};
  urCorrect = 0;
  urQueuePos = 0;
  urWaiting = false;
  window.speechSynthesis.cancel();
  document.getElementById('ur-result').style.display='none';
  renderUnitTabs();

  const allChars = [...(UNIT_REVIEWS[urLevelName]?.[i]?.chars||[])];
  urCurrentChars = shuffle(allChars).slice(0, 16);
  // Queue: random order to ask each of the 16
  urQueue = shuffle([...Array(urCurrentChars.length).keys()]);

  renderTiles();
  updateUrScore();
  // Start first question after a short delay
  setTimeout(()=>askNext(), 800);
}

function shuffleCurrentUnit(){ loadUnit(urUnitIndex); }

function renderTiles(){
  document.getElementById('ur-result').style.display='none';
  document.getElementById('ur-tiles').innerHTML = urCurrentChars.map((c,i)=>`
    <div class="char-tile" id="urt-${i}" onclick="studentPick(${i})">
      <span class="ct-char">${c.char}</span>
      <span class="ct-result" id="urt-res-${i}"></span>
    </div>`).join('');
}

function updateUrScore(){
  const done = Object.keys(urAnswered).length;
  document.getElementById('ur-score').textContent = `${urCorrect} / ${done}`;
}

// Play the next character for the student to find
function askNext(){
  if(urQueuePos >= urQueue.length){ showUrResult(); return; }

  const targetIdx = urQueue[urQueuePos];
  const c = urCurrentChars[targetIdx];

  // Highlight which tile is being asked — pulse the border briefly
  // (don't reveal answer — all tiles stay unmarked until student taps)
  urWaiting = true;

  // Update score label to show progress
  document.getElementById('ur-score').textContent =
    `${urCorrect} / ${urQueuePos} · 听：${c.char.length>0?'🔊':''}`;

  speakChinese(c.char);
}

// Student taps a tile
function studentPick(tappedIdx){
  if(!urWaiting) return;

  const targetIdx = urQueue[urQueuePos];
  const correct = tappedIdx === targetIdx;
  urWaiting = false;

  const tile = document.getElementById('urt-'+tappedIdx);
  const res  = document.getElementById('urt-res-'+tappedIdx);

  if(correct){
    tile.classList.add('correct');
    if(res){ res.className='ct-result ok'; res.textContent='✓'; }
    playCorrect();
    urCorrect++;
  } else {
    // Mark tapped tile wrong
    tile.classList.add('wrong');
    if(res){ res.className='ct-result bad'; res.textContent='✗'; }
    // Also reveal correct tile
    const correctTile = document.getElementById('urt-'+targetIdx);
    const correctRes  = document.getElementById('urt-res-'+targetIdx);
    if(correctTile) correctTile.classList.add('correct');
    if(correctRes){ correctRes.className='ct-result ok'; correctRes.textContent='✓'; }
    playWrong();
    // Replay correct pronunciation
    setTimeout(()=>speakChinese(urCurrentChars[targetIdx].char), 500);
  }

  // Record and advance
  urAnswered[targetIdx] = correct;
  urQueuePos++;
  updateUrScore();

  // Move to next question after a pause
  setTimeout(()=>askNext(), correct ? 900 : 1400);
}

function showUrResult(){
  const total = urCurrentChars.length;
  const pct = Math.round((urCorrect/total)*100);
  const accPts = accuracyPoints(pct);

  const data=getUserData();
  data.total=(data.total||0)+accPts.pts;
  if(!data.history) data.history=[];
  data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:urLevelName+'_review',mode:'综合复习',count:1,pts:accPts.pts,reason:`综合复习 ${UNIT_REVIEWS[urLevelName][urUnitIndex].unit} ${accPts.label}`});
  saveUserData(data);

  let emoji='📚';
  if(pct===100) emoji='🏆';
  else if(pct>=85) emoji='🌟';
  else if(pct>=60) emoji='👍';

  document.getElementById('ur-emoji').textContent=emoji;
  document.getElementById('ur-pct').textContent=pct+'%';
  document.getElementById('ur-pts-label').textContent=`+${accPts.pts} ⭐ · 总积分 ${data.total} 分`;
  document.getElementById('ur-result').style.display='block';
  document.getElementById('ur-result').scrollIntoView({behavior:'smooth'});
}


// ════════════════════════════════════════
// CLASS MEMBERS
// ════════════════════════════════════════
function showClassMembers(){
  if(!currentUser) return;
  const myClass = currentUser.classCode.toUpperCase();
  document.getElementById('class-code-label').textContent = '班级 Class: ' + myClass;

  const users = loadUsers();
  // Find all users in same class
  const members = Object.values(users)
    .filter(u => u.classCode && u.classCode.toUpperCase() === myClass)
    .map(u => {
      const key = 'czmd_pts_'+userKey(u.name, u.classCode);
      const data = JSON.parse(localStorage.getItem(key)||'{"total":0}');
      return { name: u.name, classCode: u.classCode, total: data.total||0 };
    })
    .sort((a,b) => b.total - a.total); // rank by score

  const list = document.getElementById('class-members-list');
  if(!members.length){
    list.innerHTML='<div class="empty-review">No members found in this class.</div>';
  } else {
    list.innerHTML = members.map((m, i) => {
      const isSelf = m.name === currentUser.name;
      const initials = [...m.name].slice(0,1).join('');
      const rank = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`;
      return `
        <div class="class-member-row ${isSelf?'cm-self':''}">
          <div class="cm-left">
            <div class="cm-avatar">${initials}</div>
            <div>
              <div class="cm-name">${rank} ${m.name}${isSelf?' (你 · You)':''}</div>
              <div class="cm-class">班级 Class: ${m.classCode}</div>
            </div>
          </div>
          <div class="cm-score">⭐ ${m.total} 分</div>
        </div>`;
    }).join('');
  }

  showScreen('class');
}

function goClassBack(){
  if(isNative()){ showScreen('levelmap'); renderLevelMap(); }
  else { showScreen('home'); renderHome(); }
}

// ════════════════════════════════════════
// READING PRACTICE
// ════════════════════════════════════════
let readingLesson = null;
let readingLineScores = [];
let readingRecognizer = null;

// ★ 朗读练习屏幕返回 — 根据入口跳到正确位置
function kewunGoBack(){
  try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){}
  if(window._kewunFromHW){
    // 从作业过来 → 回作业列表（看完成印章）
    window._kewunFromHW = false;
    if(typeof openStudentHW === 'function') openStudentHW();
    else { showScreen('levelmap'); renderLevelMap(); }
    return;
  }
  if(currentAdmin){
    showScreen('leveldetail');
    return;
  }
  // 默认：回所有课文列表
  showScreen('kewun-reading');
  renderKewunHome();
}

function startReading(lesson){
  // ★ 记录入口：从课文详情进入 = 从作业进入，返回应回到作业列表
  window._kewunFromHW = !!(detailLesson && lesson && lesson.id === detailLesson.id);
  // Match by subtitle (the actual Chinese lesson name) against KEWUN_LESSONS
  const subtitle = lesson.subtitle || '';
  const kl = KEWUN_LESSONS.find(k =>
    k.title === subtitle ||
    subtitle.includes(k.title) ||
    k.title.includes(subtitle)
  );

  if(kl){
    krCurrentLesson = kl;
    krLineScores = new Array(kl.lines.length).fill(null);
    showScreen('kewun-lesson');
    const hdr = document.getElementById('kewun-lesson-header');
    if(hdr) hdr.innerHTML =
      '<div style="text-align:center;padding:4px 0 8px;">' +
      '<div style="font-size:11px;color:var(--muted);font-weight:500;letter-spacing:0.06em;text-transform:uppercase;">第 ' + kl.id + ' 课</div>' +
      '<div style="font-family:Noto Serif SC,serif;font-size:22px;font-weight:700;color:var(--ink);margin:4px 0;">《' + kl.title + '》</div>' +
      '<div style="font-size:12px;color:var(--muted);">共 ' + kl.lines.length + ' 句 · 点🔊听范读，点🎤跟读评分</div>' +
      '</div>';
    renderKewunLesson();
    return;
  }

  // Fall back to old reading screen if lesson has reading data
  if(lesson.reading && lesson.reading.lines && lesson.reading.lines.length){
    readingLesson = lesson;
    readingLineScores = new Array(lesson.reading.lines.length).fill(null);
    showScreen('reading');
    renderReadingScreen();
    return;
  }

  // No reading text exists for THIS specific lesson. Do NOT fall back to the
  // full lesson picker (renderKewunHome) — that is what made an assigned lesson's
  // "朗读练习" show every 课文 instead of just the one assigned. Tell the student
  // and return to this lesson's activity list.
  alert('本课暂无朗读课文 · This lesson has no reading text yet.');
  showScreen('leveldetail');
}

function exitReading(){
  if(readingRecognizer){ try{readingRecognizer.stop();}catch(e){} readingRecognizer=null; }
  window.speechSynthesis.cancel();
  stopLessonAudio();
  showScreen('leveldetail');
}

// ════════════════════════════════════════
// LISTEN & RECORD MODE (H Level 1)
// 听读练习 — hear TTS, then record yourself saying each word
// ════════════════════════════════════════
let lrLesson = null;
let lrScores = [];
let lrRecognizer = null;

function startListenRecord(lesson){
  lrLesson = lesson;
  lrScores = new Array(lesson.words.length).fill(null);
  window.speechSynthesis.cancel();
  if(lrRecognizer){ try{lrRecognizer.abort();}catch(e){} lrRecognizer=null; }
  const _hasRA = hasRealAudioTimestamps(lesson.id);
  document.getElementById('lr-header').innerHTML=`
    <div class="reading-title">🎙️ 听读练习 · Listen & Record</div>
    <div class="reading-sub">${lesson.title} · ${lesson.subtitle} · 听声音，然后跟读 · Listen then repeat</div>
    ${_hasRA ? '<div style="margin-top:8px;"><span style="font-size:11px;background:var(--green-light);color:var(--green);padding:3px 10px;border-radius:10px;font-weight:600;">✓ 真人录音 · Native Speaker Audio</span></div>' : ''}`;
  document.getElementById('lr-summary').style.display='none';
  renderLRWords();
  showScreen('listenrecord');
}

// Pinyin map for scoring — check if what student said matches the pinyin of target char
const PINYIN_MAP = {
  '一':'yi','二':'er','三':'san','大':'da','小':'xiao','爸':'ba','妈':'ma',
  '龟':'gui','兔':'tu','快':'kuai','慢':'man',
  '笑':'xiao','月':'yue','上':'shang','下':'xia','中':'zhong','哭':'ku',
  '云':'yun','火':'huo','水':'shui','地':'di','星':'xing','亮':'liang',
  '瓜':'gua','树':'shu','只':'zhi','掉':'diao',
  '土':'tu','山':'shan','石':'shi','木':'mu','田':'tian','我':'wo','有':'you',
  '左':'zuo','右':'you','耳':'er','朵':'duo','目':'mu','四':'si',
  '口':'kou','头':'tou','鼻':'bi','手':'shou','花':'hua','五':'wu',
  '毛':'mao','鹅':'e','夜':'ye','落':'luo',
  '千':'qian','万':'wan','风':'feng','雨':'yu','进':'jin','不':'bu','六':'liu',
  '多':'duo','少':'shao','爷':'ye','奶':'nai','唱':'chang','歌':'ge','七':'qi',
  '麻':'ma','白':'bai','红':'hong','是':'shi','家':'jia','八':'ba',
  '去':'qu','里':'li','台':'tai','枝':'zhi',
  '宝':'bao','在':'zai','学':'xue','字':'zi','看':'kan','书':'shu','九':'jiu',
  '飞':'fei','机':'ji','贝':'bei','生':'sheng','气':'qi','游':'you','戏':'xi','十':'shi',
  '牛':'niu','羊':'yang','鸡':'ji','黄':'huang','青':'qing','草':'cao',
  // H Level 2 characters
  '猫':'mao','狗':'gou','走':'zou','路':'lu','真':'zhen','开':'kai','起':'qi',
  '出':'chu','拔':'ba','萝':'luo','卜':'bo',
  '哥':'ge','姐':'jie','跳':'tiao','来':'lai','猜':'cai',
  '孩':'hai','东':'dong','圆':'yuan','西':'xi','球':'qiu','拍':'pai',
  '乌':'wu','鸦':'ya','喝':'he','瓶':'ping',
  '鸭':'ya','哈':'ha','摇':'yao','摆':'bai','捉':'zhuo',
  '变':'bian','吃':'chi','成':'cheng','急':'ji','睡':'shui',
  '虫':'chong','窝':'wo','爬':'pa','到':'dao','回':'hui','空':'kong',
  '汗':'han','粒':'li','静':'jing','床':'chuang',
  '谢':'xie','礼':'li','貌':'mao','问':'wen','声':'sheng','早':'zao',
  '照':'zhao','甜':'tian','梦':'meng','明':'ming','光':'guang',
  '放':'fang','盒':'he','尺':'chi','笔':'bi','具':'ju','刀':'dao',
  '司':'si','砸':'za','满':'man','缸':'gang',
  '时':'shi','午':'wu','滴':'di','钟':'zhong','答':'da','吵':'chao','啊':'a',
  '短':'duan','尾':'wei','巴':'ba','尖':'jian','蜗':'wo',
  '打':'da','鼓':'gu','舞':'wu','琴':'qin','猴':'hou','猩':'xing',
  '给':'gei','告':'gao','诉':'su','住':'zhu','话':'hua','远':'yuan','近':'jin',
};

function lrGetPinyin(char){
  // Try PINYIN_MAP first, then fall back to the lesson's pinyin field
  if(PINYIN_MAP[char]) return PINYIN_MAP[char];
  const w = lrLesson?.words.find(x=>x.char===char);
  return (w?.pinyin||'').replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e')
    .replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o')
    .replace(/[ūúǔù]/g,'u').replace(/[ǖǘǚǜ]/g,'v').replace(/[0-9]/g,'').trim();
}

function lrScoreResult(char, transcripts){
  const targetPinyin = lrGetPinyin(char) || '';

  // Nothing heard at all — mic probably failed, give benefit of doubt
  if(!transcripts || transcripts.length===0 || transcripts.every(t=>!t.trim())){
    return 70; // Don't give 100 — student must actually speak
  }

  const allText = transcripts.join('');
  // Strip everything non-Chinese and non-latin for clean comparison
  const heard = allText.replace(/\s+/g,'');

  // Method 1: transcript contains the exact character
  if(heard.includes(char)) return 100;

  // Method 2: check if any heard char has SAME pinyin as target (homophones OK)
  const targetBase = targetPinyin.replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e')
    .replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o').replace(/[ūúǔù]/g,'u');
  const heardPinyins = [...heard].map(c=>PINYIN_MAP[c]||'').filter(Boolean);

  // Exact pinyin match (including tone-stripped)
  const heardBases = heardPinyins.map(p=>p.replace(/[āáǎà]/g,'a').replace(/[ēéěè]/g,'e')
    .replace(/[īíǐì]/g,'i').replace(/[ōóǒò]/g,'o').replace(/[ūúǔù]/g,'u'));
  if(targetBase && heardBases.includes(targetBase)) return 90;

  // Partial match: same initial consonant AND same vowel core
  const targetInitial = targetPinyin.match(/^[bpmfdtnlgkhjqxzcsryw]{1,2}/)?.[0] || '';
  const targetFinal   = targetPinyin.replace(targetInitial,'').replace(/[1-4]/,'');

  if(targetInitial && targetFinal){
    // Both initial + final match = close enough
    const partialMatch = heardPinyins.some(p=>{
      const init = p.match(/^[bpmfdtnlgkhjqxzcsryw]{1,2}/)?.[0]||'';
      const fin  = p.replace(init,'').replace(/[1-4]/,'');
      return init===targetInitial && fin===targetFinal;
    });
    if(partialMatch) return 80;
  }

  // Only initial matches
  if(targetInitial && heardPinyins.some(p=>p.startsWith(targetInitial))) return 50;

  // Something was heard but completely wrong
  return 20;
}

function lrScoreBadge(pct){
  let cls='rl-score-c';
  if(pct===100) cls='rl-score-s';
  else if(pct>=95) cls='rl-score-a';
  else if(pct>=80) cls='rl-score-b';
  return `<span class="rl-score-badge ${cls}">${pct}%</span>`;
}

function lrFeedback(i, pct){
  if(pct>=95) return `<div style="font-size:44px;">👍</div><div style="font-size:13px;color:var(--green);font-weight:500;">${pct===100?'太棒了！Perfect!':'很好！Great!'}</div>`;
  if(pct>=80) return `<div style="font-size:40px;">🙂</div><div style="font-size:12px;color:var(--gold);">再试试！Try again!</div>`;
  return `<div style="font-size:36px;">🔄</div>
    <button onclick="lrListenChar(${i})" style="margin-top:4px;padding:3px 10px;border-radius:8px;border:1px solid var(--red);background:var(--red-light);color:var(--red);font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;">🔊 再听</button>`;
}

function lrListenChar(i){
  window.speechSynthesis.cancel();
  const lessonId = lrLesson ? lrLesson.id : '';
  const char = lrLesson.words[i].char;
  if(hasRealAudioTimestamps(lessonId)){
    // Find word index in real audio data (may differ from lesson word order)
    const raData = REAL_AUDIO_DATA[lessonId];
    const raIdx = raData ? raData.words.findIndex(w=>w.char===char) : -1;
    if(raIdx >= 0){
      playRealAudioWord(lessonId, raIdx);
    } else {
      speakChinese(char);
    }
  } else {
    speakChinese(char);
  }
  const card=document.getElementById('lr-card-'+i);
  if(card){card.style.borderColor='var(--blue)';setTimeout(()=>card.style.borderColor='',1200);}
}

async function lrRecord(i){
  window.speechSynthesis.cancel();
  const btn = document.getElementById('lr-rec-'+i);
  if(!btn) return;
  const char = lrLesson.words[i].char;
  const spoken = await recButton(btn, char);
  if(spoken !== null){
    const pct = lrScoreResult(char, spoken ? [spoken] : []);
    lrScores[i] = pct;
    lrUpdateCard(i);
    if(pct>=80) playCorrect();
    else {
      playWrong();
      const wrd = lrLesson.words[i];
      if(wrd) addWrongChar(wrd.char, wrd.pinyin, wrd.meaning||'', '听读练习', lrLesson.subtitle||lrLesson.title||'');
    }
  }
}

function lrUpdateCard(i){
  const pct = lrScores[i];
  const badge = document.getElementById('lr-badge-'+i);
  const feedback = document.getElementById('lr-feedback-'+i);
  const card = document.getElementById('lr-card-'+i);
  if(badge) badge.innerHTML = lrScoreBadge(pct);
  if(feedback) feedback.innerHTML = lrFeedback(i, pct);
  if(card){
    card.style.borderColor = pct>=95?'var(--green)':pct>=80?'var(--gold)':'var(--red)';
    card.style.background = pct>=95?'var(--green-light)':pct>=80?'var(--gold-light)':'var(--red-light)';
  }
  updateLRSummary();
}

function renderLRWords(){
  if(!lrLesson) return;

  // If real audio timestamps exist for this lesson, sort words by audio order
  const lessonId = lrLesson.id;
  const raData = REAL_AUDIO_DATA[lessonId];
  let orderedWords = lrLesson.words.map((w,i)=>({...w, origIdx:i}));
  if(raData && raData.words){
    // Sort by position in real audio (start time)
    const audioOrder = raData.words.map(w=>w.char);
    orderedWords.sort((a,b)=>{
      const ai = audioOrder.indexOf(a.char);
      const bi = audioOrder.indexOf(b.char);
      if(ai===-1 && bi===-1) return 0;
      if(ai===-1) return 1;
      if(bi===-1) return -1;
      return ai - bi;
    });
  }

  // 4-column grid with numbered badges
  document.getElementById('lr-words-list').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">' +
    orderedWords.map((w, displayIdx)=>{
      const i = w.origIdx; // use original index for score/record functions
      const num = displayIdx + 1;
      return `
      <div class="reading-line-card" id="lr-card-${i}" style="text-align:center;padding:20px 10px 14px;transition:all 0.3s;position:relative;">
        <div style="position:absolute;top:8px;left:10px;width:22px;height:22px;border-radius:50%;background:var(--ink);color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;opacity:0.55;">${num}</div>
        <div style="font-family:'KaiTi','楷体','STKaiti','Noto Serif SC',serif;font-size:72px;font-weight:700;color:var(--ink);line-height:1;margin-bottom:16px;">${w.char}</div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
          <button class="rl-listen-btn" onclick="lrListenChar(${i})" style="width:100%;font-size:13px;padding:7px 4px;">🔊 听</button>
          <button class="rl-read-btn" id="lr-rec-${i}" onclick="lrRecord(${i})" style="width:100%;font-size:13px;padding:7px 4px;">🎤 跟读</button>
        </div>
        <div style="margin-top:8px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span id="lr-badge-${i}">${lrScores[i]!==null?lrScoreBadge(lrScores[i]):''}</span>
          <div id="lr-feedback-${i}">${lrScores[i]!==null?lrFeedback(i,lrScores[i]):''}</div>
        </div>
      </div>`;
    }).join('') + '</div>';
  updateLRSummary();
}

function updateLRSummary(){
  const done = lrScores.filter(s=>s!==null).length;
  const total = lrLesson ? lrLesson.words.length : 0;
  const summary = document.getElementById('lr-summary');
  if(!summary) return;
  if(done===total && total>0){
    const avg = Math.round(lrScores.reduce((a,b)=>a+b,0)/total);
    summary.style.display='block';
    if(lrLesson) submitHWCompletion(lrLesson.id, 'listenrecord', avg);
    summary.innerHTML=`
      <div style="font-size:48px;margin-bottom:12px;">${avg>=95?'🌟':avg>=80?'⭐':'🎯'}</div>
      <div style="font-family:serif;font-size:24px;color:var(--ink);margin-bottom:8px;">
        ${avg>=95?'太棒了！Perfect!':avg>=80?'很好！Well done!':'继续加油！Keep practicing!'}
      </div>
      <div style="font-size:15px;color:var(--muted);margin-bottom:16px;">平均分 ${avg}% · ${done}/${total} 个字完成</div>
      <button class="auth-btn" onclick="startListenRecord(lrLesson)" style="display:inline-block;width:auto;padding:10px 24px;">🔄 再练一次 · Try again</button>`;
    submitHWCompletion(lrLesson ? lrLesson.id : '', 'listenrecord', avg);
    const result = recordLessonPlay(lrLesson ? lrLesson.id : 'listenrecord', '听读练习', avg);
    showPointsToast(result);
  } else {
    summary.style.display='none';
  }
}

function exitListenRecord(){
  window.speechSynthesis.cancel();
  if(lrRecognizer){ try{lrRecognizer.abort();}catch(e){} lrRecognizer=null; }
  showScreen('leveldetail');
}

function renderReadingScreen(){
  const r = readingLesson.reading;
  const hasAudio = hasRealAudio(lessonId);
  const audioBar = hasAudio ? `
    <div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <button class="rl-listen-btn" id="full-audio-btn" onclick="playFullAudio()" style="gap:8px;">
        🎵 听全文真人录音 · Play full recording
      </button>
      <span style="font-size:11px;color:var(--green);background:var(--green-light);padding:2px 8px;border-radius:20px;font-weight:500;">✓ 真人录音</span>
    </div>` : '';
  document.getElementById('reading-header').innerHTML=`
    <div class="reading-title">${r.title}</div>
    <div class="reading-sub">${readingLesson.subtitle} · 按行朗读，系统评分 · Read each line aloud</div>
    ${audioBar}`;
  document.getElementById('reading-total').style.display='none';
  readingLineScores = new Array(r.lines.length).fill(null);
  document.getElementById('reading-lines').innerHTML = r.lines.map((line,i)=>
    renderReadingLineHTML(line, i, null)
  ).join('');
}

function playFullAudio(){
  const btn=document.getElementById('full-audio-btn');
  if(btn){btn.innerHTML='⏹ 停止 · Stop';btn.onclick=stopFullAudio;}
  playLessonAudio(readingLesson.id, ()=>{
    const b=document.getElementById('full-audio-btn');
    if(b){b.innerHTML='🎵 听全文真人录音 · Play full recording';b.onclick=playFullAudio;}
  });
}

function stopFullAudio(){
  stopLessonAudio();
  const btn=document.getElementById('full-audio-btn');
  if(btn){btn.innerHTML='🎵 听全文真人录音 · Play full recording';btn.onclick=playFullAudio;}
}

function renderReadingLineHTML(line, i, result){
  const isPunct = c => /[，。！？、：；""''《》【】\s]/.test(c);
  const chars = [...line];

  let charHtml;
  if(result){
    charHtml = chars.map(c=>{
      if(isPunct(c)) return `<span class="rl-char punct">${c}</span>`;
      return `<span class="rl-char ${result.matched.includes(c)?'correct':'wrong'}">${c}</span>`;
    }).join('');
  } else {
    charHtml = chars.map(c=>
      isPunct(c) ? `<span class="rl-char punct">${c}</span>` : `<span class="rl-char">${c}</span>`
    ).join('');
  }

  let scoreHtml='', feedbackHtml='';
  if(result){
    const pct=result.pct;
    let cls='rl-score-c';
    if(pct===100) cls='rl-score-s';
    else if(pct>=95) cls='rl-score-a';
    else if(pct>=85) cls='rl-score-b';
    scoreHtml=`<span class="rl-score-badge ${cls}">${pct}%</span>`;
    const wrong=chars.filter(c=>!isPunct(c)&&!result.matched.includes(c));
    feedbackHtml = wrong.length
      ? `<div class="rl-feedback">读错了 Wrong: ${wrong.map(c=>`
          <span style="display:inline-flex;align-items:center;gap:3px;margin:2px 4px;">
            <span style="color:var(--red);font-family:'Noto Serif SC',serif;font-size:18px;font-weight:500;">${c}</span>
            <button onclick="speakChinese('${c}')" style="padding:2px 6px;border-radius:8px;border:1px solid var(--red);background:var(--red-light);color:var(--red);font-size:10px;cursor:pointer;font-family:DM Sans,sans-serif;" title="听正确读音 · Hear correct pronunciation">🔊</button>
          </span>`).join('')}
        </div>`
      : `<div class="rl-feedback" style="color:var(--green);">全对！Perfect! ✓</div>`;
  }

  return `
    <div class="reading-line-card" id="rl-card-${i}">
      <div class="reading-line-text">${charHtml}</div>
      <div class="reading-line-controls">
        <button class="rl-listen-btn" onclick="listenLine(${i})">🔊 听 · Listen</button>
        <button class="rl-read-btn" id="rl-read-btn-${i}" onclick="startReadLine(${i})">🎙️ 读 · Read</button>
        ${scoreHtml}
      </div>
      ${feedbackHtml}
    </div>`;
}

function listenLine(i){
  stopLessonAudio();
  window.speechSynthesis.cancel();
  // Per-line: always use TTS so the student hears just that line clearly
  // The full recording button plays the whole song
  speakChinese(readingLesson.reading.lines[i]);
}

async function startReadLine(i){
  const line = readingLesson.reading.lines[i];
  const btn = document.getElementById('rl-read-btn-'+i);
  if(!btn) return;
  const isPunct = c => /[，。！？、：；""''《》【】\s]/.test(c);
  const targetChars = [...line].filter(c=>!isPunct(c));
  const spoken = await recButton(btn, line);
  if(spoken !== null){
    const heard = spoken || '';
    const matched = targetChars.filter(c=>heard.includes(c));
    const pct = targetChars.length ? Math.round((matched.length/targetChars.length)*100) : 100;
    const wrongChars = targetChars.filter(c=>!heard.includes(c));
    const lessonLabel = readingLesson ? (readingLesson.subtitle||readingLesson.title||'') : '';
    wrongChars.forEach(c => addWrongChar(c, krGetPinyin(c), '', '朗读练习', lessonLabel));
    readingLineScores[i] = pct;
    const accPts = accuracyPoints(pct);
    const data = getUserData();
    data.total=(data.total||0)+accPts.pts;
    if(!data.history) data.history=[];
    data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:readingLesson.id,mode:'朗读练习',count:1,pts:accPts.pts,reason:'朗读第'+(i+1)+'行 '+accPts.label});
    saveUserData(data);
    const card=document.getElementById('rl-card-'+i);
    if(card) card.outerHTML=renderReadingLineHTML(line,i,{matched,pct});
    if(readingLineScores.every(s=>s!==null)) showReadingTotal();
  }
}

function showReadingTotal(){
  if(readingLesson){
    const avg=readingLineScores.length?Math.round(readingLineScores.reduce((a,b)=>a+b,0)/readingLineScores.length):0;
    submitHWCompletion(readingLesson.id,'reading',avg);
  }
  const scores=readingLineScores.filter(s=>s!==null);
  const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const data=getUserData();
  const el=document.getElementById('reading-total');
  el.style.display='block';
  el.innerHTML=`
    <div class="reading-total-score">${avg}%</div>
    <div class="reading-total-label">全文平均正确率 · Overall accuracy</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px;">总积分 Total: <strong style="color:var(--gold)">${data.total}</strong> ⭐</div>
    <div style="display:flex;gap:10px;">
      <button class="btn-result" onclick="renderReadingScreen()" style="flex:1;">再读一遍 · Try again</button>
      <button class="btn-result primary" onclick="exitReading()" style="flex:1;">完成 · Done</button>
    </div>`;
  el.scrollIntoView({behavior:'smooth'});
}

// ════════════════════════════════════════
// ADMIN PORTAL
// ════════════════════════════════════════
const ADMIN_CREDENTIALS = { username:'admin' };   // 明文密码已移除；登录仅走云端验证（保留 username 供云端注册/迁移引用）
let currentAdmin = null;
let adminTab = 'students';
let editingStudentKey = null;

async function doAdminLogin(){
  const u = document.getElementById('admin-username').value.trim().toLowerCase();
  const p = document.getElementById('admin-pwd').value.trim();
  const err = document.getElementById('admin-err');
  if(!u){ err.textContent='请输入用户名'; return; }
  if(!p){ err.textContent='请输入密码'; return; }

  // ☁️ 仅允许云端验证登录——不再有本地明文密码兜底（防止断网时本地登入修改数据、造成与云端不一致）
  if(!window.firebaseReady || !window.cloudAuth){
    err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
    return;
  }
  err.textContent = '☁️ 云端登录中... · Connecting...';
  try {
    const result = await window.cloudAuth.loginAdmin(u, p);
    if(result.ok){
      err.textContent='';
      setPwdFree('admin', 'admin');   // ✅ 仅云端真正验过密码才开 30 天免密
      currentAdmin = { username: u, _cloudUid: result.uid, _fromCloud: true };
      localStorage.setItem('czmd_admin', JSON.stringify(currentAdmin));
      addRecentAccount({ username: 'admin', name: '管理员', classCode: '__admin__', bg: 'admin' });
      setCloudSessionStatus(true);
      await loadSharedCloudCaches();
      showScreen('admin');
      renderAdminDashboard();
      return;
    }
    // 云端可达但验证失败 → 账号/密码错误；网络类错误归到网络提示
    if(result.error === 'auth/network-request-failed'){
      err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
    } else {
      err.textContent='用户名或密码错误 · Incorrect username or password.';
    }
  } catch(e) {
    console.log('☁️ Admin 云端登录异常:', e && e.message);
    err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
  }
}

function doAdminLogout(){
  clearPwdFree('admin', 'admin');   // 主动退出即清免密
  currentAdmin = null;
  localStorage.removeItem('czmd_admin');
  showScreen('auth');
}

// 切换账号：只回登录页，不清免密（保留 czmd_pwdfree_until_admin_admin 与 czmd_admin），方便点最近登录里的其他账号。
// 想彻底安全退出请用「退出 · Log out」（doAdminLogout 会清免密）。
function switchAdminAccount(){ showScreen('auth'); }

function renderAdminDashboard(){
  // User bar
  document.getElementById('admin-user-bar').innerHTML=`
    <div class="user-bar-info"><span class="user-bar-name">⚙️ Administrator</span></div>
    <div class="user-bar-actions" style="display:flex;gap:6px;flex-wrap:wrap;">
      <button class="user-bar-btn" onclick="adminExportData()" style="background:var(--green);color:white;border-color:var(--green);">📥 导出数据</button>
      <button class="user-bar-btn" onclick="document.getElementById('admin-import-input').click()" style="background:var(--blue);color:white;border-color:var(--blue);">📤 导入数据</button>
      <button class="user-bar-btn" onclick="adminCloudMigrate()" style="background:#7c3aed;color:white;border-color:#7c3aed;">☁️ 学生上云</button>
      <input type="file" id="admin-import-input" accept=".json" style="display:none;" onchange="adminImportData(this)"/>
      <button class="user-bar-btn" onclick="switchAdminAccount()">🔄 切换账号 · Switch account</button>
      <button class="user-bar-btn" onclick="doAdminLogout()">Log out</button>
    </div>`;

  // Stats
  const users = loadUsers();
  const students = Object.values(users);
  const teachers = Object.keys(TEACHER_ACCOUNTS);
  const hw = getAssignedHW();
  const requests = getRedeemRequests();
  const pendingRedeem = requests.filter(r=>!r.collected).length;
  document.getElementById('admin-stats').innerHTML=`
    <div class="admin-stat-card"><div class="admin-stat-num">${students.length}</div><div class="admin-stat-label">👤 Students</div></div>
    <div class="admin-stat-card"><div class="admin-stat-num">${teachers.length}</div><div class="admin-stat-label">👩‍🏫 Teachers</div></div>
    <div class="admin-stat-card"><div class="admin-stat-num">${pendingRedeem}</div><div class="admin-stat-label">🎁 Pending</div></div>`;

  switchAdminTab(adminTab);
}

function switchAdminTab(tab){
  adminTab=tab;
  ['students','teachers','classes','homework','resources','redeem'].forEach(t=>{
    document.getElementById('atab-'+t)?.classList.toggle('active',t===tab);
    const p=document.getElementById('admin-panel-'+t);
    if(p) p.style.display=t===tab?'block':'none';
  });
  if(tab==='students') renderAdminStudents();
  else if(tab==='teachers') renderAdminTeachers();
  else if(tab==='classes') renderAdminClasses();
  else if(tab==='homework'){ adminHWTab='lessons'; switchAdminHWTab('lessons'); initAdminLibrary(); }
  else if(tab==='checkin'){ switchAdminTab('homework'); switchAdminHWTab('template'); }
  else if(tab==='resources') renderResourcesPanel();
  else if(tab==='redeem'){ adminRewardTab='rewards'; switchRedeemTab('rewards'); }
}

// ── Students ──
// ── Helper: get all classes for a student ──
function getStudentClasses(u){
  // Support both old single classCode and new classes[] array
  if(u.classes && u.classes.length) return [...u.classes];
  return u.classCode ? [u.classCode] : [];
}

let adminStudentNoClassFilter = false;

function toggleNoClassFilter(){
  adminStudentNoClassFilter = !adminStudentNoClassFilter;
  const btn = document.getElementById('btn-noclass-filter');
  if(btn){
    btn.style.background = adminStudentNoClassFilter ? 'var(--blue)' : 'var(--blue-light)';
    btn.style.color = adminStudentNoClassFilter ? 'white' : 'var(--blue)';
  }
  renderAdminStudents();
}

function renderAdminStudents(){
  const q=(document.getElementById('admin-student-search')?.value||'').toLowerCase();
  const users=loadUsers();
  const list=document.getElementById('admin-students-list');
  // De-duplicate by name (show each student once, with all their classes)
  const byName={};
  Object.entries(users).forEach(([k,u])=>{
    const name=u.name||'';
    if(!byName[name]) byName[name]={keys:[],u,classes:[]};
    byName[name].keys.push(k);
    const cls=u.classCode||'';
    if(cls && !byName[name].classes.includes(cls)) byName[name].classes.push(cls);
    (u.classes||[]).forEach(c=>{ if(!byName[name].classes.includes(c)) byName[name].classes.push(c); });
  });
  const filtered=Object.entries(byName).filter(([name,d])=>{
    if(adminStudentNoClassFilter && d.classes.length>0) return false;
    return !q||name.toLowerCase().includes(q)||(d.u.username||'').toLowerCase().includes(q)||d.classes.some(c=>c.toLowerCase().includes(q));
  }).sort(([,a],[,b])=>{
    const aHas = a.classes.length > 0;
    const bHas = b.classes.length > 0;
    if(aHas && !bHas) return -1;
    if(!aHas && bHas) return 1;
    const aName = (a.u.username||a.u.name||'').toUpperCase();
    const bName = (b.u.username||b.u.name||'').toUpperCase();
    return aName.localeCompare(bName);
  });
  // Update button count
  const noClassCount = Object.entries(byName).filter(([,d])=>d.classes.length===0).length;
  const filterBtn = document.getElementById('btn-noclass-filter');
  if(filterBtn) filterBtn.textContent = `未分班 ${noClassCount}`;
  if(!filtered.length){ list.innerHTML='<div class="empty-review">No students found.</div>'; return; }
  list.innerHTML=filtered.map(([name,d])=>{
    const primaryKey=d.keys[0];
    const u=d.u;
    const username=u.username||u.name||name;
    const chname=u.chname||u.nickname||'';
    const ptsKey='czmd_pts_'+primaryKey;
    const pts=JSON.parse(localStorage.getItem(ptsKey)||'{"total":0}').total||0;
    const clsBadges=d.classes.map(c=>`<span style="font-size:11px;background:var(--blue-light);color:var(--blue);padding:1px 6px;border-radius:8px;font-weight:500;">${c}</span>`).join(' ');
    const noClass = d.classes.length === 0;
    return `
      <div class="admin-row" style="padding:10px 14px;${noClass?'border-left:3px solid var(--blue);':''}">
        <div class="admin-row-info" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-size:14px;font-weight:500;color:${noClass?'var(--blue)':'var(--ink)'};white-space:nowrap;">${username}${chname?` <span style="font-size:12px;color:var(--muted);">· ${chname}</span>`:''}</div>
          <div style="display:flex;gap:3px;flex-wrap:wrap;">${clsBadges||'<span style="font-size:11px;background:var(--blue-light);color:var(--blue);padding:1px 6px;border-radius:8px;">未分班</span>'}</div>
          <div style="font-size:12px;color:var(--muted);">⭐ ${pts}分</div>
        </div>
        <div class="admin-row-actions" style="flex-direction:row;gap:4px;flex-shrink:0;">
          <button class="admin-btn blue" onclick="openEditUsername('${primaryKey}')">用户名</button>
          <button class="admin-btn blue" onclick="openManageClasses('${primaryKey}','${username}')">班级</button>
          <button class="admin-btn blue" onclick="openEditPts('${primaryKey}','${username}',${pts})">积分</button>
          <button class="admin-btn red" onclick="deleteStudent('${primaryKey}')">删除</button>
        </div>
      </div>`;
  }).join('');
}

function openAddStudentModal(){
  document.getElementById('new-stu-name').value='';
  document.getElementById('new-stu-class').value='';
  document.getElementById('add-stu-err').textContent='';
  document.getElementById('add-student-modal').style.display='flex';
}

function confirmAddStudent(){
  const name=document.getElementById('new-stu-name').value.trim();
  const cls=document.getElementById('new-stu-class').value.trim().toUpperCase();
  const err=document.getElementById('add-stu-err');
  if(!name){err.textContent='请输入姓名';return;}
  if(!cls){err.textContent='请输入班级';return;}
  const users=loadUsers();
  const k=userKey(name,cls);
  if(users[k]){err.textContent='该学生已存在';return;}
  users[k]={name, classCode:cls, classes:[cls], bg:'native'};
  saveUsers(users);
  closeAdminModal('add-student-modal');
  renderAdminStudents();
  renderAdminDashboard();
}

function deleteStudent(key){
  if(!confirm('确定删除该学生账号？')) return;
  const users=loadUsers();
  delete users[key];
  saveUsers(users);
  cloudMapDeleteKeys('users','items',[key]);
  localStorage.removeItem('czmd_pts_'+key);
  localStorage.removeItem('czmd_needs_review_'+key);
  localStorage.removeItem('czmd_all_reviewed_'+key);
  renderAdminStudents();
  renderAdminDashboard();
}

// ── Manage Classes Modal ──
let mcmStudentKey='';
let mcmOriginalClasses=[];   // 打开弹窗时的班级快照，供「取消」回滚

function openManageClasses(key, name){
  mcmStudentKey=key;
  // 快照打开前的班级（增删即时生效，「取消」据此回滚到打开前的状态）
  try{ const _u=loadUsers()[key]; mcmOriginalClasses = _u ? getStudentClasses(_u).slice() : []; }
  catch(e){ mcmOriginalClasses=[]; }
  document.getElementById('mcm-title').textContent='管理班级 · '+name;
  document.getElementById('mcm-sub').textContent='可添加多个班级，学生作业显示所有班级的作业';
  document.getElementById('mcm-add-input').value='';
  document.getElementById('mcm-err').textContent='';
  renderMCMClasses();
  // Build class grid Z1-Z99
  document.getElementById('mcm-class-grid').innerHTML=ALL_CLASSES.map(c=>`
    <div class="assign-cls-tile" onclick="mcmQuickAdd('${c}')" title="${c}">${c}</div>
  `).join('');
  document.getElementById('manage-classes-modal').style.display='flex';
}

function renderMCMClasses(){
  const users=loadUsers();
  const u=users[mcmStudentKey];
  if(!u) return;
  const classes=getStudentClasses(u);
  const el=document.getElementById('mcm-current-classes');
  if(!classes.length){
    el.innerHTML='<div style="font-size:13px;color:var(--muted);">暂无班级 · No classes</div>';
    return;
  }
  el.innerHTML=classes.map(c=>`
    <div style="display:inline-flex;align-items:center;gap:6px;background:var(--blue-light);border:1px solid var(--blue);border-radius:20px;padding:4px 10px;margin:3px;">
      <span style="font-size:13px;font-weight:500;color:var(--blue);">${c}</span>
      <button onclick="mcmRemoveClass('${c}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;line-height:1;padding:0;">×</button>
    </div>`).join('');
}

function mcmAddClass(cls){
  const input=document.getElementById('mcm-add-input');
  const c=(cls||input.value||'').trim().toUpperCase();
  const err=document.getElementById('mcm-err');
  if(!c){err.textContent='请输入班级编号';return;}
  const users=loadUsers();
  const u=users[mcmStudentKey];
  if(!u){err.textContent='学生不存在';return;}
  const classes=getStudentClasses(u);
  if(classes.includes(c)){err.textContent=`已在 ${c} 班级中`;return;}
  classes.push(c);
  u.classes=classes;
  u.classCode=classes[0]; // primary class = first
  saveUsers(users);
  err.textContent='';
  input.value='';
  renderMCMClasses();
  renderAdminStudents();
}

function mcmQuickAdd(c){ mcmAddClass(c); }

function mcmRemoveClass(cls){
  const users=loadUsers();
  const u=users[mcmStudentKey];
  if(!u) return;
  let classes=getStudentClasses(u).filter(c=>c!==cls);
  u.classes=classes;
  u.classCode=classes[0]||'';
  saveUsers(users);
  renderMCMClasses();
  renderAdminStudents();
}

// 「取消」：回滚到打开弹窗前的班级快照（放弃本次所有增删），然后关闭弹窗。
// 走 saveUsers 写回——若云端写入失败，cloudWriteRef 会触发 notifyCloudWriteFailed（不静默）。
function mcmCancelChanges(){
  const users=loadUsers();
  const u=users[mcmStudentKey];
  if(u){
    const restored=(mcmOriginalClasses||[]).slice();
    u.classes=restored;
    u.classCode=restored[0]||'';
    saveUsers(users);
    if(typeof renderAdminStudents==='function') renderAdminStudents();
  }
  closeAdminModal('manage-classes-modal');
}

// ── Class Management ──
let classSeriesFilter = 'all';

// Custom classes storage (in addition to ALL_CLASSES defaults)
function getCustomClasses(){
  return safeParseJSON(localStorage.getItem('czmd_custom_classes'), []);
}
function saveCustomClasses(list){
  localStorage.setItem('czmd_custom_classes', JSON.stringify(list));
  // Cloud sync is per-class at each call site (cloudArrayUpsert/Remove on the
  // classes doc's customClasses field).
}
function getAllManagedClasses(){
  const custom = getCustomClasses();
  return [
    ...ALL_CLASSES.map(code=>{
      const custom_info = custom.find(c=>c.code===code);
      if(custom_info) return custom_info;
      // Fall back to czmd_cls_meta for teacher info
      try {
        const meta = JSON.parse(localStorage.getItem('czmd_cls_meta_'+code)||'{}');
        return {code, series:code[0], desc: meta.label||'', teacher: meta.teacher||''};
      } catch(e){ return {code, series:code[0], desc:'', teacher:''}; }
    }),
    ...custom.filter(c=>!ALL_CLASSES.includes(c.code))
  ];
}

function filterClassSeries(series){
  classSeriesFilter = series;
  ['all','z','h','y','n','custom'].forEach(s=>{
    document.getElementById('cls-series-'+s)?.classList.toggle('active', s===series);
  });
  renderAdminClasses();
}

function renderAdminClasses(){
  const q=(document.getElementById('admin-class-search')?.value||'').toLowerCase();
  const allClasses = getAllManagedClasses();
  const users = loadUsers();

  let filtered = allClasses;
  if(classSeriesFilter!=='all'){
    if(classSeriesFilter==='custom'){
      const customCodes = getCustomClasses().filter(c=>!ALL_CLASSES.includes(c.code)).map(c=>c.code);
      filtered = allClasses.filter(c=>customCodes.includes(c.code));
    } else {
      filtered = allClasses.filter(c=>c.code.startsWith(classSeriesFilter.toUpperCase()));
    }
  }
  if(q) filtered = filtered.filter(c=>c.code.toLowerCase().includes(q)||(c.desc||'').toLowerCase().includes(q)||(c.teacher||'').toLowerCase().includes(q));

  // Stats
  const zCount = allClasses.filter(c=>c.code.startsWith('Z')).length;
  const hCount = allClasses.filter(c=>c.code.startsWith('H')).length;
  const yCount = allClasses.filter(c=>c.code.startsWith('Y')).length;
  const nCount = allClasses.filter(c=>c.code.startsWith('N')).length;
  document.getElementById('admin-class-stats').innerHTML=`
    <div class="admin-stat-card" style="cursor:pointer;" onclick="filterClassSeries('Z')"><div class="admin-stat-num" style="font-size:22px;">${zCount}</div><div class="admin-stat-label">Z 系列</div></div>
    <div class="admin-stat-card" style="cursor:pointer;" onclick="filterClassSeries('H')"><div class="admin-stat-num" style="font-size:22px;">${hCount}</div><div class="admin-stat-label">H 系列</div></div>
    <div class="admin-stat-card" style="cursor:pointer;" onclick="filterClassSeries('Y')"><div class="admin-stat-num" style="font-size:22px;">${yCount}</div><div class="admin-stat-label">Y 系列</div></div>
    <div class="admin-stat-card" style="cursor:pointer;" onclick="filterClassSeries('N')"><div class="admin-stat-num" style="font-size:22px;">${nCount}</div><div class="admin-stat-label">N 系列</div></div>`;

  const grid = document.getElementById('admin-class-grid');
  if(!filtered.length){ grid.innerHTML='<div class="empty-review">No classes found.</div>'; return; }

  grid.innerHTML = filtered.map(cls=>{
    const memberCount = Object.values(users).filter(u=>
      getStudentClasses(u).includes(cls.code)
    ).length;
    const hwCount = getAssignedHW().filter(a=>a.classCode===cls.code&&!isHWExpired(a)).length;
    const isCustom = getCustomClasses().some(c=>c.code===cls.code);
    return `
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-family:serif;font-size:20px;color:var(--ink);">${cls.code}</div>
          <span style="font-size:10px;background:${cls.code[0]==='Z'?'var(--red-light)':cls.code[0]==='H'?'#f3e8ff':cls.code[0]==='Y'?'var(--blue-light)':'var(--green-light)'};color:${cls.code[0]==='Z'?'var(--red)':cls.code[0]==='H'?'#8e44ad':cls.code[0]==='Y'?'var(--blue)':'var(--green)'};padding:2px 8px;border-radius:10px;font-weight:600;">${cls.code[0]} 系列</span>
        </div>
        ${cls.desc?`<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">📝 ${cls.desc}</div>`:''}
        ${cls.teacher?`<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">👩‍🏫 ${cls.teacher}</div>`:''}
        <div style="display:flex;gap:8px;font-size:11px;color:var(--muted);margin-bottom:10px;">
          <span>👤 ${memberCount} 名学生</span>
          <span>📚 ${hwCount} 项作业</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="admin-btn blue" style="flex:1;" onclick="viewClassMembers('${cls.code}')">查看成员</button>
          <button class="admin-btn blue" style="flex:1;" onclick="editClassInfo('${cls.code}')">编辑</button>
          ${isCustom?`<button class="admin-btn red" onclick="deleteCustomClass('${cls.code}')">删除</button>`:''}
        </div>
      </div>`;
  }).join('');
}

function openAddClassModal(){
  document.getElementById('new-cls-series').value='Z';
  document.getElementById('new-cls-code').value='';
  document.getElementById('new-cls-desc').value='';
  document.getElementById('new-cls-teacher').value='';
  document.getElementById('add-cls-err').textContent='';
  updateClassCodePreview();
  document.getElementById('add-class-modal').style.display='flex';
}

function updateClassCodePreview(){
  const series = document.getElementById('new-cls-series').value;
  const hint = document.getElementById('cls-code-hint');
  if(series==='Z') hint.textContent='Z班级编号：Z1–Z99，例如 Z15';
  else if(series==='H') hint.textContent='H班级编号：H1–H60，例如 H12';
  else if(series==='Y') hint.textContent='Y班级编号：Y1–Y15，例如 Y3';
  else if(series==='N') hint.textContent='N班级编号：N1–N26，例如 N8';
  else hint.textContent='自定义编号，例如 BEGINNER-A';
}

function confirmAddClass(){
  const code = document.getElementById('new-cls-code').value.trim().toUpperCase();
  const desc = document.getElementById('new-cls-desc').value.trim();
  const teacher = document.getElementById('new-cls-teacher').value.trim();
  const err = document.getElementById('add-cls-err');
  if(!code){err.textContent='请输入班级编号'; return;}

  const custom = getCustomClasses();
  if(custom.find(c=>c.code===code)||ALL_CLASSES.includes(code)){
    // Update existing info
    const idx = custom.findIndex(c=>c.code===code);
    if(idx>=0){ custom[idx]={...custom[idx],desc,teacher}; }
    else { custom.push({code,series:code[0],desc,teacher}); }
  } else {
    custom.push({code, series:code[0]||'Z', desc, teacher});
    // Also add to ALL_CLASSES if not already there
    if(!ALL_CLASSES.includes(code)) ALL_CLASSES.push(code);
  }
  saveCustomClasses(custom);
  cloudArrayUpsert('classes', custom.find(c=>c.code===code), c=>c.code, 'customClasses');
  closeAdminModal('add-class-modal');
  renderAdminClasses();
}

function deleteCustomClass(code){
  if(!confirm(`确定删除班级 ${code}？学生不会被删除，但会失去该班级关联。`)) return;
  const custom = getCustomClasses().filter(c=>c.code!==code);
  saveCustomClasses(custom);
  cloudArrayRemove('classes', c=>c.code===code, 'customClasses');
  const idx = ALL_CLASSES.indexOf(code);
  if(idx>=0) ALL_CLASSES.splice(idx,1);
  renderAdminClasses();
}

function editClassInfo(code){
  const custom = getCustomClasses();
  const info = custom.find(c=>c.code===code)||{code,desc:'',teacher:''};
  document.getElementById('new-cls-series').value = code[0]||'Z';
  document.getElementById('new-cls-code').value = code;
  document.getElementById('new-cls-desc').value = info.desc||'';
  document.getElementById('new-cls-teacher').value = info.teacher||'';
  document.getElementById('add-cls-err').textContent='';
  document.getElementById('add-class-modal').style.display='flex';
}

function viewClassMembers(code){
  openTeacherClassDetail(code, true);
}

// ── Student Profile ──
function openStudentProfile(){
  if(!currentUser) return;
  document.getElementById('profile-username').value = currentUser.username||currentUser.name||'';
  document.getElementById('profile-chname').value = currentUser.chname||'';
  document.getElementById('profile-nickname').value = currentUser.nickname||'';
  document.getElementById('profile-class').value = currentUser.classCode||'';
  document.getElementById('profile-err').textContent='';
  document.getElementById('student-profile-modal').style.display='flex';
}

function closeStudentProfile(){
  document.getElementById('student-profile-modal').style.display='none';
}

function confirmStudentProfile(){
  const chname   = document.getElementById('profile-chname').value.trim();
  const nickname = document.getElementById('profile-nickname').value.trim();
  const users = loadUsers();
  const key = userKey(currentUser.username||currentUser.name, currentUser.classCode);
  if(users[key]){
    users[key].chname   = chname;
    users[key].nickname = nickname;
    // Update display name: nickname > chname > username
    users[key].name = nickname||chname||(currentUser.username||currentUser.name);
    saveUsers(users);
    currentUser = users[key];
    localStorage.setItem('czmd_current_user', JSON.stringify(currentUser));
    syncCurrentStudentProfile();
  }
  closeStudentProfile();
  // Refresh user bar
  if(isNative()) renderLevelMap();
  else renderHome();
}

// ── Admin: edit username ──
let editingUsernameKey = '';

function openEditUsername(key){
  const u = loadUsers()[key];            // 改为内部按 key 取学生对象（不再从 onclick 传整个对象）
  if(!u){ alert('学生不存在 · Student not found'); return; }
  editingUsernameKey = key;
  document.getElementById('edit-username-sub').textContent = `当前用户名：${u.username||u.name} · 班级：${u.classCode}`;
  document.getElementById('edit-username-val').value = (u.username||u.name||'').toUpperCase();
  document.getElementById('edit-chname-val').value = u.chname||u.nickname||'';
  document.getElementById('edit-username-err').textContent='';
  document.getElementById('edit-username-modal').style.display='flex';
}

function confirmEditUsername(){
  const newUsername = document.getElementById('edit-username-val').value.trim().toUpperCase().replace(/\s+/g,'');
  const chname = document.getElementById('edit-chname-val').value.trim();
  const err = document.getElementById('edit-username-err');
  if(!newUsername){ err.textContent='请输入用户名'; return; }
  if(!/^[A-Z0-9_]+$/.test(newUsername)){ err.textContent='只能含英文字母和数字'; return; }

  const users = loadUsers();
  const u = users[editingUsernameKey];
  if(!u){ err.textContent='用户不存在'; return; }

  // Create new key if username changed
  const newKey = userKey(newUsername, u.classCode);
  if(newKey !== editingUsernameKey && users[newKey]){
    err.textContent='该用户名已被占用 · Username already taken'; return;
  }

  // Migrate data to new key
  const updatedUser = {...u, username:newUsername, chname, nickname:chname,
    name: chname||newUsername};
  if(newKey !== editingUsernameKey){
    delete users[editingUsernameKey];
    // Migrate points
    const ptsData = localStorage.getItem('czmd_pts_'+editingUsernameKey);
    if(ptsData){ localStorage.setItem('czmd_pts_'+newKey, ptsData); localStorage.removeItem('czmd_pts_'+editingUsernameKey); }
  }
  users[newKey] = updatedUser;
  saveUsers(users);
  if(newKey!==editingUsernameKey) cloudMapDeleteKeys('users','items',[editingUsernameKey]);
  closeAdminModal('edit-username-modal');
  renderAdminStudents();
}
function openEditPts(key,name,pts){
  editingStudentKey=key;
  document.getElementById('edit-pts-title').textContent='修改积分 · '+name;
  document.getElementById('edit-pts-sub').textContent='当前积分 Current: '+pts;
  document.getElementById('edit-pts-val').value=pts;
  document.getElementById('edit-pts-modal').style.display='flex';
}

// Admin/teacher editing ANOTHER student's points. The normal points sync path
// (dataStore.points / getPointsDocRef) is keyed to the logged-in user, so here we
// resolve the target student's own cloud uid from the synced users directory and
// write to their points doc directly. We write the FULL normalized object (total +
// history + byClass + sessionCounts) — the same object we store locally — so the
// cloud copy stays internally consistent and matches what the student's device shows.
// Known tradeoff: it can still conflict with the student's not-yet-synced pending
// points. Returns true if a cloud write was issued (false when the student has no
// cloud uid yet, i.e. never cloud-logged-in).
function cloudWriteStudentPoints(studentKey, data){
  if(!cloudReadyForData() || !window.cloudAuth._setDoc) return false;
  const u = loadUsers()[studentKey];
  const uid = u && u._cloudUid;
  if(!uid) return false;
  const ref = window.cloudAuth._doc(window.cloudAuth.db, 'students', uid, 'progress', 'points');
  const payload = (typeof normalizePointsData === 'function') ? normalizePointsData(data) : data;
  payload.updatedAt = new Date().toISOString();
  window.cloudAuth._setDoc(ref, payload, {merge:true})
    .catch(e=>{ console.warn('Admin points cloud write failed:', e); notifyCloudWriteFailed(); });
  return true;
}

function confirmEditPts(){
  if(!editingStudentKey) return;
  const newPts=parseInt(document.getElementById('edit-pts-val').value)||0;
  const ptsKey='czmd_pts_'+editingStudentKey;
  let d=JSON.parse(localStorage.getItem(ptsKey)||'{"total":0,"history":[],"sessionCounts":{}}');
  d.total=newPts;
  d.history=d.history||[];
  d.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:'admin',mode:'管理员修改',count:0,pts:newPts,reason:`管理员设置积分为 ${newPts} 分`});
  // Normalize so total/history/byClass are mutually consistent, and store the same
  // object locally and (below) in the cloud.
  d = (typeof normalizePointsData === 'function') ? normalizePointsData(d) : d;
  d.total = newPts; // normalize keeps total as set; keep the admin override explicit
  localStorage.setItem(ptsKey,JSON.stringify(d));
  // Push the full points object to the student's own cloud points doc.
  const cloudReady = cloudReadyForData();
  const synced = cloudWriteStudentPoints(editingStudentKey, d);
  if(cloudReady && !synced){
    alert('已保存到本地。\n该学生还没有云端登录记录，本次改分暂时无法同步到云端——等该学生用云端账号登录过一次后，再改一次即可上云。');
  }
  closeAdminModal('edit-pts-modal');
  renderAdminStudents();
}

// ── Teachers ──
function getTeacherAccounts(){
  const stored=localStorage.getItem('czmd_teacher_accounts');
  return stored ? {...TEACHER_ACCOUNTS,...JSON.parse(stored)} : TEACHER_ACCOUNTS;
}
function saveExtraTeachers(extra){
  localStorage.setItem('czmd_teacher_accounts',JSON.stringify(extra));
  cloudWriteRef(cloudAppDataRef('teacherAccounts'), {items: extra || {}});
}

function renderAdminTeachers(){
  const all=getTeacherAccounts();
  const list=document.getElementById('admin-teachers-list');
  list.innerHTML=Object.entries(all).map(([name,acct])=>`
    <div class="admin-row">
      <div class="admin-row-info">
        <div class="admin-row-name">👩‍🏫 ${name}</div>
        <div class="admin-row-sub">班级 Classes: ${(acct.classes||[]).slice(0,8).join(', ')}${(acct.classes||[]).length>8?'…':''}</div>
      </div>
      <div class="admin-row-actions">
        <button class="admin-btn red" onclick="deleteTeacher('${name}')">删除</button>
      </div>
    </div>`).join('');
}

function openAddTeacherModal(){
  document.getElementById('new-tea-name').value='';
  document.getElementById('new-tea-pwd').value='';
  document.getElementById('new-tea-classes').value='';
  document.getElementById('add-tea-err').textContent='';
  document.getElementById('add-teacher-modal').style.display='flex';
}

function confirmAddTeacher(){
  const name=document.getElementById('new-tea-name').value.trim();
  const pwd=document.getElementById('new-tea-pwd').value.trim();
  const clsRaw=document.getElementById('new-tea-classes').value.trim();
  const err=document.getElementById('add-tea-err');
  if(!name){err.textContent='请输入姓名';return;}
  if(!pwd){err.textContent='请输入密码';return;}
  const classes=clsRaw?clsRaw.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean):ALL_CLASSES;
  const stored=JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
  stored[name]={password:pwd,classes};
  saveExtraTeachers(stored);
  // Also patch TEACHER_ACCOUNTS at runtime
  TEACHER_ACCOUNTS[name]={password:pwd,classes};
  closeAdminModal('add-teacher-modal');
  renderAdminTeachers();
  renderAdminDashboard();
}

function deleteTeacher(name){
  if(!confirm('确定删除教师账号 '+name+'？')) return;
  const stored=JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
  delete stored[name];
  delete TEACHER_ACCOUNTS[name];
  saveExtraTeachers(stored);
  cloudMapDeleteKeys('teacherAccounts','items',[name]);
  renderAdminTeachers();
  renderAdminDashboard();
}

// ── Homework ──
// ── 21 Level tabs definition ──
// Map lesson level strings to tab keys (shared)
const LEVEL_TO_TAB = {
  '一年级 Level 1': 'yi1l1',
  '一年级 Level 2': 'yi1l2',
  '二年级 Level 1': 'er1',
  '二年级 Level 2': 'er2',
  '三年级 Level 1': 'san1',
  '三年级 Level 2': 'san2',
  '三年级 Level 3': 'san3',
  '四年级 Level 1': 'si1',
  '四年级 Level 2': 'si2',
  '四年级 Level 3': 'si3',
  '五年级 Level 1': 'wu1',
  '五年级 Level 2': 'wu2',
  '五年级 Level 3': 'wu3',
  '六年级 Level 1': 'liu1',
  '六年级 Level 2': 'liu2',
  '七年级 Level 1': 'qi1',
  '七年级 Level 2': 'qi2',
  '八年级 Level 1': 'ba1',
  '八年级 Level 2': 'ba2',
  '九年级 Level 1': 'jiu1',
  '九年级 Level 2': 'jiu2',
  'H 识字阅读 Level 1': 'h1',
  'H 识字阅读 Level 2': 'h2',
  'H 识字阅读 Level 3': 'h3',
  'H 识字阅读 Level 4': 'h4',
};

// Curriculum system config
const SERIES_CONFIG = {
  HZ: {
    label: 'Heritage Classes · 母语课程',
    color: 'var(--red)',
    series: [
      {key:'Z', letter:'Z', color:'var(--red)',   desc:'中国公立学校教材体系\n一年级至九年级'},
      {key:'H', letter:'H', color:'#8e44ad',      desc:'Heritage 专项课程\n补充文化内容'},
    ]
  },
  YN: {
    label: 'Non-Heritage Classes · 非母语课程',
    color: 'var(--blue)',
    series: [
      {key:'Y', letter:'Y', color:'var(--blue)',  desc:'非母语主课程\nY1–Y9'},
      {key:'N', letter:'N', color:'var(--green)', desc:'非母语补充课程\nN系列'},
    ]
  }
};

// Z-series level tabs — numbering from 育才中文课程教学进度总表（新）
// Z1 = 一年级上下册教材 (74 lessons Z1.01–Z1.83)
// Z2 = 二年级上下册教材 (98 lessons Z2.01–Z2.99)
// Z3 = 三/四年级教材, Z4 = 五/六年级教材
const Z_LEVEL_TABS = [
  {key:'yi1l1', code:'Z1.01–17',  name:'一年级 Level 1', school:'一年级'},
  {key:'yi1l2', code:'Z1.18–34',  name:'一年级 Level 2', school:'一年级'},
  {key:'er1',   code:'Z1.35–51',  name:'二年级 Level 1', school:'二年级'},
  {key:'er2',   code:'Z1.52–68',  name:'二年级 Level 2', school:'二年级'},
  {key:'san1',  code:'Z2.01–17',  name:'三年级 Level 1', school:'三年级'},
  {key:'san2',  code:'Z2.18–34',  name:'三年级 Level 2', school:'三年级'},
  {key:'san3',  code:'Z2.35–51',  name:'三年级 Level 3', school:'三年级'},
  {key:'si1',   code:'Z2.52–68',  name:'四年级 Level 1', school:'四年级'},
  {key:'si2',   code:'Z2.69–85',  name:'四年级 Level 2', school:'四年级'},
  {key:'si3',   code:'Z2.86–99',  name:'四年级 Level 3', school:'四年级'},
  {key:'wu1',   code:'Z3.01–17',  name:'五年级 Level 1', school:'五年级'},
  {key:'wu2',   code:'Z3.18–34',  name:'五年级 Level 2', school:'五年级'},
  {key:'wu3',   code:'Z3.35–51',  name:'五年级 Level 3', school:'五年级'},
  {key:'liu1',  code:'Z3.52–68',  name:'六年级 Level 1', school:'六年级'},
  {key:'liu2',  code:'Z3.69–85',  name:'六年级 Level 2', school:'六年级'},
  {key:'qi1',   code:'Z4.01–17',  name:'七年级 Level 1', school:'七年级'},
  {key:'qi2',   code:'Z4.18–34',  name:'七年级 Level 2', school:'七年级'},
  {key:'ba1',   code:'Z4.35–51',  name:'八年级 Level 1', school:'八年级'},
  {key:'ba2',   code:'Z4.52–68',  name:'八年级 Level 2', school:'八年级'},
  {key:'jiu1',  code:'Z4.69–85',  name:'九年级 Level 1', school:'九年级'},
  {key:'jiu2',  code:'Z4.86–99',  name:'九年级 Level 2', school:'九年级'},
];

// Keep LEVEL_TABS alias for teacher library
const LEVEL_TABS = Z_LEVEL_TABS.map(t=>({key:t.key,label:t.name}));

// N-series level tabs (Non-Heritage 补充课程, 12 Levels)
const N_LEVEL_TABS = Array.from({length:12},(_,i)=>({
  key: `n${i+1}`,
  code: `N-Level ${i+1}`,
  name: `N-Level ${i+1}`,
}));

// H-series level tabs (Heritage 识字阅读, 4 Levels)
const H_LEVEL_TABS = [
  {key:'h1', code:'H-Level 1', name:'H 识字阅读 Level 1'},
  {key:'h2', code:'H-Level 2', name:'H 识字阅读 Level 2'},
  {key:'h3', code:'H-Level 3', name:'H 识字阅读 Level 3'},
  {key:'h4', code:'H-Level 4', name:'H 识字阅读 Level 4'},
];

// Y-series level tabs (Non-Heritage 主课程, 4 Levels)
const Y_LEVEL_TABS = Array.from({length:4},(_,i)=>({
  key: `y${i+1}`,
  code: `Y-Level ${i+1}`,
  name: `Y-Level ${i+1}`,
}));

// Helper: get level tabs for a series
function getSeriesTabs(series){
  if(series==='Z') return Z_LEVEL_TABS;
  if(series==='N') return N_LEVEL_TABS;
  if(series==='H') return H_LEVEL_TABS;
  if(series==='Y') return Y_LEVEL_TABS;
  return [];
}

let adminSelectedLevelTab = 'yi1l1';
let previewingLesson = null;
let adminCurriculumSystem = '';
let adminSeries = '';

function switchAdminHWTab(tab){
  adminHWTab=tab;
  ['lessons','template','assigned'].forEach(t=>{
    document.getElementById('ahw-tab-'+t)?.classList.toggle('active',t===tab);
    const p=document.getElementById('ahw-panel-'+t);
    if(p) p.style.display=t===tab?'block':'none';
  });
  if(tab==='template') renderCheckinLessonList();
  if(tab==='lessons') initAdminLibrary();
  else renderAdminHomework();
}

function initAdminLibrary(){
  document.getElementById('admin-curriculum-picker').style.display='block';
  document.getElementById('admin-series-picker').style.display='none';
  document.getElementById('admin-level-panel').style.display='none';
}

function selectCurriculumSystem(sys){
  adminCurriculumSystem=sys;
  document.getElementById('admin-curriculum-picker').style.display='none';
  document.getElementById('admin-series-picker').style.display='block';
  document.getElementById('admin-level-panel').style.display='none';
  const cfg=SERIES_CONFIG[sys];
  document.getElementById('admin-system-label').textContent=cfg.label;
  document.getElementById('admin-series-cards').innerHTML=cfg.series.map(s=>`
    <div class="series-card" onclick="selectAdminSeries('${s.key}')" style="border-color:${s.color};">
      <div class="series-card-letter" style="color:${s.color};">${s.letter}</div>
      <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px;">${s.key} 系列</div>
      <div class="series-card-desc">${s.desc.replace('\n','<br>')}</div>
    </div>`).join('');
}

function backToCurriculumPicker(){
  document.getElementById('admin-curriculum-picker').style.display='block';
  document.getElementById('admin-series-picker').style.display='none';
  document.getElementById('admin-level-panel').style.display='none';
}

function selectAdminSeries(series){
  adminSeries=series;
  document.getElementById('admin-series-picker').style.display='none';
  document.getElementById('admin-level-panel').style.display='block';
  document.getElementById('admin-series-label').textContent=series+' 系列';
  if(document.getElementById('admin-lesson-search'))
    document.getElementById('admin-lesson-search').value='';
  const tabs = getSeriesTabs(series);
  const tabsEl=document.getElementById('admin-level-tabs');
  if(tabs.length){
    tabsEl.innerHTML=tabs.map(t=>`
      <button class="level-tab-btn ${t.key===adminSelectedLevelTab?'active':''}"
        id="alt-${t.key}" onclick="selectAdminLevelTab('${t.key}')">
        <span class="ltb-code">${t.code}</span>
        <span class="ltb-name">${t.name}</span>
      </button>`).join('');
  } else {
    tabsEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:16px;background:white;border-radius:var(--radius);border:2px dashed var(--border);text-align:center;">${series} 系列课文待添加 · Coming soon</div>`;
  }
  renderAdminLessonTab();
}

function backToSeriesPicker(){
  document.getElementById('admin-series-picker').style.display='block';
  document.getElementById('admin-level-panel').style.display='none';
}

function selectAdminLevelTab(key){
  adminSelectedLevelTab=key;
  document.querySelectorAll('.level-tab-btn[id^="alt-"]').forEach(b=>{
    b.classList.toggle('active',b.id==='alt-'+key);
  });
  if(document.getElementById('admin-lesson-search'))
    document.getElementById('admin-lesson-search').value='';
  renderAdminLessonTab();
}

// Get the current active tab info across all series tabs
function getAllSeriesTabs(){
  return [...Z_LEVEL_TABS, ...N_LEVEL_TABS, ...H_LEVEL_TABS, ...Y_LEVEL_TABS];
}

function renderAdminLessonTab(){
  const q=(document.getElementById('admin-lesson-search')?.value||'').toLowerCase();
  const list=document.getElementById('admin-lessons-list');
  const allTabs=getAllSeriesTabs();
  const tabInfo=allTabs.find(t=>t.key===adminSelectedLevelTab);
  const tabLabel=tabInfo?.name||adminSelectedLevelTab;

  const tabLessons = NATIVE_LESSONS.filter(l=>{
    const tabKey = LEVEL_TO_TAB[l.level];
    const code=getLessonCode(l.id).toLowerCase();
    // Always restrict to current series first
    const inCurrentSeries = tabKey && getAllSeriesTabs().find(t=>t.key===tabKey)?.key && tabKey.startsWith(adminSeries?.toLowerCase()||'');
    if(q){
      // Search only within current series
      const matchesSeries = tabKey && (tabKey === adminSelectedLevelTab || 
        getSeriesTabs(adminSeries||'Z').some(t=>t.key===tabKey));
      return matchesSeries && (code.includes(q)||l.title.toLowerCase().includes(q)||l.subtitle.toLowerCase().includes(q)||l.level.toLowerCase().includes(q));
    }
    return tabKey===adminSelectedLevelTab;
  });

  const isAdmin=!!currentAdmin;
  const canAssign=!!(currentAdmin||currentTeacher);

  // Assign-all bar (shown when admin or teacher in library)
  const assignBar = canAssign && tabLessons.length ? `
    <div style="background:var(--gold-light);border:1px solid var(--gold);border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--gold);">📌 布置整个进度 · Assign whole level</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${tabLabel} · 共 ${tabLessons.length} 课</div>
      </div>
      <button class="hw-assign-btn" style="background:var(--gold);border-color:var(--gold);color:white;white-space:nowrap;" onclick="adminAssignWholeLevel()">布置全部 · Assign All</button>
    </div>` : '';

  if(!tabLessons.length){
    list.innerHTML=`${assignBar}
      <div style="background:white;border:2px dashed var(--border);border-radius:var(--radius);padding:40px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📭</div>
        <div style="font-size:15px;font-weight:500;color:var(--ink);margin-bottom:6px;">${tabLabel} — 暂无课文</div>
        <div style="font-size:13px;color:var(--muted);">No lessons added yet for this level.</div>
      </div>`;
    return;
  }

  list.innerHTML = assignBar + tabLessons.map(l=>{
    const code=getLessonCode(l.id);
    const hasReading=!!l.reading;
    return `
      <div class="admin-row" style="margin-bottom:8px;">
        <div class="admin-row-info">
          <div class="admin-row-name">
            ${code?`<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:10px;margin-right:6px;">${code}</span>`:''}
            ${l.title} · ${l.subtitle}
          </div>
          <div class="admin-row-sub">${l.words.length}个生字${hasReading?' · 📖 朗读练习':''}</div>
        </div>
        <div class="admin-row-actions">
          <button class="admin-btn blue" onclick="previewReturnContext={source:'admin-library',levelTab:adminSelectedLevelTab};openLessonPreview('${l.id}')">👁 做题</button>
          ${canAssign?`<button class="admin-btn green" onclick="previewingLesson=NATIVE_LESSONS.find(x=>x.id==='${l.id}');assignFromPreview()">+ 布置</button>`:''}
        </div>
      </div>`;
  }).join('');
}

function adminAssignWholeLevel(){
  const allTabs=getAllSeriesTabs();
  const tabInfo=allTabs.find(t=>t.key===adminSelectedLevelTab);
  const levelLessons=NATIVE_LESSONS.filter(l=>LEVEL_TO_TAB[l.level]===adminSelectedLevelTab);
  if(!levelLessons.length){ alert('此Level暂无课文 · No lessons in this level yet'); return; }
  const levelName=tabInfo?.name||adminSelectedLevelTab;
  if(!confirm(`确定布置 ${levelName} 的全部 ${levelLessons.length} 课？\nAssign all ${levelLessons.length} lessons from ${levelName}?`)) return;
  batchAssignLessons(levelLessons.map(l=>l.id));
}

function openLessonPreview(lessonId){
  const l = NATIVE_LESSONS.find(x=>x.id===lessonId);
  if(!l) return;
  previewingLesson=l;

  // Reuse the actual level detail screen — same as student sees
  // but with a "Back" that returns to where they came from
  detailLesson = l;
  document.getElementById('ld-title').textContent = l.title + ' · ' + l.subtitle;
  document.getElementById('ld-sub').textContent = l.level + ' · ' + l.words.length + ' 个生字';

  const noPinyinLevels = ['一年级 Level 1','一年级 Level 2','二年级 Level 1','H 识字阅读 Level 1','H 识字阅读 Level 2'];
  const isPinyinFree = noPinyinLevels.includes(l.level);

  const allModes = [
    {key:'flashcard', icon:'🃏', name:'看词说拼音', desc:'看字说出拼音，然后自己判断'},
    {key:'multiple',  icon:'🎯', name:'选择拼音',   desc:'从四个选项中选出正确拼音'},
    {key:'type',      icon:'✍️', name:'拼音拼写',   desc:'自己输入拼音'},
    {key:'listen',    icon:'🔊', name:'听音选字',   desc:'听声音选出正确的字，无需拼音'},
    {key:'listenrecord', icon:'🎙️', name:'听读练习', desc:'听真人读音，跟着录音，系统评分'},
    {key:'reading',   icon:'📖', name:'朗读练习',   desc:'按行朗读课文，系统评分纠错 · Reading practice with scoring'},
  ];
  const isHLevel1 = l.level === 'H 识字阅读 Level 1' || l.level === 'H 识字阅读 Level 2';
  let modes = isHLevel1
    ? [allModes.find(m=>m.key==='listen'), allModes.find(m=>m.key==='listenrecord')]
    : isPinyinFree
      ? allModes.filter(m=>m.key==='flashcard'||m.key==='listen')
      : allModes.filter(m=>m.key!=='reading'&&m.key!=='listenrecord');
  if(l.reading && !isHLevel1) modes = [...modes.filter(m=>m.key!=='reading'), allModes.find(m=>m.key==='reading')];

  const code = getLessonCode(l.id);
  const isAdminOrTeacher = !!(currentAdmin||currentTeacher);

  document.getElementById('lesson-list-grid').innerHTML =
    (code?`<div style="font-size:12px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:3px 10px;border-radius:10px;display:inline-block;margin-bottom:12px;">${code}</div>`:'') +
    (isAdminOrTeacher?`
    <div style="background:var(--gold-light);border:1px solid var(--gold);border-radius:var(--radius);padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--gold);display:flex;justify-content:space-between;align-items:center;">
      <span>⚙️ 管理员模式 · 可以做题、布置作业</span>
      <div style="display:flex;gap:8px;">
        <button class="admin-btn blue" onclick="assignFromPreview()" style="font-size:12px;padding:5px 12px;">+ 布置作业</button>
        <button class="admin-btn" onclick="goBackFromPreview()" style="font-size:12px;padding:5px 12px;">← 返回</button>
      </div>
    </div>`:'') +
    modes.map(m=>`
      <div class="lesson-list-item" onclick="startFromDetail('${m.key}')">
        <div class="lli-left">
          <div class="lli-title">${m.icon} ${m.name}</div>
          <div class="lli-sub">${m.desc}</div>
        </div>
        <div style="display:flex;align-items:center;">
          <div class="lli-count">${l.words.length} 个字</div>
          <div class="lli-arrow">›</div>
        </div>
      </div>
    `).join('');

  // Override back button
  const backBtn = document.querySelector('#screen-leveldetail .btn-back');
  if(backBtn) backBtn.setAttribute('onclick','goBackFromPreview()');

  showScreen('leveldetail');
  // Auto-select today's tab
  setTimeout(function(){ switchLessonTab(currentAdmin||currentTeacher ? currentLessonTab : getTodayLessonTab()); },0);
}

let previewReturnScreen = 'admin';
let previewReturnContext = null; // stores exact state to restore

function goBackFromPreview(){
  if(currentAdmin){
    showScreen('admin');
    const ctx = previewReturnContext;
    if(ctx && ctx.source === 'admin-library'){
      renderAdminDashboard();
      switchAdminTab('homework');
      setTimeout(()=>{
        document.getElementById('admin-curriculum-picker').style.display='none';
        document.getElementById('admin-series-picker').style.display='none';
        document.getElementById('admin-level-panel').style.display='block';
        if(ctx.levelTab) adminSelectedLevelTab = ctx.levelTab;
        renderAdminLessonTab();
      }, 50);
    } else if(ctx && ctx.source === 'admin-assigned'){
      renderAdminDashboard();
      switchAdminTab('homework');
      setTimeout(()=>{ switchAdminHWTab('assigned'); }, 50);
    } else {
      renderAdminDashboard(); switchAdminTab('homework');
    }
  } else if(currentTeacher){
    const ctx = previewReturnContext;
    if(ctx && ctx.source === 'teacher-library'){
      showScreen('teacher-library');
      setTimeout(()=>{
        document.getElementById('tlib-curriculum-picker').style.display='none';
        document.getElementById('tlib-series-picker').style.display='none';
        document.getElementById('tlib-level-panel').style.display='block';
        if(ctx.levelTab){ tlibSelectedLevelTab = ctx.levelTab; renderTeacherLibSearch(); }
      }, 50);
    } else {
      showScreen('teacher'); renderTeacherDashboard();
    }
  } else {
    showScreen('levelmap'); renderLevelMap();
  }
}

function closeLessonPreview(){
  document.getElementById('lesson-preview-modal').style.display='none';
}

function assignFromPreview(){
  if(!previewingLesson) return;
  closeLessonPreview();
  openAssignModal(previewingLesson.id);
}

let tlibSelectedLevelTab = 'yi1l1';
let tlibSeries = '';

function openTeacherCurriculumLibrary(){
  showScreen('teacher-library');
  // ★ 直接跳到课程列表，跳过 HZ/YN 系统选择 + Z/H/Y/N 系列选择
  document.getElementById('tlib-curriculum-picker').style.display='none';
  document.getElementById('tlib-series-picker').style.display='none';
  document.getElementById('tlib-level-panel').style.display='block';
  // 默认显示 Z 系列（最常用）
  tlibSeries = tlibSeries || 'Z';
  document.getElementById('tlib-series-label').textContent = '课程列表 · All Lessons';
  if(document.getElementById('teacher-lib-search'))
    document.getElementById('teacher-lib-search').value = '';

  // 渲染系列切换按钮（Z / H / Y / N 一行 pill）
  renderTlibSeriesPills();
  // 渲染当前系列的级别 tabs
  renderTlibLevelTabs();
  renderTeacherLibSearch();
}

function renderTlibSeriesPills(){
  // 在级别 tabs 上方注入一行系列切换按钮
  const tabsContainer = document.getElementById('teacher-lib-level-tabs');
  if(!tabsContainer) return;
  let pillsEl = document.getElementById('tlib-series-pills');
  if(!pillsEl){
    pillsEl = document.createElement('div');
    pillsEl.id = 'tlib-series-pills';
    pillsEl.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center;';
    tabsContainer.parentNode.insertBefore(pillsEl, tabsContainer);
  }
  const seriesList = [
    {key:'Z', label:'Z 系列', desc:'公立学校教材', color:'var(--red)'},
    {key:'H', label:'H 系列', desc:'Heritage 补充', color:'#8e44ad'},
    {key:'Y', label:'Y 系列', desc:'非母语主课', color:'var(--blue)'},
    {key:'N', label:'N 系列', desc:'非母语补充', color:'var(--green)'},
  ];
  pillsEl.innerHTML = '<div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:var(--muted);text-transform:uppercase;margin-right:6px;">系列 · Series:</div>'
    + seriesList.map(s => {
      const active = s.key === tlibSeries;
      return '<button onclick="tlibSwitchSeries(\''+s.key+'\')" '
        + 'style="padding:7px 16px;border-radius:20px;border:2px solid '+s.color+';'
        + 'background:'+(active?s.color:'white')+';color:'+(active?'white':s.color)+';'
        + 'font-size:13px;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s;">'
        + s.label + '</button>';
    }).join('');
}

function tlibSwitchSeries(series){
  tlibSeries = series;
  // 重置 levelTab 到该系列的第一个 tab
  const tabs = getSeriesTabs(series);
  if(tabs.length) tlibSelectedLevelTab = tabs[0].key;
  renderTlibSeriesPills();
  renderTlibLevelTabs();
  renderTeacherLibSearch();
}

function renderTlibLevelTabs(){
  const tabs = getSeriesTabs(tlibSeries);
  const tabsEl=document.getElementById('teacher-lib-level-tabs');
  if(!tabsEl) return;
  if(tabs.length){
    // 确保 selected tab 是当前系列有效的
    if(!tabs.find(t=>t.key===tlibSelectedLevelTab)) tlibSelectedLevelTab = tabs[0].key;
    tabsEl.innerHTML=tabs.map(t=>`
      <button class="level-tab-btn ${t.key===tlibSelectedLevelTab?'active':''}"
        id="tlt-${t.key}" onclick="selectTeacherLibTab('${t.key}')">
        <span class="ltb-code">${t.code}</span>
        <span class="ltb-name">${t.name}</span>
      </button>`).join('');
  } else {
    tabsEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:16px;background:white;border-radius:var(--radius);border:2px dashed var(--border);text-align:center;">${tlibSeries} 系列课文待添加 · Coming soon</div>`;
  }
}

function tlibSelectSystem(sys){
  // 旧 UI 兼容：选 HZ → 跳到 Z 系列；选 YN → 跳到 Y 系列
  const seriesMap = { 'HZ': 'Z', 'YN': 'Y' };
  tlibSeries = seriesMap[sys] || 'Z';
  openTeacherCurriculumLibrary();
}

function tlibSelectSeries(series){
  tlibSeries = series;
  openTeacherCurriculumLibrary();
}

function tlibBack(to){
  // 简化版库：返回直接退回老师 dashboard
  showScreen('teacher');
  switchTeacherTab('homework');
}

function selectTeacherLibTab(key){
  tlibSelectedLevelTab=key;
  adminSelectedLevelTab=key; // keep in sync for preview back navigation
  document.querySelectorAll('.level-tab-btn[id^="tlt-"]').forEach(b=>{
    b.classList.toggle('active',b.id==='tlt-'+key);
  });
  if(document.getElementById('teacher-lib-search'))
    document.getElementById('teacher-lib-search').value='';
  renderTeacherLibSearch();
}

function renderTeacherLibSearch(){
  const q=(document.getElementById('teacher-lib-search')?.value||'').toLowerCase();
  const list=document.getElementById('teacher-lib-list');
  const seriesTabs = getSeriesTabs(tlibSeries||'Z');
  const seriesTabKeys = seriesTabs.map(t=>t.key);
  const lessons=NATIVE_LESSONS.filter(l=>{
    const tabKey=LEVEL_TO_TAB[l.level];
    const code=getLessonCode(l.id).toLowerCase();
    // Always restrict to current series
    const inSeries = seriesTabKeys.includes(tabKey);
    if(q) return inSeries && (code.includes(q)||l.title.toLowerCase().includes(q)||l.subtitle.toLowerCase().includes(q));
    return tabKey===tlibSelectedLevelTab;
  });

  // Update assign-level bar
  const levelBar=document.getElementById('tlib-level-count');
  if(levelBar){
    const levelLessons=NATIVE_LESSONS.filter(l=>LEVEL_TO_TAB[l.level]===tlibSelectedLevelTab);
    const tabInfo=Z_LEVEL_TABS.find(t=>t.key===tlibSelectedLevelTab);
    levelBar.textContent=`${tabInfo?tabInfo.name:''} · 共${levelLessons.length}课，布置给班级 ${teacherSelectedClass}`;
  }

  if(!lessons.length){list.innerHTML='<div class="empty-review">No lessons found for this level.</div>';return;}
  list.innerHTML=lessons.map(l=>{
    const code=getLessonCode(l.id);
    const hasReading=!!l.reading;
    const isAssigned=getAssignedHW().some(a=>a.lessonId===l.id&&a.classCode===teacherSelectedClass&&!isHWExpired(a));
    return `
      <div class="hw-lesson-card" style="cursor:pointer;" onclick="previewReturnContext={source:'teacher-library',levelTab:tlibSelectedLevelTab};openLessonPreview('${l.id}')">
        <div class="hw-lesson-info">
          <div class="hw-lesson-title">
            ${code?`<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:10px;margin-right:6px;">${code}</span>`:''}
            ${l.title} · ${l.subtitle}
          </div>
          <div class="hw-lesson-sub">${l.level} · ${l.words.length}个生字${hasReading?' · 📖 朗读':''}
            <span style="color:var(--purple);">· 点击预览</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="hw-assign-btn ${isAssigned?'assigned':''}"
            onclick="event.stopPropagation();previewingLesson=NATIVE_LESSONS.find(x=>x.id==='${l.id}');openAssignModal('${l.id}')">
            ${isAssigned?'✓ 已布置':'+ 布置'}
          </button>
        </div>
      </div>`;
  }).join('');
}

function assignWholeLevel(){
  const allTabs=getAllSeriesTabs();
  const levelLessons=NATIVE_LESSONS.filter(l=>LEVEL_TO_TAB[l.level]===tlibSelectedLevelTab);
  if(!levelLessons.length){ alert('此Level暂无课文 · No lessons in this level yet'); return; }
  const tabInfo=allTabs.find(t=>t.key===tlibSelectedLevelTab);
  const levelName=tabInfo?tabInfo.name:'此Level';
  if(!confirm(`确定将 ${levelName} 的全部 ${levelLessons.length} 课布置给班级 ${teacherSelectedClass}？`)) return;
  batchAssignLessons(levelLessons.map(l=>l.id));
}

function batchAssignLessons(lessonIds){
  assigningLesson={id:'__batch__', batchIds:lessonIds};
  const defaultClass = currentTeacher ? teacherSelectedClass : '';
  assignSelectedClasses = defaultClass ? new Set([defaultClass]) : new Set();

  document.getElementById('assign-modal-title').textContent=`批量布置 ${lessonIds.length} 课 · Batch assign ${lessonIds.length} lessons`;
  document.getElementById('assign-modal-sub').textContent=defaultClass
    ? `默认布置给班级 ${defaultClass}，可修改选择 · Class pre-selected`
    : '请选择班级 · Please select class(es)';
  document.getElementById('assign-err').textContent='';
  document.getElementById('class-search').value='';

  const today=new Date().toISOString().split('T')[0];
  document.getElementById('dl-custom-date').min=today;
  document.getElementById('dl-custom-date').value='';
  document.getElementById('dl-custom-label').textContent='';
  selectDeadline('week');

  const classes = currentTeacher ? currentTeacher.classes : ALL_CLASSES;
  const boxes=document.getElementById('assign-class-checkboxes');
  boxes.innerHTML=classes.map(cls=>`
    <div class="assign-cls-tile ${cls===defaultClass?'selected-tile':''}" id="acb-${cls}"
      onclick="toggleAssignClass('${cls}')" title="班级 ${cls}">${cls}</div>`).join('');

  document.getElementById('assign-modal').style.display='flex';
}

function renderAdminLessons(){ renderAdminLessonTab(); }

function renderAdminHomework(){
  const q=(document.getElementById('admin-hw-search')?.value||'').toLowerCase();
  const hw=getAssignedHW();
  const list=document.getElementById('admin-hw-list');
  const filtered=hw.filter(a=>!q||a.classCode.toLowerCase().includes(q)||a.lessonTitle.toLowerCase().includes(q));
  if(!filtered.length){list.innerHTML='<div class="empty-review">No assignments found.</div>';return;}
  list.innerHTML=filtered.map(a=>{
    const expired=isHWExpired(a);
    const lesson=NATIVE_LESSONS.find(l=>l.id===a.lessonId);
    return `
      <div class="admin-row" style="${expired?'opacity:0.6;':''}">
        <div class="admin-row-info">
          <div class="admin-row-name">${a.lessonTitle}</div>
          <div class="admin-row-sub">班级 ${a.classCode} · ${a.teacher} · ${a.date} · ${a.deadlineLabel||''}${expired?' ⚠️ Expired':''}</div>
        </div>
        <div class="admin-row-actions">
          ${lesson?`<button class="admin-btn blue" onclick="previewReturnContext={source:'admin-assigned'};openLessonPreview('${a.lessonId}')">👁 做题</button>`:''}
          <button class="admin-btn red" onclick="adminRemoveHW('${a.lessonId}','${a.classCode}')">撤销</button>
        </div>
      </div>`;
  }).join('');
}

function adminRemoveHW(lessonId,classCode){
  if(!confirm('确定撤销此作业？')) return;
  saveAssignedHW(getAssignedHW().filter(a=>!(a.lessonId===lessonId&&a.classCode===classCode)));
  cloudArrayRemove('homework', a=>a.lessonId===lessonId&&a.classCode===classCode);
  renderAdminHomework();
}

// ── Rewards Management ──
let adminRewardTab = 'rewards';
let editingRewardIdx = -1; // -1 = new

function getCustomRewards(){
  const stored = localStorage.getItem('czmd_custom_rewards');
  return stored ? JSON.parse(stored) : null;
}
function saveCustomRewards(list){
  list.forEach(r=>{ if(r && !r.id) r.id = 'rw_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); });
  localStorage.setItem('czmd_custom_rewards', JSON.stringify(list));
  // Cloud sync is per-reward at each call site (cloudArrayUpsert/Remove).
  // Update the live REWARDS array
  REWARDS.length = 0;
  list.forEach(r => REWARDS.push(r));
}
function initRewards(){
  // Load custom rewards if admin has saved them
  const custom = getCustomRewards();
  if(custom && custom.length){
    REWARDS.length = 0;
    custom.forEach(r => REWARDS.push(r));
  }
}

function switchRedeemTab(tab){
  adminRewardTab = tab;
  document.getElementById('ard-tab-rewards').classList.toggle('active', tab==='rewards');
  document.getElementById('ard-tab-requests').classList.toggle('active', tab==='requests');
  document.getElementById('ard-panel-rewards').style.display = tab==='rewards'?'block':'none';
  document.getElementById('ard-panel-requests').style.display = tab==='requests'?'block':'none';
  if(tab==='rewards') renderAdminRewardsGrid();
  else renderAdminRedeem();
}

function rewardDisplayHTML(r, size=44){
  if(r.image) return `<img src="${r.image}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:10px;display:block;margin:0 auto;">`;
  return `<span style="font-size:${size}px;display:block;">${r.icon||'🎁'}</span>`;
}

function renderAdminRewardsGrid(){
  const grid = document.getElementById('admin-rewards-grid');
  if(!grid) return;
  grid.innerHTML = REWARDS.map((r,i)=>`
    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center;box-shadow:var(--shadow);">
      <div style="margin-bottom:8px;">${rewardDisplayHTML(r, 56)}</div>
      <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px;">${r.name}</div>
      <div style="font-size:12px;color:var(--gold);font-weight:500;margin-bottom:10px;">需要 ${r.cost} 分</div>
      <div style="display:flex;gap:6px;justify-content:center;">
        <button class="admin-btn blue" onclick="openEditRewardModal(${i})">编辑</button>
        <button class="admin-btn red" onclick="deleteReward(${i})">删除</button>
      </div>
    </div>`).join('');
}

let rewImageData = ''; // base64 or empty (use emoji)

function handleRewardImageUpload(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    rewImageData = e.target.result; // base64
    const preview = document.getElementById('rew-preview');
    const content = document.getElementById('rew-preview-content');
    if(preview) preview.style.padding='0';
    if(content) content.innerHTML=`<img src="${rewImageData}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
    document.getElementById('rew-emoji-row').style.display='none';
  };
  reader.readAsDataURL(file);
}

function switchToEmoji(){
  rewImageData = '';
  document.getElementById('rew-emoji-row').style.display='block';
  const content = document.getElementById('rew-preview-content');
  if(content) content.innerHTML = document.getElementById('rew-icon')?.value || '🎁';
}

function updateEmojiPreview(){
  if(rewImageData) return;
  const val = document.getElementById('rew-icon')?.value||'🎁';
  const content = document.getElementById('rew-preview-content');
  if(content) content.textContent = val;
}

function openAddRewardModal(){
  editingRewardIdx = -1;
  rewImageData = '';
  document.getElementById('edit-reward-title').textContent = '🎁 添加礼品 · Add Reward';
  document.getElementById('rew-preview-content').innerHTML = '🎁';
  document.getElementById('rew-preview').style.padding='';
  document.getElementById('rew-emoji-row').style.display='none';
  document.getElementById('rew-icon').value = '';
  document.getElementById('rew-name').value = '';
  document.getElementById('rew-cost').value = '';
  document.getElementById('rew-err').textContent = '';
  document.getElementById('rew-img-input').value='';
  document.getElementById('edit-reward-modal').style.display = 'flex';
}

function openEditRewardModal(idx){
  editingRewardIdx = idx;
  const r = REWARDS[idx];
  rewImageData = r.image||'';
  document.getElementById('edit-reward-title').textContent = '✏️ 编辑礼品 · Edit Reward';
  // Set preview
  const content = document.getElementById('rew-preview-content');
  const preview = document.getElementById('rew-preview');
  if(rewImageData){
    content.innerHTML=`<img src="${rewImageData}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
    preview.style.padding='0';
    document.getElementById('rew-emoji-row').style.display='none';
  } else {
    content.innerHTML = r.icon||'🎁';
    preview.style.padding='';
    document.getElementById('rew-emoji-row').style.display='none';
  }
  document.getElementById('rew-icon').value = r.icon||'';
  document.getElementById('rew-name').value = r.name;
  document.getElementById('rew-cost').value = r.cost;
  document.getElementById('rew-err').textContent = '';
  document.getElementById('rew-img-input').value='';
  document.getElementById('edit-reward-modal').style.display = 'flex';
}

function confirmSaveReward(){
  const icon = rewImageData ? '🎁' : (document.getElementById('rew-icon').value.trim()||'🎁');
  const name = document.getElementById('rew-name').value.trim();
  const cost = parseInt(document.getElementById('rew-cost').value)||0;
  const err  = document.getElementById('rew-err');
  if(!name){ err.textContent='请输入礼品名称'; return; }
  if(cost < 1){ err.textContent='请输入有效积分'; return; }
  const list = [...REWARDS];
  const entry = {icon, name, cost};
  if(rewImageData) entry.image = rewImageData;
  if(editingRewardIdx >= 0){
    entry.id = list[editingRewardIdx] && list[editingRewardIdx].id;
    list[editingRewardIdx] = entry;
  } else {
    list.push(entry);
  }
  saveCustomRewards(list);
  cloudArrayUpsert('customRewards', entry, r=>r.id);
  closeAdminModal('edit-reward-modal');
  renderAdminRewardsGrid();
}

function deleteReward(idx){
  if(!confirm(`确定删除礼品 "${REWARDS[idx]?.name}"？`)) return;
  const list = [...REWARDS];
  const removed = list[idx];
  list.splice(idx, 1);
  saveCustomRewards(list);
  if(removed && removed.id) cloudArrayRemove('customRewards', x=>x.id===removed.id);
  renderAdminRewardsGrid();
}

// ── Redeem Requests ──
function renderAdminRedeem(){
  const requests=getRedeemRequests();
  const list=document.getElementById('admin-redeem-list');
  if(!requests.length){list.innerHTML='<div class="empty-review">No redemption requests.</div>';return;}
  list.innerHTML=requests.map(rq=>`
    <div class="admin-row ${rq.collected?'':''}">
      <div class="admin-row-info">
        <div class="admin-row-name">${rq.rewardIcon} ${rq.rewardName} <span style="font-size:11px;color:var(--gold);">-${rq.rewardCost}分</span></div>
        <div class="admin-row-sub">学生：${rq.studentName} · 班级：${rq.classCode} · ${rq.date}</div>
        ${rq.collected?`<div style="font-size:11px;color:var(--green);">✓ 已领取 ${rq.collectedDate||''}</div>`:'<div style="font-size:11px;color:var(--blue);">⏳ Pending</div>'}
      </div>
      <div class="admin-row-actions">
        ${!rq.collected?`<button class="admin-btn green" onclick="adminConfirmRedeem(${rq.id})">✓ 已领取</button>`:''}
        <button class="admin-btn red" onclick="adminDeleteRedeem(${rq.id})">删除</button>
      </div>
    </div>`).join('');
}

function adminConfirmRedeem(id){
  const reqs=getRedeemRequests();
  const r=reqs.find(x=>x.id===id);
  if(r){r.collected=true;r.collectedDate=new Date().toLocaleDateString('zh-CN');}
  saveRedeemRequests(reqs);
  if(r) cloudArrayUpsert('redeemRequests', r, x=>x.id);
  renderAdminRedeem();
}

function adminDeleteRedeem(id){
  if(!confirm('确定删除此兑换记录？')) return;
  saveRedeemRequests(getRedeemRequests().filter(x=>x.id!==id));
  cloudArrayRemove('redeemRequests', x=>x.id===id);
  renderAdminRedeem();
}

// ── Shared helpers ──
function closeAdminModal(id){document.getElementById(id).style.display='none';}

// ════════════════════════════════════════
// TEACHER PORTAL
// ════════════════════════════════════════
const ALL_CLASSES = [
  ...Array.from({length:99}, (_,i)=>`Z${i+1}`),
  ...Array.from({length:15}, (_,i)=>`Y${i+1}`),
  ...Array.from({length:26}, (_,i)=>`N${i+1}`),
  ...Array.from({length:60}, (_,i)=>`H${i+1}`),
];
// 明文密码已移除：登录仅走云端验证（Firebase）。这里只保留每位老师所教班级（classes），
// 供班级归属查询 / admin 管理等非登录用途使用；登录时老师的班级以云端 profile.classes 为准。
const TEACHER_ACCOUNTS = {
  '黄老师': { classes: ['Z34', 'Z18', 'Z8', 'Z9', 'Z13', 'Z52', 'Z67', 'Z57', 'Z47', 'Z44', 'Z48', 'Z17', 'Z49', 'Z3', 'Z40', 'Z41', 'Z12'] },
  '白老师': { classes: ['N24', 'Z87', 'Z85', 'Z84', 'N3', 'N32', 'Z15', 'H24', 'Z93', 'Z92', 'Z90'] },
  '杨艳芝老师': { classes: ['Z19', 'Z31', 'Z61'] },
  '宫老师': { classes: ['Z37', 'H30', 'H35', 'Z38', 'Z43', 'Z29'] },
  '赵Melody老师': { classes: ['N21', 'Y4', 'Z80', 'H33', 'H36', 'Y2', 'H20', 'N18', 'Y10', 'Z36', 'Z55'] },
  '赵雪倩老师': { classes: ['Z32', 'Z62', 'Z10', 'Z65'] },
  '魏老师': { classes: ['Z89', 'Z51', 'Z96', 'H56', 'N19', 'Y8', 'H50', 'Z91'] },
  '陈老师': { classes: ['N13'] },
  '孙老师': { classes: ['N5'] },
  '杨旭佳老师': { classes: ['Z39', 'Z95', 'Z94', 'Z54'] },
  '蒋老师': { classes: ['H22', 'N15', 'Y9', 'H49', 'H48', 'H46', 'Y7', 'N10', 'N8', 'Z58', 'Z50', 'H26'] },
  '马老师': { classes: ['Z88', 'Z82', 'H21', 'Z20', 'Z4', 'Z11', 'Z60', 'H42', 'Z53', 'Z69'] },
  '王老师': { classes: ['Z6', 'Z72'] },
  '庞老师': { classes: ['Z35', 'Z63', 'Z66'] },
  '张皓老师': { classes: ['H39', 'Z33', 'Z27', 'Z64', 'Z46', 'Z14', 'Z16', 'Z21', 'Z23', 'Z5'] },
  '张颖涛老师': { classes: ['Z2', 'Z24', 'Z75', 'Z30', 'Z25', 'Z26'] },
};
let currentTeacher = null;
let teacherSelectedClass = 'Z34';
let assigningLesson = null;
let assignSelectedClasses = new Set();

async function doTeacherLogin(){
  const name = document.getElementById('teacher-name').value.trim();
  const pwd  = document.getElementById('teacher-pwd').value.trim();
  const err  = document.getElementById('teacher-err');
  if(!name){ err.textContent='请输入姓名 Please enter your name.'; return; }
  if(!pwd){  err.textContent='请输入密码 Please enter password.'; return; }

  // ☁️ 仅允许云端验证登录——不再有本地明文密码兜底（防止断网时本地登入修改数据、造成与云端不一致）
  if(!window.firebaseReady || !window.cloudAuth){
    err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
    return;
  }
  err.textContent = '☁️ 云端登录中... · Connecting...';
  try {
    const result = await window.cloudAuth.loginTeacher(name, pwd);
    if(result.ok){
      err.textContent = '';
      setPwdFree('teacher', name);   // ✅ 仅云端真正验过密码才开 30 天免密
      currentTeacher = {
        name: result.profile.name || name,
        classes: result.profile.classes || [],
        _cloudUid: result.uid,
        _fromCloud: true
      };
      localStorage.setItem('czmd_teacher', JSON.stringify(currentTeacher));
      teacherSelectedClass = currentTeacher.classes[0] || '';
      addRecentAccount({ username: name, name: name, classCode: '__teacher__', bg: 'teacher' });
      setCloudSessionStatus(true);
      await loadSharedCloudCaches();
      showScreen('teacher');
      renderTeacherDashboard();
      return;
    }
    // 云端可达但验证失败 → 姓名/密码错误；网络类错误归到网络提示
    if(result.error === 'auth/network-request-failed'){
      err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
    } else {
      err.textContent='姓名或密码错误 · Incorrect name or password.';
    }
  } catch(e) {
    console.log('☁️ 老师云端登录异常:', e && e.message);
    err.textContent='无法连接服务器，请联网后再登录 · Can\'t reach server, please connect to the internet and log in.';
  }
}

function switchTeacherTab(tab){
  // 隐藏 welcome panel
  const wp = document.getElementById('tpanel-welcome');
  if(wp) wp.style.display = 'none';
  ['classes','homework','students','redeem'].forEach(t=>{
    const panel = document.getElementById('tpanel-'+t);
    const btn   = document.getElementById('ttab-'+t);
    if(panel) panel.style.display = t===tab ? 'block' : 'none';
    if(btn)   btn.classList.toggle('active', t===tab);
  });
  if(tab==='homework'){
    renderMyClassGrid();
    updateClassIndicator();
    renderAssignedList();
  } else if(tab==='classes'){
    renderTeacherClassCards();
  } else if(tab==='redeem'){
    renderTeacherRedeemRequests();
  }
}

function renderTeacherDashboard(){
  document.getElementById('teacher-user-bar').innerHTML=
    '<div style="background:white;border:1px solid var(--border);border-radius:20px;padding:16px 22px;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:space-between;gap:12px;">'
    + '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">'
    + '  <div style="width:46px;height:46px;border-radius:50%;background:var(--blue-light);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">👩‍🏫</div>'
    + '  <div style="flex:1;min-width:0;">'
    + '    <div style="font-size:18px;font-weight:500;color:var(--ink);font-family:serif;">'+currentTeacher.name+'</div>'
    + '    <div style="font-size:11px;color:var(--muted);margin-top:2px;">教师 · Teacher · '+(currentTeacher.classes||[]).length+' 个班级</div>'
    + '  </div>'
    + '</div>'
    + '<div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">'
    + '  <button class="user-bar-btn" onclick="openChangePassword()" style="padding:6px 12px;font-size:12px;">🔒 密码</button>'
    + '  <button class="user-bar-btn" onclick="switchTeacherAccount()" style="padding:6px 12px;font-size:12px;">🔄 切换账号 · Switch account</button>'
    + '  <button class="user-bar-btn" onclick="doTeacherLogout()" style="padding:6px 12px;font-size:12px;">退出</button>'
    + '</div>'
    + '</div>';

  // ★ 默认：什么 tab 都不选，显示欢迎面板
  ['classes','homework','students','redeem'].forEach(t=>{
    const panel = document.getElementById('tpanel-'+t);
    const btn   = document.getElementById('ttab-'+t);
    if(panel) panel.style.display = 'none';
    if(btn)   btn.classList.remove('active');
  });
  const wp = document.getElementById('tpanel-welcome');
  if(wp) wp.style.display = 'block';

  // 后台准备好 homework / redeem 数据
  renderMyClassGrid();
  updateClassIndicator();
  renderTeacherRedeemRequests();
}

// 点小方块跳到该班学生名单
function teacherJumpToClassStudents(cls){
  teacherSelectedClass = cls;
  switchTeacherTab('students');
}

function selectTeacherClass(cls){
  teacherSelectedClass=cls;
  updateClassIndicator();
  renderAssignedList();
}

function updateClassIndicator(){
  const el=document.getElementById('teacher-class-indicator-cls');
  if(el) el.textContent=teacherSelectedClass||'—';
  // Re-highlight in grid
  document.querySelectorAll('.teacher-cls-tile').forEach(t=>{
    t.classList.toggle('selected-tile', t.dataset.cls===teacherSelectedClass);
  });
}

let classTabMode='mine'; // 'mine' | 'all'

function switchClassTab(mode){
  classTabMode=mode;
  document.getElementById('cls-tab-mine').classList.toggle('active',mode==='mine');
  document.getElementById('cls-tab-all').classList.toggle('active',mode==='all');
  document.getElementById('cls-panel-mine').style.display=mode==='mine'?'block':'none';
  document.getElementById('cls-panel-all').style.display=mode==='all'?'block':'none';
}

function renderMyClassGrid(){
  const grid=document.getElementById('teacher-class-grid');
  if(!grid) return;
  grid.innerHTML=currentTeacher.classes.map(cls=>`
    <div class="assign-cls-tile teacher-cls-tile ${cls===teacherSelectedClass?'selected-tile':''}"
      data-cls="${cls}" onclick="handleTeacherClassClick('${cls}')" title="班级 ${cls}">${cls}</div>
  `).join('');
}

function renderAllClassGrid(filter=''){
  const grid=document.getElementById('all-class-grid');
  if(!grid) return;
  const q=filter.toLowerCase();
  grid.innerHTML=ALL_CLASSES.filter(cls=>!q||cls.toLowerCase().includes(q)).map(cls=>`
    <div class="assign-cls-tile teacher-cls-tile ${cls===teacherSelectedClass?'selected-tile':''}"
      data-cls="${cls}" onclick="handleTeacherClassClick('${cls}')" title="班级 ${cls}">${cls}</div>
  `).join('');
}

function filterAllClasses(){
  const q=document.getElementById('all-class-search')?.value||'';
  renderAllClassGrid(q);
}

function handleTeacherClassClick(cls){
  // Single click = select for homework; long press or second click = open class detail
  if(teacherSelectedClass===cls){
    openTeacherClassDetail(cls);
  } else {
    selectTeacherClass(cls);
  }
}

let tcdCurrentClass = '';
let tcdFromAdmin = false;

function tcdGoBack(){
  if(tcdFromAdmin){
    showScreen('admin'); renderAdminDashboard(); switchAdminTab('classes');
  } else {
    showScreen('teacher'); renderTeacherDashboard();
  }
}

function openTeacherClassDetail(cls, fromAdmin=false){
  tcdCurrentClass = cls;
  tcdFromAdmin = fromAdmin || !!currentAdmin;
  const isAdmin = !!currentAdmin;

  // Get class info
  const customClasses = getCustomClasses();
  const clsInfo = customClasses.find(c=>c.code===cls)||{code:cls,desc:'',teacher:''};
  const classTaught = Object.values(TEACHER_ACCOUNTS).filter(a=>(a.classes||[]).includes(cls));

  document.getElementById('tcd-class-name').textContent = cls;
  document.getElementById('tcd-class-meta').textContent = clsInfo.desc ? `📝 ${clsInfo.desc}` : '';

  // Admin actions: edit class info
  const adminActions = document.getElementById('tcd-admin-actions');
  adminActions.innerHTML = isAdmin ? `
    <button class="admin-btn blue" onclick="editClassInfo('${cls}')">✏️ 编辑班级信息</button>` : '';

  // Teachers section
  const teacherSection = document.getElementById('tcd-teachers-section');
  const allTeachers = Object.entries(getTeacherAccounts());
  const assignedTeachers = allTeachers.filter(([n,a])=>(a.classes||[]).includes(cls));
  teacherSection.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      ${assignedTeachers.length
        ? assignedTeachers.map(([name])=>`
            <div style="display:inline-flex;align-items:center;gap:6px;background:var(--blue-light);border:1px solid var(--blue);border-radius:20px;padding:5px 12px;">
              <span style="font-size:13px;font-weight:500;color:var(--blue);">👩‍🏫 ${name}</span>
              ${isAdmin?`<button onclick="removeTeacherFromClass('${name}','${cls}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;line-height:1;padding:0;">×</button>`:''}
            </div>`).join('')
        : `<span style="font-size:13px;color:var(--muted);">暂无负责教师</span>`}
    </div>
    ${isAdmin?`
    <div style="display:flex;gap:8px;">
      <select id="tcd-add-teacher-sel" class="auth-input" style="flex:1;padding:7px 10px;font-size:13px;">
        <option value="">选择教师添加 · Add teacher</option>
        ${allTeachers.filter(([n])=>!assignedTeachers.find(([an])=>an===n)).map(([n])=>`<option value="${n}">${n}</option>`).join('')}
      </select>
      <button class="hw-assign-btn" onclick="addTeacherToClass('${cls}')">+ 添加</button>
    </div>`:''}`;

  // Member add bar (admin only)
  const memberActions = document.getElementById('tcd-member-actions');
  memberActions.innerHTML = isAdmin ? `
    <button class="hw-assign-btn" onclick="toggleAddMemberBar('${cls}')">+ 添加学员</button>` : '';

  const addBar = document.getElementById('tcd-add-member-bar');
  addBar.innerHTML = isAdmin ? `
    <div style="display:flex;gap:8px;background:var(--blue-light);border-radius:var(--radius);padding:12px;">
      <input class="auth-input" id="tcd-add-member-search" placeholder="搜索学员用户名" oninput="renderAddMemberSearch('${cls}')" style="flex:1;"/>
    </div>
    <div id="tcd-add-member-results" style="margin-top:8px;"></div>` : '';
  addBar.style.display='none';

  renderTCDMembers(cls);
  showScreen('teacher-class');
}

function renderTCDMembers(cls){
  const users = loadUsers();
  const isAdmin = !!currentAdmin;
  const members = Object.entries(users).filter(([k,u])=>getStudentClasses(u).includes(cls));
  const el = document.getElementById('tcd-members-list');

  if(!members.length){
    el.innerHTML=`<div class="empty-review">该班级暂无学生 · No students yet.</div>`;
    return;
  }
  // ★ 老师也能移除学生（但只能移除，不能换班；换班只 admin）
  const canRemove = isAdmin || !!currentTeacher;
  const canTransfer = isAdmin;
  el.innerHTML = members.map(([key,u])=>{
    const ptsKey='czmd_pts_'+key;
    const pts=JSON.parse(localStorage.getItem(ptsKey)||'{"total":0}').total||0;
    const username=u.username||u.name||'';
    const chname=u.chname||u.nickname||'';
    return `
      <div class="class-member-row">
        <div class="cm-left">
          <div class="cm-avatar" style="font-size:14px;width:36px;height:36px;">${(username[0]||'?').toUpperCase()}</div>
          <div>
            <div class="cm-name">${username}${chname?` <span style="font-size:11px;color:var(--muted);">· ${chname}</span>`:''}</div>
            <div class="cm-class">⭐ ${pts}分</div>
          </div>
        </div>
      ${canRemove?`
        <div style="display:flex;gap:4px;">
          ${canTransfer?`<button class="admin-btn blue" onclick="openTransferClass('${key}','${cls}','${u.username||u.name}')">换班</button>`:''}
          <button class="admin-btn red" onclick="removeMemberFromClass('${key}','${cls}')">移除</button>
        </div>`:''}
        <div class="cm-score" style="${canRemove?'display:none':''}">⭐ ${pts}分</div>
      </div>`;
  }).join('');
}

function toggleAddMemberBar(cls){
  const bar = document.getElementById('tcd-add-member-bar');
  bar.style.display = bar.style.display==='none' ? 'block' : 'none';
  if(bar.style.display==='block') document.getElementById('tcd-add-member-search')?.focus();
}

function renderAddMemberSearch(cls){
  const q=(document.getElementById('tcd-add-member-search')?.value||'').toLowerCase();
  const results = document.getElementById('tcd-add-member-results');
  if(!q){ results.innerHTML=''; return; }
  const users = loadUsers();
  const matches = Object.entries(users).filter(([k,u])=>{
    const username=(u.username||u.name||'').toLowerCase();
    const chname=(u.chname||'').toLowerCase();
    return (username.includes(q)||chname.includes(q)) && !getStudentClasses(u).includes(cls);
  }).slice(0,8);
  if(!matches.length){ results.innerHTML=`<div style="font-size:13px;color:var(--muted);padding:8px;">No students found.</div>`; return; }
  results.innerHTML = matches.map(([key,u])=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:white;border-radius:var(--radius);margin-bottom:4px;border:1px solid var(--border);">
      <div style="font-size:13px;font-weight:500;">${u.username||u.name}${u.chname?` · ${u.chname}`:''}</div>
      <button class="admin-btn green" onclick="addMemberToClass('${key}','${cls}')">+ 加入</button>
    </div>`).join('');
}

let transferUserKey='', transferFromClass='';

function openTransferClass(key, fromCls, username){
  transferUserKey=key; transferFromClass=fromCls;
  document.getElementById('transfer-sub').textContent=`学员：${username} · 当前班级：${fromCls}`;
  document.getElementById('transfer-target').value='';
  document.getElementById('transfer-err').textContent='';
  document.getElementById('transfer-keep').checked=false;
  const series=fromCls[0];
  const sameSeriesClasses=ALL_CLASSES.filter(c=>c[0]===series&&c!==fromCls).slice(0,20);
  document.getElementById('transfer-quick-classes').innerHTML=sameSeriesClasses.map(c=>`
    <div class="assign-cls-tile" onclick="document.getElementById('transfer-target').value='${c}'">${c}</div>`).join('');
  document.getElementById('transfer-class-modal').style.display='flex';
}

function confirmTransferClass(){
  const target=document.getElementById('transfer-target').value.trim().toUpperCase();
  const keep=document.getElementById('transfer-keep').checked;
  const err=document.getElementById('transfer-err');
  if(!target){err.textContent='请输入目标班级 · Enter target class'; return;}
  if(target===transferFromClass){err.textContent='新班级不能与当前班级相同'; return;}
  const users=loadUsers();
  const u=users[transferUserKey];
  if(!u){err.textContent='用户不存在'; return;}
  let classes=getStudentClasses(u);
  if(!keep) classes=classes.filter(c=>c!==transferFromClass);
  if(!classes.includes(target)) classes.push(target);
  u.classes=classes;
  u.classCode=classes[0]||target;
  saveUsers(users);
  closeAdminModal('transfer-class-modal');
  renderTCDMembers(transferFromClass);
  renderAdminStudents();
}

function addMemberToClass(userKey, cls){
  const users = loadUsers();
  const u = users[userKey];
  if(!u) return;
  const classes = getStudentClasses(u);
  if(!classes.includes(cls)){ classes.push(cls); u.classes=classes; u.classCode=classes[0]; saveUsers(users); }
  document.getElementById('tcd-add-member-search').value='';
  document.getElementById('tcd-add-member-results').innerHTML='';
  renderTCDMembers(cls);
}

function removeMemberFromClass(userKey, cls){
  const users = loadUsers();
  const u = users[userKey];
  if(!u) return;
  const name = u.username || u.name || userKey;
  if(!confirm('确定将 '+name+' 从 '+cls+' 班级移除？\nRemove '+name+' from class '+cls+'?\n\n（账号本身保留，只是不再属于此班）\n(Account is preserved, only unlinked from this class)')) return;
  u.classes = getStudentClasses(u).filter(c=>c!==cls);
  u.classCode = u.classes[0]||'';
  saveUsers(users);
  renderTCDMembers(cls);
}

function addTeacherToClass(cls){
  const sel = document.getElementById('tcd-add-teacher-sel');
  const name = sel?.value;
  if(!name) return;
  const allAccts = getTeacherAccounts();
  const acct = allAccts[name];
  if(!acct) return;
  if(!(acct.classes||[]).includes(cls)){
    acct.classes = [...(acct.classes||[]), cls];
    // Save to stored accounts
    const stored = JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
    if(!stored[name]) stored[name]={...acct};
    stored[name].classes = acct.classes;
    TEACHER_ACCOUNTS[name] = acct;
    saveExtraTeachers(stored);
  }
  openTeacherClassDetail(cls, tcdFromAdmin);
}

function removeTeacherFromClass(teacherName, cls){
  if(!confirm(`确定将 ${teacherName} 从 ${cls} 班级移除？`)) return;
  const stored = JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
  const acct = TEACHER_ACCOUNTS[teacherName];
  if(acct){ acct.classes=(acct.classes||[]).filter(c=>c!==cls); }
  if(stored[teacherName]){ stored[teacherName].classes=(stored[teacherName].classes||[]).filter(c=>c!==cls); }
  saveExtraTeachers(stored);
  openTeacherClassDetail(cls, tcdFromAdmin);
}

function openChangePassword(){
  document.getElementById('cpwd-current').value='';
  document.getElementById('cpwd-new').value='';
  document.getElementById('cpwd-confirm').value='';
  document.getElementById('cpwd-err').textContent='';
  document.getElementById('change-pwd-modal').style.display='flex';
}

function confirmChangePassword(){
  const current=document.getElementById('cpwd-current').value.trim();
  const newPwd=document.getElementById('cpwd-new').value.trim();
  const confirm=document.getElementById('cpwd-confirm').value.trim();
  const err=document.getElementById('cpwd-err');
  if(!currentTeacher){ err.textContent='Not logged in.'; return; }
  const allAccts=getTeacherAccounts();
  const acct=allAccts[currentTeacher.name];
  if(!acct){ err.textContent='Account not found.'; return; }
  if(acct.password!==current){ err.textContent='当前密码错误 · Incorrect current password.'; return; }
  if(newPwd.length<4){ err.textContent='新密码至少4位 · Min 4 characters.'; return; }
  if(newPwd!==confirm){ err.textContent='两次输入不一致 · Passwords do not match.'; return; }
  // Save new password
  const stored=JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
  if(!stored[currentTeacher.name]) stored[currentTeacher.name]={...acct};
  stored[currentTeacher.name].password=newPwd;
  TEACHER_ACCOUNTS[currentTeacher.name].password=newPwd;
  saveExtraTeachers(stored);
  document.getElementById('change-pwd-modal').style.display='none';
  alert('密码已修改成功 · Password changed successfully!');
}

function doTeacherLogout(){
  if(currentTeacher && currentTeacher.name) clearPwdFree('teacher', currentTeacher.name);   // 主动退出即清免密
  currentTeacher=null;
  localStorage.removeItem('czmd_teacher');
  showScreen('auth');
}

// 切换账号：只回登录页，不清免密（保留 czmd_pwdfree_until_teacher_<name> 与 czmd_teacher），方便点最近登录里的其他账号。
// 想彻底安全退出请用「退出 · Log out」（doTeacherLogout 会清免密）。
function switchTeacherAccount(){ showScreen('auth'); }

function getAssignedHW(){ return safeParseJSON(localStorage.getItem('czmd_homework'), []); }
function saveAssignedHW(list){
  localStorage.setItem('czmd_homework',JSON.stringify(list));
  // Cloud sync is per-assignment at each call site (cloudArrayUpsert/Remove).
}

let assignDeadlineType = 'week'; // 'daily' | 'week' | 'custom'

function openAssignModal(lessonId){
  assigningLesson = NATIVE_LESSONS.find(l=>l.id===lessonId);
  if(!assigningLesson) return;
  assignSelectedClasses = new Set();
  assignDeadlineType = 'week';
  const code = getLessonCode(assigningLesson.id);
  document.getElementById('assign-modal-title').textContent = `[${code}] ${assigningLesson.title} · ${assigningLesson.subtitle}`;
  document.getElementById('assign-modal-sub').textContent = assigningLesson.level+' · '+assigningLesson.words.length+'个生字';
  document.getElementById('assign-err').textContent='';
  document.getElementById('class-search').value='';

  // Set min date for custom picker to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dl-custom-date').min = today;
  document.getElementById('dl-custom-date').value = '';
  document.getElementById('dl-custom-label').textContent='';

  selectDeadline('week');

  // Build class grid — BSAKOO 风格大方块（图二式）
  const boxes = document.getElementById('assign-class-checkboxes');
  const classList = currentTeacher ? (currentTeacher.classes||[]) : ALL_CLASSES;
  // 不预选；让老师自己点
  assignSelectedClasses = new Set();
  const users = (typeof loadUsers === 'function') ? loadUsers() : {};
  boxes.innerHTML = classList.map(cls => {
    const meta = (typeof getClassMeta === 'function') ? getClassMeta(cls) : {};
    const label = (meta && meta.label) || cls;
    const members = Object.entries(users).filter(([k,u]) => getStudentClasses(u).includes(cls));
    return '<div class="teacher-class-card assign-cls-tile" id="acb-'+cls+'" data-cls="'+cls+'" onclick="toggleAssignClass(\''+cls+'\')" title="班级 '+cls+'">'
      + '  <div class="tcc-logo-circle">'
      + '    <div class="tcc-logo-text">育</div>'
      + '    <div class="tcc-logo-sub">BSAKOO</div>'
      + '  </div>'
      + '  <div class="tcc-name">' + label + '</div>'
      + '  <div class="tcc-stats">'
      + '    <span>👥 ' + members.length + '</span>'
      + '  </div>'
      + '  <div class="tcc-check">✓</div>'
      + '</div>';
  }).join('');
  // 隐藏 summary 初始
  updateAssignSelectedSummary();

  document.getElementById('assign-modal').style.display='flex';
}

function selectDeadline(type){
  assignDeadlineType = type;
  ['daily','week','custom'].forEach(t=>{
    const row = document.getElementById('dl-'+t+'-row');
    const box = document.getElementById('dl-'+t+'-box');
    const active = t===type;
    if(row) row.classList.toggle('selected', active);
    if(box){ box.classList.toggle('checked', active); box.textContent = active?'✓':''; }
  });
  document.getElementById('dl-custom-picker').style.display = type==='custom'?'block':'none';
}

function updateCustomDateLabel(){
  const val = document.getElementById('dl-custom-date').value;
  if(!val){ document.getElementById('dl-custom-label').textContent=''; return; }
  const d = new Date(val);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d-today)/(1000*60*60*24));
  document.getElementById('dl-custom-label').textContent =
    `截止日期：${d.toLocaleDateString('zh-CN')} · 还有 ${diff} 天`;
}

function toggleAssignClass(cls){
  const tile = document.getElementById('acb-'+cls);
  if(!tile) return;
  if(assignSelectedClasses.has(cls)){
    assignSelectedClasses.delete(cls);
    tile.classList.remove('selected-tile');
  } else {
    assignSelectedClasses.add(cls);
    tile.classList.add('selected-tile');
  }
  updateAssignSelectedSummary();
}

// 更新"已选 X 个班"摘要 + 发布按钮 label
function updateAssignSelectedSummary(){
  const el = document.getElementById('assign-selected-summary');
  if(!el) return;
  const n = assignSelectedClasses.size;
  if(n === 0){
    el.innerHTML = '<span style="color:var(--muted);">请选择 1 个或多个班级 · Tap class card(s) to select</span>';
  } else {
    const list = Array.from(assignSelectedClasses).join('、');
    el.innerHTML = '<span style="color:var(--green);font-weight:600;">✓ 已选 '+n+' 个班：</span><span style="color:var(--ink);">'+list+'</span>';
  }
}

function selectAllClasses(){
  currentTeacher.classes.forEach(cls=>{
    assignSelectedClasses.add(cls);
    const t=document.getElementById('acb-'+cls);
    if(t) t.classList.add('selected-tile');
  });
  updateAssignSelectedSummary();
}

function clearAllClasses(){
  assignSelectedClasses.clear();
  currentTeacher.classes.forEach(cls=>{
    const t=document.getElementById('acb-'+cls);
    if(t) t.classList.remove('selected-tile');
  });
  updateAssignSelectedSummary();
}

function closeAssignModal(){
  document.getElementById('assign-modal').style.display='none';
  assigningLesson=null;
  // 清理识字测验注入的字数选择行（避免残留到下次普通作业 modal）
  const sizeRow = document.getElementById('exam-size-row');
  if(sizeRow) sizeRow.remove();
}

function confirmAssign(){
  const err = document.getElementById('assign-err');
  if(!assigningLesson){ closeAssignModal(); return; }
  if(assignSelectedClasses.size===0){ err.textContent='请选择至少一个班级 · Please select a class.'; return; }

  const today = new Date(); today.setHours(0,0,0,0);
  let dueDate = null, deadlineLabel = '';
  if(assignDeadlineType==='daily'){
    const d=new Date(today); d.setDate(d.getDate()+7);
    dueDate=d.toISOString().split('T')[0]; deadlineLabel='每天练习一周 · Daily for 7 days';
  } else if(assignDeadlineType==='week'){
    const d=new Date(today); d.setDate(d.getDate()+7);
    dueDate=d.toISOString().split('T')[0]; deadlineLabel='7天内完成 · Due in 7 days';
  } else {
    const val=document.getElementById('dl-custom-date').value;
    if(!val){ err.textContent='请选择截止日期 · Please pick a date.'; return; }
    dueDate=val; deadlineLabel='截止 '+new Date(val).toLocaleDateString('zh-CN');
  }

  const list=getAssignedHW();
  const date=today.toLocaleDateString('zh-CN');

  // ── 识字测验分支 (id 形如 __exam__:gXlX) ──
  if(assigningLesson._isExam || (assigningLesson.id && assigningLesson.id.indexOf('__exam__:')===0)){
    const pack = getExamPack(assigningLesson._packKey || assigningLesson.id.replace('__exam__:',''));
    if(!pack){ err.textContent='测验字库未找到 · Pack not found.'; return; }
    const qs = (typeof teacherExamQuizSize !== 'undefined' && teacherExamQuizSize > 0)
      ? Math.min(teacherExamQuizSize, pack.chars.length)
      : pack.chars.length;
    const isAll = (qs >= pack.chars.length);

    // ★ 抽字（按老师的轮换记忆 + 40 旧 / 60 新 规则）
    const teacherName = (currentTeacher?.name) || (currentAdmin?.username) || 'Admin';
    const picked = pickExamChars(pack, qs, teacherName);
    const chosenChars = picked.chars;       // [{c,p}, ...]
    const chosenCharStrs = chosenChars.map(o=>o.c);

    assignSelectedClasses.forEach(cls=>{
      // 同班同 pack 重复 → 覆盖
      const idx = list.findIndex(a=>a.lessonId===assigningLesson.id && a.classCode===cls);
      if(idx>=0) list.splice(idx,1);
      list.push({
        lessonId: assigningLesson.id,
        lessonTitle: '识字测验 · '+pack.title,
        lessonLevel: pack.grade+' '+pack.level + (isAll ? ' · 全部 '+pack.chars.length+' 字' : ' · '+qs+' 字'),
        classCode: cls,
        teacher: teacherName,
        date, deadlineType: assignDeadlineType, dueDate, deadlineLabel,
        type: 'exam',
        examQuizSize: qs,
        examCharList: chosenChars,          // ★ 本次布置的具体字（全班同一套）
        examPublishTs: Date.now(),
      });
    });
    saveAssignedHW(list);
    const _examKeys = new Set(Array.from(assignSelectedClasses).map(c=>hwKey({lessonId:assigningLesson.id, classCode:c})));
    const _examSyncPromise = cloudArrayUpsertMany('homework', list.filter(a=>_examKeys.has(hwKey(a))), hwKey);

    // ★ 把这次出的字加入老师的"已出"记忆
    addExamSeen(teacherName, pack.key, chosenCharStrs);

    // 清理 UI
    const sizeRow = document.getElementById('exam-size-row');
    if(sizeRow) sizeRow.remove();
    closeAssignModal();

    // 友好提示（含云端同步结果，方便确认是否真正上云）
    const newCount = picked.newUsed, oldCount = picked.oldUsed;
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const stamp = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())
                + ' ' + pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
    const _baseMsg = '✅ 已布置成功\n\n📅 布置时间：'+stamp+'\n\n本次 '+qs+' 字\n🆕 新字 '+newCount+' 个 · 🔁 复习 '+oldCount+' 个\n\n累计出过 '+(picked.totalSeen+newCount)+' / '+picked.totalChars+' 字';
    if(!cloudReadyForData()){
      setTimeout(()=>alert(_baseMsg + '\n\n⚠️ 当前未连接云端，本次仅保存在本设备，学生看不到。'), 100);
    } else {
      _examSyncPromise.then(ok=>{
        alert(_baseMsg + (ok
          ? '\n\n☁️ 已同步到云端（appData/homework → items，lessonId 以 __exam__: 开头）。'
          : ('\n\n⚠️ 云端同步失败：仅保存在本设备，学生看不到。\n错误：' + (window._lastCloudError || '未知') + '\n请检查网络/权限后重新布置。')));
      });
    }

    if(currentTeacher) renderTeacherDashboard();
    else if(currentAdmin){ renderAdminDashboard(); switchAdminTab('homework'); }
    return;
  }

  // Determine lesson IDs — single or batch
  const lessonIds = assigningLesson.id==='__batch__'
    ? assigningLesson.batchIds
    : [assigningLesson.id];

  assignSelectedClasses.forEach(cls=>{
    lessonIds.forEach(lid=>{
      const lesson=NATIVE_LESSONS.find(l=>l.id===lid);
      if(!lesson) return;
      const idx=list.findIndex(a=>a.lessonId===lid&&a.classCode===cls);
      if(idx>=0) list.splice(idx,1);
      list.push({
        lessonId:lid,
        lessonTitle:lesson.title+' · '+lesson.subtitle,
        lessonLevel:lesson.level,
        classCode:cls,
        teacher:currentTeacher?.name||currentAdmin?.username||'Admin',
        date, deadlineType:assignDeadlineType, dueDate, deadlineLabel,
      });
    });
  });
  saveAssignedHW(list);
  { const _k=new Set(); Array.from(assignSelectedClasses).forEach(cls=>lessonIds.forEach(lid=>_k.add(hwKey({lessonId:lid, classCode:cls})))); cloudArrayUpsertMany('homework', list.filter(a=>_k.has(hwKey(a))), hwKey); }

  // ★ 显示成功弹窗（包含布置时间 + 作业要求 + 班级）
  const summary = {
    title: assigningLesson.title + ' · ' + assigningLesson.subtitle,
    classes: Array.from(assignSelectedClasses),
    deadlineLabel,
    timeStr: new Date().toLocaleString('zh-CN'),
  };

  closeAssignModal();
  showAssignSuccess(summary);

  if(currentTeacher) renderTeacherDashboard();
  else if(currentAdmin){ renderAdminDashboard(); switchAdminTab('homework'); }
}

// ── 作业布置成功弹窗 ──
function showAssignSuccess(s){
  const old = document.getElementById('assign-success-overlay');
  if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'assign-success-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease;';
  ov.innerHTML =
    '<div style="background:white;border-radius:24px;padding:32px 28px;max-width:480px;width:100%;box-shadow:0 12px 48px rgba(0,0,0,0.25);text-align:center;">'
    + '  <div style="font-size:68px;line-height:1;margin-bottom:8px;">✅</div>'
    + '  <div style="font-size:22px;font-weight:700;color:var(--green);margin-bottom:4px;">布置成功！</div>'
    + '  <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">Assignment Published</div>'
    + '  <div style="background:var(--paper2);border-radius:14px;padding:16px;text-align:left;font-size:13px;line-height:1.8;">'
    + '    <div style="margin-bottom:8px;"><span style="color:var(--muted);">📚 作业 · Lesson:</span><br><span style="font-weight:600;color:var(--ink);">' + s.title + '</span></div>'
    + '    <div style="margin-bottom:8px;"><span style="color:var(--muted);">🏫 班级 · Classes (' + s.classes.length + '):</span><br>'
    +        s.classes.map(c => '<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:var(--blue-light);color:var(--blue);font-weight:600;font-size:12px;margin:2px 4px 2px 0;">'+c+'</span>').join('')
    + '    </div>'
    + '    <div style="margin-bottom:8px;"><span style="color:var(--muted);">⏰ 截止 · Deadline:</span><br><span style="color:var(--ink);">' + s.deadlineLabel + '</span></div>'
    + '    <div><span style="color:var(--muted);">📅 布置时间 · Time:</span><br><span style="color:var(--ink);">' + s.timeStr + '</span></div>'
    + '  </div>'
    + '  <button onclick="document.getElementById(\'assign-success-overlay\').remove()" style="margin-top:18px;padding:12px 32px;border-radius:14px;border:none;background:var(--green);color:white;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">好的 · OK</button>'
    + '</div>';
  document.body.appendChild(ov);
  // 5 秒后自动消失（防止老师没点 OK）
  setTimeout(() => { const o = document.getElementById('assign-success-overlay'); if(o) o.remove(); }, 8000);
}

function removeAssignment(lessonId,classCode){
  saveAssignedHW(getAssignedHW().filter(a=>!(a.lessonId===lessonId&&a.classCode===classCode)));
  cloudArrayRemove('homework', a=>a.lessonId===lessonId&&a.classCode===classCode);
  renderTeacherDashboard();
}

function isHWExpired(hw){
  if(!hw.dueDate) return false; // daily reminder never expires
  const due = new Date(hw.dueDate); due.setHours(23,59,59,999);
  return new Date() > due;
}

function renderAssignedList(){
  const list=getAssignedHW().filter(a=>a.classCode===teacherSelectedClass);
  const el=document.getElementById('teacher-assigned-list');
  if(!list.length){ el.innerHTML=`<div class="empty-review">班级 ${teacherSelectedClass} 暂无作业 · No homework assigned yet.</div>`; return; }
  el.innerHTML=list.map(a=>{
    const expired = isHWExpired(a);
    const code = getLessonCode(a.lessonId);
    return `
    <div class="hw-assigned-row" style="${expired?'opacity:0.6;border-color:var(--muted);':''}">
      <div>
        <div class="hw-assigned-info">${code?`<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:1px 6px;border-radius:8px;margin-right:5px;">${code}</span>`:''}${a.lessonTitle}</div>
        <div class="hw-assigned-class">📌 ${a.lessonLevel} · 班级 ${a.classCode}</div>
        <div class="hw-assigned-date">布置于 ${a.date} · ${a.deadlineLabel||''}${expired?' · ⚠️ 已过期 Expired':''}</div>
      </div>
      <button class="hw-remove-btn" onclick="removeAssignment('${a.lessonId}','${a.classCode}')">撤销</button>
    </div>`;
  }).join('');
}

function filterLessonList(){
  const q = (document.getElementById('hw-search')?.value||'').toLowerCase().trim();
  document.querySelectorAll('[id^="hwcard-"]').forEach(card=>{
    const code = (card.dataset.code||'').toLowerCase();
    const title = (card.dataset.title||'').toLowerCase();
    card.style.display = (!q || code.includes(q) || title.includes(q)) ? '' : 'none';
  });
}

function teacherSearchLessons(){
  const q = (document.getElementById('hw-search')?.value||'').toLowerCase().trim();
  const ll = document.getElementById('teacher-lesson-list');
  if(!ll) return;

  if(!q){
    ll.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--muted);">输入关键词搜索课程，或点击上方「作业库」按进度浏览</div>';
    return;
  }

  const assigned = getAssignedHW();
  const results = NATIVE_LESSONS.filter(function(l){
    const code = (getLessonCode(l.id)||'').toLowerCase();
    const search = (l.title + ' ' + l.subtitle + ' ' + l.level + ' ' + code).toLowerCase();
    return search.includes(q);
  }).slice(0, 20);

  if(!results.length){
    ll.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--muted);">没有找到匹配的课程 · No results found</div>';
    return;
  }

  ll.innerHTML = results.map(function(l){
    const code = getLessonCode(l.id);
    const isAssigned = assigned.some(function(a){ return a.lessonId===l.id && a.classCode===teacherSelectedClass && !isHWExpired(a); });
    return '<div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);" id="tsl-' + l.id + '">'
      + '<div class="tsl-info" data-id="' + l.id + '" style="flex:1;min-width:0;cursor:pointer;">'
      + '<div style="font-size:14px;font-weight:500;color:var(--ink);margin-bottom:3px;">'
      + (code ? '<span style="font-size:11px;font-weight:600;color:var(--blue);background:var(--blue-light);padding:2px 7px;border-radius:8px;margin-right:6px;">' + code + '</span>' : '')
      + l.title + ' · ' + l.subtitle + '</div>'
      + '<div style="font-size:12px;color:var(--muted);">' + l.level + ' · ' + l.words.length + '个字 · <span style="color:var(--purple);">点击预览</span></div>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0;">'
      + '<button class="tsl-preview" data-id="' + l.id + '" style="padding:6px 12px;border-radius:8px;border:1px solid var(--blue);background:var(--blue-light);color:var(--blue);font-size:12px;cursor:pointer;font-family:DM Sans,sans-serif;">👁 预览</button>'
      + '<button class="tsl-assign" data-id="' + l.id + '" style="padding:6px 12px;border-radius:8px;border:none;background:' + (isAssigned?'var(--green)':'var(--blue)') + ';color:white;font-size:12px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">' + (isAssigned?'✓ 已布置':'+ 布置') + '</button>'
      + '</div></div>';
  }).join('');

  // Attach click events
  ll.querySelectorAll('.tsl-info,.tsl-preview').forEach(function(el){
    el.addEventListener('click', function(){
      previewReturnContext = {source:'teacher-library', levelTab: tlibSelectedLevelTab};
      openLessonPreview(el.dataset.id);
    });
  });
  ll.querySelectorAll('.tsl-assign').forEach(function(el){
    el.addEventListener('click', function(){ openAssignModal(el.dataset.id); });
  });
}

function filterClassTiles(){
  const q = (document.getElementById('class-search')?.value||'').toLowerCase().trim();
  document.querySelectorAll('[id^="acb-"]').forEach(tile=>{
    const cls = tile.textContent.toLowerCase();
    tile.style.display = (!q || cls.includes(q)) ? '' : 'none';
  });
}

function isLessonAssigned(lessonId){
  if(!currentUser) return false;
  const allClasses = getStudentClasses(currentUser);
  return allClasses.some(cls=>{
    const hw=getAssignedHW().find(a=>a.lessonId===lessonId&&a.classCode===cls);
    return hw && !isHWExpired(hw);
  });
}

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
// ── Seed student accounts from Excel import (app_学员列表.xlsx) ──
function seedStudentAccounts(){
  const SEED = {
  "reignkim:": {"username": "REIGNKIM", "name": "ReignKim", "classCode": "", "classes": [], "bg": "native"},
  "zodenkim:": {"username": "ZODENKIM", "name": "ZodenKim", "classCode": "", "classes": [], "bg": "native"},
  "mattheww:": {"username": "MATTHEWW", "name": "MatthewW", "classCode": "", "classes": [], "bg": "native"},
  "evanxi:h33": {"username": "EVANXI", "name": "EvanXi", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "karissasu:z89": {"username": "KARISSASU", "name": "KarissaSu", "classCode": "Z89", "classes": ["Z89"], "bg": "native"},
  "loganzhang1:z8": {"username": "LOGANZHANG1", "name": "LoganZhang", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "alinahou:z8": {"username": "ALINAHOU", "name": "AlinaHou", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "silastong:": {"username": "SILASTONG", "name": "SilasTong", "classCode": "", "classes": [], "bg": "native"},
  "miranali:h33": {"username": "MIRANALI", "name": "MiranaLi", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "yiguo1:z88": {"username": "YIGUO1", "name": "YiGuo", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "senyin:z82": {"username": "SENYIN", "name": "SenYin", "classCode": "Z82", "classes": ["Z82"], "bg": "native"},
  "melindali:": {"username": "MELINDALI", "name": "MelindaLi", "classCode": "", "classes": [], "bg": "native"},
  "seanliao:": {"username": "SEANLIAO", "name": "SeanLiao", "classCode": "", "classes": [], "bg": "native"},
  "lukezhou:z88": {"username": "LUKEZHOU", "name": "LukeZhou", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "tingxiwang:": {"username": "TINGXIWANG", "name": "TingxiWang", "classCode": "", "classes": [], "bg": "native"},
  "henryli1:": {"username": "HENRYLI1", "name": "HenryLi", "classCode": "", "classes": [], "bg": "native"},
  "evelyn2:": {"username": "EVELYN2", "name": "Evelyn", "classCode": "", "classes": [], "bg": "native"},
  "aaronwang1:": {"username": "AARONWANG1", "name": "AaronWang", "classCode": "", "classes": [], "bg": "native"},
  "amywang2:": {"username": "AMYWANG2", "name": "AmyWang", "classCode": "", "classes": [], "bg": "native"},
  "cocowang1:": {"username": "COCOWANG1", "name": "CoCo", "classCode": "", "classes": [], "bg": "native"},
  "brianzhao:": {"username": "BRIANZHAO", "name": "BrianZhao", "classCode": "", "classes": [], "bg": "native"},
  "masonma1:z82": {"username": "MASONMA1", "name": "Mason Ma", "classCode": "Z82", "classes": ["Z82"], "bg": "native"},
  "yileizhang:z82": {"username": "YILEIZHANG", "name": "Yilei Zhang", "classCode": "Z82", "classes": ["Z82"], "bg": "native"},
  "evanjiang:z82": {"username": "EVANJIANG", "name": "Evan Jiang", "classCode": "Z82", "classes": ["Z82"], "bg": "native"},
  "houyuchen1:z8": {"username": "HOUYUCHEN1", "name": "HouyuChen", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "jasonwang1:z19": {"username": "JASONWANG1", "name": "Jason wang the GOATT", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "emmacao:h39": {"username": "EMMACAO", "name": "Emma Cao", "classCode": "H39", "classes": ["H39"], "bg": "native"},
  "danielle1:n3": {"username": "DANIELLE1", "name": "Danielle", "classCode": "N3", "classes": ["N3"], "bg": "native"},
  "ethanchen1:": {"username": "ETHANCHEN1", "name": "EthanChen", "classCode": "", "classes": [], "bg": "native"},
  "yuhaohui:h36": {"username": "YUHAOHUI", "name": "YuhaoHui", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "songyafang:h21": {"username": "SONGYAFANG", "name": "SongyaFang", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "wenyuluo:z80": {"username": "WENYULUO", "name": "WenyuLuo", "classCode": "Z80", "classes": ["Z80"], "bg": "native"},
  "ruiqi1:z36": {"username": "RUIQI1", "name": "RuiQi", "classCode": "Z36", "classes": ["Z36"], "bg": "native"},
  "qianroulu:h21": {"username": "QIANROULU", "name": "QianrouLu", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "nathanzheng:h21": {"username": "NATHANZHENG", "name": "NathanZheng", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "mionzhang:h21": {"username": "MIONZHANG", "name": "MionZhang", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "evazhang1:z89": {"username": "EVAZHANG1", "name": "EvaZhang", "classCode": "Z89", "classes": ["Z89"], "bg": "native"},
  "yimanliu:z89": {"username": "YIMANLIU", "name": "Maxliu", "classCode": "Z89", "classes": ["Z89"], "bg": "native"},
  "alexanderh1:": {"username": "ALEXANDERH1", "name": "AlexanderH1", "classCode": "", "classes": [], "bg": "native"},
  "minawen:h21": {"username": "MINAWEN", "name": "MinaWen", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "aidenyuan:h35": {"username": "AIDENYUAN", "name": "AidenYuan", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "jordanshim:z34": {"username": "JORDANSHIM", "name": "JordanShim", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "chloezhu:h24": {"username": "CHLOEZHU", "name": "ChloeZhu", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "jasperhuang:h21": {"username": "JASPERHUANG", "name": "JasperHuang", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "allisonjin:h21": {"username": "ALLISONJIN", "name": "AllisonJin", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "chloege:h20": {"username": "CHLOEGE", "name": "ChloeGe", "classCode": "H20", "classes": ["H20"], "bg": "native"},
  "stellage1:h20": {"username": "STELLAGE1", "name": "StellaGe", "classCode": "H20", "classes": ["H20"], "bg": "native"},
  "xingchenwang:z35": {"username": "XINGCHENWANG", "name": "XingchenWang", "classCode": "Z35", "classes": ["Z35"], "bg": "native"},
  "haileyzhou:n3": {"username": "HAILEYZHOU", "name": "HaileyZhou", "classCode": "N3", "classes": ["N3"], "bg": "native"},
  "williamluger:": {"username": "WILLIAMLUGER", "name": "WilliamLuger", "classCode": "", "classes": [], "bg": "native"},
  "marcusluger:": {"username": "MARCUSLUGER", "name": "MarcusLuger", "classCode": "", "classes": [], "bg": "native"},
  "katelin1:z2": {"username": "KATELIN1", "name": "KateLin", "classCode": "Z2", "classes": ["Z2"], "bg": "native"},
  "shengxiwang:z38": {"username": "SHENGXIWANG", "name": "ShengxiWang", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "bellazheng:n21": {"username": "BELLAZHENG", "name": "BellaZheng", "classCode": "N21", "classes": ["N21"], "bg": "native"},
  "philipmargul:y4": {"username": "PHILIPMARGUL", "name": "PhilipMargul", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "leozhang1:": {"username": "LEOZHANG1", "name": "LeoZhang", "classCode": "", "classes": [], "bg": "native"},
  "yuqilin:": {"username": "YUQILIN", "name": "YuqiLin", "classCode": "", "classes": [], "bg": "native"},
  "adoralin:z51": {"username": "ADORALIN", "name": "AdoraLin", "classCode": "Z51", "classes": ["Z51"], "bg": "native"},
  "tongchenmao:h36": {"username": "TONGCHENMAO", "name": "TongchenMao", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "lilliangong:": {"username": "LILLIANGONG", "name": "LillianGong", "classCode": "", "classes": [], "bg": "native"},
  "emilyklock:y4": {"username": "EMILYKLOCK", "name": "EmilyKlock", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "lucasklock:n13": {"username": "LUCASKLOCK", "name": "LucasKlock", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "bryanchen1:z65": {"username": "BRYANCHEN1", "name": "😺😸BRYAN🐱🐈‍⬛", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "alanchen1:z65": {"username": "ALANCHEN1", "name": "Alan Chen [OPTIMAX]", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "emilyliu1:z31": {"username": "EMILYLIU1", "name": "EmilyLiu", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "freyagu:h21": {"username": "FREYAGU", "name": "FreyaGu", "classCode": "H21", "classes": ["H21"], "bg": "native"},
  "chloejia:z65": {"username": "CHLOEJIA", "name": "ChloeJia", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "kylezhang:": {"username": "KYLEZHANG", "name": "KyleZhang", "classCode": "", "classes": [], "bg": "native"},
  "mikelwang:": {"username": "MIKELWANG", "name": "Mikel Wang", "classCode": "", "classes": [], "bg": "native"},
  "tobythompson:": {"username": "TOBYTHOMPSON", "name": "Toby", "classCode": "", "classes": [], "bg": "native"},
  "loganyork:n21": {"username": "LOGANYORK", "name": "Logan York", "classCode": "N21", "classes": ["N21"], "bg": "native"},
  "alexyang1:z38": {"username": "ALEXYANG1", "name": "Alex Yang", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "josephng:": {"username": "JOSEPHNG", "name": "JosephNg", "classCode": "", "classes": [], "bg": "native"},
  "ariayang1:z9": {"username": "ARIAYANG1", "name": "Aria Yang", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "ameliawang:": {"username": "AMELIAWANG", "name": "Amelia Wang", "classCode": "", "classes": [], "bg": "native"},
  "adelineliu:h36": {"username": "ADELINELIU", "name": "Adeline Liu", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "aidanwong:n19": {"username": "AIDANWONG", "name": "AidanWong", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "caialiang:n19": {"username": "CAIALIANG", "name": "CaiaLiang", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "adrianliang:n19": {"username": "ADRIANLIANG", "name": "AdrianLiang", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "sophialiang:": {"username": "SOPHIALIANG", "name": "SophiaLiang", "classCode": "", "classes": [], "bg": "native"},
  "cleimeng:z13": {"username": "CLEIMENG", "name": "CleiMeng", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "emmamo:z20": {"username": "EMMAMO", "name": "Emma Molyneaux", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "edwardm:z20": {"username": "EDWARDM", "name": "Edward Molyneaux", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "tiantian:": {"username": "TIANTIAN", "name": "tiantian", "classCode": "", "classes": [], "bg": "native"},
  "wesleylaw:h24": {"username": "WESLEYLAW", "name": "WesleyLaw", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "ianbai:n21": {"username": "IANBAI", "name": "IanBai", "classCode": "N21", "classes": ["N21"], "bg": "native"},
  "anruihuang:z47": {"username": "ANRUIHUANG", "name": "Anruihuang", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "alicialuo:": {"username": "ALICIALUO", "name": "AliciaLuo", "classCode": "", "classes": [], "bg": "native"},
  "stanleyhe:z80": {"username": "STANLEYHE", "name": "StanleyHe", "classCode": "Z80", "classes": ["Z80", "Z51"], "bg": "native"},
  "jameslin:z17": {"username": "JAMESLIN", "name": "林正熙", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "nomicui:z9": {"username": "NOMICUI", "name": "NomiCui", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "pingsun:z49": {"username": "PINGSUN", "name": "Ping Sun sigma Ohio man", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "chloeshang:h36": {"username": "CHLOESHANG", "name": "ChloeShang", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "jaxxu1:n13": {"username": "JAXXU1", "name": "JaxXu", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "lottiehang:": {"username": "LOTTIEHANG", "name": "LottieHang", "classCode": "", "classes": [], "bg": "native"},
  "gracehang:": {"username": "GRACEHANG", "name": "GraceHang", "classCode": "", "classes": [], "bg": "native"},
  "jinyangfeng:n19": {"username": "JINYANGFENG", "name": "JinyangFeng", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "shuyitan:z65": {"username": "SHUYITAN", "name": "ShuyiTan", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "milesschlyer:y4": {"username": "MILESSCHLYER", "name": "MilesSchlyer", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "emilyliu:": {"username": "EMILYLIU", "name": "EmilyLiu", "classCode": "", "classes": [], "bg": "native"},
  "baoyichen:h36": {"username": "BAOYICHEN", "name": "BaoyiChen", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "anniejiang1:h36": {"username": "ANNIEJIANG1", "name": "AnnieJiang", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "ariazhou:h35": {"username": "ARIAZHOU", "name": "AriaZhou", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "harperhuang:h35": {"username": "HARPERHUANG", "name": "HarperHuang", "classCode": "H35", "classes": ["H35", "H36"], "bg": "native"},
  "nataliezhu:z57": {"username": "NATALIEZHU", "name": "NatalieZhu", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "jamesguo:z38": {"username": "JAMESGUO", "name": "JamesGuo", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "jacquelinexu:": {"username": "JACQUELINEXU", "name": "Jacqueline", "classCode": "", "classes": [], "bg": "native"},
  "anthonychen:y4": {"username": "ANTHONYCHEN", "name": "AnthonyChen", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "lucaszhao:y4": {"username": "LUCASZHAO", "name": "Lucas赵奕非", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "xavierxu:y4": {"username": "XAVIERXU", "name": "XavierXu", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "evanbai:": {"username": "EVANBAI", "name": "EvanBai", "classCode": "", "classes": [], "bg": "native"},
  "evawang1:": {"username": "EVAWANG1", "name": "EvaWang", "classCode": "", "classes": [], "bg": "native"},
  "emilyyi:z9": {"username": "EMILYYI", "name": "EmilyYi", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "evazhang:h39": {"username": "EVAZHANG", "name": "EvaZhang", "classCode": "H39", "classes": ["H39"], "bg": "native"},
  "alexcao:z49": {"username": "ALEXCAO", "name": "AlexCao", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "chloeluo:h36": {"username": "CHLOELUO", "name": "ChloeLuo", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "harrychen:h35": {"username": "HARRYCHEN", "name": "HarryChen", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "xizhaogu:h33": {"username": "XIZHAOGU", "name": "XizhaoGu", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "leoyi1:h33": {"username": "LEOYI1", "name": "LeoYi", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "danielhu:z32": {"username": "DANIELHU", "name": "DanielHu", "classCode": "Z32", "classes": ["Z32"], "bg": "native"},
  "kriswei:h24": {"username": "KRISWEI", "name": "KrisWei", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "yichengong:h33": {"username": "YICHENGONG", "name": "YichenGong", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "felixxu:h33": {"username": "FELIXXU", "name": "Felix Xu", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "henrywang1:z44": {"username": "HENRYWANG1", "name": "HenryWang", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "lucaleung:y4": {"username": "LUCALEUNG", "name": "LucaLeung", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "ethanzhang:": {"username": "ETHANZHANG", "name": "EthanZhang", "classCode": "", "classes": [], "bg": "native"},
  "aimeeliao:z38": {"username": "AIMEELIAO", "name": "AimeeLiao", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "jaydenchen:": {"username": "JAYDENCHEN", "name": "JaydenChen", "classCode": "", "classes": [], "bg": "native"},
  "yujiahuang:z88": {"username": "YUJIAHUANG", "name": "YujiaHuang", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "anthonyzhang:z9": {"username": "ANTHONYZHANG", "name": "AnthonyZhang", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "eliye1:z88": {"username": "ELIYE1", "name": "EliYe", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "yuexikai:z8": {"username": "YUEXIKAI", "name": "Kai", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "hannahma:": {"username": "HANNAHMA", "name": "HannahMa", "classCode": "", "classes": [], "bg": "native"},
  "justinshen:z34": {"username": "JUSTINSHEN", "name": "JustinShen", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "ethanwang1:z34": {"username": "ETHANWANG1", "name": "EthanWang", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "edwardzhang:z34": {"username": "EDWARDZHANG", "name": "EdwardZhang", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "lucasqi:z34": {"username": "LUCASQI", "name": "LucasQi", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "vincentwang:z96": {"username": "VINCENTWANG", "name": "VincentWang", "classCode": "Z96", "classes": ["Z96"], "bg": "native"},
  "vickyyin:z5": {"username": "VICKYYIN", "name": "Vicky Yin", "classCode": "Z5", "classes": ["Z5"], "bg": "native"},
  "raidena:z15": {"username": "RAIDENA", "name": "RaidenA", "classCode": "Z15", "classes": ["Z15"], "bg": "native"},
  "irissheng:z15": {"username": "IRISSHENG", "name": "IrisSheng", "classCode": "Z15", "classes": ["Z15"], "bg": "native"},
  "averyduan:h24": {"username": "AVERYDUAN", "name": "AveryDuan", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "irischen:h24": {"username": "IRISCHEN", "name": "IrisChen", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "shawnzou:h24": {"username": "SHAWNZOU", "name": "ShawnZou", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "curtisng:": {"username": "CURTISNG", "name": "CurtisNg", "classCode": "", "classes": [], "bg": "native"},
  "isabellafu:": {"username": "ISABELLAFU", "name": "IsabellaFu", "classCode": "", "classes": [], "bg": "native"},
  "finnleyl:": {"username": "FINNLEYL", "name": "FinnleyL", "classCode": "", "classes": [], "bg": "native"},
  "kaydenchen:": {"username": "KAYDENCHEN", "name": "KaydenChen", "classCode": "", "classes": [], "bg": "native"},
  "qianxunli:": {"username": "QIANXUNLI", "name": "QianxunLi", "classCode": "", "classes": [], "bg": "native"},
  "kaiaxu:": {"username": "KAIAXU", "name": "KaiaXu", "classCode": "", "classes": [], "bg": "native"},
  "andrewlyu:h33": {"username": "ANDREWLYU", "name": "AndrewLyu", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "vincentliu:z35": {"username": "VINCENTLIU", "name": "VincentLiu", "classCode": "Z35", "classes": ["Z35"], "bg": "native"},
  "doryzhao:z5": {"username": "DORYZHAO", "name": "DoryZhao", "classCode": "Z5", "classes": ["Z5"], "bg": "native"},
  "crestonlo:z24": {"username": "CRESTONLO", "name": "罗健翃", "classCode": "Z24", "classes": ["Z24"], "bg": "native"},
  "heatherqin:": {"username": "HEATHERQIN", "name": "Heather Qin", "classCode": "", "classes": [], "bg": "native"},
  "shuyaliu:z88": {"username": "SHUYALIU", "name": "ShuyaLiu", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "williamxing:z37": {"username": "WILLIAMXING", "name": "William", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "gavinzhai:z31": {"username": "GAVINZHAI", "name": "GavinZhai", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "aidenshu:z38": {"username": "AIDENSHU", "name": "AidenShu", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "alanzhao:": {"username": "ALANZHAO", "name": "AlanZhao", "classCode": "", "classes": [], "bg": "native"},
  "jasonyu:": {"username": "JASONYU", "name": "JasonYu", "classCode": "", "classes": [], "bg": "native"},
  "alexisli:": {"username": "ALEXISLI", "name": "Alexis", "classCode": "", "classes": [], "bg": "native"},
  "joycepang:": {"username": "JOYCEPANG", "name": "JoycePang", "classCode": "", "classes": [], "bg": "native"},
  "leonzhao:": {"username": "LEONZHAO", "name": "LeonZhao", "classCode": "", "classes": [], "bg": "native"},
  "albertzhao:": {"username": "ALBERTZHAO", "name": "AlbertZhao", "classCode": "", "classes": [], "bg": "native"},
  "aidandong:": {"username": "AIDANDONG", "name": "AidanDong", "classCode": "", "classes": [], "bg": "native"},
  "ethanliu:": {"username": "ETHANLIU", "name": "Ethan Liu", "classCode": "", "classes": [], "bg": "native"},
  "charlotteh:": {"username": "CHARLOTTEH", "name": "CharlotteH", "classCode": "", "classes": [], "bg": "native"},
  "carolineung:": {"username": "CAROLINEUNG", "name": "CarolineUng", "classCode": "", "classes": [], "bg": "native"},
  "hannahhan:": {"username": "HANNAHHAN", "name": "HannahHan", "classCode": "", "classes": [], "bg": "native"},
  "clydechien:h35": {"username": "CLYDECHIEN", "name": "ClydeChien", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "yunshuochen:h35": {"username": "YUNSHUOCHEN", "name": "YunshuoChen", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "gavinliang:n21": {"username": "GAVINLIANG", "name": "GavinLiang", "classCode": "N21", "classes": ["N21"], "bg": "native"},
  "elijiasevon:n21": {"username": "ELIJIASEVON", "name": "ElijiaSevon", "classCode": "N21", "classes": ["N21"], "bg": "native"},
  "misiaye:y2": {"username": "MISIAYE", "name": "MisiaYe", "classCode": "Y2", "classes": ["Y2"], "bg": "native"},
  "arthurmah:y4": {"username": "ARTHURMAH", "name": "ArthurMah", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "jeremyyu:z80": {"username": "JEREMYYU", "name": "Jeremy", "classCode": "Z80", "classes": ["Z80"], "bg": "native"},
  "noahjin:": {"username": "NOAHJIN", "name": "NoahJin", "classCode": "", "classes": [], "bg": "native"},
  "melodylin:h36": {"username": "MELODYLIN", "name": "MelodyLin", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "vivianma:h36": {"username": "VIVIANMA", "name": "VivianMa", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "ronaldwang:h36": {"username": "RONALDWANG", "name": "RonaldWang", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "chloeliu:h36": {"username": "CHLOELIU", "name": "Chloe Liu", "classCode": "H36", "classes": ["H36"], "bg": "native"},
  "miashi:z65": {"username": "MIASHI", "name": "MiaShi", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "ivanjarrett:": {"username": "IVANJARRETT", "name": "Ivan Jarrett", "classCode": "", "classes": [], "bg": "native"},
  "elijahhilton:": {"username": "ELIJAHHILTON", "name": "Elijah Hilton", "classCode": "", "classes": [], "bg": "native"},
  "yichenli:z51": {"username": "YICHENLI", "name": "Yichen Li", "classCode": "Z51", "classes": ["Z51"], "bg": "native"},
  "kaelenren:": {"username": "KAELENREN", "name": "KaelenRen", "classCode": "", "classes": [], "bg": "native"},
  "annieshu:": {"username": "ANNIESHU", "name": "Annie", "classCode": "", "classes": [], "bg": "native"},
  "irishou:z37": {"username": "IRISHOU", "name": "Iris Hou 其其⚜️💐", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "williamwang:z37": {"username": "WILLIAMWANG", "name": "王际骁William", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "lenayang:": {"username": "LENAYANG", "name": "Lena Yang", "classCode": "", "classes": [], "bg": "native"},
  "oscarsong:": {"username": "OSCARSONG", "name": "Oscar Song", "classCode": "", "classes": [], "bg": "native"},
  "yianwan:": {"username": "YIANWAN", "name": "Yian Wan", "classCode": "", "classes": [], "bg": "native"},
  "jiyueyang:h24": {"username": "JIYUEYANG", "name": "Jiyue Yang", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "celinayang:z19": {"username": "CELINAYANG", "name": "Celina Yang", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "zijinyang:": {"username": "ZIJINYANG", "name": "Zijin Yang", "classCode": "", "classes": [], "bg": "native"},
  "zacharygao:z40": {"username": "ZACHARYGAO", "name": "Zachary Gao", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "elenazhang:z13": {"username": "ELENAZHANG", "name": "Elena Zhang", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "bellaxu:": {"username": "BELLAXU", "name": "Bella xu", "classCode": "", "classes": [], "bg": "native"},
  "amyxu1:": {"username": "AMYXU1", "name": "AMY XU", "classCode": "", "classes": [], "bg": "native"},
  "lukecai:": {"username": "LUKECAI", "name": "Luke Cai", "classCode": "", "classes": [], "bg": "native"},
  "bobbychen:z19": {"username": "BOBBYCHEN", "name": "Bobby Chen", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "katherinecao:z92": {"username": "KATHERINECAO", "name": "Katherine Cao", "classCode": "Z92", "classes": ["Z92"], "bg": "native"},
  "eileenwang:": {"username": "EILEENWANG", "name": "王艺涵", "classCode": "", "classes": [], "bg": "native"},
  "brightweng:z48": {"username": "BRIGHTWENG", "name": "Bright Weng", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "averywu:": {"username": "AVERYWU", "name": "Avery Wu", "classCode": "", "classes": [], "bg": "native"},
  "ellieshu:": {"username": "ELLIESHU", "name": "Ellie S", "classCode": "", "classes": [], "bg": "native"},
  "emmabao:z60": {"username": "EMMABAO", "name": "EmmaBao", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "chloeshi:h22": {"username": "CHLOESHI", "name": "Chloe Shi", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "miraimao:y4": {"username": "MIRAIMAO", "name": "MiraiMao", "classCode": "Y4", "classes": ["Y4"], "bg": "native"},
  "emilyyan:n19": {"username": "EMILYYAN", "name": "EmilyYan", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "jeremyge:z60": {"username": "JEREMYGE", "name": "JeremyGe", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "leahluey:": {"username": "LEAHLUEY", "name": "Leah Luey", "classCode": "", "classes": [], "bg": "native"},
  "andyman:": {"username": "ANDYMAN", "name": "Andy Man", "classCode": "", "classes": [], "bg": "native"},
  "jerryzhou:z19": {"username": "JERRYZHOU", "name": "Jerry Zhou", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "aidanxu:h22": {"username": "AIDANXU", "name": "Aidan Xu", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "carolinzeng:z2": {"username": "CAROLINZENG", "name": "Carolin Zeng", "classCode": "Z2", "classes": ["Z2", "Z32"], "bg": "native"},
  "annabelwang:z19": {"username": "ANNABELWANG", "name": "Annabel Wang", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "kiancampbell:y2": {"username": "KIANCAMPBELL", "name": "Kian Campbell", "classCode": "Y2", "classes": ["Y2"], "bg": "native"},
  "mishamao:n13": {"username": "MISHAMAO", "name": "Misha Mao", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "henryzhuang:h22": {"username": "HENRYZHUANG", "name": "Henry Zhuang", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "arialin:z20": {"username": "ARIALIN", "name": "Aria Lin", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "danielzhou:": {"username": "DANIELZHOU", "name": "Daniel Zhou", "classCode": "", "classes": [], "bg": "native"},
  "vincentli:": {"username": "VINCENTLI", "name": "Vincent Li", "classCode": "", "classes": [], "bg": "native"},
  "davinaxie:y2": {"username": "DAVINAXIE", "name": "Davina Xie", "classCode": "Y2", "classes": ["Y2"], "bg": "native"},
  "kaiyanli:z47": {"username": "KAIYANLI", "name": "Kaiyan Li", "classCode": "Z47", "classes": ["Z47", "Z45"], "bg": "native"},
  "jonnathanw:": {"username": "JONNATHANW", "name": "Jonnathan Wang", "classCode": "", "classes": [], "bg": "native"},
  "georgeduan:h22": {"username": "GEORGEDUAN", "name": "George Duan", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "alanli:h23": {"username": "ALANLI", "name": "Alan Li", "classCode": "H23", "classes": ["H23"], "bg": "native"},
  "adrianluo:h22": {"username": "ADRIANLUO", "name": "Adrian Luo", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "emilyqu:h22": {"username": "EMILYQU", "name": "Emily Qu", "classCode": "H22", "classes": ["H22"], "bg": "native"},
  "junzeyu:h24": {"username": "JUNZEYU", "name": "Junze Yu", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "franklinc:h24": {"username": "FRANKLINC", "name": "Franklin Cheng", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "yiyao1:h24": {"username": "YIYAO1", "name": "Yi Yao", "classCode": "H24", "classes": ["H24"], "bg": "native"},
  "selinaxiao:z20": {"username": "SELINAXIAO", "name": "Selina Xiao", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "edisonhf:": {"username": "EDISONHF", "name": "Edison Huangfu", "classCode": "", "classes": [], "bg": "native"},
  "andrewren:": {"username": "ANDREWREN", "name": "Andrew Ren", "classCode": "", "classes": [], "bg": "native"},
  "janicetong:h56": {"username": "JANICETONG", "name": "Janice Tong", "classCode": "H56", "classes": ["H56"], "bg": "native"},
  "sylviayehe:h56": {"username": "SYLVIAYEHE", "name": "Sylvia Ye He", "classCode": "H56", "classes": ["H56"], "bg": "native"},
  "nomichsu:h56": {"username": "NOMICHSU", "name": "Nomic Hsu", "classCode": "H56", "classes": ["H56"], "bg": "native"},
  "kazdang:h53": {"username": "KAZDANG", "name": "Kaz Dang", "classCode": "H53", "classes": ["H53"], "bg": "native"},
  "jaydentan:h56": {"username": "JAYDENTAN", "name": "Jayden Tan", "classCode": "H56", "classes": ["H56"], "bg": "native"},
  "eriksmith:n19": {"username": "ERIKSMITH", "name": "Erik Smith", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "aubreyxu:n19": {"username": "AUBREYXU", "name": "Aubrey Xu", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "belindazhu:z98": {"username": "BELINDAZHU", "name": "Belinda Zhu", "classCode": "Z98", "classes": ["Z98"], "bg": "native"},
  "clairechen:z96": {"username": "CLAIRECHEN", "name": "Claire Chen", "classCode": "Z96", "classes": ["Z96"], "bg": "native"},
  "allenwu:z95": {"username": "ALLENWU", "name": "Allen Wu", "classCode": "Z95", "classes": ["Z95"], "bg": "native"},
  "kevinzhao:z49": {"username": "KEVINZHAO", "name": "Kevin Zhao", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "oliviatang:": {"username": "OLIVIATANG", "name": "汤馥瑜", "classCode": "", "classes": [], "bg": "native"},
  "tinsleyxu:z24": {"username": "TINSLEYXU", "name": "Tinsley Xu", "classCode": "Z24", "classes": ["Z24"], "bg": "native"},
  "leonsun:z20": {"username": "LEONSUN", "name": "Leon Sun", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "leofan:": {"username": "LEOFAN", "name": "Leo Fan", "classCode": "", "classes": [], "bg": "native"},
  "jasperli:z15": {"username": "JASPERLI", "name": "Jasper Li", "classCode": "Z15", "classes": ["Z15", "Z19"], "bg": "native"},
  "ericduan:z20": {"username": "ERICDUAN", "name": "Eric Duan", "classCode": "Z20", "classes": ["Z20"], "bg": "native"},
  "stellasi:": {"username": "STELLASI", "name": "Stella Si", "classCode": "", "classes": [], "bg": "native"},
  "minghanwang:": {"username": "MINGHANWANG", "name": "Minghan Wang", "classCode": "", "classes": [], "bg": "native"},
  "leyangchen:z37": {"username": "LEYANGCHEN", "name": "Leyang Chen", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "sebastianzhu:z10": {"username": "SEBASTIANZHU", "name": "葛芳远", "classCode": "Z10", "classes": ["Z10"], "bg": "native"},
  "evanwang:z47": {"username": "EVANWANG", "name": "Evan Wang", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "dylanwang:": {"username": "DYLANWANG", "name": "Dylan Wang", "classCode": "", "classes": [], "bg": "native"},
  "graceqi:z60": {"username": "GRACEQI", "name": "Grace Qi", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "chasemetzgar:": {"username": "CHASEMETZGAR", "name": "Chase Metzgar", "classCode": "", "classes": [], "bg": "native"},
  "jessiechen:z8": {"username": "JESSIECHEN", "name": "Jessie Chen", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "angelinas:": {"username": "ANGELINAS", "name": "Angelina Strashilov", "classCode": "", "classes": [], "bg": "native"},
  "evazhu:z60": {"username": "EVAZHU", "name": "Eva Zhu", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "benjaminz:": {"username": "BENJAMINZ", "name": "Benjamin Zhang", "classCode": "", "classes": [], "bg": "native"},
  "daviddeng:z9": {"username": "DAVIDDENG", "name": "David Deng", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "lillianli:z31": {"username": "LILLIANLI", "name": "Lillian Li", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "zirongguo:z39": {"username": "ZIRONGGUO", "name": "Zirong Guo", "classCode": "Z39", "classes": ["Z39"], "bg": "native"},
  "trishakhatri:": {"username": "TRISHAKHATRI", "name": "Trisha Khatri", "classCode": "", "classes": [], "bg": "native"},
  "esmeliu:z82": {"username": "ESMELIU", "name": "Esme Liu", "classCode": "Z82", "classes": ["Z82", "Z33"], "bg": "native"},
  "fanghu:": {"username": "FANGHU", "name": "Fang Hu", "classCode": "", "classes": [], "bg": "native"},
  "nolanluu:": {"username": "NOLANLUU", "name": "Nolan Luu", "classCode": "", "classes": [], "bg": "native"},
  "alexanderh:z50": {"username": "ALEXANDERH", "name": "Alexander Hong", "classCode": "Z50", "classes": ["Z50"], "bg": "native"},
  "siyuanchai:": {"username": "SIYUANCHAI", "name": "Eric Chai", "classCode": "", "classes": [], "bg": "native"},
  "masonlau:": {"username": "MASONLAU", "name": "Mason", "classCode": "", "classes": [], "bg": "native"},
  "ruyiqiu:": {"username": "RUYIQIU", "name": "Ruyi Qiu", "classCode": "", "classes": [], "bg": "native"},
  "leoncheng:": {"username": "LEONCHENG", "name": "Leon Cheng", "classCode": "", "classes": [], "bg": "native"},
  "chloecao:z38": {"username": "CHLOECAO", "name": "Chloe Cao", "classCode": "Z38", "classes": ["Z38"], "bg": "native"},
  "ryansun:z13": {"username": "RYANSUN", "name": "Ryan Sun", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "robinliu:z48": {"username": "ROBINLIU", "name": "Robin Liu", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "gracewang:": {"username": "GRACEWANG", "name": "Grace Wang", "classCode": "", "classes": [], "bg": "native"},
  "rongsun:z90": {"username": "RONGSUN", "name": "Rong Sun", "classCode": "Z90", "classes": ["Z90"], "bg": "native"},
  "lucastian:": {"username": "LUCASTIAN", "name": "Lucas Tian", "classCode": "", "classes": [], "bg": "native"},
  "ziyanli:": {"username": "ZIYANLI", "name": "Ziyan Li", "classCode": "", "classes": [], "bg": "native"},
  "zileli:z13": {"username": "ZILELI", "name": "Zile Li", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "gegechen:z34": {"username": "GEGECHEN", "name": "Grace Chen", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "jerryzhao:z37": {"username": "JERRYZHAO", "name": "Jerry Zhao", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "bellaqiao:": {"username": "BELLAQIAO", "name": "Bella Qiao", "classCode": "", "classes": [], "bg": "native"},
  "georgeli:z31": {"username": "GEORGELI", "name": "George Li", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "sylviachen:": {"username": "SYLVIACHEN", "name": "Sylvia Chen", "classCode": "", "classes": [], "bg": "native"},
  "jaydenwu:": {"username": "JAYDENWU", "name": "Jayden Wu", "classCode": "", "classes": [], "bg": "native"},
  "brandonyuan:z95": {"username": "BRANDONYUAN", "name": "Brandon Yuan", "classCode": "Z95", "classes": ["Z95"], "bg": "native"},
  "zachfan:z67": {"username": "ZACHFAN", "name": "Zach Fan", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "sarahchen1:z39": {"username": "SARAHCHEN1", "name": "Sarah Chen", "classCode": "Z39", "classes": ["Z39"], "bg": "native"},
  "aaronwu:": {"username": "AARONWU", "name": "Aaron Wu", "classCode": "", "classes": [], "bg": "native"},
  "atommumu:": {"username": "ATOMMUMU", "name": "Atom Mumu", "classCode": "", "classes": [], "bg": "native"},
  "lizli1:z34": {"username": "LIZLI1", "name": "Liz Li", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "isabellali:": {"username": "ISABELLALI", "name": "Isabella Li", "classCode": "", "classes": [], "bg": "native"},
  "harperliu:z89": {"username": "HARPERLIU", "name": "Harper Liu", "classCode": "Z89", "classes": ["Z89"], "bg": "native"},
  "nathanlo:z51": {"username": "NATHANLO", "name": "Nathan Lo", "classCode": "Z51", "classes": ["Z51"], "bg": "native"},
  "lucywei:": {"username": "LUCYWEI", "name": "Lucy Wei", "classCode": "", "classes": [], "bg": "native"},
  "williamsong:z60": {"username": "WILLIAMSONG", "name": "William Song", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "tedhu1:": {"username": "TEDHU1", "name": "Ted Hu", "classCode": "", "classes": [], "bg": "native"},
  "ariayang:": {"username": "ARIAYANG", "name": "Aria Yang", "classCode": "", "classes": [], "bg": "native"},
  "ryanli:z8": {"username": "RYANLI", "name": "Ryan Li", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "abbyzhang:z39": {"username": "ABBYZHANG", "name": "Abby Zhang", "classCode": "Z39", "classes": ["Z39"], "bg": "native"},
  "kylezhao:z51": {"username": "KYLEZHAO", "name": "Kyle Zhao", "classCode": "Z51", "classes": ["Z51"], "bg": "native"},
  "alexandriaw:z39": {"username": "ALEXANDRIAW", "name": "Alexandria Wei", "classCode": "Z39", "classes": ["Z39"], "bg": "native"},
  "morganlin:": {"username": "MORGANLIN", "name": "Morgan Lin", "classCode": "", "classes": [], "bg": "native"},
  "olivialin:": {"username": "OLIVIALIN", "name": "Olivia Lin", "classCode": "", "classes": [], "bg": "native"},
  "graysong:h53": {"username": "GRAYSONG", "name": "Grayson Graham", "classCode": "H53", "classes": ["H53"], "bg": "native"},
  "cassandra:n18": {"username": "CASSANDRA", "name": "Cassandra Farnell", "classCode": "N18", "classes": ["N18"], "bg": "native"},
  "marloa:n18": {"username": "MARLOA", "name": "Marlo Anderson", "classCode": "N18", "classes": ["N18"], "bg": "native"},
  "kaizexu:": {"username": "KAIZEXU", "name": "恺恺", "classCode": "", "classes": [], "bg": "native"},
  "mellerioyang:z34": {"username": "MELLERIOYANG", "name": "杨麦蓝", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "maxbelcher:": {"username": "MAXBELCHER", "name": "Max Belcher", "classCode": "", "classes": [], "bg": "native"},
  "keonabun:n18": {"username": "KEONABUN", "name": "Keona Bun", "classCode": "N18", "classes": ["N18"], "bg": "native"},
  "benjaminbun:n18": {"username": "BENJAMINBUN", "name": "Benjamin Bun", "classCode": "N18", "classes": ["N18"], "bg": "native"},
  "clarawong:": {"username": "CLARAWONG", "name": "Clara Wong", "classCode": "", "classes": [], "bg": "native"},
  "jasmineyip:": {"username": "JASMINEYIP", "name": "Jasmine Yip", "classCode": "", "classes": [], "bg": "native"},
  "jayneyip:": {"username": "JAYNEYIP", "name": "Jayne Yip", "classCode": "", "classes": [], "bg": "native"},
  "chloekavulu:": {"username": "CHLOEKAVULU", "name": "Chole Kavulu", "classCode": "", "classes": [], "bg": "native"},
  "bethanyyip:y5": {"username": "BETHANYYIP", "name": "Bethany Yip", "classCode": "Y5", "classes": ["Y5"], "bg": "native"},
  "andrewchen:": {"username": "ANDREWCHEN", "name": "Andrew Chen", "classCode": "", "classes": [], "bg": "native"},
  "cathyxu:z67": {"username": "CATHYXU", "name": "-w@ffl3z🥑-  恺心", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "gracejiao:z60": {"username": "GRACEJIAO", "name": "Grace Jiao", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "ellaxu:z62": {"username": "ELLAXU", "name": "Ella许", "classCode": "Z62", "classes": ["Z62"], "bg": "native"},
  "kaylaphung:z50": {"username": "KAYLAPHUNG", "name": "Kayla Phung", "classCode": "Z50", "classes": ["Z50"], "bg": "native"},
  "oliviachen:": {"username": "OLIVIACHEN", "name": "Olivia Chen", "classCode": "", "classes": [], "bg": "native"},
  "michaeljiang:": {"username": "MICHAELJIANG", "name": "Michael", "classCode": "", "classes": [], "bg": "native"},
  "elainesun:": {"username": "ELAINESUN", "name": "Elaine", "classCode": "", "classes": [], "bg": "native"},
  "gavinchen:z57": {"username": "GAVINCHEN", "name": "Gavin Chen", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "leonlin:z57": {"username": "LEONLIN", "name": "Leon Lin", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "royshen:": {"username": "ROYSHEN", "name": "沈皓宇", "classCode": "", "classes": [], "bg": "native"},
  "shermanshen:z21": {"username": "SHERMANSHEN", "name": "沈皓辰", "classCode": "Z21", "classes": ["Z21"], "bg": "native"},
  "irisli:z44": {"username": "IRISLI", "name": "Iris Li", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "allenchen:z44": {"username": "ALLENCHEN", "name": "Allen Chen", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "georgetang:z17": {"username": "GEORGETANG", "name": "George Tang", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "jonathany:z16": {"username": "JONATHANY", "name": "Jonathan Yuan", "classCode": "Z16", "classes": ["Z16"], "bg": "native"},
  "austinyuan:z16": {"username": "AUSTINYUAN", "name": "Austin Yuan", "classCode": "Z16", "classes": ["Z16"], "bg": "native"},
  "gracechen:z13": {"username": "GRACECHEN", "name": "Grace Chen", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "elliepeng:z9": {"username": "ELLIEPENG", "name": "Ellie Peng", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "ethanhu1:z13": {"username": "ETHANHU1", "name": "Ethan Hu1", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "belindaxiao:z3": {"username": "BELINDAXIAO", "name": "Belinda", "classCode": "Z3", "classes": ["Z3"], "bg": "native"},
  "maximezheng:z15": {"username": "MAXIMEZHENG", "name": "Maxime Zheng", "classCode": "Z15", "classes": ["Z15", "H42"], "bg": "native"},
  "larryweng:z34": {"username": "LARRYWENG", "name": "Larry Weng", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "ariawang:": {"username": "ARIAWANG", "name": "Aria Wang", "classCode": "", "classes": [], "bg": "native"},
  "miazhang:h42": {"username": "MIAZHANG", "name": "Mia Zhang", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "aidenyang:z31": {"username": "AIDENYANG", "name": "Aiden", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "vistazhang:": {"username": "VISTAZHANG", "name": "Vista Zhang", "classCode": "", "classes": [], "bg": "native"},
  "jinchengliu:z39": {"username": "JINCHENGLIU", "name": "Jincheng Liu", "classCode": "Z39", "classes": ["Z39"], "bg": "native"},
  "lucasfu:": {"username": "LUCASFU", "name": "Lucas Fu", "classCode": "", "classes": [], "bg": "native"},
  "jocelyneday:": {"username": "JOCELYNEDAY", "name": "Jocelyne Day", "classCode": "", "classes": [], "bg": "native"},
  "jessicage:": {"username": "JESSICAGE", "name": "Jessica Ge", "classCode": "", "classes": [], "bg": "native"},
  "oliviaxu:z13": {"username": "OLIVIAXU", "name": "Olivia Xu", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "oriama:z8": {"username": "ORIAMA", "name": "Oria Ma", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "fergusjiang:z8": {"username": "FERGUSJIANG", "name": "Fergus Jiang", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "ethanzhou:": {"username": "ETHANZHOU", "name": "Ethan Zhou", "classCode": "", "classes": [], "bg": "native"},
  "shudazhou:z29": {"username": "SHUDAZHOU", "name": "Aaron Zhou ( 周书达）", "classCode": "Z29", "classes": ["Z29"], "bg": "native"},
  "brucezhu:": {"username": "BRUCEZHU", "name": "Bruce Zhu", "classCode": "", "classes": [], "bg": "native"},
  "amyzhuang:": {"username": "AMYZHUANG", "name": "Amy Zhuang", "classCode": "", "classes": [], "bg": "native"},
  "allanduan:": {"username": "ALLANDUAN", "name": "Allan Duan", "classCode": "", "classes": [], "bg": "native"},
  "zhiyanyu:": {"username": "ZHIYANYU", "name": "Zhiyan Yu", "classCode": "", "classes": [], "bg": "native"},
  "henrywang:": {"username": "HENRYWANG", "name": "Henry Wang", "classCode": "", "classes": [], "bg": "native"},
  "yifanli:": {"username": "YIFANLI", "name": "Yifan Li", "classCode": "", "classes": [], "bg": "native"},
  "emeryliu:z35": {"username": "EMERYLIU", "name": "Emery Liu", "classCode": "Z35", "classes": ["Z35"], "bg": "native"},
  "adelynnzhong:": {"username": "ADELYNNZHONG", "name": "Adelynn Zhong", "classCode": "", "classes": [], "bg": "native"},
  "aprilwu:": {"username": "APRILWU", "name": "April Wu", "classCode": "", "classes": [], "bg": "native"},
  "stellazhang:h23": {"username": "STELLAZHANG", "name": "Stella Zhang", "classCode": "H23", "classes": ["H23"], "bg": "native"},
  "reykang:": {"username": "REYKANG", "name": "Rey Kang", "classCode": "", "classes": [], "bg": "native"},
  "hannahli:z33": {"username": "HANNAHLI", "name": "Hannah Li", "classCode": "Z33", "classes": ["Z33"], "bg": "native"},
  "eleven:": {"username": "ELEVEN", "name": "Eleven", "classCode": "", "classes": [], "bg": "native"},
  "kailin:z60": {"username": "KAILIN", "name": "KaiLin", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "noradu:h42": {"username": "NORADU", "name": "NoraDu", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "haleywu:": {"username": "HALEYWU", "name": "HaleyWu", "classCode": "", "classes": [], "bg": "native"},
  "aidenzhu:h42": {"username": "AIDENZHU", "name": "AidenZhu", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "isaacvan:": {"username": "ISAACVAN", "name": "Isaacvan", "classCode": "", "classes": [], "bg": "native"},
  "michelle:h42": {"username": "MICHELLE", "name": "Michelle", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "ziyouqu:": {"username": "ZIYOUQU", "name": "ZiyouQu", "classCode": "", "classes": [], "bg": "native"},
  "miachen:": {"username": "MIACHEN", "name": "MiaChen", "classCode": "", "classes": [], "bg": "native"},
  "leokele:h42": {"username": "LEOKELE", "name": "LeoKele", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "karasloan:y5": {"username": "KARASLOAN", "name": "KaraSloan", "classCode": "Y5", "classes": ["Y5"], "bg": "native"},
  "amytan:h44": {"username": "AMYTAN", "name": "AmyTan", "classCode": "H44", "classes": ["H44"], "bg": "native"},
  "konrad:n19": {"username": "KONRAD", "name": "Konrad", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "lewislin:z60": {"username": "LEWISLIN", "name": "LewisLin", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "lucasjiang:z15": {"username": "LUCASJIANG", "name": "LucasJiang", "classCode": "Z15", "classes": ["Z15", "H26"], "bg": "native"},
  "shutongli:": {"username": "SHUTONGLI", "name": "ShutongLi", "classCode": "", "classes": [], "bg": "native"},
  "alinalui:z47": {"username": "ALINALUI", "name": "AlinaLui", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "diudiuzhang:z36": {"username": "DIUDIUZHANG", "name": "DiudiuZhang", "classCode": "Z36", "classes": ["Z36"], "bg": "native"},
  "ethanhu123:z47": {"username": "ETHANHU123", "name": "Ethan胡逸尘", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "masonhu123:z47": {"username": "MASONHU123", "name": "Mason胡美生", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "riccayin123:z8": {"username": "RICCAYIN123", "name": "RiccaYin123", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "eddieli:z91": {"username": "EDDIELI", "name": "Eddie李", "classCode": "Z91", "classes": ["Z91", "Z90"], "bg": "native"},
  "zhimuchen:z15": {"username": "ZHIMUCHEN", "name": "ZhimuChen", "classCode": "Z15", "classes": ["Z15"], "bg": "native"},
  "yianwang:": {"username": "YIANWANG", "name": "YianWang", "classCode": "", "classes": [], "bg": "native"},
  "yizewang:": {"username": "YIZEWANG", "name": "YizeWang", "classCode": "", "classes": [], "bg": "native"},
  "andreayang:h42": {"username": "ANDREAYANG", "name": "AndreaYang", "classCode": "H42", "classes": ["H42"], "bg": "native"},
  "obiwang:": {"username": "OBIWANG", "name": "王诺一", "classCode": "", "classes": [], "bg": "native"},
  "yunyangzheng:": {"username": "YUNYANGZHENG", "name": "YunyangZheng", "classCode": "", "classes": [], "bg": "native"},
  "evelynxu:": {"username": "EVELYNXU", "name": "EvelynXu", "classCode": "", "classes": [], "bg": "native"},
  "catherineli:z90": {"username": "CATHERINELI", "name": "CatherineLi", "classCode": "Z90", "classes": ["Z90"], "bg": "native"},
  "briansia:": {"username": "BRIANSIA", "name": "BrianSia", "classCode": "", "classes": [], "bg": "native"},
  "tracywang:z90": {"username": "TRACYWANG", "name": "TracyWang", "classCode": "Z90", "classes": ["Z90"], "bg": "native"},
  "aaron0331:": {"username": "AARON0331", "name": "Aaron0331", "classCode": "", "classes": [], "bg": "native"},
  "yummi0906:": {"username": "YUMMI0906", "name": "Yummi0906", "classCode": "", "classes": [], "bg": "native"},
  "yianlin:z92": {"username": "YIANLIN", "name": "YianLin", "classCode": "Z92", "classes": ["Z92", "Z46"], "bg": "native"},
  "danayan:": {"username": "DANAYAN", "name": "DanaYan", "classCode": "", "classes": [], "bg": "native"},
  "aurorahuang:": {"username": "AURORAHUANG", "name": "AuroraHuang", "classCode": "", "classes": [], "bg": "native"},
  "lelezhang:z50": {"username": "LELEZHANG", "name": "乐乐", "classCode": "Z50", "classes": ["Z50"], "bg": "native"},
  "hanshen:z54": {"username": "HANSHEN", "name": "HanShen", "classCode": "Z54", "classes": ["Z54"], "bg": "native"},
  "sophief:z60": {"username": "SOPHIEF", "name": "SophieF", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "parkercowley:": {"username": "PARKERCOWLEY", "name": "ParkerCowley", "classCode": "", "classes": [], "bg": "native"},
  "huntercowley:": {"username": "HUNTERCOWLEY", "name": "HunterCowley", "classCode": "", "classes": [], "bg": "native"},
  "derekzhao:": {"username": "DEREKZHAO", "name": "DerekZhao", "classCode": "", "classes": [], "bg": "native"},
  "nolanyan:": {"username": "NOLANYAN", "name": "NolanYan", "classCode": "", "classes": [], "bg": "native"},
  "govindaraju:": {"username": "GOVINDARAJU", "name": "Govindaraju", "classCode": "", "classes": [], "bg": "native"},
  "kaiismail:z34": {"username": "KAIISMAIL", "name": "KaiIsmail", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "jamesgao:z31": {"username": "JAMESGAO", "name": "JamesGao", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "henryhu:": {"username": "HENRYHU", "name": "HenryHu", "classCode": "", "classes": [], "bg": "native"},
  "ivyxia:z34": {"username": "IVYXIA", "name": "IvyXia", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "michaelchen:": {"username": "MICHAELCHEN", "name": "Michael Chen", "classCode": "", "classes": [], "bg": "native"},
  "siyuchen:z36": {"username": "SIYUCHEN", "name": "SiyuChen", "classCode": "Z36", "classes": ["Z36"], "bg": "native"},
  "edisonyue:z36": {"username": "EDISONYUE", "name": "EdisonYue", "classCode": "Z36", "classes": ["Z36"], "bg": "native"},
  "sheilali:z8": {"username": "SHEILALI", "name": "SheilaLi", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "graceli:": {"username": "GRACELI", "name": "Grace Li", "classCode": "", "classes": [], "bg": "native"},
  "nataliexu:z67": {"username": "NATALIEXU", "name": "NatalieXu", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "owencowley:": {"username": "OWENCOWLEY", "name": "OwenCowley", "classCode": "", "classes": [], "bg": "native"},
  "louielei:z91": {"username": "LOUIELEI", "name": "LouieLei", "classCode": "Z91", "classes": ["Z91"], "bg": "native"},
  "serenatian:": {"username": "SERENATIAN", "name": "Ser", "classCode": "", "classes": [], "bg": "native"},
  "aaronchang:z92": {"username": "AARONCHANG", "name": "AaronChang", "classCode": "Z92", "classes": ["Z92"], "bg": "native"},
  "xinyanzhang:z92": {"username": "XINYANZHANG", "name": "XinyanZhang", "classCode": "Z92", "classes": ["Z92"], "bg": "native"},
  "dylanxiong:z2": {"username": "DYLANXIONG", "name": "DylanXiong", "classCode": "Z2", "classes": ["Z2", "Z80"], "bg": "native"},
  "youchenwu:z90": {"username": "YOUCHENWU", "name": "YouchenWu", "classCode": "Z90", "classes": ["Z90"], "bg": "native"},
  "catherinema:z90": {"username": "CATHERINEMA", "name": "CatherineMa", "classCode": "Z90", "classes": ["Z90"], "bg": "native"},
  "ryantong:z80": {"username": "RYANTONG", "name": "Ryan", "classCode": "Z80", "classes": ["Z80"], "bg": "native"},
  "ariaqiao:": {"username": "ARIAQIAO", "name": "AriaQiao", "classCode": "", "classes": [], "bg": "native"},
  "conorqiao:": {"username": "CONORQIAO", "name": "ConorQiao", "classCode": "", "classes": [], "bg": "native"},
  "rosamund:z67": {"username": "ROSAMUND", "name": "Rosamund", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "winnie:": {"username": "WINNIE", "name": "Alyssa", "classCode": "", "classes": [], "bg": "native"},
  "cayden:z47": {"username": "CAYDEN", "name": "文凯腾 （Cayden)", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "leona123:y5": {"username": "LEONA123", "name": "Leona123", "classCode": "Y5", "classes": ["Y5"], "bg": "native"},
  "jamesli:z34": {"username": "JAMESLI", "name": "JamesLi", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "yinanliu:": {"username": "YINANLIU", "name": "Lucas刘一楠", "classCode": "", "classes": [], "bg": "native"},
  "annayou:z32": {"username": "ANNAYOU", "name": "AnnaYou", "classCode": "Z32", "classes": ["Z32"], "bg": "native"},
  "alexzhao:": {"username": "ALEXZHAO", "name": "AlexZhao", "classCode": "", "classes": [], "bg": "native"},
  "elliepan:z80": {"username": "ELLIEPAN", "name": "ElliePan", "classCode": "Z80", "classes": ["Z80"], "bg": "native"},
  "annakuo:": {"username": "ANNAKUO", "name": "Annakuo", "classCode": "", "classes": [], "bg": "native"},
  "claireliu:h35": {"username": "CLAIRELIU", "name": "刘璐一Claire", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "enowang:z27": {"username": "ENOWANG", "name": "EnoWang", "classCode": "Z27", "classes": ["Z27", "H26"], "bg": "native"},
  "adayang:": {"username": "ADAYANG", "name": "AdaYang", "classCode": "", "classes": [], "bg": "native"},
  "ryanhuryry:z43": {"username": "RYANHURYRY", "name": "RyanHuryry", "classCode": "Z43", "classes": ["Z43"], "bg": "native"},
  "leonnali:": {"username": "LEONNALI", "name": "LeonnaLi", "classCode": "", "classes": [], "bg": "native"},
  "emilyyang:z67": {"username": "EMILYYANG", "name": "EmilyYang", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "danielyin:": {"username": "DANIELYIN", "name": "DanielYin", "classCode": "", "classes": [], "bg": "native"},
  "elliexie:": {"username": "ELLIEXIE", "name": "EllieXie", "classCode": "", "classes": [], "bg": "native"},
  "alicia:z57": {"username": "ALICIA", "name": "Alicia", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "ariagao:h33": {"username": "ARIAGAO", "name": "AriaGao", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "austinqin:z47": {"username": "AUSTINQIN", "name": "Austin Qin", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "jaydenqin:z40": {"username": "JAYDENQIN", "name": "秦睿骐", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "neromiu:n19": {"username": "NEROMIU", "name": "NeroMiu", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "oliviazhang:z12": {"username": "OLIVIAZHANG", "name": "OliviaZhang", "classCode": "Z12", "classes": ["Z12"], "bg": "native"},
  "areswang:z50": {"username": "ARESWANG", "name": "Areswang", "classCode": "Z50", "classes": ["Z50"], "bg": "native"},
  "leannexu:": {"username": "LEANNEXU", "name": "LeanneXu", "classCode": "", "classes": [], "bg": "native"},
  "ashleywang:": {"username": "ASHLEYWANG", "name": "AshleyWang", "classCode": "", "classes": [], "bg": "native"},
  "louisayu:z48": {"username": "LOUISAYU", "name": "LouisaYu", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "madisonzhang:z45": {"username": "MADISONZHANG", "name": "MadisonZhang", "classCode": "Z45", "classes": ["Z45"], "bg": "native"},
  "ariali:z19": {"username": "ARIALI", "name": "AriaLi", "classCode": "Z19", "classes": ["Z19", "Z31"], "bg": "native"},
  "evelynxie:z65": {"username": "EVELYNXIE", "name": "EvelynXie", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "davidzhu:z67": {"username": "DAVIDZHU", "name": "DavidZhu🐦🐧", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "cameronchan:n13": {"username": "CAMERONCHAN", "name": "CameronChan", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "aliyahtong:z92": {"username": "ALIYAHTONG", "name": "书灵", "classCode": "Z92", "classes": ["Z92"], "bg": "native"},
  "royqiu:z47": {"username": "ROYQIU", "name": "RoyQiu", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "owensong:": {"username": "OWENSONG", "name": "OwenSong", "classCode": "", "classes": [], "bg": "native"},
  "lucaslin:z15": {"username": "LUCASLIN", "name": "LucasLin", "classCode": "Z15", "classes": ["Z15"], "bg": "native"},
  "evanzhu:": {"username": "EVANZHU", "name": "EvanZhu", "classCode": "", "classes": [], "bg": "native"},
  "ruizewang:h26": {"username": "RUIZEWANG", "name": "RuizeWang", "classCode": "H26", "classes": ["H26"], "bg": "native"},
  "alisaliu1:": {"username": "ALISALIU1", "name": "Alisa刘仕纯", "classCode": "", "classes": [], "bg": "native"},
  "ethanyu:z13": {"username": "ETHANYU", "name": "EthanYu", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "darcyguo:z57": {"username": "DARCYGUO", "name": "DarcyGuo", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "larsenlai:": {"username": "LARSENLAI", "name": "LarsenLai", "classCode": "", "classes": [], "bg": "native"},
  "catherinegu:z31": {"username": "CATHERINEGU", "name": "CatherineGu", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "brystonhan:z95": {"username": "BRYSTONHAN", "name": "BrystonHan", "classCode": "Z95", "classes": ["Z95"], "bg": "native"},
  "irisabbasi:": {"username": "IRISABBASI", "name": "IrisAbbasi", "classCode": "", "classes": [], "bg": "native"},
  "mikkike:": {"username": "MIKKIKE", "name": "MikkiKe", "classCode": "", "classes": [], "bg": "native"},
  "jensenlai:": {"username": "JENSENLAI", "name": "JensenLai", "classCode": "", "classes": [], "bg": "native"},
  "burrows:n13": {"username": "BURROWS", "name": "Burrows", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "kevincui:": {"username": "KEVINCUI", "name": "KevinCui", "classCode": "", "classes": [], "bg": "native"},
  "kayleylai:z13": {"username": "KAYLEYLAI", "name": "KayleyLai", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "mikomao:z8": {"username": "MIKOMAO", "name": "MikoMao", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "sophiawang:": {"username": "SOPHIAWANG", "name": "SophiaWang", "classCode": "", "classes": [], "bg": "native"},
  "olivialu:": {"username": "OLIVIALU", "name": "OliviaLu", "classCode": "", "classes": [], "bg": "native"},
  "fleurzhu:z57": {"username": "FLEURZHU", "name": "FleurZhu", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "vincentyue:z49": {"username": "VINCENTYUE", "name": "VincentYue", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "carolzhang:": {"username": "CAROLZHANG", "name": "CarolZhang", "classCode": "", "classes": [], "bg": "native"},
  "evieren:": {"username": "EVIEREN", "name": "EvieRen", "classCode": "", "classes": [], "bg": "native"},
  "junjunalan:": {"username": "JUNJUNALAN", "name": "JunjunAlan", "classCode": "", "classes": [], "bg": "native"},
  "silviama:z40": {"username": "SILVIAMA", "name": "Silvia Ma", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "lynnzhang:": {"username": "LYNNZHANG", "name": "LynnZhang", "classCode": "", "classes": [], "bg": "native"},
  "aidenye:": {"username": "AIDENYE", "name": "AidenYe", "classCode": "", "classes": [], "bg": "native"},
  "emmage:z3": {"username": "EMMAGE", "name": "EmmaGe葛清扬", "classCode": "Z3", "classes": ["Z3"], "bg": "native"},
  "yuanzhili:": {"username": "YUANZHILI", "name": "YuanzhiLi", "classCode": "", "classes": [], "bg": "native"},
  "mochenliu:": {"username": "MOCHENLIU", "name": "MochenLiu", "classCode": "", "classes": [], "bg": "native"},
  "ninaniuniu:z15": {"username": "NINANIUNIU", "name": "NinaNiuniu", "classCode": "Z15", "classes": ["Z15"], "bg": "native"},
  "robinzhao:z34": {"username": "ROBINZHAO", "name": "RobinZhao", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "kevinqiu:": {"username": "KEVINQIU", "name": "Kevin Chiu", "classCode": "", "classes": [], "bg": "native"},
  "haoxuanren:": {"username": "HAOXUANREN", "name": "HaoxuanRen", "classCode": "", "classes": [], "bg": "native"},
  "matthewgao:": {"username": "MATTHEWGAO", "name": "高紫宸", "classCode": "", "classes": [], "bg": "native"},
  "elainehan:z67": {"username": "ELAINEHAN", "name": "ElaineHan", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "andysang:": {"username": "ANDYSANG", "name": "Andy Sang", "classCode": "", "classes": [], "bg": "native"},
  "sophiehu:z31": {"username": "SOPHIEHU", "name": "SophieHu", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "oscarwang:z89": {"username": "OSCARWANG", "name": "OscarWang", "classCode": "Z89", "classes": ["Z89"], "bg": "native"},
  "leonzhang:z24": {"username": "LEONZHANG", "name": "LeonZhang", "classCode": "Z24", "classes": ["Z24"], "bg": "native"},
  "emmagao:": {"username": "EMMAGAO", "name": "高紫莹", "classCode": "", "classes": [], "bg": "native"},
  "xinyuechen:z57": {"username": "XINYUECHEN", "name": "XinyueChen", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "mindyzhang:z15": {"username": "MINDYZHANG", "name": "MindyZhang", "classCode": "Z15", "classes": ["Z15", "H26"], "bg": "native"},
  "leotian:h33": {"username": "LEOTIAN", "name": "LeoTian", "classCode": "H33", "classes": ["H33"], "bg": "native"},
  "jonathansun:": {"username": "JONATHANSUN", "name": "JonathanSun", "classCode": "", "classes": [], "bg": "native"},
  "remingtonk:z67": {"username": "REMINGTONK", "name": "Potato🥔🥔", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "jeremyhou:z19": {"username": "JEREMYHOU", "name": "Fire", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "danielhuang:z19": {"username": "DANIELHUANG", "name": "Void Wolf", "classCode": "Z19", "classes": ["Z19"], "bg": "native"},
  "ethanw:z23": {"username": "ETHANW", "name": "EthanW", "classCode": "Z23", "classes": ["Z23"], "bg": "native"},
  "airenzhang:z13": {"username": "AIRENZHANG", "name": "AirenZhang", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "albertfeng:": {"username": "ALBERTFENG", "name": "AlbertFeng", "classCode": "", "classes": [], "bg": "native"},
  "amycai123:z40": {"username": "AMYCAI123", "name": "蔡伊萱", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "sophia123:": {"username": "SOPHIA123", "name": "Sophia123", "classCode": "", "classes": [], "bg": "native"},
  "laurenneal:y5": {"username": "LAURENNEAL", "name": "LaurenNeal", "classCode": "Y5", "classes": ["Y5"], "bg": "native"},
  "tianjiliu:z47": {"username": "TIANJILIU", "name": "TianjiLiu", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "ethansun:z9": {"username": "ETHANSUN", "name": "Ethan Sun", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "ellieanan:z16": {"username": "ELLIEANAN", "name": "EllieAnan", "classCode": "Z16", "classes": ["Z16"], "bg": "native"},
  "averychen:z8": {"username": "AVERYCHEN", "name": "AveryChen", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "estherqiu:z44": {"username": "ESTHERQIU", "name": "EstherQiu", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "jameszheng:": {"username": "JAMESZHENG", "name": "JamesZheng", "classCode": "", "classes": [], "bg": "native"},
  "kaidichen:z27": {"username": "KAIDICHEN", "name": "KaidiChen", "classCode": "Z27", "classes": ["Z27"], "bg": "native"},
  "jeffreyge:z31": {"username": "JEFFREYGE", "name": "JeffreyGe", "classCode": "Z31", "classes": ["Z31"], "bg": "native"},
  "nolanren:h33": {"username": "NOLANREN", "name": "NolanRen", "classCode": "H33", "classes": ["H33", "H26"], "bg": "native"},
  "derekw:z92": {"username": "DEREKW", "name": "DerekW", "classCode": "Z92", "classes": ["Z92"], "bg": "native"},
  "lucasduoduo:z19": {"username": "LUCASDUODUO", "name": "LucasDuoduo", "classCode": "Z19", "classes": ["Z19", "H35"], "bg": "native"},
  "noellelin:z37": {"username": "NOELLELIN", "name": "NoelleLin", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "nickyang:z23": {"username": "NICKYANG", "name": "NickYang", "classCode": "Z23", "classes": ["Z23"], "bg": "native"},
  "tonybeibei:z46": {"username": "TONYBEIBEI", "name": "TonyBeibei", "classCode": "Z46", "classes": ["Z46"], "bg": "native"},
  "lucasquinn:n3": {"username": "LUCASQUINN", "name": "LucasQuinn", "classCode": "N3", "classes": ["N3"], "bg": "native"},
  "alisonguoguo:z60": {"username": "ALISONGUOGUO", "name": "Alison", "classCode": "Z60", "classes": ["Z60"], "bg": "native"},
  "leomomo:z48": {"username": "LEOMOMO", "name": "LeoMomo", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "alexman:z34": {"username": "ALEXMAN", "name": "Alex Man", "classCode": "Z34", "classes": ["Z34"], "bg": "native"},
  "jaydenhe:z20": {"username": "JAYDENHE", "name": "JaydenHe", "classCode": "Z20", "classes": ["Z20", "H33", "H26"], "bg": "native"},
  "emilyw:z44": {"username": "EMILYW", "name": "EmilyW", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "lucygu:z48": {"username": "LUCYGU", "name": "LucyGu", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "yicao123:z48": {"username": "YICAO123", "name": "YiCao123", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "oscarqian:z44": {"username": "OSCARQIAN", "name": "OscarQian", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "ellali:z47": {"username": "ELLALI", "name": "Ella Li", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "jameslu:": {"username": "JAMESLU", "name": "JamesLu", "classCode": "", "classes": [], "bg": "native"},
  "juliazhu:z45": {"username": "JULIAZHU", "name": "JuliaZhu", "classCode": "Z45", "classes": ["Z45"], "bg": "native"},
  "aarondang:z47": {"username": "AARONDANG", "name": "党一轩", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "miranda:": {"username": "MIRANDA", "name": "Miranda", "classCode": "", "classes": [], "bg": "native"},
  "alisaliu:": {"username": "ALISALIU", "name": "Miles刘仕熙", "classCode": "", "classes": [], "bg": "native"},
  "annikali:": {"username": "ANNIKALI", "name": "AnnikaLi", "classCode": "", "classes": [], "bg": "native"},
  "jeffyang:h35": {"username": "JEFFYANG", "name": "JeffYang", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "ellagu:z19": {"username": "ELLAGU", "name": "EllaGu", "classCode": "Z19", "classes": ["Z19", "H35"], "bg": "native"},
  "annaguo:h35": {"username": "ANNAGUO", "name": "AnnaGuo", "classCode": "H35", "classes": ["H35"], "bg": "native"},
  "emeryli:z19": {"username": "EMERYLI", "name": "EmeryLi", "classCode": "Z19", "classes": ["Z19", "H35"], "bg": "native"},
  "jasperzhong:": {"username": "JASPERZHONG", "name": "JasperZhong", "classCode": "", "classes": [], "bg": "native"},
  "elsawang:z19": {"username": "ELSAWANG", "name": "ElsaWang", "classCode": "Z19", "classes": ["Z19", "H35"], "bg": "native"},
  "isabellaz:": {"username": "ISABELLAZ", "name": "IsabellaZ", "classCode": "", "classes": [], "bg": "native"},
  "elsajingchen:": {"username": "ELSAJINGCHEN", "name": "Elsa Margerum", "classCode": "", "classes": [], "bg": "native"},
  "graceji:z9": {"username": "GRACEJI", "name": "GraceJi", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "toriren:z23": {"username": "TORIREN", "name": "ToriRen", "classCode": "Z23", "classes": ["Z23"], "bg": "native"},
  "kyraren:": {"username": "KYRAREN", "name": "KyraRen", "classCode": "", "classes": [], "bg": "native"},
  "lingyao:z43": {"username": "LINGYAO", "name": "姚灵儿", "classCode": "Z43", "classes": ["Z43"], "bg": "native"},
  "averydong:": {"username": "AVERYDONG", "name": "AveryDong", "classCode": "", "classes": [], "bg": "native"},
  "arieldong:": {"username": "ARIELDONG", "name": "ArielDong", "classCode": "", "classes": [], "bg": "native"},
  "emmyqian:z24": {"username": "EMMYQIAN", "name": "EmmyQian", "classCode": "Z24", "classes": ["Z24"], "bg": "native"},
  "adayu123:z54": {"username": "ADAYU123", "name": "AdaYu123", "classCode": "Z54", "classes": ["Z54"], "bg": "native"},
  "zangeliu:z48": {"username": "ZANGELIU", "name": "ZangeLiu", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "yuqiying:": {"username": "YUQIYING", "name": "YuqiYing", "classCode": "", "classes": [], "bg": "native"},
  "emilywei:z48": {"username": "EMILYWEI", "name": "EmilyWei", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "hannie:z49": {"username": "HANNIE", "name": "Hannie", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "maxcheng:": {"username": "MAXCHENG", "name": "MaxCheng", "classCode": "", "classes": [], "bg": "native"},
  "lyannayin:z13": {"username": "LYANNAYIN", "name": "LyannaYin", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "sylvia:z8": {"username": "SYLVIA", "name": "Sylvia", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "cadeonlo:z21": {"username": "CADEONLO", "name": "CadeonLo", "classCode": "Z21", "classes": ["Z21"], "bg": "native"},
  "yululi:z40": {"username": "YULULI", "name": "YuluLi", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "kirkkeke:": {"username": "KIRKKEKE", "name": "Lucas Jin", "classCode": "", "classes": [], "bg": "native"},
  "georgeni:z44": {"username": "GEORGENI", "name": "GeorgeNi", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "yichenjia:": {"username": "YICHENJIA", "name": "YichenJia", "classCode": "", "classes": [], "bg": "native"},
  "haydenhuo:z10": {"username": "HAYDENHUO", "name": "HaydenHuo", "classCode": "Z10", "classes": ["Z10"], "bg": "native"},
  "ziwenzhao:": {"username": "ZIWENZHAO", "name": "ZiwenZhao", "classCode": "", "classes": [], "bg": "native"},
  "julianaguan:z43": {"username": "JULIANAGUAN", "name": "JulianaGuan", "classCode": "Z43", "classes": ["Z43"], "bg": "native"},
  "anyazhang:z17": {"username": "ANYAZHANG", "name": "AnyaZhang", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "aimeeli:": {"username": "AIMEELI", "name": "AimeeLi", "classCode": "", "classes": [], "bg": "native"},
  "ivytaotao:z48": {"username": "IVYTAOTAO", "name": "IvyTaotao", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "hudsonmah:n13": {"username": "HUDSONMAH", "name": "HudsonMah", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "jonathanc:": {"username": "JONATHANC", "name": "JonathanC", "classCode": "", "classes": [], "bg": "native"},
  "oliverzhao:z17": {"username": "OLIVERZHAO", "name": "OliverZhao", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "shayne:z44": {"username": "SHAYNE", "name": "Shayne", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "zixuanzhuang:z29": {"username": "ZIXUANZHUANG", "name": "ZixuanZhuang", "classCode": "Z29", "classes": ["Z29"], "bg": "native"},
  "levinzhang:z17": {"username": "LEVINZHANG", "name": "LevinZhang", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "jennyka:z29": {"username": "JENNYKA", "name": "JennyKa", "classCode": "Z29", "classes": ["Z29"], "bg": "native"},
  "victoriawly:z44": {"username": "VICTORIAWLY", "name": "VictoriaWLY", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "oliviagufan:z43": {"username": "OLIVIAGUFAN", "name": "OliviaGufan", "classCode": "Z43", "classes": ["Z43"], "bg": "native"},
  "timmylai:": {"username": "TIMMYLAI", "name": "TimmyLai", "classCode": "", "classes": [], "bg": "native"},
  "keiraly:": {"username": "KEIRALY", "name": "KeiraLy", "classCode": "", "classes": [], "bg": "native"},
  "rainazhang:z9": {"username": "RAINAZHANG", "name": "RainaZhang", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "audreywang:z9": {"username": "AUDREYWANG", "name": "AudreyWang", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "leilachen:z9": {"username": "LEILACHEN", "name": "LeilaChen", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "lunayueya:z9": {"username": "LUNAYUEYA", "name": "LunaYueya", "classCode": "Z9", "classes": ["Z9"], "bg": "native"},
  "serenaguo:z88": {"username": "SERENAGUO", "name": "SerenaGuo", "classCode": "Z88", "classes": ["Z88"], "bg": "native"},
  "lunasong:z8": {"username": "LUNASONG", "name": "LunaSong", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "dylanhu:z13": {"username": "DYLANHU", "name": "DylanHu", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "chloeke:z13": {"username": "CHLOEKE", "name": "ChloeKe", "classCode": "Z13", "classes": ["Z13"], "bg": "native"},
  "moyiyu:z8": {"username": "MOYIYU", "name": "MoyiYu", "classCode": "Z8", "classes": ["Z8"], "bg": "native"},
  "aidacao:": {"username": "AIDACAO", "name": "AidaCao", "classCode": "", "classes": [], "bg": "native"},
  "yichenzhang:": {"username": "YICHENZHANG", "name": "YichenZhang", "classCode": "", "classes": [], "bg": "native"},
  "danielyuan:z37": {"username": "DANIELYUAN", "name": "DanielYuan", "classCode": "Z37", "classes": ["Z37"], "bg": "native"},
  "enyasang:": {"username": "ENYASANG", "name": "Enyasang", "classCode": "", "classes": [], "bg": "native"},
  "muyichen:": {"username": "MUYICHEN", "name": "MuyiChen", "classCode": "", "classes": [], "bg": "native"},
  "gracefu:z6": {"username": "GRACEFU", "name": "GraceFu", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "ashleysavoy:": {"username": "ASHLEYSAVOY", "name": "AshleySavoy", "classCode": "", "classes": [], "bg": "native"},
  "theajohn:": {"username": "THEAJOHN", "name": "TheaJohn", "classCode": "", "classes": [], "bg": "native"},
  "ethanz123:z57": {"username": "ETHANZ123", "name": "EthanZ123", "classCode": "Z57", "classes": ["Z57"], "bg": "native"},
  "charlottec:z67": {"username": "CHARLOTTEC", "name": "CharlotteC", "classCode": "Z67", "classes": ["Z67"], "bg": "native"},
  "lukeshi:": {"username": "LUKESHI", "name": "小冬瓜", "classCode": "", "classes": [], "bg": "native"},
  "yitonggao:z48": {"username": "YITONGGAO", "name": "YitongGao", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "leungliam:n13": {"username": "LEUNGLIAM", "name": "KooreaderngLiam", "classCode": "N13", "classes": ["N13"], "bg": "native"},
  "jeremyzhang:z17": {"username": "JEREMYZHANG", "name": "张胜涵", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "jimmy123:z44": {"username": "JIMMY123", "name": "赵熠鸣", "classCode": "Z44", "classes": ["Z44"], "bg": "native"},
  "easonchen:z47": {"username": "EASONCHEN", "name": "陈奕绅", "classCode": "Z47", "classes": ["Z47"], "bg": "native"},
  "lilyyang:": {"username": "LILYYANG", "name": "Lily 杨语菡", "classCode": "", "classes": [], "bg": "native"},
  "ella123:z50": {"username": "ELLA123", "name": "黄筱雅", "classCode": "Z50", "classes": ["Z50"], "bg": "native"},
  "mason123:z17": {"username": "MASON123", "name": "胡昊", "classCode": "Z17", "classes": ["Z17"], "bg": "native"},
  "emma125:z46": {"username": "EMMA125", "name": "朵朵", "classCode": "Z46", "classes": ["Z46"], "bg": "native"},
  "gingershen:z40": {"username": "GINGERSHEN", "name": "沈妍-小七", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "kathrynxiao:z16": {"username": "KATHRYNXIAO", "name": "๑潼潼๑", "classCode": "Z16", "classes": ["Z16"], "bg": "native"},
  "aimeewang:z6": {"username": "AIMEEWANG", "name": "AimeeWang", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "kaylee1:z6": {"username": "KAYLEE1", "name": "Kaylee Y-袁紫依", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "jeremy1:z12": {"username": "JEREMY1", "name": "袁子晅", "classCode": "Z12", "classes": ["Z12"], "bg": "native"},
  "clarali:z48": {"username": "CLARALI", "name": "李嘉懿", "classCode": "Z48", "classes": ["Z48"], "bg": "native"},
  "edmonds:": {"username": "EDMONDS", "name": "Edmond Shang", "classCode": "", "classes": [], "bg": "native"},
  "linyizhang:": {"username": "LINYIZHANG", "name": "张霖伊", "classCode": "", "classes": [], "bg": "native"},
  "aaronzhou:z54": {"username": "AARONZHOU", "name": "Aaron Zhou", "classCode": "Z54", "classes": ["Z54"], "bg": "native"},
  "sophiachen:z6": {"username": "SOPHIACHEN", "name": "陈祉霏", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "leyichen:z12": {"username": "LEYICHEN", "name": "陈乐仪", "classCode": "Z12", "classes": ["Z12"], "bg": "native"},
  "kaiserchen:z5": {"username": "KAISERCHEN", "name": "陈凯新", "classCode": "Z5", "classes": ["Z5"], "bg": "native"},
  "isabella:z3": {"username": "ISABELLA", "name": "贝拉", "classCode": "Z3", "classes": ["Z3"], "bg": "native"},
  "aidenyue:z54": {"username": "AIDENYUE", "name": "岳小飞", "classCode": "Z54", "classes": ["Z54"], "bg": "native"},
  "odin12:n19": {"username": "ODIN12", "name": "缪思平", "classCode": "N19", "classes": ["N19"], "bg": "native"},
  "roydenlo:z6": {"username": "ROYDENLO", "name": "罗健桓", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "alexteng:": {"username": "ALEXTENG", "name": "滕一 Alex", "classCode": "", "classes": [], "bg": "native"},
  "audreyshih:z65": {"username": "AUDREYSHIH", "name": "石若祺", "classCode": "Z65", "classes": ["Z65", "H33"], "bg": "native"},
  "oliviawy:z62": {"username": "OLIVIAWY", "name": "婉莹", "classCode": "Z62", "classes": ["Z62", "Z9"], "bg": "native"},
  "clarazhang:": {"username": "CLARAZHANG", "name": "章可澜", "classCode": "", "classes": [], "bg": "native"},
  "leogu123:z65": {"username": "LEOGU123", "name": "顾羲远", "classCode": "Z65", "classes": ["Z65"], "bg": "native"},
  "alyssama:": {"username": "ALYSSAMA", "name": "马奕萌", "classCode": "", "classes": [], "bg": "native"},
  "aiden123:z17": {"username": "AIDEN123", "name": "武经纶", "classCode": "Z17", "classes": ["Z17", "Z8"], "bg": "native"},
  "effiehu:z40": {"username": "EFFIEHU", "name": "胡逸菲", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "evelyn:z49": {"username": "EVELYN", "name": "沈艺慈", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "sophiejiang:z40": {"username": "SOPHIEJIANG", "name": "SophieJiang", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "sophiezhang:": {"username": "SOPHIEZHANG", "name": "Sophie", "classCode": "", "classes": [], "bg": "native"},
  "chloezhang:": {"username": "CHLOEZHANG", "name": "ChloeZhang", "classCode": "", "classes": [], "bg": "native"},
  "sophieliu:z62": {"username": "SOPHIELIU", "name": "SophieLiu", "classCode": "Z62", "classes": ["Z62"], "bg": "native"},
  "evanguan:z2": {"username": "EVANGUAN", "name": "Evan官新海", "classCode": "Z2", "classes": ["Z2", "Z3"], "bg": "native"},
  "easonhu:z6": {"username": "EASONHU", "name": "Eason", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "kellyzhang:z6": {"username": "KELLYZHANG", "name": "可可 Kelly", "classCode": "Z6", "classes": ["Z6"], "bg": "native"},
  "romeocook:": {"username": "ROMEOCOOK", "name": "Romeoc", "classCode": "", "classes": [], "bg": "native"},
  "elishen:z49": {"username": "ELISHEN", "name": "EliShen", "classCode": "Z49", "classes": ["Z49"], "bg": "native"},
  "ethanwang:z40": {"username": "ETHANWANG", "name": "Totally not Ethan", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "zimogeng:z3": {"username": "ZIMOGENG", "name": "Zimogeng", "classCode": "Z3", "classes": ["Z3"], "bg": "native"},
  "jerrysun:z40": {"username": "JERRYSUN", "name": "JerrySun", "classCode": "Z40", "classes": ["Z40"], "bg": "native"},
  "liliwei:": {"username": "LILIWEI", "name": "魏莉莉", "classCode": "", "classes": [], "bg": "native"},
  "allen123:z3": {"username": "ALLEN123", "name": "Allen123", "classCode": "Z3", "classes": ["Z3"], "bg": "native"},
  "andrewshih:z54": {"username": "ANDREWSHIH", "name": "石浩祺", "classCode": "Z54", "classes": ["Z54"], "bg": "native"},
  "ciciguo:z12": {"username": "CICIGUO", "name": "CiciGuo", "classCode": "Z12", "classes": ["Z12"], "bg": "native"},
  "studentkoo3:": {"username": "STUDENTKOO3", "name": "示例学生", "classCode": "", "classes": [], "bg": "native"}
  };
  const existing = loadUsers();
  let added = 0;
  for(const [key, data] of Object.entries(SEED)){
    if(!existing[key]){
      existing[key] = data;
      added++;
    } else {
      // Update classes if existing account has no classes set
      if(!existing[key].classes || !existing[key].classes.length){
        existing[key].classes = data.classes;
        existing[key].classCode = data.classCode;
        added++;
      }
    }
  }
  if(added > 0) localStorage.setItem('czmd_users', JSON.stringify(existing));
}


// ════════════════════════════════════════
// 最近登录账号 · RECENT ACCOUNTS
// ════════════════════════════════════════
const RECENT_KEY = 'czmd_recent_accounts';
const MAX_RECENT = 5;

// ── 老师/admin 免密有效期（仅「云端验密成功」才开启；本设备、30 天内、未登出才生效）──
// key: czmd_pwdfree_until_teacher_<name> / czmd_pwdfree_until_admin_admin，值为到期时间戳(ms)
const PWDFREE_MS = 30 * 24 * 60 * 60 * 1000;   // 30 天
function pwdFreeKey(role, name){ return 'czmd_pwdfree_until_' + role + '_' + name; }
function setPwdFree(role, name){ try{ localStorage.setItem(pwdFreeKey(role, name), String(Date.now() + PWDFREE_MS)); }catch(e){} }
function isPwdFree(role, name){ const v = parseInt(localStorage.getItem(pwdFreeKey(role, name)) || '0', 10); return v > Date.now(); }
function clearPwdFree(role, name){ try{ localStorage.removeItem(pwdFreeKey(role, name)); }catch(e){} }

function getRecentAccounts(){
  try{ return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]'); }catch(e){ return []; }
}

function addRecentAccount(user){
  const list = getRecentAccounts().filter(a => a.username !== (user.username||user.name));
  list.unshift({
    username: user.username || user.name,
    name: user.name || user.username,
    classCode: user.classCode || '',
    bg: user.bg || null,
    avatar: (user.username||user.name||'?')[0].toUpperCase()
  });
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function removeRecentAccount(username, classCode){
  const list = getRecentAccounts().filter(function(a){
    return !(a.username === username && (a.classCode||'') === (classCode||''));
  });
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  renderRecentAccounts();
  // If no more recent accounts, show the login form again
  if(!list.length){
    var form = document.getElementById('auth-login-form');
    if(form) form.style.display = 'block';
  }
}

function quickLogin(username, classCode){
  // Handle special roles
  if(classCode === '__admin__'){
    // 免密：云端验过密码 + 30 天内未过期 + 未主动登出 → 直接进，不要求输密码
    const savedA = safeParseJSON(localStorage.getItem('czmd_admin'), null);
    if(savedA && isPwdFree('admin', 'admin')){
      currentAdmin = savedA;
      setCloudSessionStatus(true);
      showScreen('admin');
      renderAdminDashboard();
      if(typeof loadSharedCloudCaches === 'function') loadSharedCloudCaches().then(function(){ if(document.getElementById('screen-admin') && document.getElementById('screen-admin').classList.contains('active')) renderAdminDashboard(); });
      return;
    }
    switchAuthTab('admin');
    document.getElementById('admin-username').value = 'admin';
    document.getElementById('admin-username').focus();
    return;
  }
  if(classCode === '__teacher__'){
    // 免密：云端验过密码 + 30 天内未过期 + 未主动登出 + 持久会话就是这个老师 → 直接进
    const savedT = safeParseJSON(localStorage.getItem('czmd_teacher'), null);
    if(savedT && savedT.name === username && isPwdFree('teacher', username)){
      currentTeacher = savedT;
      teacherSelectedClass = (savedT.classes && savedT.classes[0]) || '';
      setCloudSessionStatus(true);
      showScreen('teacher');
      renderTeacherDashboard();
      if(typeof loadSharedCloudCaches === 'function') loadSharedCloudCaches().then(function(){ if(document.getElementById('screen-teacher') && document.getElementById('screen-teacher').classList.contains('active')) renderTeacherDashboard(); });
      return;
    }
    switchAuthTab('teacher');
    document.getElementById('teacher-name').value = username;
    document.getElementById('teacher-pwd').value = '';
    document.getElementById('teacher-pwd').focus();
    return;
  }
  // Student login
  const users = loadUsers();
  const key = userKey(username, classCode);
  const user = users[key] || Object.values(users).find(u => (u.username||u.name||'').toUpperCase() === username.toUpperCase() && (u.classCode||'').toUpperCase() === classCode.toUpperCase());
  if(user){
    loginUser(user);
  } else {
    switchAuthTab('login');
    document.getElementById('login-name').value = username;
    document.getElementById('login-err').textContent = '请重新验证 · Please verify again';
  }
}

function renderRecentAccounts(){
  const list = getRecentAccounts();
  const container = document.getElementById('recent-accounts');
  if(!container) return;
  if(!list.length){ container.style.display='none'; return; }
  container.style.display = 'block';

  const itemsHTML = list.map(function(a){
    const isTeacher = a.classCode === '__teacher__';
    const isAdmin   = a.classCode === '__admin__';
    const initials  = isAdmin ? '⚙️' : isTeacher ? '👩‍🏫' : (a.name||a.username||'?').slice(0,2).toUpperCase();
    const displayName = isAdmin ? '管理员' : isTeacher ? a.username : (a.name && a.name !== a.username ? a.name + ' (' + a.username + ')' : a.username);
    const subText = isAdmin ? 'Admin · 管理员账号' : isTeacher ? '教师账号' : '班级 ' + (a.classCode||'—');
    const bgColor = isAdmin ? '#c0392b' : isTeacher ? '#1e4d8c' : 'var(--ink)';
    return [
      '<div class="recent-acct-row" data-u="' + a.username + '" data-c="' + (a.classCode||'') + '">',
      '<div class="recent-acct-avatar" style="background:' + bgColor + ';font-size:' + (isTeacher||isAdmin?'20px':'14px') + ';">' + initials + '</div>',
      '<div class="recent-acct-info">',
      '<div class="recent-acct-name">' + displayName + '</div>',
      '<div class="recent-acct-cls">' + subText + '</div>',
      '</div>',
      '<button class="recent-acct-del" data-u="' + a.username + '" data-c="' + (a.classCode||'') + '">×</button>',
      '</div>'
    ].join('');
  }).join('');

  container.innerHTML =
    '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">最近登录 · Recent Accounts</div>'
    + '<div id="recent-acct-list">' + itemsHTML + '</div>'
    + '<div style="text-align:center;margin-top:12px;">'
    + '<button id="btn-other-account" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:DM Sans,sans-serif;text-decoration:underline;">+ 使用其他账号登录</button>'
    + '</div>';

  // Attach click events
  container.querySelectorAll('.recent-acct-row').forEach(function(row){
    row.addEventListener('click', function(){ quickLogin(row.dataset.u, row.dataset.c); });
    row.addEventListener('mouseover', function(){ row.style.borderColor='var(--gold)'; row.style.background='var(--gold-light)'; });
    row.addEventListener('mouseout',  function(){ row.style.borderColor='var(--border)'; row.style.background='var(--paper2)'; });
  });
  container.querySelectorAll('.recent-acct-del').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      removeRecentAccount(btn.dataset.u, btn.dataset.c);
    });
  });
  var otherBtn = document.getElementById('btn-other-account');
  if(otherBtn) otherBtn.addEventListener('click', function(){
    container.style.display = 'none';
    var form = document.getElementById('auth-login-form');
    if(form) form.style.display = 'block';
  });
}


// Seed class metadata: teacher names from roster
(function seedClassTeachers(){
  function seedMeta(cls, teacher){
    var key = 'czmd_cls_meta_' + cls;
    try {
      var existing = JSON.parse(localStorage.getItem(key) || '{}');
      // Only set teacher if not already set
      if(true){  // Always update teacher from roster
        existing.teacher = teacher;
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch(e){}
  }
  seedMeta("Z34", "黄老师");
  seedMeta("Z18", "黄老师");
  seedMeta("Z8", "黄老师");
  seedMeta("Z9", "黄老师");
  seedMeta("Z13", "黄老师");
  seedMeta("Z52", "黄老师");
  seedMeta("Z67", "黄老师");
  seedMeta("Z57", "黄老师");
  seedMeta("Z47", "黄老师");
  seedMeta("Z44", "黄老师");
  seedMeta("Z48", "黄老师");
  seedMeta("Z17", "黄老师");
  seedMeta("Z49", "黄老师");
  seedMeta("Z3", "黄老师");
  seedMeta("Z40", "黄老师");
  seedMeta("Z41", "黄老师");
  seedMeta("Z12", "黄老师");
  seedMeta("N24", "白老师");
  seedMeta("Z87", "白老师");
  seedMeta("Z85", "白老师");
  seedMeta("Z84", "白老师");
  seedMeta("N3", "白老师");
  seedMeta("N32", "白老师");
  seedMeta("Z15", "白老师");
  seedMeta("H24", "白老师");
  seedMeta("Z93", "白老师");
  seedMeta("Z92", "白老师");
  seedMeta("Z90", "白老师");
  seedMeta("Z19", "杨艳芝老师");
  seedMeta("Z31", "杨艳芝老师");
  seedMeta("Z61", "杨艳芝老师");
  seedMeta("Z37", "宫老师");
  seedMeta("H30", "宫老师");
  seedMeta("H35", "宫老师");
  seedMeta("Z38", "宫老师");
  seedMeta("Z43", "宫老师");
  seedMeta("Z29", "宫老师");
  seedMeta("N21", "赵Melody老师");
  seedMeta("Y4", "赵Melody老师");
  seedMeta("Z80", "赵Melody老师");
  seedMeta("H33", "赵Melody老师");
  seedMeta("H36", "赵Melody老师");
  seedMeta("Y2", "赵Melody老师");
  seedMeta("H20", "赵Melody老师");
  seedMeta("N18", "赵Melody老师");
  seedMeta("Y10", "赵Melody老师");
  seedMeta("Z36", "赵Melody老师");
  seedMeta("Z55", "赵Melody老师");
  seedMeta("Z32", "赵雪倩老师");
  seedMeta("Z62", "赵雪倩老师");
  seedMeta("Z10", "赵雪倩老师");
  seedMeta("Z65", "赵雪倩老师");
  seedMeta("Z89", "魏老师");
  seedMeta("Z51", "魏老师");
  seedMeta("Z96", "魏老师");
  seedMeta("H56", "魏老师");
  seedMeta("N19", "魏老师");
  seedMeta("Y8", "魏老师");
  seedMeta("H50", "魏老师");
  seedMeta("Z91", "魏老师");
  seedMeta("N13", "陈老师");
  seedMeta("N5", "孙老师");
  seedMeta("Z39", "杨旭佳老师");
  seedMeta("Z95", "杨旭佳老师");
  seedMeta("Z94", "杨旭佳老师");
  seedMeta("Z54", "杨旭佳老师");
  seedMeta("H22", "蒋老师");
  seedMeta("N15", "蒋老师");
  seedMeta("Y9", "蒋老师");
  seedMeta("H49", "蒋老师");
  seedMeta("H48", "蒋老师");
  seedMeta("H46", "蒋老师");
  seedMeta("Y7", "蒋老师");
  seedMeta("N10", "蒋老师");
  seedMeta("N8", "蒋老师");
  seedMeta("Z58", "蒋老师");
  seedMeta("Z50", "蒋老师");
  seedMeta("H26", "蒋老师");
  seedMeta("Z88", "马老师");
  seedMeta("Z82", "马老师");
  seedMeta("H21", "马老师");
  seedMeta("Z20", "马老师");
  seedMeta("Z4", "马老师");
  seedMeta("Z11", "马老师");
  seedMeta("Z60", "马老师");
  seedMeta("H42", "马老师");
  seedMeta("Z53", "马老师");
  seedMeta("Z69", "马老师");
  seedMeta("Z6", "王老师");
  seedMeta("Z72", "王老师");
  seedMeta("Z35", "庞老师");
  seedMeta("Z63", "庞老师");
  seedMeta("Z66", "庞老师");
  seedMeta("H39", "张皓老师");
  seedMeta("Z33", "张皓老师");
  seedMeta("Z27", "张皓老师");
  seedMeta("Z64", "张皓老师");
  seedMeta("Z46", "张皓老师");
  seedMeta("Z14", "张皓老师");
  seedMeta("Z16", "张皓老师");
  seedMeta("Z21", "张皓老师");
  seedMeta("Z23", "张皓老师");
  seedMeta("Z5", "张皓老师");
  seedMeta("Z2", "张颖涛老师");
  seedMeta("Z24", "张颖涛老师");
  seedMeta("Z75", "张颖涛老师");
  seedMeta("Z30", "张颖涛老师");
  seedMeta("Z25", "张颖涛老师");
  seedMeta("Z26", "张颖涛老师");
})();

// ════════════════════════════════════════
// 数据导出/导入 · DATA BACKUP & RESTORE
// ════════════════════════════════════════

// Keys to export (everything important)
const BACKUP_KEYS = [
  'czmd_users',
  'czmd_homework',
  'czmd_custom_classes',
  'czmd_redeem_requests',
  'czmd_custom_rewards',
  'czmd_teacher_accounts',
  'czmd_recent_accounts',
];

function adminExportData() {
  const backup = {
    version: 2,
    exported: new Date().toISOString(),
    school: 'BSA Chinese School',
    data: {}
  };

  // Export fixed keys
  BACKUP_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if(val) backup.data[key] = val;
  });

  // Export all czmd_pts_* (student points)
  // Export all czmd_cls_meta_* (class metadata)
  // Export all czmd_wrong_chars_* (wrong char banks)
  // Export all czmd_hw_completion_* (homework completions)
  for(let i = 0; i < localStorage.length; i++){
    const key = localStorage.key(i);
    if(key && (
      key.startsWith('czmd_pts_') ||
      key.startsWith('czmd_cls_meta_') ||
      key.startsWith('czmd_wrong_chars_') ||
      key.startsWith('czmd_hw_completion_') ||
      key.startsWith('czmd_needs_review_') ||
      key.startsWith('czmd_all_reviewed_')
    )){
      backup.data[key] = localStorage.getItem(key);
    }
  }

  const totalKeys = Object.keys(backup.data).length;
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toLocaleDateString('zh-CN').replace(/\//g,'-');
  a.download = '聪明豆数据备份_' + date + '.json';
  a.click();
  URL.revokeObjectURL(url);

  // Show success toast
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--green);color:white;padding:12px 24px;border-radius:30px;font-size:14px;font-weight:600;font-family:DM Sans,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;';
  toast.textContent = '✅ 已导出 ' + totalKeys + ' 条数据记录';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ═══════════════════════════════════════════════
// ☁️ 学生上云 (Day 2 Phase 1)
// ═══════════════════════════════════════════════
const CLOUD_INITIAL_PASSWORD = 'YUCAICHINESE';

async function adminCloudMigrate() {
  if(!window.firebaseReady || !window.cloudAuth){
    alert('❌ Firebase 还没加载好，稍等几秒再试');
    return;
  }

  // 关闭其他可能开着的模态
  document.body.style.overflow = 'hidden';

  // 创建迁移面板
  const ov = document.createElement('div');
  ov.id = 'cloud-migrate-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:white;border-radius:20px;max-width:600px;width:100%;max-height:88vh;overflow-y:auto;padding:28px;box-shadow:0 8px 40px rgba(0,0,0,0.25);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
        <div>
          <div style="font-size:11px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">☁️ DAY 2 · CLOUD MIGRATION</div>
          <div style="font-size:20px;font-weight:700;color:var(--ink);margin-top:4px;">学生账号上传到云端</div>
        </div>
        <button onclick="closeCloudMigrate()" style="background:none;border:none;font-size:24px;color:var(--muted);cursor:pointer;padding:0;line-height:1;">×</button>
      </div>

      <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 14px;margin-bottom:16px;border-radius:8px;font-size:13px;color:#78350f;">
        ⚠️ <b>测试期说明</b>：现在先迁移 5-10 个学生测试。所有上云学生初始密码 = <b>YUCAICHINESE</b>。验证 OK 后再点"全部上云"。
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">📊 当前本地数据</div>
        <div id="cm-local-stats" style="font-size:13px;color:var(--muted);background:var(--paper2);padding:12px;border-radius:10px;">加载中...</div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">选择迁移方式</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button onclick="cmMigrateTest5()" style="padding:14px;border-radius:12px;border:2px solid var(--blue);background:white;color:var(--blue);font-weight:600;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">
            🧪 迁移前 5 个学生（测试）
            <div style="font-size:11px;color:var(--muted);margin-top:4px;font-weight:400;">推荐先做这个，验证流程</div>
          </button>
          <button onclick="cmMigrateOne()" style="padding:14px;border-radius:12px;border:2px solid var(--gold);background:white;color:#92400e;font-weight:600;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">
            👤 只迁移 1 个指定学生
            <div style="font-size:11px;color:var(--muted);margin-top:4px;font-weight:400;">输入用户名，把一个学生上云</div>
          </button>
          <button onclick="cmMigrateAll()" style="padding:14px;border-radius:12px;border:2px solid var(--red);background:white;color:var(--red);font-weight:600;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">
            🚀 全部学生上云（677+）
            <div style="font-size:11px;color:var(--muted);margin-top:4px;font-weight:400;">⚠️ 测试 OK 后才点这个，需 5-10 分钟</div>
          </button>
        </div>
      </div>

      <!-- 老师 + admin 上云 -->
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">👩‍🏫 老师 & ⚙️ Admin 上云</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button onclick="cmMigrateAdmin()" style="padding:12px;border-radius:12px;border:2px solid #16a34a;background:white;color:#15803d;font-weight:600;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">
            ⚙️ Admin 账号上云
            <div style="font-size:11px;color:var(--muted);margin-top:4px;font-weight:400;">把 admin/YUCAICHINESE 注册到云端</div>
          </button>
          <button onclick="cmMigrateTeachers()" style="padding:12px;border-radius:12px;border:2px solid #7c3aed;background:white;color:#6d28d9;font-weight:600;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">
            👩‍🏫 所有老师上云
            <div style="font-size:11px;color:var(--muted);margin-top:4px;font-weight:400;">把所有老师账号上云，初始密码 YUCAICHINESE</div>
          </button>
        </div>
      </div>

      <div id="cm-progress" style="display:none;margin-top:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;">📈 迁移进度</div>
        <div style="background:var(--paper2);border-radius:10px;padding:12px;font-size:12px;line-height:1.7;max-height:200px;overflow-y:auto;font-family:monospace;" id="cm-log"></div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  // 加载本地统计
  setTimeout(() => {
    const users = loadUsers();
    const total = Object.keys(users).length;
    const byCls = {};
    Object.values(users).forEach(u => {
      const c = u.classCode || 'Other';
      byCls[c] = (byCls[c] || 0) + 1;
    });
    const topClasses = Object.entries(byCls).sort((a,b)=>b[1]-a[1]).slice(0, 8);
    document.getElementById('cm-local-stats').innerHTML = `
      共 <b>${total}</b> 个学生账号 · 分布在 <b>${Object.keys(byCls).length}</b> 个班级<br>
      <span style="font-size:11px;">主要班级：${topClasses.map(([c,n])=>`${c}(${n})`).join(' · ')}</span>
    `;
  }, 100);
}

function closeCloudMigrate() {
  const ov = document.getElementById('cloud-migrate-overlay');
  if(ov) ov.remove();
  document.body.style.overflow = '';
}

function cmLog(msg, type='info'){
  const log = document.getElementById('cm-log');
  if(!log) return;
  const time = new Date().toLocaleTimeString();
  const colors = { info: '#1e4d8c', ok: '#16a34a', err: '#dc2626', warn: '#b45309' };
  log.innerHTML += `<div style="color:${colors[type]||'#444'};">[${time}] ${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

async function cmMigrateOne() {
  const username = prompt('请输入要迁移的学生用户名（如 SHIHAOQI）：\nEnter username to migrate:');
  if(!username) return;
  const u = username.trim().toUpperCase();
  const users = loadUsers();
  const student = Object.values(users).find(usr =>
    (usr.username || usr.name || '').toUpperCase() === u
  );
  if(!student){
    alert('❌ 本地没找到这个学生：' + u);
    return;
  }
  document.getElementById('cm-progress').style.display = 'block';
  document.getElementById('cm-log').innerHTML = '';
  cmLog(`开始迁移 ${u}...`);
  const r = await migrateOneStudent(student);
  if(r.ok){
    cmLog(`✓ ${u} 上云成功`, 'ok');
    cmLog(`  云端 UID: ${r.uid}`, 'info');
    cmLog(`  密码: ${CLOUD_INITIAL_PASSWORD}`, 'info');
  } else {
    cmLog(`✗ ${u} 失败: ${r.error}`, 'err');
  }
}

async function cmMigrateTest5(){
  const users = loadUsers();
  const studentList = Object.values(users).slice(0, 5);
  if(!studentList.length){
    alert('❌ 没有学生可迁移');
    return;
  }
  document.getElementById('cm-progress').style.display = 'block';
  document.getElementById('cm-log').innerHTML = '';
  cmLog(`开始迁移前 ${studentList.length} 个学生（密码: ${CLOUD_INITIAL_PASSWORD}）`);
  let ok = 0, fail = 0;
  for(const s of studentList){
    const r = await migrateOneStudent(s);
    if(r.ok){
      ok++;
      cmLog(`  ✓ ${s.username || s.name} (${s.classCode})`, 'ok');
    } else {
      fail++;
      const reason = r.error === 'auth/email-already-in-use' ? '已存在（跳过）' : r.error;
      cmLog(`  ✗ ${s.username || s.name}: ${reason}`, r.error === 'auth/email-already-in-use' ? 'warn' : 'err');
    }
  }
  cmLog(`完成！成功 ${ok} · 失败 ${fail}`, ok > 0 ? 'ok' : 'err');
  cmLog(`💡 现在你可以用上面任一学生 + 密码 YUCAICHINESE 登录测试`, 'info');
}

async function cmMigrateAll(){
  if(!confirm('⚠️ 全部学生上云？\n\n带限速保护：每个学生间隔 1.5 秒，每 50 个暂停 30 秒。\n674 个学生预计 20-25 分钟。\n\n继续吗？')) return;
  const users = loadUsers();
  const studentList = Object.values(users);
  document.getElementById('cm-progress').style.display = 'block';
  document.getElementById('cm-log').innerHTML = '';
  cmLog(`开始全员迁移 (${studentList.length} 个学生)...`);
  cmLog(`限速：1.5 秒/学生，每 50 个暂停 30 秒`, 'info');

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const STUDENT_DELAY_MS = 1500;
  const BATCH_SIZE = 50;
  const BATCH_PAUSE_MS = 30000;

  let ok = 0, fail = 0, skip = 0;
  let rateLimitHits = 0;
  const failedStudents = []; // 记录失败的学生用于自动重试

  for(let i = 0; i < studentList.length; i++){
    const s = studentList[i];
    const r = await migrateOneStudent(s);
    if(r.ok){
      ok++;
    } else if(r.error === 'auth/email-already-in-use'){
      skip++;
    } else if(r.error === 'auth/too-many-requests'){
      // 撞限速 → 长暂停 + 重试一次
      rateLimitHits++;
      cmLog(`  ⏸️ 撞限速 (${s.username || s.name})，暂停 90 秒后重试...`, 'err');
      await sleep(90000); // 1.5 分钟
      const r2 = await migrateOneStudent(s);
      if(r2.ok){
        ok++;
        cmLog(`  ✓ 重试成功 (${s.username || s.name})`, 'ok');
      } else if(r2.error === 'auth/email-already-in-use'){
        skip++;
      } else {
        fail++;
        failedStudents.push(s.username || s.name);
        cmLog(`  ✗ ${s.username || s.name}: ${r2.error} (重试后仍失败)`, 'err');
      }
    } else {
      fail++;
      failedStudents.push(s.username || s.name);
      cmLog(`  ✗ ${s.username || s.name}: ${r.error}`, 'err');
    }

    if((i+1) % 20 === 0){
      cmLog(`  进度: ${i+1}/${studentList.length} (新增 ${ok} · 跳过 ${skip} · 失败 ${fail})`, 'info');
    }

    // 限速：每个学生间隔 1.5 秒
    if(i < studentList.length - 1){
      await sleep(STUDENT_DELAY_MS);
    }

    // 每 50 个批次暂停 30 秒
    if((i+1) % BATCH_SIZE === 0 && i < studentList.length - 1){
      cmLog(`  💤 已完成 ${i+1} 个，暂停 30 秒缓解 Firebase 限速...`, 'info');
      await sleep(BATCH_PAUSE_MS);
      cmLog(`  ▶️ 继续...`, 'info');
    }
  }
  cmLog(`✅ 全部完成！新增 ${ok} · 跳过 ${skip} · 失败 ${fail}`, 'ok');
  if(rateLimitHits > 0){
    cmLog(`⚠️ 撞限速 ${rateLimitHits} 次（已自动重试）`, 'info');
  }
  if(failedStudents.length > 0){
    cmLog(`⚠️ 失败列表（共 ${failedStudents.length} 个）：${failedStudents.slice(0,20).join(', ')}${failedStudents.length>20?'...':''}`, 'err');
    cmLog(`💡 等 1 小时后再点一次"全部学生上云"，已成功的会被跳过，只重试失败的。`, 'info');
  }
}

async function migrateOneStudent(student){
  if(!window.cloudAuth) return { ok: false, error: 'no-cloud' };
  const username = (student.username || student.name || '').toUpperCase().trim().replace(/\s+/g,'');
  if(!username) return { ok: false, error: 'no-username' };
  const classCode = (student.classCode || '').toUpperCase().trim() || (student.classes && student.classes[0]) || '';

  const result = await window.cloudAuth.registerStudent(
    username,
    CLOUD_INITIAL_PASSWORD,
    classCode,
    {
      name: student.name || username,
      chname: student.chname || student.nickname || '',
      classes: student.classes || (classCode ? [classCode] : []),
      bg: student.bg || null,
      _migratedFrom: 'localStorage',
      _migratedAt: new Date().toISOString()
    }
  );
  return result;
}

// ─── 迁移 admin ───
async function cmMigrateAdmin(){
  if(!window.cloudAuth){
    alert('❌ Firebase 没加载');
    return;
  }
  document.getElementById('cm-progress').style.display = 'block';
  document.getElementById('cm-log').innerHTML = '';
  cmLog('开始迁移 admin...');
  const result = await window.cloudAuth.registerAdmin(
    ADMIN_CREDENTIALS.username,
    CLOUD_INITIAL_PASSWORD,
    { _migratedFrom: 'localStorage', _migratedAt: new Date().toISOString() }
  );
  if(result.ok){
    cmLog(`✓ admin 上云成功`, 'ok');
    cmLog(`  用户名：admin`, 'info');
    cmLog(`  密码：${CLOUD_INITIAL_PASSWORD}`, 'info');
    cmLog(`💡 现在退出 admin，用 admin/${CLOUD_INITIAL_PASSWORD} 在任何设备登录`, 'info');
  } else if(result.error === 'auth/email-already-in-use'){
    cmLog(`⚠️ admin 已经上云（之前注册过）`, 'warn');
    cmLog(`  用现有密码登录即可`, 'info');
  } else {
    cmLog(`✗ 失败：${result.error}`, 'err');
  }
}

// ─── 迁移所有老师 ───
async function cmMigrateTeachers(){
  if(!window.cloudAuth){
    alert('❌ Firebase 没加载');
    return;
  }
  if(typeof TEACHER_ACCOUNTS === 'undefined'){
    alert('❌ 找不到老师账号配置');
    return;
  }
  document.getElementById('cm-progress').style.display = 'block';
  document.getElementById('cm-log').innerHTML = '';
  const teachers = Object.entries(TEACHER_ACCOUNTS);
  cmLog(`开始迁移 ${teachers.length} 个老师（密码: ${CLOUD_INITIAL_PASSWORD}）`);
  let ok = 0, fail = 0, skip = 0;
  for(const [teacherName, acct] of teachers){
    const result = await window.cloudAuth.registerTeacher(
      teacherName,
      CLOUD_INITIAL_PASSWORD,
      acct.classes || [],
      {
        _originalPassword: acct.password,
        _migratedFrom: 'localStorage',
        _migratedAt: new Date().toISOString()
      }
    );
    if(result.ok){
      ok++;
      cmLog(`  ✓ ${teacherName} (${(acct.classes||[]).length} 个班)`, 'ok');
    } else if(result.error === 'auth/email-already-in-use'){
      skip++;
      cmLog(`  ⚠️ ${teacherName}（已存在，跳过）`, 'warn');
    } else {
      fail++;
      cmLog(`  ✗ ${teacherName}：${result.error}`, 'err');
    }
  }
  cmLog(`完成！成功 ${ok} · 已存在 ${skip} · 失败 ${fail}`, ok > 0 ? 'ok' : 'warn');
  cmLog(`💡 现在退出，用任一老师名 + ${CLOUD_INITIAL_PASSWORD} 在任何设备登录`, 'info');
}

function adminImportData(input) {
  const file = input.files[0];
  if(!file) return;
  input.value = ''; // reset so same file can be re-imported

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if(!backup.data || typeof backup.data !== 'object'){
        alert('❌ 文件格式不正确 · Invalid backup file');
        return;
      }

      const count = Object.keys(backup.data).length;
      const exportDate = backup.exported ? new Date(backup.exported).toLocaleDateString('zh-CN') : '未知';

      if(!confirm(
        '确定导入此备份？\n\n'
        + '备份日期：' + exportDate + '\n'
        + '数据条数：' + count + ' 条\n\n'
        + '⚠️ 导入会覆盖当前所有数据，此操作不可撤销！\n'
        + 'Import will overwrite all current data. Cannot be undone!'
      )) return;

      // Write all backup data to localStorage
      let imported = 0;
      Object.entries(backup.data).forEach(([key, val]) => {
        try {
          localStorage.setItem(key, val);
          imported++;
        } catch(err) {
          console.warn('Failed to import key:', key, err);
        }
      });

      alert('✅ 成功导入 ' + imported + ' 条数据！\n请刷新页面使数据生效。\nImport complete! Please refresh the page.');
      location.reload();

    } catch(err) {
      alert('❌ 导入失败：' + err.message + '\nImport failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}


// ════════════════════════════════════════
// 课文作业模板管理
// ════════════════════════════════════════

function renderCheckinEditor(){ renderCheckinLessonList(); }

// Currently open lesson in checkin editor
let checkinEditLesson = null;
let checkinEditTab = 1;

const CHECKIN_TAB_NAMES = ['','一','二','三','四'];
const CHECKIN_MODES = [
  {key:'flashcard',   icon:'🃏', label:'看词说拼音'},
  {key:'multiple',    icon:'🎯', label:'选择拼音'},
  {key:'type',        icon:'✍️', label:'拼音拼写'},
  {key:'listen',      icon:'🔊', label:'听音选字'},
  {key:'listenrecord',icon:'🎙️', label:'听读练习'},
  {key:'reading',     icon:'📖', label:'朗读练习'},
  {key:'writing',     icon:'✏️', label:'写字练习'},
];

function renderCheckinLessonList(){
  const el = document.getElementById('checkin-lesson-list');
  if(!el) return;

  // If a lesson is open for editing, show the editor instead of the list
  if(checkinEditLesson){
    renderCheckinEditor_lesson(el);
    return;
  }

  const q = (document.getElementById('checkin-lesson-search')?.value||'').toLowerCase();
  const allLessons = [...NATIVE_LESSONS, ...getCustomLessons()];

  // Always show add button
  el.innerHTML = '';
  const addBtn = document.createElement('button');
  addBtn.className = 'hw-assign-btn';
  addBtn.style.cssText = 'margin-bottom:14px;background:var(--green);color:white;border-color:var(--green);display:block;';
  addBtn.textContent = '➕ 添加自制课文';
  addBtn.onclick = openAddCustomLessonModal;
  el.appendChild(addBtn);

  const listDiv = document.createElement('div');
  el.appendChild(listDiv);

  // Require at least 1 char to search (avoid loading all lessons)
  if(!q){
    // Show custom lessons only when no search, + prompt to search
    const customLessons = getCustomLessons();
    if(customLessons.length === 0){
      listDiv.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">输入课文编号搜索（如 Z1.2）<br>或点上方按钮添加自制课文</div>';
    } else {
      // Show custom lessons
      renderLessonCards(listDiv, customLessons);
    }
    return;
  }

  const lessons = allLessons.filter(l => {
    const code = (l.code || getLessonCode(l.id)||l.id).toLowerCase();
    return code.includes(q) || l.title.includes(q) || (l.subtitle||'').includes(q);
  });

  if(!lessons.length){
    listDiv.innerHTML = '<div class="empty-review">没有找到「'+q+'」相关课文</div>';
    return;
  }

  renderLessonCards(listDiv, lessons);
}

function renderLessonCards(listDiv, lessons){
  listDiv.innerHTML = lessons.map(l => {
    const configured = [1,2,3,4].filter(n => {
      try{ const d=JSON.parse(localStorage.getItem('czmd_lesson_tab_'+l.id+'_'+n)||'null'); return d&&d.items&&d.items.length; }catch(e){return false;}
    });
    const code = l.code || getLessonCode(l.id)||l.id;
    const dots = [1,2,3,4].map(n =>
      '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+(configured.includes(n)?'var(--green)':'#ddd')+';margin:0 2px;" title="第'+'一二三四'[n-1]+'份'+(configured.includes(n)?'已配置':'未配置')+'"></span>'
    ).join('');
    const customBadge = l.isCustom ? '<span style="font-size:10px;background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:8px;font-weight:600;margin-left:6px;">自制</span>' : '';
    const deleteBtn = l.isCustom ? '<button data-del-lid="'+l.id+'" style="padding:5px 8px;border-radius:8px;border:1px solid var(--red);background:var(--red-light);color:var(--red);font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;flex-shrink:0;" onclick="event.stopPropagation()">删除</button>' : '';
    return '<div data-select-lid="'+l.id+'" style="background:white;border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.05);">'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:14px;font-weight:600;color:var(--ink);">'+code+customBadge+' · '+l.title+'</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">'+(l.subtitle||'')+' · '+l.words.length+'个生字</div>'
      + '<div style="margin-top:6px;display:flex;align-items:center;gap:4px;">'
      + '<span style="font-size:11px;color:var(--muted);">作业配置：</span>'+dots
      + '<span style="font-size:11px;color:var(--muted);">'+configured.length+'/4份</span>'
      + '</div></div>'
      + deleteBtn
      + '<span style="font-size:20px;color:var(--muted);">›</span>'
      + '</div>';
  }).join('');

  // Delete buttons
  listDiv.querySelectorAll('[data-del-lid]').forEach(btn => {
    btn.onclick = function(e){ e.stopPropagation(); deleteCustomLesson(this.dataset.delLid); };
  });

  listDiv.querySelectorAll('[data-select-lid]').forEach(row => {
    row.onclick = function(){
      const lid = this.dataset.selectLid;
      const lesson = [...NATIVE_LESSONS, ...getCustomLessons()].find(l=>l.id===lid);
      if(!lesson) return;
      checkinEditLesson = lesson;
      checkinEditTab = 1;
      document.getElementById('checkin-lesson-list')?.scrollIntoView({behavior:'smooth', block:'start'});
      renderCheckinLessonList();
    };
  });
}

function renderCheckinEditor_lesson(el){
  const lesson = checkinEditLesson;
  const code = getLessonCode(lesson.id)||lesson.id;
  const TAB_NAMES = ['','一','二','三','四'];

  // Tab buttons
  const tabBtns = [1,2,3,4].map(n => {
    const active = n === checkinEditTab;
    let hasContent=false;
    try{const d=JSON.parse(localStorage.getItem('czmd_lesson_tab_'+lesson.id+'_'+n)||'null');hasContent=!!(d&&d.items&&d.items.length);}catch(e){}
    const dot = hasContent ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:'+(active?'white':'var(--green)')+';margin-left:5px;vertical-align:middle;"></span>' : '';
    return '<button data-ci-tab="'+n+'" style="flex:1;padding:9px 4px;border-radius:10px;border:2px solid '+(active?'var(--blue)':'var(--border)')+';background:'+(active?'var(--blue)':'white')+';color:'+(active?'white':'var(--muted)')+';font-size:14px;font-weight:600;font-family:DM Sans,sans-serif;cursor:pointer;">'+TAB_NAMES[n]+dot+'</button>';
  }).join('');

  // Current tab content
  const key = 'czmd_lesson_tab_'+lesson.id+'_'+checkinEditTab;
  let tabData; try{tabData=JSON.parse(localStorage.getItem(key)||'null');}catch(e){tabData=null;}
  const items = (tabData&&tabData.items)||[];

  // Mode buttons
  const MODES = [
    {key:'flashcard',icon:'🃏',label:'看词说拼音'},{key:'multiple',icon:'🎯',label:'选择拼音'},
    {key:'type',icon:'✍️',label:'拼音拼写'},{key:'listen',icon:'🔊',label:'听音选字'},
    {key:'listenrecord',icon:'🎙️',label:'听读练习'},{key:'reading',icon:'📖',label:'朗读练习'},
    {key:'writing',icon:'✏️',label:'写字练习'},
  ];
  const modeBtns = MODES.map(m =>
    '<button data-ci-add-mode="'+m.key+'" style="padding:10px 8px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);font-size:13px;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">'+m.icon+' '+m.label+'</button>'
  ).join('');

  // Resource buttons from library
  const resources = getResources();
  const resBtns = resources.length
    ? resources.map((r,ri) =>
        '<button data-ci-add-res="'+ri+'" style="padding:10px 8px;border-radius:10px;border:1px solid #c084fc;background:#faf5ff;font-size:13px;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(r.icon||'📄')+' '+r.title+'</button>'
      ).join('')
    : '<div style="font-size:12px;color:var(--muted);grid-column:1/-1;padding:4px 0;">资料库暂无内容</div>';

  // Added items list
  const addedHtml = items.length
    ? items.map((item,i) => {
        let icon='📝', label=item.mode||item.title||'';
        if(item.type==='mode'){ const m=MODES.find(m=>m.key===item.mode)||{icon:'📝',label:item.mode}; icon=m.icon; label=m.label; }
        else if(item.type==='resource'){ icon=item.icon||'📄'; label=item.title; }
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--paper2);border-radius:10px;margin-bottom:6px;">'
          +'<span style="font-size:16px;">'+icon+'</span>'
          +'<span style="font-size:13px;flex:1;">'+label+'</span>'
          +'<button data-ci-remove="'+i+'" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:20px;line-height:1;padding:0 2px;">×</button>'
          +'</div>';
      }).join('')
    : '<div style="color:var(--muted);font-size:13px;padding:8px 0;">还没有添加内容</div>';

  el.innerHTML =
    // Back button + title
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">'
    +'<button data-ci-back style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;font-family:DM Sans,sans-serif;padding:0;">← 返回课文列表</button>'
    +'</div>'
    +'<div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px;">'+code+' · '+lesson.title+'</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-bottom:16px;">'+lesson.subtitle+' · '+lesson.words.length+'个生字</div>'

    // TAB selector
    +'<div style="display:flex;gap:6px;margin-bottom:14px;">'+tabBtns+'</div>'
    +'<div style="font-size:12px;color:var(--blue);background:var(--blue-light);border-radius:8px;padding:7px 12px;margin-bottom:16px;">📅 第'+TAB_NAMES[checkinEditTab]+'份作业 · 学生第'+(checkinEditTab*2-1)+'-'+(checkinEditTab*2)+'天完成</div>'

    // Inner card like lesson detail page
    +'<div style="background:white;border:2px solid var(--blue);border-radius:16px;padding:20px;">'
    +'<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:14px;">✏️ 编辑第'+TAB_NAMES[checkinEditTab]+'份作业内容</div>'

    +'<div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:8px;">点击添加练习：</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'+modeBtns+'</div>'

    +'<div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:8px;">📎 从资料库添加文件：</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'+resBtns+'</div>'

    +'<div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:8px;">已添加（'+items.length+'项）：</div>'
    +addedHtml

    +'<div style="display:flex;gap:8px;margin-top:16px;">'
    +'<button data-ci-cancel style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;">取消</button>'
    +'<button data-ci-save style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--blue);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:13px;">💾 保存</button>'
    +'</div></div>';

  // Bind all handlers
  el.querySelector('[data-ci-back]').onclick = function(){
    checkinEditLesson = null;
    renderCheckinLessonList();
  };
  el.querySelector('[data-ci-cancel]').onclick = function(){
    checkinEditLesson = null;
    renderCheckinLessonList();
  };
  el.querySelector('[data-ci-save]').onclick = function(){
    this.textContent = '✅ 已保存！';
    this.style.background = 'var(--green)';
    setTimeout(()=>{ checkinEditLesson=null; renderCheckinLessonList(); }, 800);
  };
  el.querySelectorAll('[data-ci-tab]').forEach(btn=>{
    btn.onclick = function(){
      checkinEditTab = parseInt(this.dataset.ciTab);
      renderCheckinEditor_lesson(el);
    };
  });
  el.querySelectorAll('[data-ci-add-mode]').forEach(btn=>{
    btn.onclick = function(){
      const key='czmd_lesson_tab_'+lesson.id+'_'+checkinEditTab;
      let data; try{data=JSON.parse(localStorage.getItem(key)||'null');}catch(e){data=null;}
      if(!data) data={items:[]};
      data.items.push({type:'mode',mode:this.dataset.ciAddMode});
      localStorage.setItem(key,JSON.stringify(data));
      renderCheckinEditor_lesson(el);
    };
  });
  el.querySelectorAll('[data-ci-add-res]').forEach(btn=>{
    btn.onclick = function(){
      const ri = parseInt(this.dataset.ciAddRes);
      const r = getResources()[ri];
      if(!r) return;
      const key='czmd_lesson_tab_'+lesson.id+'_'+checkinEditTab;
      let data; try{data=JSON.parse(localStorage.getItem(key)||'null');}catch(e){data=null;}
      if(!data) data={items:[]};
      data.items.push({type:'resource',title:r.title,icon:r.icon||'📄',resIdx:ri});
      localStorage.setItem(key,JSON.stringify(data));
      renderCheckinEditor_lesson(el);
    };
  });
  el.querySelectorAll('[data-ci-remove]').forEach(btn=>{
    btn.onclick = function(){
      const i = parseInt(this.dataset.ciRemove);
      const key='czmd_lesson_tab_'+lesson.id+'_'+checkinEditTab;
      let data; try{data=JSON.parse(localStorage.getItem(key)||'null');}catch(e){data=null;}
      if(!data) return;
      data.items.splice(i,1);
      localStorage.setItem(key,JSON.stringify(data));
      renderCheckinEditor_lesson(el);
    };
  });
}


function openLessonTabEditor(lessonId){
  // Set detailLesson and show lesson detail screen in admin mode
  const lesson = NATIVE_LESSONS.find(l=>l.id===lessonId);
  if(!lesson) return;
  detailLesson = lesson;
  document.getElementById('ld-title').textContent = lesson.title + ' · ' + lesson.subtitle;
  document.getElementById('ld-sub').textContent = lesson.level + ' · ' + lesson.words.length + ' 个生字';
  // Render tab 1 content (game list)
  renderLevelDetail(lesson);
  // Switch to tab 1 and show screen
  showScreen('leveldetail');
  setTimeout(()=>{ switchLessonTab(1); }, 50);
}

// ════════════════════════════════════════
// 资料库 · RESOURCES LIBRARY
// ════════════════════════════════════════

const RESOURCES_KEY = 'czmd_resources';
let resourceTab = 'words';

const RES_CATEGORIES = [
  {key:'words',  icon:'🔤', label:'字词'},
  {key:'books',  icon:'📚', label:'绘本'},
  {key:'text',   icon:'📖', label:'课文'},
  {key:'reading',icon:'🌟', label:'拓展阅读'},
  {key:'oral',   icon:'🗣️', label:'口语'},
  {key:'other',  icon:'📂', label:'其他'},
];

function getResources(){ try{return JSON.parse(localStorage.getItem(RESOURCES_KEY)||'[]');}catch(e){return[];} }
function saveResources(list){
  localStorage.setItem(RESOURCES_KEY,JSON.stringify(list));
  cloudWriteRef(cloudAppDataRef('resources'), {items: list});
}

function switchResourceTab(tab){
  resourceTab = tab;
  renderResourcesPanel();
}

function renderResourcesPanel(){
  // Render category grid
  const grid = document.getElementById('res-category-grid');
  if(grid){
    const all = getResources();
    grid.innerHTML = RES_CATEGORIES.map(cat => {
      const count = all.filter(r=>r.type===cat.key).length;
      const active = cat.key===resourceTab;
      const border = active?'var(--blue)':'var(--border)';
      const textColor = active?'var(--blue)':'var(--ink)';
      return '<div data-rescat="'+cat.key+'" style="background:white;border-radius:14px;border:2px solid '+border+';padding:18px 10px;text-align:center;box-shadow:0 3px 0 '+border+';cursor:pointer;">'
        + '<div style="font-size:28px;margin-bottom:8px;">'+cat.icon+'</div>'
        + '<div style="font-size:13px;font-weight:600;color:'+textColor+';">'+cat.label+'</div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:3px;">'+count+' 个</div>'
        + '</div>';
    }).join('');
    // Attach click handlers after render
    grid.querySelectorAll('[data-rescat]').forEach(el => {
      el.onclick = function(){ switchResourceTab(this.dataset.rescat); };
      el.onmouseover = function(){ this.style.transform='translateY(-2px)'; };
      el.onmouseout = function(){ this.style.transform='translateY(0)'; };
    });
  }

  // Render resource list
  const el = document.getElementById('resources-list');
  if(!el) return;
  const all = getResources();
  const list = all.filter(r=>r.type===resourceTab);
  const catLabel = (RES_CATEGORIES.find(c=>c.key===resourceTab)||{label:resourceTab}).label;

  if(!list.length){
    el.innerHTML = '<div class="empty-review">暂无'+catLabel+'资源 · 点「上传文件」或「添加链接」</div>';
    return;
  }

  el.innerHTML = list.map((r) => {
    const idx = all.indexOf(r);
    const fileIcon = r.fileType==='pdf'?'📄':r.fileType==='image'?'🖼️':r.url?'🔗':'📎';
    const bg = r.fileType==='pdf'?'#fef3c7':r.fileType==='image'?'#d1fae5':r.url?'#dbeafe':'#f3e8ff';
    return '<div style="background:white;border-radius:14px;border:1px solid var(--border);padding:14px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 0 var(--border);">'
      + '<div style="width:44px;height:44px;border-radius:10px;background:'+bg+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">'+fileIcon+'</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:14px;font-weight:600;color:var(--ink);">'+r.title+'</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:2px;">'+(r.fileType?r.fileType.toUpperCase()+' · ':r.url?'🔗 链接 · ':'')+r.created+'</div>'
      + (r.desc?'<div style="font-size:12px;color:var(--muted);margin-top:2px;">'+r.desc+'</div>':'')
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0;">'
      + (r.url?'<a href="'+r.url+'" target="_blank" class="admin-btn blue" style="text-decoration:none;">打开</a>':'')
      + '<button class="admin-btn blue" onclick="editResource('+idx+')">编辑</button>'
      + '<button class="admin-btn red" onclick="deleteResource('+idx+')">删除</button>'
      + '</div></div>';
  }).join('');
}

function handleResourceFileUpload(input){
  const file = input.files[0];
  if(!file) return;
  input.value='';
  const title = prompt('资源名称：', file.name.replace(/\.\w+$/,''));
  if(!title) return;
  const reader = new FileReader();
  reader.onload = e => {
    const list = getResources();
    const ext = file.name.split('.').pop().toLowerCase();
    list.push({
      type: resourceTab,
      icon: ext==='pdf'?'📄':ext.match(/png|jpg|jpeg|gif|webp/)?'🖼️':'📎',
      fileType: ext,
      title,
      desc: file.name,
      dataUrl: e.target.result,
      created: new Date().toLocaleDateString('zh-CN'),
    });
    saveResources(list);
    renderResourcesPanel();
  };
  reader.readAsDataURL(file);
}

function openAddResourceModal(){
  const title = prompt('资源名称：'); if(!title) return;
  const url = prompt('链接地址（URL）：'); if(!url) return;
  const desc = prompt('描述（可留空）：') || '';
  const list = getResources();
  list.push({ type:resourceTab, icon:'🔗', title, url, desc, created:new Date().toLocaleDateString('zh-CN') });
  saveResources(list);
  renderResourcesPanel();
}

function editResource(idx){
  const list = getResources();
  const r = list[idx];
  if(!r) return;
  const title = prompt('资源名称：', r.title); if(title===null) return;
  const desc  = prompt('描述：', r.desc||'') || '';
  list[idx] = {...r, title, desc};
  saveResources(list);
  renderResourcesPanel();
}

function deleteResource(idx){
  if(!confirm('确定删除此资源？')) return;
  const list = getResources();
  list.splice(idx,1);
  saveResources(list);
  renderResourcesPanel();
}


// ════════════════════════════════════════
// 课文作业 TAB 系统 · LESSON HOMEWORK TABS
// ════════════════════════════════════════

let currentLessonTab = 1;

// Get which tab should be active today (1-4, based on 8-day cycle)
function getTodayLessonTab() {
  // Day 1 of the school starts from a fixed reference date
  // Use the week number to cycle: days 1-2=tab1, 3-4=tab2, 5-6=tab3, 7-8=tab4
  const ref = new Date('2026-01-01'); // school year start reference
  const today = new Date();
  const diffDays = Math.floor((today - ref) / (1000*60*60*24));
  const cycle = diffDays % 8; // 0-7
  return Math.floor(cycle / 2) + 1; // 0-1→1, 2-3→2, 4-5→3, 6-7→4
}

function switchLessonTab(n) {
  currentLessonTab = n;
  for(let i=1;i<=4;i++){
    const btn = document.getElementById('ldtab-'+i);
    const pane = document.getElementById('ld-tab-content-'+i);
    const active = i===n;
    if(btn){
      btn.style.background = active ? 'var(--blue)' : 'white';
      btn.style.color = active ? 'white' : 'var(--muted)';
      btn.style.borderColor = active ? 'var(--blue)' : 'var(--border)';
    }
    if(pane) pane.style.display = active ? 'block' : 'none';
  }
  // Render tab content for 2-4
  if(n >= 2) renderLessonTabContent(n);
}

function renderLessonTabContent(n) {
  const lesson = detailLesson;
  if(!lesson) return;
  // Use ld-tab-content-N directly (same target as editLessonTab)
  const el = document.getElementById('ld-tab-content-'+n);
  if(!el) return;

  // Get custom content for this tab from localStorage
  const key = 'czmd_lesson_tab_' + lesson.id + '_' + n;
  let tabData;
  try { tabData = JSON.parse(localStorage.getItem(key)||'null'); } catch(e){ tabData=null; }

  const isAdminOrTeacher = !!(currentAdmin||currentTeacher);

  let html = '';

  if(tabData && tabData.items && tabData.items.length){
    // Show configured content
    html = tabData.items.map(item => {
      if(item.type === 'mode'){
        const modeInfo = {
          flashcard: {icon:'🃏', name:'看词说拼音', desc:'看字说出拼音，然后自己判断'},
          multiple:  {icon:'🎯', name:'选择拼音',   desc:'从四个选项中选出正确拼音'},
          type:      {icon:'✍️', name:'拼音拼写',   desc:'自己输入拼音'},
          listen:    {icon:'🔊', name:'听音选字',   desc:'听声音选出正确的字'},
          listenrecord:{icon:'🎙️', name:'听读练习', desc:'听真人读音，跟着录音评分'},
          reading:   {icon:'📖', name:'朗读练习',   desc:'按行朗读课文，系统评分'},
          writing:   {icon:'✏️', name:'写字练习',   desc:'临摹笔顺练习'},
        }[item.mode] || {icon:'📝', name:item.mode, desc:''};
        return '<div class="lesson-list-item" onclick="startFromDetail(\"'+item.mode+'\")">'
          + '<div class="lli-left">'
          + '<div class="lli-title">'+modeInfo.icon+' '+modeInfo.name+'</div>'
          + '<div class="lli-sub">'+modeInfo.desc+'</div>'
          + '</div>'
          + '<div style="display:flex;align-items:center;">'
          + '<div class="lli-count">'+lesson.words.length+' 个字</div>'
          + '<div class="lli-arrow">›</div>'
          + '</div></div>';
      }
      if(item.type === 'text'){
        return '<div style="background:var(--paper2);border-radius:12px;padding:14px 16px;margin-bottom:8px;font-size:14px;color:var(--ink);">'+item.content+'</div>';
      }
      return '';
    }).join('');
  } else {
    // Empty tab — show placeholder
    const tabNames = ['','一','二','三','四'];
    html = '<div style="text-align:center;padding:40px 20px;color:var(--muted);">'
      + '<div style="font-size:48px;margin-bottom:12px;">📋</div>'
      + '<div style="font-size:15px;font-weight:500;margin-bottom:6px;">第'+tabNames[n]+'份作业</div>'
      + '<div style="font-size:13px;">内容待设置 · 管理员可在此添加练习</div>'
      + '</div>';
  }

  // Admin edit bar
  if(isAdminOrTeacher){
    html = '<div style="background:var(--gold-light);border:1px solid var(--gold);border-radius:var(--radius);padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">'
      + '<span style="font-size:13px;color:var(--gold);">⚙️ 第'+['','一','二','三','四'][n]+'份作业内容</span>'
      + '<button class="admin-btn blue" onclick="editLessonTab('+n+')" style="font-size:12px;">✏️ 编辑内容</button>'
      + '</div>' + html;
  }

  el.innerHTML = html;
}


function closeEditTabModal(){ const m=document.getElementById('edit-tab-modal'); if(m) m.remove(); }

function buildEditTabModalHTML(lessonId, n, MODES, tabData) {
  const tabNames = ['','一','二','三','四'];
  const itemsHtml = (tabData.items||[]).filter(i=>i.type==='mode').map(item => {
    const lbl = (MODES.find(m=>m.key===item.mode)||{label:item.mode}).label;
    return '<div data-mode="'+item.mode+'" style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--paper2);border-radius:8px;margin-bottom:6px;">'
      + '<span style="flex:1;font-size:13px;">'+lbl+'</span>'
      + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button>'
      + '</div>';
  }).join('');

  const modeButtons = MODES.map(m =>
    '<button data-mode-key="'+m.key+'" onclick="addModeToTab(this.dataset.modeKey,'+JSON.stringify(lessonId)+','+n+')" '
    + 'style="padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--paper2);font-size:12px;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;">'
    + m.label+'</button>'
  ).join('');

  return '<div id="edit-tab-modal" style="background:white;border-radius:20px;padding:24px;width:100%;max-width:380px;max-height:85vh;overflow-y:auto;">'
    + '<div style="font-size:16px;font-weight:600;margin-bottom:16px;">编辑第'+tabNames[n]+'份作业</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:8px;">添加练习模式：</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">'+modeButtons+'</div>'
    + '<div id="modal-tab-items" style="margin-bottom:16px;">'+itemsHtml+'</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="closeEditTabModal()" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);cursor:pointer;font-family:DM Sans,sans-serif;">取消</button>'
    + '<button onclick="saveLessonTabFromModal('+JSON.stringify(lessonId)+','+n+',this)" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--blue);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;">保存</button>'
    + '</div></div>';
}


function editLessonTab(n) {
  const lesson = detailLesson;
  if(!lesson) return;
  const key = 'czmd_lesson_tab_' + lesson.id + '_' + n;
  let tabData;
  try { tabData = JSON.parse(localStorage.getItem(key)||'null'); } catch(e){ tabData=null; }
  if(!tabData) tabData = { items: [] };

  const MODES = [
    {key:'flashcard',label:'🃏 看词说拼音'},
    {key:'multiple', label:'🎯 选择拼音'},
    {key:'type',     label:'✍️ 拼音拼写'},
    {key:'listen',   label:'🔊 听音选字'},
    {key:'listenrecord',label:'🎙️ 听读练习'},
    {key:'reading',  label:'📖 朗读练习'},
    {key:'writing',  label:'✏️ 写字练习'},
  ];

  // Insert inline editor directly into tab content area (no fixed overlay)
  const contentEl = document.getElementById('ld-tab-content-'+n);
  if(!contentEl) return;

  const tabNames = ['','一','二','三','四'];
  const itemsHtml = (tabData.items||[]).filter(i=>i.type==='mode').map(item => {
    const lbl = (MODES.find(m=>m.key===item.mode)||{label:item.mode}).label;
    return '<div data-mode="'+item.mode+'" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--paper2);border-radius:10px;margin-bottom:6px;">'
      + '<span style="flex:1;font-size:13px;font-weight:500;">'+lbl+'</span>'
      + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:20px;line-height:1;">×</button>'
      + '</div>';
  }).join('');

  const modeButtons = MODES.map(m =>
    '<button data-mode-key="'+m.key+'" style="padding:10px 8px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);font-size:12px;cursor:pointer;text-align:left;font-family:DM Sans,sans-serif;transition:background 0.15s;">'
    + m.label+'</button>'
  ).join('');

  contentEl.innerHTML =
    '<div style="background:white;border-radius:16px;border:2px solid var(--blue);padding:20px;">'
    + '<div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:16px;">✏️ 编辑第'+tabNames[n]+'份作业内容</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:8px;">点击添加练习：</div>'
    + '<div id="tab-mode-buttons" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'+modeButtons+'</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:8px;">已添加的练习：</div>'
    + '<div id="modal-tab-items" style="margin-bottom:16px;min-height:40px;">'+itemsHtml+'</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="renderLessonTabContent('+n+')" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;">取消</button>'
    + '<button onclick="saveLessonTabFromModal('+JSON.stringify(lesson.id)+','+n+',this)" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--blue);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:13px;">💾 保存</button>'
    + '</div></div>';

  // Attach click handlers to mode buttons
  contentEl.querySelectorAll('[data-mode-key]').forEach(btn => {
    btn.onclick = function(){ addModeToTab(this.dataset.modeKey, lesson.id, n); };
    btn.onmouseover = function(){ this.style.background='var(--blue-light)'; };
    btn.onmouseout = function(){ this.style.background='var(--paper2)'; };
  });
}

function addModeToTab(modeKey, lessonId, n) {
  const container = document.getElementById('modal-tab-items');
  if(!container) return;
  const MODES = {flashcard:'🃏 看词说拼音',multiple:'🎯 选择拼音',type:'✍️ 拼音拼写',listen:'🔊 听音选字',listenrecord:'🎙️ 听读练习',reading:'📖 朗读练习',writing:'✏️ 写字练习'};
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;background:var(--paper2);border-radius:8px;margin-bottom:6px;';
  div.dataset.mode = modeKey;
  div.innerHTML = '<span style="flex:1;font-size:13px;">'+(MODES[modeKey]||modeKey)+'</span>'
    + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;">×</button>';
  container.appendChild(div);
}

// Collect every per-lesson tab config from localStorage into a single map
// (key → tabData) so it can be stored as one shared cloud document.
function collectLessonTabs(){
  const map = {};
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('czmd_lesson_tab_')){
      map[k] = safeParseJSON(localStorage.getItem(k), null);
    }
  }
  return map;
}
function syncLessonTabsToCloud(){
  cloudWriteRef(cloudAppDataRef('lessonTabs'), {tabs: collectLessonTabs()});
}

function saveLessonTabFromModal(lessonId, n, btn) {
  const modal = document.getElementById('edit-tab-modal-wrap');
  const items = [];
  modal.querySelectorAll('[data-mode]').forEach(el => {
    items.push({ type: 'mode', mode: el.dataset.mode });
  });
  const key = 'czmd_lesson_tab_' + lessonId + '_' + n;
  localStorage.setItem(key, JSON.stringify({ items }));
  syncLessonTabsToCloud();
  closeEditTabModal();
  if(modal) modal.remove();
  renderLessonTabContent(n);
}

// Auto-select today's tab when opening a lesson
function openLessonDetailWithTab(lessonId) {
  // Called after lesson detail is rendered
  const todayTab = getTodayLessonTab();
  switchLessonTab(todayTab);
}


// ════════════════════════════════════════
// 自制课文 · CUSTOM LESSONS
// ════════════════════════════════════════

const CUSTOM_LESSONS_KEY = 'czmd_custom_lessons';

function getCustomLessons(){
  try{ return JSON.parse(localStorage.getItem(CUSTOM_LESSONS_KEY)||'[]'); }catch(e){ return []; }
}
function saveCustomLessons(list){
  localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify(list));
  cloudWriteRef(cloudAppDataRef('customLessons'), {items: list});
}
function getAllLessons(){
  return [...NATIVE_LESSONS, ...getCustomLessons()];
}

function openAddCustomLessonModal(){
  const existing = document.getElementById('custom-lesson-modal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'custom-lesson-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;">
      <div style="font-size:16px;font-weight:600;color:var(--ink);margin-bottom:16px;">➕ 添加自制课文</div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">课文编号 · Lesson Code <span style="color:var(--red);">*</span></label>
        <input class="auth-input" id="cl-code" placeholder="如 Z1.6 或 自制-01" style="width:100%;"/>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">建议用 自制-01, 自制-02 等编号</div>
      </div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">课文标题 · Title <span style="color:var(--red);">*</span></label>
        <input class="auth-input" id="cl-title" placeholder="如：第八课" style="width:100%;"/>
      </div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">副标题 · Subtitle</label>
        <input class="auth-input" id="cl-subtitle" placeholder="如：我的家" style="width:100%;"/>
      </div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">年级/级别 · Level</label>
        <select class="auth-input" id="cl-level" style="width:100%;">
          <option value="一年级 Level 1">一年级 Level 1</option>
          <option value="一年级 Level 2">一年级 Level 2</option>
          <option value="二年级 Level 1">二年级 Level 1</option>
          <option value="二年级 Level 2">二年级 Level 2</option>
          <option value="三年级 Level 1">三年级 Level 1</option>
          <option value="三年级 Level 2">三年级 Level 2</option>
          <option value="四年级 Level 1">四年级 Level 1</option>
          <option value="五年级 Level 1">五年级 Level 1</option>
          <option value="六年级 Level 1">六年级 Level 1</option>
          <option value="自制课程">自制课程</option>
        </select>
      </div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">生字列表 · Characters (用空格或逗号分隔)</label>
        <input class="auth-input" id="cl-words" placeholder="如：我 你 他 她 们" style="width:100%;"/>
      </div>

      <div class="auth-field" style="margin-bottom:12px;">
        <label class="auth-label">课文内容（用于朗读）· Reading Text</label>
        <textarea class="auth-input" id="cl-text" placeholder="每行一句，学生朗读时按行显示" style="width:100%;height:100px;resize:vertical;"></textarea>
      </div>

      <div class="auth-field" style="margin-bottom:16px;">
        <label class="auth-label">上传课文文件（PDF/图片，可选）· Upload File</label>
        <input type="file" id="cl-file" accept=".pdf,image/*" style="font-size:13px;"/>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">文件会保存到作业内容中供学生查看</div>
      </div>

      <div style="display:flex;gap:8px;">
        <button onclick="document.getElementById('custom-lesson-modal').remove()" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--paper2);cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;">取消</button>
        <button onclick="saveCustomLesson()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--green);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:13px;">💾 保存课文</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  // Close on backdrop click
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };
}

function saveCustomLesson(){
  const code    = document.getElementById('cl-code')?.value.trim();
  const title   = document.getElementById('cl-title')?.value.trim();
  const subtitle= document.getElementById('cl-subtitle')?.value.trim()||'';
  const level   = document.getElementById('cl-level')?.value||'自制课程';
  const wordsRaw= document.getElementById('cl-words')?.value.trim()||'';
  const text    = document.getElementById('cl-text')?.value.trim()||'';
  const fileInput= document.getElementById('cl-file');

  if(!code||!title){ alert('请填写课文编号和标题'); return; }

  // Parse words
  const words = wordsRaw.split(/[\s,，]+/).filter(Boolean).map(w=>({char:w,pinyin:'',meaning:''}));

  // Parse reading lines
  const lines = text ? text.split('\n').map(l=>l.trim()).filter(Boolean) : [];

  const id = 'custom_' + Date.now();

  const saveFn = (fileDataUrl) => {
    const lesson = {
      id, code, title, subtitle, level,
      words,
      reading: lines.length ? {title, lines} : null,
      fileDataUrl: fileDataUrl||null,
      isCustom: true,
      created: new Date().toLocaleDateString('zh-CN'),
    };
    const list = getCustomLessons();
    list.push(lesson);
    saveCustomLessons(list);

    document.getElementById('custom-lesson-modal')?.remove();

    // Show toast
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:var(--green);color:white;padding:12px 24px;border-radius:30px;font-size:14px;font-weight:600;font-family:DM Sans,sans-serif;z-index:9999;';
    t.textContent='✅ 课文「'+title+'」已添加！';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);

    // Refresh template list if open
    renderCheckinLessonList();
  };

  const file = fileInput?.files?.[0];
  if(file){
    const reader = new FileReader();
    reader.onload = e => saveFn(e.target.result);
    reader.readAsDataURL(file);
  } else {
    saveFn(null);
  }
}

function deleteCustomLesson(id){
  if(!confirm('确定删除此自制课文？此操作不可撤销。')) return;
  const list = getCustomLessons().filter(l=>l.id!==id);
  saveCustomLessons(list);
  renderCheckinLessonList();
}

function editCustomLesson(id){
  // For now: delete + re-add
  const lesson = getCustomLessons().find(l=>l.id===id);
  if(!lesson) return;
  deleteCustomLesson(id);
  // Pre-fill would need more work - for now just open blank modal
  openAddCustomLessonModal();
}


// ════════════════════════════════════════
// 识字测验 (老师布置 · 自适应) · ADAPTIVE EXAM
// ════════════════════════════════════════

// ── 字库 EXAM_BANK ──
// 结构: { key, grade, level, title, chars: [{c, p}] }
// 新加年级/Level：往下补即可，不用改其他代码

function getExamPack(key){ return EXAM_BANK.find(p=>p.key===key); }

// ════════════════════════════════════════
// 老师轮换记忆 · EXAM ROTATION MEMORY
// ════════════════════════════════════════
// 数据 key 形如: czmd_exam_seen_{teacherName}_{packKey} = ['天','地',...]
// 每次布置成功后，把这次出的字 union 进去；下次抽字时优先从"没出过的字"里挑。

function _examSeenKey(teacherName, packKey){
  const safe = (teacherName||'unknown').replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g,'');
  return 'czmd_exam_seen_'+safe+'_'+packKey;
}

function getExamSeen(teacherName, packKey){
  try{ return JSON.parse(localStorage.getItem(_examSeenKey(teacherName,packKey))||'[]'); }
  catch(e){ return []; }
}

// Collect every teacher's exam rotation memory into a single map (key → chars)
// so it can be stored as one shared cloud document and follow teachers across devices.
function collectExamSeen(){
  const map = {};
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('czmd_exam_seen_')){
      map[k] = safeParseJSON(localStorage.getItem(k), []);
    }
  }
  return map;
}
function syncExamSeenToCloud(){
  cloudWriteRef(cloudAppDataRef('examSeen'), {seen: collectExamSeen()});
}

function addExamSeen(teacherName, packKey, charsToAdd){
  const set = new Set(getExamSeen(teacherName,packKey));
  charsToAdd.forEach(c => set.add(c));
  localStorage.setItem(_examSeenKey(teacherName,packKey), JSON.stringify(Array.from(set)));
  syncExamSeenToCloud();
}

function resetExamSeen(teacherName, packKey){
  localStorage.removeItem(_examSeenKey(teacherName,packKey));
  syncExamSeenToCloud();
}

// 核心：根据"出过的字"做 20 旧 + 30 新 的抽字（50 是 default，按比例换算）
// 返回: { chars: [...抽到的字 obj], oldUsed: n, newUsed: m }
function pickExamChars(pack, quizSize, teacherName){
  const all = pack.chars;
  const seen = new Set(getExamSeen(teacherName, pack.key));
  const totalSize = quizSize >= all.length ? all.length : quizSize;
  // 目标比例：旧:新 = 20:30 = 2:3 (按 50 算)；按 totalSize 等比例
  const oldQuotaIdeal = Math.round(totalSize * 0.4);  // 旧字 40%
  const newQuotaIdeal = totalSize - oldQuotaIdeal;    // 新字 60%

  const newPool = all.filter(c => !seen.has(c.c));    // 没出过
  const oldPool = all.filter(c => seen.has(c.c));     // 出过

  // 洗牌
  const shuffle = arr => arr.slice().sort(()=>Math.random()-0.5);
  const newShuffled = shuffle(newPool);
  const oldShuffled = shuffle(oldPool);

  // 实际抽字：先按目标抽，不够再互相补
  let pickedNew = newShuffled.slice(0, newQuotaIdeal);
  let pickedOld = oldShuffled.slice(0, oldQuotaIdeal);
  // 新字不够 → 多抽旧字补
  if(pickedNew.length < newQuotaIdeal){
    const needMore = newQuotaIdeal - pickedNew.length;
    const extra = oldShuffled.slice(oldQuotaIdeal, oldQuotaIdeal + needMore);
    pickedOld = pickedOld.concat(extra);
  }
  // 旧字不够 → 多抽新字补
  if(pickedOld.length < oldQuotaIdeal){
    const needMore = oldQuotaIdeal - pickedOld.length;
    const extra = newShuffled.slice(newQuotaIdeal, newQuotaIdeal + needMore);
    pickedNew = pickedNew.concat(extra);
  }
  // 合并 + 再次洗牌（避免新字旧字分块出现）
  const merged = shuffle(pickedNew.concat(pickedOld)).slice(0, totalSize);
  return {
    chars: merged,
    oldUsed: pickedOld.length,
    newUsed: pickedNew.length,
    totalSeen: seen.size,
    totalChars: all.length,
  };
}

// ════════════════════════════════════════
// 老师端：识字测验布置库
// ════════════════════════════════════════
let teacherExamQuizSize = 30;  // 默认 30 字 (老师可选 20/30/50)

let examSelectedModule = null;
// 教材类型（老师布置识字测验时第一步选择）
const EXAM_MODULES = [
  {code:'Z', name:'华语听说读写教材',   en:'Heritage · Listen/Speak/Read/Write',     cvar:'blue'},
  {code:'H', name:'华语启蒙识字教材',   en:'Heritage · Early Literacy',              cvar:'gold'},
  {code:'N', name:'非华语听说读写教材', en:'Non-heritage · Listen/Speak/Read/Write', cvar:'green'},
  {code:'Y', name:'非华语低龄幼儿教材', en:'Non-heritage · Early Years',             cvar:'purple'},
];

function openTeacherExamLibrary(){
  examSelectedModule = null;
  let m = document.getElementById('exam-library-modal');
  if(!m){
    m = document.createElement('div');
    m.id = 'exam-library-modal';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;align-items:flex-start;justify-content:center;overflow-y:auto;padding:30px 0;';
    m.innerHTML = '<div style="background:white;border-radius:16px;padding:24px;max-width:560px;width:92%;box-shadow:0 8px 40px rgba(0,0,0,0.2);margin:auto;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px;">'
      + '  <div id="exam-modal-head" style="min-width:0;"></div>'
      + '  <button onclick="document.getElementById(\'exam-library-modal\').style.display=\'none\'" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);line-height:1;flex-shrink:0;">&#10005;</button>'
      + '</div>'
      + '<div id="exam-modal-body" style="max-height:64vh;overflow-y:auto;"></div>'
      + '</div>';
    document.body.appendChild(m);
  }
  renderExamModuleSelect();
  m.style.display = 'flex';
}

// 第一步：选择教材类型（Z / H / N / Y）
function renderExamModuleSelect(){
  examSelectedModule = null;
  const head = document.getElementById('exam-modal-head');
  if(head) head.innerHTML = '<div style="font-size:18px;font-weight:600;color:var(--ink);">📋 识字测验库</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:3px;">先选择教材类型 · Choose a curriculum</div>';
  const body = document.getElementById('exam-modal-body');
  if(!body) return;
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(212px,1fr));gap:12px;padding:2px;">';
  EXAM_MODULES.forEach(function(mod){
    html += '<div onclick="examModulePick(\'' + mod.code + '\')" '
      + 'style="background:white;border:1.5px solid var(--border);border-left:5px solid var(--' + mod.cvar + ');border-radius:14px;padding:16px 14px;cursor:pointer;transition:transform .15s,box-shadow .15s;display:flex;align-items:center;gap:13px;" '
      + 'onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 5px 18px rgba(0,0,0,0.10)\'" '
      + 'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
      + '<div style="width:50px;height:50px;flex-shrink:0;border-radius:12px;background:var(--' + mod.cvar + '-light);display:flex;align-items:center;justify-content:center;font-family:\'Noto Serif SC\',serif;font-size:28px;font-weight:700;color:var(--' + mod.cvar + ');">' + mod.code + '</div>'
      + '<div style="min-width:0;"><div style="font-size:14.5px;font-weight:600;color:var(--ink);line-height:1.3;">' + mod.name + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.3;">' + mod.en + '</div></div>'
      + '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
}

function examModulePick(code){
  examSelectedModule = code;
  renderTeacherExamList(code);
}

// 第二步：该教材下，按年级 Level 列出识字表
function renderTeacherExamList(mod){
  mod = mod || examSelectedModule || 'Z';
  const modInfo = EXAM_MODULES.find(function(x){ return x.code === mod; }) || {code:mod, name:mod, cvar:'gold'};
  const head = document.getElementById('exam-modal-head');
  if(head) head.innerHTML = '<div onclick="renderExamModuleSelect()" style="cursor:pointer;font-size:13px;color:var(--' + modInfo.cvar + ');margin-bottom:5px;display:inline-block;">← 选择其他教材 · Back</div>'
    + '<div style="font-size:18px;font-weight:600;color:var(--ink);">📋 ' + modInfo.name + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-top:2px;">选一个年级 Level 布置给班级 · 自适应难度</div>';
  const list = document.getElementById('exam-modal-body');
  if(!list) return;
  const packs = EXAM_BANK.filter(function(p){ return (p.module || 'Z') === mod; });
  if(!packs.length){
    list.innerHTML = '<div style="text-align:center;padding:44px 16px;color:var(--muted);">'
      + '<div style="font-size:40px;margin-bottom:10px;">🗂️</div>'
      + '<div style="font-size:14px;color:var(--ink);font-weight:500;margin-bottom:4px;">该教材识字表正在补全中</div>'
      + '<div style="font-size:12px;">字库即将上线 · Coming soon</div></div>';
    return;
  }
  const grouped = {};
  packs.forEach(function(p){ if(!grouped[p.grade]) grouped[p.grade] = []; grouped[p.grade].push(p); });
  let html = '';
  Object.keys(grouped).forEach(function(grade){
    html += '<div style="font-size:12px;font-weight:600;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin:14px 0 6px;padding-left:4px;">' + grade + '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr;gap:6px;">';
    grouped[grade].forEach(function(p){
      const empty = p.chars.length === 0;
      const bg = empty ? 'var(--paper2)' : 'white';
      const cursor = empty ? 'default' : 'pointer';
      const handler = empty ? '' : 'onclick="examPickAssign(\'' + p.key + '\')"';
      html += '<div ' + handler + ' style="background:' + bg + ';border:1px solid var(--border);border-radius:10px;padding:12px 14px;cursor:' + cursor + ';display:flex;align-items:center;justify-content:space-between;opacity:' + (empty ? '0.5' : '1') + ';">'
        + '<div><div style="font-size:14px;font-weight:500;color:var(--ink);">' + p.title + '</div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' + (empty ? '⚠️ 字库待补全' : p.chars.length + ' 个字 · ' + p.level) + '</div></div>'
        + (empty ? '<div style="font-size:11px;color:var(--muted);">待添加</div>' : '<div style="font-size:18px;color:var(--blue);">›</div>')
        + '</div>';
    });
    html += '</div>';
  });
  list.innerHTML = html;
}

// 老师点了一个 pack，复用现有 assignModal 但传一个 fake lesson
function examPickAssign(packKey){
  const pack = getExamPack(packKey);
  if(!pack || !pack.chars.length) return;
  document.getElementById('exam-library-modal').style.display = 'none';
  // 借用现有 assigningLesson 机制，标记为 exam 类型
  assigningLesson = {
    id: '__exam__:'+packKey,
    title: '识字测验',
    subtitle: pack.title,
    level: pack.grade+' '+pack.level,
    _isExam: true,
    _packKey: packKey,
  };
  // 复用现有 modal
  openAssignModalForExam(pack);
}

function openAssignModalForExam(pack){
  assignSelectedClasses = new Set();
  assignDeadlineType = 'week';
  teacherExamQuizSize = 30;  // 每次打开都重置回默认 30
  document.getElementById('assign-modal-title').textContent = '📋 布置识字测验';
  document.getElementById('assign-modal-sub').textContent = pack.title + ' · 共 ' + pack.chars.length + ' 个字';
  document.getElementById('assign-err').textContent = '';
  const searchEl = document.getElementById('class-search');
  if(searchEl) searchEl.value = '';
  selectDeadline('week');
  const dEl = document.getElementById('dl-custom-date');
  if(dEl){
    const today = new Date().toISOString().split('T')[0];
    dEl.min = today;
    dEl.value = '';
  }
  const labelEl = document.getElementById('dl-custom-label');
  if(labelEl) labelEl.textContent = '';
  // 注入"字数选择"行（先看有没有已存在，没有则插入）
  injectExamSizePicker(pack);
  // Build class grid (same as openAssignModal)
  const boxes = document.getElementById('assign-class-checkboxes');
  if(boxes){
    const classList = (typeof currentTeacher !== 'undefined' && currentTeacher)
      ? (currentTeacher.classes || [])
      : (typeof ALL_CLASSES !== 'undefined' ? ALL_CLASSES : []);
    const preselect = (typeof teacherSelectedClass !== 'undefined') ? teacherSelectedClass : '';
    boxes.innerHTML = classList.map(cls => `
      <div class="assign-cls-tile ${cls===preselect?'selected-tile':''}" id="acb-${cls}"
        onclick="toggleAssignClass('${cls}')" title="班级 ${cls}">${cls}</div>`).join('');
    if(preselect) assignSelectedClasses = new Set([preselect]);
  }
  document.getElementById('assign-modal').style.display = 'flex';
}

// 把"字数选择"行注入到 assign-modal 里（紧贴在标题下方）
function injectExamSizePicker(pack){
  const modalSub = document.getElementById('assign-modal-sub');
  if(!modalSub) return;
  // 移除旧的（如果有）
  const old = document.getElementById('exam-size-row');
  if(old) old.remove();

  const total = pack.chars.length;
  // 候选字数：20 / 30 / 50 / 100（不足该字数的档位自动隐藏）
  const candidates = [20, 30, 50, 100].filter(n => n <= total);
  // 默认选 30 如果在选项里，否则选第一个（选「全部」即 teacherExamQuizSize===total 也视为有效选中）
  if(teacherExamQuizSize !== total && !candidates.includes(teacherExamQuizSize)){
    teacherExamQuizSize = candidates.includes(30) ? 30 : candidates[0];
  }
  // 记录当前 pack key 用于 reset
  window._examActivePackKey = pack.key;

  const row = document.createElement('div');
  row.id = 'exam-size-row';
  row.style.cssText = 'margin:14px 0 18px;';
  row.innerHTML =
    '<div class="section-label" style="margin-bottom:8px;">测验字数 · Quiz Size</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:8px;">每次随机抽这么多字 · 大约 40% 旧字 + 60% 新字（智能轮换）</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="exam-size-pills">'
    + candidates.map(n => {
        const active = (n === teacherExamQuizSize);
        return '<button class="exam-quiz-size-pill '+(active?'active':'')+'" data-size="'+n+'" onclick="setExamQuizSize('+n+')">'+n+' 字</button>';
      }).join('')
    + '<button class="exam-quiz-size-pill '+(teacherExamQuizSize===total?'active':'')+'" data-size="'+total+'" onclick="setExamQuizSize('+total+')">全部 '+total+' 字</button>'
    + '</div>'
    + '<div id="exam-preview-line" style="font-size:12px;color:var(--ink);background:#fff8dc;border:1px solid #e6d99a;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;"></div>';
  modalSub.parentNode.insertBefore(row, modalSub.nextSibling);
  updateExamPreviewLine();
}

function setExamQuizSize(n){
  teacherExamQuizSize = n;
  document.querySelectorAll('#exam-size-pills .exam-quiz-size-pill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size,10) === n);
  });
  updateExamPreviewLine();
}

// 实时预览：本次会出多少新字 + 旧字
function updateExamPreviewLine(){
  const line = document.getElementById('exam-preview-line');
  if(!line) return;
  const packKey = window._examActivePackKey;
  const pack = getExamPack(packKey);
  if(!pack) return;
  const teacherName = (typeof currentTeacher !== 'undefined' && currentTeacher)
    ? currentTeacher.name
    : (currentAdmin?.username || 'Admin');
  const seen = getExamSeen(teacherName, packKey);
  const seenCount = seen.length;
  const totalChars = pack.chars.length;
  const remainingNew = totalChars - seenCount;
  const size = teacherExamQuizSize;
  // 计算实际会出多少
  const targetNew = Math.round(size * 0.6);
  const targetOld = size - targetNew;
  const actualNew = Math.min(targetNew, remainingNew);
  const actualOld = Math.min(targetOld, seenCount);
  // 凑数：如果新或旧凑不齐，互相补
  let finalNew = actualNew, finalOld = actualOld;
  const shortage = size - actualNew - actualOld;
  if(shortage > 0){
    // 用还没用到的池补
    const extraNew = Math.min(shortage, remainingNew - actualNew);
    finalNew += extraNew;
    const stillShort = shortage - extraNew;
    if(stillShort > 0) finalOld += Math.min(stillShort, seenCount - actualOld);
  }
  let detail = '';
  if(seenCount === 0){
    detail = '🆕 全部都是新字（这是第一次布置）';
  } else {
    detail = '🆕 新字 '+finalNew+' · 🔁 复习 '+finalOld+' · 已累计出过 '+seenCount+'/'+totalChars;
  }
  line.innerHTML =
    '<span>'+detail+'</span>'
    + (seenCount > 0
        ? '<button onclick="confirmResetExamSeen()" style="margin-left:8px;padding:3px 10px;font-size:11px;border-radius:6px;border:1px solid var(--border);background:white;color:var(--muted);cursor:pointer;font-family:DM Sans,sans-serif;">↻ 清空记忆</button>'
        : '');
}

function confirmResetExamSeen(){
  const packKey = window._examActivePackKey;
  const pack = getExamPack(packKey);
  if(!pack) return;
  const teacherName = (typeof currentTeacher !== 'undefined' && currentTeacher)
    ? currentTeacher.name
    : (currentAdmin?.username || 'Admin');
  if(!confirm('确定要清空"' + pack.title + '"的布置记忆？\n下次布置会重新从头开始。\n\n这只影响你（'+teacherName+'）布置时的轮换，不会影响学生的练习记录。')) return;
  resetExamSeen(teacherName, packKey);
  updateExamPreviewLine();
}

// ════════════════════════════════════════
// 学生端：识字测验 tab 列表
// ════════════════════════════════════════
function renderStudentExamList(){
  if(!currentUser) return '<div class="empty-review">未登录</div>';
  const classes = currentUser.classes && currentUser.classes.length ? currentUser.classes : [currentUser.classCode];
  const all = getAssignedHW();
  const myExams = all.filter(a =>
    a.lessonId && a.lessonId.indexOf('__exam__:')===0 &&
    classes.includes(a.classCode)
  );
  if(!myExams.length){
    return '<div style="text-align:center;padding:32px 16px;">'
      + '<div style="font-size:48px;margin-bottom:16px;">📋</div>'
      + '<div style="font-size:16px;font-weight:600;color:var(--ink);margin-bottom:8px;">识字测验</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-bottom:6px;">Character Assessment</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-top:16px;padding:10px 16px;background:var(--paper2);border-radius:10px;display:inline-block;">📌 此测试由老师发送 · Assigned by teacher</div>'
      + '<div style="margin-top:20px;color:var(--muted);font-size:13px;">暂无老师布置的测验<br>No exam assigned yet</div>'
      + '</div>';
  }
  // 排序：未过期在前
  myExams.sort((a,b)=> (isHWExpired(a)?1:0) - (isHWExpired(b)?1:0));
  let html = '<div style="margin-bottom:14px;font-size:12px;color:var(--muted);">📌 老师布置的识字测验</div>';
  myExams.forEach(a => {
    const packKey = a.lessonId.replace('__exam__:','');
    const pack = getExamPack(packKey);
    if(!pack) return;
    const expired = isHWExpired(a);
    const attemptsDone = getExamAttempts(packKey, a.classCode);
    const maxedOut = attemptsDone >= EXAM_MAX_ATTEMPTS;
    const everCompleted = attemptsDone >= 1;
    const locked = expired || maxedOut;
    const bgColor = locked ? 'var(--paper2)' : 'white';
    const borderColor = locked ? 'var(--border)' : 'var(--blue)';
    const cursor = locked ? 'default' : 'pointer';
    const handler = locked ? '' : 'onclick="startExamQuiz(\''+packKey+'\',\''+a.classCode+'\')"';
    const sizeText = a.examQuizSize ? (a.examQuizSize >= pack.chars.length ? '全部 '+pack.chars.length+' 字' : a.examQuizSize+' 字 / 共 '+pack.chars.length) : pack.chars.length+' 字';
    let statusText = '';
    if(expired) statusText = ' · ⚠️ 已过期';
    else if(maxedOut) statusText = ' · ✓ 已完成 '+attemptsDone+'/'+EXAM_MAX_ATTEMPTS+' 次';
    else if(attemptsDone > 0) statusText = ' · 已做 '+attemptsDone+'/'+EXAM_MAX_ATTEMPTS+' 次';
    const rightIcon = expired ? '⌛' : (maxedOut ? '✓' : '›');
    // ★ 完成1次以上 → 显示印章 + 鼓励语
    const stampHtml = (everCompleted && !expired)
      ? '<div class="hw-completed-stamp" style="top:-6px;right:-6px;width:64px;height:64px;"><div class="hw-completed-stamp-inner" style="font-size:11px;">已完成<br><span style="font-size:8px;letter-spacing:0;">COMPLETED</span></div></div>'
      : '';
    const encourageHtml = (everCompleted && !maxedOut && !expired)
      ? '<div style="font-size:11px;color:var(--gold);margin-top:4px;font-weight:600;">⭐ 还可以再做一次攒积分哦 · Try again for more points!</div>'
      : '';
    html += '<div '+handler+' style="position:relative;background:'+bgColor+';border:1.5px solid '+borderColor+';border-radius:14px;padding:14px 16px;margin-bottom:14px;cursor:'+cursor+';display:flex;align-items:center;justify-content:space-between;'+(locked?'opacity:0.7;':'')+'">'
      + stampHtml
      + '<div style="flex:1;min-width:0;">'
      + '  <div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:3px;">📋 '+pack.title+'</div>'
      + '  <div style="font-size:12px;color:var(--muted);">'+sizeText+' · 班级 '+a.classCode+statusText+'</div>'
      + '  <div style="font-size:11px;color:var(--muted);margin-top:2px;">'+(a.deadlineLabel||'')+'</div>'
      +    encourageHtml
      + '</div>'
      + '<div style="font-size:24px;color:'+borderColor+';margin-left:10px;">'+rightIcon+'</div>'
      + '</div>';
  });
  return html;
}

// ════════════════════════════════════════
// 测验引擎 · ADAPTIVE QUIZ ENGINE
// ════════════════════════════════════════
let examState = null;
// shape (per-question model):
// {
//   packKey, classCode, pack, quizSize, allChars,
//   queue,           // 待考队列（FIFO，答错时插回更多副本）
//   passedSet,       // 答对过的字
//   wrongOnceSet,    // 出错过至少一次的字
//   wrongInBankSet,  // 错≥2次已入错字本
//   skippedSet,      // 连错5次被放过的字
//   wrongCountMap,   // 字→错次
//   currentChar,     // 当前考的字 {c,p}
//   currentOptions,  // 当前 8 个选项 (含正确答案)
//   questionNum,     // 第几题
//   correctNum,      // 累计答对次数
//   answered,        // 当前题是否已作答
// }

const EXAM_OPTIONS_PER_QUESTION = 8;  // 每题屏幕上显示 8 个字

function startExamQuiz(packKey, classCode, opts){
  const pack = getExamPack(packKey);
  if(!pack || !pack.chars.length){
    alert('此测验暂无字库 · No characters available yet.');
    return;
  }

  // ★ 检查 attempts 次数
  if(classCode && typeof EXAM_MAX_ATTEMPTS !== 'undefined'){
    const done = getExamAttempts(packKey, classCode);
    if(done >= EXAM_MAX_ATTEMPTS){
      alert('已经做过 '+done+' 次，达到上限（每份作业最多 '+EXAM_MAX_ATTEMPTS+' 次）\n\n可以去错字本继续复习错过的字。');
      return;
    }
  }

  // 优先从 homework 记录里取"老师发布时已抽好的字"
  let chosenChars = null;
  let quizSize = (opts && opts.quizSize) || null;
  if(classCode && typeof getAssignedHW==='function'){
    try{
      const hw = getAssignedHW().find(a => a.lessonId === '__exam__:'+packKey && a.classCode === classCode);
      if(hw){
        if(hw.examCharList && Array.isArray(hw.examCharList) && hw.examCharList.length){
          chosenChars = hw.examCharList;
        }
        if(!quizSize && hw.examQuizSize) quizSize = hw.examQuizSize;
      }
    }catch(e){}
  }

  // 如果没有发布时的字单（老版本布置或直接调用），临时按全字库抽
  if(!chosenChars){
    if(!quizSize || quizSize === 'all' || quizSize > pack.chars.length) quizSize = pack.chars.length;
    const allShuffled = pack.chars.slice().sort(()=>Math.random()-0.5);
    chosenChars = allShuffled.slice(0, quizSize);
  } else {
    // 用 hw 里的字，再随机打乱一次以避免每次顺序一样
    chosenChars = chosenChars.slice().sort(()=>Math.random()-0.5);
    if(!quizSize) quizSize = chosenChars.length;
  }

  // ★ 进度恢复：若本场测验有未完成的存档、且字集合与当前一致，则接着做
  const _savedProg = examLoadProgress(packKey, classCode, chosenChars);
  if(_savedProg){
    const passedSet = new Set(_savedProg.passed || []);
    const skippedSet = new Set(_savedProg.skipped || []);
    examState = {
      packKey, classCode,
      pack,
      quizSize,
      allChars: chosenChars.slice(),
      queue: chosenChars.filter(w => !passedSet.has(w.c) && !skippedSet.has(w.c)),
      passedSet,
      wrongOnceSet: new Set(_savedProg.wrongOnce || []),
      wrongInBankSet: new Set(_savedProg.wrongInBank || []),
      skippedSet,
      wrongCountMap: Object.assign({}, _savedProg.wrongCountMap || {}),
      currentChar: null,
      currentOptions: [],
      questionNum: _savedProg.questionNum || 0,
      correctNum: _savedProg.correctNum || 0,
      answered: false,
      _resumed: true,
    };
    showScreen('exam-quiz');
    examShowNext();
    return;
  }

  examState = {
    packKey, classCode,
    pack,
    quizSize,
    allChars: chosenChars.slice(),       // 老师布置的字（用作选项干扰项的池子）
    queue: chosenChars.slice(),          // 待考队列（答错会插回更多副本）
    passedSet: new Set(),                // 答对过的字
    wrongOnceSet: new Set(),             // 错过至少一次的字
    wrongInBankSet: new Set(),           // 已入错字本的字（错≥2次）
    skippedSet: new Set(),               // 连错 5 次被放过的字
    wrongCountMap: {},                   // 字 → 错次
    currentChar: null,                   // 当前考的字 obj {c, p}
    currentOptions: [],                  // 当前 8 个选项 obj[]
    questionNum: 0,                      // 已出过几道题
    correctNum: 0,                       // 累计答对次数
    answered: false,
  };
  showScreen('exam-quiz');
  examShowNext();
}

// ── 测验引擎 · 每题刷新模式 ────────────────────────
// 每答完一题（无论对错），整个屏幕的 8 个字全部消失，重新生成新的 8 个字。
// 学生无法靠"剩下哪个还没选"的记忆作弊，必须真听懂才能选对。

function examShowNext(){
  if(!examState) return;
  const st = examState;

  // 如果队列空 → 测验完成
  if(st.queue.length === 0){
    examShowResult();
    return;
  }

  // 从队列头部取出当前要考的字
  const current = st.queue.shift();
  st.currentChar = current;

  // 抽 7 个干扰项（从老师布置的字里随机抽，排除 currentChar）
  const pool = st.allChars.filter(w => w.c !== current.c);
  // 洗牌取 7 个（如果池子不足 7 个，全用上）
  const shuffled = pool.slice().sort(()=>Math.random()-0.5);
  const distractors = shuffled.slice(0, 7);

  // 8 个选项打乱顺序
  const options = [current].concat(distractors).sort(()=>Math.random()-0.5);
  st.currentOptions = options;
  st.questionNum += 1;
  st.answered = false;

  examRender();

  // 渲染完短暂停顿后播放读音
  setTimeout(()=> examPlayCurrent(), 300);
}

function examRender(){
  const el = document.getElementById('exam-quiz-content');
  if(!el || !examState) return;
  const st = examState;
  const totalChars = st.quizSize || st.allChars.length;
  const passed = st.passedSet.size;
  const skipped = (st.skippedSet||new Set()).size;
  const remaining = totalChars - passed - skipped;

  // 顶部信息
  let html = '<div style="text-align:center;padding:8px 0 16px;">'
    + '<div style="font-family:serif;font-size:20px;color:var(--ink);margin-bottom:4px;">'+st.pack.title+'</div>'
    + '<div style="font-size:12px;color:var(--muted);">📋 听音选字 · 每题随机出 8 个字<br><span style="font-size:11px;">Listen &amp; Pick · 8 random characters per question</span></div>'
    + '</div>';

  // ★ 恢复进度提示 + 重新开始入口（仅在本场是从存档恢复时显示）
  if(st._resumed){
    html += '<div style="display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;margin:-6px 0 14px;font-size:12px;color:var(--blue);background:var(--blue-light);border-radius:10px;padding:8px 12px;">'
      + '<span>↩️ 已恢复上次进度，继续作答</span>'
      + '<button onclick="examRestartFresh()" style="padding:3px 12px;font-size:11px;border-radius:6px;border:1px solid var(--blue);background:white;color:var(--blue);cursor:pointer;font-family:DM Sans,sans-serif;">重新开始</button>'
      + '</div>';
  }

  // 进度卡片
  html += '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;flex-wrap:wrap;">'
    + '<span class="exam-progress-pill" style="background:var(--gold-light);color:var(--gold);">⭐ 已答对 '+passed+' / '+totalChars+' · Correct</span>'
    + '<span class="exam-progress-pill" style="background:var(--blue-light);color:var(--blue);">📝 第 '+st.questionNum+' 题 · Question</span>'
    + '<span class="exam-progress-pill" style="background:var(--red-light);color:var(--red);">❗ 待答 '+remaining+' · Remaining</span>'
    + '</div>';

  // ─── 大方块容器：包住播放按钮 + 字块网格 ───
  html += '<div class="exam-frame">';

  // 播放区
  html += '<div style="text-align:center;margin-bottom:18px;">'
    + '<div id="exam-cur-label" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">听一听 · Listen</div>'
    + '<button class="exam-play-btn" id="exam-play-btn" onclick="examReplay()">'
    + '  <span style="font-size:20px;">🔊</span><span id="exam-play-text">播放 · Play</span>'
    + '</button>'
    + '</div>';

  // 字块网格 — 8 个，桌面 4 列，手机 2 列
  html += '<div id="exam-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
  st.currentOptions.forEach((w, i) => {
    html += '<div class="exam-tile" data-idx="'+i+'" onclick="examPickTile('+i+')">'
      + '<span class="ec">'+w.c+'</span>'
      + '</div>';
  });
  html += '</div>';

  html += '</div>'; // 关闭 .exam-frame

  // 移动端 2 列样式
  html += '<style>@media(max-width:560px){#exam-grid{grid-template-columns:repeat(2,1fr)!important;}.exam-tile .ec{font-size:48px!important;}}</style>';

  el.innerHTML = html;
}

function examPlayCurrent(){
  if(!examState) return;
  const st = examState;
  if(!st.currentChar) return;
  const btn = document.getElementById('exam-play-btn');
  const txt = document.getElementById('exam-play-text');
  if(btn) btn.classList.add('playing');
  if(txt) txt.textContent = '播放中… · Playing';
  if(typeof speakChinese === 'function'){
    speakChinese(st.currentChar.c, ()=>{
      if(btn) btn.classList.remove('playing');
      if(txt) txt.textContent = '再听一次 · Listen again';
    });
  }
}

function examReplay(){
  if(!examState) return;
  if(examState.answered) return; // 答完别再播
  examPlayCurrent();
}

function examPickTile(idx){
  if(!examState) return;
  const st = examState;
  if(st.answered) return;
  if(!st.currentChar) return;
  st.answered = true;

  const correctChar = st.currentChar.c;
  const pickedChar = st.currentOptions[idx].c;
  const tiles = document.querySelectorAll('#exam-grid .exam-tile');
  const correctIdx = st.currentOptions.findIndex(w => w.c === correctChar);

  if(pickedChar === correctChar){
    // 答对
    st.passedSet.add(correctChar);
    st.correctNum += 1;
    tiles[idx]?.classList.add('correct');
    tiles[idx]?.classList.add('disabled');
    if(typeof playCorrect === 'function') playCorrect();
    // 不再每题 +1 分（改为完成时一次性 +20）
    examSaveProgress();   // ★ 每答完一题写一次进度
    // 1 秒后下一题
    setTimeout(()=> examShowNext(), 1000);
  } else {
    // 答错：高亮错选 + 同时高亮正确答案
    tiles[idx]?.classList.add('wrong');
    if(correctIdx >= 0) tiles[correctIdx]?.classList.add('correct');
    if(typeof playWrong === 'function') playWrong();
    // 记录错次
    st.wrongCountMap[correctChar] = (st.wrongCountMap[correctChar]||0) + 1;
    const wrongCount = st.wrongCountMap[correctChar];
    // 错 ≥ 2 次才正式进入错字本
    if(wrongCount >= 2 && !st.wrongInBankSet.has(correctChar)){
      st.wrongInBankSet.add(correctChar);
      if(typeof addWrongChar === 'function'){
        addWrongChar(st.currentChar.c, st.currentChar.p||'', '', '识字测验', st.pack.title);
      }
    }
    st.wrongOnceSet.add(correctChar);

    // ★ 错字插回逻辑：
    //   错次数 < 5：在后续 queue 里维持至少 2 份这个字的副本（间隔不同位置）
    //   错次数 >= 5：放过，从队列彻底移除
    const MAX_RETRIES = 5;
    if(wrongCount < MAX_RETRIES){
      const alreadyInQueue = st.queue.filter(w => w.c === correctChar).length;
      const insertsNeeded = Math.max(0, 2 - alreadyInQueue);
      const targetCharObj = st.currentChar;
      for(let n = 0; n < insertsNeeded; n++){
        // 第 1 次插：5-10 题后；第 2 次插：12-17 题后
        const minOffset = 5 + n * 7;
        const range = 6;
        const offset = minOffset + Math.floor(Math.random() * range);
        const insertAt = Math.min(st.queue.length, offset);
        st.queue.splice(insertAt, 0, targetCharObj);
      }
    } else {
      // 放过：从 queue 清除残留
      st.queue = st.queue.filter(w => w.c !== correctChar);
      if(!st.skippedSet) st.skippedSet = new Set();
      st.skippedSet.add(correctChar);
    }
    examSaveProgress();   // ★ 每答完一题写一次进度
    // 1.5 秒后下一题（错时稍长，给学生消化时间）
    setTimeout(()=> examShowNext(), 1500);
  }
}

// 给当前学生加分
function examAddPoints(amount, reason){
  if(typeof currentUser === 'undefined' || !currentUser) return;
  if(typeof userKey !== 'function') return;
  try{
    let data = getUserData();
    if(!data.total) data.total = 0;
    if(!data.history) data.history = [];
    data.total += amount;
    // 写一条 history（完成测验时调用一次，写一条 +20 的记录）
    const entry = {

      date: new Date().toLocaleDateString('zh-CN'),
      lesson: (examState && examState.pack) ? examState.pack.title : '识字测验',
      mode: '识字测验',
      count: 1,
      pts: amount,
      classCode: (examState && examState.classCode) ? examState.classCode : SELF_CLASS_KEY,
      reason: (reason || '识字测验') + ' +' + amount + '分'
    
    };
    data.history.unshift(entry);
    saveUserData(data, [entry]);
  }catch(e){}
}

function examShowResult(){
  if(!examState) return;
  const st = examState;
  examClearProgress(st.packKey, st.classCode);   // ★ 完成即清除存档，下次为干净的新一次
  const totalChars = st.quizSize || st.allChars.length;
  const wrongCount = st.wrongOnceSet.size;
  const inBankCount = st.wrongInBankSet.size;
  const skippedCount = (st.skippedSet||new Set()).size;
  const pct = totalChars > 0 ? Math.round(((totalChars-wrongCount)/totalChars)*100) : 0;
  let emoji = '🌟', grade = 'S', gradeClass = 'grade-s';
  if(pct < 100){ emoji='⭐'; grade='A'; gradeClass='grade-a'; }
  if(pct < 80){ emoji='👍'; grade='B'; gradeClass='grade-b'; }
  if(pct < 60){ emoji='💪'; grade='C'; gradeClass='grade-c'; }

  // ★ 这一次完成 → 累加 attempts (在显示页面之前 +1)
  incrementExamAttempts(st.packKey, st.classCode);
  const attemptsDone = getExamAttempts(st.packKey, st.classCode);
  const canRetry = attemptsDone < EXAM_MAX_ATTEMPTS;

  // ★ 完成测验 → 一次性 +20 积分
  examAddPoints(20, '完成识字测验');

  // 构建字 → 拼音 的 map（用来播放）
  const charPinyinMap = {};
  st.allChars.forEach(w => { charPinyinMap[w.c] = w.p || ''; });

  const wrongList = Array.from(st.wrongOnceSet);
  let wrongHtml = '';
  if(wrongList.length){
    wrongHtml = '<div style="margin-top:22px;text-align:left;">'
      + '<div style="font-size:12px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">错过的字 ('+wrongList.length+') · 点击听读音</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">'
      + wrongList.map(c=>{
          const inBank = st.wrongInBankSet.has(c);
          const skipped = st.skippedSet && st.skippedSet.has(c);
          const bgColor = inBank ? 'var(--red-light)' : '#fff5e6';
          const borderColor = inBank ? 'rgba(192,57,43,0.3)' : '#f5d99a';
          const fontColor = inBank ? 'var(--red)' : 'var(--ink)';
          let badge = '';
          if(skipped) badge = '<span style="font-size:9px;background:var(--muted);color:white;padding:1px 5px;border-radius:8px;margin-left:4px;vertical-align:middle;">跳过</span>';
          else if(inBank) badge = '<span style="font-size:9px;background:var(--red);color:white;padding:1px 5px;border-radius:8px;margin-left:4px;vertical-align:middle;">已存</span>';
          return '<div onclick="examPlayCharByVal(\''+c+'\',this)" '
            + 'style="background:'+bgColor+';border:1.5px solid '+borderColor+';border-radius:10px;padding:10px 14px;'
            + 'font-family:\'KaiTi\',\'STKaiti\',\'楷体\',serif;font-size:26px;color:'+fontColor+';'
            + 'display:flex;align-items:center;gap:6px;cursor:pointer;transition:transform 0.15s;user-select:none;" '
            + 'onmouseover="this.style.transform=\'translateY(-2px)\'" '
            + 'onmouseout="this.style.transform=\'\'">'
            + '<span style="font-size:13px;opacity:0.55;">🔊</span>'+c+badge
            + '</div>';
        }).join('')
      + '</div>';

    // 说明文字
    const tips = [];
    if(inBankCount > 0) tips.push('📕 标"已存"的 '+inBankCount+' 个字已加入错字本（错 2 次以上）');
    if(skippedCount > 0) tips.push('💪 标"跳过"的 '+skippedCount+' 个字连错 5 次，先放一边以后再练');
    if(inBankCount === 0 && skippedCount === 0) tips.push('这些字只错了 1 次，没进错字本（错 2 次以上才会自动收录）');
    wrongHtml += '<div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.6;">' + tips.join('<br>') + '</div>';

    // ★ "去错字本继续复习" 链接（只有有错字才显示）
    wrongHtml += '<div style="margin-top:14px;text-align:center;">'
      + '<a href="javascript:void(0)" onclick="exitExamQuizToWrongChars()" '
      + 'style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:20px;'
      + 'border:1px solid var(--red);background:var(--red-light);color:var(--red);font-size:13px;'
      + 'font-weight:600;text-decoration:none;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s;" '
      + 'onmouseover="this.style.background=\'var(--red)\';this.style.color=\'white\'" '
      + 'onmouseout="this.style.background=\'var(--red-light)\';this.style.color=\'var(--red)\'">'
      + '📕 去错字本继续复习 →'
      + '</a></div>';

    wrongHtml += '</div>';
  } else {
    wrongHtml = '<div style="margin-top:22px;color:var(--green);font-size:14px;">🎉 太棒了！一个字都没错！</div>';
  }

  // 暂存 charPinyinMap 供点击时使用
  examState._charPinyinMap = charPinyinMap;

  // 次数提示
  const attemptsText = attemptsDone >= EXAM_MAX_ATTEMPTS
    ? '<div style="font-size:12px;color:var(--muted);margin-top:8px;">已完成 '+attemptsDone+' 次（每份作业最多做 '+EXAM_MAX_ATTEMPTS+' 次）</div>'
    : '<div style="font-size:12px;color:var(--muted);margin-top:8px;">这是第 '+attemptsDone+' 次完成 · 还可以再做 '+(EXAM_MAX_ATTEMPTS-attemptsDone)+' 次</div>';

  // 按钮区
  let buttonsHtml = '<div style="display:flex;gap:10px;margin-top:24px;">';
  if(canRetry){
    buttonsHtml += '<button onclick="examRetry()" style="flex:1;padding:13px;border-radius:14px;border:1px solid var(--border);background:white;color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">再来一次</button>';
  } else {
    buttonsHtml += '<button disabled style="flex:1;padding:13px;border-radius:14px;border:1px solid var(--border);background:var(--paper2);color:var(--muted);font-size:14px;font-weight:600;cursor:not-allowed;font-family:DM Sans,sans-serif;">已达上限</button>';
  }
  buttonsHtml += '<button onclick="exitExamQuiz()" style="flex:1;padding:13px;border-radius:14px;border:none;background:var(--ink);color:var(--paper);font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">完成</button>';
  buttonsHtml += '</div>';

  const el = document.getElementById('exam-quiz-content');
  if(el){
    el.innerHTML = '<div style="text-align:center;padding:30px 22px;background:white;border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);">'
      + '<div style="font-size:54px;margin-bottom:14px;">'+emoji+'</div>'
      + '<div style="font-family:serif;font-size:42px;color:var(--ink);line-height:1;margin-bottom:6px;">'+pct+'%</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-bottom:6px;">一次答对率 · First-Try Accuracy</div>'
      + '<div class="result-grade '+gradeClass+'" style="display:inline-block;padding:5px 16px;border-radius:30px;font-weight:600;font-size:13px;margin-bottom:14px;">等级 '+grade+'</div>'
      + '<div style="font-size:14px;color:var(--muted);">共 '+totalChars+' 字 · 错过 '+wrongCount+' 字</div>'
      + attemptsText
      + wrongHtml
      + buttonsHtml
      + '</div>';
  }

  // 记录到 hw_completion 让老师能看到完成度
  if(typeof currentUser !== 'undefined' && currentUser){
    try{
      const entry = {
        username: currentUser.username||currentUser.name,
        name: currentUser.name||currentUser.username,
        mode: '识字测验',
        pct: pct,
        date: new Date().toLocaleDateString('zh-CN'),
        ts: Date.now(),
        attempt: attemptsDone,
      };
      saveHWCompletion('__exam__:'+st.packKey, st.classCode, entry);
    }catch(e){}
  }
}

// "再来一次" 按钮：检查次数，若已达上限则不允许
function examRetry(){
  if(!examState) return;
  const attemptsDone = getExamAttempts(examState.packKey, examState.classCode);
  if(attemptsDone >= EXAM_MAX_ATTEMPTS){
    alert('已经做过 '+attemptsDone+' 次，达到上限（最多 '+EXAM_MAX_ATTEMPTS+' 次）');
    return;
  }
  startExamQuiz(examState.packKey, examState.classCode);
}

// 恢复进度时的"重新开始"：清掉本场存档后，从头重跑同一份测验
function examRestartFresh(){
  if(!examState) return;
  const pk = examState.packKey, cc = examState.classCode;
  examClearProgress(pk, cc);
  startExamQuiz(pk, cc);
}

// 结果页跳错字本
function exitExamQuizToWrongChars(){
  examState = null;
  if(typeof stopCurrentAudio === 'function') stopCurrentAudio();
  if(typeof stopVoice === 'function') stopVoice();
  if(typeof showWrongChars === 'function') showWrongChars();
  else { showScreen('wrong-chars'); if(typeof renderWrongChars==='function') renderWrongChars(); }
}

// 点结果页的错字 → 播读音
function examPlayCharByVal(c, btn){
  if(typeof speakChinese === 'function'){
    if(btn){
      const oldBg = btn.style.background;
      btn.style.boxShadow = '0 0 0 3px rgba(30,77,140,0.3)';
      speakChinese(c, ()=>{
        if(btn) btn.style.boxShadow = '';
      });
      setTimeout(()=>{ if(btn) btn.style.boxShadow = ''; }, 2000);
    } else {
      speakChinese(c);
    }
  }
}

// ── 测验 attempts 记录 · 同一份作业最多 2 次 ──
// 数据 key: czmd_exam_attempts_<userKey>_<packKey>_<classCode> = 数字（已做次数）
const EXAM_MAX_ATTEMPTS = 2;

function _examAttemptsKey(packKey, classCode){
  if(!currentUser) return null;
  const u = userKey(currentUser.name||currentUser.username, currentUser.classCode);
  return 'czmd_exam_attempts_'+u+'_'+packKey+'_'+classCode;
}

function getExamAttempts(packKey, classCode){
  const k = _examAttemptsKey(packKey, classCode);
  if(!k) return 0;
  return parseInt(localStorage.getItem(k)||'0', 10);
}

function incrementExamAttempts(packKey, classCode){
  const k = _examAttemptsKey(packKey, classCode);
  if(!k) return;
  const n = getExamAttempts(packKey, classCode) + 1;
  localStorage.setItem(k, String(n));
  const cacheKey = 'czmd_exam_attempts_cloud_cache';
  const counts = safeParseJSON(localStorage.getItem(cacheKey), {});
  counts[k] = n;
  localStorage.setItem(cacheKey, JSON.stringify(counts));
  cloudWriteRef(cloudStudentProgressRef('examAttempts'), {counts});
}

// ── 测验答题进度存档 · 中途退出可续做 ──
// 数据 key: czmd_exam_progress_<userKey>_<packKey>_<classCode>
//   按【学生】+【这场测验 hwKey】分键：同设备不同学生不串、不同测验不覆盖。
function _examProgressKey(packKey, classCode){
  if(!currentUser) return null;
  const u = userKey(currentUser.name||currentUser.username, currentUser.classCode);
  return 'czmd_exam_progress_'+u+'_'+packKey+'_'+classCode;
}

// 当前字集合的稳定签名（排序后按 c 拼接），用来校验存档是否对应同一套字
function _examCharSig(chars){
  return (chars||[]).map(w => w.c).slice().sort().join('');
}

function examSaveProgress(){
  if(!examState) return;
  const st = examState;
  const k = _examProgressKey(st.packKey, st.classCode);
  if(!k) return;
  const data = {
    v: 1,
    sig: _examCharSig(st.allChars),
    quizSize: st.quizSize,
    passed: Array.from(st.passedSet),
    skipped: Array.from(st.skippedSet || []),
    wrongOnce: Array.from(st.wrongOnceSet),
    wrongInBank: Array.from(st.wrongInBankSet),
    wrongCountMap: st.wrongCountMap,
    questionNum: st.questionNum,
    correctNum: st.correctNum,
    ts: Date.now(),
  };
  try{ localStorage.setItem(k, JSON.stringify(data)); }catch(e){}
}

// 读取存档：字集合不一致（老师重布置过）→ 丢弃；无实际进展 → 当作没有
function examLoadProgress(packKey, classCode, currentChars){
  const k = _examProgressKey(packKey, classCode);
  if(!k) return null;
  const saved = safeParseJSON(localStorage.getItem(k), null);
  if(!saved || !Array.isArray(saved.passed)) return null;
  if(saved.sig !== _examCharSig(currentChars)){
    examClearProgress(packKey, classCode);   // 字变了，旧进度作废
    return null;
  }
  if(!saved.questionNum) return null;         // 一题都没答过，无需恢复
  return saved;
}

function examClearProgress(packKey, classCode){
  const k = _examProgressKey(packKey, classCode);
  if(!k) return;
  try{ localStorage.removeItem(k); }catch(e){}
}

function exitExamQuiz(){
  examState = null;
  if(typeof stopCurrentAudio === 'function') stopCurrentAudio();
  if(typeof stopVoice === 'function') stopVoice();
  showScreen('char-test');
  if(typeof renderCharTestHome === 'function'){
    if(typeof ctHomeTab !== 'undefined') ctHomeTab = 'exam';
    renderCharTestHome();
  }
}

// ════════════════════════════════════════
// 识字测试 · CHARACTER QUIZ
// ════════════════════════════════════════

let ctQuizWords = [];    // words in current quiz
let ctCurrentIdx = 0;    // current word index
let ctScore = 0;         // correct count
let ctAnswered = false;  // whether current card is answered
let ctMode = '';         // 'pinyin' | 'meaning' | 'char'

function openCharTest(){
  showScreen('char-test');
  // 如果有未完成识字测验，默认进入识字测验 tab
  const refreshCharTest = ()=>{
    let hasPendingExam = false;
    if(currentUser){
      const classes = currentUser.classes && currentUser.classes.length
        ? currentUser.classes : [currentUser.classCode];
      const myExams = getAssignedHW().filter(a =>
        a.lessonId && a.lessonId.indexOf('__exam__:')===0 &&
        classes.includes(a.classCode) &&
        !isHWExpired(a)
      );
      if(typeof getExamAttempts === 'function' && typeof EXAM_MAX_ATTEMPTS !== 'undefined'){
        hasPendingExam = myExams.some(a => {
          const packKey = a.lessonId.replace('__exam__:','');
          return getExamAttempts(packKey, a.classCode) < EXAM_MAX_ATTEMPTS;
        });
      }
    }
    if(hasPendingExam) ctHomeTab = 'exam';
    renderCharTestHome();
  };
  refreshCharTest();
  // ★ 顺带从云端拉一次最新作业，这样老师刚布置的识字测验不必整页刷新也能出现。
  if(typeof loadSharedCloudCaches === 'function' && typeof cloudReadyForData === 'function' && cloudReadyForData()){
    loadSharedCloudCaches().then(()=>{
      if(document.getElementById('screen-char-test')?.classList.contains('active')) refreshCharTest();
    }).catch(()=>{});
  }
}

function openCharTestHome(){ showScreen('levelmap'); renderLevelMap(); }

// Six level tabs — global so all functions can access

let ctHomeTab = 'daily'; // 'daily' | 'exam'

function renderCharTestHome(){
  const el = document.getElementById('char-test-content');
  if(!el) return;

  // ─── 检查识字测验是否有未完成任务 ───
  let hasPendingExam = false;
  if(currentUser){
    const classes = currentUser.classes && currentUser.classes.length
      ? currentUser.classes : [currentUser.classCode];
    const myExams = getAssignedHW().filter(a =>
      a.lessonId && a.lessonId.indexOf('__exam__:')===0 &&
      classes.includes(a.classCode) &&
      !isHWExpired(a)
    );
    if(typeof getExamAttempts === 'function' && typeof EXAM_MAX_ATTEMPTS !== 'undefined'){
      hasPendingExam = myExams.some(a => {
        const packKey = a.lessonId.replace('__exam__:','');
        return getExamAttempts(packKey, a.classCode) < EXAM_MAX_ATTEMPTS;
      });
    } else {
      hasPendingExam = myExams.length > 0;
    }
  }

  // ─── Tab Bar（识字测验 在左 · 日常自测 在右；颜色统一白）───
  const baseTabStyle = 'flex:1;padding:18px 12px;border-radius:16px;background:white;font-size:18px;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s;position:relative;display:flex;align-items:center;justify-content:center;gap:6px;line-height:1.2;';
  const examActive = ctHomeTab==='exam';
  const dailyActive = ctHomeTab==='daily';
  const tabBar =
    '<div style="display:flex;gap:10px;margin-bottom:18px;">'
    // 左：识字测验
    + '<button data-ct-home-tab="exam" style="'+baseTabStyle+'border:2.5px solid '+(examActive?'var(--ink)':'var(--border)')+';color:'+(examActive?'var(--ink)':'var(--muted)')+';box-shadow:'+(examActive?'0 3px 0 rgba(0,0,0,0.18)':'0 1px 0 rgba(0,0,0,0.06)')+';">'
    +   '📋 识字测验'
    +   (hasPendingExam ? '<span style="position:absolute;top:8px;right:10px;width:14px;height:14px;background:var(--red);border-radius:50%;box-shadow:0 0 0 3px rgba(192,57,43,0.25);animation:taskPulse 1s infinite;"></span>' : '')
    + '</button>'
    // 右：日常自测
    + '<button data-ct-home-tab="daily" style="'+baseTabStyle+'border:2.5px solid '+(dailyActive?'var(--ink)':'var(--border)')+';color:'+(dailyActive?'var(--ink)':'var(--muted)')+';box-shadow:'+(dailyActive?'0 3px 0 rgba(0,0,0,0.18)':'0 1px 0 rgba(0,0,0,0.06)')+';">'
    +   '📝 日常自测'
    + '</button>'
    + '</div>';

  // ─── 动态规则块（根据 tab 切换内容）───
  let rulesHTML = '';
  if(ctHomeTab === 'exam'){
    // 识字测验规则
    rulesHTML = '<div style="padding:8px 0 16px;">'
      + '<div style="display:flex;align-items:flex-start;gap:14px;">'
      + '  <div style="text-align:center;flex-shrink:0;">'
      + '    <div style="font-size:36px;margin-bottom:4px;">📋</div>'
      + '    <div style="font-family:serif;font-size:20px;color:var(--ink);">识字测验</div>'
      + '    <div style="font-size:11px;color:var(--muted);">Character Test</div>'
      + '  </div>'
      + '  <div style="flex:1;background:var(--paper2);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--ink);line-height:1.8;border-left:3px solid var(--red);">'
      + '    <div style="font-weight:600;color:var(--red);margin-bottom:6px;font-size:13px;">📋 规则 · Rules</div>'
      + '    <div style="margin-bottom:3px;">📌 请认真及时完成老师布置的识字测试任务</div>'
      + '    <div style="margin-bottom:6px;color:var(--muted);font-size:12px;">Please complete the character test assigned by your teacher</div>'
      + '    <div style="margin-bottom:3px;">🔁 点错的字会重复出现多次</div>'
      + '    <div style="margin-bottom:6px;color:var(--muted);font-size:12px;">Wrong answers will reappear several times</div>'
      + '    <div style="margin-bottom:3px;">⭐ 完成本次测验，获得 20 个积分</div>'
      + '    <div style="margin-bottom:6px;color:var(--muted);font-size:12px;">Complete the test to earn 20 points</div>'
      + '    <div style="color:var(--red);font-weight:600;">同学们加油！ · Good luck!</div>'
      + '  </div>'
      + '</div>'
      + '</div>';
  } else {
    // 日常自测规则（原有的）
    rulesHTML = '<div style="padding:8px 0 16px;">'
      + '<div style="display:flex;align-items:flex-start;gap:14px;">'
      + '  <div style="text-align:center;flex-shrink:0;">'
      + '    <div style="font-size:36px;margin-bottom:4px;">🧪</div>'
      + '    <div style="font-family:serif;font-size:20px;color:var(--ink);">日常自测</div>'
      + '    <div style="font-size:11px;color:var(--muted);">Daily Quiz</div>'
      + '  </div>'
      + '  <div style="flex:1;background:var(--paper2);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--ink);line-height:1.8;border-left:3px solid var(--gold);">'
      + '    <div style="font-weight:600;color:var(--gold);margin-bottom:6px;font-size:13px;">📋 规则 · Rules</div>'
      + '    <div style="margin-bottom:3px;">🔊 听声音，点正确的字或词语</div>'
      + '    <div style="margin-bottom:6px;color:var(--muted);font-size:12px;">Listen and tap the correct character or word</div>'
      + '    <div style="margin-bottom:3px;">单数页 = 词语 · 双数页 = 单字</div>'
      + '    <div style="margin-bottom:6px;color:var(--muted);font-size:12px;">Odd pages = words · Even pages = single characters</div>'
      + '    <div style="color:var(--green);font-weight:600;">✅ 每完成一整页 +10 分 · +10 pts per page</div>'
      + '  </div>'
      + '</div>'
      + '</div>';
  }
  // 把规则放到屏幕顶部那个容器里
  const rulesEl = document.getElementById('char-test-rules');
  if(rulesEl) rulesEl.innerHTML = rulesHTML;

  let content = '';

  if(ctHomeTab === 'daily'){
    // Big level cards — 2 per row, 3 rows = 6 total（小一些）
    const LEVEL_ICONS = ['🌱','🌿','🍀','🌳','🌲','🎋'];
    const LEVEL_COLORS = [
      {border:'#fbbf24',bg:'#fffbeb',text:'#92400e'},
      {border:'#34d399',bg:'#ecfdf5',text:'#065f46'},
      {border:'#60a5fa',bg:'#eff6ff',text:'#1e40af'},
      {border:'#f472b6',bg:'#fdf2f8',text:'#9d174d'},
      {border:'#a78bfa',bg:'#f5f3ff',text:'#5b21b6'},
      {border:'#fb923c',bg:'#fff7ed',text:'#9a3412'},
    ];
    const levelCards = CT_CHAR_LEVELS.map((lv,i) => {
      const col = LEVEL_COLORS[i];
      const count = lv.chars.length;
      return '<div data-ct-level-enter="'+lv.key+'" style="background:'+col.bg+';border:2px solid '+col.border+';border-radius:16px;padding:18px 12px;text-align:center;cursor:pointer;box-shadow:0 2px 0 '+col.border+';transition:transform 0.15s;">'
        + '<div style="font-size:26px;margin-bottom:6px;">'+LEVEL_ICONS[i]+'</div>'
        + '<div style="font-size:16px;font-weight:700;color:'+col.text+';margin-bottom:2px;">'+lv.label+'</div>'
        + '<div style="font-size:11px;color:'+col.text+';opacity:0.7;">'+(count>0?count+' 个汉字':'待添加')+'</div>'
        + '</div>';
    }).join('');

    content = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+levelCards+'</div>';
  } else {
    // 识字测验 tab — teacher-assigned exams
    content = renderStudentExamList();
  }

  el.innerHTML = tabBar + content;

  // Tab switching
  el.querySelectorAll('[data-ct-home-tab]').forEach(btn=>{
    btn.onclick = function(){ ctHomeTab = this.dataset.ctHomeTab; renderCharTestHome(); };
  });

  // Level card → directly start quiz
  el.querySelectorAll('[data-ct-level-enter]').forEach(card=>{
    card.onmouseover = function(){ this.style.transform='translateY(-3px)'; };
    card.onmouseout  = function(){ this.style.transform=''; };
    card.onclick = function(){
      window.ctDailyLevel = this.dataset.ctLevelEnter;
      startCharTest('level', 'char');
    };
  });
}

function startCharTest(pool, mode){
  ctMode = mode;
  ctCurrentIdx = 0;
  ctScore = 0;
  ctAnswered = false;

  // Build word pool
  let words = [];
  if(pool === 'wrong'){
    const key = 'czmd_wrong_chars_' + (currentUser ? userKey(currentUser.name, currentUser.classCode) : 'guest');
    try{ const data = JSON.parse(localStorage.getItem(key)||'{}');
      words = Object.values(data).flat().filter(Boolean);
    }catch(e){}
    if(!words.length){
      alert('还没有错字记录！先去做练习吧。\nNo wrong chars yet — do some exercises first!');
      return;
    }
  } else if(pool === 'level'){
    const levelKey = window.ctDailyLevel || 'l1';
    const lvData = CT_CHAR_LEVELS.find(l=>l.key===levelKey);
    if(!lvData || !lvData.chars.length){
      alert('该阶汉字数据还未添加，请等待老师更新。');
      return;
    }
    // Use the full page-based quiz for available daily quiz levels.
    if(['l1','l2','l3','l4','l5','l6'].includes(levelKey)){
      renderQuizForLevel(levelKey, mode);
      return;
    }
    words = lvData.chars.map(c=>({char:c,pinyin:'',meaning:''}));
    words = words.sort(()=>Math.random()-0.5).slice(0,20);
  } else {
    NATIVE_LESSONS.forEach(l => {
      (l.words||[]).forEach(w => { if(w.char) words.push(w); });
    });
    words = words.sort(()=>Math.random()-0.5).slice(0, 20);
  }

  ctQuizWords = words;
  renderCharTestQuiz();
}

function renderCharTestQuiz(){
  const el = document.getElementById('char-test-content');
  if(!el) return;

  if(ctCurrentIdx >= ctQuizWords.length){
    // Show results
    const total = ctQuizWords.length;
    const pct = Math.round(ctScore/total*100);
    const emoji = pct>=90?'🌟':pct>=70?'⭐':'💪';
    const pts = pct>=90?10:pct>=70?6:3;

    // Award points
    if(currentUser){
      const data = getUserData();
      data.total = (data.total||0) + pts;
      if(!data.history) data.history=[];
      data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:'识字测试',mode:'识字测试',count:total,pts,reason:'识字测试 +'+pts+'分'});
      saveUserData(data);
    }

    el.innerHTML =
      '<div style="background:white;border:2px solid var(--green);border-radius:20px;padding:32px;text-align:center;">'
      +'<div style="font-size:64px;margin-bottom:12px;">'+emoji+'</div>'
      +'<div style="font-size:24px;font-weight:700;color:var(--green);margin-bottom:8px;">测试完成！</div>'
      +'<div style="font-size:15px;color:var(--muted);margin-bottom:4px;">Quiz Complete!</div>'
      +'<div style="font-size:32px;font-weight:800;color:var(--ink);margin:16px 0;">'+ctScore+' / '+total+'</div>'
      +'<div style="font-size:14px;color:var(--muted);margin-bottom:20px;">正确率 '+pct+'%</div>'
      +'<div style="background:var(--gold-light);border:2px solid var(--gold);border-radius:16px;padding:12px;display:inline-block;margin-bottom:20px;">'
      +'<div style="font-size:32px;font-weight:800;color:var(--gold);">+'+pts+'</div>'
      +'<div style="font-size:12px;color:var(--gold);">积分</div>'
      +'</div>'
      +'<div style="display:flex;gap:10px;justify-content:center;">'
      +'<button onclick="renderCharTestHome()" style="padding:11px 22px;border-radius:30px;border:1px solid var(--border);background:white;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;">再来一次</button>'
      +'<button onclick="openCharTestHome()" style="padding:11px 22px;border-radius:30px;border:none;background:var(--green);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:13px;">返回主页</button>'
      +'</div></div>';
    return;
  }

  const word = ctQuizWords[ctCurrentIdx];
  const total = ctQuizWords.length;
  const progress = Math.round(ctCurrentIdx/total*100);

  // Progress bar
  let cardHtml = '<div style="margin-bottom:16px;">'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px;">'
    +'<span>第 '+(ctCurrentIdx+1)+' / '+total+' 题</span>'
    +'<span>✅ '+ctScore+' 正确</span>'
    +'</div>'
    +'<div style="background:var(--border);border-radius:10px;height:6px;">'
    +'<div style="background:var(--green);border-radius:10px;height:6px;width:'+progress+'%;transition:width 0.3s;"></div>'
    +'</div></div>';

  if(ctMode === 'pinyin' || ctMode === 'meaning'){
    // Show char, student taps to reveal answer
    const label = ctMode==='pinyin' ? '这个字怎么读？What is the pinyin?' : '这个字是什么意思？What does it mean?';
    const answer = ctMode==='pinyin' ? (word.pinyin||'?') : (word.meaning||word.pinyin||'?');

    cardHtml +=
      '<div style="background:white;border:2px solid var(--border);border-radius:20px;padding:28px;text-align:center;">'
      +'<div style="font-size:13px;color:var(--muted);margin-bottom:20px;">'+label+'</div>'
      +'<div style="font-family:Noto Serif SC,serif;font-size:80px;font-weight:700;color:var(--ink);margin-bottom:24px;">'+word.char+'</div>'
      +(ctAnswered
        ? '<div style="font-size:28px;font-weight:700;color:var(--blue);margin-bottom:24px;">'+answer+'</div>'
          +'<div style="font-size:14px;color:var(--muted);margin-bottom:20px;">你答对了吗？Did you get it right?</div>'
          +'<div style="display:flex;gap:10px;justify-content:center;">'
          +'<button onclick="ctAnswer(false)" style="flex:1;max-width:140px;padding:12px;border-radius:14px;border:2px solid var(--red);background:var(--red-light);color:var(--red);font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">❌ 答错了</button>'
          +'<button onclick="ctAnswer(true)" style="flex:1;max-width:140px;padding:12px;border-radius:14px;border:2px solid var(--green);background:var(--green-light);color:var(--green);font-size:14px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">✅ 答对了</button>'
          +'</div>'
        : '<button onclick="ctReveal()" style="padding:14px 32px;border-radius:30px;border:none;background:var(--blue);color:white;font-size:15px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;">👁️ 显示答案</button>'
      )
      +'</div>';
  } else if(ctMode === 'char'){
    // Show pinyin, pick the right char from 4 options
    const pinyin = word.pinyin||word.char;
    // Generate distractors from other words
    const allWords = [];
    NATIVE_LESSONS.forEach(l=>(l.words||[]).forEach(w=>{ if(w.char&&w.char!==word.char) allWords.push(w); }));
    const distractors = allWords.sort(()=>Math.random()-0.5).slice(0,3).map(w=>w.char);
    const options = [word.char, ...distractors].sort(()=>Math.random()-0.5);

    cardHtml +=
      '<div style="background:white;border:2px solid var(--border);border-radius:20px;padding:28px;text-align:center;">'
      +'<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">选出拼音对应的汉字 · Choose the correct character</div>'
      +'<div style="font-size:48px;font-weight:700;color:var(--blue);margin-bottom:28px;font-family:DM Sans,sans-serif;">'+pinyin+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="ct-options">'
      +options.map(ch =>
        '<button data-chosen="'+ch+'" data-correct="'+word.char+'" '
        +'style="padding:20px;border-radius:14px;border:2px solid var(--border);background:white;font-family:Noto Serif SC,serif;font-size:40px;cursor:pointer;transition:all 0.15s;" '
        +'id="ct-opt-'+ch+'">'+ch+'</button>'
      ).join('')
      +'</div></div>';
  }

  el.innerHTML = cardHtml;

  // Attach char pick handlers
  el.querySelectorAll('[data-chosen]').forEach(btn=>{
    btn.onclick = function(){ ctPickChar(this.dataset.chosen, this.dataset.correct); };
  });
}

function ctReveal(){
  ctAnswered = true;
  renderCharTestQuiz();
}

function ctAnswer(correct){
  if(correct) ctScore++;
  ctAnswered = false;
  ctCurrentIdx++;
  renderCharTestQuiz();
}

function ctPickChar(chosen, correct){
  // Disable all buttons
  document.querySelectorAll('#ct-options button').forEach(btn=>{ btn.style.pointerEvents='none'; });
  const chosenBtn = document.getElementById('ct-opt-'+chosen);
  const correctBtn = document.getElementById('ct-opt-'+correct);
  if(chosenBtn) chosenBtn.style.background = chosen===correct ? '#d1fae5' : '#fee2e2';
  if(chosen===correct){ ctScore++; if(correctBtn) correctBtn.style.borderColor='var(--green)'; }
  else if(correctBtn){ correctBtn.style.background='#d1fae5'; correctBtn.style.borderColor='var(--green)'; }
  setTimeout(()=>{ ctAnswered=false; ctCurrentIdx++; renderCharTestQuiz(); }, 900);
}


// ════════════════════════════════════════
// 通用识字测试 · DAILY LEVEL CHARACTER QUIZ
// 单页=词，双页=字；没有词语的 level 会只出单字页
// ════════════════════════════════════════

let levelQuizSession = null; // {levelKey, levelLabel, pages, pageIdx, wrongItems}
const LEVEL_QUIZ_SESSION_VERSION = '2026-05-27-l2-12-word-pages';

function _levelQuizSessionVersion(levelKey){
  if(levelKey === 'l3') return '2026-05-27-l3-full-pages-v2';
  if(levelKey === 'l4') return '2026-05-28-l4-216-v2';
  if(levelKey === 'l5') return '2026-05-28-l5-216-v2';
  if(levelKey === 'l6') return '2026-05-28-l6-216-v2';
  return LEVEL_QUIZ_SESSION_VERSION;
}

// ── 测验中断恢复（每个 level 独立存档） ──
function _levelQuizSessionKey(levelKey){
  if(!currentUser) return null;
  const u = userKey(currentUser.name||currentUser.username, currentUser.classCode);
  return 'czmd_' + levelKey + '_session_' + u;
}

function _saveLevelQuizSession(){
  if(!levelQuizSession) return;
  const k = _levelQuizSessionKey(levelQuizSession.levelKey);
  if(!k) return;
  try{
    // 只存可序列化的部分（_target 是临时字段不存）
    const snapshot = {
      levelKey: levelQuizSession.levelKey,
      levelLabel: levelQuizSession.levelLabel,
      version: _levelQuizSessionVersion(levelQuizSession.levelKey),
      pages: levelQuizSession.pages,
      pageIdx: levelQuizSession.pageIdx,
      itemIdx: levelQuizSession.itemIdx||0,
      wrongItems: levelQuizSession.wrongItems,
      score: levelQuizSession.score,
      total: levelQuizSession.total,
      pageScore: levelQuizSession.pageScore||0,
      savedAt: Date.now(),
    };
    localStorage.setItem(k, JSON.stringify(snapshot));
    const cacheKey = 'czmd_level_sessions_cloud_cache';
    const sessions = safeParseJSON(localStorage.getItem(cacheKey), {});
    sessions[k] = snapshot;
    localStorage.setItem(cacheKey, JSON.stringify(sessions));
    cloudWriteRef(cloudStudentProgressRef('levelQuizSessions'), {sessions});
  }catch(e){}
}

function _loadLevelQuizSession(levelKey){
  const k = _levelQuizSessionKey(levelKey);
  if(!k) return null;
  try{
    const raw = localStorage.getItem(k);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}

function _clearLevelQuizSession(levelKey){
  const k = _levelQuizSessionKey(levelKey);
  if(k){
    localStorage.removeItem(k);
    const cacheKey = 'czmd_level_sessions_cloud_cache';
    const sessions = safeParseJSON(localStorage.getItem(cacheKey), {});
    sessions[k] = null;
    localStorage.setItem(cacheKey, JSON.stringify(sessions));
    cloudWriteRef(cloudStudentProgressRef('levelQuizSessions'), {sessions});
  }
}

function shuffleArr(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function renderQuizForLevel(levelKey, mode){
  const lv = CT_CHAR_LEVELS.find(l=>l.key===levelKey);
  if(!lv || !lv.chars || !lv.chars.length){
    alert('该阶汉字数据还未添加，请等待老师更新。');
    return;
  }

  // ★ FIX (Bug 2): 检查有没有未完成的存档
  const saved = _loadLevelQuizSession(levelKey);
  const expectedVersion = _levelQuizSessionVersion(levelKey);
  const versionedLevel = ['l2','l3','l4','l5','l6'].includes(levelKey);
  if(saved && versionedLevel && saved.version !== expectedVersion){
    _clearLevelQuizSession(levelKey);
  }
  const usableSaved = saved && !(versionedLevel && saved.version !== expectedVersion) ? saved : null;
  if(usableSaved && usableSaved.pages && usableSaved.pageIdx < usableSaved.pages.length){
    // 计算已做了多少
    const totalItems = usableSaved.pages.reduce((s,p)=>s+p.items.length, 0);
    const doneItems = usableSaved.pages.slice(0, usableSaved.pageIdx).reduce((s,p)=>s+p.items.length, 0) + (usableSaved.itemIdx||0);
    const ago = Math.round((Date.now() - (usableSaved.savedAt||0))/60000);
    const agoText = ago < 1 ? '刚刚' : ago < 60 ? ago+' 分钟前' : Math.round(ago/60)+' 小时前';
    const choice = confirm(
      '发现未完成的测验 · Unfinished quiz found\n\n'
      + '上次进度：第 '+(saved.pageIdx+1)+' 页 · 已答 '+doneItems+'/'+totalItems+' 题\n'
      + '保存时间：'+agoText+'\n\n'
      + '点 "确定" 继续上次的进度\n'
      + '点 "取消" 重新开始'
    );
    if(choice){
      levelQuizSession = {
        levelKey: usableSaved.levelKey || levelKey,
        levelLabel: usableSaved.levelLabel || lv.label,
        pages: usableSaved.pages,
        pageIdx: usableSaved.pageIdx,
        itemIdx: usableSaved.itemIdx||0,
        wrongItems: usableSaved.wrongItems || [],
        score: usableSaved.score || 0,
        total: usableSaved.total || 0,
        paused: false,
        pageScore: usableSaved.pageScore || 0,
      };
      renderLevelQuizPage();
      return;
    } else {
      _clearLevelQuizSession(levelKey);
    }
  }

  const shuffledWords = shuffleArr(lv.words||[]);
  const shuffledChars = shuffleArr(lv.chars);

  // Build alternating pages: odd=词组, even=单字 (12 per page = 3 rows × 4 cols)
  const pages = [];
  const PERPAGE = 12;
  if(['l2','l3','l4','l5','l6'].includes(levelKey) && shuffledWords.length){
    const fullPagesOnly = ['l3','l4','l5','l6'].includes(levelKey);
    const charSource = fullPagesOnly
      ? shuffledChars.slice(0, Math.floor(shuffledChars.length/PERPAGE)*PERPAGE)
      : shuffledChars;
    const charPages = [];
    for(let ci=0; ci<charSource.length; ci+=PERPAGE){
      charPages.push({type:'char', items:charSource.slice(ci, ci+PERPAGE)});
    }
    const wordLimit = fullPagesOnly && charPages.length
      ? charPages.length * PERPAGE
      : (charPages.length ? charPages.length * PERPAGE : shuffledWords.length);
    const quizWords = shuffledWords.slice(0, wordLimit);
    const wordPageCount = Math.ceil(quizWords.length/PERPAGE);
    const wordPages = [];
    for(let wi=0; wi<quizWords.length; wi+=PERPAGE){
      wordPages.push({type:'word', items:quizWords.slice(wi, wi+PERPAGE)});
    }
    for(let i=0; i<Math.max(wordPages.length, charPages.length); i++){
      if(wordPages[i]) pages.push(wordPages[i]);
      if(charPages[i]) pages.push(charPages[i]);
    }
  } else {
    let ci=0, wi=0;
    let pageNum = 1;
    while(wi < shuffledWords.length || ci < shuffledChars.length){
      if(pageNum % 2 === 1){
        // Odd page: 词组
        const slice = shuffledWords.slice(wi, wi+PERPAGE);
        if(slice.length) pages.push({type:'word', items:slice});
        wi += PERPAGE;
      } else {
        // Even page: 单字
        const slice = shuffledChars.slice(ci, ci+PERPAGE);
        if(slice.length) pages.push({type:'char', items:slice});
        ci += PERPAGE;
      }
      pageNum++;
    }
  }

  levelQuizSession = {levelKey, levelLabel:lv.label, pages, pageIdx:0, wrongItems:[], score:0, total:0, paused:false, pageScore:0};
  _saveLevelQuizSession();
  renderLevelQuizPage();
}

function renderL1Quiz(mode){
  renderQuizForLevel('l1', mode);
}

function renderLevelQuizPage(){
  const el = document.getElementById('char-test-content');
  if(!el || !levelQuizSession) return;
  const {pages, pageIdx} = levelQuizSession;
  if(pageIdx >= pages.length){
    renderLevelQuizResults();
    return;
  }
  const page = pages[pageIdx];
  const isChar = page.type === 'char';
  const totalPages = pages.length;

  if(!levelQuizSession.itemIdx) levelQuizSession.itemIdx = 0;
  if(levelQuizSession.itemIdx >= page.items.length){
    // Page complete — award 10 pts
    levelQuizSession.pageScore = (levelQuizSession.pageScore||0) + 10;
    levelQuizSession.pageIdx++;
    levelQuizSession.itemIdx = 0;
    // Save points for completed page
    if(currentUser){
      const data = getUserData();
      data.total = (data.total||0) + 10;
      if(!data.history) data.history=[];
      data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:levelQuizSession.levelLabel+'识字',mode:'识字测试',count:page.items.length,pts:10,reason:'完成一页识字测试 +10分'});
      saveUserData(data);
    }
    renderLevelQuizPage();
    return;
  }

  const items = page.items;
  const target = items[levelQuizSession.itemIdx];
  const others = items.filter(x=>x!==target);
  const distractors = shuffleArr(others).slice(0,19);
  const grid = shuffleArr([target, ...distractors]);

  // Progress bar
  const pct = Math.round(pageIdx/totalPages*100);
  const pageProgress = Math.round(levelQuizSession.itemIdx/items.length*100);

  // Progress bar (slim, at top)
  let html =
    '<div style="margin-bottom:10px;">'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px;">'
    +'<span>'+levelQuizSession.levelLabel+' · '+(isChar?'单字 Single Chars':'词语 Words')+' · 第'+(pageIdx+1)+'/'+totalPages+'页</span>'
    +'<span>'+(levelQuizSession.itemIdx+1)+'/'+items.length+' · ❌'+levelQuizSession.wrongItems.length+'</span>'
    +'</div>'
    +'<div style="background:var(--border);border-radius:6px;height:5px;">'
    +'<div style="background:var(--gold);border-radius:6px;height:5px;width:'+pageProgress+'%;transition:width 0.3s;"></div>'
    +'</div></div>';

  // Instruction + replay button row
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">'
    +'<div style="background:var(--blue-light);border-radius:10px;padding:8px 14px;font-size:13px;color:var(--blue);flex:1;">'
    +'🔊 '+(isChar?'听音找字 · Tap the correct character':'听音找词 · Tap the correct word')+'</div>'
    +'<button onclick="l1PlayTarget()" style="padding:8px 16px;border-radius:20px;border:2px solid var(--blue);background:var(--blue-light);color:var(--blue);font-size:13px;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;flex-shrink:0;">🔊 再听</button>'
    +'</div>';

  // PAUSE BUTTON — prominent, centered
  html += '<div style="text-align:center;margin-bottom:14px;">'
    +'<button id="l1-pause-btn" style="padding:9px 28px;border-radius:30px;border:1.5px solid var(--border);background:white;font-size:13px;font-weight:500;cursor:pointer;font-family:DM Sans,sans-serif;color:var(--muted);">⏸ 暂停 · Pause</button>'
    +'</div>';

  // Grid — 4 cols × 3 rows = 12 cells, 楷体, 大字
  const fontSize = isChar ? '56px' : '36px';
  const cellPad = isChar ? '28px 6px' : '24px 6px';
  const mobileFontSize = isChar ? '46px' : '28px';
  html += '<div id="l1-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">'
    + grid.map(item =>
        '<button data-l1-item="'+item+'" data-l1-target="'+target+'" '
        +'style="background:white;border:2px solid var(--border);border-radius:16px;'
        +'font-size:'+fontSize+';padding:'+cellPad+';'
        +'font-family:KaiTi,楷体,STKaiti,serif;cursor:pointer;transition:all 0.15s;'
        +'font-weight:500;color:var(--ink);line-height:1.2;'
        +'box-shadow:0 2px 0 rgba(0,0,0,0.08);">'+item+'</button>'
      ).join('')
    +'</div>';
  // 手机端 3 列以保证可点
  html += '<style>@media(max-width:560px){#l1-grid{grid-template-columns:repeat(3,1fr)!important;}#l1-grid button{font-size:'+mobileFontSize+'!important;padding:18px 4px!important;}}</style>';

  el.innerHTML = html;
  levelQuizSession._target = target;

  // Pause button
  document.getElementById('l1-pause-btn').onclick = function(){
    speechSynthesis.cancel();
    levelQuizSession.paused = true;
    renderLevelQuizPaused();
  };

  // Answer buttons
  el.querySelectorAll('[data-l1-item]').forEach(btn=>{
    btn.onclick = function(){
      levelQuizHandleAnswer(this.dataset.l1Item, this.dataset.l1Target, el);
    };
  });

  // Auto play TTS
  setTimeout(()=>{
    speechSynthesis.cancel();
    setTimeout(()=>{
      const utt = new SpeechSynthesisUtterance(target);
      utt.lang='zh-CN'; utt.rate=0.6; utt.pitch=1.0; utt.volume=1;
      speechSynthesis.speak(utt);
    }, 150);
  }, 400);
}

function renderLevelQuizPaused(){
  const el = document.getElementById('char-test-content');
  if(!el) return;
  el.innerHTML =
    '<div style="text-align:center;padding:48px 24px;background:white;border-radius:20px;border:2px solid var(--gold);">'
    +'<div style="font-size:56px;margin-bottom:16px;">⏸</div>'
    +'<div style="font-size:20px;font-weight:600;color:var(--ink);margin-bottom:8px;">已暂停</div>'
    +'<div style="font-size:13px;color:var(--muted);margin-bottom:24px;">完成一整页可获得 <strong style="color:var(--gold);">+10分</strong></div>'
    +'<div style="display:flex;gap:10px;justify-content:center;">'
    +'<button onclick="renderCharTestHome()" style="padding:12px 24px;border-radius:30px;border:1px solid var(--border);background:white;cursor:pointer;font-family:DM Sans,sans-serif;font-size:14px;">退出</button>'
    +'<button onclick="levelQuizSession.paused=false;renderLevelQuizPage();" style="padding:12px 24px;border-radius:30px;border:none;background:var(--gold);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:14px;">▶ 继续</button>'
    +'</div></div>';
}

window.l1PlayTarget = function(){
  if(!levelQuizSession || !levelQuizSession._target) return;
  const utt = new SpeechSynthesisUtterance(levelQuizSession._target);
  utt.lang='zh-CN'; utt.rate=0.65; utt.pitch=1.0; utt.volume=1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
};

function levelQuizHandleAnswer(chosen, correct, el){
  // Disable all buttons
  el.querySelectorAll('[data-l1-item]').forEach(b=>{ b.style.pointerEvents='none'; });
  const isCorrect = chosen === correct;
  levelQuizSession.total++;

  if(isCorrect){
    levelQuizSession.score++;
    const btn = el.querySelector('[data-l1-item="'+chosen+'"]');
    if(btn){ btn.style.background='#d1fae5'; btn.style.borderColor='var(--green)'; }
    if(typeof playCorrect === 'function') playCorrect();
  } else {
    // Wrong answer
    const wrongBtn = el.querySelector('[data-l1-item="'+chosen+'"]');
    const correctBtn = el.querySelector('[data-l1-item="'+correct+'"]');
    if(wrongBtn){ wrongBtn.style.background='#fee2e2'; wrongBtn.style.borderColor='var(--red)'; }
    if(correctBtn){ correctBtn.style.background='#d1fae5'; correctBtn.style.borderColor='var(--green)'; }
    if(typeof playWrong === 'function') playWrong();
    // Record wrong item
    levelQuizSession.wrongItems.push(correct);
    // ★ FIX (Bug 1): 用正规 addWrongChar 接现有错字本系统
    // （旧代码用了错的 key 和错的格式，错字本读不到）
    if(typeof addWrongChar === 'function'){
      // 判断是单字还是词组
      const isCharItem = /^[\u4e00-\u9fff]$/.test(correct);
      const src = isCharItem ? '日常自测·单字' : '日常自测·词语';
      // 如果是词组，把每个字都加一次；如果是单字，加一次
      if(isCharItem){
        addWrongChar(correct, '', '', src, levelQuizSession.levelLabel+'识字');
      } else {
        // 词组：拆字加入
        Array.from(correct).forEach(c => {
          if(/[\u4e00-\u9fff]/.test(c)) addWrongChar(c, '', '', src, levelQuizSession.levelLabel+'识字 · '+correct);
        });
      }
    }
  }

  // Next item after brief delay
  setTimeout(()=>{
    levelQuizSession.itemIdx = (levelQuizSession.itemIdx||0) + 1;
    _saveLevelQuizSession();  // ★ FIX (Bug 2): 每答完一题就存档
    renderLevelQuizPage();
  }, isCorrect ? 500 : 1000);
}

function renderLevelQuizResults(){
  const el = document.getElementById('char-test-content');
  if(!el) return;
  // ★ FIX (Bug 2): 完成 → 清除存档
  _clearLevelQuizSession(levelQuizSession.levelKey);
  const {score, total, wrongItems, levelKey, levelLabel} = levelQuizSession;
  const pct = total>0 ? Math.round(score/total*100) : 0;
  const emoji = pct>=90?'🌟':pct>=70?'⭐':'💪';
  const pts = pct>=90?15:pct>=70?10:5;

  // Award points
  if(currentUser){
    const data = getUserData();
    data.total = (data.total||0) + pts;
    if(!data.history) data.history=[];
    data.history.unshift({date:new Date().toLocaleDateString('zh-CN'),lesson:levelLabel+'识字测试',mode:'识字测试',count:total,pts,reason:levelLabel+'识字测试 +'+pts+'分'});
    saveUserData(data);
  }

  el.innerHTML =
    '<div style="background:white;border:2px solid var(--green);border-radius:20px;padding:32px;text-align:center;">'
    +'<div style="font-size:64px;margin-bottom:12px;">'+emoji+'</div>'
    +'<div style="font-size:24px;font-weight:700;color:var(--green);margin-bottom:4px;">测试完成！</div>'
    +'<div style="font-size:32px;font-weight:800;color:var(--ink);margin:16px 0;">'+score+' / '+total+'</div>'
    +'<div style="font-size:14px;color:var(--muted);margin-bottom:16px;">正确率 '+pct+'%</div>'
    +(wrongItems.length>0
      ? '<div style="background:var(--red-light);border-radius:12px;padding:12px;margin-bottom:16px;text-align:left;">'
        +'<div style="font-size:12px;color:var(--red);font-weight:600;margin-bottom:8px;">❌ 错误的字/词（'+wrongItems.length+'个）：</div>'
        +'<div style="font-size:20px;font-family:Noto Serif SC,serif;line-height:2;color:var(--red);">'+[...new Set(wrongItems)].join(' ')+'</div>'
        +'</div>'
      : '')
    +'<div style="background:var(--gold-light);border:2px solid var(--gold);border-radius:16px;padding:12px;display:inline-block;margin-bottom:20px;">'
    +'<div style="font-size:32px;font-weight:800;color:var(--gold);">+'+pts+'</div>'
    +'<div style="font-size:12px;color:var(--gold);">积分</div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;">'
    +'<button onclick="renderCharTestHome()" style="padding:11px 22px;border-radius:30px;border:1px solid var(--border);background:white;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px;">返回</button>'
    +'<button onclick="renderQuizForLevel(\''+levelKey+'\')" style="padding:11px 22px;border-radius:30px;border:none;background:var(--gold);color:white;cursor:pointer;font-family:DM Sans,sans-serif;font-weight:600;font-size:13px;">再来一次</button>'
    +'</div></div>';
}

(function boot(){
  try {
    // Pre-seed test account
    const users = loadUsers();
    const testKey = '石浩祺:z1';
    if(!users[testKey]){
      users[testKey] = {name:'石浩祺', classCode:'Z1', classes:['Z1'], bg:null};
      localStorage.setItem('czmd_users', JSON.stringify(users));
    }
    // Seed all student accounts from Excel import
    seedStudentAccounts();
    // Load any extra teachers added by admin
  const extraTeachers = JSON.parse(localStorage.getItem('czmd_teacher_accounts')||'{}');
  Object.assign(TEACHER_ACCOUNTS, extraTeachers);

  // Load custom rewards if admin has configured them
  initRewards();

  // Check for returning admin session
  const savedAdmin = localStorage.getItem('czmd_admin');
  if(savedAdmin){
    try{
      currentAdmin = JSON.parse(savedAdmin);
      if(currentAdmin){
        loadSharedCloudCaches().then(()=>renderAdminDashboard());
        showScreen('admin'); renderAdminDashboard(); return;
      }
    }catch(e){}
  }

  // Check for returning teacher session
    const savedTeacher = localStorage.getItem('czmd_teacher');
    if(savedTeacher){
      try{
        currentTeacher = JSON.parse(savedTeacher);
        if(currentTeacher && currentTeacher.name){
          teacherSelectedClass = currentTeacher.classes[0];
          loadSharedCloudCaches().then(()=>renderTeacherDashboard());
          showScreen('teacher'); renderTeacherDashboard(); return;
        }
      }catch(e){ currentTeacher = null; }
    }
    // Check for returning student
    const saved = localStorage.getItem('czmd_current_user');
    if(saved){
      try{
        currentUser = JSON.parse(saved);
        if(currentUser && currentUser.bg){
          userLang = currentUser.bg;
          loadStudentCloudCaches().then(()=>{
            if(typeof renderHome === 'function' && document.getElementById('screen-home')?.classList.contains('active')) renderHome();
            if(typeof renderLevelMap === 'function' && document.getElementById('screen-levelmap')?.classList.contains('active')) renderLevelMap();
          });
          // See note in loginUser: re-render after shared cache (homework/识字测验) loads.
          loadSharedCloudCaches().then(()=>{
            if(typeof renderLevelMap === 'function' && document.getElementById('screen-levelmap')?.classList.contains('active')) renderLevelMap();
            if(typeof renderStudentHW === 'function' && document.getElementById('screen-student-hw')?.classList.contains('active')) renderStudentHW();
          });
          afterLogin();
          return;
        } else if(currentUser){
          showScreen('background');
          return;
        }
      }catch(e){ currentUser = null; }
    }
    showScreen('auth');
  } catch(e) {
    // Failsafe: always show auth screen even if something errors
    console.error('Boot error:', e);
    showScreen('auth');
  }
})();
