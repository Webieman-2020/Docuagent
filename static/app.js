/* ═══ app.js — DocuAgent Frontend Logic ═══ */

const API = window.location.origin;

// ── DOM refs ──
const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const fileName    = document.getElementById('file-name');
const fileMeta    = document.getElementById('file-meta');
const typeWrap    = document.getElementById('type-select-wrap');
const typeSelect  = document.getElementById('type-select');
const btnRun      = document.getElementById('btn-run');
const errBanner   = document.getElementById('error-banner');
const progressFill= document.getElementById('progress-fill');
const progressPct = document.getElementById('progress-pct');
const logWrap     = document.getElementById('log-wrap');
const resultsEl   = document.getElementById('results');
const stepBadges  = document.querySelectorAll('.step-badge');
const agentItems  = document.querySelectorAll('.agent-item');

const IMAGE_EXTS  = ['png','jpg','jpeg','tiff','bmp','webp','gif'];
let   currentFile = null;

// ── Drag & Drop ──
['dragenter','dragover'].forEach(e => dropZone.addEventListener(e, ev => {
  ev.preventDefault(); dropZone.classList.add('drag-over');
}));
['dragleave','drop'].forEach(e => dropZone.addEventListener(e, ev => {
  ev.preventDefault(); dropZone.classList.remove('drag-over');
}));
dropZone.addEventListener('drop', ev => {
  const f = ev.dataTransfer.files[0];
  if (f) handleFile(f);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(f) {
  currentFile = f;
  fileName.textContent = f.name;
  fileMeta.textContent = `${(f.size/1024).toFixed(1)} KB  •  ${f.type || 'unknown type'}`;
  filePreview.classList.add('show');
  const ext = f.name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    typeWrap.classList.add('show');
  } else {
    typeWrap.classList.remove('show');
    typeSelect.value = 'Auto-detect';
  }
  resetUI();
}

// ── UI helpers ──
function setProgress(pct) {
  progressFill.style.width = pct + '%';
  progressPct.textContent  = pct + '%';
}

function setStep(idx) {
  stepBadges.forEach((b, i) => {
    b.classList.remove('active','done');
    if (i < idx)  b.classList.add('done');
    if (i === idx) b.classList.add('active');
  });
  agentItems.forEach((a, i) => {
    a.classList.remove('active','done');
    if (i < idx)  a.classList.add('done');
    if (i === idx && idx < 5) a.classList.add('active');
    const icon = a.querySelector('.agent-status-icon');
    if (icon) {
      if (i < idx)  icon.textContent = '✅';
      if (i === idx && idx < 5) icon.textContent = '⏳';
      if (i > idx)  icon.textContent = '';
    }
  });
}

function appendLog(agentIdx, agentLabel, lines) {
  const colClass = `la${agentIdx}`;
  const ts = new Date().toLocaleTimeString('en-GB', {hour12:false});
  lines.forEach(line => {
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = `<span class="log-ts">[${ts}]</span><span class="log-agent ${colClass}">${agentLabel}</span><span class="log-text">${line}</span>`;
    logWrap.appendChild(div);
    logWrap.scrollTop = logWrap.scrollHeight;
  });
}

function showError(msg) {
  errBanner.textContent = '⚠ ' + msg;
  errBanner.classList.add('show');
}

function resetUI() {
  errBanner.classList.remove('show');
  logWrap.innerHTML = '';
  resultsEl.innerHTML = idleHTML();
  setProgress(0);
  setStep(-1);
  stepBadges.forEach(b => b.classList.remove('active','done'));
  agentItems.forEach(a => {
    a.classList.remove('active','done');
    const ic = a.querySelector('.agent-status-icon');
    if (ic) ic.textContent = '';
  });
}

function idleHTML() {
  return `<div class="idle-msg">
    <div class="idle-icon">📋</div>
    <div class="idle-text">Upload a document and run the pipeline to see results here.</div>
  </div>`;
}

// ── Animate results ──
function renderResults(data) {
  const s  = data.summary;
  const ag = data.agents;
  const meta   = ag[0].result;
  const clf    = ag[1].result;
  const ext    = ag[2].result;
  const val    = ag[3].result;
  const rte    = ag[4].result;
  const fields = ext.fields;

  // Extraction grid
  const extItems = Object.entries(fields).map(([k,v]) => `
    <div class="ext-field">
      <div class="ext-key">${k}</div>
      <div class="ext-val">${v}</div>
    </div>`).join('');

  // Validation checks
  const checksHTML = val.checks.map(c => `
    <div class="check-item">
      <span class="check-icon">${c.pass ? '✅' : '❌'}</span>
      <span>${c.rule}</span>
    </div>`).join('');

  const errorsHTML = val.errors.length
    ? `<div class="error-banner show" style="margin-top:10px;">
        ${val.errors.join('  •  ')}
      </div>` : '';

  const confPct = Math.round(clf.confidence * 100);
  const valBadge = val.status === 'PASS' ? 'b-pass' : 'b-fail';

  resultsEl.innerHTML = `
  <div style="margin-bottom:16px;">
    <div class="step-row" id="req-steps"></div>
  </div>
  <div class="results-grid">

    <!-- Ingestion -->
    <div class="rcard" style="animation-delay:.05s">
      <div class="rcard-header">
        📥 Ingestion Agent &nbsp;<span class="badge b-success">SUCCESS</span>
      </div>
      <table class="kv">
        <tr><td>Filename</td><td>${meta.filename}</td></tr>
        <tr><td>File Size</td><td>${(meta.size_bytes/1024).toFixed(1)} KB</td></tr>
        <tr><td>Format</td><td>.${meta.extension.toUpperCase()}</td></tr>
        <tr><td>Timestamp</td><td>${meta.timestamp}</td></tr>
      </table>
    </div>

    <!-- Classification -->
    <div class="rcard" style="animation-delay:.12s">
      <div class="rcard-header">
        🔍 Classification Agent &nbsp;<span class="badge b-info">${confPct}% CONF</span>
      </div>
      <table class="kv">
        <tr><td>Document Type</td><td><strong>${clf.doc_type}</strong></td></tr>
        <tr><td>Confidence</td><td>${confPct}%</td></tr>
        <tr><td>Schema Loaded</td><td>${clf.doc_type}</td></tr>
        <tr><td>Broadcast</td><td>✓ Sent to all agents</td></tr>
      </table>
      <div class="conf-bar-wrap">
        <div style="font-size:.72rem;color:var(--c-muted);">Confidence</div>
        <div class="conf-bar"><div class="conf-fill" style="width:${confPct}%"></div></div>
      </div>
    </div>

    <!-- Extraction -->
    <div class="rcard rcard-full" style="animation-delay:.19s">
      <div class="rcard-header">
        📊 Extraction Agent &nbsp;<span class="badge b-info">${Object.keys(fields).length} FIELDS</span>
      </div>
      <div class="ext-grid">${extItems}</div>
    </div>

    <!-- Validation -->
    <div class="rcard rcard-full" style="animation-delay:.26s">
      <div class="rcard-header">
        ✅ Validation Agent &nbsp;<span class="badge ${valBadge}">${val.status}</span>
      </div>
      <div class="checks-grid">${checksHTML}</div>
      ${errorsHTML}
    </div>

    <!-- Routing -->
    <div class="rcard rcard-full" style="animation-delay:.33s">
      <div class="rcard-header">
        🚦 Routing Agent &nbsp;<span class="badge b-route">ROUTED</span>
      </div>
      <div class="routing-grid">
        <div>
          <div class="route-dest">${rte.destination}</div>
          <div class="route-sla">SLA: <strong>${rte.sla}</strong></div>
          <div class="route-reason">${rte.reason}</div>
        </div>
        <div>
          <div style="font-size:.78rem;color:var(--c-muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Next Actions</div>
          <ul class="actions-list">
            ${rte.actions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

  </div>

  <!-- Summary -->
  <div class="summary-box" style="animation:slideIn .5s ease .4s both;">
    <h3>🧠 Orchestrator — Pipeline Summary</h3>
    <p>
      The <strong>Ingestion Agent</strong> validated <code>${meta.filename}</code> (${(meta.size_bytes/1024).toFixed(1)} KB).
      The <strong>Classification Agent</strong> identified it as a <strong>${clf.doc_type}</strong>
      with <strong>${confPct}% confidence</strong> and broadcast this context to all downstream agents.
      The <strong>Extraction Agent</strong> self-configured its schema and pulled
      <strong>${Object.keys(fields).length} structured fields</strong>.
      The <strong>Validation Agent</strong> ran <strong>${val.checks.length} business rules</strong>
      — verdict: <strong>${val.status}</strong>.
      The <strong>Routing Agent</strong> assigned the document to <strong>${rte.destination}</strong>
      with an SLA of <strong>${rte.sla}</strong>.
    </p>
  </div>`;
}

// ── Run pipeline ──
btnRun.addEventListener('click', async () => {
  if (!currentFile) { showError('Please upload a document first.'); return; }
  btnRun.disabled = true;
  btnRun.textContent = '⏳  Processing…';
  resetUI();

  const AGENT_META = [
    {label:'📥 INGEST',   cls:'la1'},
    {label:'🔍 CLASSIFY', cls:'la2'},
    {label:'📊 EXTRACT',  cls:'la3'},
    {label:'✅ VALIDATE', cls:'la4'},
    {label:'🚦 ROUTE',    cls:'la5'},
  ];

  // Simulated progress steps while waiting for API
  const steps  = [0,20,40,60,80];
  let   stepIdx = 0;
  const ticker  = setInterval(() => {
    if (stepIdx < steps.length) {
      setProgress(steps[stepIdx]);
      setStep(stepIdx);
      // Append orch log
      if (stepIdx === 0) appendLog(0, '🧠 ORCH', ['Pipeline initialised — dispatching agents…']);
      stepIdx++;
    }
  }, 400);

  try {
    const form = new FormData();
    form.append('file', currentFile);
    const hint = typeSelect.value;
    if (hint && hint !== 'Auto-detect') form.append('doc_type_hint', hint);

    const resp = await fetch(`${API}/process`, { method:'POST', body:form });
    clearInterval(ticker);
    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const data = await resp.json();

    // Replay agent logs
    data.agents.forEach((ag, i) => {
      const m = AGENT_META[i];
      appendLog(i+1, m.label, ag.log);
    });
    appendLog(0, '🧠 ORCH', ['✅ All agents finished. Document processed successfully.']);

    // Final states
    setProgress(100);
    setStep(6);
    stepBadges.forEach(b => { b.classList.remove('active'); b.classList.add('done'); });
    agentItems.forEach(a => {
      a.classList.remove('active'); a.classList.add('done');
      const ic = a.querySelector('.agent-status-icon');
      if (ic) ic.textContent = '✅';
    });

    renderResults(data);
  } catch(err) {
    clearInterval(ticker);
    showError(err.message || 'Pipeline failed. Is the server running?');
  } finally {
    btnRun.disabled = false;
    btnRun.textContent = '⚡  Run Agent Pipeline';
  }
});
