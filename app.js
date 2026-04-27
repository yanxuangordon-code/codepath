// ═══════════════════════════════════════════════════════
//  CodePath — app.js
//  Handles: navigation, lesson rendering, code runner,
//           MCQ quizzes, coding challenges, progress
// ═══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────
let currentLang   = null;
let currentIndex  = 0;
let mcqAnswered   = {};   // { "py1-0": true, … }
let mcqCorrect    = {};
let mcqScore      = {};   // { "py1": {correct:2, total:3} }
let progress      = {};   // { python: Set([0,1,…]), html: Set([…]) }

const LANG_LABELS = { python:"Python", html:"HTML", js:"JavaScript", cpp:"C++" };
const LANG_SUBS   = {
  python:"Simple syntax · AI, data, web",
  html:  "Structure · Every website uses this",
  js:    "Interactivity · Runs in every browser",
  cpp:   "Performance · Games & systems software"
};

// ── Init ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  updateAllHomeBars();
  // If returning from a previous session, offer to resume
  const last = localStorage.getItem('cp_last');
  if (last) {
    try {
      const { lang, idx } = JSON.parse(last);
      if (LESSONS[lang] && LESSONS[lang][idx]) {
        // silently restore — user can click lang pill to go back
      }
    } catch(e) {}
  }
});

// ── Progress persistence ───────────────────────────────
function loadProgress() {
  try {
    const raw = localStorage.getItem('cp_progress');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(lang => {
        progress[lang] = new Set(parsed[lang]);
      });
    }
  } catch(e) {}
}

function saveProgress() {
  const out = {};
  Object.keys(progress).forEach(lang => {
    out[lang] = [...progress[lang]];
  });
  localStorage.setItem('cp_progress', JSON.stringify(out));
}

function markLessonDone(lang, idx) {
  if (!progress[lang]) progress[lang] = new Set();
  progress[lang].add(idx);
  saveProgress();
  updateAllHomeBars();
  updateNavProgress(lang);
}

function updateAllHomeBars() {
  ['python','html','js','cpp'].forEach(lang => {
    const lessons = LESSONS[lang] || [];
    const done    = progress[lang] ? progress[lang].size : 0;
    const pct     = lessons.length ? Math.round(done / lessons.length * 100) : 0;
    const barEl   = document.getElementById('bar-' + lang);
    const progEl  = document.getElementById('prog-' + lang);
    if (barEl)  barEl.style.width  = pct + '%';
    if (progEl) progEl.textContent = pct + '%';
  });
}

function updateNavProgress(lang) {
  const wrap  = document.getElementById('nav-progress-wrap');
  const label = document.getElementById('nav-progress-label');
  const fill  = document.getElementById('nav-pbar-fill');
  if (!lang) { wrap.style.display = 'none'; return; }
  const lessons = LESSONS[lang] || [];
  const done    = progress[lang] ? progress[lang].size : 0;
  const pct     = lessons.length ? Math.round(done / lessons.length * 100) : 0;
  wrap.style.display = 'flex';
  label.textContent  = `${LANG_LABELS[lang]} ${done}/${lessons.length}`;
  fill.style.width   = pct + '%';
}

function updateStripProgress(lang, idx) {
  const fill = document.getElementById('progress-strip-fill');
  const total = (LESSONS[lang] || []).length;
  if (!total) { fill.style.width = '0%'; return; }
  fill.style.width = ((idx + 1) / total * 100) + '%';
}

// ── View switching ─────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showHome() {
  showView('view-home');
  updateAllHomeBars();
  document.getElementById('progress-strip-fill').style.width = '0%';
  document.getElementById('nav-progress-wrap').style.display = 'none';
}

function openLang(lang) {
  currentLang = lang;
  renderPicker(lang);
  showView('view-picker');
  updateNavProgress(lang);
}

function backToPicker() {
  renderPicker(currentLang);
  showView('view-picker');
}

// ── Lesson Picker ──────────────────────────────────────
function renderPicker(lang) {
  const lessons  = LESSONS[lang] || [];
  const nameEl   = document.getElementById('picker-lang-name');
  const subEl    = document.getElementById('picker-lang-sub');
  const cardsEl  = document.getElementById('lesson-cards');

  nameEl.textContent = LANG_LABELS[lang] || lang;
  subEl.textContent  = LANG_SUBS[lang]   || '';

  cardsEl.innerHTML = lessons.map((lesson, i) => {
    const done     = progress[lang] && progress[lang].has(i);
    const runnable = lesson.runnable;
    const badgeClass = done ? 'done' : (runnable ? 'runnable' : 'display');
    const badgeText  = done ? '✓ Completed' : (runnable ? '▶ Interactive' : '📖 Read-along');
    return `
      <div class="lesson-pick-card ${done ? 'done' : ''}" onclick="openLesson('${lang}', ${i})">
        <div class="lpc-num">LESSON ${String(i+1).padStart(2,'0')}</div>
        <div class="lpc-title">${escHtml(lesson.title)}</div>
        <div class="lpc-sub">${escHtml(lesson.subtitle)}</div>
        <div class="lpc-badge ${badgeClass}">${badgeText}</div>
      </div>`;
  }).join('');
}

// ── Open a lesson ──────────────────────────────────────
function openLesson(lang, idx) {
  currentLang  = lang;
  currentIndex = idx;
  renderLesson(lang, idx);
  showView('view-lesson');
  markLessonDone(lang, idx);
  updateStripProgress(lang, idx);
  localStorage.setItem('cp_last', JSON.stringify({ lang, idx }));
}

function prevLesson() {
  if (currentIndex > 0) openLesson(currentLang, currentIndex - 1);
}

function nextLesson() {
  const lessons = LESSONS[currentLang] || [];
  if (currentIndex < lessons.length - 1) {
    openLesson(currentLang, currentIndex + 1);
  } else {
    showCongrats();
  }
}

// ── Render Lesson ──────────────────────────────────────
function renderLesson(lang, idx) {
  const lesson  = LESSONS[lang][idx];
  const lessons = LESSONS[lang];
  const total   = lessons.length;
  const isFirst = idx === 0;
  const isLast  = idx === total - 1;

  // top bar
  const badge = document.getElementById('lesson-lang-badge');
  badge.textContent = LANG_LABELS[lang];
  badge.className   = 'lesson-lang-badge ' + lang;
  document.getElementById('lesson-step-label').textContent =
    `Lesson ${idx + 1} of ${total}`;

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  btnPrev.disabled    = isFirst;
  btnNext.textContent = isLast ? '🎉 Finish' : 'Next ›';

  // content
  document.getElementById('lesson-title').textContent    = lesson.title;
  document.getElementById('lesson-subtitle').textContent = lesson.subtitle;
  document.getElementById('lesson-intro').textContent    = lesson.intro;

  // concepts
  document.getElementById('concept-grid').innerHTML = (lesson.concepts || []).map(c => `
    <div class="concept-card">
      <div class="cc-icon">${c.icon}</div>
      <div class="cc-title">${escHtml(c.title)}</div>
      <div class="cc-desc">${escHtml(c.desc)}</div>
    </div>`).join('');

  // code block — lines stored as array, joined safely
  const rawCode = (lesson.codeLines || []).join('\n');
  document.getElementById('code-filename').textContent = lesson.filename || '';
  document.getElementById('code-pre').textContent      = rawCode;  // textContent = no HTML parsing!

  // breakdown
  document.getElementById('breakdown-list').innerHTML = (lesson.breakdown || []).map(b => `
    <div class="breakdown-item">
      <div class="bi-token">${escHtml(b.token)}</div>
      <div class="bi-note">${b.note}</div>
    </div>`).join('');

  // try-it section
  const trySection = document.getElementById('try-section');
  if (lesson.runnable) {
    trySection.style.display = 'block';
    document.getElementById('code-editor').value = lesson.starterCode || rawCode;
    clearOutput();
  } else {
    trySection.style.display = 'none';
  }

  // MCQ quiz
  renderMCQ(lesson, lang, idx);

  // Coding challenges
  renderChallenges(lesson, lang, idx);
}

// ── MCQ Quiz ───────────────────────────────────────────
function renderMCQ(lesson, lang, idx) {
  const container = document.getElementById('mcq-container');
  const scoreEl   = document.getElementById('quiz-score');
  const mcqs      = lesson.mcqs || [];
  if (!mcqs.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.8rem">No quiz for this lesson.</p>';
    scoreEl.textContent = '';
    return;
  }

  const key = `${lesson.id}`;
  if (!mcqScore[key]) mcqScore[key] = { correct: 0, total: mcqs.length };

  container.innerHTML = mcqs.map((q, qi) => {
    const qkey    = `${key}-${qi}`;
    const answered = mcqAnswered[qkey];
    const optsHtml = q.options.map((opt, oi) => {
      let cls = '';
      if (answered !== undefined) {
        if (oi === q.answer)              cls = 'correct';
        else if (oi === answered)         cls = 'wrong';
      }
      return `<button class="mcq-opt ${cls}"
        ${answered !== undefined ? 'disabled' : ''}
        onclick="answerMCQ('${key}',${qi},${oi},${q.answer})"
      >${escHtml(String(opt))}</button>`;
    }).join('');

    let resultHtml = '';
    if (answered !== undefined) {
      const correct = answered === q.answer;
      resultHtml = `<div class="mcq-result" style="color:${correct ? 'var(--accent)' : '#ff6b6b'}">
        ${correct ? '✅ Correct!' : '❌ Not quite — correct answer highlighted in green.'}
      </div>`;
    }

    return `<div class="mcq-block">
      <div class="mcq-q">${escHtml(q.q)}</div>
      <div class="mcq-opts">${optsHtml}</div>
      ${resultHtml}
    </div>`;
  }).join('');

  updateMCQScore(key, mcqs.length, scoreEl);
}

function answerMCQ(key, qi, chosen, correct) {
  const qkey = `${key}-${qi}`;
  if (mcqAnswered[qkey] !== undefined) return;
  mcqAnswered[qkey] = chosen;
  if (chosen === correct) {
    if (!mcqScore[key]) mcqScore[key] = { correct: 0, total: 0 };
    mcqScore[key].correct++;
  }
  // re-render just the quiz portion
  const lesson  = LESSONS[currentLang][currentIndex];
  const scoreEl = document.getElementById('quiz-score');
  renderMCQ(lesson, currentLang, currentIndex);
}

function updateMCQScore(key, total, el) {
  const s = mcqScore[key];
  if (!s) { el.textContent = ''; return; }
  const answered = Object.keys(mcqAnswered).filter(k => k.startsWith(key + '-')).length;
  el.textContent = `${s.correct} / ${answered} correct (${total} questions)`;
}

// ── Coding Challenges ──────────────────────────────────
function renderChallenges(lesson, lang, idx) {
  const section    = document.getElementById('challenges-section');
  const container  = document.getElementById('challenges-container');
  const challenges = lesson.challenges || [];

  if (!challenges.length || !lesson.runnable) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  container.innerHTML = challenges.map((ch, ci) => `
    <div class="challenge-card" id="ch-card-${ci}">
      <div class="ch-title">${escHtml(ch.title)}</div>
      <div class="ch-prompt">${escHtml(ch.prompt)}</div>
      <textarea class="ch-editor" id="ch-editor-${ci}" spellcheck="false"
        placeholder="Write your solution here…"></textarea>
      <div class="ch-footer">
        <button class="ch-run-btn" onclick="runChallenge(${ci})">▶ Run & Check</button>
        <button class="ch-hint-btn" onclick="toggleHint(${ci})">💡 Hint</button>
      </div>
      <div class="ch-hint-box" id="ch-hint-${ci}" style="display:none">${escHtml(ch.hint)}</div>
      <div class="ch-output" id="ch-output-${ci}" style="display:none"></div>
    </div>`).join('');
}

function toggleHint(ci) {
  const el = document.getElementById(`ch-hint-${ci}`);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function runChallenge(ci) {
  const lesson  = LESSONS[currentLang][currentIndex];
  const ch      = lesson.challenges[ci];
  const code    = document.getElementById(`ch-editor-${ci}`).value.trim();
  const outEl   = document.getElementById(`ch-output-${ci}`);

  if (!code) {
    outEl.style.display = 'block';
    outEl.className     = 'ch-output fail';
    outEl.textContent   = '⚠ Please write some code first!';
    return;
  }

  const { output, error } = safeRunJS(code);
  const passed = ch.check(code, output);

  outEl.style.display = 'block';
  if (error && !passed) {
    outEl.className   = 'ch-output fail';
    outEl.textContent = `⚠ Error: ${error}\n\n${ch.checkMsg}`;
  } else if (passed) {
    outEl.className   = 'ch-output pass';
    outEl.textContent = `✅ Correct!\n\nOutput:\n${output || '(no output)'}`;
  } else {
    outEl.className   = 'ch-output fail';
    outEl.textContent = `❌ Not quite.\n${ch.checkMsg}\n\nYour output:\n${output || '(no output)'}`;
  }
}

// ── Code Runner ────────────────────────────────────────
// Safe JavaScript runner — intercepts console.log
// NEVER tries to eval Python or C++
function safeRunJS(code) {
  const lines   = [];
  const errors  = [];

  const fakeConsole = {
    log:   (...a) => lines.push(a.map(formatVal).join(' ')),
    warn:  (...a) => lines.push('⚠ ' + a.map(formatVal).join(' ')),
    error: (...a) => lines.push('✕ ' + a.map(formatVal).join(' ')),
    info:  (...a) => lines.push(a.map(formatVal).join(' ')),
  };

  try {
    // Wrap in a function to scope variables; pass our fake console
    const fn = new Function('console', code);
    fn(fakeConsole);
  } catch (e) {
    return { output: lines.join('\n'), error: e.message };
  }
  return { output: lines.join('\n'), error: null };
}

function formatVal(v) {
  if (v === null)      return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v))   return '[' + v.map(formatVal).join(', ') + ']';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch(e) { return String(v); }
  }
  return String(v);
}

// Python simulator — interprets a very small subset of Python
// so beginners can run starter code and challenges
function simulatePython(code) {
  const lines  = [];
  const vars   = {};

  function evalPyExpr(expr) {
    expr = expr.trim();

    // f-string:  f"…{var}…"  or  f'…{var}…'
    if (/^f["']/.test(expr)) {
      const inner = expr.slice(2, -1);
      return inner.replace(/\{([^}]+)\}/g, (_, e) => String(evalPyExpr(e.trim())));
    }

    // String literals
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'")))
      return expr.slice(1, -1);

    // Boolean / None
    if (expr === 'True')  return true;
    if (expr === 'False') return false;
    if (expr === 'None')  return null;

    // len(x)
    if (/^len\((.+)\)$/.test(expr)) {
      const inner = evalPyExpr(RegExp.$1);
      return Array.isArray(inner) ? inner.length : String(inner).length;
    }

    // type(x)
    if (/^type\((.+)\)$/.test(expr)) {
      const v = evalPyExpr(RegExp.$1);
      const t = Array.isArray(v) ? 'list' :
                v === null       ? 'NoneType' :
                typeof v === 'boolean' ? 'bool' :
                typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : 'str';
      return `<class '${t}'>`;
    }

    // sum / max / min
    if (/^(sum|max|min)\((.+)\)$/.test(expr)) {
      const fn  = RegExp.$1;
      const arg = evalPyExpr(RegExp.$2);
      const arr = Array.isArray(arg) ? arg : [];
      if (fn === 'sum') return arr.reduce((a,b)=>a+b, 0);
      if (fn === 'max') return Math.max(...arr);
      if (fn === 'min') return Math.min(...arr);
    }

    // range(a,b) or range(n)
    if (/^range\((.+)\)$/.test(expr)) {
      const args = RegExp.$1.split(',').map(x => Number(evalPyExpr(x.trim())));
      const start = args.length === 1 ? 0 : args[0];
      const stop  = args.length === 1 ? args[0] : args[1];
      const step  = args[2] || 1;
      const result = [];
      for (let i = start; i < stop; i += step) result.push(i);
      return result;
    }

    // List literal
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return [];
      return splitArgs(inner).map(x => evalPyExpr(x.trim()));
    }

    // Dict literal  {…}
    if (expr.startsWith('{') && expr.endsWith('}')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return {};
      const obj = {};
      splitArgs(inner).forEach(pair => {
        const ci = pair.indexOf(':');
        if (ci === -1) return;
        const k = evalPyExpr(pair.slice(0, ci).trim());
        const v = evalPyExpr(pair.slice(ci + 1).trim());
        obj[String(k)] = v;
      });
      return obj;
    }

    // Subscript: var[key]
    if (/^(\w+)\[(.+)\]$/.test(expr)) {
      const base = vars[RegExp.$1];
      const key  = evalPyExpr(RegExp.$2);
      if (Array.isArray(base)) {
        const i = key < 0 ? base.length + key : key;
        return base[i];
      }
      if (base && typeof base === 'object') return base[String(key)];
      return undefined;
    }

    // Attribute: var.attr  (handles list.len via len())
    if (/^(\w+)\.(\w+)$/.test(expr)) {
      const obj  = vars[RegExp.$1];
      const attr = RegExp.$2;
      if (attr === 'length' && Array.isArray(obj)) return obj.length;
      return undefined;
    }

    // Numeric literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

    // Arithmetic / comparison — use JS evaluator with variable substitution
    let jsExpr = expr
      .replace(/\*\*/g, '**')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g,  '||')
      .replace(/\bnot\b/g, '!')
      .replace(/\bTrue\b/g,  'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g,  'null');

    // Substitute variable names
    Object.keys(vars).sort((a,b)=>b.length-a.length).forEach(name => {
      const val = vars[name];
      const sub = typeof val === 'string' ? JSON.stringify(val) :
                  Array.isArray(val) ? JSON.stringify(val) :
                  val === null ? 'null' : String(val);
      jsExpr = jsExpr.replace(new RegExp('\\b' + name + '\\b', 'g'), sub);
    });

    try { return Function('"use strict"; return (' + jsExpr + ')')(); }
    catch(e) { return expr; }
  }

  // Split comma-separated args respecting brackets/quotes
  function splitArgs(s) {
    const parts = []; let depth = 0, cur = '', inStr = false, strChar = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inStr) { cur += c; if (c === strChar && s[i-1] !== '\\') inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = true; strChar = c; cur += c; continue; }
      if (c === '[' || c === '{' || c === '(') { depth++; cur += c; continue; }
      if (c === ']' || c === '}' || c === ')') { depth--; cur += c; continue; }
      if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function pyStr(v) {
    if (v === null)      return 'None';
    if (v === true)      return 'True';
    if (v === false)     return 'False';
    if (Array.isArray(v)) return '[' + v.map(x => typeof x==='string' ? `'${x}'` : pyStr(x)).join(', ') + ']';
    if (typeof v === 'object') {
      const entries = Object.entries(v).map(([k,val]) => `'${k}': ${pyStr(val)}`).join(', ');
      return '{' + entries + '}';
    }
    return String(v);
  }

  // Simple print() evaluator
  function evalPrint(argsStr) {
    const parts = splitArgs(argsStr).map(a => pyStr(evalPyExpr(a.trim())));
    return parts.join(' ');
  }

  // Execute line by line
  const codeLines = code.replace(/\r/g, '').split('\n');
  let i = 0;
  let loopCount = 0;
  const MAX_LINES = 500;

  while (i < codeLines.length && loopCount < MAX_LINES) {
    loopCount++;
    const rawLine = codeLines[i];
    const line    = rawLine.trim();

    // Skip blank / comment
    if (!line || line.startsWith('#')) { i++; continue; }

    // print(…)
    if (/^print\s*\(/.test(line)) {
      const inner = line.slice(line.indexOf('(') + 1, line.lastIndexOf(')'));
      lines.push(evalPrint(inner));
      i++; continue;
    }

    // for VAR in ITERABLE:
    const forMatch = /^for\s+(\w+)\s+in\s+(.+):$/.exec(line);
    if (forMatch) {
      const varName  = forMatch[1];
      const iterable = evalPyExpr(forMatch[2]);
      const items    = Array.isArray(iterable) ? iterable : [];

      // collect indented body
      const body = [];
      let j = i + 1;
      while (j < codeLines.length && (codeLines[j].startsWith('    ') || codeLines[j].startsWith('\t') || !codeLines[j].trim())) {
        if (codeLines[j].trim()) body.push(codeLines[j].replace(/^    /, '').replace(/^\t/, ''));
        j++;
      }

      for (const item of items) {
        if (loopCount++ > MAX_LINES) break;
        vars[varName] = item;
        // run body lines
        const bodyResult = simulatePythonLines(body, vars, lines, loopCount);
        loopCount += bodyResult.lineCount;
        if (bodyResult.broke) break;
      }
      i = j; continue;
    }

    // while COND:
    const whileMatch = /^while\s+(.+):$/.exec(line);
    if (whileMatch) {
      const condExpr = whileMatch[1];
      const body = [];
      let j = i + 1;
      while (j < codeLines.length && (codeLines[j].startsWith('    ') || codeLines[j].startsWith('\t') || !codeLines[j].trim())) {
        if (codeLines[j].trim()) body.push(codeLines[j].replace(/^    /, '').replace(/^\t/, ''));
        j++;
      }

      let safetyCounter = 0;
      while (evalPyExpr(condExpr) && safetyCounter++ < 200 && loopCount++ < MAX_LINES) {
        const bodyResult = simulatePythonLines(body, vars, lines, loopCount);
        loopCount += bodyResult.lineCount;
        if (bodyResult.broke) break;
      }
      i = j; continue;
    }

    // if / elif / else blocks
    if (/^(if|elif|else)/.test(line)) {
      // collect entire if-elif-else structure
      const blocks = [];  // [{cond, body}]
      let j = i;

      while (j < codeLines.length) {
        const bl = codeLines[j].trim();
        let condExpr = null;
        if (/^if\s+(.+):$/.test(bl))   condExpr = RegExp.$1;
        else if (/^elif\s+(.+):$/.test(bl)) condExpr = RegExp.$1;
        else if (/^else\s*:$/.test(bl)) condExpr = '__else__';
        else break;

        const body = [];
        let k = j + 1;
        while (k < codeLines.length && (codeLines[k].startsWith('    ') || codeLines[k].startsWith('\t') || !codeLines[k].trim())) {
          if (codeLines[k].trim()) body.push(codeLines[k].replace(/^    /, '').replace(/^\t/, ''));
          k++;
        }
        blocks.push({ cond: condExpr, body });
        j = k;
        if (condExpr === '__else__') break;
      }

      // Execute first matching block
      for (const block of blocks) {
        const cond = block.cond === '__else__' ? true : evalPyExpr(block.cond);
        if (cond) {
          const bodyResult = simulatePythonLines(block.body, vars, lines, loopCount);
          loopCount += bodyResult.lineCount;
          break;
        }
      }
      i = j; continue;
    }

    // Variable assignment:  name = expr  or  name op= expr
    const assignMatch = /^(\w+)\s*(\+\=|\-\=|\*\=|\/\=)?\s*=\s*(?!=)(.+)$/.exec(line);
    if (assignMatch) {
      const name    = assignMatch[1];
      const opEq    = assignMatch[2];
      const exprStr = assignMatch[3];
      let val = evalPyExpr(exprStr);
      if (opEq) {
        const cur = vars[name] || 0;
        if      (opEq === '+=') val = cur + val;
        else if (opEq === '-=') val = cur - val;
        else if (opEq === '*=') val = cur * val;
        else if (opEq === '/=') val = cur / val;
      }
      vars[name] = val;
      i++; continue;
    }

    // Method calls: list.append / remove / sort / insert / pop
    const methodMatch = /^(\w+)\.(append|remove|sort|insert|pop|push_back)\s*\((.*)?\)$/.exec(line);
    if (methodMatch) {
      const objName = methodMatch[1];
      const method  = methodMatch[2];
      const arg     = methodMatch[3] ? evalPyExpr(methodMatch[3]) : undefined;
      const obj     = vars[objName];
      if (Array.isArray(obj)) {
        if (method === 'append' || method === 'push_back') obj.push(arg);
        else if (method === 'remove') { const idx = obj.indexOf(arg); if (idx>-1) obj.splice(idx,1); }
        else if (method === 'sort')   obj.sort();
        else if (method === 'insert') { const parts = splitArgs(methodMatch[3]); obj.splice(Number(evalPyExpr(parts[0])),0,evalPyExpr(parts[1])); }
        else if (method === 'pop')    obj.pop();
        vars[objName] = obj;
      }
      i++; continue;
    }

    // def, class, return — skip gracefully
    if (/^(def |class |return )/.test(line)) {
      // skip the entire indented block
      let j = i + 1;
      while (j < codeLines.length && (codeLines[j].startsWith('    ') || codeLines[j].startsWith('\t'))) j++;
      i = j; continue;
    }

    // fallthrough — skip
    i++;
  }

  return lines.join('\n');
}

// Helper: run a list of body lines sharing the outer vars/lines
function simulatePythonLines(bodyLines, vars, outputLines, parentCount) {
  // We re-use the outer vars object and push to the same outputLines array
  let lineCount = 0;
  let broke     = false;

  function evalExpr(expr) {
    expr = expr.trim();
    if (/^f["']/.test(expr)) {
      const inner = expr.slice(2, -1);
      return inner.replace(/\{([^}]+)\}/g, (_, e) => String(evalExpr(e.trim())));
    }
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'")))
      return expr.slice(1, -1);
    if (expr === 'True')  return true;
    if (expr === 'False') return false;
    if (expr === 'None')  return null;
    if (/^len\((.+)\)$/.test(expr)) {
      const v = evalExpr(RegExp.$1); return Array.isArray(v)?v.length:String(v).length;
    }
    if (/^range\((.+)\)$/.test(expr)) {
      const args = RegExp.$1.split(',').map(x=>Number(evalExpr(x.trim())));
      const s = args.length===1?0:args[0], e = args.length===1?args[0]:args[1];
      const r=[]; for(let i=s;i<e;i++) r.push(i); return r;
    }
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

    let jsExpr = expr
      .replace(/\band\b/g,'&&').replace(/\bor\b/g,'||').replace(/\bnot\b/g,'!')
      .replace(/\bTrue\b/g,'true').replace(/\bFalse\b/g,'false').replace(/\bNone\b/g,'null');

    Object.keys(vars).sort((a,b)=>b.length-a.length).forEach(n => {
      const v = vars[n];
      const sub = typeof v==='string'?JSON.stringify(v):Array.isArray(v)?JSON.stringify(v):v===null?'null':String(v);
      jsExpr = jsExpr.replace(new RegExp('\\b'+n+'\\b','g'), sub);
    });
    try { return Function('"use strict";return('+jsExpr+')')(); } catch(e) { return expr; }
  }

  function pyStr(v) {
    if (v===null) return 'None';
    if (v===true) return 'True';
    if (v===false) return 'False';
    if (Array.isArray(v)) return '['+v.map(x=>typeof x==='string'?`'${x}'`:pyStr(x)).join(', ')+']';
    if (typeof v==='object') return '{'+Object.entries(v).map(([k,val])=>`'${k}': ${pyStr(val)}`).join(', ')+'}';
    return String(v);
  }

  function splitA(s) {
    const parts=[]; let depth=0,cur='',inStr=false,sc='';
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(inStr){cur+=c;if(c===sc&&s[i-1]!=='\\')inStr=false;continue;}
      if(c==='"'||c==="'"){inStr=true;sc=c;cur+=c;continue;}
      if(c==='['||c==='{'||c==='('){depth++;cur+=c;continue;}
      if(c===']'||c==='}'||c===')'){depth--;cur+=c;continue;}
      if(c===','&&depth===0){parts.push(cur.trim());cur='';continue;}
      cur+=c;
    }
    if(cur.trim())parts.push(cur.trim());
    return parts;
  }

  for (let i = 0; i < bodyLines.length && lineCount < 200; i++) {
    lineCount++;
    const line = bodyLines[i].trim();
    if (!line || line.startsWith('#')) continue;
    if (line === 'break') { broke = true; break; }
    if (line === 'continue') break;

    if (/^print\s*\(/.test(line)) {
      const inner = line.slice(line.indexOf('(')+1, line.lastIndexOf(')'));
      const parts = splitA(inner).map(a=>pyStr(evalExpr(a.trim())));
      outputLines.push(parts.join(' '));
      continue;
    }

    const assignMatch = /^(\w+)\s*(\+\=|\-\=|\*\=|\/\=)?\s*=\s*(?!=)(.+)$/.exec(line);
    if (assignMatch) {
      const name=assignMatch[1], opEq=assignMatch[2], exprStr=assignMatch[3];
      let val = evalExpr(exprStr);
      if (opEq) {
        const cur=vars[name]||0;
        if(opEq==='+=')val=cur+val; else if(opEq==='-=')val=cur-val;
        else if(opEq==='*=')val=cur*val; else if(opEq==='/=')val=cur/val;
      }
      vars[name] = val;
    }
  }

  return { lineCount, broke };
}

// ── Main Run button ────────────────────────────────────
function runCode() {
  const code    = document.getElementById('code-editor').value.trim();
  const outEl   = document.getElementById('output-box');

  if (!code) {
    showOutput('(no code to run)', false);
    return;
  }

  if (currentLang === 'js') {
    const { output, error } = safeRunJS(code);
    if (error) {
      showOutput('⚠ ' + error, true);
    } else {
      showOutput(output || '(no output)', false);
    }
  } else if (currentLang === 'python') {
    try {
      const output = simulatePython(code);
      showOutput(output || '(no output)', false);
    } catch(e) {
      showOutput('⚠ ' + e.message, true);
    }
  } else {
    showOutput(
      `ℹ ${LANG_LABELS[currentLang]} code cannot run directly in the browser.\n\n` +
      `To run this code:\n` +
      (currentLang === 'cpp'
        ? `• Install g++ compiler\n• Save as main.cpp\n• Run: g++ main.cpp -o main && ./main`
        : `• Copy the code\n• Paste into an online compiler like repl.it`),
      false
    );
  }
}

function showOutput(text, isError) {
  const outEl = document.getElementById('output-box');
  outEl.style.display = 'block';
  outEl.className = 'output-box' + (isError ? ' err' : '');
  outEl.textContent = text;
}

function clearOutput() {
  const outEl = document.getElementById('output-box');
  outEl.style.display = 'none';
  outEl.textContent   = '';
}

// ── Copy code button ───────────────────────────────────
function copyCode() {
  const lesson  = LESSONS[currentLang] && LESSONS[currentLang][currentIndex];
  if (!lesson) return;
  const text = (lesson.codeLines || []).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1800);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Congrats screen ────────────────────────────────────
function showCongrats() {
  const lang    = currentLang;
  const lessons = LESSONS[lang] || [];
  const others  = ['python','html','js','cpp'].filter(l => l !== lang);

  const mainEl = document.querySelector('.lesson-main');
  mainEl.innerHTML = `
    <div style="text-align:center;padding:60px 20px">
      <div style="font-size:4rem;margin-bottom:20px">🎉</div>
      <h1 style="font-size:2rem;margin-bottom:12px">You finished ${LANG_LABELS[lang]}!</h1>
      <p style="color:var(--muted);font-size:.95rem;max-width:420px;margin:0 auto 32px;line-height:1.8">
        You've completed all ${lessons.length} lessons. Keep practising and try another language!
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${others.map(l => `
          <button onclick="openLang('${l}')" style="
            font-family:var(--sans);font-weight:700;font-size:.85rem;
            padding:10px 22px;border-radius:6px;cursor:pointer;border:none;
            background:var(--${l === 'html' ? 'html' : l === 'js' ? 'js' : l === 'cpp' ? 'cpp' : 'py'});
            color:#000;transition:all .16s"
          >${LANG_LABELS[l]} →</button>`).join('')}
        <button onclick="showHome()" style="
          font-family:var(--sans);font-weight:700;font-size:.85rem;
          padding:10px 22px;border-radius:6px;cursor:pointer;
          background:none;border:1px solid var(--border);color:var(--muted)">
          ← Home
        </button>
      </div>
    </div>`;
}

// ── Utility ────────────────────────────────────────────
function escHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
