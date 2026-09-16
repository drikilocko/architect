/**
 * ════════════════════════════════════════════════════════
 *  DREAMYYSPACE.STD — VISUAL EDITOR v3  |  editor.js (core)
 *  Connect to any HTML: <script src="editor.js"></script>
 *  Requires: editor-left.js + editor-right.js
 * ════════════════════════════════════════════════════════
 */
window.VEP = window.VEP || {};

(function (G) {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────── */
  G.PIN        = '1234';          // Change this password!
  G.snapGrid   = 8;              // Snap grid size in px
  G.snapEnabled= false;
  G.darkMode   = false;
  G.undoStack  = [];
  G.redoStack  = [];
  G.snapshots  = JSON.parse(localStorage.getItem('vep_snapshots') || '[]');
  G.cssLog     = [];
  G.selectedEl = null;
  G.editActive = false;

  /* ── STATE ──────────────────────────────────────────── */
  let leftOpen  = true;
  let rightOpen = true;
  let isMoving  = false;
  let moveData  = {};
  let lastPinch = null, origFS = null;

  /* ═══════════════════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('vep-core-styles')) return;
    const s = document.createElement('style');
    s.id = 'vep-core-styles';
    s.textContent = `
      :root {
        --vep-accent: #FF4D00;
        --vep-accent-rgb: 255, 77, 0;
        --vep-bg: rgba(6,6,6,0.98);
        --vep-border: rgba(255,255,255,0.08);
        --vep-text: rgba(255,255,255,0.85);
        --vep-muted: rgba(255,255,255,0.35);
        --vep-w: 280px;
      }

      /* ── Sidebars ── */
      .vep-sidebar {
        position:fixed; top:0; bottom:0; width:var(--vep-w);
        background:var(--vep-bg); border:1px solid var(--vep-border);
        z-index:2147483600; display:flex; flex-direction:column;
        font-family:'Inter',system-ui,sans-serif; color:var(--vep-text);
        box-shadow:0 0 60px rgba(0,0,0,0.8);
        backdrop-filter:blur(20px); overflow:hidden;
        transition:transform .35s cubic-bezier(.77,0,.175,1);
      }
      #vep-left  { left:0; border-left:none; border-radius:0 16px 16px 0; }
      #vep-right { right:0; border-right:none; border-radius:16px 0 0 16px; }
      #vep-left.collapsed  { transform:translateX(calc(-1 * var(--vep-w) + 36px)); }
      #vep-right.collapsed { transform:translateX(calc(var(--vep-w) - 36px)); }

      /* ── Sidebar Header ── */
      .vep-sh {
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 14px 12px; border-bottom:1px solid var(--vep-border);
        background:rgba(var(--vep-accent-rgb),0.06); flex-shrink:0; user-select:none;
      }
      .vep-sh-title { font-size:9px; font-weight:800; letter-spacing:.15em; color:var(--vep-accent); text-transform:uppercase; }
      .vep-collapse-btn {
        background:rgba(255,255,255,0.06); border:1px solid var(--vep-border);
        border-radius:8px; width:26px; height:26px; display:flex; align-items:center;
        justify-content:center; cursor:pointer; font-size:12px; color:var(--vep-muted);
        transition:all .2s; flex-shrink:0;
      }
      .vep-collapse-btn:hover { background:rgba(var(--vep-accent-rgb),0.2); color:#fff; border-color:var(--vep-accent); }

      /* ── Sidebar Body ── */
      .vep-sb { flex:1; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(var(--vep-accent-rgb),.3) transparent; overscroll-behavior:contain; }

      /* ── Tabs ── */
      .vep-tabs { display:flex; flex-wrap:wrap; gap:3px; padding:10px 10px 0; }
      .vep-tab {
        padding:5px 9px; font-size:8.5px; font-weight:700; letter-spacing:.07em;
        background:rgba(255,255,255,.04); border:1px solid var(--vep-border);
        border-radius:7px; color:var(--vep-muted); cursor:pointer; text-transform:uppercase;
        transition:all .18s;
      }
      .vep-tab:hover { color:#fff; border-color:rgba(var(--vep-accent-rgb),.4); }
      .vep-tab.on { background:rgba(var(--vep-accent-rgb),.85); color:#fff; border-color:transparent; }
      .vep-tc { display:none; padding:10px; }
      .vep-tc.on { display:block; }

      /* ── Form Elements ── */
      .vr  { margin-bottom:10px; }
      .vl  { font-size:9px; font-weight:700; letter-spacing:.09em; color:var(--vep-muted); display:block; margin-bottom:5px; text-transform:uppercase; }
      .vi, .vsel { width:100%; background:rgba(255,255,255,.05); border:1px solid var(--vep-border);
        border-radius:8px; color:#fff; padding:8px 10px; font-size:11px; font-family:inherit;
        outline:none; box-sizing:border-box; }
      .vi:focus,.vsel:focus { border-color:rgba(var(--vep-accent-rgb),.55); }
      textarea.vi { resize:vertical; }
      .vsel option { background:#111; }
      .vslrow { display:flex; align-items:center; gap:8px; }
      .vslrow input[type=range] {
        flex:1; -webkit-appearance:none; height:4px; border-radius:2px;
        background:rgba(255,255,255,.1); outline:none; border:none; padding:0;
      }
      .vslrow input[type=range]::-webkit-slider-thumb {
        -webkit-appearance:none; width:14px; height:14px; border-radius:50%;
        background:var(--vep-accent); cursor:pointer;
      }
      .vslrow span { font-size:10px; font-weight:700; color:var(--vep-muted); min-width:42px; text-align:right; }
      .vcrow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      input[type=color] { width:30px; height:30px; border:1px solid var(--vep-border); border-radius:7px; background:none; padding:2px; cursor:pointer; }
      .vbsm {
        padding:4px 10px; font-size:9px; font-weight:700; letter-spacing:.05em;
        background:rgba(255,255,255,.06); border:1px solid var(--vep-border);
        border-radius:100px; color:var(--vep-muted); cursor:pointer; transition:all .18s; text-transform:uppercase;
      }
      .vbsm:hover,.vbsm.on { background:rgba(var(--vep-accent-rgb),.3); color:#fff; border-color:var(--vep-accent); }
      .vbig { width:100%; padding:10px; font-size:11px; font-weight:700; letter-spacing:.07em; border-radius:10px;
        border:1px solid rgba(var(--vep-accent-rgb),.3); background:rgba(var(--vep-accent-rgb),.08); color:var(--vep-accent);
        cursor:pointer; text-transform:uppercase; transition:all .2s; }
      .vbig:hover { background:var(--vep-accent); color:#fff; }
      .vdanger { border-color:rgba(255,60,60,.35); background:rgba(255,60,60,.06); color:rgba(255,110,110,.8); }
      .vdanger:hover { background:rgba(255,60,60,.3); color:#fff; }
      .vinfo { font-size:10px; color:var(--vep-muted); line-height:1.65; background:rgba(255,255,255,.03); border-radius:8px; padding:9px 11px; }
      .vsep { border:none; border-top:1px solid var(--vep-border); margin:10px 0; }

      /* ── Handles ── */
      #vep-handles { position:fixed; z-index:2147483610; pointer-events:none; display:none; }
      #vep-handles.show { display:block; }
      /* corner action buttons */
      .veph {
        position:absolute; width:26px; height:26px; border-radius:50%;
        background:rgba(0,0,0,0.9); border:1.5px solid rgba(255,255,255,0.2);
        display:flex; align-items:center; justify-content:center; cursor:pointer;
        pointer-events:all; font-size:12px; box-shadow:0 4px 14px rgba(0,0,0,.7);
        transition:background .15s,transform .15s; user-select:none; color:#fff;
      }
      .veph:hover { background:rgba(var(--vep-accent-rgb),.9); transform:scale(1.2); }
      #veph-move   { top:-13px; left:50%; transform:translateX(-50%); cursor:grab; }
      #veph-move:active { cursor:grabbing; }
      #veph-del    { top:-13px; right:-13px; }
      #veph-shrink { bottom:-13px; left:-13px; }
      #veph-grow   { bottom:-13px; right:-13px; }
      #veph-edit   { top:-13px; left:-13px; }

      /* edge resize bars — hidden by default, shown when stretch mode is ON */
      .vep-resize-edge {
        position:absolute; pointer-events:none; z-index:2;
        background:rgba(var(--vep-accent-rgb),0.65);
        border-radius:100px;
        opacity:0;
        transition:opacity .2s, background .15s;
      }
      #vep-handles.stretch-on .vep-resize-edge { opacity:1; pointer-events:all; }
      .vep-resize-edge:hover { background:rgba(var(--vep-accent-rgb),1); }
      #veph-res-top    { left:16px; right:16px; height:6px; top:-3px;    cursor:ns-resize; }
      #veph-res-bottom { left:16px; right:16px; height:6px; bottom:-3px; cursor:ns-resize; }
      #veph-res-left   { top:16px; bottom:16px; width:6px;  left:-3px;   cursor:ew-resize; }
      #veph-res-right  { top:16px; bottom:16px; width:6px;  right:-3px;  cursor:ew-resize; }
      /* corner diamonds — hidden by default too */
      .vep-resize-corner {
        position:absolute; width:10px; height:10px; border-radius:2px;
        background:var(--vep-accent); border:1.5px solid #fff; pointer-events:none;
        z-index:3; box-shadow:0 2px 8px rgba(0,0,0,.6);
        opacity:0; transition:opacity .2s;
      }
      #vep-handles.stretch-on .vep-resize-corner { opacity:1; pointer-events:all; }
      #veph-res-nw { top:-5px;    left:-5px;  cursor:nwse-resize; }
      #veph-res-ne { top:-5px;    right:-5px; cursor:nesw-resize; }
      #veph-res-sw { bottom:-5px; left:-5px;  cursor:nesw-resize; }
      #veph-res-se { bottom:-5px; right:-5px; cursor:nwse-resize; }
      /* stretch toggle icon — always visible on the frame */
      #veph-stretch-toggle {
        position:absolute; bottom:-14px; left:50%; transform:translateX(-50%);
        width:26px; height:26px; border-radius:8px;
        background:rgba(0,0,0,0.88); border:1.5px solid rgba(255,255,255,0.18);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; pointer-events:all; font-size:11px; color:rgba(255,255,255,.55);
        box-shadow:0 3px 12px rgba(0,0,0,.6); transition:all .2s; user-select:none;
        z-index:4;
      }
      #veph-stretch-toggle:hover { background:rgba(var(--vep-accent-rgb),.25); color:#fff; border-color:rgba(var(--vep-accent-rgb),.5); }
      #vep-handles.stretch-on #veph-stretch-toggle { background:rgba(var(--vep-accent-rgb),.9); color:#fff; border-color:transparent; box-shadow:0 0 14px rgba(var(--vep-accent-rgb),.5); }
      /* reset stretch button — appears only when stretch-on */
      #veph-stretch-reset {
        position:absolute; bottom:-14px; left:calc(50% + 16px);
        width:26px; height:26px; border-radius:8px;
        background:rgba(0,0,0,0.88); border:1.5px solid rgba(255,255,255,0.12);
        display:none; align-items:center; justify-content:center;
        cursor:pointer; pointer-events:all; font-size:12px; color:rgba(255,255,255,.45);
        box-shadow:0 3px 12px rgba(0,0,0,.6); transition:all .2s; user-select:none;
        z-index:4;
      }
      #vep-handles.stretch-on #veph-stretch-reset { display:flex; }
      #veph-stretch-reset:hover { background:rgba(255,100,100,.3); color:#fff; border-color:rgba(255,80,80,.5); }

      /* ── Selection rings ── */
      .vep-selected { outline:2px solid var(--vep-accent) !important; outline-offset:4px; }
      .vep-hovered:not(.vep-selected) { outline:1px dashed rgba(var(--vep-accent-rgb),.4) !important; outline-offset:3px; cursor:pointer !important; }
      .vep-inline-edit { outline:2px solid var(--vep-accent) !important; outline-offset:2px; background:rgba(var(--vep-accent-rgb),.04) !important; caret-color:var(--vep-accent); }

      /* ── Selected info bar ── */
      #vep-sel-bar {
        position:fixed; bottom:0; left:50%; transform:translateX(-50%);
        z-index:2147483620; background:rgba(0,0,0,0.92); border:1px solid var(--vep-border);
        border-radius:16px 16px 0 0; padding:8px 24px; display:none;
        align-items:center; gap:12px; font-size:10px; font-weight:700;
        color:var(--vep-muted); backdrop-filter:blur(16px); white-space:nowrap;
        box-shadow:0 -8px 40px rgba(0,0,0,.6);
      }
      #vep-sel-bar.show { display:flex; }
      #vep-sel-bar .vep-tag { background:rgba(var(--vep-accent-rgb),.3); color:var(--vep-accent); padding:2px 10px; border-radius:100px; font-size:9px; }

      /* ── Badge ── */
      #vep-badge {
        position:fixed; top:70px; left:50%; transform:translateX(-50%);
        background:rgba(var(--vep-accent-rgb),.92); color:#fff; font-size:9px; font-weight:800;
        letter-spacing:.18em; padding:6px 20px; border-radius:100px; z-index:2147483630;
        display:none; pointer-events:none; box-shadow:0 8px 30px rgba(var(--vep-accent-rgb),.5);
      }
      #vep-badge.show { display:block; }

      /* ── Responsive frame ── */
      #vep-resp-frame {
        display:none; position:fixed; inset:0; z-index:2147483590;
        background:rgba(0,0,0,0.85); align-items:center; justify-content:center;
      }
      #vep-resp-frame.show { display:flex; flex-direction:column; gap:12px; }
      #vep-resp-frame iframe {
        background:#fff; border:none; border-radius:8px;
        box-shadow:0 40px 100px rgba(0,0,0,.9); transition:all .4s ease;
      }
      #vep-resp-tools {
        display:flex; gap:10px; align-items:center;
      }

      /* ── Password ── */
      #vep-pin-overlay {
        display:none; position:fixed; inset:0; z-index:2147483650;
        background:rgba(0,0,0,0.97); align-items:center; justify-content:center;
        backdrop-filter:blur(20px);
      }
      #vep-pin-overlay.show { display:flex; }
      #vep-pin-box {
        background:rgba(15,15,15,1); border:1px solid var(--vep-border);
        border-radius:20px; padding:36px 40px; width:280px; text-align:center;
        box-shadow:0 40px 80px rgba(0,0,0,.8);
      }
      #vep-pin-box h3 { font-size:18px; font-weight:900; color:#fff; margin:0 0 6px; }
      #vep-pin-box p  { font-size:11px; color:var(--vep-muted); margin:0 0 20px; }
      #vep-pin-input {
        width:100%; text-align:center; font-size:24px; letter-spacing:.5em; font-weight:800;
        background:rgba(255,255,255,.05); border:1px solid var(--vep-border);
        border-radius:12px; color:#fff; padding:14px 20px; outline:none;
        box-sizing:border-box; -webkit-text-security:disc; margin-bottom:14px;
        transition:border-color .2s;
      }
      #vep-pin-input:focus { border-color:var(--vep-accent); }
      #vep-pin-err { font-size:10px; color:#ff4444; display:none; margin-top:-8px; margin-bottom:10px; }

      /* ── Snap overlay ── */
      #vep-snap-grid {
        display:none; position:fixed; inset:0; z-index:1;
        pointer-events:none;
        background-image:
          linear-gradient(rgba(var(--vep-accent-rgb),0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(var(--vep-accent-rgb),0.07) 1px, transparent 1px);
        background-size: 8px 8px;
      }
      #vep-snap-grid.show { display:block; }

      /* ── Edit Mode Toggle btn active ── */
      #editor-toggle-btn.editor-on {
        background:rgba(var(--vep-accent-rgb),.15) !important;
        border-color:var(--vep-accent) !important;
        color:var(--vep-accent) !important;
      }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════
     PASSWORD
  ═══════════════════════════════════════════════════════ */
  function buildPinOverlay() {
    const d = document.createElement('div');
    d.id = 'vep-pin-overlay';
    d.innerHTML = `
      <div id="vep-pin-box">
        <h3>⚡ DREAMYYSPACE EDITOR</h3>
        <p>Enter your PIN to unlock the editor</p>
        <input id="vep-pin-input" type="password" inputmode="numeric" maxlength="8" placeholder="••••" autocomplete="off">
        <div id="vep-pin-err">Incorrect PIN. Try again.</div>
        <button class="vbig" id="vep-pin-btn">Unlock</button>
        <button style="margin-top:8px;width:100%;background:none;border:none;color:var(--vep-muted);font-size:10px;cursor:pointer" id="vep-pin-cancel">Cancel</button>
      </div>`;
    document.body.appendChild(d);

    const inp = document.getElementById('vep-pin-input');
    const err = document.getElementById('vep-pin-err');

    function tryPin() {
      if (inp.value === G.PIN) {
        d.classList.remove('show');
        err.style.display = 'none';
        launchEditor();
      } else {
        err.style.display = 'block';
        inp.value = '';
        inp.focus();
        inp.style.borderColor = '#ff4444';
        setTimeout(() => inp.style.borderColor = '', 1000);
      }
    }

    document.getElementById('vep-pin-btn').addEventListener('click', tryPin);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
    document.getElementById('vep-pin-cancel').addEventListener('click', () => d.classList.remove('show'));
  }

  /* ═══════════════════════════════════════════════════════
     TOGGLE BUTTON
  ═══════════════════════════════════════════════════════ */
  const toggleBtn = document.getElementById('editor-toggle-btn');
  const dot       = document.getElementById('editor-dot');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    if (G.editActive) {
      deactivateEditor();
    } else {
      // Show PIN
      injectStyles();
      document.getElementById('vep-pin-overlay')
        ? document.getElementById('vep-pin-overlay').classList.add('show')
        : (buildPinOverlay(), document.getElementById('vep-pin-overlay').classList.add('show'));
      setTimeout(() => document.getElementById('vep-pin-input')?.focus(), 100);
    }
  });

  /* ═══════════════════════════════════════════════════════
     LAUNCH / ACTIVATE
  ═══════════════════════════════════════════════════════ */
  function launchEditor() {
    G.editActive = true;
    toggleBtn.classList.add('editor-on');
    if (dot) dot.style.background = 'var(--vep-accent)';

    // Build left + right panels if not already built
    if (typeof window.VEP_buildLeft  === 'function') window.VEP_buildLeft();
    if (typeof window.VEP_buildRight === 'function') window.VEP_buildRight();

    buildHandles();
    buildSelBar();
    buildBadge();
    buildSnapGrid();
    buildRespFrame();

    document.getElementById('vep-badge').classList.add('show');

    document.addEventListener('click',    onDocClick,    true);
    document.addEventListener('dblclick', onDocDblClick, true);
    document.addEventListener('mouseover',onDocHover,    true);
    document.addEventListener('mouseout', onDocOut,      true);
    window.addEventListener('scroll', refreshHandles, { passive:true });
    window.addEventListener('resize', refreshHandles);

    // ── Sidebar scroll isolation ──────────────────────────────
    // Prevent page scroll when mouse wheel is used over a sidebar
    // (only runs once even if launchEditor is called multiple times)
    if (!G._wheelBound) {
      G._wheelBound = true;
      document.addEventListener('wheel', function(e) {
        const panels = [
          document.getElementById('vep-left'),
          document.getElementById('vep-right')
        ];
        // Check if the event target is inside any sidebar
        const inPanel = panels.some(p => p && p.contains(e.target));
        if (inPanel) {
          e.stopPropagation();   // don't let page scroll
          // let the sidebar body scroll normally (default not prevented)
        }
      }, { passive: true, capture: true });
    }
  }

  function deactivateEditor() {
    G.editActive = false;
    toggleBtn.classList.remove('editor-on');
    if (dot) dot.style.background = 'rgba(255,255,255,0.3)';

    ['vep-left','vep-right','vep-handles','vep-sel-bar','vep-badge','vep-snap-grid','vep-resp-frame']
      .forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('show'); });

    document.querySelectorAll('.vep-selected,.vep-hovered,.vep-inline-edit')
      .forEach(el => el.classList.remove('vep-selected','vep-hovered','vep-inline-edit'));

    G.selectedEl = null;
    document.removeEventListener('click',    onDocClick,    true);
    document.removeEventListener('dblclick', onDocDblClick, true);
    document.removeEventListener('mouseover',onDocHover,    true);
    document.removeEventListener('mouseout', onDocOut,      true);
  }

  G.deactivate = deactivateEditor;

  /* ═══════════════════════════════════════════════════════
     BUILD HANDLES / ELEMENTS
  ═══════════════════════════════════════════════════════ */
  function buildHandles() {
    if (document.getElementById('vep-handles')) return;
    const h = document.createElement('div');
    h.id = 'vep-handles';
    h.innerHTML = `
      <div class="veph" id="veph-edit"   title="Edit (or double-click)">✎</div>
      <div class="veph" id="veph-move"   title="Drag to move">⊹</div>
      <div class="veph" id="veph-del"    title="Delete element">✕</div>
      <div class="veph" id="veph-shrink" title="Reduce font size">−</div>
      <div class="veph" id="veph-grow"   title="Increase font size">+</div>
      <!-- stretch toggle icon (bottom-center) -->
      <div id="veph-stretch-toggle" title="Toggle text stretch handles">↔</div>
      <div id="veph-stretch-reset"  title="Reset stretch to 100%">↺</div>
      <!-- 4 edge stretch bars (hidden until toggle) -->
      <div class="vep-resize-edge" id="veph-res-top"    title="Stretch height ↑↓"></div>
      <div class="vep-resize-edge" id="veph-res-bottom" title="Stretch height ↑↓"></div>
      <div class="vep-resize-edge" id="veph-res-left"   title="Stretch width ↔"></div>
      <div class="vep-resize-edge" id="veph-res-right"  title="Stretch width ↔"></div>
      <!-- 4 corner diamonds (hidden until toggle) -->
      <div class="vep-resize-corner" id="veph-res-nw"></div>
      <div class="vep-resize-corner" id="veph-res-ne"></div>
      <div class="vep-resize-corner" id="veph-res-sw"></div>
      <div class="vep-resize-corner" id="veph-res-se"></div>`;
    document.body.appendChild(h);

    document.getElementById('veph-move').addEventListener('mousedown',  startMove);
    document.getElementById('veph-move').addEventListener('touchstart', startMoveTouch, { passive:false });
    document.getElementById('veph-del').addEventListener('click', () => {
      if (!G.selectedEl) return;
      if (confirm('Delete this element?')) { G.selectedEl.remove(); G.selectedEl=null; hideHandles(); }
    });
    document.getElementById('veph-grow').addEventListener('click', () => { changeFontSize(1.15); });
    document.getElementById('veph-shrink').addEventListener('click', () => { changeFontSize(1/1.15); });
    document.getElementById('veph-edit').addEventListener('click', () => { if(G.selectedEl) startInlineEdit(G.selectedEl); });

    // Stretch toggle: click to show/hide the bars
    document.getElementById('veph-stretch-toggle').addEventListener('click', () => {
      h.classList.toggle('stretch-on');
      document.getElementById('veph-stretch-toggle').textContent =
        h.classList.contains('stretch-on') ? '↕' : '↔';
    });

    // Reset stretch: remove scaleX/scaleY, restore transform to previous state
    document.getElementById('veph-stretch-reset').addEventListener('click', () => {
      if (!G.selectedEl) return;
      const el = G.selectedEl;
      // push to undo stack before resetting
      G.undoStack.push({ el, prop: 'transform', prev: el.style.transform });
      G.redoStack = [];
      // strip only scale values, keep other transforms (rotate, translate…)
      let t = (el.style.transform || '')
        .replace(/scaleX\([-\d.]+\)/g, '')
        .replace(/scaleY\([-\d.]+\)/g, '')
        .trim();
      el.style.transform = t || '';
      G.log(el, 'transform', el.style.transform);
      positionHandles(el);
    });

    // Bind resize edges (only active when bars are visible via CSS)
    [['veph-res-top','top'],['veph-res-bottom','bottom'],
     ['veph-res-left','left'],['veph-res-right','right'],
     ['veph-res-nw','nw'],['veph-res-ne','ne'],
     ['veph-res-sw','sw'],['veph-res-se','se']
    ].forEach(([id, dir]) => {
      document.getElementById(id).addEventListener('mousedown', e => startResize(e, dir));
    });
  }

  function buildSelBar() {
    if (document.getElementById('vep-sel-bar')) return;
    const b = document.createElement('div'); b.id = 'vep-sel-bar'; document.body.appendChild(b);
  }
  function buildBadge() {
    if (document.getElementById('vep-badge')) return;
    const b = document.createElement('div'); b.id = 'vep-badge'; b.textContent = '⚡ EDIT MODE'; document.body.appendChild(b);
  }
  function buildSnapGrid() {
    if (document.getElementById('vep-snap-grid')) return;
    const g = document.createElement('div'); g.id = 'vep-snap-grid'; document.body.appendChild(g);
  }
  function buildRespFrame() {
    if (document.getElementById('vep-resp-frame')) return;
    const f = document.createElement('div'); f.id = 'vep-resp-frame'; document.body.appendChild(f);
  }

  /* ═══════════════════════════════════════════════════════
     ELEMENT INTERACTION
  ═══════════════════════════════════════════════════════ */
  function isInternal(el) {
    if (!el) return false;
    // Exclude by ID prefix or specific class
    if (el.id && (el.id.startsWith('vep-') || el.id.startsWith('editor-'))) return true;
    // Exclude if inside an editor container
    const panels = ['vep-left','vep-right','vep-handles','vep-sel-bar','vep-pin-overlay','vep-resp-frame','vep-promod','vep-badge','vep-save-bar'];
    return panels.some(id => { const p=document.getElementById(id); return p&&(p===el||p.contains(el)); })
      || (toggleBtn && (el===toggleBtn||toggleBtn.contains(el)));
  }

  function onDocHover(e) {
    if(!G.editActive||isInternal(e.target))return;
    e.target.classList.add('vep-hovered');
    // Sync layer panel hover
    if (typeof window.VEP_highlightLayerHover === 'function') window.VEP_highlightLayerHover(e.target);
  }
  function onDocOut(e) {
    e.target.classList.remove('vep-hovered');
    if (typeof window.VEP_clearLayerHover === 'function') window.VEP_clearLayerHover();
  }

  function onDocClick(e) {
    if (!G.editActive||isInternal(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    selectElement(e.target);
  }
  function onDocDblClick(e) {
    if (!G.editActive||isInternal(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    startInlineEdit(e.target);
  }

  G.selectElement = selectElement;
  function selectElement(el) {
    // Prevent selecting tiny inline spans as standalone components (confuses the user)
    // UNLESS it has been specifically split into an item (.vep-item)
    const inlineTags = ['SPAN', 'STRONG', 'B', 'I', 'EM', 'MARK', 'U'];
    while (el && inlineTags.includes(el.tagName) && !el.classList.contains('vep-item') && el.parentElement) {
       // if it has a specific component class we might want to keep it, but generally we climb up
       el = el.parentElement;
    }

    document.querySelectorAll('.vep-selected').forEach(x => x.classList.remove('vep-selected'));
    G.selectedEl = el;
    el.classList.add('vep-selected');
    positionHandles(el);
    updateSelBar(el);
    // Notify right panel
    if (typeof window.VEP_syncRight === 'function') window.VEP_syncRight(el);
    // Notify left panel (layers highlight)
    if (typeof window.VEP_syncLeft  === 'function') window.VEP_syncLeft(el);
  }

  function startInlineEdit(el) {
    if (!el || el.tagName === 'IMG') return;
    selectElement(el);
    el.contentEditable = 'true';
    el.classList.add('vep-inline-edit');
    el.focus();
    el.addEventListener('blur', () => {
      el.contentEditable = 'false';
      el.classList.remove('vep-inline-edit');
      G.log(el, 'innerText', el.innerText || '');
    }, { once: true });
  }

  /* ═══════════════════════════════════════════════════════
     HANDLES POSITIONING
  ═══════════════════════════════════════════════════════ */
  function positionHandles(el) {
    const h = document.getElementById('vep-handles');
    if (!h||!el) return;
    const r = el.getBoundingClientRect();
    h.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    h.classList.add('show');
  }
  function hideHandles() {
    const h = document.getElementById('vep-handles'); if(h) h.classList.remove('show');
  }
  function refreshHandles() {
    if (G.selectedEl) positionHandles(G.selectedEl);
  }

  /* ═══════════════════════════════════════════════════════
     DRAG TO MOVE
  ═══════════════════════════════════════════════════════ */
  function startMove(e) {
    if (!G.selectedEl) return; e.preventDefault();
    isMoving = true;
    const cs = getComputedStyle(G.selectedEl);
    moveData = { sx: e.clientX, sy: e.clientY,
      ol: parseFloat(cs.left)||G.selectedEl.offsetLeft,
      ot: parseFloat(cs.top) ||G.selectedEl.offsetTop };
    G.selectedEl.style.position = 'absolute';
    document.addEventListener('mousemove', doMove);
    document.addEventListener('mouseup',   endMove);
  }
  function doMove(e) {
    if (!isMoving||!G.selectedEl) return;
    let x = moveData.ol + e.clientX - moveData.sx;
    let y = moveData.ot + e.clientY - moveData.sy;
    if (G.snapEnabled) { x = Math.round(x/G.snapGrid)*G.snapGrid; y = Math.round(y/G.snapGrid)*G.snapGrid; }
    G.selectedEl.style.left = x+'px'; G.selectedEl.style.top = y+'px';
    positionHandles(G.selectedEl);
  }
  function endMove() {
    isMoving = false;
    if (G.selectedEl) { G.log(G.selectedEl,'left',G.selectedEl.style.left); G.log(G.selectedEl,'top',G.selectedEl.style.top); }
    document.removeEventListener('mousemove',doMove); document.removeEventListener('mouseup',endMove);
  }

  /* ═══════════════════════════════════════════════════════
     TEXT STRETCH BY EDGE DRAG  →  scaleX / scaleY
     Left/Right bars  → stretch text width  (scaleX)
     Top/Bottom bars  → stretch text height (scaleY)
     Corners          → both axes together
  ═══════════════════════════════════════════════════════ */
  let isResizing = false, resizeDir = '', resizeData = {};
  let _scaleTip  = null;

  /* extract current scaleX / scaleY from inline transform */
  function _getScale(el) {
    const t  = el.style.transform || '';
    const mx = t.match(/scaleX\(([-\d.]+)\)/);
    const my = t.match(/scaleY\(([-\d.]+)\)/);
    return { x: mx ? parseFloat(mx[1]) : 1, y: my ? parseFloat(my[1]) : 1 };
  }

  /* write scaleX / scaleY back, preserving other transforms (rotate, translate…) */
  function _setScale(el, sx, sy) {
    let t = (el.style.transform || '')
      .replace(/scaleX\([-\d.]+\)/g, '')
      .replace(/scaleY\([-\d.]+\)/g, '')
      .trim();
    const cx = Math.max(0.05, sx).toFixed(3);
    const cy = Math.max(0.05, sy).toFixed(3);
    el.style.transform = (t + ` scaleX(${cx}) scaleY(${cy})`).trim();
  }

  /* tiny tooltip that follows the element during stretch */
  function _showTip(el, sx, sy) {
    if (!_scaleTip) {
      _scaleTip = document.createElement('div');
      _scaleTip.style.cssText =
        'position:fixed;z-index:2147483699;background:rgba(0,0,0,.88);' +
        'color:var(--vep-accent);font-size:10px;font-weight:700;padding:4px 12px;' +
        'border-radius:100px;pointer-events:none;letter-spacing:.06em;' +
        'font-family:Inter,system-ui,sans-serif;border:1px solid rgba(var(--vep-accent-rgb),.35);' +
        'box-shadow:0 4px 16px rgba(0,0,0,.5);transition:opacity .1s;';
      document.body.appendChild(_scaleTip);
    }
    const r = el.getBoundingClientRect();
    _scaleTip.style.left    = (r.left + r.width / 2 - 60) + 'px';
    _scaleTip.style.top     = (r.bottom + 10) + 'px';
    _scaleTip.style.opacity = '1';
    _scaleTip.textContent   = `↔ ${(sx * 100).toFixed(0)}%  ↕ ${(sy * 100).toFixed(0)}%`;
  }
  function _hideTip() { if (_scaleTip) _scaleTip.style.opacity = '0'; }

  function startResize(e, dir) {
    if (!G.selectedEl) return;
    e.preventDefault(); e.stopPropagation();
    isResizing = true; resizeDir = dir;
    const el  = G.selectedEl;
    const r   = el.getBoundingClientRect();
    const sc  = _getScale(el);
    // natural (unscaled) width/height — used as drag sensitivity
    resizeData = {
      sx: e.clientX, sy: e.clientY,
      nw: r.width  / sc.x,   // natural width
      nh: r.height / sc.y,   // natural height
      scx: sc.x,  scy: sc.y
    };
    const cursors = {
      top:'ns-resize', bottom:'ns-resize',
      left:'ew-resize', right:'ew-resize',
      nw:'nwse-resize', se:'nwse-resize',
      ne:'nesw-resize', sw:'nesw-resize'
    };
    document.body.style.cursor = cursors[dir] || 'crosshair';
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup',   endResize);
  }

  function doResize(e) {
    if (!isResizing || !G.selectedEl) return;
    const el  = G.selectedEl;
    const dx  = e.clientX - resizeData.sx;
    const dy  = e.clientY - resizeData.sy;
    const d   = resizeDir;
    // sensitivity: drag the full natural width → change scale by 1.0
    const sensX = resizeData.nw / 1.0;
    const sensY = resizeData.nh / 1.0;

    let newSX = resizeData.scx;
    let newSY = resizeData.scy;

    if (d === 'right'  || d === 'ne' || d === 'se') newSX = resizeData.scx + dx / sensX;
    if (d === 'left'   || d === 'nw' || d === 'sw') newSX = resizeData.scx - dx / sensX;
    if (d === 'bottom' || d === 'se' || d === 'sw') newSY = resizeData.scy + dy / sensY;
    if (d === 'top'    || d === 'nw' || d === 'ne') newSY = resizeData.scy - dy / sensY;

    _setScale(el, newSX, newSY);
    positionHandles(el);
    _showTip(el, newSX, newSY);
  }

  function endResize() {
    if (!G.selectedEl) return;
    isResizing = false;
    G.log(G.selectedEl, 'transform', G.selectedEl.style.transform);
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup',   endResize);
    _hideTip();
  }

  function startMoveTouch(e) {
    if (!G.selectedEl||e.touches.length!==1) return; e.preventDefault();
    isMoving = true;
    const cs = getComputedStyle(G.selectedEl);
    moveData = { sx:e.touches[0].clientX, sy:e.touches[0].clientY,
      ol:parseFloat(cs.left)||G.selectedEl.offsetLeft, ot:parseFloat(cs.top)||G.selectedEl.offsetTop };
    G.selectedEl.style.position='absolute';
    document.addEventListener('touchmove',doMoveTouch,{passive:false});
    document.addEventListener('touchend', endMoveTouch);
  }
  function doMoveTouch(e)  { if(!isMoving||!G.selectedEl||e.touches.length!==1)return; e.preventDefault(); let x=moveData.ol+e.touches[0].clientX-moveData.sx,y=moveData.ot+e.touches[0].clientY-moveData.sy; if(G.snapEnabled){x=Math.round(x/G.snapGrid)*G.snapGrid;y=Math.round(y/G.snapGrid)*G.snapGrid;} G.selectedEl.style.left=x+'px';G.selectedEl.style.top=y+'px';positionHandles(G.selectedEl); }
  function endMoveTouch()  { isMoving=false; document.removeEventListener('touchmove',doMoveTouch); document.removeEventListener('touchend',endMoveTouch); }

  /* ── Pinch to zoom ── */
  document.addEventListener('touchstart',e=>{
    if(!G.editActive||!G.selectedEl||e.touches.length!==2)return;
    const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
    lastPinch=Math.hypot(dx,dy); origFS=parseFloat(getComputedStyle(G.selectedEl).fontSize)||16;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!G.editActive||!G.selectedEl||e.touches.length!==2||!lastPinch)return;
    const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
    const ratio=Math.hypot(dx,dy)/lastPinch;
    G.selectedEl.style.fontSize=Math.max(8,Math.min(300,origFS*ratio)).toFixed(1)+'px';
    positionHandles(G.selectedEl);
  },{passive:true});
  document.addEventListener('touchend',()=>{lastPinch=null;origFS=null;},{passive:true});

  /* ═══════════════════════════════════════════════════════
     UNDO / REDO
  ═══════════════════════════════════════════════════════ */
  G.applyStyle = function(prop, val, el) {
    el = el || G.selectedEl; if (!el) return;
    G.undoStack.push({ el, prop, prev: el.style[prop] });
    if (G.undoStack.length > 50) G.undoStack.shift();
    G.redoStack = [];
    el.style[prop] = val;
    G.log(el, prop, val);
    positionHandles(el);
  };

  G.undo = function() {
    if (!G.undoStack.length) return;
    const { el, prop, prev } = G.undoStack.pop();
    G.redoStack.push({ el, prop, prev: el.style[prop] });
    el.style[prop] = prev || '';
  };
  G.redo = function() {
    if (!G.redoStack.length) return;
    const { el, prop, prev } = G.redoStack.pop();
    G.undoStack.push({ el, prop, prev: el.style[prop] });
    el.style[prop] = prev || '';
  };

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (!G.editActive) return;
    if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); G.undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='z'))) { e.preventDefault(); G.redo(); }
    if (e.key==='Escape') deactivateEditor();
  });

  /* ═══════════════════════════════════════════════════════
     LOG / SEL BAR
  ═══════════════════════════════════════════════════════ */
  G.log = function(el, prop, val) {
    const sel = el.id ? `#${el.id}` : el.tagName.toLowerCase();
    G.cssLog.push({ sel, prop, val });
    if (typeof window.VEP_updateLog === 'function') window.VEP_updateLog();
  };

  function updateSelBar(el) {
    const bar = document.getElementById('vep-sel-bar');
    if (!bar) return;
    const tag = el.tagName.toLowerCase();
    const id  = el.id ? `#${el.id}` : '';
    const cls = [...el.classList].filter(c=>!['vep-selected','vep-hovered'].includes(c)).slice(0,2).map(c=>`.${c}`).join('');
    bar.innerHTML = `<span class="vep-tag">&lt;${tag}&gt;</span><span>${id||cls||'no id'}</span>`;
    bar.classList.add('show');
  }

  G.changeFontSize = changeFontSize;
  function changeFontSize(ratio) {
    if (!G.selectedEl) return;
    const cur = parseFloat(getComputedStyle(G.selectedEl).fontSize) || 16;
    G.applyStyle('fontSize', (cur*ratio).toFixed(1)+'px');
  }

  /* ── Collapse sidebars public API ── */
  G.collapseLeft  = () => { leftOpen =!leftOpen;  document.getElementById('vep-left') ?.classList.toggle('collapsed',!leftOpen);  };
  G.collapseRight = () => { rightOpen=!rightOpen; document.getElementById('vep-right')?.classList.toggle('collapsed',!rightOpen); };

  /* ── Snap toggle ── */
  G.toggleSnap = function() {
    G.snapEnabled = !G.snapEnabled;
    document.getElementById('vep-snap-grid')?.classList.toggle('show', G.snapEnabled);
  };

  /* ── Dark/Light mode ── */
  G.toggleDarkLight = function() {
    G.darkMode = !G.darkMode;
    document.body.style.filter = G.darkMode ? 'invert(1) hue-rotate(180deg)' : '';
  };

  /* ── Responsive preview ── */
  G.showResponsive = function(width, height, label) {
    const f = document.getElementById('vep-resp-frame');
    if (!f) return;
    f.classList.add('show');
    f.innerHTML = `
      <div id="vep-resp-tools">
        <span style="color:#fff;font-size:11px;font-weight:700">${label} — ${width}×${height}</span>
        <button class="vbig" style="width:auto;padding:6px 16px" onclick="document.getElementById('vep-resp-frame').classList.remove('show')">✕ Close</button>
      </div>
      <iframe src="${location.href}" style="width:${width}px;height:${height}px;max-width:calc(100vw - 80px);max-height:calc(100vh - 120px)"></iframe>`;
  };

  /* ── Snapshots ── */
  G.saveSnapshot = function(name) {
    const snap = { name: name||`Snapshot ${G.snapshots.length+1}`, html: document.documentElement.outerHTML, date: new Date().toLocaleString() };
    G.snapshots.push(snap);
    localStorage.setItem('vep_snapshots', JSON.stringify(G.snapshots.slice(-10)));
    return snap;
  };

  /* ── Export full HTML ── */
  G.exportHTML = function() {
    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const blob  = new Blob([html], { type: 'text/html' });
    const a     = document.createElement('a');
    a.href      = URL.createObjectURL(blob);
    a.download  = 'DREAMYYSPACE-export.html';
    a.click();
  };

  G.getFilterStr = function() {
    if (!G.selectedEl) return '';
    return getComputedStyle(G.selectedEl).filter || '';
  };

  /* ── FULLSCREEN TOGGLE ── */
  document.getElementById('vep-fs-toggle')?.addEventListener('click', function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Error: ${err.message}`);
      });
      this.textContent = 'EXIT';
    } else {
      document.exitFullscreen();
      this.textContent = 'FULL';
    }
  });

})(window.VEP);

/**
 * ══════════════════════════════════════════════════════════
 *  DREAMYYSPACE EDITOR v3  |  editor-left.js
 *  LEFT SIDEBAR: Layers, Add Block, Grid/Flex, History,
 *                Snapshots, Tools (Responsive, Snap, Dark)
 * ══════════════════════════════════════════════════════════
 */
window.VEP_buildLeft = function () {
  if (document.getElementById('vep-left')) {
    document.getElementById('vep-left').style.display = 'flex';
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'vep-sidebar';
  panel.id = 'vep-left';
  panel.innerHTML = `
    <div class="vep-sh">
      <span class="vep-sh-title">🗂 Structure</span>
      <div style="display:flex;gap:6px">
        <button class="vep-collapse-btn" id="vep-undo-btn" title="Undo (Ctrl+Z)">↩</button>
        <button class="vep-collapse-btn" id="vep-redo-btn" title="Redo (Ctrl+Y)">↪</button>
        <button class="vep-collapse-btn" id="vep-left-toggle" title="Collapse">◀</button>
      </div>
    </div>

    <div class="vep-tabs">
      <button class="vep-tab on" data-ltab="layers">Layers</button>
      <button class="vep-tab" data-ltab="add">+ Add</button>
      <button class="vep-tab" data-ltab="grid">Grid</button>
      <button class="vep-tab" data-ltab="history">History</button>
      <button class="vep-tab" data-ltab="tools">Tools</button>
    </div>

    <div class="vep-sb">

      <!-- ── LAYERS ── -->
      <div class="vep-tc on" id="vltc-layers">
        <div class="vr">
          <span class="vl">DOM Tree (click to select)</span>
          <div id="vep-layers-tree" style="font-size:10px;line-height:2"></div>
        </div>
        <button class="vbig" id="vep-refresh-layers">↺ Refresh Tree</button>
      </div>

      <!-- ── ADD BLOCK ── -->
      <div class="vep-tc" id="vltc-add">
        <div class="vr">
          <span class="vl">Insert Element</span>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="h2">H2 Title</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="p">Paragraph</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="button">Button</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="img">Image</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="div">Div</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="section">Section</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="card">Card</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="badge">Badge</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="nav">Nav Bar</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px;" data-insert="hr">Divider</button>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Custom HTML</span>
          <textarea class="vi" id="vep-custom-html" rows="4" placeholder="<div>Your HTML…</div>"></textarea>
          <button class="vbig" id="vep-insert-custom" style="margin-top:6px">Insert Custom HTML</button>
        </div>
        <div class="vr">
          <span class="vl">Insert After</span>
          <select class="vsel" id="vep-insert-target">
            <option value="body-start">Start of &lt;body&gt;</option>
            <option value="body">End of &lt;body&gt;</option>
            <option value="selected">After selected element</option>
          </select>
        </div>
      </div>

      <!-- ── GRID / FLEX EDITOR ── -->
      <div class="vep-tc" id="vltc-grid">
        <div class="vr">
          <div class="vinfo">Select a flex or grid container, then adjust below.</div>
        </div>
        <div class="vr">
          <span class="vl">Display</span>
          <div class="vcrow">
            <button class="vbsm" data-display="flex">Flex</button>
            <button class="vbsm" data-display="grid">Grid</button>
            <button class="vbsm" data-display="block">Block</button>
            <button class="vbsm" data-display="inline-block">Inline</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Flex Direction</span>
          <div class="vcrow">
            <button class="vbsm" data-fd="row">→ Row</button>
            <button class="vbsm" data-fd="column">↓ Col</button>
            <button class="vbsm" data-fd="row-reverse">← Rev</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Justify Content</span>
          <div class="vcrow" style="flex-wrap:wrap">
            <button class="vbsm" data-jc="flex-start">Start</button>
            <button class="vbsm" data-jc="center">Center</button>
            <button class="vbsm" data-jc="flex-end">End</button>
            <button class="vbsm" data-jc="space-between">Space-Btw</button>
            <button class="vbsm" data-jc="space-around">Space-Ar</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Align Items</span>
          <div class="vcrow">
            <button class="vbsm" data-ai="flex-start">Start</button>
            <button class="vbsm" data-ai="center">Center</button>
            <button class="vbsm" data-ai="flex-end">End</button>
            <button class="vbsm" data-ai="stretch">Stretch</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Gap</span>
          <div class="vslrow">
            <input type="range" id="vep-gap" min="0" max="100" value="0" step="4">
            <span id="vep-gap-v">0px</span>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Grid Columns</span>
          <div class="vslrow">
            <input type="range" id="vep-cols" min="1" max="12" value="3" step="1">
            <span id="vep-cols-v">3</span>
          </div>
          <button class="vbig" id="vep-apply-grid" style="margin-top:6px">Apply Grid</button>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Spacing Map (selected element)</span>
          <div id="vep-spacing-map" style="position:relative;width:100%;aspect-ratio:2/1;background:rgba(255,255,255,.04);border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <div style="font-size:9px;color:rgba(255,255,255,.3)">Select element</div>
          </div>
          <button class="vbig" id="vep-refresh-spacing" style="margin-top:6px">↺ Refresh Map</button>
        </div>
      </div>

      <!-- ── HISTORY ── -->
      <div class="vep-tc" id="vltc-history">
        <div class="vr">
          <span class="vl">Undo Stack (last 50 actions)</span>
          <div id="vep-undo-list" style="max-height:180px;overflow-y:auto;font-size:10px;color:rgba(255,255,255,.45);background:rgba(255,255,255,.03);border-radius:10px;padding:10px;line-height:2;scrollbar-width:thin">
            No actions yet.
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="vbig" id="vep-undo-hist-btn">↩ Undo</button>
          <button class="vbig" id="vep-redo-hist-btn">↪ Redo</button>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Snapshots (save full page state)</span>
          <div class="vcrow" style="margin-bottom:8px">
            <input class="vi" type="text" id="vep-snap-name" placeholder="Snapshot name…" style="flex:1">
            <button class="vbsm" id="vep-snap-save" style="border-radius:8px;padding:8px 12px">Save</button>
          </div>
          <div id="vep-snap-list" style="font-size:10px;color:rgba(255,255,255,.45);background:rgba(255,255,255,.03);border-radius:10px;padding:10px;max-height:140px;overflow-y:auto;line-height:2;scrollbar-width:thin">
            No snapshots.
          </div>
        </div>
      </div>

      <!-- ── TOOLS ── -->
      <div class="vep-tc" id="vltc-tools">
        <div class="vr">
          <span class="vl">Responsive Preview</span>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
            <button class="vbsm" style="border-radius:10px;padding:10px 4px;font-size:9px" data-resp="375,812,Mobile">📱 Mobile</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 4px;font-size:9px" data-resp="768,1024,Tablet">📟 Tablet</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 4px;font-size:9px" data-resp="1440,900,Desktop">🖥 Desktop</button>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Snap to Grid</span>
          <div class="vcrow">
            <button class="vbsm" id="vep-snap-toggle">⬚ Snap OFF</button>
            <select class="vsel" id="vep-snap-size" style="width:auto;flex:1">
              <option value="4">4px</option>
              <option value="8" selected>8px</option>
              <option value="16">16px</option>
              <option value="32">32px</option>
            </select>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Page Theme</span>
          <button class="vbig" id="vep-dark-toggle">🌓 Toggle Dark / Light</button>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Editor Options</span>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="vbig vdanger" id="vep-exit-btn">🔒 Exit Editor</button>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Change PIN</span>
          <div class="vcrow">
            <input class="vi" type="password" id="vep-new-pin" placeholder="New PIN…" style="flex:1">
            <button class="vbsm" id="vep-set-pin" style="border-radius:8px;padding:8px 12px">Set</button>
          </div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(panel);
  bindLeft();
  buildLayersTree();
};

/* ── BIND ALL LEFT EVENTS ── */
function bindLeft() {
  const G = window.VEP;

  // Tabs
  document.querySelectorAll('[data-ltab]').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('[data-ltab]').forEach(x => x.classList.remove('on'));
      document.querySelectorAll('#vep-left .vep-tc').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      document.getElementById(`vltc-${t.dataset.ltab}`).classList.add('on');
    });
  });

  // Collapse
  document.getElementById('vep-left-toggle').addEventListener('click', () => {
    G.collapseLeft();
    document.getElementById('vep-left-toggle').textContent = document.getElementById('vep-left').classList.contains('collapsed') ? '▶' : '◀';
  });

  // Undo/Redo buttons
  document.getElementById('vep-undo-btn').addEventListener('click', G.undo);
  document.getElementById('vep-redo-btn').addEventListener('click', G.redo);
  document.getElementById('vep-undo-hist-btn').addEventListener('click', () => { G.undo(); updateUndoList(); });
  document.getElementById('vep-redo-hist-btn').addEventListener('click', () => { G.redo(); updateUndoList(); });

  // Refresh layers
  document.getElementById('vep-refresh-layers').addEventListener('click', buildLayersTree);

  // ── ADD BLOCK ──
  document.querySelectorAll('[data-insert]').forEach(btn => {
    btn.addEventListener('click', () => insertBlock(btn.dataset.insert));
  });
  document.getElementById('vep-insert-custom').addEventListener('click', () => {
    const html = document.getElementById('vep-custom-html').value.trim();
    if (!html) return;
    insertRaw(html);
  });

  // ── GRID ──
  document.querySelectorAll('[data-display]').forEach(b => b.addEventListener('click', () => G.applyStyle('display', b.dataset.display)));
  document.querySelectorAll('[data-fd]').forEach(b => b.addEventListener('click', () => G.applyStyle('flexDirection', b.dataset.fd)));
  document.querySelectorAll('[data-jc]').forEach(b => b.addEventListener('click', () => G.applyStyle('justifyContent', b.dataset.jc)));
  document.querySelectorAll('[data-ai]').forEach(b => b.addEventListener('click', () => G.applyStyle('alignItems', b.dataset.ai)));

  sl('vep-gap','vep-gap-v','px', v => G.applyStyle('gap', v+'px'));

  document.getElementById('vep-apply-grid').addEventListener('click', () => {
    const cols = document.getElementById('vep-cols').value;
    document.getElementById('vep-cols-v').textContent = cols;
    G.applyStyle('display', 'grid');
    G.applyStyle('gridTemplateColumns', `repeat(${cols},1fr)`);
  });

  sl('vep-cols','vep-cols-v','', () => {});

  document.getElementById('vep-refresh-spacing').addEventListener('click', refreshSpacingMap);

  // ── HISTORY ──
  document.getElementById('vep-snap-save').addEventListener('click', () => {
    const name = document.getElementById('vep-snap-name').value.trim() || null;
    G.saveSnapshot(name);
    renderSnapshotList();
  });

  // ── TOOLS ──
  document.querySelectorAll('[data-resp]').forEach(b => {
    b.addEventListener('click', () => {
      const [w,h,label] = b.dataset.resp.split(',');
      G.showResponsive(+w, +h, label);
    });
  });

  document.getElementById('vep-snap-toggle').addEventListener('click', () => {
    G.toggleSnap();
    document.getElementById('vep-snap-toggle').textContent = G.snapEnabled ? '⬚ Snap ON' : '⬚ Snap OFF';
    document.getElementById('vep-snap-toggle').classList.toggle('on', G.snapEnabled);
  });

  document.getElementById('vep-snap-size').addEventListener('change', function() {
    G.snapGrid = parseInt(this.value);
    const grid = document.getElementById('vep-snap-grid');
    if(grid) { grid.style.backgroundSize = `${G.snapGrid}px ${G.snapGrid}px`; }
  });

  document.getElementById('vep-dark-toggle').addEventListener('click', G.toggleDarkLight);
  document.getElementById('vep-exit-btn').addEventListener('click', G.deactivate);

  document.getElementById('vep-set-pin').addEventListener('click', () => {
    const p = document.getElementById('vep-new-pin').value.trim();
    if (p.length >= 4) { G.PIN = p; alert('PIN updated!'); document.getElementById('vep-new-pin').value=''; }
    else alert('PIN must be at least 4 characters.');
  });

  renderSnapshotList();
}

/* ── LAYERS TREE ── */
function buildLayersTree() {
  const container = document.getElementById('vep-layers-tree');
  if (!container) return;
  const targets = ['section','div','nav','main','header','footer','h1','h2','h3','p','img','button','a'];
  const els = [...document.querySelectorAll(targets.join(','))].filter(el => {
    // Strictly exclude all editor-internal elements
    if (el.id && (el.id.startsWith('vep-') || el.id.startsWith('editor-'))) return false;
    if (el.closest('#vep-left') || el.closest('#vep-right') || el.closest('#vep-handles') || 
        el.closest('#vep-sel-bar') || el.closest('#vep-pin-overlay') || el.closest('#vep-badge') ||
        el.closest('#vep-save-bar')) return false;
    return true;
  }).slice(0, 80);

  container.innerHTML = els.map((el, i) => {
    const tag  = el.tagName.toLowerCase();
    const id   = el.id ? `#${el.id}` : '';
    const depth= getDepth(el);
    const text = el.innerText?.slice(0,20)||'';
    return `<div data-lidx="${i}" data-vep-layer-item="${i}" style="padding-left:${depth*8+4}px;cursor:pointer;color:rgba(255,255,255,.6);padding:3px ${depth*8}px 3px ${depth*8+4}px;border-radius:6px;transition:background .2s,box-shadow .2s,color .2s"
      onmouseover="this.style.background='rgba(var(--vep-accent-rgb),.15)'"
      onmouseout="this.style.background=(this.classList.contains('vep-layer-hovered')?'rgba(var(--vep-accent-rgb),.12)':'')"
      onclick="window.__vepLayerEls[${i}]&&window.VEP.selectElement(window.__vepLayerEls[${i}])">
      <span style="color:var(--vep-accent);font-weight:700">&lt;${tag}&gt;</span>
      <span style="color:rgba(255,255,255,.3);font-size:9px">${id}</span>
      <span style="color:rgba(255,255,255,.25);font-size:9px;margin-left:4px">${text}</span>
    </div>`;
  }).join('');

  window.__vepLayerEls = els;
}

/* ── Highlight a layer item when hovering a page element ── */
window.VEP_highlightLayerHover = function(el) {
  // Clear previous hover
  document.querySelectorAll('[data-vep-layer-item].vep-layer-hovered').forEach(n => {
    n.classList.remove('vep-layer-hovered');
    n.style.background = '';
    n.style.color = '';
  });
  if (!el || !window.__vepLayerEls) return;
  const idx = window.__vepLayerEls.indexOf(el);
  if (idx === -1) return;
  const node = document.querySelector(`[data-vep-layer-item="${idx}"]`);
  if (!node) return;
  node.classList.add('vep-layer-hovered');
  node.style.background = 'rgba(var(--vep-accent-rgb),.12)';
  node.style.color = '#fff';
  // auto-scroll the layer panel so the item stays visible
  node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

window.VEP_clearLayerHover = function() {
  document.querySelectorAll('[data-vep-layer-item].vep-layer-hovered').forEach(n => {
    n.classList.remove('vep-layer-hovered');
    n.style.background = '';
    n.style.color = '';
  });
};

/* ── IntersectionObserver: frame section 2 in the layer when visible ── */

function getDepth(el) {
  let d=0, cur=el.parentElement;
  while(cur && cur!==document.body){d++;cur=cur.parentElement;}
  return Math.min(d,6);
}

/* ── SPACING MAP ── */
function refreshSpacingMap() {
  const el = window.VEP.selectedEl;
  const map = document.getElementById('vep-spacing-map');
  if (!map || !el) return;
  const cs   = getComputedStyle(el);
  const mt   = parseFloat(cs.marginTop)||0;
  const mr   = parseFloat(cs.marginRight)||0;
  const mb   = parseFloat(cs.marginBottom)||0;
  const ml   = parseFloat(cs.marginLeft)||0;
  const pt   = parseFloat(cs.paddingTop)||0;
  const pr   = parseFloat(cs.paddingRight)||0;
  const pb   = parseFloat(cs.paddingBottom)||0;
  const pl   = parseFloat(cs.paddingLeft)||0;
  map.innerHTML = `
    <div style="width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;inset:0;background:rgba(255,165,0,.12);border-radius:4px;display:flex;align-items:center;justify-content:center">
        <span style="font-size:8px;color:rgba(255,165,0,.8);position:absolute;top:3px;left:50%;transform:translateX(-50%)">M: ${mt.toFixed(0)}↑ ${mr.toFixed(0)}→ ${mb.toFixed(0)}↓ ${ml.toFixed(0)}←</span>
        <div style="width:70%;height:65%;background:rgba(100,200,100,.12);border-radius:4px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:8px;color:rgba(100,200,100,.8);position:absolute;left:50%;transform:translateX(-50%)" style="">P: ${pt.toFixed(0)} ${pr.toFixed(0)} ${pb.toFixed(0)} ${pl.toFixed(0)}</span>
          <div style="width:60%;height:50%;background:rgba(100,150,255,.2);border-radius:3px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:8px;color:rgba(100,150,255,.9)">Content</span>
          </div>
        </div>
      </div>
    </div>`;
}

/* ── INSERT BLOCKS ── */
const BLOCKS = {
  h2:      '<h2 style="font-size:3rem;font-weight:900;color:#fff">New Title</h2>',
  p:       '<p style="color:rgba(255,255,255,.7);font-size:1rem;max-width:600px;line-height:1.7">New paragraph text. Click to edit.</p>',
  button:  '<button style="padding:14px 32px;background:var(--vep-accent);color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;cursor:pointer">Click Me</button>',
  img:     '<img src="https://via.placeholder.com/600x400/222/FF4D00?text=Image" style="max-width:100%;border-radius:12px">',
  div:     '<div style="padding:24px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;color:#fff">New div block</div>',
  section: '<section style="padding:80px 40px;background:#0a0a0a;min-height:50vh;display:flex;align-items:center;justify-content:center"><h2 style="color:#fff;font-size:3rem;font-weight:900">New Section</h2></section>',
  card:    '<div style="padding:32px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;max-width:320px"><h3 style="color:#fff;margin:0 0 10px">Card Title</h3><p style="color:rgba(255,255,255,.5);margin:0;font-size:14px">Card description here.</p></div>',
  badge:   '<span style="display:inline-block;padding:6px 16px;background:rgba(var(--vep-accent-rgb),.2);border:1px solid rgba(var(--vep-accent-rgb),.5);border-radius:100px;color:var(--vep-accent);font-size:12px;font-weight:700">New Badge</span>',
  nav:     '<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:rgba(0,0,0,.8);backdrop-filter:blur(12px)"><span style="color:#fff;font-weight:900;font-size:20px">LOGO</span><button style="background:none;border:1px solid rgba(255,255,255,.3);color:#fff;padding:8px 20px;border-radius:100px;cursor:pointer">Menu</button></nav>',
  hr:      '<hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:40px 0">',
};

function insertBlock(type) {
  const html = BLOCKS[type] || `<${type}>New ${type}</${type}>`;
  insertRaw(html);
}

function insertRaw(html) {
  const target = document.getElementById('vep-insert-target')?.value;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const el = tmp.firstElementChild;
  if (!el) return;
  if (target === 'selected' && window.VEP.selectedEl) {
    window.VEP.selectedEl.insertAdjacentElement('afterend', el);
  } else if (target === 'body-start') {
    document.body.prepend(el);
  } else {
    document.body.appendChild(el);
  }
  window.VEP.selectElement(el);
}

/* ── SNAPSHOTS RENDER ── */
function renderSnapshotList() {
  const G    = window.VEP;
  const list = document.getElementById('vep-snap-list');
  if (!list) return;
  if (!G.snapshots.length) { list.textContent = 'No snapshots.'; return; }
  list.innerHTML = G.snapshots.slice().reverse().map((s, i) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div>
        <span style="color:#fff;font-weight:700">${s.name}</span>
        <span style="color:rgba(255,255,255,.3);font-size:9px;margin-left:6px">${s.date}</span>
      </div>
      <button class="vbsm" onclick="window.VEP_restoreSnapshot(${G.snapshots.length-1-i})">↺</button>
    </div>`
  ).join('');
}

window.VEP_restoreSnapshot = function(idx) {
  const G = window.VEP;
  if (!G.snapshots[idx]) return;
  if (!confirm('Restore this snapshot? Current changes will be lost.')) return;
  document.open(); document.write(G.snapshots[idx].html); document.close();
};

/* ── UPDATE UNDO LIST ── */
function updateUndoList() {
  const G    = window.VEP;
  const list = document.getElementById('vep-undo-list');
  if (!list) return;
  list.innerHTML = G.undoStack.slice(-20).reverse().map(u =>
    `<div><span style="color:var(--vep-accent)">${u.el?.tagName?.toLowerCase()||'?'}</span> · <b style="color:#fff">${u.prop}</b></div>`
  ).join('') || 'No actions yet.';
}

window.VEP_syncLeft = function(el) { buildLayersTree(); updateUndoList(); };

/* ── Slider helper ── */
function sl(sliderId, valId, unit, cb) {
  const el = document.getElementById(sliderId);
  const ve = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', function () {
    if (ve) ve.textContent = this.value + unit;
    cb(parseFloat(this.value));
  });
}

/**
 * ══════════════════════════════════════════════════════════
 *  DREAMYYSPACE EDITOR v3  |  editor-right.js
 *  RIGHT SIDEBAR: Element controls, Gradient Builder,
 *  Shadow Designer, Typography, Animation, Color Palette,
 *  Image Library / Unsplash, Icons, Video BG, Export HTML
 * ══════════════════════════════════════════════════════════
 */
window.VEP_buildRight = function () {
  if (document.getElementById('vep-right')) {
    document.getElementById('vep-right').style.display = 'flex';
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'vep-sidebar';
  panel.id = 'vep-right';
  panel.innerHTML = `
    <div class="vep-sh">
      <button class="vep-collapse-btn" id="vep-right-toggle" title="Collapse">▶</button>
      <span class="vep-sh-title">🎨 Design</span>
    </div>

    <div class="vep-tabs">
      <button class="vep-tab on" data-rtab="element">Element</button>
      <button class="vep-tab" data-rtab="design">Design</button>
      <button class="vep-tab" data-rtab="type">Type</button>
      <button class="vep-tab" data-rtab="animate">Anim</button>
      <button class="vep-tab" data-rtab="media">Media</button>
      <button class="vep-tab" data-rtab="export">Export</button>
      <button class="vep-tab" id="vep-pro-tab" style="background:rgba(var(--vep-accent-rgb),.15);border-color:rgba(var(--vep-accent-rgb),.35);color:var(--vep-accent)" title="Design Systems & Pro Tools">🎭 Pro</button>
    </div>

    <div class="vep-sb">

      <!-- ── ELEMENT TAB ── -->
      <div class="vep-tc on" id="vrtc-element">
        <div class="vr">
          <span class="vl">Selected Element</span>
          <div id="vep-sel-info" class="vinfo">Click any element on the page</div>
        </div>
        <!-- TEXT -->
        <div class="vr">
          <span class="vl">Content (or double-click to edit inline)</span>
          <div class="vi" id="vep-content" contenteditable="true" style="min-height: 50px; cursor: text; white-space: pre-wrap; word-break: break-word;" placeholder="Text content…"></div>
        </div>
        <div class="vr">
          <span class="vl">Color</span>
          <div class="vcrow">
            <input type="color" id="vep-col" value="#ffffff">
            <button class="vbsm" data-col="#ffffff">White</button>
            <button class="vbsm" data-col="var(--vep-accent)">🔴</button>
            <button class="vbsm" id="vep-col-t">Transparent</button>
            <button class="vbsm" id="vep-split-btn" title="Convert selection into an independent item">✂️ Split</button>
            <button class="vbsm" id="vep-explode-btn" title="Explode entire text into independent words">💥 Explode</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Font Size</span>
          <div class="vslrow"><input type="range" id="vep-fs" min="8" max="300" value="16"><span id="vep-fs-v">16px</span></div>
        </div>
        <div class="vr">
          <span class="vl">Font Weight</span>
          <select class="vsel" id="vep-fw">
            <option value="100">Thin 100</option><option value="300">Light 300</option>
            <option value="400">Normal 400</option><option value="600">Semi-Bold 600</option>
            <option value="700">Bold 700</option><option value="900" selected>Black 900</option>
          </select>
        </div>
        <div class="vr">
          <span class="vl">Letter Spacing / Line Height</span>
          <div class="vslrow"><input type="range" id="vep-ls" min="-5" max="40" value="0" step=".5"><span id="vep-ls-v">0px</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-lh" min="0.5" max="3" value="1.2" step="0.05"><span id="vep-lh-v">1.2</span></div>
        </div>
        <div class="vr">
          <span class="vl">Text Align / Transform</span>
          <div class="vcrow">
            <button class="vbsm" data-ta="left">←</button>
            <button class="vbsm" data-ta="center">≡</button>
            <button class="vbsm" data-ta="right">→</button>
            <button class="vbsm" data-tt="uppercase">AA</button>
            <button class="vbsm" data-tt="lowercase">aa</button>
            <button class="vbsm" data-tt="none">Off</button>
          </div>
        </div>
        <hr class="vsep">
        <!-- LAYOUT -->
        <div class="vr">
          <span class="vl">Width / Height</span>
          <div class="vslrow"><input type="range" id="vep-w" min="10" max="2000" value="300" step="5"><span id="vep-w-v">auto</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-h" min="10" max="2000" value="100" step="5"><span id="vep-h-v">auto</span></div>
        </div>
        <div class="vr">
          <span class="vl">Padding / Border Radius</span>
          <div class="vslrow"><input type="range" id="vep-pad" min="0" max="200" value="0" step="4"><span id="vep-pad-v">0px</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-br" min="0" max="200" value="0" step="2"><span id="vep-br-v">0px</span></div>
        </div>
        <div class="vr">
          <span class="vl">Opacity / Z-Index</span>
          <div class="vslrow"><input type="range" id="vep-op" min="0" max="100" value="100"><span id="vep-op-v">100%</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-zi" min="-10" max="9999" value="0"><span id="vep-zi-v">auto</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="vbig" id="vep-dup">⎘ Duplicate</button>
          <button class="vbig vdanger" id="vep-del">🗑 Delete</button>
        </div>
        <hr class="vsep">
        <!-- EFFECTS -->
        <div class="vr">
          <span class="vl">Mix Blend Mode</span>
          <select class="vsel" id="vep-blend">
            <option value="normal">Normal</option>
            <option value="difference">Difference (High Contrast)</option>
            <option value="multiply">Multiply</option><option value="screen">Screen</option>
            <option value="overlay">Overlay</option><option value="exclusion">Exclusion</option>
            <option value="hard-light">Hard Light</option><option value="color-dodge">Color Dodge</option>
            <option value="luminosity">Luminosity</option>
          </select>
        </div>
        <div class="vr">
          <span class="vl">Brightness / Contrast</span>
          <div class="vslrow"><input type="range" id="vep-bright" min="0" max="400" value="100" step="5"><span id="vep-bright-v">100%</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-contrast" min="0" max="400" value="100" step="5"><span id="vep-contrast-v">100%</span></div>
        </div>
        <div class="vr">
          <span class="vl">Blur / Grayscale</span>
          <div class="vslrow"><input type="range" id="vep-blur" min="0" max="40" value="0"><span id="vep-blur-v">0px</span></div>
          <div class="vslrow" style="margin-top:5px"><input type="range" id="vep-gray" min="0" max="100" value="0"><span id="vep-gray-v">0%</span></div>
        </div>
        <div class="vr">
          <span class="vl">Presets</span>
          <div class="vcrow" style="flex-wrap:wrap">
            <button class="vbsm" id="prst-hc">⚡ High Contrast</button>
            <button class="vbsm" id="prst-glass">🪟 Glass</button>
            <button class="vbsm" id="prst-glow">✨ Glow</button>
            <button class="vbsm" id="prst-ghost">👻 Ghost</button>
            <button class="vbsm" id="prst-reset">↺ Reset</button>
          </div>
        </div>
      </div>

      <!-- ── DESIGN TAB ── -->
      <div class="vep-tc" id="vrtc-design">

        <!-- Gradient Builder -->
        <div class="vr">
          <span class="vl">🌈 Gradient Builder</span>
          <div class="vcrow" style="margin-bottom:6px">
            <button class="vbsm" data-gtype="linear-gradient">Linear</button>
            <button class="vbsm" data-gtype="radial-gradient">Radial</button>
            <button class="vbsm" data-gtype="conic-gradient">Conic</button>
          </div>
          <div class="vslrow" style="margin-bottom:6px">
            <span style="color:rgba(255,255,255,.4);font-size:9px;min-width:50px">Angle</span>
            <input type="range" id="vep-grad-angle" min="0" max="360" value="135">
            <span id="vep-grad-angle-v">135°</span>
          </div>
          <div class="vcrow" style="margin-bottom:6px">
            <span style="font-size:9px;color:rgba(255,255,255,.4);min-width:40px">Stop 1</span>
            <input type="color" id="vep-grad-c1" value="var(--vep-accent)">
            <span style="font-size:9px;color:rgba(255,255,255,.4);min-width:40px">Stop 2</span>
            <input type="color" id="vep-grad-c2" value="#000000">
          </div>
          <div id="vep-grad-preview" style="width:100%;height:48px;border-radius:10px;margin-bottom:8px;background:linear-gradient(135deg,var(--vep-accent),#000)"></div>
          <div style="display:flex;gap:6px">
            <button class="vbig" id="vep-grad-apply-bg" style="font-size:9px">Apply as Background</button>
            <button class="vbig" id="vep-grad-apply-text" style="font-size:9px">Apply as Text Clip</button>
          </div>
        </div>

        <hr class="vsep">

        <!-- Shadow Designer -->
        <div class="vr">
          <span class="vl">🌑 Shadow Designer</span>
          <div class="vcrow" style="margin-bottom:6px">
            <button class="vbsm" id="shad-box-mode" class="on">Box Shadow</button>
            <button class="vbsm" id="shad-text-mode">Text Shadow</button>
          </div>
          <div class="vslrow"><span style="font-size:9px;color:rgba(255,255,255,.4);min-width:20px">X</span><input type="range" id="vep-sh-x" min="-60" max="60" value="0"><span id="vep-sh-x-v">0px</span></div>
          <div class="vslrow" style="margin-top:4px"><span style="font-size:9px;color:rgba(255,255,255,.4);min-width:20px">Y</span><input type="range" id="vep-sh-y" min="-60" max="60" value="4"><span id="vep-sh-y-v">4px</span></div>
          <div class="vslrow" style="margin-top:4px"><span style="font-size:9px;color:rgba(255,255,255,.4);min-width:20px">B</span><input type="range" id="vep-sh-b" min="0" max="100" value="20"><span id="vep-sh-b-v">20px</span></div>
          <div class="vslrow" style="margin-top:4px"><span style="font-size:9px;color:rgba(255,255,255,.4);min-width:20px">S</span><input type="range" id="vep-sh-s" min="-30" max="60" value="0"><span id="vep-sh-s-v">0px</span></div>
          <div class="vcrow" style="margin-top:6px">
            <input type="color" id="vep-sh-col" value="#000000">
            <span style="font-size:9px;color:rgba(255,255,255,.4)">Color</span>
            <input type="range" id="vep-sh-a" min="0" max="100" value="50" style="flex:1">
            <span id="vep-sh-a-v" style="font-size:9px;color:rgba(255,255,255,.4)">50%</span>
          </div>
          <div id="vep-sh-preview" style="margin-top:8px;height:40px;border-radius:8px;background:rgba(255,255,255,.1);box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>
          <button class="vbig" id="vep-sh-apply" style="margin-top:8px">Apply Shadow</button>
        </div>

        <hr class="vsep">

        <!-- Color Palette -->
        <div class="vr">
          <span class="vl">🎨 Site Color Palette</span>
          <div id="vep-palette" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div>
          <button class="vbig" id="vep-extract-palette">↺ Extract Colors</button>
        </div>
      </div>

      <!-- ── TYPOGRAPHY TAB ── -->
      <div class="vep-tc" id="vrtc-type">
        <div class="vr">
          <span class="vl">🔤 Pro Font Library (80+ fonts)</span>
          <input class="vi" type="text" id="vep-font-search" placeholder="Search: Inter, Bebas, Playfair…">
        </div>
        <div id="vep-font-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:260px;overflow-y:auto;scrollbar-width:thin;margin-bottom:10px"></div>
        <div class="vr" style="margin-bottom:6px">
          <span class="vl">Font Preview — click a font above to apply</span>
          <div id="vep-font-preview" style="font-size:26px;padding:14px 16px;background:rgba(255,255,255,.04);border-radius:12px;color:#fff;min-height:56px;transition:font-family .25s ease;letter-spacing:-0.01em;line-height:1.2">Aa Bb — DREAMYYSPACE</div>
        </div>
        <div class="vr">
          <span class="vl">Selected</span>
          <div id="vep-font-selected" class="vinfo">Click any font to apply instantly ✨</div>
        </div>
        <div class="vr">
          <span class="vl">Force Apply To</span>
          <div class="vcrow">
            <button class="vbig" id="vep-font-apply-el" style="font-size:10px">Selected Element</button>
            <button class="vbig" id="vep-font-apply-all" style="font-size:10px">Whole Page</button>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Font Category Filter</span>
          <div class="vcrow" style="flex-wrap:wrap;gap:4px">
            <button class="vbsm" data-font-cat="">All</button>
            <button class="vbsm" data-font-cat="Inter|DM|Space|Syne|Outfit|Manrope|Figtree|Geist|Onest|Jost|Plus Jakarta">Modern</button>
            <button class="vbsm" data-font-cat="Bebas|Oswald|Unbounded|Anton|Archivo|Fjalla|Rajdhani|Black Han|Exo">Display</button>
            <button class="vbsm" data-font-cat="Playfair|Lora|Cormorant|EB Garamond|Merriweather|Fraunces|DM Serif">Serif</button>
            <button class="vbsm" data-font-cat="JetBrains|Fira Code|Source Code|Roboto Mono|IBM Plex Mono|Inconsolata|Courier Prime|Space Mono|DM Mono|Geist Mono">Mono</button>
            <button class="vbsm" data-font-cat="Lobster|Pacifico|Sacramento|Dancing Script|Great Vibes">Script</button>
          </div>
        </div>
      </div>

      <!-- ── ANIMATE TAB ── -->
      <div class="vep-tc" id="vrtc-animate">
        <div class="vr">
          <span class="vl">🎬 CSS Animation Presets</span>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="fadeIn">Fade In</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="fadeInUp">Fade Up</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="slideInLeft">Slide Left</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="slideInRight">Slide Right</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="bounce">Bounce</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="pulse">Pulse</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="shake">Shake</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="rotate">Rotate</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="zoom">Zoom In</button>
            <button class="vbsm" style="border-radius:10px;padding:10px 6px;font-size:9px" data-anim="float">Float</button>
            <button class="vbsm vdanger" style="border-radius:10px;padding:10px 6px;font-size:9px;grid-column:span 2" data-anim="none">✕ Remove Animation</button>
          </div>
        </div>
        <hr class="vsep">
        <div class="vr">
          <span class="vl">Duration</span>
          <div class="vslrow"><input type="range" id="vep-anim-dur" min="0.1" max="5" value="1" step="0.1"><span id="vep-anim-dur-v">1s</span></div>
        </div>
        <div class="vr">
          <span class="vl">Delay</span>
          <div class="vslrow"><input type="range" id="vep-anim-del" min="0" max="5" value="0" step="0.1"><span id="vep-anim-del-v">0s</span></div>
        </div>
        <div class="vr">
          <span class="vl">Repeat</span>
          <div class="vcrow">
            <button class="vbsm" data-iter="1">Once</button>
            <button class="vbsm" data-iter="3">3×</button>
            <button class="vbsm" data-iter="infinite">∞ Loop</button>
          </div>
        </div>
        <div class="vr">
          <span class="vl">Timing</span>
          <select class="vsel" id="vep-anim-timing">
            <option value="ease">Ease</option><option value="ease-in">Ease In</option>
            <option value="ease-out" selected>Ease Out</option><option value="ease-in-out">Ease In Out</option>
            <option value="linear">Linear</option><option value="cubic-bezier(0.34,1.56,0.64,1)">Spring</option>
          </select>
        </div>
        <button class="vbig" id="vep-anim-apply">▶ Preview & Apply</button>
      </div>

      <!-- ── MEDIA TAB ── -->
      <div class="vep-tc" id="vrtc-media">
        <!-- Local Image Library -->
        <div class="vr">
          <span class="vl">📁 Local Image Library (img/ folder)</span>
          <div id="vep-img-lib" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;max-height:160px;overflow-y:auto;scrollbar-width:thin">
          </div>
          <button class="vbig" id="vep-img-lib-refresh" style="margin-top:8px">↺ Reload Library</button>
        </div>
        <hr class="vsep">
        <!-- Unsplash Search -->
        <div class="vr">
          <span class="vl">🔍 Unsplash Search</span>
          <div class="vcrow">
            <input class="vi" type="text" id="vep-unsplash-q" placeholder="microphone, studio, music…" style="flex:1">
            <button class="vbsm" id="vep-unsplash-btn" style="border-radius:8px;padding:8px 12px">Go</button>
          </div>
          <div id="vep-unsplash-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;max-height:180px;overflow-y:auto;scrollbar-width:thin"></div>
        </div>
        <hr class="vsep">
        <!-- Icon Picker -->
        <div class="vr">
          <span class="vl">✦ SVG Icon Picker</span>
          <input class="vi" type="text" id="vep-icon-search" placeholder="Search icon…" style="margin-bottom:8px">
          <div id="vep-icon-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:140px;overflow-y:auto;scrollbar-width:thin"></div>
        </div>
        <hr class="vsep">
        <!-- Video BG -->
        <div class="vr">
          <span class="vl">🎥 Video Background</span>
          <input class="vi" type="text" id="vep-vid-url" placeholder="video.mp4 or https://…">
          <button class="vbig" id="vep-vid-apply" style="margin-top:6px">Apply as BG Video</button>
          <button class="vbig vdanger" id="vep-vid-remove" style="margin-top:6px">Remove Video BG</button>
        </div>
      </div>

      <!-- ── EXPORT TAB ── -->
      <div class="vep-tc" id="vrtc-export">
        <div class="vr">
          <button class="vbig" id="vep-export-html">⬇ Download index.html</button>
        </div>
        <div class="vr">
          <button class="vbig" id="vep-export-css-btn">📋 Copy CSS Changes</button>
        </div>
        <div class="vr">
          <span class="vl">CSS Log (last changes)</span>
          <div id="vep-css-log" style="max-height:200px;overflow-y:auto;font-size:9px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.03);border-radius:10px;padding:10px;line-height:2;scrollbar-width:thin">No changes yet.</div>
        </div>
        <div class="vr">
          <button class="vbig vdanger" id="vep-clear-log">🗑 Clear Log</button>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(panel);
  injectAnimKeyframes();
  bindRight();
  renderIconGrid('');
  renderLocalImages();
};

/* ═══════════════════════════════════════════════════════
   BIND RIGHT EVENTS
═══════════════════════════════════════════════════════ */
function bindRight() {
  const G = window.VEP;

  // Tabs
  document.querySelectorAll('[data-rtab]').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('[data-rtab]').forEach(x => x.classList.remove('on'));
      document.querySelectorAll('#vep-right .vep-tc').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      document.getElementById(`vrtc-${t.dataset.rtab}`).classList.add('on');
    });
  });

  // Collapse
  document.getElementById('vep-right-toggle').addEventListener('click', () => {
    G.collapseRight();
    document.getElementById('vep-right-toggle').textContent = document.getElementById('vep-right').classList.contains('collapsed') ? '◀' : '▶';
  });

  // ── PRO PANEL TOGGLE ──
  document.getElementById('vep-pro-tab').addEventListener('click', () => {
    // Build panel on first click if not yet created
    if (typeof window.buildDesignSystemPanelPro === 'function') {
      window.buildDesignSystemPanelPro();
    } else {
      // Fallback: try to find and toggle the panel directly
      let panel = document.getElementById('vep-promod');
      if (!panel) {
        // Panel not built yet — dispatch a synthetic click on the floating trigger if it exists
        const trigger = document.getElementById('vep-pro-trigger');
        if (trigger) { trigger.click(); return; }
      }
      if (panel) panel.classList.toggle('show');
    }
    // Keep the Pro tab visually distinct (don't add/remove .on like other tabs)
    const proTab = document.getElementById('vep-pro-tab');
    const isOpen = document.getElementById('vep-promod')?.classList.contains('show');
    if (proTab) {
      proTab.style.background    = isOpen ? 'rgba(var(--vep-accent-rgb),.5)'   : 'rgba(var(--vep-accent-rgb),.15)';
      proTab.style.borderColor   = isOpen ? 'rgba(var(--vep-accent-rgb),.8)'   : 'rgba(var(--vep-accent-rgb),.35)';
      proTab.style.color         = '#fff';
    }
  });

  // ── ELEMENT ──
  document.getElementById('vep-content').addEventListener('input', function() {
    if (!G.selectedEl||G.selectedEl.tagName==='IMG') return;
    G.selectedEl.innerHTML = this.innerHTML; 
    G.log(G.selectedEl,'innerHTML',this.innerHTML);
  });

  // Listen for selection changes to save the text selection range before input elements steal focus
  document.addEventListener('selectionchange', () => {
    if (G.selectedEl && G.selectedEl.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && sel.toString().length > 0 && G.selectedEl.contains(sel.anchorNode)) {
         G._savedRange = sel.getRangeAt(0);
      } else {
         // Only clear if they are clicking the text itself. If they are clicking a panel, PRESERVE the range!
         const active = document.activeElement;
         if (active && active.closest('#vep-right, #vep-left, #vep-promod, #vep-handles')) {
             // Let it live
         } else {
             G._savedRange = null; 
         }
      }
    }
  });

  const applyColorOverride = (val) => {
    if (G.selectedEl) {
      // 1. Check if user has selected text in the right panel Rich Textbox!
      const ta = document.getElementById('vep-content');
      if (document.activeElement === ta) {
         document.execCommand('styleWithCSS', false, true);
         document.execCommand('foreColor', false, val);
         // The 'input' listener of ta will automatically trigger and sync the new span to G.selectedEl.innerHTML !
         return;
      }

      // 2. Override for specific text selection on the canvas using robust DOM Range
      if (G._savedRange && G.selectedEl.contains(G._savedRange.commonAncestorContainer)) {
         try {
             // Validate range isn't empty
             if (G._savedRange.toString().length > 0) {
                 const span = document.createElement('span');
                 span.style.color = val;
                 
                 // Extract selected content and put it in our span
                 span.appendChild(G._savedRange.extractContents());
                 
                 // Clean up inner conflicting classes and styles
                 span.querySelectorAll('.ds-extra, .text-\\[\\#FF4D00\\]').forEach(c => {
                     c.classList.remove('ds-extra');
                     c.classList.remove('text-[#FF4D00]');
                     c.style.color = ''; 
                 });
                 if(span.classList.contains('ds-extra')){ span.classList.remove('ds-extra'); }
                 
                 // Insert it back
                 G._savedRange.insertNode(span);
                 
                 G._savedRange = null; 
                 // Sync to the right panel
                 if (ta) ta.innerHTML = G.selectedEl.innerHTML;
                 return;
             }
         } catch(err) {
             console.error("DOM Range Error:", err);
         }
      }
      
      // 3. Fallback: apply to entire element
      G.selectedEl.querySelectorAll('.ds-extra, .text-\\[\\#FF4D00\\]').forEach(c => {
           c.classList.remove('ds-extra');
           c.classList.remove('text-[#FF4D00]');
      });
      G.selectedEl.classList.remove('ds-extra');
      G.selectedEl.classList.remove('text-[#FF4D00]');

      G.applyStyle('color', val);
    }
  };
  const applySplitOverride = () => {
    if (!G.selectedEl) return;
    const ta = document.getElementById('vep-content');
    const isTaActive = document.activeElement === ta;

    if (isTaActive) {
      document.execCommand('styleWithCSS', false, true);
      // We wrap it in a special span with the class vep-item
      document.execCommand('insertHTML', false, `<span class="vep-item">${window.getSelection().toString()}</span>`);
      return;
    }

    if (G._savedRange && G.selectedEl.contains(G._savedRange.commonAncestorContainer)) {
      try {
        if (G._savedRange.toString().length > 0) {
          const span = document.createElement('span');
          span.className = 'vep-item';
          span.appendChild(G._savedRange.extractContents());
          G._savedRange.insertNode(span);
          G._savedRange = null;
          if (ta) ta.innerHTML = G.selectedEl.innerHTML;
        }
      } catch(err) { console.error("Split Error:", err); }
    }
  };
  const applyExplodeOverride = () => {
    if (!G.selectedEl) return;
    const text = G.selectedEl.innerText;
    if (!text.trim()) return;

    // Explode into spans. Preserve spaces for safety.
    const words = text.split(/(\s+)/);
    const html = words.map(w => {
      if (w.trim().length === 0) return w; // keep space as is
      return `<span class="vep-item">${w}</span>`;
    }).join('');

    G.selectedEl.innerHTML = html;
    const ta = document.getElementById('vep-content');
    if (ta) ta.innerHTML = html;
  };

  document.getElementById('vep-col').addEventListener('input', function() { applyColorOverride(this.value); });
  document.getElementById('vep-col-t').addEventListener('click', () => applyColorOverride('transparent'));
  document.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => applyColorOverride(b.dataset.col)));
  document.getElementById('vep-split-btn').addEventListener('click', applySplitOverride);
  document.getElementById('vep-explode-btn').addEventListener('click', applyExplodeOverride);

  sl('vep-fs','vep-fs-v','px', v => G.applyStyle('fontSize', v+'px'));
  document.getElementById('vep-fw').addEventListener('change', function() { G.applyStyle('fontWeight',this.value); });
  sl('vep-ls','vep-ls-v','px', v => G.applyStyle('letterSpacing', v+'px'));
  sl('vep-lh','vep-lh-v','',   v => G.applyStyle('lineHeight', v));

  document.querySelectorAll('[data-ta]').forEach(b => b.addEventListener('click', () => G.applyStyle('textAlign',b.dataset.ta)));
  document.querySelectorAll('[data-tt]').forEach(b => b.addEventListener('click', () => G.applyStyle('textTransform',b.dataset.tt)));

  sl('vep-w',  'vep-w-v',  'px', v => G.applyStyle('width',  v+'px'));
  sl('vep-h',  'vep-h-v',  'px', v => G.applyStyle('height', v+'px'));
  sl('vep-pad','vep-pad-v','px', v => G.applyStyle('padding', v+'px'));
  sl('vep-br', 'vep-br-v', 'px', v => G.applyStyle('borderRadius', v+'px'));
  sl('vep-op', 'vep-op-v', '%',  v => G.applyStyle('opacity', v/100));
  sl('vep-zi', 'vep-zi-v', '',   v => G.applyStyle('zIndex', v));

  document.getElementById('vep-dup').addEventListener('click', () => {
    if (!G.selectedEl) return;
    const c = G.selectedEl.cloneNode(true); G.selectedEl.insertAdjacentElement('afterend',c); G.selectElement(c);
  });
  document.getElementById('vep-del').addEventListener('click', () => {
    if (!G.selectedEl||!confirm('Delete?')) return;
    G.selectedEl.remove(); G.selectedEl=null;
  });

  document.getElementById('vep-blend').addEventListener('change', function() { G.applyStyle('mixBlendMode',this.value); });

  const fxRefresh = () => {
    if (!G.selectedEl) return;
    const b = v('vep-bright'), c=v('vep-contrast'), bl=v('vep-blur'), gr=v('vep-gray');
    G.applyStyle('filter',`brightness(${b}%) contrast(${c}%) blur(${bl}px) grayscale(${gr}%)`);
  };
  ['vep-bright','vep-contrast','vep-blur','vep-gray'].forEach(id => {
    const el=document.getElementById(id); if(!el)return;
    const units={'vep-blur':'px'};
    const u=units[id]||'%';
    el.addEventListener('input',function(){ const ve=document.getElementById(id+'-v'); if(ve)ve.textContent=this.value+u; fxRefresh(); });
  });

  // Presets
  document.getElementById('prst-hc').addEventListener('click', () => { G.applyStyle('color','#ffffff'); G.applyStyle('mixBlendMode','difference'); });
  document.getElementById('prst-glass').addEventListener('click', () => { G.applyStyle('backgroundColor','rgba(255,255,255,0.08)'); G.applyStyle('backdropFilter','blur(12px)'); G.applyStyle('borderRadius','16px'); G.applyStyle('border','1px solid rgba(255,255,255,0.15)'); });
  document.getElementById('prst-glow').addEventListener('click', () => G.applyStyle('textShadow','0 0 40px rgba(var(--vep-accent-rgb),.9),0 0 80px rgba(var(--vep-accent-rgb),.5)'));
  document.getElementById('prst-ghost').addEventListener('click', () => { G.applyStyle('opacity','.15'); G.applyStyle('mixBlendMode','luminosity'); });
  document.getElementById('prst-reset').addEventListener('click', () => {
    if (!G.selectedEl) return;
    ['filter','mixBlendMode','opacity','backgroundColor','textShadow','backdropFilter','border'].forEach(p => { G.selectedEl.style[p]=''; });
  });

  // ── GRADIENT ──
  let gtype = 'linear-gradient';
  document.querySelectorAll('[data-gtype]').forEach(b => b.addEventListener('click', () => { gtype=b.dataset.gtype; updateGradPreview(); }));
  ['vep-grad-angle','vep-grad-c1','vep-grad-c2'].forEach(id => { const el=document.getElementById(id); if(el) el.addEventListener('input', () => { if(id==='vep-grad-angle') document.getElementById('vep-grad-angle-v').textContent=el.value+'°'; updateGradPreview(); }); });

  function updateGradPreview() {
    const angle=v('vep-grad-angle'), c1=document.getElementById('vep-grad-c1').value, c2=document.getElementById('vep-grad-c2').value;
    const grad = gtype==='radial-gradient' ? `radial-gradient(circle, ${c1}, ${c2})` : gtype==='conic-gradient' ? `conic-gradient(${c1}, ${c2})` : `${gtype}(${angle}deg, ${c1}, ${c2})`;
    document.getElementById('vep-grad-preview').style.background = grad;
    return grad;
  }

  document.getElementById('vep-grad-apply-bg').addEventListener('click', () => { G.applyStyle('background', updateGradPreview()); });
  document.getElementById('vep-grad-apply-text').addEventListener('click', () => {
    G.applyStyle('background', updateGradPreview());
    G.applyStyle('webkitBackgroundClip','text'); G.applyStyle('webkitTextFillColor','transparent');
  });

  // Live gradient auto-apply on change
  ['vep-grad-angle','vep-grad-c1','vep-grad-c2'].forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    el.addEventListener('input', () => {
      const grad = updateGradPreview();
      if(G.selectedEl) { G.selectedEl.style.background = grad; } // live preview only (no log)
    });
  });

  // ── SHADOW ──
  let shadowMode = 'box';
  document.getElementById('shad-box-mode').addEventListener('click',  () => { shadowMode='box'; });
  document.getElementById('shad-text-mode').addEventListener('click', () => { shadowMode='text'; });

  function applyShadow() {
    const x=v('vep-sh-x'), y=v('vep-sh-y'), b=v('vep-sh-b'), s=v('vep-sh-s');
    const col=document.getElementById('vep-sh-col').value, a=v('vep-sh-a')/100;
    const r=parseInt(col.slice(1,3),16), g=parseInt(col.slice(3,5),16), bl2=parseInt(col.slice(5,7),16);
    const rgba=`rgba(${r},${g},${bl2},${a})`;
    const str = shadowMode==='text' ? `${x}px ${y}px ${b}px ${rgba}` : `${x}px ${y}px ${b}px ${s}px ${rgba}`;
    const prev=document.getElementById('vep-sh-preview');
    if(prev) prev.style.boxShadow = str;
    return { shadowMode, str };
  }
  ['vep-sh-x','vep-sh-y','vep-sh-b','vep-sh-s','vep-sh-col','vep-sh-a'].forEach(id => {
    const el=document.getElementById(id); if(!el)return;
    el.addEventListener('input', function() { const ve=document.getElementById(id+'-v'); if(ve)ve.textContent=this.value+(id==='vep-sh-a'?'%':'px'); applyShadow(); });
  });
  document.getElementById('vep-sh-apply').addEventListener('click', () => {
    const { shadowMode: mode, str } = applyShadow();
    G.applyStyle(mode==='text'?'textShadow':'boxShadow', str);
  });

  // ── PALETTE ──
  document.getElementById('vep-extract-palette').addEventListener('click', extractPalette);

  // ── TYPOGRAPHY ──
  const FONTS = [
    // Sans-serif Pro
    'Inter','Inter Tight','DM Sans','DM Mono','Space Grotesk','Space Mono',
    'Outfit','Urbanist','Syne','Plus Jakarta Sans','Manrope','Figtree',
    'Geist','Geist Mono','Onest',
    // Classic Sans
    'Roboto','Roboto Condensed','Open Sans','Lato','Nunito','Poppins',
    'Montserrat','Raleway','Barlow','Barlow Condensed','Mulish','Work Sans',
    'Source Sans 3','Rubik','Quicksand','Karla',
    // Display / Impact
    'Bebas Neue','Oswald','Unbounded','Black Han Sans','Archivo Black',
    'Anton','Fjalla One','Questrial','Exo 2','Rajdhani',
    // Serif Pro
    'Playfair Display','Lora','Libre Baskerville','Libre Franklin',
    'Cormorant Garamond','EB Garamond','Merriweather','Fraunces',
    'DM Serif Display','Abril Fatface','Yeseva One',
    // Geometric / Futuristic
    'Josefin Sans','Josefin Slab','Jost','Nunito Sans','Lexend',
    'Lexend Deca','Kanit','Comfortaa','Righteous','Audiowide',
    // Monospace / Code
    'JetBrains Mono','Fira Code','Source Code Pro','Roboto Mono',
    'IBM Plex Mono','Inconsolata','Courier Prime',
    // Decorative
    'Lobster','Pacifico','Sacramento','Dancing Script','Great Vibes'
  ];
  let selectedFont = null;

  function renderFonts(query) {
    const grid = document.getElementById('vep-font-grid'); if(!grid)return;
    const filtered = query ? FONTS.filter(f=>f.toLowerCase().includes(query.toLowerCase())) : FONTS;
    grid.innerHTML = filtered.map(f =>
      `<button class="vbsm vep-font-btn" style="border-radius:10px;padding:10px 6px;font-size:11px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-family:'${f}',sans-serif" data-font="${f}" title="${f}">${f}</button>`
    ).join('');
    // Lazy-load fonts for the grid buttons
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          const font = entry.target.dataset.font;
          if(font) loadGoogleFont(font);
          observer.unobserve(entry.target);
        }
      });
    }, { root: grid, rootMargin: '40px' });
    grid.querySelectorAll('[data-font]').forEach(b => {
      observer.observe(b);
      b.addEventListener('click', () => {
        selectedFont = b.dataset.font;
        document.getElementById('vep-font-selected').textContent = selectedFont;
        const preview = document.getElementById('vep-font-preview');
        loadGoogleFont(selectedFont).then(() => {
          if(preview) {
            preview.style.fontFamily = `'${selectedFont}',sans-serif`;
            preview.textContent = G.selectedEl?.innerText?.slice(0,28) || 'Aa Bb — DREAMYYSPACE';
          }
          // Auto-apply to selected element immediately
          if(G.selectedEl) G.applyStyle('fontFamily', `'${selectedFont}',sans-serif`);
        });
        // Highlight active
        grid.querySelectorAll('[data-font]').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
      });
    });
  }

  renderFonts('');
  document.getElementById('vep-font-search').addEventListener('input', function() { renderFonts(this.value); });

  // Category filter buttons
  document.querySelectorAll('[data-font-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-font-cat]').forEach(x => x.classList.remove('on'));
      btn.classList.add('on');
      const cat = btn.dataset.fontCat;
      if (!cat) { renderFonts(''); return; }
      const parts = cat.split('|');
      const grid = document.getElementById('vep-font-grid'); if(!grid) return;
      const filtered = FONTS.filter(f => parts.some(p => f.toLowerCase().includes(p.toLowerCase())));
      // Re-use renderFonts logic with pre-filtered list
      grid.innerHTML = filtered.map(f =>
        `<button class="vbsm vep-font-btn" style="border-radius:10px;padding:10px 6px;font-size:11px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-family:'${f}',sans-serif" data-font="${f}" title="${f}">${f}</button>`
      ).join('');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if(e.isIntersecting){ loadGoogleFont(e.target.dataset.font); observer.unobserve(e.target); } });
      }, { root: grid, rootMargin: '40px' });
      grid.querySelectorAll('[data-font]').forEach(b => {
        observer.observe(b);
        b.addEventListener('click', () => {
          selectedFont = b.dataset.font;
          document.getElementById('vep-font-selected').textContent = selectedFont;
          const preview = document.getElementById('vep-font-preview');
          loadGoogleFont(selectedFont).then(() => {
            if(preview){ preview.style.fontFamily=`'${selectedFont}',sans-serif`; preview.textContent=G.selectedEl?.innerText?.slice(0,28)||'Aa Bb — DREAMYYSPACE'; }
            if(G.selectedEl) G.applyStyle('fontFamily', `'${selectedFont}',sans-serif`);
          });
          grid.querySelectorAll('[data-font]').forEach(x=>x.classList.remove('on')); b.classList.add('on');
        });
      });
    });
  });

  document.getElementById('vep-font-apply-el').addEventListener('click', () => {
    if (!selectedFont||!G.selectedEl) return;
    loadGoogleFont(selectedFont).then(() => G.applyStyle('fontFamily', `'${selectedFont}',sans-serif`));
  });
  document.getElementById('vep-font-apply-all').addEventListener('click', () => {
    if (!selectedFont) return;
    loadGoogleFont(selectedFont).then(() => { document.body.style.fontFamily=`'${selectedFont}',sans-serif`; G.log(document.body,'fontFamily',selectedFont); });
  });

  // ── ANIMATIONS ──
  let currentAnim = null, animIter = '1';
  document.querySelectorAll('[data-anim]').forEach(b => {
    b.addEventListener('click', () => { currentAnim = b.dataset.anim; document.querySelectorAll('[data-anim]').forEach(x=>x.classList.remove('on')); b.classList.add('on'); });
  });
  document.querySelectorAll('[data-iter]').forEach(b => {
    b.addEventListener('click', () => { animIter=b.dataset.iter; document.querySelectorAll('[data-iter]').forEach(x=>x.classList.remove('on')); b.classList.add('on'); });
  });
  sl('vep-anim-dur','vep-anim-dur-v','s',()=>{});
  sl('vep-anim-del','vep-anim-del-v','s',()=>{});

  document.getElementById('vep-anim-apply').addEventListener('click', () => {
    if (!G.selectedEl||!currentAnim) return;
    if (currentAnim==='none') { G.applyStyle('animation','none'); return; }
    const dur = v('vep-anim-dur'), del=v('vep-anim-del'), timing=document.getElementById('vep-anim-timing').value;
    G.applyStyle('animation',`${currentAnim} ${dur}s ${timing} ${del}s ${animIter}`);
  });

  // ── MEDIA ──
  document.getElementById('vep-img-lib-refresh').addEventListener('click', renderLocalImages);

  document.getElementById('vep-unsplash-btn').addEventListener('click', () => {
    const q   = document.getElementById('vep-unsplash-q').value.trim() || 'music';
    const grid= document.getElementById('vep-unsplash-grid');
    grid.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,.4);padding:8px">Loading…</div>';
    // Use Unsplash source (no API key needed for random)
    const imgs = [1,2,3,4,5,6].map(() =>
      `https://source.unsplash.com/400x300/?${encodeURIComponent(q)}&sig=${Math.random()}`);
    grid.innerHTML = imgs.map(src =>
      `<div style="aspect-ratio:4/3;overflow:hidden;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.08)" onclick="window.VEP_applyImageSrc('${src}')">
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;transition:transform .3s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''">
      </div>`
    ).join('');
  });

  document.getElementById('vep-icon-search').addEventListener('input', function() { renderIconGrid(this.value); });

  document.getElementById('vep-vid-apply').addEventListener('click', () => {
    const url = document.getElementById('vep-vid-url').value.trim();
    const target = G.selectedEl || document.body;
    let vid = document.createElement('video');
    vid.src=url; vid.autoplay=true; vid.muted=true; vid.loop=true; vid.playsInline=true;
    vid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;';
    target.style.position='relative'; target.style.overflow='hidden';
    target.insertBefore(vid, target.firstChild);
  });
  document.getElementById('vep-vid-remove').addEventListener('click', () => {
    const target = G.selectedEl || document.body;
    target.querySelectorAll('video').forEach(v2=>v2.remove());
  });

  // ── EXPORT ──
  document.getElementById('vep-export-html').addEventListener('click', G.exportHTML);
  document.getElementById('vep-export-css-btn').addEventListener('click', () => {
    const txt = G.cssLog.map(c=>`/* ${c.sel} */\n${c.sel} { ${c.prop}: ${c.val}; }`).join('\n\n') || '/* No changes */';
    navigator.clipboard.writeText(txt).then(()=>alert('Copied!')).catch(()=>{console.log(txt);alert('Check console');});
  });
  document.getElementById('vep-clear-log').addEventListener('click', () => { G.cssLog=[]; document.getElementById('vep-css-log').textContent='No changes yet.'; });
}

/* ═══════════════════════════════════════════════════════
   PUBLIC SYNC (called by core when element is selected)
═══════════════════════════════════════════════════════ */
window.VEP_syncRight = function(el) {
  const cs  = getComputedStyle(el);
  const tag = el.tagName.toLowerCase();

  document.getElementById('vep-sel-info').textContent = `<${tag}> ${el.id?'#'+el.id:''}`;

  if (tag!=='img') { const c=document.getElementById('vep-content'); if(c) c.innerHTML=el.innerHTML||''; }
  const fs=Math.round(parseFloat(cs.fontSize)||16); setSl('vep-fs','vep-fs-v',fs,'px');
  setSl('vep-ls','vep-ls-v',(parseFloat(cs.letterSpacing)||0).toFixed(1),'px');
  const lhRaw=parseFloat(cs.lineHeight), fsRaw=parseFloat(cs.fontSize)||1;
  setSl('vep-lh','vep-lh-v',(isNaN(lhRaw)?1.2:lhRaw/fsRaw).toFixed(2),'');
  setSl('vep-op','vep-op-v',Math.round((parseFloat(cs.opacity)||1)*100),'%');
  const f=cs.filter||'none';
  setSl('vep-bright',  'vep-bright-v',   Math.round((getF(f,'brightness')||1)*100), '%');
  setSl('vep-contrast','vep-contrast-v', Math.round((getF(f,'contrast')||1)*100),   '%');
  setSl('vep-blur',    'vep-blur-v',     Math.round(getF(f,'blur')||0),             'px');
  setSl('vep-gray',    'vep-gray-v',     Math.round((getF(f,'grayscale')||0)*100),  '%');
  const blend=document.getElementById('vep-blend'); if(blend) blend.value=cs.mixBlendMode||'normal';
};

window.VEP_updateLog = function() {
  const G=window.VEP, log=document.getElementById('vep-css-log'); if(!log)return;
  log.innerHTML=G.cssLog.slice(-30).map(c=>`<span style="color:var(--vep-accent)">${c.sel}</span>·<b style="color:#fff">${c.prop}</b>:${c.val}`).join('<br>');
  log.scrollTop=log.scrollHeight;
};

/* ═══════════════════════════════════════════════════════
   PALETTE EXTRACTOR
═══════════════════════════════════════════════════════ */
function extractPalette() {
  const G = window.VEP;
  const colorSet = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor, cs.borderColor].forEach(c => {
      if (c && !c.includes('rgba(0, 0, 0, 0)') && c !== 'rgba(0,0,0,0)') colorSet.add(c);
    });
  });
  const palette = document.getElementById('vep-palette'); if(!palette)return;
  palette.innerHTML = [...colorSet].slice(0,16).map(c => {
    const hex = rgbToHex(c);
    return hex ? `<div title="${hex}" style="width:28px;height:28px;border-radius:7px;background:${c};border:1px solid rgba(255,255,255,.1);cursor:pointer;position:relative" onclick="if(window.VEP.selectedEl){window.VEP.applyStyle('color','${hex}')}" title="${hex}"></div>` : '';
  }).join('');
}

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#'+[m[1],m[2],m[3]].map(x=>parseInt(x).toString(16).padStart(2,'0')).join('');
}

/* ═══════════════════════════════════════════════════════
   ICON PICKER
═══════════════════════════════════════════════════════ */
const ICONS = {
  mic:'<path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  headphones:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>',
  volume:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>',
  star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart:'<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  play:'<polygon points="5 3 19 12 5 21 5 3"/>',
  pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  arrow:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  close:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  user:'<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  mail:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  phone:'<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014 11.36a19.79 19.79 0 01-3.07-8.67A2 2 0 012.88 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  camera:'<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
};

function renderIconGrid(query) {
  const grid = document.getElementById('vep-icon-grid'); if(!grid)return;
  const filtered = Object.entries(ICONS).filter(([k])=>!query||k.includes(query.toLowerCase()));
  grid.innerHTML = filtered.map(([name, path]) =>
    `<div title="${name}" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.08);transition:all .15s"
     onmouseover="this.style.background='rgba(var(--vep-accent-rgb),.2)'" onmouseout="this.style.background='rgba(255,255,255,.05)'"
     onclick="window.VEP_insertIcon('${name}')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#fff">${path}</svg>
    </div>`
  ).join('');
}

window.VEP_insertIcon = function(name) {
  const G=window.VEP;
  const path=ICONS[name];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#fff">${path}</svg>`;
  const tmp=document.createElement('div'); tmp.innerHTML=svg;
  const el=tmp.firstElementChild;
  if(G.selectedEl){ G.selectedEl.insertAdjacentElement('afterend',el); } else { document.body.appendChild(el); }
  G.selectElement(el);
};

/* ═══════════════════════════════════════════════════════
   LOCAL IMAGE LIBRARY
═══════════════════════════════════════════════════════ */
function renderLocalImages() {
  const grid = document.getElementById('vep-img-lib'); if(!grid)return;
  const names = []; for(let i=1;i<=20;i++){['jpeg','jpg','png','webp'].forEach(e=>names.push(`img/${i}.${e}`));}
  grid.innerHTML = names.slice(0,30).map(src =>
    `<div style="aspect-ratio:1;overflow:hidden;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.08)"
      onclick="window.VEP_applyImageSrc('${src}')">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;transition:transform .3s"
        onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''"
        onerror="this.parentElement.style.display='none'">
     </div>`
  ).join('');
}

window.VEP_applyImageSrc = function(src) {
  const G=window.VEP;
  if (!G.selectedEl) return;
  if (G.selectedEl.tagName==='IMG') { G.selectedEl.src=src; G.log(G.selectedEl,'src',src); }
  else { G.applyStyle('backgroundImage', `url('${src}')`); G.applyStyle('backgroundSize','cover'); G.applyStyle('backgroundPosition','center'); }
};

/* ═══════════════════════════════════════════════════════
   GOOGLE FONTS LOADER
═══════════════════════════════════════════════════════ */
function loadGoogleFont(name) {
  return new Promise(resolve => {
    const id = 'gf-' + name.replace(/\s/g,'-');
    if (!document.getElementById(id)) {
      const link=document.createElement('link');
      link.id=id; link.rel='stylesheet';
      link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@100;300;400;700;900&display=swap`;
      document.head.appendChild(link);
      link.onload=resolve;
    } else resolve();
  });
}

/* ═══════════════════════════════════════════════════════
   ANIMATION KEYFRAMES
═══════════════════════════════════════════════════════ */
function injectAnimKeyframes() {
  if (document.getElementById('vep-anim-kf')) return;
  const s=document.createElement('style'); s.id='vep-anim-kf';
  s.textContent=`
    @keyframes fadeIn      { from{opacity:0}               to{opacity:1} }
    @keyframes fadeInUp    { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:none} }
    @keyframes slideInLeft { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:none} }
    @keyframes slideInRight{ from{opacity:0;transform:translateX(60px)}  to{opacity:1;transform:none} }
    @keyframes bounce      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
    @keyframes pulse       { 0%,100%{transform:scale(1)}      50%{transform:scale(1.08)} }
    @keyframes shake       { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-10px)} 75%{transform:translateX(10px)} }
    @keyframes rotate      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes zoom        { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
    @keyframes float       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function sl(sliderId, valId, unit, cb) {
  const el=document.getElementById(sliderId), ve=document.getElementById(valId); if(!el)return;
  el.addEventListener('input',function(){if(ve)ve.textContent=this.value+unit; cb(parseFloat(this.value));});
}
function setSl(sid,vid,val,unit){const s=document.getElementById(sid),v=document.getElementById(vid);if(s)s.value=val;if(v)v.textContent=val+unit;}
function v(id){const el=document.getElementById(id);return el?parseFloat(el.value):null;}
function getF(str,type){if(!str||str==='none')return null;const m=str.match(new RegExp(`${type}\\(([\\d.]+)`));return m?parseFloat(m[1]):null;}

/**
 * DREAMYYSPACE EDITOR — editor-effects.js
 * 20 CSS Effects Panel (injected as new tab in right sidebar)
 */
(function () {
  'use strict';

  /* ── Inject Keyframes ─────────────────────────────────── */
  function injectKF() {
    if (document.getElementById('vep-fx-kf')) return;
    const s = document.createElement('style');
    s.id = 'vep-fx-kf';
    s.textContent = `
      @keyframes glitch-1 { 0%,100%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0) skewX(-2deg)}50%{clip-path:inset(30% 0 50% 0);transform:translate(4px,0) skewX(2deg)} }
      @keyframes glitch-2 { 0%,100%{clip-path:inset(70% 0 5% 0);transform:translate(4px,0)}50%{clip-path:inset(10% 0 80% 0);transform:translate(-4px,0)} }
      @keyframes neon-pulse { 0%,100%{opacity:1} 50%{opacity:.75} }
      @keyframes grad-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes border-spin { from{--angle:0deg} to{--angle:360deg} }
      @keyframes aurora-move { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(80px,-60px) scale(1.2)} 66%{transform:translate(-60px,40px) scale(.9)} }
      @keyframes ls-expand { from{letter-spacing:0} to{letter-spacing:.5em} }
      @keyframes scroll-reveal { from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:none} }

      /* Glitch classes */
      .vep-glitch { position:relative; }
      .vep-glitch::before, .vep-glitch::after {
        content: attr(data-text); position:absolute; top:0; left:0;
        width:100%; height:100%; pointer-events:none;
      }
      .vep-glitch::before { color:#0ff; animation:glitch-1 2s infinite linear; }
      .vep-glitch::after  { color:#f0f; animation:glitch-2 2s infinite linear; }

      /* Neon */
      .vep-neon-pulse { animation: neon-pulse 1.5s ease-in-out infinite; }

      /* Tilt */
      .vep-tilt { transform-style:preserve-3d; transition:transform .1s ease; }

      /* Magnet */
      .vep-magnet { transition: transform .3s cubic-bezier(0.34,1.56,0.64,1); }

      /* Noise overlay */
      .vep-noise::after {
        content:''; position:absolute; inset:0; pointer-events:none;
        background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
        mix-blend-mode:overlay; z-index:10;
      }

      /* Aurora */
      .vep-aurora { position:relative; overflow:hidden; }
      .vep-aurora::before {
        content:''; position:absolute; width:60%; aspect-ratio:1;
        border-radius:50%; filter:blur(80px); opacity:.6;
        animation:aurora-move 8s ease-in-out infinite;
        pointer-events:none; z-index:0;
      }

      /* Animated Border */
      @property --angle { syntax:'<angle>'; inherits:false; initial-value:0deg; }
      .vep-anim-border {
        border:3px solid transparent;
        background: linear-gradient(black,black) padding-box,
          conic-gradient(from var(--angle), #FF4D00, #0ff, #FF4D00) border-box;
        animation: border-spin 3s linear infinite;
      }

      /* Ghost text */
      .vep-ghost { color: transparent !important; }

      /* Scroll reveal */
      .vep-scroll-reveal {
        animation: scroll-reveal linear both;
        animation-timeline: scroll();
        animation-range: entry 0% entry 40%;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Tilt JS ──────────────────────────────────────────── */
  function bindTilt(el) {
    el.classList.add('vep-tilt');
    el.addEventListener('mousemove', function(e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      el.style.transform = `perspective(600px) rotateY(${x*20}deg) rotateX(${-y*20}deg)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }

  /* ── Magnet JS ────────────────────────────────────────── */
  function bindMagnet(el) {
    el.classList.add('vep-magnet');
    el.addEventListener('mousemove', function(e) {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width/2)  * .3;
      const dy = (e.clientY - r.top  - r.height/2) * .3;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }

  /* ── Build Effects Tab ────────────────────────────────── */
  function injectEffectsTab() {
    function tryInject() {
      const tabsBar = document.querySelector('#vep-right .vep-tabs');
      const body    = document.querySelector('#vep-right .vep-sb');
      if (!tabsBar || !body) { setTimeout(tryInject, 800); return; }
      if (document.getElementById('vep-tab-fx20')) return;

      // New tab button
      const tb = document.createElement('button');
      tb.className = 'vep-tab'; tb.id = 'vep-tab-fx20'; tb.textContent = '✦ FX';
      tb.dataset.rtab = 'fx20'; tabsBar.appendChild(tb);
      tb.addEventListener('click', () => {
        document.querySelectorAll('[data-rtab]').forEach(x => x.classList.remove('on'));
        document.querySelectorAll('#vep-right .vep-tc').forEach(x => x.classList.remove('on'));
        tb.classList.add('on');
        document.getElementById('vrtc-fx20').classList.add('on');
      });

      // Tab content
      const tc = document.createElement('div');
      tc.className = 'vep-tc'; tc.id = 'vrtc-fx20';
      tc.innerHTML = buildFXHTML();
      body.appendChild(tc);
      bindFXEvents();
    }
    tryInject();
  }

  /* ── FX Panel HTML ────────────────────────────────────── */
  function buildFXHTML() {
    return `
      <!-- 1. Text Stroke -->
      <div class="vr">
        <span class="vl">1 ▸ Text Stroke</span>
        <div class="vcrow">
          <input type="color" id="fx-stroke-col" value="#FF4D00">
          <input type="range" id="fx-stroke-w" min="0" max="10" value="1" step=".5" style="flex:1">
          <span id="fx-stroke-v">1px</span>
        </div>
        <button class="vbig" id="fx-stroke-apply" style="margin-top:6px">Apply Stroke</button>
      </div><hr class="vsep">

      <!-- 2. Text Clip Video -->
      <div class="vr">
        <span class="vl">2 ▸ Text Clip Vidéo</span>
        <input class="vi" type="text" id="fx-clip-vid" placeholder="video.mp4 or URL…" style="margin-bottom:6px">
        <button class="vbig" id="fx-clip-apply">Apply Video Clip Text</button>
        <button class="vbig vdanger" id="fx-clip-remove" style="margin-top:4px">Remove</button>
      </div><hr class="vsep">

      <!-- 3. Glitch -->
      <div class="vr">
        <span class="vl">3 ▸ Glitch Effect</span>
        <div class="vcrow" style="margin-bottom:6px">
          <button class="vbsm" id="fx-glitch-on">⚡ Apply Glitch</button>
          <button class="vbsm vdanger" id="fx-glitch-off">Remove</button>
        </div>
      </div><hr class="vsep">

      <!-- 4. Neon Glow -->
      <div class="vr">
        <span class="vl">4 ▸ Neon Glow</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-neon-col" value="#FF4D00">
          <input type="range" id="fx-neon-spread" min="5" max="80" value="20" style="flex:1">
          <span id="fx-neon-v">20px</span>
        </div>
        <button class="vbig" id="fx-neon-apply">Apply Neon</button>
      </div><hr class="vsep">

      <!-- 5. 3D Perspective -->
      <div class="vr">
        <span class="vl">5 ▸ 3D Perspective</span>
        <div class="vslrow">
          <span style="font-size:9px;color:rgba(255,255,255,.4);min-width:30px">RotX</span>
          <input type="range" id="fx-3d-rx" min="-90" max="90" value="0">
          <span id="fx-3d-rx-v">0°</span>
        </div>
        <div class="vslrow" style="margin-top:4px">
          <span style="font-size:9px;color:rgba(255,255,255,.4);min-width:30px">RotY</span>
          <input type="range" id="fx-3d-ry" min="-90" max="90" value="0">
          <span id="fx-3d-ry-v">0°</span>
        </div>
        <div class="vslrow" style="margin-top:4px">
          <span style="font-size:9px;color:rgba(255,255,255,.4);min-width:30px">Persp</span>
          <input type="range" id="fx-3d-p" min="100" max="2000" value="600" step="50">
          <span id="fx-3d-p-v">600px</span>
        </div>
        <button class="vbig" id="fx-3d-apply" style="margin-top:6px">Apply 3D</button>
      </div><hr class="vsep">

      <!-- 6. Letter Spacing Animé -->
      <div class="vr">
        <span class="vl">6 ▸ Letter Spacing Hover</span>
        <div class="vslrow"><input type="range" id="fx-ls-to" min="0" max="2" value=".3" step=".05"><span id="fx-ls-to-v">0.3em</span></div>
        <button class="vbig" id="fx-ls-apply" style="margin-top:6px">Apply LS Animation</button>
      </div><hr class="vsep">

      <!-- 7. Text Mask Image -->
      <div class="vr">
        <span class="vl">7 ▸ Text Mask Image</span>
        <input class="vi" type="text" id="fx-mask-url" placeholder="Image URL or img/1.jpeg" style="margin-bottom:6px">
        <button class="vbig" id="fx-mask-apply">Apply Mask Image</button>
      </div><hr class="vsep">

      <!-- 8. Ghost Text -->
      <div class="vr">
        <span class="vl">8 ▸ Ghost / Outline Text</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-ghost-col" value="#ffffff">
          <input type="range" id="fx-ghost-w" min=".5" max="4" value="1" step=".5" style="flex:1">
          <span id="fx-ghost-v">1px</span>
        </div>
        <button class="vbig" id="fx-ghost-apply">Apply Ghost Text</button>
      </div><hr class="vsep">

      <!-- 9. Noise Texture -->
      <div class="vr">
        <span class="vl">9 ▸ Noise Texture Overlay</span>
        <div class="vslrow"><input type="range" id="fx-noise-op" min="0" max="100" value="8"><span id="fx-noise-op-v">8%</span></div>
        <button class="vbig" id="fx-noise-apply" style="margin-top:6px">Apply Noise</button>
        <button class="vbig vdanger" id="fx-noise-remove" style="margin-top:4px">Remove</button>
      </div><hr class="vsep">

      <!-- 10. Parallax -->
      <div class="vr">
        <span class="vl">10 ▸ Parallax CSS</span>
        <button class="vbig" id="fx-parallax-apply">Apply bg-attachment:fixed</button>
      </div><hr class="vsep">

      <!-- 11. Glassmorphism -->
      <div class="vr">
        <span class="vl">11 ▸ Glassmorphism Avancé</span>
        <div class="vslrow"><span style="font-size:9px;min-width:40px;color:rgba(255,255,255,.4)">Blur</span><input type="range" id="fx-glass-blur" min="0" max="40" value="12"><span id="fx-glass-blur-v">12px</span></div>
        <div class="vslrow" style="margin-top:4px"><span style="font-size:9px;min-width:40px;color:rgba(255,255,255,.4)">Alpha</span><input type="range" id="fx-glass-alpha" min="0" max="40" value="8"><span id="fx-glass-alpha-v">8%</span></div>
        <div class="vcrow" style="margin-top:6px">
          <input type="color" id="fx-glass-tint" value="#ffffff">
          <span style="font-size:9px;color:rgba(255,255,255,.4)">Tint Color</span>
        </div>
        <button class="vbig" id="fx-glass-apply" style="margin-top:6px">Apply Glass</button>
      </div><hr class="vsep">

      <!-- 12. Gradient Animé -->
      <div class="vr">
        <span class="vl">12 ▸ Gradient Animé</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-ganim-c1" value="#FF4D00">
          <input type="color" id="fx-ganim-c2" value="#0ff">
          <input type="color" id="fx-ganim-c3" value="#f0f">
        </div>
        <div class="vslrow"><input type="range" id="fx-ganim-dur" min="1" max="20" value="6"><span id="fx-ganim-dur-v">6s</span></div>
        <button class="vbig" id="fx-ganim-apply" style="margin-top:6px">Apply Animated Gradient</button>
      </div><hr class="vsep">

      <!-- 13. Aurora -->
      <div class="vr">
        <span class="vl">13 ▸ Aurora / Glow Blob</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-aurora-col" value="#FF4D00">
          <input type="range" id="fx-aurora-size" min="100" max="800" value="300" step="20" style="flex:1">
          <span id="fx-aurora-size-v">300px</span>
        </div>
        <button class="vbig" id="fx-aurora-apply">Add Aurora Blob</button>
      </div><hr class="vsep">

      <!-- 14. Colored Shadow -->
      <div class="vr">
        <span class="vl">14 ▸ Ombre Portée Colorée</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-cshadow-col" value="#FF4D00">
          <input type="range" id="fx-cshadow-spread" min="0" max="80" value="30" style="flex:1">
          <span id="fx-cshadow-v">30px</span>
        </div>
        <button class="vbig" id="fx-cshadow-apply">Apply Colored Shadow</button>
      </div><hr class="vsep">

      <!-- 15. Animated Border -->
      <div class="vr">
        <span class="vl">15 ▸ Animated Border</span>
        <div class="vslrow"><input type="range" id="fx-aborder-dur" min="1" max="10" value="3"><span id="fx-aborder-dur-v">3s</span></div>
        <button class="vbig" id="fx-aborder-apply" style="margin-top:6px">Apply Animated Border</button>
        <button class="vbig vdanger" id="fx-aborder-remove" style="margin-top:4px">Remove</button>
      </div><hr class="vsep">

      <!-- 16. Clip Path -->
      <div class="vr">
        <span class="vl">16 ▸ Clip Path Shape</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <button class="vbsm" style="border-radius:8px;padding:10px" data-cp="polygon(0 0,100% 0,85% 100%,0 100%)">Rhomboid</button>
          <button class="vbsm" style="border-radius:8px;padding:10px" data-cp="polygon(50% 0,100% 100%,0 100%)">Triangle</button>
          <button class="vbsm" style="border-radius:8px;padding:10px" data-cp="polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)">Hexagone</button>
          <button class="vbsm" style="border-radius:8px;padding:10px" data-cp="polygon(0 15%,15% 0,85% 0,100% 15%,100% 85%,85% 100%,15% 100%,0 85%)">Octogone</button>
          <button class="vbsm" style="border-radius:8px;padding:10px" data-cp="ellipse(50% 40% at 50% 50%)">Ellipse</button>
          <button class="vbsm vdanger" style="border-radius:8px;padding:10px" id="fx-cp-remove">None</button>
        </div>
      </div><hr class="vsep">

      <!-- 17. Border Image Gradient -->
      <div class="vr">
        <span class="vl">17 ▸ Border Gradient</span>
        <div class="vcrow" style="margin-bottom:6px">
          <input type="color" id="fx-bimg-c1" value="#FF4D00">
          <input type="color" id="fx-bimg-c2" value="#0ff">
          <input type="range" id="fx-bimg-w" min="1" max="8" value="2" style="flex:1">
          <span id="fx-bimg-w-v">2px</span>
        </div>
        <button class="vbig" id="fx-bimg-apply">Apply</button>
      </div><hr class="vsep">

      <!-- 18. Cursor Magnet -->
      <div class="vr">
        <span class="vl">18 ▸ Cursor Magnet</span>
        <div class="vcrow">
          <button class="vbsm" id="fx-magnet-on">🧲 Enable Magnet</button>
          <button class="vbsm vdanger" id="fx-magnet-off">Remove</button>
        </div>
      </div><hr class="vsep">

      <!-- 19. Tilt 3D Hover -->
      <div class="vr">
        <span class="vl">19 ▸ Tilt 3D on Hover</span>
        <div class="vcrow">
          <button class="vbsm" id="fx-tilt-on">↗ Enable Tilt</button>
          <button class="vbsm vdanger" id="fx-tilt-off">Remove</button>
        </div>
      </div><hr class="vsep">

      <!-- 20. Scroll Reveal -->
      <div class="vr">
        <span class="vl">20 ▸ Scroll Reveal CSS</span>
        <button class="vbig" id="fx-scroll-reveal-apply">Apply Scroll Reveal</button>
        <button class="vbig vdanger" id="fx-scroll-reveal-remove" style="margin-top:4px">Remove</button>
      </div>
    `;
  }

  /* ── Bind All FX Events ───────────────────────────────── */
  function bindFXEvents() {
    const G = window.VEP;
    const el = () => G.selectedEl;

    /* ─ 1. Text Stroke ─ */
    sl('fx-stroke-w','fx-stroke-v','px',()=>{});
    on('fx-stroke-apply', () => {
      if(!el()) return;
      const w = v('fx-stroke-w'), c = col('fx-stroke-col');
      G.applyStyle('webkitTextStroke', `${w}px ${c}`);
    });

    /* ─ 2. Text Clip Video ─ */
    on('fx-clip-apply', () => {
      if(!el()) return;
      const url = document.getElementById('fx-clip-vid').value.trim(); if(!url) return;
      // Wrap el in relative container, inject video behind
      el().style.position = 'relative';
      const vid = document.createElement('video');
      vid.src=url; vid.autoplay=true; vid.muted=true; vid.loop=true; vid.playsInline=true;
      vid.id='fx-clip-vid-el';
      vid.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;';
      el().insertBefore(vid, el().firstChild);
      G.applyStyle('color','transparent');
      G.applyStyle('backgroundClip','text');
      G.applyStyle('webkitBackgroundClip','text');
      G.applyStyle('backgroundImage',`url('${url}')`);
      G.applyStyle('backgroundSize','cover');
    });
    on('fx-clip-remove', () => {
      if(!el()) return;
      ['color','backgroundClip','webkitBackgroundClip','backgroundImage','backgroundSize'].forEach(p=>el().style[p]='');
      el().querySelector('#fx-clip-vid-el')?.remove();
    });

    /* ─ 3. Glitch ─ */
    on('fx-glitch-on', () => {
      if(!el()) return;
      el().classList.add('vep-glitch');
      el().setAttribute('data-text', el().innerText||'');
    });
    on('fx-glitch-off', () => { el()?.classList.remove('vep-glitch'); el()?.removeAttribute('data-text'); });

    /* ─ 4. Neon Glow ─ */
    sl('fx-neon-spread','fx-neon-v','px',()=>{});
    on('fx-neon-apply', () => {
      if(!el()) return;
      const s = v('fx-neon-spread'), c = col('fx-neon-col');
      const ts = `0 0 ${s*.3}px ${c}, 0 0 ${s}px ${c}, 0 0 ${s*2}px ${c}`;
      G.applyStyle('textShadow', ts);
      el().classList.add('vep-neon-pulse');
    });

    /* ─ 5. 3D ─ */
    ['fx-3d-rx','fx-3d-ry','fx-3d-p'].forEach(id => {
      const el2=document.getElementById(id), u=id==='fx-3d-p'?'px':'°', vid=id+'-v';
      if(el2) el2.addEventListener('input',function(){document.getElementById(vid).textContent=this.value+u;});
    });
    on('fx-3d-apply', () => {
      if(!el()) return;
      const rx=v('fx-3d-rx'), ry=v('fx-3d-ry'), p=v('fx-3d-p');
      G.applyStyle('transform',`perspective(${p}px) rotateX(${rx}deg) rotateY(${ry}deg)`);
      G.applyStyle('transformStyle','preserve-3d');
    });

    /* ─ 6. Letter Spacing Hover ─ */
    sl('fx-ls-to','fx-ls-to-v','em',()=>{});
    on('fx-ls-apply', () => {
      if(!el()) return;
      const to = v('fx-ls-to');
      const uid = 'ls-hover-' + Date.now();
      el().classList.add(uid);
      const s = document.createElement('style');
      s.textContent = `.${uid}{ transition: letter-spacing .4s ease; } .${uid}:hover{ letter-spacing: ${to}em; }`;
      document.head.appendChild(s);
    });

    /* ─ 7. Text Mask Image ─ */
    on('fx-mask-apply', () => {
      if(!el()) return;
      const url = document.getElementById('fx-mask-url').value.trim(); if(!url) return;
      G.applyStyle('backgroundImage', `url('${url}')`);
      G.applyStyle('backgroundSize', 'cover');
      G.applyStyle('backgroundClip', 'text');
      G.applyStyle('webkitBackgroundClip','text');
      G.applyStyle('webkitTextFillColor','transparent');
      G.applyStyle('color','transparent');
    });

    /* ─ 8. Ghost Text ─ */
    sl('fx-ghost-w','fx-ghost-v','px',()=>{});
    on('fx-ghost-apply', () => {
      if(!el()) return;
      const w=v('fx-ghost-w'), c=col('fx-ghost-col');
      G.applyStyle('webkitTextStroke', `${w}px ${c}`);
      G.applyStyle('webkitTextFillColor','transparent');
      G.applyStyle('color','transparent');
    });

    /* ─ 9. Noise ─ */
    sl('fx-noise-op','fx-noise-op-v','%',()=>{});
    on('fx-noise-apply', () => {
      if(!el()) return;
      el().classList.add('vep-noise');
      el().style.position = 'relative';
    });
    on('fx-noise-remove', () => { el()?.classList.remove('vep-noise'); });

    /* ─ 10. Parallax CSS ─ */
    on('fx-parallax-apply', () => {
      if(!el()) return;
      G.applyStyle('backgroundAttachment','fixed');
      G.applyStyle('backgroundSize','cover');
      G.applyStyle('backgroundPosition','center');
    });

    /* ─ 11. Glassmorphism ─ */
    sl('fx-glass-blur','fx-glass-blur-v','px',()=>{});
    sl('fx-glass-alpha','fx-glass-alpha-v','%',()=>{});
    on('fx-glass-apply', () => {
      if(!el()) return;
      const b=v('fx-glass-blur'), a=v('fx-glass-alpha'), c=col('fx-glass-tint');
      const rgba=hexToRgba(c, a/100);
      G.applyStyle('backdropFilter',`blur(${b}px) saturate(180%)`);
      G.applyStyle('webkitBackdropFilter',`blur(${b}px) saturate(180%)`);
      G.applyStyle('backgroundColor', rgba);
      G.applyStyle('border','1px solid rgba(255,255,255,0.15)');
      G.applyStyle('borderRadius','16px');
    });

    /* ─ 12. Gradient Animé ─ */
    sl('fx-ganim-dur','fx-ganim-dur-v','s',()=>{});
    on('fx-ganim-apply', () => {
      if(!el()) return;
      const c1=col('fx-ganim-c1'), c2=col('fx-ganim-c2'), c3=col('fx-ganim-c3'), d=v('fx-ganim-dur');
      G.applyStyle('background',`linear-gradient(-45deg,${c1},${c2},${c3},${c1})`);
      G.applyStyle('backgroundSize','400% 400%');
      G.applyStyle('animation',`grad-shift ${d}s ease infinite`);
    });

    /* ─ 13. Aurora ─ */
    sl('fx-aurora-size','fx-aurora-size-v','px',()=>{});
    on('fx-aurora-apply', () => {
      if(!el()) return;
      const size=v('fx-aurora-size'), c=col('fx-aurora-col');
      el().style.position='relative'; el().style.overflow='hidden';
      const blob=document.createElement('div');
      blob.style.cssText=`position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${c};filter:blur(${size*.4}px);opacity:.5;animation:aurora-move 8s ease-in-out infinite;pointer-events:none;z-index:0;top:0;left:0`;
      el().insertBefore(blob, el().firstChild);
    });

    /* ─ 14. Colored Shadow ─ */
    sl('fx-cshadow-spread','fx-cshadow-v','px',()=>{});
    on('fx-cshadow-apply', () => {
      if(!el()) return;
      const s=v('fx-cshadow-spread'), c=col('fx-cshadow-col');
      G.applyStyle('boxShadow',`0 ${s*.3}px ${s}px ${hexToRgba(c,.6)}, 0 ${s*.6}px ${s*2}px ${hexToRgba(c,.3)}`);
    });

    /* ─ 15. Animated Border ─ */
    sl('fx-aborder-dur','fx-aborder-dur-v','s',()=>{});
    on('fx-aborder-apply', () => {
      if(!el()) return;
      el().classList.add('vep-anim-border');
      el().style.animationDuration = v('fx-aborder-dur')+'s';
    });
    on('fx-aborder-remove', () => { el()?.classList.remove('vep-anim-border'); });

    /* ─ 16. Clip Path ─ */
    document.querySelectorAll('[data-cp]').forEach(b => {
      b.addEventListener('click', () => { if(el()) G.applyStyle('clipPath', b.dataset.cp); });
    });
    on('fx-cp-remove', () => { if(el()) G.applyStyle('clipPath','none'); });

    /* ─ 17. Border Image Gradient ─ */
    sl('fx-bimg-w','fx-bimg-w-v','px',()=>{});
    on('fx-bimg-apply', () => {
      if(!el()) return;
      const c1=col('fx-bimg-c1'), c2=col('fx-bimg-c2'), w=v('fx-bimg-w');
      G.applyStyle('border',`${w}px solid transparent`);
      G.applyStyle('background',`linear-gradient(black,black) padding-box, linear-gradient(135deg,${c1},${c2}) border-box`);
    });

    /* ─ 18. Magnet ─ */
    on('fx-magnet-on',  () => { if(el()) bindMagnet(el()); });
    on('fx-magnet-off', () => { if(el()){ el().classList.remove('vep-magnet'); el().style.transform=''; const old=el()._magnetOff; if(old){el().removeEventListener('mousemove',old); el().removeEventListener('mouseleave',old);} } });

    /* ─ 19. Tilt ─ */
    on('fx-tilt-on',  () => { if(el()) bindTilt(el()); });
    on('fx-tilt-off', () => { if(el()){ el().classList.remove('vep-tilt'); el().style.transform=''; } });

    /* ─ 20. Scroll Reveal ─ */
    on('fx-scroll-reveal-apply',  () => { if(el()) el().classList.add('vep-scroll-reveal'); });
    on('fx-scroll-reveal-remove', () => { if(el()) el().classList.remove('vep-scroll-reveal'); });
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function on(id, fn) { const e=document.getElementById(id); if(e) e.addEventListener('click',fn); }
  function sl(sid, vid, unit, cb) {
    const e=document.getElementById(sid), ve=document.getElementById(vid); if(!e)return;
    e.addEventListener('input',function(){if(ve)ve.textContent=this.value+unit; cb(parseFloat(this.value));});
  }
  function v(id)   { const e=document.getElementById(id); return e?parseFloat(e.value):0; }
  function col(id) { const e=document.getElementById(id); return e?e.value:'#ffffff'; }
  function hexToRgba(hex, alpha=1) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ── Init ─────────────────────────────────────────────── */
  function init() { injectKF(); injectEffectsTab(); }
  if (document.readyState !== 'loading') setTimeout(init, 1000);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));

})();

/**
 * ══════════════════════════════════════════════════════════
 *  DREAMYYSPACE EDITOR v3  |  editor-pro.js
 *  PRO MODULE: Design Systems, DOM Tools, Style Tools
 * ══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── Wait for VEP core to be ready ── */
  function ready(fn) {
    if (window.VEP && window.VEP.editActive !== undefined) fn();
    else document.addEventListener('click', function onC() {
      document.removeEventListener('click', onC);
      setTimeout(fn, 400);
    });
  }

  /* ═══════════════════════════════════════════════════════
     DESIGN SYSTEMS  (palette + font pair bundles)
  ═══════════════════════════════════════════════════════ */
  const DESIGN_SYSTEMS = [
    {
      name: 'Noir Studio',
      preview: ['#0a0a0a', 'var(--vep-accent)', '#ffffff'],
      vars: { '--ds-bg': '#0a0a0a', '--ds-surface': '#111111', '--ds-accent': 'var(--vep-accent)', '--ds-extra': '#FFD700', '--ds-text': '#ffffff', '--ds-muted': 'rgba(255,255,255,0.4)' },
      displayFont: 'Bebas Neue',
      bodyFont: 'Inter',
      desc: 'Display + Sans · Impact maximal',
    },
    {
      name: 'Luxe Serif',
      preview: ['#0f0c0c', '#c8a96e', '#f5f0ea'],
      vars: { '--ds-bg': '#0f0c0c', '--ds-surface': '#1a1410', '--ds-accent': '#c8a96e', '--ds-extra': '#e63946', '--ds-text': '#f5f0ea', '--ds-muted': 'rgba(245,240,234,0.45)' },
      displayFont: 'Cormorant Garamond',
      bodyFont: 'Lato',
      desc: 'Serif + Sans · Haut de gamme',
    },
    {
      name: 'Neo Futur',
      preview: ['#050510', '#00f5d4', '#e0e0ff'],
      vars: { '--ds-bg': '#050510', '--ds-surface': '#0d0d1f', '--ds-accent': '#00f5d4', '--ds-text': '#e0e0ff', '--ds-muted': 'rgba(224,224,255,0.4)' },
      displayFont: 'Rajdhani',
      bodyFont: 'Space Grotesk',
      desc: 'Display + Grotesk · Futuriste',
    },
    {
      name: 'Editorial',
      preview: ['#f8f5f0', '#1a1a2e', '#e63946'],
      vars: { '--ds-bg': '#f8f5f0', '--ds-surface': '#eeeae3', '--ds-accent': '#e63946', '--ds-text': '#1a1a2e', '--ds-muted': 'rgba(26,26,46,0.45)' },
      displayFont: 'Playfair Display',
      bodyFont: 'Source Sans 3',
      desc: 'Serif + Classic · Mode / Édito',
    },
    {
      name: 'Minimal Mono',
      preview: ['#ffffff', '#000000', '#6d6d6d'],
      vars: { '--ds-bg': '#ffffff', '--ds-surface': '#f0f0f0', '--ds-accent': '#000000', '--ds-text': '#111111', '--ds-muted': 'rgba(0,0,0,0.4)' },
      displayFont: 'JetBrains Mono',
      bodyFont: 'Manrope',
      desc: 'Mono + Grotesk · Tech / Dev',
    },
    {
      name: 'Neon Punk',
      preview: ['#0d0014', '#ff2d78', '#ffe600'],
      vars: { '--ds-bg': '#0d0014', '--ds-surface': '#16001f', '--ds-accent': '#ff2d78', '--ds-text': '#ffe600', '--ds-muted': 'rgba(255,230,0,0.4)' },
      displayFont: 'Unbounded',
      bodyFont: 'Urbanist',
      desc: 'Display + Urbanist · Punk vivid',
    },
    {
      name: 'Earth Organic',
      preview: ['#1c1510', '#7cb98e', '#f4e9d5'],
      vars: { '--ds-bg': '#1c1510', '--ds-surface': '#251d16', '--ds-accent': '#7cb98e', '--ds-text': '#f4e9d5', '--ds-muted': 'rgba(244,233,213,0.45)' },
      displayFont: 'Fraunces',
      bodyFont: 'Karla',
      desc: 'Serif + Humanist · Nature',
    },
    {
      name: 'Glass Dark',
      preview: ['#0a0f1e', '#4d9fff', 'rgba(255,255,255,0.85)'],
      vars: { '--ds-bg': '#0a0f1e', '--ds-surface': 'rgba(255,255,255,0.06)', '--ds-accent': '#4d9fff', '--ds-text': 'rgba(255,255,255,0.9)', '--ds-muted': 'rgba(255,255,255,0.35)' },
      displayFont: 'Syne',
      bodyFont: 'DM Sans',
      desc: 'Syne + DM Sans · Glassmorphism',
    },
  ];

  /* ── Build the Design System HTML ── */
  function buildDesignSystemPanel() {
    const container = document.createElement('div');
    container.id = 'vep-promod';
    container.innerHTML = `
      <div id="vep-promod-header">
        <span>🎭 Pro Dashboard</span>
        <button id="vep-promod-close">✕</button>
      </div>
      <div id="vep-promod-body" data-lenis-prevent="true" style="overscroll-behavior:contain">
        
        <!-- COLUMN 1 : DESIGN SYSTEMS -->
        <div class="vpm-col">
          <div class="vpm-section" style="flex:1">
            <div class="vpm-label">Design System Presets</div>
            <div class="vpm-hint">Palette + assemblage typographique en un clic</div>
            <div id="vpm-ds-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>
          </div>
          
          <div class="vpm-sep"></div>

          <!-- Custom Design System -->
          <div class="vpm-section">
            <div class="vpm-label">🎨 Custom Design System Builder</div>
            <div class="vpm-hint">Créez votre propre palette & typographie instantanément.</div>
            <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px">
              
              <div style="display:flex;gap:12px;margin-bottom:12px">
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Background</div>
                  <input type="color" id="vpm-custom-bg" value="#0a0a0a" class="vpm-scolor" style="width:100%;height:32px;border-radius:6px;cursor:pointer">
                </div>
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Accent</div>
                  <input type="color" id="vpm-custom-accent" value="#FF4D00" class="vpm-scolor" style="width:100%;height:32px;border-radius:6px;cursor:pointer">
                </div>
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Extra 🌟</div>
                  <input type="color" id="vpm-custom-extra" value="#00f5d4" class="vpm-scolor" style="width:100%;height:32px;border-radius:6px;cursor:pointer">
                </div>
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Text</div>
                  <input type="color" id="vpm-custom-text" value="#ffffff" class="vpm-scolor" style="width:100%;height:32px;border-radius:6px;cursor:pointer">
                </div>
              </div>

              <div style="display:flex;gap:12px;margin-bottom:12px">
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Display Font (H1-H4)</div>
                  <input type="text" id="vpm-custom-dfont" value="Inter" class="vpm-input" style="width:100%" placeholder="ex: Bebas Neue">
                </div>
                <div style="flex:1">
                  <div style="font-size:9px;color:rgba(255,255,255,.4);margin-bottom:4px">Body Font (p, span)</div>
                  <input type="text" id="vpm-custom-bfont" value="Inter" class="vpm-input" style="width:100%" placeholder="ex: Roboto">
                </div>
              </div>
              
              <button class="vpm-btn-big" id="vpm-custom-apply">🚀 Apply Custom System</button>
            </div>
          </div>
        </div>

        <!-- COLUMN 2 : TOOLS -->
        <div class="vpm-col">
          <!-- Copy / Paste Style -->
          <div class="vpm-section">
            <div class="vpm-label">📋 Copy / Paste Style</div>
            <div style="display:flex;gap:8px">
              <button class="vpm-btn" id="vpm-copy-style" style="flex:1">⎘ Copy</button>
              <button class="vpm-btn" id="vpm-paste-style" style="flex:1">⎗ Paste</button>
            </div>
            <div id="vpm-copy-info" style="font-size:9px;color:rgba(255,255,255,.3);margin-top:6px;text-align:center">Nothing copied yet</div>
          </div>

          <div class="vpm-sep"></div>

          <!-- DOM Tools -->
          <div class="vpm-section">
            <div class="vpm-label">🔧 DOM Tools & Highlights</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <button class="vpm-btn" id="vpm-move-up">↑ Move Up</button>
              <button class="vpm-btn" id="vpm-move-down">↓ Move Down</button>
              <button class="vpm-btn" id="vpm-wrap">⬡ Wrap in Div</button>
              <button class="vpm-btn" id="vpm-set-extra" style="color:var(--ds-extra, #00f5d4);border-color:var(--ds-extra, #00f5d4)">✨ Set Extra Color</button>
              <button class="vpm-btn" id="vpm-dup-el">⎘ Duplicate</button>
              <button class="vpm-btn vpm-danger" id="vpm-del-el">🗑 Delete</button>
            </div>
          </div>

          <div class="vpm-sep"></div>

          <!-- Glassmorphism Builder -->
          <div class="vpm-section">
            <div class="vpm-label">🪟 Glass Builder</div>
            <div style="display:flex;gap:12px">
              <div style="flex:1">
                <div class="vpm-row"><span class="vpm-rl">Blur</span><input type="range" id="vpm-glass-blur" min="0" max="40" value="12" class="vpm-sl"><span id="vpm-glass-blur-v" class="vpm-sv">12px</span></div>
                <div class="vpm-row"><span class="vpm-rl">Opacity</span><input type="range" id="vpm-glass-op" min="0" max="30" value="8" class="vpm-sl"><span id="vpm-glass-op-v" class="vpm-sv">8%</span></div>
                <div class="vpm-row"><span class="vpm-rl">Border</span><input type="range" id="vpm-glass-border" min="0" max="100" value="15" class="vpm-sl"><span id="vpm-glass-border-v" class="vpm-sv">15%</span></div>
                <div class="vpm-row"><span class="vpm-rl">Radius</span><input type="range" id="vpm-glass-br" min="0" max="60" value="16" class="vpm-sl"><span id="vpm-glass-br-v" class="vpm-sv">16px</span></div>
              </div>
              <div style="flex:1;display:flex;flex-direction:column;gap:8px">
                <div id="vpm-glass-preview" style="flex:1;border-radius:16px;background:rgba(255,255,255,.08);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);transition:all .2s"></div>
                <button class="vpm-btn" id="vpm-glass-apply">Apply Glass</button>
              </div>
            </div>
          </div>
        
          <div class="vpm-sep"></div>

          <!-- CSS Variables Live -->
          <div class="vpm-section">
            <div class="vpm-label">⚡ CSS Variables Live</div>
            <div id="vpm-css-vars-list" style="max-height:100px;overflow-y:auto;padding-right:4px"></div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <input class="vpm-input" type="text" id="vpm-var-name" placeholder="--var" style="width:80px">
              <input class="vpm-input" type="text" id="vpm-var-val" placeholder="var(--vep-accent)" style="flex:1">
              <button class="vpm-btn" id="vpm-add-var" style="white-space:nowrap">+ Add</button>
            </div>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(container);
    bindProPanel();
    renderDSSystems();
    renderShadowList();
    renderCSSVars();
  }

  /* Expose globally so the right panel "Pro" tab can call it */
  /* Expose globally so the right panel "Pro" tab can call it */
  window.buildDesignSystemPanelPro = function() {
    let panel = document.getElementById('vep-promod');
    if (!panel) {
      buildDesignSystemPanel();
      panel = document.getElementById('vep-promod');
    }
    const G = window.VEP;
    if (panel) {
      const isOpening = !panel.classList.contains('show');
      if (isOpening) {
        // Auto-collapse sidebars
        const rightPanel = document.getElementById('vep-right');
        const leftPanel = document.getElementById('vep-left');
        if (rightPanel && !rightPanel.classList.contains('collapsed')) {
           window._vepRightWasOpen = true;
           if (typeof G.collapseRight === 'function') G.collapseRight();
        } else { window._vepRightWasOpen = false; }
        
        if (leftPanel && !leftPanel.classList.contains('collapsed')) {
           window._vepLeftWasOpen = true;
           if (typeof G.collapseLeft === 'function') G.collapseLeft();
        } else { window._vepLeftWasOpen = false; }
        
        panel.classList.add('show');
      } else {
        // Restore sidebars on close
        panel.classList.remove('show');
        if (window._vepRightWasOpen && typeof G.collapseRight === 'function') {
           const rp = document.getElementById('vep-right');
           if (rp && rp.classList.contains('collapsed')) G.collapseRight();
        }
        if (window._vepLeftWasOpen && typeof G.collapseLeft === 'function') {
           const lp = document.getElementById('vep-left');
           if (lp && lp.classList.contains('collapsed')) G.collapseLeft();
        }
      }
    }
  };

  window.runAutoTypoEngine = function() {
      // Disabled: the User wants full control over manual highlights using Selection.
      // The "Smart Extra" button in the DOM Tools is retained for opt-in usage.
  };

  /* Helper pour appliquer un thème global (Site + Editeur) */
  function applyGlobalStyle(bg, accent, extra, text, dfont, bfont) {
    const root = document.documentElement;
    // Set Editor Variables
    root.style.setProperty('--ds-bg', bg);
    root.style.setProperty('--ds-accent', accent);
    root.style.setProperty('--ds-extra', extra || accent);
    root.style.setProperty('--ds-text', text);
    root.style.setProperty('--vep-accent', accent);

    // Convert hex to rgb for internal editor usage
    let r=255, g=77, b=0;
    if (accent.startsWith('#')) {
      const hex = accent.replace('#','');
      if (hex.length === 6) { r=parseInt(hex.slice(0,2),16); g=parseInt(hex.slice(2,4),16); b=parseInt(hex.slice(4,6),16); }
    } else if (accent.startsWith('rgb')) {
      const m = accent.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) { r=m[1]; g=m[2]; b=m[3]; }
    }
    root.style.setProperty('--vep-accent-rgb', `${r}, ${g}, ${b}`);

    // Set page base background
    document.body.style.backgroundColor = bg;
    document.body.style.color = text;

    if (dfont) loadFont(dfont);
    if (bfont) loadFont(bfont);

    // Inject strong stylesheet for the website
    let styleEl = document.getElementById('vep-ds-style');
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'vep-ds-style'; document.head.appendChild(styleEl); }
    styleEl.textContent = `
      h1, h2, h3, h4, h5, h6, strong, b { font-family: '${dfont || 'inherit'}', serif; color: var(--ds-text); }
      body, p, span, li { font-family: '${bfont || 'inherit'}', sans-serif; color: var(--ds-text); }
      
      /* Target links and buttons dynamically */
      a, button, .btn, .button { background-color: var(--ds-accent); color: var(--ds-bg); border-color: var(--ds-accent); }
      
      /* EXTRA COLOR highlights for words/spans */
      mark, .ds-extra, .text-extra, em, .text-\\[\\#FF4D00\\] { color: var(--ds-extra, #FF4D00); background: transparent; }
      .vep-item { 
        display: inline-block; 
        cursor: pointer; 
        transition: all 0.2s; 
        border-radius: 4px;
        padding: 0 2px;
      }
      .vep-selected .vep-item {
        outline: 1px dotted rgba(255,255,255,0.25);
        margin: 0 1px;
      }
      .vep-item:hover { 
        background: rgba(var(--vep-accent-rgb), 0.2); 
        outline: 1.5px solid var(--vep-accent) !important;
        box-shadow: 0 0 10px rgba(var(--vep-accent-rgb), 0.3);
        transform: translateY(-1px);
      }

      /* Editor elements should not be overridden by the above generic button rule */
       #vep-left button, #vep-right button, #vep-handles button, #vep-sel-bar button, #vep-promod button {
          background-color: transparent !important;
          color: inherit !important;
       }
       .vpm-btn { background-color: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.6) !important; border-color: rgba(255,255,255,0.08) !important; }
       .vpm-btn:hover { background-color: rgba(var(--vep-accent-rgb), 0.2) !important; color: #fff !important; border-color: rgba(var(--vep-accent-rgb), 0.4) !important; }
       .vpm-btn-big { background-color: rgba(var(--vep-accent-rgb), 0.08) !important; color: var(--vep-accent) !important; border-color: rgba(var(--vep-accent-rgb), 0.3) !important; }
       .vpm-btn-big:hover { background-color: var(--vep-accent) !important; color: #fff !important; }

      :root { --vep-accent: ${accent}; }
    `;
    
    // Call the Auto-Typo Engine
    window.runAutoTypoEngine();

    flashBadge('Design System Applied ✓');
  }

  /* ═══════════════════════════════════════════════════════
     RENDER DESIGN SYSTEMS GRID
  ═══════════════════════════════════════════════════════ */
  function renderDSSystems() {
    const grid = document.getElementById('vpm-ds-grid');
    if (!grid) return;
    grid.innerHTML = DESIGN_SYSTEMS.map((ds, i) => `
      <div class="vpm-ds-card" data-ds="${i}">
        <div class="vpm-ds-swatches">
          ${ds.preview.map(c => `<div style="background:${c}"></div>`).join('')}
        </div>
        <div class="vpm-ds-info">
          <div class="vpm-ds-name">${ds.name}</div>
          <div class="vpm-ds-fonts">${ds.displayFont} / ${ds.bodyFont}</div>
          <div class="vpm-ds-desc">${ds.desc}</div>
        </div>
        <button class="vpm-ds-apply" data-ds="${i}">Apply</button>
      </div>
    `).join('');

    grid.querySelectorAll('.vpm-ds-apply').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        applyDesignSystem(parseInt(btn.dataset.ds));
      });
    });
  }

  function applyDesignSystem(idx) {
    const ds = DESIGN_SYSTEMS[idx];
    if (!ds) return;
    
    // Fallback to accent if extra is not defined in preset
    const extraInfo = ds.vars['--ds-extra'] || ds.vars['--ds-accent'];
    applyGlobalStyle(ds.vars['--ds-bg'], ds.vars['--ds-accent'], extraInfo, ds.vars['--ds-text'], ds.displayFont, ds.bodyFont);

    // Mark active card
    document.querySelectorAll('.vpm-ds-card').forEach((c, i) => c.classList.toggle('active', i === idx));
  }

  /* ═══════════════════════════════════════════════════════
     SHADOW STACKER
  ═══════════════════════════════════════════════════════ */
  let _shadows = [];

  const SHADOW_PRESETS = {
    soft:  ({ hex }) => `0 8px 32px 0 ${hex}33`,
    hard:  ({ hex }) => `4px 4px 0px 0px ${hex}`,
    glow:  ({ hex, accent }) => `0 0 24px 4px ${accent || 'var(--vep-accent)'}88`,
    inner: ({ hex }) => `inset 0 2px 12px 0 ${hex}44`,
  };

  function addShadow(type) {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--ds-accent').trim() || 'var(--vep-accent)';
    _shadows.push({ type, color: '#000000', opacity: 50, accent });
    renderShadowList();
  }

  function renderShadowList() {
    const list = document.getElementById('vpm-shadow-list');
    if (!list) return;
    if (!_shadows.length) { list.innerHTML = '<div style="font-size:9px;color:rgba(255,255,255,.25);text-align:center;padding:8px">No shadows — add one below</div>'; return; }
    list.innerHTML = _shadows.map((s, i) => `
      <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <div style="width:20px;height:20px;border-radius:4px;background:${s.color};border:1px solid rgba(255,255,255,.15);flex-shrink:0"></div>
        <span style="font-size:9px;color:rgba(255,255,255,.6);flex:1;font-weight:700;text-transform:uppercase">${s.type}</span>
        <input type="color" value="${s.color}" data-si="${i}" class="vpm-scolor" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px">
        <button data-si="${i}" class="vpm-sdel" style="background:rgba(255,60,60,.15);border:none;color:rgba(255,120,120,.8);border-radius:4px;padding:2px 6px;cursor:pointer;font-size:10px">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.vpm-scolor').forEach(inp => {
      inp.addEventListener('input', function() { _shadows[this.dataset.si].color = this.value; });
    });
    list.querySelectorAll('.vpm-sdel').forEach(btn => {
      btn.addEventListener('click', function() { _shadows.splice(+this.dataset.si, 1); renderShadowList(); });
    });
  }

  function applyShadows() {
    const G = window.VEP;
    if (!G.selectedEl) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--ds-accent').trim() || 'var(--vep-accent)';
    const str = _shadows.map(s => {
      const fn = SHADOW_PRESETS[s.type];
      return fn ? fn({ hex: s.color, accent }) : '';
    }).filter(Boolean).join(', ');
    G.applyStyle('boxShadow', str || 'none');
  }

  /* ═══════════════════════════════════════════════════════
     CSS VARIABLES LIVE EDITOR
  ═══════════════════════════════════════════════════════ */
  let _cssVars = {};

  function renderCSSVars() {
    const list = document.getElementById('vpm-css-vars-list');
    if (!list) return;

    // Auto-detect existing vars from :root
    const rootStyle = getComputedStyle(document.documentElement);
    const knownVars = ['--ds-bg','--ds-surface','--ds-accent','--ds-text','--ds-muted','--vep-accent'];
    knownVars.forEach(k => {
      const val = rootStyle.getPropertyValue(k).trim();
      if (val && !_cssVars[k]) _cssVars[k] = val;
    });

    if (!Object.keys(_cssVars).length) {
      list.innerHTML = '<div style="font-size:9px;color:rgba(255,255,255,.25);padding:6px">No variables yet. Add below or apply a Design System first.</div>';
      return;
    }

    list.innerHTML = Object.entries(_cssVars).map(([k, val]) => {
      const isColor = /^#|^rgb|^hsl/.test(val.trim());
      return `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:9px;color:var(--vep-accent);font-family:monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${k}</span>
        ${isColor
          ? `<input type="color" value="${toHex(val)}" data-cvar="${k}" class="vpm-cvar-color" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px">`
          : `<input type="text" value="${val}" data-cvar="${k}" class="vpm-cvar-text" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#fff;font-size:9px;border-radius:4px;padding:2px 6px;width:80px">`
        }
        <button data-cvar="${k}" class="vpm-cvardel" style="background:none;border:none;color:rgba(255,80,80,.6);cursor:pointer;font-size:11px">✕</button>
      </div>`;
    }).join('');

    list.querySelectorAll('.vpm-cvar-color').forEach(inp => {
      inp.addEventListener('input', function() {
        _cssVars[this.dataset.cvar] = this.value;
        document.documentElement.style.setProperty(this.dataset.cvar, this.value);
      });
    });
    list.querySelectorAll('.vpm-cvar-text').forEach(inp => {
      inp.addEventListener('input', function() {
        _cssVars[this.dataset.cvar] = this.value;
        document.documentElement.style.setProperty(this.dataset.cvar, this.value);
      });
    });
    list.querySelectorAll('.vpm-cvardel').forEach(btn => {
      btn.addEventListener('click', function() {
        delete _cssVars[this.dataset.cvar];
        document.documentElement.style.removeProperty(this.dataset.cvar);
        renderCSSVars();
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     BIND EVENTS
  ═══════════════════════════════════════════════════════ */
  let _copiedStyle = null;

  function bindProPanel() {
    const G = window.VEP;

    document.getElementById('vep-promod-close').addEventListener('click', () => {
      if (typeof window.buildDesignSystemPanelPro === 'function') {
        window.buildDesignSystemPanelPro(); // toggle it off and restore sidebars
      }
    });

    /* Custom Design System apply */
    const applyCustomBtn = document.getElementById('vpm-custom-apply');
    if (applyCustomBtn) {
      applyCustomBtn.addEventListener('click', () => {
        const bg = document.getElementById('vpm-custom-bg').value;
        const accent = document.getElementById('vpm-custom-accent').value;
        const extra = document.getElementById('vpm-custom-extra').value;
        const text = document.getElementById('vpm-custom-text').value;
        const dfont = document.getElementById('vpm-custom-dfont').value.trim();
        const bfont = document.getElementById('vpm-custom-bfont').value.trim();

        // Remove active class from presets
        document.querySelectorAll('.vpm-ds-card').forEach(c => c.classList.remove('active'));

        applyGlobalStyle(bg, accent, extra, text, dfont, bfont);
      });
    }

    /* Glass builder live preview */
    ['vpm-glass-blur','vpm-glass-op','vpm-glass-border','vpm-glass-br'].forEach(id => {
      document.getElementById(id).addEventListener('input', function() {
        const units = { 'vpm-glass-blur': 'px', 'vpm-glass-op': '%', 'vpm-glass-border': '%', 'vpm-glass-br': 'px' };
        document.getElementById(id + '-v').textContent = this.value + units[id];
        updateGlassPreview();
      });
    });

    function updateGlassPreview() {
      const blur   = document.getElementById('vpm-glass-blur').value;
      const op     = document.getElementById('vpm-glass-op').value;
      const border = document.getElementById('vpm-glass-border').value;
      const br     = document.getElementById('vpm-glass-br').value;
      const p = document.getElementById('vpm-glass-preview');
      if (p) {
        p.style.backdropFilter = `blur(${blur}px)`;
        p.style.background = `rgba(255,255,255,${op/100})`;
        p.style.border = `1px solid rgba(255,255,255,${border/100})`;
        p.style.borderRadius = `${br}px`;
      }
    }

    document.getElementById('vpm-glass-apply').addEventListener('click', () => {
      if (!G.selectedEl) return;
      const blur   = document.getElementById('vpm-glass-blur').value;
      const op     = document.getElementById('vpm-glass-op').value;
      const border = document.getElementById('vpm-glass-border').value;
      const br     = document.getElementById('vpm-glass-br').value;
      G.applyStyle('backdropFilter', `blur(${blur}px)`);
      G.applyStyle('background', `rgba(255,255,255,${op/100})`);
      G.applyStyle('border', `1px solid rgba(255,255,255,${border/100})`);
      G.applyStyle('borderRadius', `${br}px`);
      flashBadge('Glass applied ✓');
    });

    /* Shadow stacker */
    document.getElementById('vpm-add-shadow-soft').addEventListener('click',  () => addShadow('soft'));
    document.getElementById('vpm-add-shadow-hard').addEventListener('click',  () => addShadow('hard'));
    document.getElementById('vpm-add-shadow-glow').addEventListener('click',  () => addShadow('glow'));
    document.getElementById('vpm-add-shadow-inner').addEventListener('click', () => addShadow('inner'));
    document.getElementById('vpm-apply-shadows').addEventListener('click',    applyShadows);
    document.getElementById('vpm-clear-shadows').addEventListener('click',    () => {
      _shadows = [];
      renderShadowList();
      if (G.selectedEl) G.applyStyle('boxShadow', 'none');
    });

    /* Copy / Paste style */
    document.getElementById('vpm-copy-style').addEventListener('click', () => {
      if (!G.selectedEl) return;
      _copiedStyle = G.selectedEl.getAttribute('style') || '';
      document.getElementById('vpm-copy-info').textContent = `Copied: <${G.selectedEl.tagName.toLowerCase()}>`;
    });
    document.getElementById('vpm-paste-style').addEventListener('click', () => {
      if (!G.selectedEl || !_copiedStyle) return;
      G.selectedEl.setAttribute('style', (G.selectedEl.getAttribute('style') || '') + ';' + _copiedStyle);
      G.log(G.selectedEl, 'style', 'pasted');
      flashBadge('Style pasted ✓');
    });

    /* DOM tools */
    document.getElementById('vpm-move-up').addEventListener('click', () => {
      const el = G.selectedEl; if (!el) return;
      const prev = el.previousElementSibling;
      if (prev) { el.parentNode.insertBefore(el, prev); G.log(el, 'order', 'moved up'); }
    });
    document.getElementById('vpm-move-down').addEventListener('click', () => {
      const el = G.selectedEl; if (!el) return;
      const next = el.nextElementSibling;
      if (next) { el.parentNode.insertBefore(next, el); G.log(el, 'order', 'moved down'); }
    });
    document.getElementById('vpm-wrap').addEventListener('click', () => {
      const el = G.selectedEl; if (!el) return;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:contents';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      G.selectElement(wrapper);
      flashBadge('Wrapped in div ✓');
    });
    document.getElementById('vpm-set-extra').addEventListener('click', () => {
      const el = G.selectedEl; 
      if (!el) return;
      
      const align = window.getComputedStyle(el).textAlign;
      if (align === 'center') {
        flashBadge('⚠️ Ignored: Text is center aligned.', true);
        return;
      }

      // Check if it has a manual line break or spans multiple lines.
      // We rely on <br> for absolute precision on user intent, 
      // or we check if there are nested blocks.
      const html = el.innerHTML;
      
      // Clean up previous span
      let cleanHtml = html.replace(/<span class="ds-extra"[^>]*>(.*?)<\/span>/gi, '$1');
      // remove leftover class if the parent itself had it
      el.classList.remove('ds-extra');
      el.style.color = '';

      if (cleanHtml.includes('<br>')) {
        // Multi-line via <br>
        const parts = cleanHtml.split(/<br\s*\/?>/i);
        let lastPart = parts.pop();
        
        // Find the very last word (ignoring trailing spaces)
        // Wraps the last continuous block of non-whitespace characters
        lastPart = lastPart.replace(/([^\s>]+)(\s*)$/, '<span class="ds-extra">$1</span>$2');
        
        parts.push(lastPart);
        el.innerHTML = parts.join('<br>');
        flashBadge('✨ Smart Extra (Multi-line) Applied');
        
      } else {
        // Single line -> restore normal color
        el.innerHTML = cleanHtml;
        flashBadge('✨ Restored (Single line) ✓');
      }
    });
    document.getElementById('vpm-dup-el').addEventListener('click', () => {
      const el = G.selectedEl; if (!el) return;
      const clone = el.cloneNode(true);
      el.insertAdjacentElement('afterend', clone);
      G.selectElement(clone);
    });
    document.getElementById('vpm-del-el').addEventListener('click', () => {
      const el = G.selectedEl;
      if (!el || !confirm('Delete this element?')) return;
      el.remove(); G.selectedEl = null;
    });

    /* CSS Vars */
    document.getElementById('vpm-add-var').addEventListener('click', () => {
      const name = document.getElementById('vpm-var-name').value.trim();
      const val  = document.getElementById('vpm-var-val').value.trim();
      if (!name || !val) return;
      _cssVars[name] = val;
      document.documentElement.style.setProperty(name, val);
      document.getElementById('vpm-var-name').value = '';
      document.getElementById('vpm-var-val').value  = '';
      renderCSSVars();
    });

    /* Keyboard: Ctrl+D = Duplicate, Ctrl+Shift+G = Wrap */
    document.addEventListener('keydown', e => {
      if (!window.VEP?.editActive) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const el = G.selectedEl; if (!el) return;
        const clone = el.cloneNode(true);
        el.insertAdjacentElement('afterend', clone);
        G.selectElement(clone);
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     FLOATING TRIGGER BUTTON
  ═══════════════════════════════════════════════════════ */
  function buildTrigger() {
    if (document.getElementById('vep-pro-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'vep-pro-trigger';
    btn.title = 'Design Systems & Pro Tools';
    btn.innerHTML = '🎭';
    btn.addEventListener('click', () => {
      const panel = document.getElementById('vep-promod');
      if (!panel) { buildDesignSystemPanel(); document.getElementById('vep-promod').classList.add('show'); }
      else panel.classList.toggle('show');
    });
    document.body.appendChild(btn);
  }

  /* ═══════════════════════════════════════════════════════
     CSS INJECTION
  ═══════════════════════════════════════════════════════ */
  function injectProStyles() {
    if (document.getElementById('vep-pro-styles')) return;
    const s = document.createElement('style');
    s.id = 'vep-pro-styles';
    s.textContent = `
      /* ── Pro Trigger ── */
      #vep-pro-trigger {
        position:fixed; bottom:24px; right:310px; z-index:2147483620;
        width:44px; height:44px; border-radius:14px;
        background:rgba(6,6,6,.96); border:1px solid rgba(255,255,255,.1);
        font-size:20px; cursor:pointer; display:none;
        align-items:center; justify-content:center;
        box-shadow:0 8px 32px rgba(0,0,0,.8);
        transition:all .25s; backdrop-filter:blur(12px);
      }
      #vep-pro-trigger.show { display:flex; }
      #vep-pro-trigger:hover { background:rgba(var(--vep-accent-rgb),.2); border-color:rgba(var(--vep-accent-rgb),.5); transform:scale(1.08); }

      /* ── Pro Panel ── */
      #vep-promod {
        position:fixed; top:50%; left:50%; width:85vw; max-width:900px;
        transform:translate(-50%, -50%) scale(0.95); opacity:0; pointer-events:none;
        height:85vh; max-height:800px;
        z-index:2147483605; background:rgba(20,20,20,.65);
        border:1px solid rgba(255,255,255,.12);
        border-radius: 24px;
        display:flex; flex-direction:column;
        font-family:'Inter',system-ui,sans-serif;
        transition:all .4s cubic-bezier(.175,.885,.32,1.275);
        backdrop-filter:blur(32px); -webkit-backdrop-filter:blur(32px);
        box-shadow:0 30px 80px rgba(0,0,0,.9), inset 0 0 0 1px rgba(255,255,255,0.05);
      }
      #vep-promod.show { transform:translate(-50%, -50%) scale(1); opacity:1; pointer-events:auto; }

      #vep-promod-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:18px 24px 16px; border-bottom:1px solid rgba(255,255,255,.07);
        font-size:12px; font-weight:800; letter-spacing:.12em;
        color:var(--vep-accent); text-transform:uppercase; flex-shrink:0;
        background:transparent;
      }
      #vep-promod-close {
        background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
        color:rgba(255,255,255,.4); border-radius:8px; width:28px; height:28px;
        cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;
        transition:all .2s;
      }
      #vep-promod-close:hover { background:rgba(255,60,60,.2); color:#fff; transform:scale(1.1); }

      #vep-promod-body {
        flex:1; overflow-y:auto; padding:24px;
        display:grid; grid-template-columns:1fr 1fr; gap:32px;
        scrollbar-width:thin; scrollbar-color:rgba(var(--vep-accent-rgb),.3) transparent;
      }
      
      .vpm-col { display:flex; flex-direction:column; gap:12px; }

      .vpm-section { margin-bottom:4px; display:flex; flex-direction:column; }
      .vpm-sep { border-top:1px solid rgba(255,255,255,.05); margin:8px 0; }
      .vpm-label { font-size:10px; font-weight:800; letter-spacing:.1em; color:rgba(255,255,255,.4); text-transform:uppercase; margin-bottom:4px; }
      .vpm-hint  { font-size:10px; color:rgba(255,255,255,.25); margin-bottom:12px; }

      /* Buttons */
      .vpm-btn {
        padding:8px 12px; font-size:10px; font-weight:700; letter-spacing:.06em;
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
        border-radius:8px; color:rgba(255,255,255,.6); cursor:pointer;
        transition:all .18s; text-transform:uppercase; text-align:center;
      }
      .vpm-btn:hover { background:rgba(var(--vep-accent-rgb),.2); color:#fff; border-color:rgba(var(--vep-accent-rgb),.4); }
      .vpm-danger { border-color:rgba(255,60,60,.25) !important; color:rgba(255,100,100,.7) !important; }
      .vpm-danger:hover { background:rgba(255,60,60,.2) !important; color:#fff !important; }
      .vpm-btn-big {
        width:100%; padding:10px; font-size:10px; font-weight:700; letter-spacing:.07em;
        background:rgba(var(--vep-accent-rgb),.08); border:1px solid rgba(var(--vep-accent-rgb),.3);
        border-radius:10px; color:var(--vep-accent); cursor:pointer; text-transform:uppercase;
        transition:all .2s;
      }
      .vpm-btn-big:hover { background:var(--vep-accent); color:#fff; }

      /* Sliders */
      .vpm-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
      .vpm-rl   { font-size:9px; color:rgba(255,255,255,.35); min-width:44px; }
      .vpm-sl   { flex:1; -webkit-appearance:none; height:4px; border-radius:2px; background:rgba(255,255,255,.1); outline:none; border:none; padding:0; }
      .vpm-sl::-webkit-slider-thumb { -webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:var(--vep-accent); cursor:pointer; }
      .vpm-sv   { font-size:9px; font-weight:700; color:rgba(255,255,255,.4); min-width:32px; text-align:right; }
      .vpm-input { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:7px; color:#fff; padding:7px 10px; font-size:10px; outline:none; }
      .vpm-input:focus { border-color:rgba(var(--vep-accent-rgb),.5); }

      /* Design System Cards */
      #vpm-ds-grid { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
      .vpm-ds-card {
        background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
        border-radius:12px; padding:10px; display:flex; align-items:center; gap:10px;
        cursor:pointer; transition:all .2s;
      }
      .vpm-ds-card:hover { border-color:rgba(var(--vep-accent-rgb),.35); background:rgba(var(--vep-accent-rgb),.04); }
      .vpm-ds-card.active { border-color:rgba(var(--vep-accent-rgb),.6); background:rgba(var(--vep-accent-rgb),.06); }
      .vpm-ds-swatches {
        display:flex; flex-direction:column; gap:2px; flex-shrink:0;
      }
      .vpm-ds-swatches div { width:16px; height:12px; border-radius:3px; border:1px solid rgba(255,255,255,.1); }
      .vpm-ds-info { flex:1; }
      .vpm-ds-name  { font-size:11px; font-weight:800; color:#fff; }
      .vpm-ds-fonts { font-size:9px; color:var(--vep-accent); font-weight:700; margin-top:1px; letter-spacing:.04em; }
      .vpm-ds-desc  { font-size:8px; color:rgba(255,255,255,.3); margin-top:2px; }
      .vpm-ds-apply {
        padding:5px 10px; font-size:8px; font-weight:800; letter-spacing:.06em;
        background:rgba(var(--vep-accent-rgb),.12); border:1px solid rgba(var(--vep-accent-rgb),.3);
        border-radius:6px; color:var(--vep-accent); cursor:pointer; text-transform:uppercase;
        transition:all .18s; flex-shrink:0; white-space:nowrap;
      }
      .vpm-ds-apply:hover { background:var(--vep-accent); color:#fff; }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════════ */
  function loadFont(name) {
    const id = 'gf-' + name.replace(/\s/g,'-');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@100;300;400;700;900&display=swap`;
    document.head.appendChild(link);
  }

  function flashBadge(msg) {
    let b = document.getElementById('vep-badge');
    if (b) { const old = b.textContent; b.textContent = msg; setTimeout(() => { if(b) b.textContent = old; }, 2000); }
  }

  function toHex(str) {
    if (str.startsWith('#')) return str.slice(0,7);
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  }

  /* ── Init immediately ── */
  injectProStyles(); // inject CSS right away so trigger button is styleable
  buildTrigger();   // add button to DOM (hidden by default via CSS)

  // Poll every 300ms to show/hide the trigger based on editor state
  setInterval(() => {
    const active  = window.VEP && window.VEP.editActive;
    const trigger = document.getElementById('vep-pro-trigger');
    if (!trigger) return;
    if (active) {
      trigger.classList.add('show');
    } else {
      trigger.classList.remove('show');
      // Also close panel when editor deactivated
      const panel = document.getElementById('vep-promod');
      if (panel) panel.classList.remove('show');
    }
  }, 300);

})();

/**
 * ══════════════════════════════════════════════════════════
 *  DREAMYYSPACE EDITOR v3  |  editor-save.js
 *
 *  AUTO-SAVE SYSTEM
 *  Utilise la File System Access API (Chrome/Edge) pour
 *  écrire les changements directement dans index.html
 *  et style.css à chaque modification dans l'éditeur.
 *
 *  ► L'utilisateur autorise l'accès une seule fois.
 *  ► Ensuite, toute modification se sauvegarde en live.
 *  ► Fonctionne avec Chrome 86+, Edge 86+.
 * ══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────── */
  let htmlFileHandle = null;
  let cssFileHandle  = null;
  let autoSaveOn     = false;
  let pendingSave    = false;
  let saveTimer      = null;
  const DEBOUNCE_MS  = 1500; // Save 1.5s after last change

  /* ── UI Elements ───────────────────────────────────────── */
  function injectSaveStyles() {
    if (document.getElementById('vep-save-styles')) return;
    const s = document.createElement('style');
    s.id = 'vep-save-styles';
    s.textContent = `
      #vep-save-bar {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483648;
        background: rgba(6,6,6,0.97);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 100px;
        padding: 8px 20px;
        display: none;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .1em;
        color: rgba(255,255,255,0.6);
        box-shadow: 0 8px 30px rgba(0,0,0,0.7);
        backdrop-filter: blur(16px);
        white-space: nowrap;
        pointer-events: all;
      }
      #vep-save-bar.show { display: flex; }

      #vep-save-indicator {
        width: 8px; height: 8px; border-radius: 50%;
        background: rgba(255,255,255,0.2);
        transition: background 0.3s;
        flex-shrink: 0;
      }
      #vep-save-indicator.saving  { background: var(--vep-accent); animation: vep-pulse-save .6s infinite; }
      #vep-save-indicator.saved   { background: #00E676; }
      #vep-save-indicator.error   { background: #ff4444; }

      @keyframes vep-pulse-save {
        0%,100% { opacity: 1; } 50% { opacity: 0.3; }
      }

      #vep-save-label { min-width: 120px; }

      .vep-save-btn {
        padding: 4px 12px; font-size: 9px; font-weight: 700;
        border-radius: 100px; cursor: pointer; letter-spacing: .08em;
        text-transform: uppercase; transition: all .18s;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
      }
      .vep-save-btn:hover    { background: rgba(var(--vep-accent-rgb),0.3); color:#fff; border-color:var(--vep-accent); }
      .vep-save-btn.active   { background: rgba(0,230,118,0.15); color:#00E676; border-color:rgba(0,230,118,0.4); }
      .vep-save-btn.inactive { background: rgba(var(--vep-accent-rgb),0.12); color:var(--vep-accent); border-color:rgba(var(--vep-accent-rgb),0.4); }

      /* Save injection into export tab */
      #vep-autosave-section { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; margin-top: 8px; }
    `;
    document.head.appendChild(s);
  }

  /* ── Build save bar ────────────────────────────────────── */
  function buildSaveBar() {
    if (document.getElementById('vep-save-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'vep-save-bar';
    bar.innerHTML = `
      <div id="vep-save-indicator"></div>
      <span id="vep-save-label">Auto-Save OFF</span>
      <button class="vep-save-btn" id="vep-autosave-toggle">Enable Auto-Save</button>
      <button class="vep-save-btn" id="vep-manual-save" title="Save now (Ctrl+S)">💾 Save Now</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('vep-autosave-toggle').addEventListener('click', toggleAutoSave);
    document.getElementById('vep-manual-save').addEventListener('click', () => triggerSave(true));
  }

  /* ── Show / hide save bar ──────────────────────────────── */
  function showSaveBar() {
    buildSaveBar();
    document.getElementById('vep-save-bar').classList.add('show');
  }
  function hideSaveBar() {
    document.getElementById('vep-save-bar')?.classList.remove('show');
  }

  /* ── Toggle Auto-Save ──────────────────────────────────── */
  async function toggleAutoSave() {
    if (autoSaveOn) {
      autoSaveOn = false;
      htmlFileHandle = null;
      cssFileHandle  = null;
      updateSaveBarUI('off');
      return;
    }

    // Check browser support
    if (!('showSaveFilePicker' in window)) {
      showUnsupportedAlert();
      return;
    }

    // Ask user to grant access to index.html
    try {
      setSaveLabel('⏳ Choose your index.html…');
      htmlFileHandle = await window.showSaveFilePicker({
        suggestedName: 'index.html',
        startIn: 'desktop',
        types: [{ description: 'HTML File', accept: { 'text/html': ['.html'] } }],
      });

      // Optionally also get CSS file
      setSaveLabel('⏳ Now choose your style.css (optional)…');
      try {
        cssFileHandle = await window.showSaveFilePicker({
          suggestedName: 'style.css',
          startIn: 'desktop',
          types: [{ description: 'CSS File', accept: { 'text/css': ['.css'] } }],
        });
      } catch(e) {
        cssFileHandle = null; // CSS is optional
      }

      autoSaveOn = true;
      updateSaveBarUI('on');
      await triggerSave(true); // First save immediately

    } catch (e) {
      if (e.name !== 'AbortError') {
        setSaveLabel('⚠ Permission denied');
        setIndicator('error');
      } else {
        setSaveLabel('Auto-Save OFF');
        setIndicator('');
      }
    }
  }

  /* ── Trigger a Save ────────────────────────────────────── */
  async function triggerSave(immediate = false) {
    if (!htmlFileHandle) return;

    if (!immediate) {
      // Debounce — wait for DEBOUNCE_MS after last change
      clearTimeout(saveTimer);
      pendingSave = true;
      saveTimer = setTimeout(() => {
        if (pendingSave) performSave();
      }, DEBOUNCE_MS);
      return;
    }
    await performSave();
  }

  async function performSave() {
    pendingSave = false;
    if (!htmlFileHandle) return;

    setIndicator('saving');
    setSaveLabel('💾 Saving…');

    try {
      // Build clean HTML (strip internal editor UI from the saved copy)
      const cleanHTML = buildCleanHTML();

      // Write HTML file
      const htmlStream = await htmlFileHandle.createWritable();
      await htmlStream.write(cleanHTML);
      await htmlStream.close();

      // Write CSS file if we have it
      if (cssFileHandle) {
        const cssContent = buildExtractedCSS();
        if (cssContent) {
          const cssStream = await cssFileHandle.createWritable();
          await cssStream.write(cssContent);
          await cssStream.close();
        }
      }

      setIndicator('saved');
      setSaveLabel(`✅ Saved — ${timestamp()}`);
      setTimeout(() => {
        if (!pendingSave) {
          setIndicator('on');
          setSaveLabel(`Auto-Save ON · ${timestamp()}`);
        }
      }, 2000);

    } catch (err) {
      setIndicator('error');
      setSaveLabel(`⚠ Save failed: ${err.message}`);
      console.error('[VEP Save]', err);
    }
  }

  /* ── Build Clean HTML for saving ──────────────────────── */
  function buildCleanHTML() {
    // Clone the document
    const clone = document.documentElement.cloneNode(true);

    // Remove all editor UI elements from the saved copy
    const editorIds = [
      'vep-left','vep-right','vep-handles','vep-sel-bar','vep-badge',
      'vep-snap-grid','vep-resp-frame','vep-pin-overlay','vep-lock-panel',
      'vep-lock-select-banner','vep-multi-toolbar','vep-save-bar',
      'vep-core-styles','vep-lock-styles','vep-save-styles','vep-anim-kf',
      'vep-pin-box',
    ];
    editorIds.forEach(id => {
      const el = clone.querySelector(`#${id}`);
      if (el) el.remove();
    });

    // Remove editor script tags
    clone.querySelectorAll('script[src]').forEach(s => {
      if (s.src && (
        s.src.includes('editor.js') ||
        s.src.includes('editor-left.js') ||
        s.src.includes('editor-right.js') ||
        s.src.includes('editor-lock.js') ||
        s.src.includes('editor-save.js')
      )) {
        // Keep them! The user wants the editor to persist.
        // Comment out if you want a "clean" export without editor.
      }
    });

    // Remove editor CSS classes from elements
    clone.querySelectorAll('.vep-selected,.vep-hovered,.vep-inline-edit,.vep-sel-ring,.vep-hover-ring').forEach(el => {
      el.classList.remove('vep-selected','vep-hovered','vep-inline-edit','vep-sel-ring','vep-hover-ring');
    });

    // Remove editor outlines
    clone.querySelectorAll('[style]').forEach(el => {
      if (el.style.outline && el.style.outline.includes('FF4D00')) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  /* ── Extract Inline CSS Changes ────────────────────────── */
  function buildExtractedCSS() {
    const G = window.VEP;
    if (!G || !G.cssLog || !G.cssLog.length) return null;

    const lines = ['/* ─── DREAMYYSPACE EDITOR — Auto-saved CSS Changes ─────────────── */'];
    const grouped = {};
    G.cssLog.forEach(({ sel, prop, val }) => {
      if (!grouped[sel]) grouped[sel] = {};
      grouped[sel][prop] = val;
    });
    Object.entries(grouped).forEach(([sel, props]) => {
      lines.push(`\n${sel} {`);
      Object.entries(props).forEach(([p, v]) => {
        // Convert camelCase to kebab-case
        const kebab = p.replace(/([A-Z])/g, m => '-'+m.toLowerCase());
        lines.push(`  ${kebab}: ${v};`);
      });
      lines.push('}');
    });
    return lines.join('\n');
  }

  /* ── Keyboard shortcut Ctrl+S ──────────────────────────── */
  document.addEventListener('keydown', async (e) => {
    if (!window.VEP?.editActive) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (autoSaveOn) {
        await triggerSave(true);
      } else {
        // If auto-save is off, trigger the File System API export
        await exportOneShot();
      }
    }
  });

  /* ── One-shot export (Ctrl+S without auto-save) ───────── */
  async function exportOneShot() {
    if (!('showSaveFilePicker' in window)) { showUnsupportedAlert(); return; }
    try {
      const fh = await window.showSaveFilePicker({
        suggestedName: 'index.html',
        types: [{ description: 'HTML File', accept: { 'text/html': ['.html'] } }],
      });
      const writable = await fh.createWritable();
      await writable.write(buildCleanHTML());
      await writable.close();
      setSaveLabel(`✅ Exported — ${timestamp()}`);
      setIndicator('saved');
      setTimeout(() => { setSaveLabel('Auto-Save OFF'); setIndicator(''); }, 2500);
    } catch(e) { if (e.name !== 'AbortError') console.error('[VEP] Export failed', e); }
  }

  /* ── Hook into VEP log to trigger auto-save ───────────── */
  document.addEventListener('vep-change', () => {
    if (autoSaveOn) triggerSave(false);
  });

  // Monkey-patch VEP.log to also dispatch event & trigger save
  const _initLogHook = () => {
    if (!window.VEP) { setTimeout(_initLogHook, 300); return; }
    const origLog = window.VEP.log;
    window.VEP.log = function(...args) {
      if (origLog) origLog.apply(window.VEP, args);
      if (autoSaveOn) triggerSave(false);
      // Update export tab log
      if (typeof window.VEP_updateLog === 'function') window.VEP_updateLog();
    };
  };
  setTimeout(_initLogHook, 500);

  /* ── Inject Save section into Export tab ──────────────── */
  function injectSaveIntoExportTab() {
    function tryInject() {
      const exportTab = document.getElementById('vrtc-export');
      if (!exportTab) { setTimeout(tryInject, 600); return; }
      if (document.getElementById('vep-autosave-section')) return;

      const section = document.createElement('div');
      section.id = 'vep-autosave-section';
      section.innerHTML = `
        <span class="vl" style="display:block;margin-bottom:8px">💾 Auto-Save to File</span>
        <div class="vinfo" style="margin-bottom:10px;font-size:10px">
          Autorise l'éditeur à écrire directement dans votre <code style="color:var(--vep-accent)">index.html</code>.
          La permission est demandée une seule fois par session.<br><br>
          <b style="color:#fff">Ctrl+S</b> = Sauvegarder manuellement.
        </div>
        <button class="vbig" id="vep-autosave-export-toggle" style="margin-bottom:6px">
          🔴 Auto-Save Désactivé
        </button>
        <button class="vbig" id="vep-manual-save-btn" style="margin-bottom:6px">
          💾 Sauvegarder Maintenant (Ctrl+S)
        </button>
        <div id="vep-save-status-text" style="font-size:10px;color:rgba(255,255,255,.3);text-align:center;padding:6px 0"></div>
      `;
      exportTab.insertBefore(section, exportTab.firstChild);

      document.getElementById('vep-autosave-export-toggle').addEventListener('click', async () => {
        await toggleAutoSave();
        updateExportTabBtn();
      });
      document.getElementById('vep-manual-save-btn').addEventListener('click', async () => {
        if (autoSaveOn) { await triggerSave(true); }
        else { await exportOneShot(); }
      });
    }
    tryInject();
  }

  function updateExportTabBtn() {
    const btn = document.getElementById('vep-autosave-export-toggle');
    if (!btn) return;
    btn.textContent = autoSaveOn ? '🟢 Auto-Save Activé (Cliquer pour désactiver)' : '🔴 Auto-Save Désactivé';
    btn.style.borderColor = autoSaveOn ? 'rgba(0,230,118,0.4)' : '';
    btn.style.color        = autoSaveOn ? '#00E676' : '';
    btn.style.background   = autoSaveOn ? 'rgba(0,230,118,0.08)' : '';
    const status = document.getElementById('vep-save-status-text');
    if (status) status.textContent = autoSaveOn ? `Fichier: ${htmlFileHandle?.name || 'index.html'}` : '';
  }

  /* ── UI Helpers ────────────────────────────────────────── */
  function setIndicator(state) {
    const ind = document.getElementById('vep-save-indicator');
    if (!ind) return;
    ind.className = 'vep-save-indicator'; // reset
    if (state) ind.classList.add(state);
  }
  function setSaveLabel(text) {
    const lbl = document.getElementById('vep-save-label');
    if (lbl) lbl.textContent = text;
  }
  function updateSaveBarUI(state) {
    const btn = document.getElementById('vep-autosave-toggle');
    if (state === 'on') {
      setIndicator('saved');
      setSaveLabel('Auto-Save ON');
      if (btn) { btn.textContent='Disable Auto-Save'; btn.classList.add('active'); btn.classList.remove('inactive'); }
    } else {
      setIndicator('');
      setSaveLabel('Auto-Save OFF');
      if (btn) { btn.textContent='Enable Auto-Save'; btn.classList.remove('active'); btn.classList.add('inactive'); }
    }
    updateExportTabBtn();
  }
  function timestamp() {
    return new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }
  function showUnsupportedAlert() {
    setSaveLabel('⚠ Utilisez Chrome ou Edge pour l\'auto-save.');
    setIndicator('error');
    alert('❌ Votre navigateur ne supporte pas l\'API d\'écriture de fichiers.\n\nUtilisez Google Chrome 86+ ou Microsoft Edge 86+.\n\nPour Firefox : utilisez le bouton "Export HTML" à la place.');
  }

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    injectSaveStyles();
    // Show save bar when editor is active
    const origToggle = document.getElementById('editor-toggle-btn');
    if (origToggle) {
      const observer = new MutationObserver(() => {
        if (origToggle.classList.contains('editor-on')) { showSaveBar(); injectSaveIntoExportTab(); }
        else hideSaveBar();
      });
      observer.observe(origToggle, { attributes: true });
    }
    injectSaveIntoExportTab();
  }

  if (document.readyState !== 'loading') setTimeout(init, 800);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));

})();

/**
 * ══════════════════════════════════════════════════════════
 *  DREAMYYSPACE EDITOR v3  |  editor-lock.js
 *
 *  LOCK SYSTEM — Verrouille un élément pour qu'il garde
 *  exactement sa position et taille relatives à l'écran,
 *  quelle que soit la résolution ou la taille de fenêtre.
 *
 *  Technique : conversion en unités vw/vh + position fixed
 *  ou absolute en pourcentages → s'adapte proportionnellement
 *  à tout écran sans jamais se déplacer visuellement.
 * ══════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  const LOCKED_ATTR  = 'data-vep-locked';
  const LOCKED_STORE = 'data-vep-lock-store';

  /* ── Inject styles ─────────────────────────────────────── */
  function injectLockStyles() {
    if (document.getElementById('vep-lock-styles')) return;
    const s = document.createElement('style');
    s.id = 'vep-lock-styles';
    s.textContent = `
      /* Lock badge on locked elements */
      [data-vep-locked="true"]::after {
        content: '🔒';
        position: absolute;
        top: -10px;
        left: -10px;
        font-size: 12px;
        z-index: 99999;
        pointer-events: none;
        line-height: 1;
      }
      [data-vep-locked="true"] {
        position: relative;
        outline: 1px dashed rgba(255, 215, 0, 0.6) !important;
        outline-offset: 3px;
      }

      /* Lock toolbar button */
      #veph-lock {
        top: 50%;
        left: -13px;
        transform: translateY(-50%);
      }
      #veph-lock.locked { background: rgba(255,215,0,0.25) !important; border-color: gold !important; }

      /* Lock mode selection overlay */
      #vep-lock-select-banner {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 2147483645;
        background: rgba(255,215,0,0.1);
        border-bottom: 2px solid gold;
        padding: 8px 20px;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 700;
        color: gold;
        letter-spacing: .12em;
        text-transform: uppercase;
        display: none;
        align-items: center;
        justify-content: space-between;
        backdrop-filter: blur(8px);
      }
      #vep-lock-select-banner.show { display: flex; }
      #vep-lock-cancel {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 100px; color: #fff; padding: 4px 14px; font-size: 10px;
        font-weight:700; cursor: pointer; letter-spacing: .08em;
      }
      #vep-lock-panel {
        position: fixed; bottom: 50px; right: 320px;
        z-index: 2147483644;
        background: rgba(6,6,6,0.97);
        border: 1px solid rgba(255,215,0,0.3);
        border-radius: 16px; padding: 16px;
        width: 260px;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8);
        backdrop-filter: blur(16px);
        display: none;
      }
      #vep-lock-panel.show { display: block; }
      #vep-lock-panel h4 {
        font-size: 10px; font-weight: 800; letter-spacing: .15em;
        color: gold; text-transform: uppercase; margin: 0 0 12px;
      }
      .vep-locked-list { max-height: 180px; overflow-y: auto; scrollbar-width: thin; margin-bottom: 12px; }
      .vep-locked-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 8px; border-radius: 8px; margin-bottom: 4px;
        background: rgba(255,215,0,0.07); border: 1px solid rgba(255,215,0,0.15);
      }
      .vep-locked-item span { font-size: 10px; color: rgba(255,255,255,0.7); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .vep-locked-item button { background: none; border: none; color: rgba(255,100,100,0.7); cursor: pointer; font-size: 11px; }
      .vep-locked-item button:hover { color: #ff4444; }
    `;
    document.head.appendChild(s);
  }

  /* ── Locked element registry ───────────────────────────── */
  window.VEP = window.VEP || {};
  window.VEP.lockedElements = window.VEP.lockedElements || new Set();

  /* ══════════════════════════════════════════════════════════
     CORE LOCK FUNCTION
     Converts element to viewport-relative units so it scales
     proportionally on every screen size, in every layout.
  ══════════════════════════════════════════════════════════ */
  function lockElement(el) {
    if (!el || el.getAttribute(LOCKED_ATTR) === 'true') return;

    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const rect = el.getBoundingClientRect();

    // Compute proportional values (in %)
    const leftPct   = (rect.left   / vw * 100).toFixed(4);
    const topPct    = (rect.top    / vh * 100).toFixed(4);
    const widthPct  = (rect.width  / vw * 100).toFixed(4);
    const heightPct = (rect.height / vh * 100).toFixed(4);
    const zIndex    = getComputedStyle(el).zIndex || 'auto';

    // Store original styles for unlock
    const store = {
      position  : el.style.position,
      left      : el.style.left,
      top       : el.style.top,
      width     : el.style.width,
      height    : el.style.height,
      zIndex    : el.style.zIndex,
      transform : el.style.transform,
      margin    : el.style.margin,
    };
    el.setAttribute(LOCKED_STORE, JSON.stringify(store));

    // Apply fixed + proportional units
    el.style.position  = 'fixed';
    el.style.left      = leftPct  + 'vw';
    el.style.top       = topPct   + 'vh';
    el.style.width     = widthPct + 'vw';
    el.style.height    = heightPct + 'vh';
    el.style.zIndex    = zIndex === 'auto' ? '100' : zIndex;
    el.style.margin    = '0';
    el.style.transform = 'none';
    el.setAttribute(LOCKED_ATTR, 'true');

    window.VEP.lockedElements.add(el);
    window.VEP.log && window.VEP.log(el, 'lock', `fixed ${leftPct}vw ${topPct}vh ${widthPct}vw ${heightPct}vh`);

    renderLockedList();
  }

  /* ── UNLOCK ──────────────────────────────────────────── */
  function unlockElement(el) {
    if (!el || el.getAttribute(LOCKED_ATTR) !== 'true') return;
    const storeRaw = el.getAttribute(LOCKED_STORE);
    if (storeRaw) {
      try {
        const store = JSON.parse(storeRaw);
        Object.keys(store).forEach(k => { el.style[k] = store[k] || ''; });
      } catch(e) {}
    }
    el.removeAttribute(LOCKED_ATTR);
    el.removeAttribute(LOCKED_STORE);
    window.VEP.lockedElements.delete(el);
    window.VEP.log && window.VEP.log(el, 'unlock', 'restored');
    renderLockedList();
  }

  function toggleLock(el) {
    if (el.getAttribute(LOCKED_ATTR) === 'true') {
      unlockElement(el);
    } else {
      lockElement(el);
    }
    // Update handle button state
    const btn = document.getElementById('veph-lock');
    if (btn) updateLockHandleBtn(el);
  }

  function updateLockHandleBtn(el) {
    const btn = document.getElementById('veph-lock');
    if (!btn || !el) return;
    const isLocked = el.getAttribute(LOCKED_ATTR) === 'true';
    btn.textContent = isLocked ? '🔒' : '🔓';
    btn.title       = isLocked ? 'Click to Unlock' : 'Click to Lock position';
    btn.classList.toggle('locked', isLocked);
  }

  /* ══════════════════════════════════════════════════════════
     BUILD LOCK HANDLE BUTTON (injected into editor core handles)
  ══════════════════════════════════════════════════════════ */
  function injectLockHandle() {
    // Wait for handles to be built
    function tryInject() {
      const handles = document.getElementById('vep-handles');
      if (!handles) { setTimeout(tryInject, 300); return; }
      if (document.getElementById('veph-lock')) return;

      const btn = document.createElement('div');
      btn.className = 'veph';
      btn.id = 'veph-lock';
      btn.textContent = '🔓';
      btn.title = 'Lock / Unlock element position';
      btn.style.cssText = 'top:50%;left:-13px;transform:translateY(-50%)';
      handles.appendChild(btn);

      btn.addEventListener('click', () => {
        if (window.VEP.selectedEl) toggleLock(window.VEP.selectedEl);
      });
    }
    tryInject();
  }

  /* ── Sync lock handle when element is selected ────────── */
  const origSync = window.VEP_syncRight;
  window.VEP_syncRight = function(el) {
    if (origSync) origSync(el);
    updateLockHandleBtn(el);
  };

  /* ══════════════════════════════════════════════════════════
     BUILD LOCK UI PANEL
  ══════════════════════════════════════════════════════════ */
  function buildLockPanel() {
    if (document.getElementById('vep-lock-panel')) return;

    // Selection mode banner
    const banner = document.createElement('div');
    banner.id = 'vep-lock-select-banner';
    banner.innerHTML = `
      <span>🔒 LOCK MODE — Click elements on the page to lock them proportionally</span>
      <button id="vep-lock-cancel">Done</button>`;
    document.body.appendChild(banner);
    document.getElementById('vep-lock-cancel').addEventListener('click', () => {
      banner.classList.remove('show');
      lockModeActive = false;
    });

    // Lock manager panel
    const panel = document.createElement('div');
    panel.id = 'vep-lock-panel';
    panel.innerHTML = `
      <h4>🔒 Locked Elements</h4>
      <div class="vep-locked-list" id="vep-locked-list">
        <div style="font-size:10px;color:rgba(255,255,255,.3)">No locked elements yet.</div>
      </div>
      <button class="vbig" id="vep-lock-mode-btn" style="font-size:10px;margin-bottom:8px">🖱 Enter Lock Selection Mode</button>
      <button class="vbig vdanger" id="vep-unlock-all-btn" style="font-size:10px">🔓 Unlock All</button>`;
    document.body.appendChild(panel);

    document.getElementById('vep-lock-mode-btn').addEventListener('click', () => {
      lockModeActive = true;
      banner.classList.add('show');
    });
    document.getElementById('vep-unlock-all-btn').addEventListener('click', () => {
      if (!confirm('Unlock all locked elements?')) return;
      [...window.VEP.lockedElements].forEach(unlockElement);
    });
  }

  /* ── Lock Selection Mode click handler ──────────────────── */
  let lockModeActive = false;

  document.addEventListener('click', function(e) {
    if (!lockModeActive) return;
    const panels = ['vep-lock-panel','vep-lock-select-banner','vep-left','vep-right','vep-handles'];
    const isInternal = panels.some(id => { const p=document.getElementById(id); return p&&(p===e.target||p.contains(e.target)); });
    if (isInternal) return;

    e.preventDefault(); e.stopPropagation();
    lockElement(e.target);

    // Flash feedback
    e.target.style.outline = '3px solid gold';
    setTimeout(() => { e.target.style.outline = ''; }, 600);
  }, true);

  /* ── Layer panel lock buttons ────────────────────────────── */
  // Expose so editor-left.js can call it per-element
  window.VEP_toggleLock = function(idx) {
    const el = window.__vepLayerEls && window.__vepLayerEls[idx];
    if (el) toggleLock(el);
    renderLockedList();
  };

  /* ── Render locked list in panel ────────────────────────── */
  function renderLockedList() {
    const list = document.getElementById('vep-locked-list');
    if (!list) return;

    if (!window.VEP.lockedElements.size) {
      list.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,.3)">No locked elements yet.</div>';
      return;
    }

    list.innerHTML = [...window.VEP.lockedElements].map((el, i) => {
      const tag  = el.tagName.toLowerCase();
      const id   = el.id ? '#'+el.id : '';
      const text = el.innerText ? el.innerText.slice(0,16) : '';
      const cs   = getComputedStyle(el);
      return `
        <div class="vep-locked-item">
          <span>🔒 &lt;${tag}&gt;${id} ${text}</span>
          <div style="font-size:9px;color:rgba(255,215,0,0.6);margin:0 6px;white-space:nowrap">
            ${cs.left} ${cs.top}
          </div>
          <button onclick="window.VEP_unlockByIndex(${i})" title="Unlock">🔓</button>
        </div>`;
    }).join('');
  }

  window.VEP_unlockByIndex = function(i) {
    const arr = [...window.VEP.lockedElements];
    if (arr[i]) unlockElement(arr[i]);
  };

  /* ══════════════════════════════════════════════════════════
     LOCK PANEL TOGGLE IN LEFT SIDEBAR (Tools tab injection)
  ══════════════════════════════════════════════════════════ */
  function injectLockIntoLeftPanel() {
    function tryInject() {
      const toolsTab = document.getElementById('vltc-tools');
      if (!toolsTab) { setTimeout(tryInject, 500); return; }
      if (document.getElementById('vep-lock-insert-done')) return;

      const section = document.createElement('div');
      section.innerHTML = `
        <hr class="vsep">
        <div class="vr">
          <span class="vl">🔒 Lock System</span>
          <div id="vep-lock-insert-done" style="display:flex;flex-direction:column;gap:6px">
            <button class="vbig" id="vep-open-lock-panel" style="font-size:10px">
              🔒 Open Lock Manager
            </button>
            <button class="vbig" id="vep-lock-selected" style="font-size:10px">
              🔓 Lock Selected Element
            </button>
          </div>
        </div>`;
      toolsTab.appendChild(section);

      document.getElementById('vep-open-lock-panel').addEventListener('click', () => {
        buildLockPanel();
        const p = document.getElementById('vep-lock-panel');
        if (p) p.classList.toggle('show');
      });
      document.getElementById('vep-lock-selected').addEventListener('click', () => {
        if (!window.VEP.selectedEl) { alert('Select an element first.'); return; }
        toggleLock(window.VEP.selectedEl);
        buildLockPanel();
        document.getElementById('vep-lock-panel')?.classList.add('show');
      });
    }
    tryInject();
  }

  /* ══════════════════════════════════════════════════════════
     ALSO INJECT LOCK BUTTON INTO LAYER TREE ITEMS
  ══════════════════════════════════════════════════════════ */
  const origBuildLayers = window.VEP_buildLeft;
  // We patch buildLayersTree by extending the layers HTML
  // The hook is: after the layer tree renders, add lock icons
  const origRender = window.VEP_syncLeft;
  window.VEP_syncLeft = function(el) {
    if (origRender) origRender(el);
    patchLayerTreeWithLockIcons();
  };

  function patchLayerTreeWithLockIcons() {
    if (!window.__vepLayerEls) return;
    const container = document.getElementById('vep-layers-tree');
    if (!container) return;
    // Add lock icon next to each row
    container.querySelectorAll('[data-lidx]').forEach((row, i) => {
      if (row.querySelector('.vep-lock-row-btn')) return;
      const el = window.__vepLayerEls[i];
      if (!el) return;
      const isLocked = el.getAttribute(LOCKED_ATTR) === 'true';
      const btn = document.createElement('span');
      btn.className = 'vep-lock-row-btn';
      btn.textContent = isLocked ? '🔒' : '🔓';
      btn.title = 'Toggle Lock';
      btn.style.cssText = 'cursor:pointer;margin-left:6px;font-size:10px;opacity:0.6';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.VEP_toggleLock(i);
        btn.textContent = (el.getAttribute(LOCKED_ATTR) === 'true') ? '🔒' : '🔓';
      });
      row.appendChild(btn);
    });
  }

  /* ══════════════════════════════════════════════════════════
     MULTI-SELECTION MODE
     Hold Shift + click to select multiple → lock all at once
  ══════════════════════════════════════════════════════════ */
  window.VEP.multiSelected = new Set();

  document.addEventListener('click', function(e) {
    if (!window.VEP.editActive || !e.shiftKey) return;
    const panels = ['vep-left','vep-right','vep-handles','vep-lock-panel','vep-lock-select-banner'];
    if (panels.some(id => { const p=document.getElementById(id); return p&&(p===e.target||p.contains(e.target)); })) return;
    e.preventDefault(); e.stopPropagation();

    const el = e.target;
    if (window.VEP.multiSelected.has(el)) {
      window.VEP.multiSelected.delete(el);
      el.style.outline = '';
    } else {
      window.VEP.multiSelected.add(el);
      el.style.outline = '2px solid rgba(255,215,0,0.7)';
      el.style.outlineOffset = '3px';
    }

    // Show multi-lock toolbar if 2+ selected
    renderMultiSelToolbar();
  }, true);

  function renderMultiSelToolbar() {
    let toolbar = document.getElementById('vep-multi-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'vep-multi-toolbar';
      toolbar.style.cssText = `
        position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
        z-index:2147483643; background:rgba(6,6,6,0.97);
        border:1px solid rgba(255,215,0,0.3); border-radius:100px;
        padding:10px 20px; display:none; align-items:center; gap:12px;
        font-family:'Inter',sans-serif; font-size:10px; font-weight:700;
        color:gold; box-shadow:0 20px 60px rgba(0,0,0,0.8);
        backdrop-filter:blur(16px); white-space:nowrap;`;
      toolbar.innerHTML = `
        <span id="vep-multi-count">0 selected</span>
        <button class="vbsm" id="vep-multi-lock" style="border-color:rgba(255,215,0,.4);color:gold">🔒 Lock All</button>
        <button class="vbsm" id="vep-multi-unlock" style="border-color:rgba(255,100,100,.4);color:rgba(255,100,100,.8)">🔓 Unlock All</button>
        <button class="vbsm" id="vep-multi-clear" style="border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.4)">✕ Clear Selection</button>`;
      document.body.appendChild(toolbar);

      document.getElementById('vep-multi-lock').addEventListener('click', () => {
        window.VEP.multiSelected.forEach(el => lockElement(el));
        clearMultiSel();
      });
      document.getElementById('vep-multi-unlock').addEventListener('click', () => {
        window.VEP.multiSelected.forEach(el => unlockElement(el));
        clearMultiSel();
      });
      document.getElementById('vep-multi-clear').addEventListener('click', clearMultiSel);
    }

    if (window.VEP.multiSelected.size > 0) {
      toolbar.style.display = 'flex';
      document.getElementById('vep-multi-count').textContent = `${window.VEP.multiSelected.size} selected`;
    } else {
      toolbar.style.display = 'none';
    }
  }

  function clearMultiSel() {
    window.VEP.multiSelected.forEach(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
    window.VEP.multiSelected.clear();
    renderMultiSelToolbar();
  }

  /* ══════════════════════════════════════════════════════════
     INIT (waits for editor to become active)
  ══════════════════════════════════════════════════════════ */
  function init() {
    injectLockStyles();
    injectLockHandle();
    injectLockIntoLeftPanel();
  }

  // Small delay to ensure editor panels are built first
  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  // Also init immediately if DOM is already loaded
  if (document.readyState !== 'loading') setTimeout(init, 800);

})();
