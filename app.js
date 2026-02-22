// ============================================
// DEVINTERVIEW PRO - app.js
// ============================================

const STORAGE_KEY = 'devinterview_progress';

const TOPIC_DESCRIPTIONS = {
  javascript: "Core JS concepts every developer must know — from closures to async/await, the event loop, and ES6+ features.",
  css: "Layouts, animations, specificity, responsive design, and modern CSS features for production-ready UIs.",
  html: "Semantic markup, accessibility, forms, performance, and HTML5 APIs used in real projects.",
  nodejs: "Server-side JavaScript, event loop, streams, modules, file system, and Node.js runtime concepts.",
  expressjs: "REST API development, middleware, authentication, error handling, and production-ready patterns.",
  angular: "Angular 16 components, state management, RxJS, routing, performance, and enterprise patterns.",
  oracle: "Oracle SQL, PL/SQL, indexing, partitioning, analytic functions, and query optimization.",
  project: "Describe your project experience, architecture decisions, challenges, and 4-year expertise."
};

// ---- State ----
let data = null;
let currentTopic = null;
let progress = {};
let allQuestions = []; // for search
let searchActive = false;

// ---- DOM ----
const topicNav = document.getElementById('topicNav');
const questionsContainer = document.getElementById('questionsContainer');
const homeScreen = document.getElementById('homeScreen');
const homeGrid = document.getElementById('homeGrid');
const topicHeader = document.getElementById('topicHeader');
const topicIcon = document.getElementById('topicIcon');
const topicTitle = document.getElementById('topicTitle');
const topicCount = document.getElementById('topicCount');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const searchInfo = document.getElementById('searchInfo');
const statsBar = document.getElementById('statsBar');
const progressLine = document.getElementById('progressLine');
const sidebarProgress = document.getElementById('sidebarProgress');
const toast = document.getElementById('toast');

// ---- Load Data ----
async function init() {
  try {
    const res = await fetch('questions.json');
    data = await res.json();
    progress = loadProgress();

    // Build flat list for search
    data.topics.forEach(topic => {
      topic.questions.forEach(q => {
        allQuestions.push({ ...q, topicId: topic.id, topicName: topic.name, topicIcon: topic.icon });
      });
    });

    buildSidebar();
    buildHomeScreen();
    buildHeaderStats();
    buildSidebarProgress();
    showHome();

    // URL hash navigation
    const hash = window.location.hash.slice(1);
    if (hash && data.topics.find(t => t.id === hash)) {
      selectTopic(hash);
    }
  } catch(e) {
    questionsContainer.innerHTML = '<p style="color:#f87272;padding:40px">Failed to load questions. Please ensure questions.json is in the same folder.</p>';
    console.error(e);
  }
}

// ---- Progress Storage ----
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
}

function isRead(topicId, qId) {
  return progress[topicId] && progress[topicId][qId];
}

function toggleRead(topicId, qId) {
  if (!progress[topicId]) progress[topicId] = {};
  if (progress[topicId][qId]) {
    delete progress[topicId][qId];
  } else {
    progress[topicId][qId] = true;
  }
  saveProgress();
  updateProgressUI();
}

function getTopicProgress(topicId) {
  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return { read: 0, total: 0, pct: 0 };
  const total = topic.questions.length;
  const read = Object.keys(progress[topicId] || {}).length;
  return { read, total, pct: Math.round((read / total) * 100) };
}

function getTotalProgress() {
  let total = 0, read = 0;
  data.topics.forEach(t => {
    const p = getTopicProgress(t.id);
    total += p.total; read += p.read;
  });
  return { read, total, pct: total ? Math.round((read / total) * 100) : 0 };
}

// ---- Sidebar ----
function buildSidebar() {
  topicNav.innerHTML = '';
  data.topics.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'topic-btn';
    btn.dataset.id = topic.id;
    btn.innerHTML = `
      <span class="topic-btn-icon">${topic.icon}</span>
      <span class="topic-btn-name">${topic.name}</span>
      <span class="topic-btn-count">${topic.questions.length}</span>
    `;
    btn.addEventListener('click', () => selectTopic(topic.id));
    topicNav.appendChild(btn);
  });
}

function updateActiveSidebar() {
  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === currentTopic);
  });
}

// ---- Sidebar Progress ----
function buildSidebarProgress() {
  sidebarProgress.innerHTML = '<div class="progress-title">Your Progress</div>';
  data.topics.forEach(topic => {
    const p = getTopicProgress(topic.id);
    const div = document.createElement('div');
    div.className = 'progress-item';
    div.dataset.topicProgress = topic.id;
    div.innerHTML = `
      <span class="progress-topic-name" title="${topic.name}">${topic.name}</span>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${p.pct}%"></div>
      </div>
      <span class="progress-pct">${p.pct}%</span>
    `;
    sidebarProgress.appendChild(div);
  });
}

function updateSidebarProgress() {
  data.topics.forEach(topic => {
    const p = getTopicProgress(topic.id);
    const item = sidebarProgress.querySelector(`[data-topic-progress="${topic.id}"]`);
    if (item) {
      item.querySelector('.progress-bar-fill').style.width = p.pct + '%';
      item.querySelector('.progress-pct').textContent = p.pct + '%';
    }
  });
}

// ---- Header Stats ----
function buildHeaderStats() {
  const tp = getTotalProgress();
  const totalQ = data.topics.reduce((s, t) => s + t.questions.length, 0);
  statsBar.innerHTML = `
    <span class="header-stat">📚 <strong>${totalQ}</strong> total questions</span>
    <span class="header-stat">✅ <strong>${tp.read}</strong> completed</span>
    <span class="header-stat">📊 <strong>${tp.pct}%</strong> overall progress</span>
    <span class="header-stat">🏷 <strong>${data.topics.length}</strong> topics covered</span>
  `;
  progressLine.style.width = tp.pct + '%';
}

function updateProgressUI() {
  const tp = getTotalProgress();
  progressLine.style.width = tp.pct + '%';
  buildHeaderStats();
  updateSidebarProgress();
  if (homeScreen.style.display !== 'none') buildHomeScreen();
}

// ---- Home Screen ----
function buildHomeScreen() {
  homeGrid.innerHTML = '';
  data.topics.forEach(topic => {
    const p = getTopicProgress(topic.id);
    const card = document.createElement('div');
    card.className = 'topic-card';
    card.innerHTML = `
      <div class="topic-card-icon">${topic.icon}</div>
      <div class="topic-card-name">${topic.name}</div>
      <div class="topic-card-desc">${TOPIC_DESCRIPTIONS[topic.id] || ''}</div>
      <div class="topic-card-progress-wrap">
        <div class="topic-card-progress-fill" style="width:${p.pct}%"></div>
      </div>
      <div class="topic-card-meta">
        <span class="topic-card-count">${topic.questions.length} questions</span>
        <span class="topic-card-pct">${p.read}/${p.total} done</span>
      </div>
    `;
    card.addEventListener('click', () => selectTopic(topic.id));
    homeGrid.appendChild(card);
  });
}

function showHome() {
  homeScreen.style.display = 'block';
  questionsContainer.style.display = 'none';
  topicHeader.style.display = 'none';
  searchInfo.style.display = 'none';
  currentTopic = null;
  updateActiveSidebar();
  window.location.hash = '';
}

// ---- Topic Selection ----
function selectTopic(topicId) {
  currentTopic = topicId;
  searchActive = false;
  searchInput.value = '';
  clearSearch.style.display = 'none';
  searchInfo.style.display = 'none';

  const topic = data.topics.find(t => t.id === topicId);
  if (!topic) return;

  homeScreen.style.display = 'none';
  questionsContainer.style.display = 'flex';
  topicHeader.style.display = 'flex';

  topicIcon.textContent = topic.icon;
  topicTitle.textContent = topic.name;
  const p = getTopicProgress(topicId);
  topicCount.textContent = `${topic.questions.length} interview questions — ${p.read} completed`;

  renderQuestions(topic.questions, topicId);
  updateActiveSidebar();

  window.location.hash = topicId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Render Questions ----
function renderQuestions(questions, topicId, highlightTerm = '') {
  questionsContainer.innerHTML = '';
  if (questions.length === 0) {
    questionsContainer.innerHTML = '<p style="color:var(--text-muted);padding:40px 0">No questions found.</p>';
    return;
  }

  questions.forEach((q, idx) => {
    const card = buildQuestionCard(q, topicId || q.topicId, idx + 1, highlightTerm);
    questionsContainer.appendChild(card);
  });
}

function buildQuestionCard(q, topicId, displayIdx, highlightTerm = '') {
  const read = isRead(topicId, q.id);
  const card = document.createElement('div');
  card.className = `question-card${read ? ' read' : ''}`;
  card.dataset.qid = q.id;
  card.dataset.tid = topicId;

  const questionText = highlightTerm ? highlight(q.question, highlightTerm) : escapeHtml(q.question);

  card.innerHTML = `
    <div class="question-header">
      <div class="question-number">${displayIdx}</div>
      <div class="question-text">${questionText}</div>
      <div class="question-chevron">▼</div>
    </div>
    <div class="question-body">
      <div class="answer-section">
        <div class="answer-label">💡 Answer</div>
        <div class="answer-text">${escapeHtml(q.answer)}</div>
      </div>
      <div class="code-section">
        <div class="code-label">⚡ Code Example</div>
        <div class="code-block">
          <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          <pre>${escapeHtml(q.example)}</pre>
        </div>
      </div>
      <div class="question-footer">
        <button class="mark-read-btn ${read ? 'done' : 'unread'}" onclick="handleMarkRead(this, '${topicId}', ${q.id})">
          ${read ? '✓ Done' : '○ Mark Read'}
        </button>
      </div>
    </div>
  `;

  // Toggle open/close
  card.querySelector('.question-header').addEventListener('click', () => {
    const wasOpen = card.classList.contains('open');
    // Close others if desired (optional)
    card.classList.toggle('open', !wasOpen);
  });

  return card;
}

// ---- Mark Read ----
function handleMarkRead(btn, topicId, qId) {
  toggleRead(topicId, qId);
  const read = isRead(topicId, qId);
  const card = btn.closest('.question-card');

  btn.className = `mark-read-btn ${read ? 'done' : 'unread'}`;
  btn.textContent = read ? '✓ Done' : '○ Mark Read';
  card.classList.toggle('read', read);
  card.querySelector('.question-number').style.color = read ? 'var(--green)' : '';

  // Update topic count
  if (currentTopic) {
    const p = getTopicProgress(currentTopic);
    topicCount.textContent = `${data.topics.find(t=>t.id===currentTopic).questions.length} interview questions — ${p.read} completed`;
  }

  showToast(read ? '✓ Marked as reviewed!' : 'Unmarked');
}

// ---- Expand/Collapse All ----
document.getElementById('expandAll').addEventListener('click', () => {
  document.querySelectorAll('.question-card').forEach(c => c.classList.add('open'));
});
document.getElementById('collapseAll').addEventListener('click', () => {
  document.querySelectorAll('.question-card').forEach(c => c.classList.remove('open'));
});
document.getElementById('markAllRead').addEventListener('click', () => {
  if (!currentTopic) return;
  const topic = data.topics.find(t => t.id === currentTopic);
  topic.questions.forEach(q => {
    if (!progress[currentTopic]) progress[currentTopic] = {};
    progress[currentTopic][q.id] = true;
  });
  saveProgress();
  // Re-render
  renderQuestions(topic.questions, currentTopic);
  updateProgressUI();
  const p = getTopicProgress(currentTopic);
  topicCount.textContent = `${topic.questions.length} interview questions — ${p.read} completed`;
  showToast('✓ All marked as reviewed!');
});

// ---- Search ----
searchInput.addEventListener('input', debounce(handleSearch, 250));

function handleSearch(e) {
  const term = e.target.value.trim();
  clearSearch.style.display = term ? 'block' : 'none';

  if (!term) {
    searchActive = false;
    searchInfo.style.display = 'none';
    if (currentTopic) {
      const topic = data.topics.find(t => t.id === currentTopic);
      renderQuestions(topic.questions, currentTopic);
    } else {
      showHome();
    }
    return;
  }

  searchActive = true;
  const results = searchQuestions(term);

  // Show/hide elements
  homeScreen.style.display = 'none';
  questionsContainer.style.display = 'flex';
  topicHeader.style.display = 'flex';
  topicIcon.textContent = '🔍';
  topicTitle.textContent = 'Search Results';

  searchInfo.style.display = 'block';
  if (results.length > 0) {
    const topics = [...new Set(results.map(r => r.topicName))];
    searchInfo.innerHTML = `Found <strong>${results.length}</strong> questions matching "<strong>${escapeHtml(term)}</strong>" across: ${topics.join(', ')}`;
    topicCount.textContent = `${results.length} results found`;
  } else {
    searchInfo.innerHTML = `No questions found for "<strong>${escapeHtml(term)}</strong>"`;
    topicCount.textContent = '0 results';
  }

  renderSearchResults(results, term);
}

function searchQuestions(term) {
  const t = term.toLowerCase();
  return allQuestions.filter(q =>
    q.question.toLowerCase().includes(t) ||
    q.answer.toLowerCase().includes(t) ||
    q.example.toLowerCase().includes(t) ||
    q.topicName.toLowerCase().includes(t)
  );
}

function renderSearchResults(results, term) {
  questionsContainer.innerHTML = '';
  if (results.length === 0) {
    questionsContainer.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:16px">🔍</div>
        <div>No results found. Try different keywords.</div>
      </div>`;
    return;
  }

  // Group by topic
  const grouped = {};
  results.forEach(q => {
    if (!grouped[q.topicId]) grouped[q.topicId] = [];
    grouped[q.topicId].push(q);
  });

  let globalIdx = 1;
  Object.entries(grouped).forEach(([topicId, qs]) => {
    const topic = data.topics.find(t => t.id === topicId);
    // Group header
    const header = document.createElement('div');
    header.style.cssText = 'padding:8px 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-top:12px';
    header.textContent = `${topic.icon} ${topic.name} (${qs.length})`;
    questionsContainer.appendChild(header);

    qs.forEach(q => {
      const card = buildQuestionCard(q, topicId, globalIdx++, term);
      questionsContainer.appendChild(card);
    });
  });
}

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch.style.display = 'none';
  searchInput.dispatchEvent(new Event('input'));
  searchInput.focus();
});

// ---- Copy Code ----
function copyCode(btn) {
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

// ---- Toast ----
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---- Utilities ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, term) {
  const safe = escapeHtml(text);
  const re = new RegExp(`(${escapeRegex(term)})`, 'gi');
  return safe.replace(re, '<mark style="background:rgba(91,115,255,0.3);color:#c0caff;border-radius:3px;padding:0 2px">$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ---- Init ----
init();