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
const output = document.querySelector('#output');

// Add a change event listener to each radio button
radioButtons.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (event.target.checked) {
      const selectedValue = event.target.value;
      if (selectedValue.includes("RM")) {
        let removeEffects = selectedValue.replace("RM-", "");
        removeEffects.forEach(effect => {
          removeEffect(effect);
        });
      }
      if (typeof window[selectedValue] === 'function') {
        window[selectedValue]();
      }
    }
  });
});

function removeEffect(effect) {
  const effectElement = document.getElementById(effect);
  if (effectElement) {
    effectElement.remove();
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
    const link = e.target.closest('a');
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

  // Clean up DOM - remove all possible virus classes
  const wrapper = document.getElementById('desktop-wrapper');
  const possibleClasses = ['shake-effect', 'invert-effect', 'glitch-effect', 'barrel-roll', 'hue-spin', 'css-less', 'color-downgrade', 'blurry', 'monochrome', 'unrecognizable'];
  possibleClasses.forEach(cls => wrapper.classList.remove(cls));

  // Clean up Overlays
  document.getElementById('bsod-overlay').style.display = 'none';
  document.getElementById('ransomware-overlay').style.display = 'none';
  document.getElementById('rickroll-overlay').style.display = 'none';
  // stop youtube video
  const iframe = document.querySelector('#rickroll-overlay iframe');
  const tempSrc = iframe.src;
  iframe.src = '';
  iframe.src = tempSrc;

  // Stop flying windows
  activeIntervals.forEach(int => clearInterval(int));
  activeIntervals = [];

  // Reset windows positions
  document.querySelectorAll('.window').forEach(win => {
    // rough reset, or just leave them where they landed
    // win.style.top = '100px'; win.style.left = '100px'; // maybe too aggressive
  });

  alert("System restored.");
}

function removeEffect(effect) {
  const wrapper = document.getElementById('desktop-wrapper');
  wrapper.classList.remove(effect);
}

function keepVirus() {
  document.getElementById('virus-remove-dialog').style.display = 'none';
  scheduleRemovalDialog(30000); // Ask again in 30 seconds
}

// Effect Functions - Now Permanent by default (no setTimeout removal)

function shakeScreen() {
  document.getElementById('desktop-wrapper').classList.add('shake-effect');
  // kept header animation infinite in CSS? No, it was .5s. 
  // User said "Make the effects permanent".
  // But 'shake' is an animation that ends. To make it permanent, we'd need 'infinite' in CSS.
  // The current CSS for .shake-effect is '0.5s ease-in-out'. It will stop.
  // However, since we call it repeatedly in the loop, it might re-trigger if we toggle it, but we aren't toggling.
  // Let's assume for 'shake' re-triggering isn't the main goal, but stacking other filters is.
  // If we want persistent shake, we should update CSS to infinite. 
  // But I won't touch CSS again unless critical.
}

function invertColors() {
  document.getElementById('desktop-wrapper').classList.add('invert-effect');
}

function barrelRoll() {
  document.getElementById('desktop-wrapper').classList.add('barrel-roll');
}

function hueSpin() {
  document.getElementById('desktop-wrapper').classList.add('hue-spin');
}

function cssLess() {
  document.getElementById('desktop-wrapper').classList.add('css-less');
}

function colorDowngrade() {
  document.getElementById('desktop-wrapper').classList.add('color-downgrade');
}

function blurScreen() {
  document.getElementById('desktop-wrapper').classList.add('blurry');
}

function monochrome() {
  document.getElementById('desktop-wrapper').classList.add('monochrome');
}

function unrecognizable() {
  document.getElementById('desktop-wrapper').classList.add('unrecognizable');
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

function closeBSOD() {
  // This function was originally called by onclick. Now we want to restart it.
  // User: "Each time you do, the screen goes black and the BSOD reappears again."
  const bsod = document.getElementById('bsod-overlay');
  bsod.style.display = 'none'; // Flash black (hide bsod reveal desktop background or something?)
  // actually body background is teal. 
  // to make it "screen goes black", we can flash a black div or just re-show BSOD instantly.

  setTimeout(() => {
    bsod.style.display = 'flex';
  }, 100);
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
    document.body.style.backgroundImage = "url('" + url + "')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
  }
}