// CredenceAI Fact Checker — Content Script


let fab = null;
let sidebar = null;
let overlay = null;
let selectedText = '';
let expandedCards = new Set();

// ── Inject sidebar + overlay into DOM ────────────────────────────────────
function injectUI() {
  if (document.getElementById('credence-sidebar')) return;

  // Overlay
  overlay = document.createElement('div');
  overlay.id = 'credence-overlay';
  overlay.addEventListener('click', closeSidebar);
  document.body.appendChild(overlay);

  // Sidebar
  sidebar = document.createElement('div');
  sidebar.id = 'credence-sidebar';
  sidebar.innerHTML = `
    <div id="credence-sidebar-header">
      <div>
        <div class="credence-logo">CredenceAI</div>
        <div class="credence-subtitle">FACT VERIFICATION ENGINE</div>
      </div>
      <button id="credence-close-btn" title="Close">✕</button>
    </div>
    <div id="credence-selected-text-label">SELECTED TEXT</div>
    <div id="credence-selected-text-box"></div>
    <div id="credence-body">
      <div id="credence-empty">
        <div class="credence-empty-icon">⚖</div>
        <div class="credence-empty-msg">SELECT TEXT ON ANY PAGE<br>AND CLICK THE CredenceAI BUTTON<br>TO FACT-CHECK IT</div>
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  document.getElementById('credence-close-btn').addEventListener('click', closeSidebar);
}

// ── Show floating button near selection ──────────────────────────────────
function showFAB(x, y) {
  if (!fab) {
    fab = document.createElement('div');
    fab.id = 'credence-fab';
    fab.innerHTML = `<span class="credence-fab-dot"></span>FACT CHECK`;
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      hideFAB();
      runFactCheck(selectedText);
    });
    document.body.appendChild(fab);
  }

  // Position near selection — keep within viewport
  const fabW = 120, fabH = 36;
  let left = x - fabW / 2;
  let top = y - fabH - 12;

  left = Math.max(8, Math.min(left, window.innerWidth - fabW - 8));
  top = top < 8 ? y + 16 : top;

  fab.style.left = `${left}px`;
  fab.style.top = `${top}px`;
  fab.style.display = 'flex';
  fab.style.animation = 'credence-fab-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both';
}

function hideFAB() {
  if (fab) {
    fab.style.display = 'none';
  }
}

// ── Listen for text selection ─────────────────────────────────────────────
document.addEventListener('mouseup', (e) => {
  // Don't trigger inside our own sidebar
  if (e.target.closest('#credence-sidebar') || e.target.closest('#credence-fab')) return;

  setTimeout(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();

    if (text && text.length >= 20) {
      selectedText = text;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + window.scrollY;
      injectUI();
      showFAB(x, y);
    } else {
      hideFAB();
    }
  }, 10);
});

// Hide FAB when clicking elsewhere
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('#credence-fab') || e.target.closest('#credence-sidebar')) return;
  hideFAB();
});

// ── Open/close sidebar ────────────────────────────────────────────────────
function openSidebar() {
  injectUI();
  sidebar.classList.add('credence-open');
  overlay.classList.add('credence-open');
  document.body.style.marginRight = '380px';
  document.body.style.transition = 'margin-right 0.3s ease';
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove('credence-open');
  if (overlay) overlay.classList.remove('credence-open');
  document.body.style.marginRight = '';
}

// ── Run fact check ────────────────────────────────────────────────────────
async function runFactCheck(text) {
  openSidebar();
  expandedCards.clear();

  const textBox = document.getElementById(
    'credence-selected-text-box'
  );

  if (textBox) {
    textBox.textContent = text;
  }

  setBodyContent(`
    <div id="credence-loading">
      <div class="credence-spinner"></div>
      <div class="credence-loading-text">ANALYZING...</div>
      <div class="credence-step" id="credence-step-label">
        EXTRACTING CLAIMS
      </div>
    </div>
  `);

  try {
    await chrome.runtime.sendMessage({
      command: 'backend_fact_check',
      text
    });

  } catch (err) {
    showError(
      err.message ||
      'Failed to start CredenceAI verification.'
    );
  }
}

// ── Update step label during loading ─────────────────────────────────────
function updateStepLabel(step) {
  const el = document.getElementById('credence-step-label');
  if (!el) return;
  const labels = {
    extracting: 'EXTRACTING CLAIMS',
    searching: 'SEARCHING EVIDENCE',
    verifying: 'VERIFYING CLAIMS',
    reporting: 'GENERATING REPORT',
    ai_detection: 'DETECTING AI CONTENT',
    pipeline_complete: 'COMPLETE',
  };
  el.textContent = labels[step] || step.toUpperCase();
}

// ── Render full report ────────────────────────────────────────────────────
function renderReport(report) {
  const claims = report.claims || [];
  const total = claims.length;

  if (total === 0) {
    setBodyContent(`
      <div id="credence-empty">
        <div class="credence-empty-icon">🔍</div>
        <div class="credence-empty-msg">NO VERIFIABLE CLAIMS FOUND<br>IN THE SELECTED TEXT.<br>TRY SELECTING TEXT WITH<br>FACTUAL STATEMENTS.</div>
      </div>
    `);
    return;
  }

  const counts = { TRUE: 0, PARTIALLY_TRUE: 0, FALSE: 0, UNVERIFIABLE: 0 };
  claims.forEach(c => { if (counts[c.verdict] !== undefined) counts[c.verdict]++; });
  const score = Math.round(((counts.TRUE + counts.PARTIALLY_TRUE * 0.5) / total) * 100);
  const scoreColor = score >= 75 ? '#00e887' : score >= 40 ? '#ff8c42' : '#ff4560';

  const statsHTML = `
    <div class="credence-score-ring">
      <div class="credence-score-number" style="color:${scoreColor}">${score}%</div>
      <div class="credence-score-label">ACCURACY SCORE</div>
    </div>
    <div id="credence-stats">
      <div class="credence-stat-card">
        <div class="credence-stat-val" style="color:#00e887">${counts.TRUE}</div>
        <div class="credence-stat-label">TRUE</div>
      </div>
      <div class="credence-stat-card">
        <div class="credence-stat-val" style="color:#ff8c42">${counts.PARTIALLY_TRUE}</div>
        <div class="credence-stat-label">PARTIAL</div>
      </div>
      <div class="credence-stat-card">
        <div class="credence-stat-val" style="color:#ff4560">${counts.FALSE}</div>
        <div class="credence-stat-label">FALSE</div>
      </div>
      <div class="credence-stat-card">
        <div class="credence-stat-val" style="color:#555">${counts.UNVERIFIABLE}</div>
        <div class="credence-stat-label">N/A</div>
      </div>
    </div>
  `;

  const claimsHTML = claims.map((c, i) => {
    const vClass = c.verdict === 'TRUE' ? 'TRUE'
      : c.verdict === 'FALSE' ? 'FALSE'
      : c.verdict === 'PARTIALLY_TRUE' ? 'PARTIAL'
      : 'UNVERIFIABLE';
    const confColor = c.confidence >= 75 ? '#00e887' : c.confidence >= 40 ? '#ff8c42' : '#ff4560';
    const borderColor = c.verdict === 'TRUE' ? '#00e887'
      : c.verdict === 'FALSE' ? '#ff4560'
      : c.verdict === 'PARTIALLY_TRUE' ? '#ff8c42'
      : '#333';

    return `
      <div class="credence-claim-card" style="border-left: 2px solid ${borderColor}44" data-index="${i}">
        <div class="credence-claim-header" onclick="credenceToggleCard(${i})">
          <span class="credence-claim-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="credence-claim-text">${escapeHtml(c.claim)}</span>
          <span class="credence-verdict-badge credence-verdict-${vClass}">${c.verdict}</span>
        </div>
        <div class="credence-claim-body" id="credence-card-body-${i}">
          <div class="credence-conf-row">
            <span>CONFIDENCE</span>
            <span style="color:${confColor}">${c.confidence}%</span>
          </div>
          <div class="credence-conf-bar-bg">
            <div class="credence-conf-bar-fill" style="width:${c.confidence}%;background:${confColor}"></div>
          </div>
          ${c.explanation ? `<div class="credence-explanation">${escapeHtml(c.explanation)}</div>` : ''}
          ${c.sources?.length ? `
            <div class="credence-sources">
              ${c.sources.slice(0, 3).map(s => `<a class="credence-source-item" href="${escapeHtml(s)}" target="_blank" rel="noopener">↗ ${escapeHtml(s)}</a>`).join('')}
            </div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  setBodyContent(`
    ${statsHTML}
    <div class="credence-section-title">CLAIMS · ${total} FOUND</div>
    ${claimsHTML}
    <div style="height:20px"></div>
  `);
}

// ── Toggle claim card expand/collapse ─────────────────────────────────────
window.credenceToggleCard = function(index) {
  const body = document.getElementById(`credence-card-body-${index}`);
  if (!body) return;
  body.classList.toggle('credence-expanded');
};

// ── Helpers ───────────────────────────────────────────────────────────────
function setBodyContent(html) {
  const body = document.getElementById('credence-body');
  if (body) body.innerHTML = html;
}

function showError(msg) {
  setBodyContent(`
    <div id="credence-error">
      <div class="credence-error-icon">⚠</div>
      <div class="credence-error-msg">${escapeHtml(msg)}</div>
    </div>
  `);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Background Message Listener ────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {

  // Context-menu / background trigger
  if (message.command === 'run_fact_check' && message.text) {
    selectedText = message.text;
    hideFAB();
    runFactCheck(selectedText);
    return;
  }


  // Backend SSE progress
  if (message.command === 'fact_check_progress') {

    const parsed = message.data;

    if (!parsed) {
      return;
    }

    updateStepLabel(parsed.step);

    // Final result
    if (
      parsed.step === 'pipeline_complete' &&
      parsed.status === 'completed'
    ) {

      const r = parsed.data;

      const mergedClaims = (r.claims || []).map(c => {

        const v =
          (r.verdicts || []).find(
            x => x.claim_id === c.id
          ) || {};

        return {
          id: c.id,
          claim: c.text,
          verdict: v.verdict || 'UNVERIFIABLE',

          confidence:
            v.confidence_score !== undefined
              ? (
                  v.confidence_score > 1
                    ? v.confidence_score
                    : Math.round(
                        v.confidence_score * 100
                      )
                )
              : 0,

          explanation: v.reasoning || '',

          sources: v.cited_sources || []
        };
      });

      const report = {
        ...r,
        claims: mergedClaims
      };

      renderReport(report);
    }

    return;
  }


  // Backend error
  if (message.command === 'fact_check_error') {

    showError(
      message.error ||
      'Failed to connect to the CredenceAI backend.'
    );

    return;
  }
});
