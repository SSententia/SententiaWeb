// GLOBAL MOUSE SOUNDS
document.addEventListener('pointerdown', function (e) {
  if (jsLessActive) return;
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
  if (jsLessActive) return;
  const releaseSound = document.getElementById('release-sound');
  if (releaseSound) {
    releaseSound.currentTime = 0;
    releaseSound.volume = globalVolume;
    releaseSound.play().catch(() => { });
  }
});

// URL FRAGMENT
if (location.hash === '#navigation') openWindow('navigation-window');

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

// FILTER STACKING
function addFilterEffect(cls) {
  addEffectClass(cls);
}

function removeFilterEffect(cls) {
  removeEffectClass(cls);
}

const FILTER_CLASSES = ['color-downgrade', 'monochrome', 'invert-effect'];

radioButtons.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (!event.target.checked) return;

    const removeAttr = event.target.getAttribute('data-remove');
    if (removeAttr) {
      removeAttr.split(/\s+/).forEach(cls => {
        if (cls === 'js-less') toggleJSLess(false);
        else if (cls && FILTER_CLASSES.includes(cls)) removeFilterEffect(cls);
        else if (cls) removeEffectClass(cls);
      });
    }

    const effectAttr = event.target.getAttribute('data-effect');
    if (effectAttr) {
      if (effectAttr === 'js-less') toggleJSLess(true);
      else if (FILTER_CLASSES.includes(effectAttr)) addFilterEffect(effectAttr);
      else addEffectClass(effectAttr);
    }
  });
});

// KEYBOARD MOUSE POINTER
const keyboardMouse = {
  enabled: false,
  cursorEl: null,
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

function setMouseWarning(msg) {
  const el = document.getElementById('mouse-warning');
  if (!el) return;
  if (!msg) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = 'red';
}

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
  setMouseWarning("Device 'device:mouse' conflicts with 'device:typing'!");
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
  setMouseWarning('');
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
    // Dispatch pointermove on document while drag key is held
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

let vgaEjected = false;
let vgaEjectTimeout = null;
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
    document.body.appendChild(overlay);
  }
  if (vgaEjected) {
    // Flash 1-bit color briefly before blanking the screen
    if (vgaEjectTimeout !== null) {
      clearTimeout(vgaEjectTimeout);
      vgaEjectTimeout = null;
    }
    addFilterEffect('monochrome');
    overlay.style.display = 'none';
    vgaEjectTimeout = setTimeout(() => {
      vgaEjectTimeout = null;
      if (vgaEjected) overlay.style.display = 'flex';
    }, 300);
  } else {
    if (vgaEjectTimeout !== null) {
      clearTimeout(vgaEjectTimeout);
      vgaEjectTimeout = null;
    }
    removeFilterEffect('monochrome');
    overlay.style.display = 'none';
  }
}

// NARRATOR
function EnableNarrator() {
  narratorEnabled = !narratorEnabled;
  if (!narratorAudio) {
    narratorAudio = document.createElement('audio');
    narratorAudio.loop = true;
    narratorAudio.preload = 'auto';
    // !! replace with link
    narratorAudio.src = '../EXTERNAL/MEDIA/HELP/narrator.mp3';
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
  var dialog = document.getElementById('sticky-keys-dialog');
  if (dialog) {
    if (!dialog.style.top) {
      dialog.style.top = Math.floor((window.innerHeight - 200) / 2) + 'px';
      dialog.style.left = Math.floor((window.innerWidth - 350) / 2) + 'px';
    }
    dialog.style.display = 'block';
    dialog.style.zIndex = highestZIndex++;
  }
}

function activateStickyKeys() {
  stickyKeysEnabled = true;
  stickyKeysDialogShown = false;
  var dialog = document.getElementById('sticky-keys-dialog');
  if (dialog) dialog.style.display = 'none';
  if (!stickyKeysSound) {
    stickyKeysSound = document.createElement('audio');
    stickyKeysSound.preload = 'auto';
    // !! Replace with link
    stickyKeysSound.src = '../EXTERNAL/MEDIA/HELP/splat.mp3';
    document.body.appendChild(stickyKeysSound);
  }
  stickyKeysSound.volume = globalVolume;
}

function dismissStickyKeys() {
  stickyKeysDialogShown = false;
  var dialog = document.getElementById('sticky-keys-dialog');
  if (dialog) dialog.style.display = 'none';
}

// Track repeated key presses for Sticky Keys
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
    addFilterEffect('high-contrast-effect');
  } else {
    removeFilterEffect('high-contrast-effect');
  }
}

// HIGH BRIGHTNESS
function EnableHibrig() {
  highBrightnessEnabled = !highBrightnessEnabled;
  if (highBrightnessEnabled) {
    addFilterEffect('high-brightness-effect');
  } else {
    removeFilterEffect('high-brightness-effect');
  }
}

// BIG TEXT
function EnableBigtxt() {
  bigTextEnabled = !bigTextEnabled;
  if (bigTextEnabled) {
    addFilterEffect('big-text-effect');
  } else {
    removeFilterEffect('big-text-effect');
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

function setCursorWarning(msg, isError) {
  const el = document.getElementById('cursor-warning');
  if (!el) return;
  if (!msg) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  el.textContent = msg;
  el.style.display = 'block';
  el.style.color = isError ? 'red' : '#006400';
}

function applyCursorStyle(url) {
  let style = document.getElementById('custom-cursor-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-cursor-style';
    document.head.appendChild(style);
  }
  // Escape backslash, single-quote, and double-quote so the URL can't break out of url('…').
  const safeUrl = url.replace(/[\\'"]/g, '\\$&');
  style.textContent =
    "html, body, button, a, input, select, textarea, [role=\"tab\"], " +
    ".desktop-icon, .title-bar, .window, .window-body, .field-border, p, span " +
    "{ cursor: url('" + safeUrl + "') 0 0, auto !important; }";
}

function changeCursor() {
  const input = document.getElementById('cursor-url');
  const url = input ? input.value.trim() : '';
  if (!url) {
    const style = document.getElementById('custom-cursor-style');
    if (style) style.textContent = '';
    setCursorWarning('');
    return;
  }
  // Pre-validate by trying to load the URL as an image. If it doesn't load,
  const tester = new Image();
  tester.onload = function () {
    applyCursorStyle(url);
    const w = tester.naturalWidth, h = tester.naturalHeight;
    if (w > 128 || h > 128) {
      setCursorWarning(
        'Loaded (' + w + 'x' + h + '), but browsers limit cursor images to 128x128. ' +
        'It may be silently ignored — try a smaller image.',
        true
      );
    } else {
      setCursorWarning('Cursor applied (' + w + 'x' + h + ').', false);
    }
  };
  tester.onerror = function () {
    const style = document.getElementById('custom-cursor-style');
    if (style) style.textContent = '';
    setCursorWarning(
      'Could not load "' + url + '". ' +
      'Check the URL, CORS, or use a .cur/.png/.svg under 128x128.',
      true
    );
  };
  tester.src = url;
}

// MOUSE TRAIL
let mouseTrailActive = false;

function getTrailCursorUrl() {
  var style = document.getElementById('custom-cursor-style');
  if (style && style.textContent) {
    var m = style.textContent.match(/url\(["'](.+?)["']\)/);
    if (m) return m[1];
  }
  return CURSOR_STATES.normal;
}

function Mousetrail() {
  mouseTrailActive = !mouseTrailActive;
  if (mouseTrailActive) {
    document.addEventListener('mousemove', addTrailDot);
  } else {
    document.removeEventListener('mousemove', addTrailDot);
    document.querySelectorAll('.mouse-trail-dot').forEach(function (d) { d.remove(); });
  }
}

function addTrailDot(e) {
  if (!mouseTrailActive) return;
  if (jsLessActive) return;
  if (e.target && e.target.closest && e.target.closest('input, textarea, select, button')) return;
  var dot = document.createElement('div');
  dot.className = 'mouse-trail-dot';
  dot.style.left = e.clientX + 'px';
  dot.style.top = e.clientY + 'px';
  dot.style.backgroundImage = 'url("' + getTrailCursorUrl() + '")';
  document.body.appendChild(dot);
  setTimeout(function () {
    dot.classList.add('trail-fade');
    setTimeout(function () { dot.remove(); }, 650);
  }, 30);
}

// JS-LESS
let jsLessActive = false;

function toggleJSLess(on) {
  jsLessActive = !!on;
  if (on) {
    document.body.classList.add('js-less');
    let notice = document.getElementById('js-less-readme');
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

  // Confirmation step
  if (stepBanner.style.display !== 'none') {
    stepBanner.style.display = 'none';
    stepConfirm.style.display = 'block';
    backBtn.style.display = 'inline-block';
    return;
  }

  if (progressBar && bogolProgressInterval === null) {
    nextBtn.disabled = true;
    backBtn.disabled = true;
    if (bogolWindow) {
      const closeBtn = bogolWindow.querySelector('.title-bar-controls button[aria-label="Close"]');
      if (closeBtn) closeBtn.style.display = 'none';
    }
    keyboardMouse.forcedState = 'wait';
    bogolProgressInterval = setInterval(() => animateBogolProgress(progressBar), 120);
  }
}

function bogolBack() {
  const stepBanner = document.getElementById('bogol-step-banner');
  const stepConfirm = document.getElementById('bogol-step-confirm');
  const backBtn = document.getElementById('bogol-back-btn');
  const progressBar = document.getElementById('bogol-progress-bar');

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
    // 5-15%
    increment = Math.random() * 10 + 5;
  } else if (current < 90) {
    // 2-7%
    increment = Math.random() * 5 + 2;
  } else if (current < 99) {
    // 0.3-1.5%
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

  // Update all audio and video elements
  document.querySelectorAll('audio, video').forEach(media => {
    media.volume = globalVolume;
  });

  // Keep narrator and sticky-keys audio in sync
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
  // Reset simulated browser history and iframe when closing the internet window
  if (windowDiv && windowDiv.id === 'internet-window') {
    browserHistory = [];
    browserHistoryIndex = -1;
    const iframe = document.getElementById('browser-iframe');
    if (iframe) {
      const homeSrc = iframe.getAttribute('src');
      try {
        // location.replace() avoids adding a real joint-history entry on
        // close, same as every other simulated-browser navigation below.
        iframe.contentWindow.location.replace(homeSrc);
      } catch (e) {
        iframe.src = homeSrc;
      }
    }
    const urlBar = document.getElementById('browser-url');
    if (urlBar) urlBar.value = urlBar.getAttribute('value');
    const status = document.getElementById('browser-status');
    if (status) status.textContent = 'Done';
    browserUpdateNavButtons();
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
    setTimeout(() => {
      windowDiv.style.display = 'block';
    }, 98)
    windowDiv.style.zIndex = highestZIndex++;

    if (windowId === 'duck-window' || windowId === 'folder-window') {
      if (!windowDiv.style.top || windowDiv.style.top === '25vh') {
        windowDiv.style.top = '100px';
        windowDiv.style.left = '150px';
      }
    }

    // Infinite scroll init
    if (windowId === 'trash-window') {
      initializeTrash();
    }

    // Seed the simulated browser history on first open
    if (windowId === 'internet-window' && browserHistory.length === 0) {
      const initialUrl = document.getElementById('browser-url').value.trim();
      if (initialUrl) {
        browserHistory.push(initialUrl);
        browserHistoryIndex = 0;
        browserUpdateNavButtons();
      }
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
    header.ondblclick = toggleMaximize;
  } else {
    return;
  }

  // ponytail: dblclick title-bar toggles maximized. Rectangles stored on
  // the element itself — cheapest place to keep per-window snapshot state.
  function toggleMaximize() {
    if (elmnt.style.display === 'none') return;
    if (elmnt.dataset.maximized === '1') {
      elmnt.style.top = elmnt.dataset.prevTop;
      elmnt.style.left = elmnt.dataset.prevLeft;
      elmnt.style.width = elmnt.dataset.prevWidth;
      elmnt.style.height = elmnt.dataset.prevHeight;
      elmnt.style.position = 'absolute';
      delete elmnt.dataset.maximized;
      delete elmnt.dataset.prevTop;
    } else {
      elmnt.dataset.prevTop = elmnt.style.top;
      elmnt.dataset.prevLeft = elmnt.style.left;
      elmnt.dataset.prevWidth = elmnt.style.width;
      elmnt.dataset.prevHeight = elmnt.style.height;
      elmnt.style.top = '0';
      elmnt.style.left = '0';
      elmnt.style.width = window.innerWidth + 'px';
      elmnt.style.height = (window.innerHeight - 28) + 'px'; // 28 = taskbar
      elmnt.style.position = 'absolute';
      elmnt.dataset.maximized = '1';
    }
    elmnt.style.zIndex = highestZIndex++;
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

// ponytail: corner-handle resize. Mirrors dragElement — same pointer-event
// model, so it works identically on touch and mouse. One edge handle would
// be enough; we add all eight because eight is the same ~30 lines and users
// expect Win9x edge resize. Clamp to min sizes + viewport; not animating
// because cheap drag is better than a smooth-looking janky one.
function makeResizable(win) {
  var HIT = 6; // ponytail: px-thick edge grab band; tuned for finger + still precise with mouse
  win.style.boxSizing = 'border-box';
  win.addEventListener('pointerdown', function (e) {
    if (jsLessActive) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('.title-bar-controls')) return;
    var r = win.getBoundingClientRect();
    var fromLeft = e.clientX - r.left;
    var fromTop = e.clientY - r.top;
    var fromRight = r.right - e.clientX;
    var fromBottom = r.bottom - e.clientY;
    var edge = null;
    if (fromTop < HIT) edge = (fromLeft < HIT) ? 'nw' : (fromRight < HIT) ? 'ne' : 'n';
    else if (fromBottom < HIT) edge = (fromLeft < HIT) ? 'sw' : (fromRight < HIT) ? 'se' : 's';
    else if (fromLeft < HIT) edge = 'w';
    else if (fromRight < HIT) edge = 'e';
    if (!edge) return;

    // Only consider visible windows for sizing caps — hidden ones have junk rects
    if (win.style.display === 'none') return;

    e.preventDefault();
    var startX = e.clientX, startY = e.clientY;
    var startW = r.width, startH = r.height;
    var startLeft = win.offsetLeft, startTop = win.offsetTop;
    var minW = 180, minH = 100, maxZ = 9999;

    // use pointer capture so the handle stays coherent if the cursor
    // outruns it (pointer capture beats document-level onmove here)
    if (win.setPointerCapture) {
      try { win.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onMove(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      var newW = startW, newH = startH, newLeft = startLeft, newTop = startTop;
      if (edge.indexOf('e') !== -1) newW = startW + dx;
      if (edge.indexOf('s') !== -1) newH = startH + dy;
      if (edge.indexOf('w') !== -1) { newW = startW - dx; newLeft = startLeft + dx; }
      if (edge.indexOf('n') !== -1) { newH = startH - dy; newTop = startTop + dy; }

      newW = Math.max(minW, Math.min(newW, window.innerWidth - newLeft - 2));
      newH = Math.max(minH, Math.min(newH, window.innerHeight - newTop - 28)); // ponytail: 28 = taskbar
      // dragging n/w past the min size inverts — clamp back if so
      if (newW <= minW && edge.indexOf('w') !== -1) { newLeft = startLeft + startW - minW; newW = minW; }
      if (newH <= minH && edge.indexOf('n') !== -1) { newTop = startTop + startH - minH; newH = minH; }

      win.style.width = newW + 'px';
      win.style.height = newH + 'px';
      win.style.left = newLeft + 'px';
      win.style.top = newTop + 'px';
    }
    function onUp(ev) {
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onUp);
      if (win.releasePointerCapture && ev && ev.pointerId !== undefined) {
        try { win.releasePointerCapture(ev.pointerId); } catch (_) {}
      }
    }
    win.addEventListener('pointermove', onMove);
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onUp);
  });
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
    // Assume video for unknown
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
        <img src="LOCAL/MEDIA/HELP/file.ico">
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

  // Infinite scroll
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
  makeResizable(newWindow);

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
  if (virusEffectActive) return;
  virusEffectActive = true;

  // Start the infinite loop of chaos
  startVirusLoop();

  scheduleRemovalDialog(10000);
}

function startVirusLoop() {
  randomVirusEffect();

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
    EnableHicon,
    EnableHibrig,
    EnableBigtxt,
    EnableBigcur,
    EnableNarrator,
    EnableZoom,
    EnableSticky,
    // overlay effects - lower chance?
    ransomware,
    rickroll,
    Blackscreen,
    persistentBSOD
  ];

  let selectedEffect;
  const r = Math.random();
  if (r < 0.05) {
    selectedEffect = persistentBSOD;
  } else if (r < 0.1) {
    selectedEffect = ransomware;
  } else if (r < 0.15) {
    selectedEffect = rickroll;
  } else {
    // Filter out overlays from main pool
    const safeEffects = effects.filter(e => e !== persistentBSOD && e !== ransomware && e !== rickroll && e !== Blackscreen);
    selectedEffect = safeEffects[Math.floor(Math.random() * safeEffects.length)];
  }

  selectedEffect();
}

function scheduleRemovalDialog(delay) {
  if (virusTimeout) clearTimeout(virusTimeout);
  virusTimeout = setTimeout(() => {
    const dialog = document.getElementById('virus-remove-dialog');
    dialog.style.display = 'block';
    dialog.style.zIndex = 20000; // !! above everything else
  }, delay);
}

function removeVirus() {
  virusEffectActive = false;
  if (virusInterval) clearInterval(virusInterval);
  if (virusTimeout) clearTimeout(virusTimeout);

  document.getElementById('virus-remove-dialog').style.display = 'none';

  // Clean up DOM
  const effectClasses = ['shake-effect', 'glitch-effect', 'barrel-roll', 'hue-spin', 'css-less', 'unrecognizable'];
  effectClasses.forEach(cls => removeEffectClass(cls));
  const filterClasses = ['invert-effect', 'color-downgrade', 'blurry', 'monochrome'];
  filterClasses.forEach(cls => removeFilterEffect(cls));

  // Clean up Overlays
  document.getElementById('bsod-overlay').style.display = 'none';
  document.getElementById('ransomware-overlay').style.display = 'none';
  document.getElementById('rickroll-overlay').style.display = 'none';
  if (typeof bsodRetryTimeout !== 'undefined' && bsodRetryTimeout !== null) {
    clearTimeout(bsodRetryTimeout);
    bsodRetryTimeout = null;
  }
  const blackOverlay = document.getElementById('black-overlay');
  if (blackOverlay) blackOverlay.style.display = 'none';

  // Stop youtube video
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

  // Clear in-Settings warning lines so a previous error doesn't linger
  setCursorWarning('');
  setMouseWarning('');

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
  if (vgaEjectTimeout !== null) {
    clearTimeout(vgaEjectTimeout);
    vgaEjectTimeout = null;
  }
  removeFilterEffect('monochrome');
  const vgaOverlay = document.getElementById('vga-overlay');
  if (vgaOverlay) { vgaOverlay.style.display = 'none'; vgaEjected = false; }
  if (narratorEnabled) { EnableNarrator(); }
  if (magnifierEnabled) { EnableZoom(); }
  if (bigCursorEnabled) { EnableBigcur(); }
  if (highContrastEnabled) { EnableHicon(); }
  if (highBrightnessEnabled) { EnableHibrig(); }
  if (bigTextEnabled) { EnableBigtxt(); }
  stickyKeysEnabled = false;

  // Reset windows positions
  document.querySelectorAll('.window').forEach(win => {
    // rough reset, or just leave them where they landed
  });

  alert("System restored.");
}

function removeEffect(effect) {
  removeEffectClass(effect);
}

function keepVirus() {
  document.getElementById('virus-remove-dialog').style.display = 'none';
  scheduleRemovalDialog(30000);
}

function shakeScreen() {
  removeEffectClass('shake-effect');
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) void el.offsetWidth;
  });
  addEffectClass('shake-effect');
}

function invertColors() {
  addFilterEffect('invert-effect');
}

function barrelRoll() {
  removeEffectClass('barrel-roll');
  EFFECT_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) void el.offsetWidth;
  });
  addEffectClass('barrel-roll');
}

function hueSpin() {
  removeEffectClass('hue-spin');
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
  addFilterEffect('color-downgrade');
}

function blurScreen() {
  addFilterEffect('blurry');
}

function monochrome() {
  addFilterEffect('monochrome');
}

function unrecognizable() {
  addEffectClass('unrecognizable');
}

function flyingWindows() {
  const windows = document.querySelectorAll('#desktop-wrapper .window');
  windows.forEach(win => {
    if (win.style.display !== 'none') {
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
    }
  });
}

function persistentBSOD() {
  const bsod = document.getElementById('bsod-overlay');
  bsod.style.display = 'flex';
}

let bsodRetryTimeout = null;

function closeBSOD() {
  const bsod = document.getElementById('bsod-overlay');
  const black = document.getElementById('black-overlay');
  if (!bsod) return;
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

document.addEventListener('keydown', function (e) {
  if (jsLessActive) return;
  if (document.getElementById('bsod-overlay').style.display === 'flex') {
    closeBSOD();
    e.preventDefault();
    e.stopPropagation();
  }
});

// THE INTERNET BROWSER
// Simulated browser history — completely independent of window.history.
// Uses location.replace() so no entries are ever added to the shared
// joint-session history that real back/forward buttons walk through.
let browserHistory = [];
let browserHistoryIndex = -1;

let browserLoadTimeout = null;
let pendingUserUrl = null;

/** Navigate the iframe to url without creating a shared-history entry. */
function browserLoadUrl(url) {
  const iframe = document.getElementById('browser-iframe');
  const statusEl = document.getElementById('browser-status');
  statusEl.textContent = 'Loading...';

  if (browserLoadTimeout) { clearTimeout(browserLoadTimeout); browserLoadTimeout = null; }

  try {
    // location.replace() swaps the document without creating a
    // shared-history entry, so real back/forward never sees it.
    iframe.contentWindow.location.replace(url);
  } catch (e) {
    // Cross-origin fallback — .replace() is blocked, so set .src
    // instead. This does create a shared-history entry, but it's
    // unavoidable for cross-origin URLs.
    iframe.src = url;
  }

  iframe.onload = () => {
    if (browserLoadTimeout) { clearTimeout(browserLoadTimeout); browserLoadTimeout = null; }
    statusEl.textContent = 'Done';

    // Detect the actual URL after any redirects (same-origin only)
    let loadedUrl;
    try {
      loadedUrl = iframe.contentWindow.location.href;
    } catch (e) {
      loadedUrl = url;
    }

    const urlBar = document.getElementById('browser-url');
    if (loadedUrl !== urlBar.value) {
      urlBar.value = loadedUrl;
    }

    // Update history: add the loaded URL if it's not the current entry
    // (handles same-origin redirects and iframe-initiated navigations).
    // Skip if we can tell this is a back/forward/reload (URL matches
    // an existing history entry near the current index).
    const isExistingEntry =
      browserHistoryIndex >= 0 &&
      loadedUrl === browserHistory[browserHistoryIndex];

    if (!isExistingEntry) {
      if (pendingUserUrl) {
        // User typed URL — truncate forward history and add
        browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
        browserHistory.push(loadedUrl);
        browserHistoryIndex = browserHistory.length - 1;
      } else {
        // Iframe-initiated navigation (link click, JS redirect, etc.)
        // Only add if it's genuinely new (not a back/forward/reload)
        const isInHistory = browserHistory.indexOf(loadedUrl);
        if (isInHistory === -1) {
          browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
          browserHistory.push(loadedUrl);
          browserHistoryIndex = browserHistory.length - 1;
        } else {
          browserHistoryIndex = isInHistory;
        }
      }
      pendingUserUrl = null;
    }

    browserUpdateNavButtons();
  };

  iframe.onerror = () => {
    if (browserLoadTimeout) { clearTimeout(browserLoadTimeout); browserLoadTimeout = null; }
    statusEl.textContent = 'Error loading page';
    pendingUserUrl = null;
    browserUpdateNavButtons();
  };

  // Timeout so status bar doesn't stay 'Loading...' forever
  browserLoadTimeout = setTimeout(() => {
    browserLoadTimeout = null;
    if (statusEl.textContent === 'Loading...') statusEl.textContent = 'Done';
    browserUpdateNavButtons();
  }, 15000);
}

/** Shared entry point for any "user typed/clicked a destination" navigation. */
function browserNavigateTo(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  document.getElementById('browser-url').value = url;
  pendingUserUrl = url;
  browserLoadUrl(url);
  browserUpdateNavButtons();
}

function browserGo() {
  const url = document.getElementById('browser-url').value.trim();
  if (url) browserNavigateTo(url);
}

// Intercept link clicks inside the embedded page itself (not just the Go/
// Back/Forward toolbar) so browsing by clicking around also goes through
// location.replace() instead of a native link navigation. Native navigation
// inside the iframe is still a normal "push" as far as the real browser is
// concerned, so left alone it can add an entry to the real joint history -
// same bug, just triggered by a click instead of the toolbar.
// This only works for same-origin content: cross-origin pages can't be
// scripted from here at all (that's the same-origin policy working as
// intended), so links on a truly external site are outside what any
// parent-page JS can fix.
document.getElementById('browser-iframe').addEventListener('load', function () {
  let doc;
  try {
    doc = this.contentDocument;
  } catch (e) {
    return; // cross-origin - nothing we're allowed to touch
  }
  if (!doc) return;

  doc.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.toLowerCase().startsWith('javascript:')) return;
    e.preventDefault();
    browserNavigateTo(link.href);
  }, true);
}, true);

function browserRefresh() {
  if (browserHistoryIndex >= 0) {
    // Reload current entry without modifying history
    browserLoadUrl(browserHistory[browserHistoryIndex]);
  }
}

function browserGoStep(delta) {
  const newIndex = browserHistoryIndex + delta;
  if (newIndex >= 0 && newIndex < browserHistory.length) {
    pendingUserUrl = null; // cancel any in-flight user navigation
    browserHistoryIndex = newIndex;
    browserLoadUrl(browserHistory[browserHistoryIndex]);
    browserUpdateNavButtons();
  }
}

function browserBack() { browserGoStep(-1); }
function browserForward() { browserGoStep(1); }

function browserUpdateNavButtons() {
  const backBtn = document.querySelector('#internet-window .browser-toolbar button:first-child');
  const fwdBtn = document.querySelector('#internet-window .browser-toolbar button:nth-child(2)');
  if (backBtn) backBtn.disabled = browserHistoryIndex <= 0;
  if (fwdBtn) fwdBtn.disabled = browserHistoryIndex >= browserHistory.length - 1;
}

// WINDOW INITIALIZATION
let highestZIndex = 10;
document.querySelectorAll('.window').forEach(win => {
  dragElement(win);
  makeResizable(win);

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