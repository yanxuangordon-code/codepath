// ─── CodePath — app.js ───────────────────────────────────────
// Tabs · Animated quiz flow · XP + streak · Bookmarks · Notes
// ─────────────────────────────────────────────────────────────

const LABELS = { python:"Python", html:"HTML", js:"JavaScript", cpp:"C++" };
const SUBS   = {
  python: "Simple syntax · AI, data, web · Beginner friendly",
  html:   "Structure & style · Foundation of every website",
  js:     "Interactivity · Runs in every browser natively",
  cpp:    "Performance · Games, OS & systems programming",
};
const ICONS = { python:"🐍", html:"🌐", js:"⚡", cpp:"⚙️" };

const XP_LESSON    = 10;
const XP_CHALLENGE = 20;
const XP_QUIZ_Q    = 15;

// ── Runtime state ─────────────────────────────────────────────
let curLang = null, curIdx = 0;
let quizState = {};  // lessonId → { qIdx, answers[], score, done }

// ── Persisted state ───────────────────────────────────────────
let S = {
  progress:    {},   // lang → [indices]
  xp:          0,
  streak:      0,
  lastDate:    null,
  bookmarks:   {},   // lessonId → bool
  notes:       {},   // lessonId → string
  recent:      [],   // [{lang,idx}]
};

// ── Init ──────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  load();
  refreshHomeBars();
  renderRecent();
  ui("xpVal",     S.xp);
  ui("streakVal", S.streak);
});

// ── Storage ───────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem("cp4");
    if (raw) S = { ...S, ...JSON.parse(raw) };
  } catch {}
  checkStreak();
}
function save() {
  localStorage.setItem("cp4", JSON.stringify(S));
}
function checkStreak() {
  const today = new Date().toDateString();
  const yest  = new Date(Date.now() - 864e5).toDateString();
  if (S.lastDate === today) return;
  if (S.lastDate !== yest) S.streak = 0;
}
function touchStreak() {
  const today = new Date().toDateString();
  if (S.lastDate !== today) { S.streak++; S.lastDate = today; }
  ui("streakVal", S.streak);
  save();
}

// ── XP ────────────────────────────────────────────────────────
function earnXP(n, label) {
  S.xp += n;
  ui("xpVal", S.xp);
  save();
  toast(`+${n} XP  ${label}`);
}
function toast(msg) {
  const el = document.getElementById("xpToast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2500);
}

// ── Navigation ────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll(".view").forEach(v => {
    v.classList.remove("on");
    v.style.display = "none";
  });
  const v = document.getElementById(id);
  v.style.display = "block";
  requestAnimationFrame(() => v.classList.add("on"));
  window.scrollTo(0, 0);
}

function goHome() {
  showView("vHome");
  refreshHomeBars();
  renderRecent();
  document.getElementById("psfill").style.width = "0";
}

function openLang(lang) {
  curLang = lang;
  document.getElementById("pkrname").textContent = ICONS[lang] + "  " + LABELS[lang];
  document.getElementById("pkrsub").textContent  = SUBS[lang];
  refreshPickerBar(lang);
  renderPicker(lang);
  showView("vPicker");
}

function goBack() {
  renderPicker(curLang);
  refreshPickerBar(curLang);
  showView("vPicker");
}

// ── Home bars ──────────────────────────────────────────────────
function refreshHomeBars() {
  ["python","html","js","cpp"].forEach(lang => {
    const total = LESSONS[lang]?.length || 15;
    const done  = (S.progress[lang] || []).length;
    const pct   = Math.round(done / total * 100);
    const b = document.getElementById("bf-"  + lang);
    const p = document.getElementById("pct-" + lang);
    if (b) b.style.width  = pct + "%";
    if (p) p.textContent  = pct + "%";
  });
}

// ── Recent ────────────────────────────────────────────────────
function addRecent(lang, idx) {
  S.recent = S.recent.filter(r => !(r.lang === lang && r.idx === idx));
  S.recent.unshift({ lang, idx });
  if (S.recent.length > 6) S.recent.length = 6;
}
function renderRecent() {
  const wrap = document.getElementById("recentWrap");
  if (!S.recent.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  document.getElementById("recentList").innerHTML = S.recent.slice(0, 4).map(({ lang, idx }) => {
    const l = LESSONS[lang]?.[idx];
    if (!l) return "";
    return `<div class="recent-item" onclick="openLesson('${lang}',${idx})">
      <div class="ri-icon">${ICONS[lang]}</div>
      <div class="ri-info">
        <div class="ri-title">${esc(l.title)}</div>
        <div class="ri-sub">${LABELS[lang]} · Lesson ${idx + 1}</div>
      </div>
      <div class="ri-arrow">→</div>
    </div>`;
  }).join("");
}

// ── Picker ────────────────────────────────────────────────────
function refreshPickerBar(lang) {
  const total = LESSONS[lang]?.length || 15;
  const done  = (S.progress[lang] || []).length;
  document.getElementById("pkrDone").textContent    = done;
  document.getElementById("pkrXpFill").style.width  = (done / total * 100) + "%";
}
function renderPicker(lang) {
  document.getElementById("lcards").innerHTML = (LESSONS[lang] || []).map((l, i) => {
    const done = (S.progress[lang] || []).includes(i);
    const bk   = S.bookmarks[l.id] ? "🔖 " : "";
    const bcls = done ? "done" : l.runnable ? "run" : "read";
    const btxt = done ? "✓ Completed" : l.runnable ? "▶ Interactive" : "📖 Read-along";
    const hasNote = S.notes[l.id]?.trim();
    return `<div class="lpc ${done ? "done" : ""}" onclick="openLesson('${lang}',${i})">
      <div class="lpcn">LESSON ${String(i + 1).padStart(2, "0")} ${bk}</div>
      <div class="lpct">${esc(l.title)}</div>
      <div class="lpcs">${esc(l.subtitle)}</div>
      <div class="lpc-footer">
        <span class="lpcb ${bcls}">${btxt}</span>
        <span class="lpc-xp">+${XP_LESSON} XP${l.challenges?.length ? ` +${l.challenges.length * XP_CHALLENGE}` : ""}</span>
      </div>
      ${hasNote ? '<div class="lpc-bookmark" title="Has notes">📝</div>' : ""}
    </div>`;
  }).join("");
}

// ── Open lesson ───────────────────────────────────────────────
function openLesson(lang, idx) {
  curLang = lang; curIdx = idx;
  buildLesson(lang, idx);
  switchTab("lesson", true);
  showView("vLesson");

  // Award XP first time
  if (!(S.progress[lang] || []).includes(idx)) {
    if (!S.progress[lang]) S.progress[lang] = [];
    S.progress[lang].push(idx);
    earnXP(XP_LESSON, "Lesson complete!");
    touchStreak();
  }

  addRecent(lang, idx);
  save();
  refreshHomeBars();
  updateProgressStrip(lang, idx);
  updateBookmarkBtn(lang, idx);
}

function prevL() { if (curIdx > 0) openLesson(curLang, curIdx - 1); }
function nextL() {
  const len = LESSONS[curLang].length;
  if (curIdx < len - 1) openLesson(curLang, curIdx + 1);
  else showCongrats();
}

function updateProgressStrip(lang, idx) {
  const pct = ((idx + 1) / LESSONS[lang].length) * 100;
  document.getElementById("psfill").style.width = pct + "%";
}

// ── Build lesson content ──────────────────────────────────────
function buildLesson(lang, idx) {
  const l     = LESSONS[lang][idx];
  const total = LESSONS[lang].length;

  // Topbar
  const badge = document.getElementById("lbadge");
  badge.textContent = LABELS[lang];
  badge.className   = "lbadge " + lang;
  document.getElementById("lstep").textContent   = `Lesson ${idx + 1} of ${total}`;
  document.getElementById("bprev").disabled      = idx === 0;
  const nb = document.getElementById("bnext");
  nb.textContent = idx === total - 1 ? "Finish 🎉" : "Next →";
  nb.className   = "snav hi";

  // Text
  document.getElementById("ltitle").textContent = l.title;
  document.getElementById("lsub").textContent   = l.subtitle;
  document.getElementById("lintro").textContent = l.intro;

  // Fact chips
  document.getElementById("lfacts").innerHTML =
    getLangFacts(lang).map(f => `<div class="lfact">${esc(f)}</div>`).join("");

  // Concepts
  document.getElementById("cgrid").innerHTML = (l.concepts || []).map(c =>
    `<div class="cc">
      <div class="cci">${c.i}</div>
      <div class="cct">${esc(c.t)}</div>
      <div class="ccd">${esc(c.d)}</div>
    </div>`
  ).join("");

  // Code — always textContent to avoid HTML rendering
  document.getElementById("cfn").textContent   = l.filename || "";
  document.getElementById("cpre").textContent  = (l.code || []).join("\n");

  // Breakdown — n field may contain safe HTML (<b> <code>), keep it
  document.getElementById("bkdn").innerHTML = (l.breakdown || []).map(b =>
    `<div class="bi">
      <div class="bitok">${esc(b.t)}</div>
      <div class="binote">${b.n}</div>
    </div>`
  ).join("");

  // Did you know
  const dyk  = getDyk(lang, idx);
  const dykEl = document.getElementById("dyk");
  if (dyk) {
    document.getElementById("dykText").textContent = dyk;
    dykEl.style.display = "flex";
  } else {
    dykEl.style.display = "none";
  }

  // CTA
  document.getElementById("ctaPractice").style.display = l.runnable ? "inline-block" : "none";

  // ── Practice tab ──
  const trySec = document.getElementById("trysec");
  const chSec  = document.getElementById("chsec");
  const noPrac = document.getElementById("noPractice");
  const ca     = document.getElementById("codearea");

  if (l.runnable) {
    trySec.style.display = "block";
    noPrac.style.display = "none";
    ca.value = l.starter || (l.code || []).join("\n");
    document.getElementById("practiceSub").textContent =
      `Edit the code below and click Run.  Language: ${LABELS[lang]}`;
    syncLineNums(ca);
    hideOut();

    if (l.challenges?.length) {
      chSec.style.display = "block";
      buildChallenges(l);
    } else {
      chSec.style.display = "none";
    }
  } else {
    trySec.style.display = "none";
    chSec.style.display  = "none";
    noPrac.style.display = "block";
  }

  // ── Quiz tab ── show start screen
  buildQuizStart(l);

  // ── Notes tab ──
  document.getElementById("notesArea").value   = S.notes[l.id] || "";
  document.getElementById("notesStatus").textContent = "";
  setupNotesSave(l.id);
}

// ── Helpers ───────────────────────────────────────────────────
function getLangFacts(lang) {
  return ({
    python: ["🐍 Python 3", "Dynamically typed", "No semicolons", "Indentation matters"],
    html:   ["🌐 HTML5", "Markup language", "Display only", "Runs in browser"],
    js:     ["⚡ ES2023+", "Dynamically typed", "Event driven", "Runs in browser"],
    cpp:    ["⚙️ C++17", "Statically typed", "Compiled", "Manual memory"],
  })[lang] || [];
}

const DYK = {
  python: [
    "Python was named after Monty Python's Flying Circus, not the snake.",
    "Python uses indentation instead of braces — this enforces readable code by design.",
    "Python is the most popular first language taught in universities worldwide.",
    "Guido van Rossum created Python in 1991 while working at CWI in the Netherlands.",
    "The Zen of Python says: 'There should be one obvious way to do it.'",
  ],
  html: [
    "HTML was invented by Tim Berners-Lee in 1991. The first website is still live at info.cern.ch.",
    "HTML is not a programming language — it has no logic, loops, or variables.",
    "Browsers are very forgiving: they try to render even broken HTML.",
    "The <div> tag has zero semantic meaning — always prefer semantic tags when possible.",
    "HTML5 was finalised in 2014 and brought native audio, video, and canvas elements.",
  ],
  js: [
    "JavaScript was written in just 10 days by Brendan Eich in May 1995.",
    "Despite the name, JavaScript has almost nothing to do with Java.",
    "typeof null returns 'object' — a 29-year-old bug that can never be fixed.",
    "JS is the only language that runs natively inside every web browser.",
    "Arrow functions (=>) were added in ES6 (2015) and are now the standard style.",
  ],
  cpp: [
    "C++ was created by Bjarne Stroustrup in 1979 as 'C with Classes'.",
    "The name C++ is a pun — ++ is C's increment operator.",
    "Linux, Windows, macOS, Chrome, and most AAA games are written in C or C++.",
    "C++ compiles directly to machine code, so there's no interpreter overhead.",
    "Modern C++ (C++11 onward) feels almost like a different language from classic C++.",
  ],
};
function getDyk(lang, idx) {
  const arr = DYK[lang] || [];
  return arr[idx % arr.length] || null;
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(name, silent) {
  document.querySelectorAll(".tab-btn").forEach(b  => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-"  + name)?.classList.add("active");
  document.getElementById("pane-" + name)?.classList.add("active");
  if (!silent) window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Code editor ───────────────────────────────────────────────
function syncLineNums(ta) {
  const n = ta.value.split("\n").length;
  document.getElementById("lineNums").textContent =
    Array.from({ length: n }, (_, i) => i + 1).join("\n");
}
function handleTab(e) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const ta  = e.target;
  const s   = ta.selectionStart;
  ta.value  = ta.value.slice(0, s) + "    " + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + 4;
  syncLineNums(ta);
}
function hideOut() {
  const o = document.getElementById("outbox");
  o.style.display = "none"; o.textContent = "";
}
function runMain() {
  const code = document.getElementById("codearea").value;
  const { out, err } = window.runCode(curLang, code);
  const box = document.getElementById("outbox");
  box.style.display = "block";
  box.className     = "outbox" + (err ? " err" : "");
  box.textContent   = out;
}
function clrMain()  { hideOut(); }
function resetMain() {
  const l = LESSONS[curLang][curIdx];
  const ca = document.getElementById("codearea");
  ca.value = l.starter || (l.code || []).join("\n");
  syncLineNums(ca);
  hideOut();
}
function copyCode() {
  const text = (LESSONS[curLang][curIdx].code || []).join("\n");
  navigator.clipboard?.writeText(text).catch(() => {});
  const b = document.querySelector(".cpbtn");
  if (!b) return;
  b.textContent = "Copied!";
  setTimeout(() => b.textContent = "Copy", 1800);
}

// ── Challenges ────────────────────────────────────────────────
function buildChallenges(l) {
  const chs = l.challenges || [];
  document.getElementById("chProgressRow").innerHTML = chs.map((_, i) => {
    const done = localStorage.getItem(`ch_${l.id}_${i}`) === "done";
    return `<div class="ch-dot ${done ? "done" : ""}" id="chdot-${i}"></div>`;
  }).join("");

  document.getElementById("chwrap").innerHTML = chs.map((ch, ci) => {
    const done = localStorage.getItem(`ch_${l.id}_${ci}`) === "done";
    return `<div class="chcard ${done ? "solved" : ""}" id="chc-${ci}">
      <div class="ch-card-hdr">
        <div class="ch-num">Challenge ${ci + 1}</div>
        <div class="chtitle">${esc(ch.title)}</div>
        <div class="ch-xp">+${XP_CHALLENGE} XP</div>
      </div>
      <div class="chprompt">${esc(ch.prompt)}</div>
      <textarea class="ched" id="che-${ci}" spellcheck="false"
        placeholder="Write your solution here…"
        onkeydown="handleTab(event)"></textarea>
      <div class="chftr">
        <button class="chrun"  onclick="runChallenge(${ci})">▶ Run &amp; Check</button>
        <button class="chhint" onclick="toggleHint(${ci})">Hint</button>
        ${done ? '<span style="font-size:.7rem;color:var(--green);font-family:var(--mn)">✓ Solved</span>' : ""}
      </div>
      <div class="chhinttxt" id="chh-${ci}">${esc(ch.hint)}</div>
      <div class="chout"      id="cho-${ci}"></div>
    </div>`;
  }).join("");
}

function toggleHint(ci) {
  const el = document.getElementById("chh-" + ci);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function runChallenge(ci) {
  const l  = LESSONS[curLang][curIdx];
  const ch = l.challenges[ci];
  const code  = document.getElementById("che-" + ci).value.trim();
  const outEl = document.getElementById("cho-" + ci);

  if (!code) {
    outEl.style.display = "block"; outEl.className = "chout fail";
    outEl.textContent = "Write some code first."; return;
  }

  const { out, err } = window.runCode(curLang, code);
  let passed = false;
  try { passed = ch.check(code, out); } catch {}

  outEl.style.display = "block";
  if (passed) {
    outEl.className   = "chout pass";
    outEl.textContent = `✓ Correct!\n\nOutput:\n${out}`;
    const key = `ch_${l.id}_${ci}`;
    if (localStorage.getItem(key) !== "done") {
      localStorage.setItem(key, "done");
      earnXP(XP_CHALLENGE, "Challenge solved!");
      touchStreak();
      document.getElementById("chdot-" + ci)?.classList.add("done");
      document.getElementById("chc-"   + ci)?.classList.add("solved");
    }
  } else if (err) {
    outEl.className   = "chout fail";
    outEl.textContent = `Error:\n${out}\n\n${ch.msg}`;
  } else {
    outEl.className   = "chout fail";
    outEl.textContent = `Not quite.\n${ch.msg}\n\nYour output:\n${out}`;
  }
}

// ── Quiz ──────────────────────────────────────────────────────
function buildQuizStart(l) {
  const mcqs = l.mcqs || [];
  const st   = quizState[l.id];
  const outer = document.getElementById("quizOuter");
  outer.innerHTML = `
    <div class="quiz-start">
      <div class="quiz-start-icon">🧠</div>
      <h2>${st?.done ? "Quiz Complete" : "Test Your Knowledge"}</h2>
      <p>${st?.done
        ? `You scored <strong>${st.score}/${mcqs.length}</strong> last time. Retake to improve.`
        : `${mcqs.length} multiple-choice questions on <strong>${esc(l.title)}</strong>.`
      }</p>
      <div class="quiz-meta">
        <div class="quiz-meta-item">${mcqs.length} questions</div>
        <div class="quiz-meta-item">+${mcqs.length * XP_QUIZ_Q} XP max</div>
        <div class="quiz-meta-item">~${Math.ceil(mcqs.length * 0.5)} min</div>
      </div>
      <button class="start-quiz-btn" onclick="startQuiz()">
        ${st?.done ? "Retake Quiz" : "Start Quiz →"}
      </button>
    </div>`;
}

function startQuiz() {
  const l = LESSONS[curLang][curIdx];
  quizState[l.id] = { qIdx: 0, answers: [], score: 0, done: false };
  buildQuizQuestion(l, 0);
}

function buildQuizQuestion(l, qIdx) {
  const q     = l.mcqs[qIdx];
  const total = l.mcqs.length;
  const pct   = (qIdx / total * 100).toFixed(0);
  document.getElementById("quizOuter").innerHTML = `
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="quiz-q-num">Question ${qIdx + 1} of ${total}</div>
    <div class="quiz-q-text">${display(q.q)}</div>
    <div class="quiz-opts">
      ${q.opts.map((opt, oi) =>
        `<button class="quiz-opt" onclick="answerQuiz(${oi})">${display(String(opt))}</button>`
      ).join("")}
    </div>
    <div class="quiz-feedback" id="qfb"></div>
    <button class="quiz-next-btn" id="qnext" onclick="advanceQuiz()">
      ${qIdx === total - 1 ? "See Results →" : "Next Question →"}
    </button>`;
}

function answerQuiz(chosen) {
  const l    = LESSONS[curLang][curIdx];
  const st   = quizState[l.id];
  const q    = l.mcqs[st.qIdx];
  const ok   = chosen === q.a;

  st.answers.push(chosen);
  if (ok) { st.score++; earnXP(XP_QUIZ_Q, "Correct!"); touchStreak(); }

  // Style buttons
  document.querySelectorAll(".quiz-opt").forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.a)                     btn.classList.add("correct");
    else if (i === chosen && !ok)      btn.classList.add("wrong");
    else                               btn.classList.add("reveal");
  });

  // Feedback
  const fb = document.getElementById("qfb");
  fb.style.display = "block";
  fb.className = "quiz-feedback " + (ok ? "ok" : "no");
  if (ok) {
    fb.innerHTML = `✓ Correct!`;
  } else {
    fb.innerHTML = `Incorrect. The answer is: <strong>${display(String(q.opts[q.a]))}</strong>`;
  }

  document.getElementById("qnext").style.display = "inline-block";
}

function advanceQuiz() {
  const l  = LESSONS[curLang][curIdx];
  const st = quizState[l.id];
  st.qIdx++;
  if (st.qIdx >= l.mcqs.length) { st.done = true; buildQuizResult(l); }
  else buildQuizQuestion(l, st.qIdx);
}

function buildQuizResult(l) {
  const st    = quizState[l.id];
  const total = l.mcqs.length;
  const pct   = Math.round(st.score / total * 100);
  const r = 46, circ = 2 * Math.PI * r, offset = circ - pct / 100 * circ;
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "💪" : "📚";
  const msg   = pct === 100 ? "Perfect score! You nailed it."
              : pct >= 70  ? "Great work. You have a solid understanding."
              : pct >= 40  ? "Good effort — review the lesson and try again."
              : "Keep at it. Re-read the lesson then retake the quiz.";

  document.getElementById("quizOuter").innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-icon">${emoji}</div>
      <h2>Quiz Complete</h2>
      <div class="quiz-score-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle class="qsr-bg" cx="60" cy="60" r="${r}"
            stroke-dasharray="${circ}" stroke-dashoffset="0"/>
          <circle class="qsr-fg" cx="60" cy="60" r="${r}"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="qsrFg"/>
        </svg>
        <div class="quiz-score-num">${st.score}/${total}</div>
      </div>
      <p>${msg}</p>
      <div class="quiz-result-btns">
        <button class="quiz-retry-btn"       onclick="startQuiz()">Retry</button>
        <button class="quiz-back-btn"         onclick="switchTab('lesson')">Back to Lesson</button>
        ${curIdx < LESSONS[curLang].length - 1
          ? `<button class="quiz-next-lesson-btn" onclick="nextL()">Next Lesson →</button>`
          : `<button class="quiz-next-lesson-btn" onclick="showCongrats()">Finish! 🎉</button>`}
      </div>
    </div>`;

  setTimeout(() => {
    const fg = document.getElementById("qsrFg");
    if (fg) fg.style.strokeDashoffset = offset;
  }, 60);
}

// ── Bookmarks ─────────────────────────────────────────────────
function toggleBookmark() {
  const l = LESSONS[curLang][curIdx];
  S.bookmarks[l.id] = !S.bookmarks[l.id];
  save();
  updateBookmarkBtn(curLang, curIdx);
  toast(S.bookmarks[l.id] ? "Bookmarked" : "Bookmark removed");
}
function updateBookmarkBtn(lang, idx) {
  const l  = LESSONS[lang][idx];
  const el = document.getElementById("bookmarkBtn");
  if (el) el.style.opacity = S.bookmarks[l.id] ? "1" : "0.4";
}
function openBookmarks() {
  const entries = Object.entries(S.bookmarks).filter(([, v]) => v);
  const list = document.getElementById("bookmarksList");
  if (!entries.length) {
    list.innerHTML = `<p class="modal-empty">No bookmarks yet.<br>Click 🔖 on any lesson to save it here.</p>`;
  } else {
    list.innerHTML = entries.map(([id]) => {
      for (const lang of Object.keys(LESSONS)) {
        const idx = LESSONS[lang]?.findIndex(l => l.id === id);
        if (idx >= 0) {
          const l = LESSONS[lang][idx];
          return `<div class="modal-item" onclick="openLesson('${lang}',${idx});closeModal('bookmarksModal')">
            <div class="mi-icon">${ICONS[lang]}</div>
            <div class="mi-info">
              <div class="mi-title">${esc(l.title)}</div>
              <div class="mi-sub">${LABELS[lang]} · Lesson ${idx + 1}</div>
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
let _noteTimer = null;
function setupNotesSave(id) {
  const ta = document.getElementById("notesArea");
  ta.oninput = () => {
    clearTimeout(_noteTimer);
    document.getElementById("notesStatus").textContent = "Saving…";
    _noteTimer = setTimeout(() => {
      S.notes[id] = ta.value;
      save();
      document.getElementById("notesStatus").textContent = "Saved";
    }, 700);
  };
}
function clearNotes() {
  const l = LESSONS[curLang][curIdx];
  const ta = document.getElementById("notesArea");
  ta.value = "";
  S.notes[l.id] = "";
  save();
  document.getElementById("notesStatus").textContent = "Notes cleared";
}
function openAllNotes() {
  const entries = Object.entries(S.notes).filter(([, v]) => v?.trim());
  const list = document.getElementById("allNotesList");
  if (!entries.length) {
    list.innerHTML = `<p class="modal-empty">No notes yet.<br>Open a lesson and write in the Notes tab.</p>`;
  } else {
    list.innerHTML = entries.map(([id, text]) => {
      for (const lang of Object.keys(LESSONS)) {
        const idx = LESSONS[lang]?.findIndex(l => l.id === id);
        if (idx >= 0) {
          const l = LESSONS[lang][idx];
          return `<div class="modal-item" onclick="openLesson('${lang}',${idx});switchTab('notes');closeModal('notesModal')">
            <div class="mi-icon">${ICONS[lang]}</div>
            <div class="mi-info">
              <div class="mi-title">${esc(l.title)}</div>
              <div class="mi-sub">${LABELS[lang]} · Lesson ${idx + 1}</div>
              <div class="mi-note">${esc(text.trim().slice(0, 140))}${text.length > 140 ? "…" : ""}</div>
            </div>
          </div>`;
        }
      }
      return "";
    }).join("");
  }
  document.getElementById("notesModal").classList.add("open");
}
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// ── Congrats ──────────────────────────────────────────────────
function showCongrats() {
  const lang   = curLang;
  const others = Object.keys(LESSONS).filter(l => l !== lang);
  document.querySelector("#pane-lesson .lesson-wrap").innerHTML = `
    <div style="text-align:center;padding:72px 20px">
      <div style="font-size:4rem;margin-bottom:20px">🎉</div>
      <h1 style="font-size:1.9rem;font-weight:800;letter-spacing:-.03em;margin-bottom:10px">
        ${LABELS[lang]} Complete!
      </h1>
      <p style="color:var(--tx2);font-size:.9rem;max-width:400px;margin:0 auto 8px;line-height:1.8">
        All ${LESSONS[lang].length} lessons done. Keep the momentum going — try another language.
      </p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:28px">
        ${others.map(l => `
          <button onclick="openLang('${l}')"
            style="font-size:.82rem;font-weight:600;padding:10px 20px;border-radius:8px;
                   cursor:pointer;border:1px solid var(--line);background:var(--card);
                   color:var(--tx);transition:all .15s">
            ${ICONS[l]} ${LABELS[l]}
          </button>`).join("")}
        <button onclick="goHome()"
          style="font-size:.82rem;font-weight:600;padding:10px 18px;border-radius:8px;
                 cursor:pointer;border:1px solid var(--line);background:none;
                 color:var(--tx2);transition:all .15s">
          ← Home
        </button>
      </div>
    </div>`;
  switchTab("lesson");
}

// ── Utility ───────────────────────────────────────────────────
function ui(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// esc — for plain strings (no existing HTML entities)
function esc(s) {
  if (typeof s !== "string") return String(s || "");
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// display — for quiz text that may already contain &lt; &gt; entities
function display(s) {
  if (typeof s !== "string") return String(s || "");
  const decoded = s
    .replace(/&lt;/g,  "<")
    .replace(/&gt;/g,  ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
  return decoded
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
