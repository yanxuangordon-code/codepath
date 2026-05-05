// ─── CodePath App ────────────────────────────────────────
// Features: Tabs, animated quiz flow, XP + streak system,
//           bookmarks, per-lesson notes, recent activity
// ────────────────────────────────────────────────────────

const LANG_LABELS = { python:"Python", html:"HTML", js:"JavaScript", cpp:"C++" };
const LANG_SUBS   = {
  python:"Simple syntax · AI, data, web · Beginner friendly",
  html:  "Structure & style · Foundation of every website",
  js:    "Interactivity · Runs in every browser natively",
  cpp:   "Performance · Games, OS & systems programming"
};
const LANG_ICONS  = { python:"🐍", html:"🌐", js:"⚡", cpp:"⚙️" };
const XP_PER_LESSON    = 10;
const XP_PER_CHALLENGE = 20;
const XP_PER_QUIZ_Q    = 15;

// ── State ──────────────────────────────────────────────────
let curLang  = null;
let curIdx   = 0;
let curTab   = "lesson";

// Persistent state (all in localStorage)
let progress    = {};   // { python: Set([0,1,…]) }
let xp          = 0;
let streak      = 0;
let lastDate    = null;
let bookmarks   = {};   // { "py1": true }
let notes       = {};   // { "py1": "text" }
let recentItems = [];   // [{ lang, idx }]

// Quiz state (per session)
let quizState = {};  // { "py1": { answers:[], score:0, done:false } }

// ── Init ────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  loadAll();
  refreshHomeBars();
  renderRecentActivity();
  updateXPDisplay();
  updateStreakDisplay();
});

// ── Persistence ─────────────────────────────────────────────
function loadAll() {
  try {
    const s = localStorage.getItem("cp3");
    if (s) {
      const d = JSON.parse(s);
      Object.keys(d.progress || {}).forEach(k => progress[k] = new Set(d.progress[k]));
      xp          = d.xp      || 0;
      streak      = d.streak  || 0;
      lastDate    = d.lastDate || null;
      bookmarks   = d.bookmarks  || {};
      notes       = d.notes      || {};
      recentItems = d.recentItems || [];
    }
  } catch(e) {}
  checkStreak();
}
function saveAll() {
  const out = { xp, streak, lastDate, bookmarks, notes, recentItems,
    progress: Object.fromEntries(Object.entries(progress).map(([k,v])=>[k,[...v]])) };
  localStorage.setItem("cp3", JSON.stringify(out));
}
function checkStreak() {
  const today = new Date().toDateString();
  if (lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastDate !== yesterday) streak = 0;
}
function recordActivity() {
  const today = new Date().toDateString();
  if (lastDate !== today) { streak++; lastDate = today; }
  saveAll();
  updateStreakDisplay();
}

// ── XP + Streak display ─────────────────────────────────────
function updateXPDisplay() {
  document.getElementById("xpVal").textContent = xp;
}
function updateStreakDisplay() {
  document.getElementById("streakVal").textContent = streak;
}
function awardXP(amount, label) {
  xp += amount;
  updateXPDisplay();
  saveAll();
  showXPToast(`+${amount} XP  ${label}`);
}
function showXPToast(msg) {
  const t = document.getElementById("xpToast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2400);
}

// ── View switching ───────────────────────────────────────────
function showView(id) {
  document.querySelectorAll(".view").forEach(v => { v.classList.remove("on"); v.style.display="none"; });
  const el = document.getElementById(id);
  el.style.display = "block";
  requestAnimationFrame(() => el.classList.add("on"));
  window.scrollTo(0, 0);
}
function goHome() {
  showView("vHome");
  refreshHomeBars();
  renderRecentActivity();
  document.getElementById("psfill").style.width = "0";
}
function openLang(lang) {
  curLang = lang;
  document.getElementById("pkrname").textContent = LANG_ICONS[lang] + "  " + LANG_LABELS[lang];
  document.getElementById("pkrsub").textContent  = LANG_SUBS[lang];
  refreshPickerProgress(lang);
  renderPicker(lang);
  showView("vPicker");
}
function goBack() {
  renderPicker(curLang);
  refreshPickerProgress(curLang);
  showView("vPicker");
}

// ── Home progress bars ───────────────────────────────────────
function refreshHomeBars() {
  ["python","html","js","cpp"].forEach(lang => {
    const total = (window.LESSONS && LESSONS[lang]) ? LESSONS[lang].length : 15;
    const done  = progress[lang] ? progress[lang].size : 0;
    const pct   = Math.round(done / total * 100);
    const b = document.getElementById("bf-"+lang);
    const p = document.getElementById("pct-"+lang);
    if (b) b.style.width = pct + "%";
    if (p) p.textContent = pct + "%";
  });
}

// ── Recent activity ──────────────────────────────────────────
function renderRecentActivity() {
  const wrap = document.getElementById("recentWrap");
  const list = document.getElementById("recentList");
  if (!recentItems.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  list.innerHTML = recentItems.slice(0, 4).map(({lang, idx}) => {
    const l = LESSONS[lang]?.[idx];
    if (!l) return "";
    return `<div class="recent-item" onclick="openLesson('${lang}',${idx})">
      <div class="ri-icon">${LANG_ICONS[lang]}</div>
      <div class="ri-info">
        <div class="ri-title">${esc(l.title)}</div>
        <div class="ri-sub">${LANG_LABELS[lang]} · Lesson ${idx+1}</div>
      </div>
      <div class="ri-arrow">→</div>
    </div>`;
  }).join("");
}
function addRecent(lang, idx) {
  recentItems = recentItems.filter(r => !(r.lang===lang && r.idx===idx));
  recentItems.unshift({ lang, idx });
  if (recentItems.length > 8) recentItems = recentItems.slice(0, 8);
}

// ── Picker ───────────────────────────────────────────────────
function refreshPickerProgress(lang) {
  const total = LESSONS[lang]?.length || 15;
  const done  = progress[lang] ? progress[lang].size : 0;
  document.getElementById("pkrDone").textContent = done;
  document.getElementById("pkrXpFill").style.width = (done/total*100) + "%";
}
function renderPicker(lang) {
  const lessons = LESSONS[lang] || [];
  document.getElementById("lcards").innerHTML = lessons.map((l, i) => {
    const done  = progress[lang] && progress[lang].has(i);
    const bkd   = bookmarks[l.id] ? "🔖 " : "";
    const bcls  = done ? "done" : l.runnable ? "run" : "read";
    const btxt  = done ? "✓ Completed" : l.runnable ? "▶ Interactive" : "📖 Read-along";
    const hasNote = notes[l.id] && notes[l.id].trim();
    return `<div class="lpc ${done?"done":""}" onclick="openLesson('${lang}',${i})">
      <div class="lpcn">LESSON ${String(i+1).padStart(2,"0")} ${bkd}</div>
      <div class="lpct">${esc(l.title)}</div>
      <div class="lpcs">${esc(l.subtitle)}</div>
      <div class="lpc-footer">
        <div class="lpcb ${bcls}">${btxt}</div>
        <div class="lpc-xp">+${XP_PER_LESSON} XP${l.challenges?.length ? ` +${l.challenges.length*XP_PER_CHALLENGE}` : ""}</div>
      </div>
      ${hasNote ? '<div class="lpc-bookmark" title="Has notes">📝</div>' : ""}
    </div>`;
  }).join("");
}

// ── Open lesson ──────────────────────────────────────────────
function openLesson(lang, idx) {
  curLang = lang; curIdx = idx;
  renderLesson(lang, idx);
  switchTab("lesson", true);
  showView("vLesson");

  // Mark done + XP (first time only)
  if (!progress[lang]) progress[lang] = new Set();
  if (!progress[lang].has(idx)) {
    progress[lang].add(idx);
    awardXP(XP_PER_LESSON, `Lesson complete!`);
    recordActivity();
  }

  addRecent(lang, idx);
  saveAll();
  refreshHomeBars();
  updateProgressStrip(lang, idx);
  updateBookmarkBtn(lang, idx);
}
function prevL() { if (curIdx > 0) openLesson(curLang, curIdx-1); }
function nextL() {
  const ls = LESSONS[curLang];
  if (curIdx < ls.length-1) openLesson(curLang, curIdx+1);
  else showCongrats();
}
function updateProgressStrip(lang, idx) {
  const total = LESSONS[lang].length;
  document.getElementById("psfill").style.width = ((idx+1)/total*100)+"%";
}

// ── Render lesson ─────────────────────────────────────────────
function renderLesson(lang, idx) {
  const l = LESSONS[lang][idx];
  const total = LESSONS[lang].length;

  // Topbar
  const badge = document.getElementById("lbadge");
  badge.textContent = LANG_LABELS[lang]; badge.className = "lbadge " + lang;
  document.getElementById("lstep").textContent = `Lesson ${idx+1} of ${total}`;
  document.getElementById("bprev").disabled = idx === 0;
  const nb = document.getElementById("bnext");
  nb.textContent = idx === total-1 ? "🎉 Finish" : "Next ›";
  nb.className   = "snav hi";

  // Title / sub / intro
  document.getElementById("ltitle").textContent = l.title;
  document.getElementById("lsub").textContent   = l.subtitle;
  document.getElementById("lintro").textContent = l.intro;

  // Fact chips
  const factsEl = document.getElementById("lfacts");
  const facts = buildFacts(lang, l);
  factsEl.innerHTML = facts.map(f => `<div class="lfact">${esc(f)}</div>`).join("");

  // Concepts
  document.getElementById("cgrid").innerHTML = (l.concepts||[]).map(c =>
    `<div class="cc"><div class="cci">${c.i}</div><div class="cct">${esc(c.t)}</div><div class="ccd">${esc(c.d)}</div></div>`
  ).join("");

  // Code — textContent (no HTML parsing)
  document.getElementById("cfn").textContent  = l.filename || "";
  document.getElementById("cpre").textContent = (l.code||[]).join("\n");

  // Breakdown
  document.getElementById("bkdn").innerHTML = (l.breakdown||[]).map(b =>
    `<div class="bi"><div class="bitok">${esc(b.t)}</div><div class="binote">${b.n}</div></div>`
  ).join("");

  // Did you know
  const dyk = getDyk(lang, l);
  const dykEl = document.getElementById("dyk");
  if (dyk) { dyk && (document.getElementById("dykText").textContent = dyk); dykEl.style.display="flex"; }
  else dykEl.style.display="none";

  // CTA — hide practice button for HTML/C++
  document.getElementById("ctaPractice").style.display = l.runnable ? "inline-block" : "none";

  // Practice tab
  const trySec    = document.getElementById("trysec");
  const chSec     = document.getElementById("chsec");
  const noPrac    = document.getElementById("noPractice");
  const pracSub   = document.getElementById("practiceSub");
  const codeArea  = document.getElementById("codearea");

  if (l.runnable) {
    trySec.style.display  = "block";
    noPrac.style.display  = "none";
    codeArea.value        = l.starter || (l.code||[]).join("\n");
    pracSub.textContent   = `Edit the code below and click Run. Language: ${LANG_LABELS[lang]}`;
    syncLineNums(codeArea);
    document.getElementById("outbox").style.display = "none";

    if (l.challenges?.length) {
      chSec.style.display = "block";
      renderChallenges(l, lang, idx);
    } else {
      chSec.style.display = "none";
    }
  } else {
    trySec.style.display = "none";
    chSec.style.display  = "none";
    noPrac.style.display = "block";
  }

  // Quiz tab — reset to start screen
  renderQuizStart(l);

  // Notes tab
  document.getElementById("notesArea").value = notes[l.id] || "";
  document.getElementById("notesStatus").textContent = "Notes auto-saved to your browser.";
  setupNotesAutoSave(l.id);
}

function buildFacts(lang, l) {
  const map = {
    python: ["🐍 Python 3", "📝 Dynamically typed", "🔤 No semicolons needed"],
    html:   ["🌐 HTML5", "📄 Display-only", "♿ Accessibility matters"],
    js:     ["⚡ ES2023+", "🌐 Runs in browser", "📦 No import needed"],
    cpp:    ["⚙️ C++17", "🏗️ Compiled language", "⚡ High performance"]
  };
  return (map[lang]||[]).slice(0,3);
}
function getDyk(lang, l) {
  const tips = {
    python: [
      "Python was named after Monty Python, not the snake!",
      "Python uses indentation instead of curly braces — this enforces readable code.",
      "Python is the most popular language for data science and machine learning.",
      "Python's philosophy: 'There should be one obvious way to do it.'",
      "Python 2 and Python 3 are NOT compatible — always use Python 3.",
    ],
    html: [
      "HTML was invented by Tim Berners-Lee in 1991 at CERN.",
      "The first website ever made is still online at info.cern.ch.",
      "HTML is not a programming language — it's a markup language.",
      "Browsers are very forgiving of HTML errors — they try to render it anyway.",
      "The <div> tag has no semantic meaning — use semantic tags when possible.",
    ],
    js: [
      "JavaScript was created in just 10 days by Brendan Eich in 1995.",
      "Despite the name, JavaScript has nothing to do with Java.",
      "JS is the only language that runs natively in every web browser.",
      "typeof null === 'object' is a famous 25-year-old bug that can't be fixed.",
      "Arrow functions don't have their own 'this' — they inherit from the parent scope.",
    ],
    cpp: [
      "C++ was created by Bjarne Stroustrup in 1979 as 'C with Classes'.",
      "The Linux kernel, Windows, and macOS are largely written in C and C++.",
      "C++ is one of the fastest languages — only C and assembly are faster.",
      "The name C++ is a pun — ++ is the increment operator in C.",
      "C++ compiles to native machine code, so there's no runtime overhead.",
    ]
  };
  const arr = tips[lang] || [];
  if (!arr.length) return null;
  return arr[l.id.charCodeAt(l.id.length-1) % arr.length];
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(name, silent) {
  curTab = name;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  const btn = document.getElementById("tab-"+name);
  const pane = document.getElementById("pane-"+name);
  if (btn)  btn.classList.add("active");
  if (pane) pane.classList.add("active");
  if (!silent) window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Code editor ───────────────────────────────────────────────
function syncLineNums(ta) {
  const lines = ta.value.split("\n").length;
  document.getElementById("lineNums").textContent = Array.from({length:lines},(_,i)=>i+1).join("\n");
}
function runMain() {
  const code = document.getElementById("codearea").value.trim();
  const { out, err } = window.runCode(curLang, code);
  const box = document.getElementById("outbox");
  box.style.display = "block";
  box.className = "outbox" + (err ? " err" : "");
  box.textContent = out;
}
function clrMain() {
  document.getElementById("outbox").style.display = "none";
  document.getElementById("outbox").textContent = "";
}
function resetMain() {
  const l = LESSONS[curLang][curIdx];
  document.getElementById("codearea").value = l.starter || (l.code||[]).join("\n");
  syncLineNums(document.getElementById("codearea"));
  clrMain();
}
function copyCode() {
  const l = LESSONS[curLang][curIdx];
  const text = (l.code||[]).join("\n");
  navigator.clipboard.writeText(text).catch(()=>{});
  const b = document.querySelector(".cpbtn");
  b.textContent = "✓ Copied!";
  setTimeout(() => b.textContent = "📋 Copy", 1600);
}

// ── Challenges ────────────────────────────────────────────────
function renderChallenges(l, lang, idx) {
  const chs = l.challenges || [];
  const progressDots = chs.map((_,i) => {
    const key = `ch_${l.id}_${i}`;
    const done = localStorage.getItem(key) === "done";
    return `<div class="ch-dot ${done?"done":""}" id="chdot-${i}"></div>`;
  }).join("");
  document.getElementById("chProgressRow").innerHTML = progressDots;

  document.getElementById("chwrap").innerHTML = chs.map((ch, ci) => {
    const key = `ch_${l.id}_${ci}`;
    const done = localStorage.getItem(key) === "done";
    return `<div class="chcard ${done?"solved":""}" id="chc-${ci}">
      <div class="ch-card-hdr">
        <div class="ch-num">Challenge ${ci+1}</div>
        <div class="chtitle">${esc(ch.title)}</div>
        <div class="ch-xp">+${XP_PER_CHALLENGE} XP</div>
      </div>
      <div class="chprompt">${esc(ch.prompt)}</div>
      <textarea class="ched" id="che-${ci}" spellcheck="false"
        placeholder="Write your solution here…">${done ? "# Already solved! Try again below.\n" : ""}</textarea>
      <div class="chftr">
        <button class="chrun"  onclick="runChallenge(${ci})">▶ Run &amp; Check</button>
        <button class="chhint" onclick="toggleHint(${ci})">💡 Hint</button>
        ${done ? '<span style="font-size:.7rem;color:var(--ac);font-family:var(--mn)">✓ Solved</span>' : ""}
      </div>
      <div class="chhinttxt" id="chh-${ci}">${esc(ch.hint)}</div>
      <div class="chout"      id="cho-${ci}"></div>
    </div>`;
  }).join("");
}
function toggleHint(ci) {
  const el = document.getElementById("chh-"+ci);
  el.style.display = el.style.display === "block" ? "none" : "block";
}
function runChallenge(ci) {
  const l = LESSONS[curLang][curIdx];
  const ch = l.challenges[ci];
  const code = document.getElementById("che-"+ci).value.trim();
  const outEl = document.getElementById("cho-"+ci);
  if (!code) {
    outEl.style.display = "block"; outEl.className = "chout fail";
    outEl.textContent = "⚠ Write some code first!"; return;
  }
  const { out, err } = window.runCode(curLang, code);
  let passed = false;
  try { passed = ch.check(code, out); } catch {}

  outEl.style.display = "block";
  if (passed) {
    outEl.className = "chout pass";
    outEl.textContent = `✅ Correct!\n\nYour output:\n${out}`;
    const key = `ch_${l.id}_${ci}`;
    if (localStorage.getItem(key) !== "done") {
      localStorage.setItem(key, "done");
      awardXP(XP_PER_CHALLENGE, `Challenge solved!`);
      recordActivity();
      const dot = document.getElementById("chdot-"+ci);
      if (dot) dot.classList.add("done");
      const card = document.getElementById("chc-"+ci);
      if (card) card.classList.add("solved");
    }
  } else if (err) {
    outEl.className = "chout fail";
    outEl.textContent = `⚠ Error:\n${out}\n\n${ch.msg}`;
  } else {
    outEl.className = "chout fail";
    outEl.textContent = `❌ Not quite.\n${ch.msg}\n\nYour output:\n${out}`;
  }
}

// ── Quiz flow ─────────────────────────────────────────────────
// States: start → question(0..n-1) → result

function renderQuizStart(l) {
  const mcqs = l.mcqs || [];
  const state = quizState[l.id];
  const done  = state && state.done;
  const outer = document.getElementById("quizOuter");

  outer.innerHTML = `
    <div class="quiz-start">
      <div class="quiz-start-icon">🧠</div>
      <h2>${done ? "Quiz Complete!" : "Ready for the Quiz?"}</h2>
      <p>${done
        ? `You scored <strong>${state.score}/${mcqs.length}</strong> last time. Retake to improve!`
        : `Test your understanding of <strong>${esc(l.title)}</strong> with ${mcqs.length} multiple-choice questions.`}
      </p>
      <div class="quiz-meta">
        <div class="quiz-meta-item">📝 ${mcqs.length} questions</div>
        <div class="quiz-meta-item">⚡ +${mcqs.length * XP_PER_QUIZ_Q} XP max</div>
        <div class="quiz-meta-item">🕐 ~${Math.ceil(mcqs.length * 0.5)} min</div>
      </div>
      <button class="start-quiz-btn" onclick="startQuiz()">
        ${done ? "🔄 Retake Quiz" : "▶ Start Quiz"}
      </button>
    </div>`;
}

function startQuiz() {
  const l = LESSONS[curLang][curIdx];
  quizState[l.id] = { answers: [], score: 0, done: false, qIdx: 0 };
  renderQuizQuestion(l, 0);
}

function renderQuizQuestion(l, qIdx) {
  const mcqs  = l.mcqs || [];
  const q     = mcqs[qIdx];
  const total = mcqs.length;
  const pct   = (qIdx / total * 100).toFixed(1);
  const outer = document.getElementById("quizOuter");

  outer.innerHTML = `
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" id="qpfill" style="width:${pct}%"></div>
    </div>
    <div class="quiz-q-num">Question ${qIdx+1} of ${total}</div>
    <div class="quiz-q-text">${esc(q.q)}</div>
    <div class="quiz-opts" id="quizOpts">
      ${q.opts.map((opt, oi) =>
        `<button class="quiz-opt" onclick="answerQuiz(${oi})">${esc(String(opt))}</button>`
      ).join("")}
    </div>
    <div class="quiz-feedback" id="qfeedback"></div>
    <button class="quiz-next-btn" id="qNextBtn" onclick="nextQuizQ()">${qIdx===total-1?"See Results →":"Next Question →"}</button>`;
}

function answerQuiz(chosen) {
  const l    = LESSONS[curLang][curIdx];
  const mcqs = l.mcqs || [];
  const st   = quizState[l.id];
  const qIdx = st.qIdx;
  const q    = mcqs[qIdx];
  const correct = q.a;

  st.answers.push(chosen);
  if (chosen === correct) st.score++;

  // Highlight options
  const opts = document.querySelectorAll(".quiz-opt");
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add("correct");
    else if (i === chosen && chosen !== correct) btn.classList.add("wrong");
    else btn.classList.add("reveal");
  });

  // Feedback
  const fb = document.getElementById("qfeedback");
  fb.style.display = "block";
  if (chosen === correct) {
    fb.className = "quiz-feedback ok";
    fb.innerHTML = `✅ Correct! ${getQuizExplanation(l, qIdx)}`;
    awardXP(XP_PER_QUIZ_Q, "Correct answer!");
    recordActivity();
  } else {
    fb.className = "quiz-feedback no";
    fb.innerHTML = `❌ Not quite. The correct answer is: <strong>${esc(String(q.opts[correct]))}</strong>. ${getQuizExplanation(l, qIdx)}`;
  }

  document.getElementById("qNextBtn").style.display = "inline-block";
}

function getQuizExplanation(l, qIdx) {
  // Use breakdown as extra context if available
  const b = l.breakdown && l.breakdown[qIdx % l.breakdown.length];
  return b ? `<br><small style="opacity:.75">${b.n}</small>` : "";
}

function nextQuizQ() {
  const l  = LESSONS[curLang][curIdx];
  const st = quizState[l.id];
  st.qIdx++;
  if (st.qIdx >= l.mcqs.length) {
    st.done = true;
    renderQuizResult(l);
  } else {
    renderQuizQuestion(l, st.qIdx);
  }
}

function renderQuizResult(l) {
  const st    = quizState[l.id];
  const total = l.mcqs.length;
  const score = st.score;
  const pct   = Math.round(score / total * 100);
  const r     = 44; const circ = 2 * Math.PI * r;
  const dash  = circ - (pct / 100 * circ);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📚";
  const msg   = pct === 100 ? "Perfect score! You've mastered this lesson."
              : pct >= 70  ? "Great job! You have a solid grasp of this topic."
              : pct >= 40  ? "Good effort! Review the lesson and try again."
              : "Keep studying! Read the lesson carefully and retake the quiz.";

  const outer = document.getElementById("quizOuter");
  outer.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-icon">${emoji}</div>
      <h2>Quiz Complete!</h2>
      <div class="quiz-score-ring">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle class="qsr-bg" cx="55" cy="55" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
          <circle class="qsr-fg" cx="55" cy="55" r="${r}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${circ}"
            id="qsrFg"/>
        </svg>
        <div class="quiz-score-num">${score}/${total}</div>
      </div>
      <p>${msg}</p>
      <div class="quiz-result-btns">
        <button class="quiz-retry-btn"       onclick="startQuiz()">🔄 Retry Quiz</button>
        <button class="quiz-back-btn"         onclick="switchTab('lesson')">📖 Back to Lesson</button>
        ${curIdx < LESSONS[curLang].length-1
          ? `<button class="quiz-next-lesson-btn" onclick="nextL()">Next Lesson →</button>`
          : `<button class="quiz-next-lesson-btn" onclick="showCongrats()">🎉 Finish!</button>`}
      </div>
    </div>`;

  // Animate the ring
  setTimeout(() => {
    const fg = document.getElementById("qsrFg");
    if (fg) fg.style.strokeDashoffset = dash;
  }, 50);
}

// ── Bookmarks ─────────────────────────────────────────────────
function toggleBookmark() {
  const l = LESSONS[curLang][curIdx];
  bookmarks[l.id] = !bookmarks[l.id];
  saveAll();
  updateBookmarkBtn(curLang, curIdx);
  showXPToast(bookmarks[l.id] ? "🔖 Bookmarked!" : "🔖 Removed bookmark");
}
function updateBookmarkBtn(lang, idx) {
  const l  = LESSONS[lang][idx];
  const el = document.getElementById("bookmarkBtn");
  if (el) el.style.opacity = bookmarks[l.id] ? "1" : "0.5";
}
function openBookmarks() {
  const list = document.getElementById("bookmarksList");
  const entries = Object.entries(bookmarks).filter(([,v])=>v);
  if (!entries.length) {
    list.innerHTML = `<p class="modal-empty">No bookmarks yet. Click 🔖 on any lesson to save it.</p>`;
  } else {
    list.innerHTML = entries.map(([id]) => {
      // Find lesson
      for (const lang of ["python","html","js","cpp"]) {
        const idx = LESSONS[lang]?.findIndex(l => l.id === id);
        if (idx >= 0) {
          const l = LESSONS[lang][idx];
          return `<div class="modal-item" onclick="openLesson('${lang}',${idx});closeModal('bookmarksModal')">
            <div class="mi-icon">${LANG_ICONS[lang]}</div>
            <div class="mi-info">
              <div class="mi-title">${esc(l.title)}</div>
              <div class="mi-sub">${LANG_LABELS[lang]} · Lesson ${idx+1}</div>
            </div>
          </div>`;
        }
      }
      return "";
    }).join("");
  }
  document.getElementById("bookmarksModal").classList.add("open");
}

// ── Notes ─────────────────────────────────────────────────────
let notesSaveTimer = null;
function setupNotesAutoSave(lessonId) {
  const ta = document.getElementById("notesArea");
  ta.oninput = () => {
    clearTimeout(notesSaveTimer);
    document.getElementById("notesStatus").textContent = "Saving…";
    notesSaveTimer = setTimeout(() => {
      notes[lessonId] = ta.value;
      saveAll();
      document.getElementById("notesStatus").textContent = "✓ Saved";
    }, 600);
  };
}
function clearNotes() {
  const l = LESSONS[curLang][curIdx];
  document.getElementById("notesArea").value = "";
  notes[l.id] = "";
  saveAll();
  document.getElementById("notesStatus").textContent = "Notes cleared.";
}
function openAllNotes() {
  const list = document.getElementById("allNotesList");
  const entries = Object.entries(notes).filter(([,v])=>v && v.trim());
  if (!entries.length) {
    list.innerHTML = `<p class="modal-empty">No notes yet. Open a lesson and write in the Notes tab.</p>`;
  } else {
    list.innerHTML = entries.map(([id, text]) => {
      for (const lang of ["python","html","js","cpp"]) {
        const idx = LESSONS[lang]?.findIndex(l => l.id === id);
        if (idx >= 0) {
          const l = LESSONS[lang][idx];
          const preview = text.trim().slice(0, 120);
          return `<div class="modal-item" onclick="openLesson('${lang}',${idx});switchTab('notes');closeModal('notesModal')">
            <div class="mi-icon">${LANG_ICONS[lang]}</div>
            <div class="mi-info">
              <div class="mi-title">${esc(l.title)}</div>
              <div class="mi-sub">${LANG_LABELS[lang]} · Lesson ${idx+1}</div>
              <div class="mi-note">${esc(preview)}${text.length>120?"…":""}</div>
            </div>
          </div>`;
        }
      }
      return "";
    }).join("");
  }
  document.getElementById("notesModal").classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// ── Congrats ──────────────────────────────────────────────────
function showCongrats() {
  const lang   = curLang;
  const done   = progress[lang] ? progress[lang].size : 0;
  const others = ["python","html","js","cpp"].filter(l=>l!==lang);
  document.querySelector("#pane-lesson .lesson-wrap").innerHTML = `
    <div style="text-align:center;padding:60px 20px">
      <div style="font-size:4rem;margin-bottom:16px">🎉</div>
      <h1 style="font-size:1.9rem;margin-bottom:10px">You finished ${LANG_LABELS[lang]}!</h1>
      <p style="color:var(--mt);font-size:.88rem;max-width:440px;margin:0 auto 10px;line-height:1.8">
        All ${LESSONS[lang].length} lessons complete. You earned ${done * XP_PER_LESSON}+ XP — amazing work!
      </p>
      <p style="color:var(--mt);font-size:.82rem;margin-bottom:28px">Ready to try another language?</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${others.map(l=>`<button onclick="openLang('${l}')" style="font-family:var(--sn);font-weight:700;font-size:.82rem;padding:10px 22px;border-radius:6px;cursor:pointer;border:none;background:var(--${l==="html"?"ht":l==="cpp"?"cp":l==="py"?"py":l});color:#000;transition:all .15s">${LANG_ICONS[l]} ${LANG_LABELS[l]}</button>`).join("")}
        <button onclick="goHome()" style="font-family:var(--sn);font-weight:700;font-size:.82rem;padding:10px 18px;border-radius:6px;cursor:pointer;background:none;border:1px solid var(--bd);color:var(--mt)">← Home</button>
      </div>
    </div>`;
  switchTab("lesson");
}

// ── Utility ───────────────────────────────────────────────────
function esc(s) {
  if (typeof s !== "string") return String(s||"");
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
