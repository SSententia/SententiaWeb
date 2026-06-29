// GLOBAL MOUSE SOUNDS
document.addEventListener('pointerdown', function (e) {
  // icon selection logic
  const icon = e.target.closest('.desktop-icon');
  if (icon) {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    icon.classList.add('selected');
  } else {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  }

  const holdSound = document.getElementById('hold-sound');
  if (holdSound) {
    holdSound.currentTime = 0;
    holdSound.volume = globalVolume;
    holdSound.play().catch(() => { });
  }
});

document.addEventListener('pointerup', function (e) {
  const releaseSound = document.getElementById('release-sound');
  if (releaseSound) {
    releaseSound.currentTime = 0;
    releaseSound.volume = globalVolume;
    releaseSound.play().catch(() => { });
  }
});

// SETTINGS RADIO LISTENERS
const radioButtons = document.querySelectorAll('input[id|="S"]');
const EFFECT_TARGETS = ['desktop-wrapper', 'taskbar', 'start-menu'];

function addEffectClass(cls) {
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add(cls);
  });
}

function removeEffectClass(cls) {
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove(cls);
  });
}

radioButtons.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (!event.target.checked) return;

    const removeAttr = event.target.getAttribute('data-remove');
    if (removeAttr) {
      removeAttr.split(/\s+/).forEach(cls => {
        if (cls === 'js-less') toggleJSLess(false);
        else if (cls) removeEffectClass(cls);
      });
    }

    const effectAttr = event.target.getAttribute('data-effect');
    if (effectAttr) {
      if (effectAttr === 'js-less') toggleJSLess(true);
      else addEffectClass(effectAttr);
    }
  });
});

// KEYBOARD MOUSE POINTER
const keyboardMouse = {
  enabled: false,
  cursorEl: null,
  warningEl: null,
  hideCursorStyleEl: null,
  rafId: null,
  x: 0,
  y: 0,
  baseSpeed: 2,
  maxSpeed: 14,
  accelDuration: 500,
  keyDownTime: {},
  keys: {},
  cursorState: 'normal',
  forcedState: null,
  lastLeftClickTime: 0,
  blockerEl: null,
  dragKeyHeld: false,
  dragStarted: false,
  dragKey: 'f'
};

const CURSOR_STATES = {
  normal: 'MEDIA/CNormal.cur',
  point: 'MEDIA/CPoint.cur',
  beam: 'MEDIA/CBeam.cur',
  wait: 'MEDIA/CWait.cur',
  help: 'MEDIA/CHelp.cur',
  denied: 'MEDIA/CDenied.cur'
};

function ensureKeyboardMouseElements() {
  if (!keyboardMouse.cursorEl) {
    const container = document.createElement('div');
    container.id = 'kb-cursor';
    const img = document.createElement('img');
    img.src = CURSOR_STATES.normal;
    img.alt = '';
    img.draggable = false;
    img.addEventListener('load', () => {
      container.classList.toggle('kb-cursor-fallback', img.naturalWidth === 0);
    });
    img.addEventListener('error', () => {
      container.classList.add('kb-cursor-fallback');
    });
    container.appendChild(img);
    document.body.appendChild(container);
    keyboardMouse.cursorEl = container;
  }
  if (!keyboardMouse.warningEl) {
    const warning = document.createElement('div');
    warning.id = 'kb-warning';
    warning.textContent = "Device 'device:mouse' conflicts with 'device:typing'!";
    document.body.appendChild(warning);
    keyboardMouse.warningEl = warning;
  }
  if (!keyboardMouse.blockerEl) {
    const blocker = document.createElement('div');
    blocker.id = 'kb-mouse-blocker';
    document.body.appendChild(blocker);
    keyboardMouse.blockerEl = blocker;
  }
  if (!keyboardMouse.hideCursorStyleEl) {
    const style = document.createElement('style');
    style.id = 'kb-hide-cursor-style';
    document.head.appendChild(style);
    keyboardMouse.hideCursorStyleEl = style;
  }
}

function setMouseDevice(device) {
  if (device === 'keyboard') {
    enableKeyboardMouse();
  } else {
    disableKeyboardMouse();
  }
}

function enableKeyboardMouse() {
  ensureKeyboardMouseElements();
  keyboardMouse.enabled = true;
  if (keyboardMouse.x === 0 && keyboardMouse.y === 0) {
    keyboardMouse.x = Math.floor(window.innerWidth / 2);
    keyboardMouse.y = Math.floor(window.innerHeight / 2);
  }
  keyboardMouse.cursorEl.style.display = 'block';
  keyboardMouse.warningEl.style.display = 'block';
  if (keyboardMouse.blockerEl) keyboardMouse.blockerEl.style.display = 'block';
  keyboardMouse.hideCursorStyleEl.textContent =
    '.kb-cursor-hidden, .kb-cursor-hidden * { cursor: none !important; }';
  document.body.classList.add('kb-cursor-hidden');
  updateKeyboardMouseCursorPos();
  startKeyboardMouseLoop();
}

function disableKeyboardMouse() {
  keyboardMouse.enabled = false;
  if (keyboardMouse.rafId !== null) {
    cancelAnimationFrame(keyboardMouse.rafId);
    keyboardMouse.rafId = null;
  }
  // End any active drag
  if (keyboardMouse.dragKeyHeld) kbEndDrag();
  keyboardMouse.forcedState = null;
  if (keyboardMouse.cursorEl) keyboardMouse.cursorEl.style.display = 'none';
  if (keyboardMouse.warningEl) keyboardMouse.warningEl.style.display = 'none';
  if (keyboardMouse.blockerEl) keyboardMouse.blockerEl.style.display = 'none';
  if (keyboardMouse.hideCursorStyleEl) keyboardMouse.hideCursorStyleEl.textContent = '';
  document.body.classList.remove('kb-cursor-hidden');
  keyboardMouse.keys = {};
  keyboardMouse.keyDownTime = {};
}

function updateKeyboardMouseCursorPos() {
  if (!keyboardMouse.cursorEl) return;
  keyboardMouse.cursorEl.style.left = keyboardMouse.x + 'px';
  keyboardMouse.cursorEl.style.top = keyboardMouse.y + 'px';
}

function setCursorState(state) {
  if (!keyboardMouse.cursorEl) return;
  if (state === keyboardMouse.cursorState) return;
  keyboardMouse.cursorState = state;
  const newSrc = CURSOR_STATES[state] || CURSOR_STATES.normal;
  const img = keyboardMouse.cursorEl.querySelector('img');
  if (img) img.src = newSrc;
}

let lastCursorCheckX = -1;
let lastCursorCheckY = -1;

function maybeUpdateCursorState() {
  if (keyboardMouse.x !== lastCursorCheckX || keyboardMouse.y !== lastCursorCheckY) {
    lastCursorCheckX = keyboardMouse.x;
    lastCursorCheckY = keyboardMouse.y;
    determineHoverState();
  }
}

function kbElementFromPoint(x, y) {
  if (keyboardMouse.blockerEl) keyboardMouse.blockerEl.style.pointerEvents = 'none';
  try {
    return document.elementFromPoint(x, y);
  } finally {
    if (keyboardMouse.blockerEl) keyboardMouse.blockerEl.style.pointerEvents = 'all';
  }
}

function determineHoverState() {
  if (keyboardMouse.forcedState) {
    setCursorState(keyboardMouse.forcedState);
    return;
  }
  const el = kbElementFromPoint(keyboardMouse.x, keyboardMouse.y);
  if (!el) {
    setCursorState('normal');
    return;
  }
  let node = el;
  while (node && node !== document.body) {
    if (node.nodeType === 1) {
      if (node.matches && node.matches(':disabled')) {
        setCursorState('denied');
        return;
      }
      if (node.tagName === 'TEXTAREA' || node.isContentEditable) {
        setCursorState('beam');
        return;
      }
      if (node.tagName === 'INPUT') {
        const type = (node.type || '').toLowerCase();
        if (type !== 'button' && type !== 'submit' && type !== 'reset' && type !== 'checkbox' && type !== 'radio' && type !== 'range' && type !== 'color' && type !== 'file') {
          setCursorState('beam');
          return;
        }
      }
      if (node.tagName === 'BUTTON' || node.tagName === 'A' || (node.matches && node.matches('[role="tab"]'))) {
        setCursorState('point');
        return;
      }
      if (node.getAttribute && node.getAttribute('ondblclick')) {
        setCursorState('point');
        return;
      }
      if ((node.tagName === 'IMG' && node.alt === 'Help') || (node.classList && node.classList.contains && Array.from(node.classList).some(c => /help/i.test(c)))) {
        setCursorState('help');
        return;
      }
    }
    node = node.parentElement;
  }
  setCursorState('normal');
}

function kbGetAccelSpeed(key) {
  const t0 = keyboardMouse.keyDownTime[key];
  if (!t0) return keyboardMouse.baseSpeed;
  const elapsed = performance.now() - t0;
  const t = Math.min(elapsed / keyboardMouse.accelDuration, 1);
  return keyboardMouse.baseSpeed + (keyboardMouse.maxSpeed - keyboardMouse.baseSpeed) * t * t;
}

function startKeyboardMouseLoop() {
  function tick() {
    if (!keyboardMouse.enabled) {
      keyboardMouse.rafId = null;
      return;
    }
    const prevX = keyboardMouse.x, prevY = keyboardMouse.y;
    let dx = 0, dy = 0;
    const k = keyboardMouse.keys;
    // Find the dominant speed from active movement keys
    let activeSpeed = keyboardMouse.baseSpeed;
    const moveKeys = ['w', 'arrowup', 's', 'arrowdown', 'a', 'arrowleft', 'd', 'arrowright'];
    for (const mk of moveKeys) {
      if (k[mk]) { activeSpeed = Math.max(activeSpeed, kbGetAccelSpeed(mk)); }
    }
    if (k['w'] || k['arrowup']) dy -= 1;
    if (k['s'] || k['arrowdown']) dy += 1;
    if (k['a'] || k['arrowleft']) dx -= 1;
    if (k['d'] || k['arrowright']) dx += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * activeSpeed;
      dy = (dy / len) * activeSpeed;
      keyboardMouse.x = Math.max(0, Math.min(window.innerWidth, keyboardMouse.x + dx));
      keyboardMouse.y = Math.max(0, Math.min(window.innerHeight, keyboardMouse.y + dy));
      updateKeyboardMouseCursorPos();
    }
    // Drag: dispatch pointermove on document while drag key is held
    if (keyboardMouse.dragKeyHeld && keyboardMouse.dragStarted && (keyboardMouse.x !== prevX || keyboardMouse.y !== prevY)) {
      const moveEv = new PointerEvent('pointermove', {
        bubbles: true, cancelable: true,
        clientX: keyboardMouse.x, clientY: keyboardMouse.y, button: 0, pointerType: 'mouse'
      });
      try { document.dispatchEvent(moveEv); } catch (_) {}
    }
    maybeUpdateCursorState();
    keyboardMouse.rafId = requestAnimationFrame(tick);
  }
  keyboardMouse.rafId = requestAnimationFrame(tick);
}

function safeKeyboardMouseDispatch(target, event) {
  try { target.dispatchEvent(event); } catch (err) { console.warn('Keyboard mouse dispatch error:', err); }
}

function performKeyboardMouseClick(button) {
  const el = kbElementFromPoint(keyboardMouse.x, keyboardMouse.y);
  if (!el || el.matches(':disabled')) return;
  const baseOpts = {
    bubbles: true,
    cancelable: true,
    clientX: keyboardMouse.x,
    clientY: keyboardMouse.y
  };
  if (button === 'left') {
    const now = performance.now();
    const isDouble = keyboardMouse.lastLeftClickTime > 0 && (now - keyboardMouse.lastLeftClickTime) <= 500;
    keyboardMouse.lastLeftClickTime = now;
    safeKeyboardMouseDispatch(el, new PointerEvent('pointerdown', { ...baseOpts, button: 0, pointerType: 'mouse' }));
    safeKeyboardMouseDispatch(el, new MouseEvent('mousedown', { ...baseOpts, button: 0 }));
    safeKeyboardMouseDispatch(el, new PointerEvent('pointerup', { ...baseOpts, button: 0, pointerType: 'mouse' }));
    safeKeyboardMouseDispatch(el, new MouseEvent('mouseup', { ...baseOpts, button: 0 }));
    safeKeyboardMouseDispatch(el, new MouseEvent('click', { ...baseOpts, button: 0 }));
    if (isDouble) {
      safeKeyboardMouseDispatch(el, new MouseEvent('dblclick', { ...baseOpts, button: 0 }));
    }
  } else {
    safeKeyboardMouseDispatch(el, new PointerEvent('pointerdown', { ...baseOpts, button: 2, pointerType: 'mouse' }));
    safeKeyboardMouseDispatch(el, new MouseEvent('mousedown', { ...baseOpts, button: 2 }));
    safeKeyboardMouseDispatch(el, new PointerEvent('pointerup', { ...baseOpts, button: 2, pointerType: 'mouse' }));
    safeKeyboardMouseDispatch(el, new MouseEvent('mouseup', { ...baseOpts, button: 2 }));
    safeKeyboardMouseDispatch(el, new MouseEvent('contextmenu', { ...baseOpts, button: 2 }));
  }
}

window.addEventListener('keydown', function (e) {
  if (jsLessActive) return;
  if (!keyboardMouse.enabled) return;
  const ae = document.activeElement;
  const isFormControl = ae && (
    ae.tagName === 'INPUT' ||
    ae.tagName === 'TEXTAREA' ||
    ae.tagName === 'SELECT'
  );
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) !== -1) {
    keyboardMouse.keys[k] = true;
    if (!isFormControl) e.preventDefault();
  } else if (!e.repeat && (k === 'q' || k === 'z' || k === 'e' || k === 'x')) {
    if (!isFormControl) e.preventDefault();
    if (k === 'q' || k === 'z') {
      performKeyboardMouseClick('left');
    } else {
      performKeyboardMouseClick('right');
    }
  } else if (k === keyboardMouse.dragKey) {
    if (!isFormControl) e.preventDefault();
    if (!isFormControl && !keyboardMouse.dragKeyHeld) {
      keyboardMouse.dragKeyHeld = true;
      keyboardMouse.dragStarted = false;
      const el = kbElementFromPoint(keyboardMouse.x, keyboardMouse.y);
      if (el && !el.matches(':disabled')) {
        const opts = { bubbles: true, cancelable: true, clientX: keyboardMouse.x, clientY: keyboardMouse.y, button: 0, pointerType: 'mouse' };
        safeKeyboardMouseDispatch(el, new PointerEvent('pointerdown', opts));
        safeKeyboardMouseDispatch(el, new MouseEvent('mousedown', { ...opts, button: 0 }));
        keyboardMouse.dragStarted = true;
        setCursorState('point');
      }
    }
  } else if (k === 'escape') {
    if (keyboardMouse.dragKeyHeld) kbEndDrag();
    disableKeyboardMouse();
    const select = document.getElementById('mouse-device-select');
    if (select) select.value = 'mouse';
  }
  // Record key-down time for acceleration
  if (!keyboardMouse.keyDownTime[k]) {
    keyboardMouse.keyDownTime[k] = performance.now();
  }
});

function kbEndDrag() {
  if (keyboardMouse.dragStarted) {
    const opts = { bubbles: true, cancelable: true, clientX: keyboardMouse.x, clientY: keyboardMouse.y, button: 0, pointerType: 'mouse' };
    document.dispatchEvent(new PointerEvent('pointerup', opts));
    document.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 0 }));
  }
  keyboardMouse.dragKeyHeld = false;
  keyboardMouse.dragStarted = false;
}

window.addEventListener('keyup', function (e) {
  const k = e.key.toLowerCase();
  if (keyboardMouse.enabled) {
    if (keyboardMouse.keys[k] !== undefined) {
      keyboardMouse.keys[k] = false;
    }
    if (k === keyboardMouse.dragKey) {
      kbEndDrag();
    }
    delete keyboardMouse.keyDownTime[k];
  }
});

// ACCESSIBILITY JOKE EFFECTS
let vgaEjected = false;
let narratorEnabled = false;
let narratorAudio = null;
let stickyKeysEnabled = false;
let stickyKeysDialogShown = false;
let stickyKeysSound = null;
let stickyKeysKeyTimes = [];
let magnifierEnabled = false;
let highContrastEnabled = false;
let highBrightnessEnabled = false;
let bigTextEnabled = false;
let bigCursorEnabled = false;
let bigCursorEl = null;

// EJECT VGA
function Blackscreen() {
  vgaEjected = !vgaEjected;
  let overlay = document.getElementById('vga-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'vga-overlay';
    overlay.innerHTML = '<span>NO SIGNAL</span>';
    overlay.addEventListener('click', function () {
      vgaEjected = false;
      overlay.style.display = 'none';
    });
    document.body.appendChild(overlay);
  }
  overlay.style.display = vgaEjected ? 'flex' : 'none';
}

// NARRATOR
function EnableNarrator() {
  narratorEnabled = !narratorEnabled;
  if (!narratorAudio) {
    narratorAudio = document.createElement('audio');
    narratorAudio.loop = true;
    narratorAudio.preload = 'auto';
    // TODO: Replace with actual narrator voice file
    // narratorAudio.src = 'MEDIA/narrator.wav';
    document.body.appendChild(narratorAudio);
  }
  narratorAudio.volume = globalVolume;
  if (narratorEnabled) {
    narratorAudio.play().catch(() => {});
  } else {
    narratorAudio.pause();
    narratorAudio.currentTime = 0;
  }
}

// STICKY KEYS
function EnableSticky() {
  if (stickyKeysEnabled) {
    stickyKeysEnabled = false;
  } else {
    showStickyKeysDialog();
  }
}

function showStickyKeysDialog() {
  if (stickyKeysDialogShown) return;
  stickyKeysDialogShown = true;

  let dialog = document.getElementById('sticky-keys-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.className = 'window';
    dialog.id = 'sticky-keys-dialog';
    var cx = Math.floor((window.innerWidth - 350) / 2);
    var cy = Math.floor((window.innerHeight - 200) / 2);
    dialog.style.top = cy + 'px';
    dialog.style.left = cx + 'px';
    dialog.innerHTML =
      '<div class="title-bar">' +
        '<div class="title-bar-text">Sticky Keys</div>' +
        '<div class="title-bar-controls">' +
          '<button aria-label="Close" onclick="dismissStickyKeys()"></button>' +
        '</div>' +
      '</div>' +
      '<div class="window-body" style="padding: 15px; text-align: center;">' +
        '<p>Sticky Keys lets you press one key at a time for keyboard shortcuts.</p>' +
        '<p style="margin-top: 10px;">Do you want to turn on Sticky Keys?</p>' +
        '<div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">' +
          '<button onclick="activateStickyKeys()">Yes</button>' +
          '<button onclick="dismissStickyKeys()">No</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    dragElement(dialog);
  }
  dialog.style.display = 'block';
  dialog.style.zIndex = highestZIndex++;
}

function activateStickyKeys() {
  stickyKeysEnabled = true;
  stickyKeysDialogShown = false;
  var dialog = document.getElementById('sticky-keys-dialog');
  if (dialog) dialog.style.display = 'none';
  if (!stickyKeysSound) {
    stickyKeysSound = document.createElement('audio');
    stickyKeysSound.preload = 'auto';
    // TODO: Replace with actual sticky keys sound file
    // stickyKeysSound.src = 'MEDIA/sticky.wav';
    document.body.appendChild(stickyKeysSound);
  }
  stickyKeysSound.volume = globalVolume;
}

function dismissStickyKeys() {
  stickyKeysDialogShown = false;
  var dialog = document.getElementById('sticky-keys-dialog');
  if (dialog) dialog.style.display = 'none';
}

// Track repeated key presses for Sticky Keys (any key triggers the dialog)
document.addEventListener('keydown', function (e) {
  if (jsLessActive) return;
  if (!e.repeat) {
    var now = Date.now();
    stickyKeysKeyTimes.push(now);
    stickyKeysKeyTimes = stickyKeysKeyTimes.filter(function (t) { return now - t < 3000; });
    if (stickyKeysKeyTimes.length >= 5) {
      stickyKeysKeyTimes = [];
      if (!stickyKeysEnabled) showStickyKeysDialog();
    }
  }
  if (stickyKeysEnabled && stickyKeysSound) {
    stickyKeysSound.currentTime = 0;
    stickyKeysSound.volume = globalVolume;
    stickyKeysSound.play().catch(() => {});
  }
});

// MAGNIFIER
function EnableZoom() {
  magnifierEnabled = !magnifierEnabled;
  if (magnifierEnabled) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.transform = 'scale(3)';
    document.body.style.transformOrigin = '50% 50%';
    document.addEventListener('mousemove', magnifierFollow);
  } else {
    document.documentElement.style.overflow = '';
    document.body.style.transform = '';
    document.body.style.transformOrigin = '';
    document.removeEventListener('mousemove', magnifierFollow);
  }
}

function magnifierFollow(e) {
  if (!magnifierEnabled) return;
  var x = (e.clientX / window.innerWidth * 100);
  var y = (e.clientY / window.innerHeight * 100);
  document.body.style.transformOrigin = x + '% ' + y + '%';
}

// HIGH CONTRAST
function EnableHicon() {
  highContrastEnabled = !highContrastEnabled;
  if (highContrastEnabled) {
    addEffectClass('high-contrast-effect');
  } else {
    removeEffectClass('high-contrast-effect');
  }
}

// HIGH BRIGHTNESS
function EnableHibrig() {
  highBrightnessEnabled = !highBrightnessEnabled;
  if (highBrightnessEnabled) {
    addEffectClass('high-brightness-effect');
  } else {
    removeEffectClass('high-brightness-effect');
  }
}

// BIG TEXT
function EnableBigtxt() {
  bigTextEnabled = !bigTextEnabled;
  if (bigTextEnabled) {
    addEffectClass('big-text-effect');
  } else {
    removeEffectClass('big-text-effect');
  }
}

// BIG CURSOR
function EnableBigcur() {
  bigCursorEnabled = !bigCursorEnabled;
  if (bigCursorEnabled) {
    if (!bigCursorEl) {
      bigCursorEl = document.createElement('div');
      bigCursorEl.className = 'big-cursor-overlay';
      var img = document.createElement('img');
      img.src = CURSOR_STATES.normal;
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', function () {
        bigCursorEl.classList.add('big-cursor-fallback');
      });
      bigCursorEl.appendChild(img);
      document.body.appendChild(bigCursorEl);
    }
    bigCursorEl.style.display = 'block';
    document.body.classList.add('big-cursor-hidden');
    document.addEventListener('mousemove', bigCursorFollow);
  } else {
    if (bigCursorEl) bigCursorEl.style.display = 'none';
    document.body.classList.remove('big-cursor-hidden');
    document.removeEventListener('mousemove', bigCursorFollow);
  }
}

function bigCursorFollow(e) {
  if (!bigCursorEnabled || !bigCursorEl) return;
  bigCursorEl.style.left = e.clientX + 'px';
  bigCursorEl.style.top = e.clientY + 'px';
}

// USER-PROVIDED CURSOR (Personalization → Cursor)
// Reads the URL from #cursor-url and applies it as a CSS cursor with !important
// so it overrides the default body cursor. Empty input resets to default.
function changeCursor() {
  const input = document.getElementById('cursor-url');
  const url = input ? input.value.trim() : '';
  let style = document.getElementById('custom-cursor-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-cursor-style';
    document.head.appendChild(style);
  }
  if (url) {
    // Escape backslash and double-quote so the cursor URL can't break out of the css url()
    const safeUrl = url.replace(/[\\"]/g, '\\$&');
    style.textContent =
      'html, body, button, a, input, select, textarea, [role="tab"], ' +
      '.desktop-icon, .title-bar { cursor: url("' + safeUrl + '"), auto !important; }';
  } else {
    style.textContent = '';
  }
}

// MOUSE TRAIL (System → Mouse)
// Draws a small fading circle under the cursor on every mousemove.
// Clicking the button toggles the trail on/off.
let mouseTrailActive = false;
const TRAIL_COLORS = ['#ffffff', '#ff4040', '#ffff40', '#40ff40', '#40ffff', '#ff40ff'];

function toggleMouseTrail() {
  mouseTrailActive = !mouseTrailActive;
  if (mouseTrailActive) {
    document.addEventListener('mousemove', addTrailDot);
  } else {
    document.removeEventListener('mousemove', addTrailDot);
    // Clean up any dot that was still on-screen
    document.querySelectorAll('.mouse-trail-dot').forEach(function (d) { d.remove(); });
  }
}

function addTrailDot(e) {
  if (!mouseTrailActive) return;
  if (jsLessActive) return;
  if (e.target && e.target.closest && e.target.closest('input, textarea, select, button')) return;
  const dot = document.createElement('div');
  dot.className = 'mouse-trail-dot';
  dot.style.left = e.clientX + 'px';
  dot.style.top = e.clientY + 'px';
  const color = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];
  dot.style.background = color;
  document.body.appendChild(dot);
  // Force layout so the transition animates from the initial state
  setTimeout(function () {
    dot.classList.add('trail-fade');
    setTimeout(function () { dot.remove(); }, 650);
  }, 30);
}

// JS-LESS (Personalization → Script)
// Adds body.js-less class + a notice. CSS blocks pointer-events on
// non-form elements so icons, windows and most buttons stop responding,
// but the radios themselves stay clickable so the user can flip back.
let jsLessActive = false;

function toggleJSLess(on) {
  jsLessActive = !!on;
  if (on) {
    document.body.classList.add('js-less');
    let notice = document.getElementById('js-less-readme');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'js-less-readme';
      notice.innerHTML = '<strong>JS-less mode is on.</strong><br>' +
        'Most interactions are disabled.<br>' +
        'Use the <em>Script</em> fieldset radios to turn JavaScript back on.';
      document.body.appendChild(notice);
    }
    notice.style.display = 'block';
  } else {
    document.body.classList.remove('js-less');
    const notice = document.getElementById('js-less-readme');
    if (notice) notice.style.display = 'none';
  }
}

// BOGOL COMPRESSION WIZARD
let bogolProgressInterval = null;

function bogolNext() {
  const stepBanner = document.getElementById('bogol-step-banner');
  const stepConfirm = document.getElementById('bogol-step-confirm');
  const backBtn = document.getElementById('bogol-back-btn');
  const nextBtn = document.getElementById('bogol-next-btn');
  const progressBar = document.getElementById('bogol-progress-bar');
  const bogolWindow = document.getElementById('bogol-window');

  if (!stepBanner || !stepConfirm) return;

  // Banner -> Confirmation step
  if (stepBanner.style.display !== 'none') {
    stepBanner.style.display = 'none';
    stepConfirm.style.display = 'block';
    backBtn.style.display = 'inline-block';
    return;
  }

  // Confirmation -> Start progress (only if not already running)
  if (progressBar && bogolProgressInterval === null) {
    nextBtn.disabled = true;
    backBtn.disabled = true;
    // Hide the window's close (X) button so the compression cannot be cancelled
    if (bogolWindow) {
      const closeBtn = bogolWindow.querySelector('.title-bar-controls button[aria-label="Close"]');
      if (closeBtn) closeBtn.style.display = 'none';
    }
    // Force the keyboard mouse cursor to show the wait state during compression
    keyboardMouse.forcedState = 'wait';
    bogolProgressInterval = setInterval(() => animateBogolProgress(progressBar), 120);
  }
}

function bogolBack() {
  const stepBanner = document.getElementById('bogol-step-banner');
  const stepConfirm = document.getElementById('bogol-step-confirm');
  const backBtn = document.getElementById('bogol-back-btn');
  const progressBar = document.getElementById('bogol-progress-bar');

  // Disable during active progress
  if (bogolProgressInterval !== null) return;
  if (!stepBanner) return;

  stepBanner.style.display = 'block';
  stepConfirm.style.display = 'none';
  backBtn.style.display = 'none';
  if (progressBar) progressBar.style.width = '0%';
}

function animateBogolProgress(bar) {
  let current = parseFloat(bar.style.width) || 0;
  let increment;

  if (current < 70) {
    // Fast phase: 5-15% per tick
    increment = Math.random() * 10 + 5;
  } else if (current < 90) {
    // Mid phase: 2-7% per tick (slowing down)
    increment = Math.random() * 5 + 2;
  } else if (current < 99) {
    // Near completion: 0.3-1.5% per tick (much slower)
    increment = Math.random() * 1.2 + 0.3;
  } else {
    // Final push
    increment = 1;
  }

  current = Math.min(current + increment, 100);
  bar.style.width = current + '%';

  if (current >= 100) {
    clearInterval(bogolProgressInterval);
    bogolProgressInterval = null;
    setTimeout(() => {
      const bsod = document.getElementById('bsod-overlay');
      if (bsod) bsod.style.display = 'flex';
      // Release the forced wait state on the keyboard mouse cursor
      keyboardMouse.forcedState = null;
    }, 400);
  }
}

function resetBogolWizard() {
  const stepBanner = document.getElementById('bogol-step-banner');
  const stepConfirm = document.getElementById('bogol-step-confirm');
  const backBtn = document.getElementById('bogol-back-btn');
  const nextBtn = document.getElementById('bogol-next-btn');
  const progressBar = document.getElementById('bogol-progress-bar');
  const bogolWindow = document.getElementById('bogol-window');

  if (bogolProgressInterval !== null) {
    clearInterval(bogolProgressInterval);
    bogolProgressInterval = null;
  }

  if (stepBanner) stepBanner.style.display = 'block';
  if (stepConfirm) stepConfirm.style.display = 'none';
  if (backBtn) {
    backBtn.style.display = 'none';
    backBtn.disabled = false;
  }
  if (nextBtn) nextBtn.disabled = false;
  if (progressBar) progressBar.style.width = '0%';
  // Restore the close (X) button when the wizard resets
  if (bogolWindow) {
    const closeBtn = bogolWindow.querySelector('.title-bar-controls button[aria-label="Close"]');
    if (closeBtn) closeBtn.style.display = '';
  }
}

// VOLUME CONTROL
let globalVolume = 0.5;

function toggleVolumePopup() {
  const popup = document.getElementById('volume-popup');
  popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
}

function setGlobalVolume(value) {
  globalVolume = value / 100;
  document.getElementById('volume-label').textContent = value + '%';

  // update all audio and video elements
  document.querySelectorAll('audio, video').forEach(media => {
    media.volume = globalVolume;
  });

  // keep narrator and sticky-keys audio in sync
  if (narratorAudio) narratorAudio.volume = globalVolume;
  if (stickyKeysSound) stickyKeysSound.volume = globalVolume;
}

document.addEventListener('click', function (e) {
  const popup = document.getElementById('volume-popup');
  const volumeIcon = document.querySelector('#taskbar-tray img');
  if (popup && !popup.contains(e.target) && e.target !== volumeIcon) {
    popup.style.display = 'none';
  }
});

// START MENU
function toggleStartMenu() {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  if (startMenu.style.display === 'block') {
    startMenu.style.display = 'none';
    startButton.classList.remove('active');
  } else {
    startMenu.style.display = 'block';
    startButton.classList.add('active');
  }
}

document.addEventListener('click', function (event) {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  if (startMenu && startButton && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
    startMenu.style.display = 'none';
    startButton.classList.remove('active');
  }
});

// CLOCK
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  const strTime = hours + ':' + minutes + ' ' + ampm;
  document.getElementById('clock').textContent = strTime;
}
updateClock();
setInterval(updateClock, 1000);

// SHUTDOWN
function shutdown() {
  const overlay = document.getElementById('shutdown-overlay');
  const message = document.getElementById('shutdown-message');
  overlay.style.display = 'flex';
  setTimeout(() => {
    message.style.display = 'block';
  }, 2000);
}

// WINDOW MANAGEMENT
function closeWindow(button) {
  const windowDiv = button.closest('.window');
  if (windowDiv && windowDiv.id === 'bogol-window') {
    resetBogolWizard();
  }
  if (windowDiv) {
    setTimeout(() => {
      windowDiv.style.display = 'none';
    }, 98);
  }
}

function openWindow(windowId) {
  const windowDiv = document.getElementById(windowId);
  if (windowDiv) {
    windowDiv.style.display = 'block';
    windowDiv.style.zIndex = highestZIndex++;

    if (windowId === 'duck-window' || windowId === 'folder-window') {
      if (!windowDiv.style.top || windowDiv.style.top === '25vh') {
        windowDiv.style.top = '100px';
        windowDiv.style.left = '150px';
      }
    }

    // infinite scroll for trash
    if (windowId === 'trash-window') {
      initializeTrash();
    }
  }
}

// CREATURE ACKNOWLEDGEMENT
function acknowledgement() {
  document.getElementById('acknol').removeAttribute("disabled");
}

// RANDOM NUMBER
const numberElement = document.getElementById('number');
function generateRandomNumber() {
  if (!numberElement) return;
  const randomNumber = Math.floor(Math.random() * 100) + 1;
  numberElement.textContent = "CPU Usage: " + randomNumber + "%";
}
generateRandomNumber();
setInterval(generateRandomNumber, 2000);

// DRAGGABLE WINDOWS
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = elmnt.querySelector('.title-bar');
  if (header) {
    header.onpointerdown = dragMouseDown;
  } else {
    return;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.target.tagName === 'BUTTON') {
      return;
    }
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onpointerup = closeDragElement;
    document.onpointermove = elementDrag;
    elmnt.style.zIndex = highestZIndex++;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onpointerup = null;
    document.onpointermove = null;
  }
}

// TABS
document.querySelectorAll('[role="tablist"]').forEach(tabList => {
  tabList.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    const link = tab ? tab.querySelector('a') : e.target.closest('a');
    if (!link) return;
    e.preventDefault();

    const tabId = link.getAttribute('href').substring(1);
    const parent = tabList.parentElement;

    // Hide all sibling panels
    parent.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.style.display = 'none';
    });

    // Deselect all tabs in this list
    tabList.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.setAttribute('aria-selected', 'false');
    });

    // Select clicked tab
    link.parentElement.setAttribute('aria-selected', 'true');

    // Show target panel
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }
  });
});

// NOTEPAD
function closeNotepad() {
  const content = document.getElementById('notepad-content').value;
  if (content.trim().length > 0) {
    document.getElementById('save-dialog').style.display = 'block';
  } else {
    document.getElementById('notepad-window').style.display = 'none';
  }
}

function saveNotepadFile() {
  const content = document.getElementById('notepad-content').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'untitled.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  document.getElementById('save-dialog').style.display = 'none';
  document.getElementById('notepad-window').style.display = 'none';
  document.getElementById('notepad-content').value = '';
}

function discardNotepad() {
  document.getElementById('save-dialog').style.display = 'none';
  document.getElementById('notepad-window').style.display = 'none';
  document.getElementById('notepad-content').value = '';
}

function cancelNotepadClose() {
  document.getElementById('save-dialog').style.display = 'none';
}

// MEDIA PLAYER
let currentMedia = null;

function loadMedia() {
  const url = document.getElementById('media-url').value.trim();
  if (!url) return;

  const container = document.getElementById('media-container');
  container.innerHTML = '';

  // detect media type
  const ext = url.split('.').pop().toLowerCase().split('?')[0];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
  const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov'];

  if (imageExts.includes(ext)) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Loaded image';
    container.appendChild(img);
    currentMedia = null;
  } else if (audioExts.includes(ext)) {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = false;
    audio.volume = globalVolume;
    container.appendChild(audio);
    container.innerHTML += '<p style="color: #0f0;">♪ Audio loaded ♪</p>';
    currentMedia = audio;
  } else {
    // assume video for unknown
    const video = document.createElement('video');
    video.src = url;
    video.controls = false;
    video.volume = globalVolume;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '200px';
    container.appendChild(video);
    currentMedia = video;
  }
}

function loadSampleVideo() {
  // Legacy function kept for compatibility, but updated to use new openMedia if needed
  openMedia('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
}

function openMedia(url) {
  openWindow('media-player-window');
  document.getElementById('media-url').value = url;
  loadMedia();
}

function mediaPlay() {
  if (currentMedia) {
    currentMedia.volume = globalVolume;
    currentMedia.play().catch(() => { });
  }
}

function mediaPause() {
  if (currentMedia) {
    currentMedia.pause();
  }
}

function mediaStop() {
  if (currentMedia) {
    currentMedia.pause();
    currentMedia.currentTime = 0;
  }
}

// INFINITE RECYCLE BIN
let trashInitialized = false;

function generateGibberish(minLen, maxLen) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-~!@#$%';
  const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createTrashFile() {
  const fileName = generateGibberish(6, 15) + '.' + ['txt', 'doc', 'exe', 'dll', 'dat', 'tmp', 'bak'][Math.floor(Math.random() * 7)];
  const fileContent = generateGibberish(50, 200);

  const fileDiv = document.createElement('div');
  fileDiv.className = 'trash-file';
  fileDiv.innerHTML = `
        <img src="LOCAL/MEDIA/HELP/file.ico" alt="File">
        <span title="${fileContent}">${fileName}</span>
      `;
  return fileDiv;
}

function initializeTrash() {
  if (trashInitialized) return;
  trashInitialized = true;

  const container = document.getElementById('trash-content');
  container.innerHTML = '';

  for (let i = 0; i < 15; i++) {
    container.appendChild(createTrashFile());
  }

  // infinite scroll
  container.addEventListener('scroll', function () {
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 20) {
      for (let i = 0; i < 10; i++) {
        container.appendChild(createTrashFile());
      }
    }
  });
}

// RECURSIVE HELP WINDOWS
let helpWindowCounter = 0;

function spawnHelpWindow() {
  helpWindowCounter++;
  const newWindow = document.createElement('div');
  newWindow.className = 'window';
  newWindow.id = 'help-clone-' + helpWindowCounter;
  newWindow.style.cssText = `width: 300px; position: absolute; top: ${40 + (helpWindowCounter * 20)}vh; left: ${10 + (helpWindowCounter * 3)}vw; z-index: ${highestZIndex++};`;

  newWindow.innerHTML = `
        <div class="title-bar">
          <div class="title-bar-text">Help (${helpWindowCounter})</div>
          <div class="title-bar-controls">
            <button aria-label="Help" onclick="spawnHelpWindow()"></button>
            <button aria-label="Close" onclick="closeWindow(this)"></button>
          </div>
        </div>
        <div class="window-body">
          <p style="margin-top: 15px;"> <img src="LOCAL/MEDIA/HELP/help3.ico"
              style="margin-right: 15px; position: relative; top: -5px; float: left;">That help window doesn't need to
            have it's own<br>help window, silly. What did you expect?</p>
          <button class="default" onclick="closeWindow(this)"
            style="position:relative; left: 50%; transform: translateX(-50%);">OK</button>
        </div>
      `;

  document.getElementById('desktop').appendChild(newWindow);
  dragElement(newWindow);

  newWindow.addEventListener('mousedown', () => {
    newWindow.style.zIndex = highestZIndex++;
  });
}

// VIRUS.EXE
let virusInterval = null;
let virusTimeout = null;
let virusEffectActive = false;
let activeIntervals = []; // Store intervals for effects that need continuous logic (like flying windows)

function executeVirus() {
  if (virusEffectActive) return; // Already running
  virusEffectActive = true;

  // Start the infinite loop of chaos
  startVirusLoop();

  // Schedule the removal question
  scheduleRemovalDialog(10000);
}

function startVirusLoop() {
  // Trigger an initial effect immediately
  randomVirusEffect();

  // Then cycle effects endlessly
  virusInterval = setInterval(randomVirusEffect, 2000);
}

function randomVirusEffect() {
  const effects = [
    shakeScreen,
    invertColors,
    flyingWindows,
    barrelRoll,
    hueSpin,
    cssLess,
    colorDowngrade,
    blurScreen,
    monochrome,
    unrecognizable,
    // overlay effects - lower chance?
    ransomware,
    rickroll,
    persistentBSOD
  ];

  // Weighting: make BSOD and Overlays rarer
  let selectedEffect;
  const r = Math.random();
  if (r < 0.05) {
    selectedEffect = persistentBSOD;
  } else if (r < 0.1) {
    selectedEffect = ransomware;
  } else if (r < 0.15) {
    selectedEffect = rickroll;
  } else {
    // filter out overlays from main pool
    const safeEffects = effects.filter(e => e !== persistentBSOD && e !== ransomware && e !== rickroll);
    selectedEffect = safeEffects[Math.floor(Math.random() * safeEffects.length)];
  }

  selectedEffect();
}

function scheduleRemovalDialog(delay) {
  if (virusTimeout) clearTimeout(virusTimeout);
  virusTimeout = setTimeout(() => {
    const dialog = document.getElementById('virus-remove-dialog');
    dialog.style.display = 'block';
    dialog.style.zIndex = 20000; // Ensure specifically above everything else
  }, delay);
}

function removeVirus() {
  virusEffectActive = false;
  if (virusInterval) clearInterval(virusInterval);
  if (virusTimeout) clearTimeout(virusTimeout);

  document.getElementById('virus-remove-dialog').style.display = 'none';

  // Clean up DOM - remove all possible virus classes from all targets
  const possibleClasses = ['shake-effect', 'invert-effect', 'glitch-effect', 'barrel-roll', 'hue-spin', 'css-less', 'color-downgrade', 'blurry', 'monochrome', 'unrecognizable', 'high-contrast-effect', 'high-brightness-effect', 'big-text-effect'];
  possibleClasses.forEach(cls => removeEffectClass(cls));

  // Clean up Overlays
  document.getElementById('bsod-overlay').style.display = 'none';
  document.getElementById('ransomware-overlay').style.display = 'none';
  document.getElementById('rickroll-overlay').style.display = 'none';
  // Cancel any pending BSOD retry timeout and hide the black-screen flash
  // so the BSOD can't reappear after the system was just "restored"
  if (typeof bsodRetryTimeout !== 'undefined' && bsodRetryTimeout !== null) {
    clearTimeout(bsodRetryTimeout);
    bsodRetryTimeout = null;
  }
  const blackOverlay = document.getElementById('black-overlay');
  if (blackOverlay) blackOverlay.style.display = 'none';
  // stop youtube video
  const iframe = document.querySelector('#rickroll-overlay iframe');
  const tempSrc = iframe.src;
  iframe.src = '';
  iframe.src = tempSrc;

  // Stop flying windows
  activeIntervals.forEach(int => clearInterval(int));
  activeIntervals = [];

  // Clean up user-provided cursor
  const customCursorStyle = document.getElementById('custom-cursor-style');
  if (customCursorStyle) customCursorStyle.textContent = '';
  const cursorInput = document.getElementById('cursor-url');
  if (cursorInput) cursorInput.value = '';

  // Clean up mouse trail (state reset, not toggle, so a desync can't flip it back on)
  if (mouseTrailActive) {
    mouseTrailActive = false;
    document.removeEventListener('mousemove', addTrailDot);
    document.querySelectorAll('.mouse-trail-dot').forEach(function (d) { d.remove(); });
  }

  // Clean up JS-less mode (state reset)
  if (jsLessActive) {
    jsLessActive = false;
    document.body.classList.remove('js-less');
    const notice = document.getElementById('js-less-readme');
    if (notice) notice.style.display = 'none';
  }

  // Clean up accessibility joke effects
  const vgaOverlay = document.getElementById('vga-overlay');
  if (vgaOverlay) { vgaOverlay.style.display = 'none'; vgaEjected = false; }
  if (narratorEnabled) { EnableNarrator(); }
  if (magnifierEnabled) { EnableZoom(); }
  if (bigCursorEnabled) { EnableBigcur(); }
  highContrastEnabled = false;
  highBrightnessEnabled = false;
  bigTextEnabled = false;
  stickyKeysEnabled = false;

  // Reset windows positions
  document.querySelectorAll('.window').forEach(win => {
    // rough reset, or just leave them where they landed
    // win.style.top = '100px'; win.style.left = '100px'; // maybe too aggressive
  });

  alert("System restored.");
}

function removeEffect(effect) {
  removeEffectClass(effect);
}

function keepVirus() {
  document.getElementById('virus-remove-dialog').style.display = 'none';
  scheduleRemovalDialog(30000); // Ask again in 30 seconds
}

// Effect Functions - Now Permanent by default (no setTimeout removal)

function shakeScreen() {
  removeEffectClass('shake-effect');
  // force reflow on all targets so animation restarts
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) void el.offsetWidth;
  });
  addEffectClass('shake-effect');
}

function invertColors() {
  addEffectClass('invert-effect');
}

function barrelRoll() {
  removeEffectClass('barrel-roll');
  // force reflow on all targets so animation restarts
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) void el.offsetWidth;
  });
  addEffectClass('barrel-roll');
}

function hueSpin() {
  removeEffectClass('hue-spin');
  // force reflow on all targets so animation restarts
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) void el.offsetWidth;
  });
  addEffectClass('hue-spin');
}

function cssLess() {
  addEffectClass('css-less');
}

function colorDowngrade() {
  addEffectClass('color-downgrade');
}

function blurScreen() {
  addEffectClass('blurry');
}

function monochrome() {
  addEffectClass('monochrome');
}

function unrecognizable() {
  addEffectClass('unrecognizable');
}

function flyingWindows() {
  const windows = document.querySelectorAll('#desktop-wrapper .window');
  windows.forEach(win => {
    if (win.style.display !== 'none') {
      // const startTop = parseInt(win.style.top) || 100; // not needed if we don't reset automatically
      // const startLeft = parseInt(win.style.left) || 100;
      let angle = Math.random() * Math.PI * 2;
      let speed = 5;

      const animate = () => {
        const currentTop = parseInt(win.style.top) || 0;
        const currentLeft = parseInt(win.style.left) || 0;

        win.style.top = (currentTop + Math.sin(angle) * speed) + 'px';
        win.style.left = (currentLeft + Math.cos(angle) * speed) + 'px';

        if (currentLeft < 0 || currentLeft > window.innerWidth - 200) angle = Math.PI - angle;
        if (currentTop < 0 || currentTop > window.innerHeight - 200) angle = -angle;
      };

      const interval = setInterval(animate, 50);
      activeIntervals.push(interval);
      // Removed the setTimeout that clears it
    }
  });
}

function persistentBSOD() {
  const bsod = document.getElementById('bsod-overlay');
  bsod.style.display = 'flex';
  // BSOD needs to be "impossible to exit".
  // We'll handle the 'click' and 'keydown' at global level or on the element events.
}

let bsodRetryTimeout = null;

function closeBSOD() {
  // User: "Each time you do, the screen goes black and the BSOD reappears again."
  // Flash a full-screen black overlay, wait, then re-show the BSOD.
  const bsod = document.getElementById('bsod-overlay');
  const black = document.getElementById('black-overlay');
  if (!bsod) return;
  // Cancel any in-flight retry so mash-clicks don't stack timeouts
  if (bsodRetryTimeout !== null) {
    clearTimeout(bsodRetryTimeout);
    bsodRetryTimeout = null;
  }
  bsod.style.display = 'none';
  if (black) black.style.display = 'block';
  bsodRetryTimeout = setTimeout(() => {
    bsodRetryTimeout = null;
    if (black) black.style.display = 'none';
    bsod.style.display = 'flex';
  }, 1800);
}

function ransomware() {
  document.getElementById('ransomware-overlay').style.display = 'flex';
}

function rickroll() {
  document.getElementById('rickroll-overlay').style.display = 'block';
}

// Keep multipleAlerts same but rare
function multipleAlerts() {
  // alert("System Error"); // Still annoying to debug with, keeping disabled or rare
}

// Capture Keys for BSOD persistence
document.addEventListener('keydown', function (e) {
  if (jsLessActive) return;
  if (document.getElementById('bsod-overlay').style.display === 'flex') {
    closeBSOD(); // Trigger the fake close loops
    e.preventDefault();
    e.stopPropagation();
  }
});

// THE INTERNET BROWSER
function browserGo() {
  let url = document.getElementById('browser-url').value.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    document.getElementById('browser-url').value = url;
  }

  const iframe = document.getElementById('browser-iframe');
  iframe.src = url;
  document.getElementById('browser-status').textContent = 'Loading...';

  iframe.onload = () => {
    document.getElementById('browser-status').textContent = 'Done';
  };

  iframe.onerror = () => {
    document.getElementById('browser-status').textContent = 'Error loading page';
  };
}

function browserRefresh() {
  const iframe = document.getElementById('browser-iframe');
  iframe.src = iframe.src;
}

function browserBack() {
  // can't actually go back in iframe history from parent, but ig i can try
  try {
    document.getElementById('browser-iframe').contentWindow.history.back();
  } catch (e) {
  }
}

function browserForward() {
  try {
    document.getElementById('browser-iframe').contentWindow.history.forward();
  } catch (e) {
  }
}

// WINDOW INITIALIZATION
let highestZIndex = 10;
document.querySelectorAll('.window').forEach(win => {
  dragElement(win);

  win.addEventListener('mousedown', () => {
    win.style.zIndex = highestZIndex++;
  });
});

function changeWallpaper() {
  var url = document.getElementById('wallpaper-url').value;
  if (url) {
    const wrapper = document.getElementById('desktop-wrapper');
    wrapper.style.backgroundImage = "url('" + url + "')";
    wrapper.style.backgroundSize = "cover";
    wrapper.style.backgroundPosition = "center";
    wrapper.style.backgroundRepeat = "no-repeat";
  }
}