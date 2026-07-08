// States & Inits
const infoEl = $('#info-content');
const navigable = Array.from($$('.entry.item, .divider, .footer span'));
let pointerIdx = navigable.findIndex(el => el.dataset.id === 'url');
if (pointerIdx === -1) pointerIdx = 0;
let selectedDivider = null;

const postInfo = {
    'url': 'You are here. Welcome! (yellow color example)',
    'b1': 'An introduction to what this blog',
    'b2': 'Blue color example. For general topics such as a C:U rambling',
    'b3': 'THE JUEJ SERIES: THE BEGINNING (blog branch test)',
    'b4': 'THE JUEJ SERIES: CHAPTER 1 (better)',
    'b5': 'THE JUEJ SERIES: CHAPTER 2 (even better)',
    'b6': 'Red color example. For important announcements and stuff'
};

// Cache for pointer manipulation
navigable.forEach(el => {
    if (el.classList.contains('entry')) {
        const textNode = el.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const match = textNode.textContent.match(/^( +)/);
            if (match) {
                el.dataset.indent = match[1].length;
                el.dataset.originalText = textNode.textContent;
            }
        }
    }
});

// UI Updates
function updateInfo(active) {
    if (!active) return;
    const id = active.dataset.id;
    
    if (active.classList.contains('divider')) {
        const map = {
            info: 'Info section',
            extra: 'Extra section',
            top: 'Header section',
            middle: 'Main section'
        };
        infoEl.textContent = map[id] || '';
    } else if (id && postInfo[id]) {
        infoEl.textContent = postInfo[id];
    } else if (active.matches('.footer span')) {
        infoEl.textContent = `Button: ${active.textContent.trim()}`;
    }
}

function updatePointer() {
    $$('.divider .diamond').forEach(d => d.textContent = '◇');
    $$('.footer span.selected').forEach(el => el.classList.remove('selected'));
    $$('.entry.item').forEach(el => {
        if (el.dataset.originalText) el.firstChild.textContent = el.dataset.originalText;
    });

    const active = navigable[pointerIdx];
    if (!active) return;

    if (active.classList.contains('divider')) {
        active.querySelector('.diamond').textContent = '> ◇';
    } else if (active.matches('.footer span')) {
        active.classList.add('selected');
    } else if (active.dataset.originalText) {
        active.firstChild.textContent = '>' + active.dataset.originalText.slice(1);
    }
}

function handleEnter() {
    const active = navigable[pointerIdx];
    if (!active) return;

    if (active.classList.contains('divider')) {
        if (selectedDivider === active) {
            selectedDivider = null;
            active.querySelector('.diamond').style.backgroundColor = 'transparent';
        } else {
            if (selectedDivider) selectedDivider.querySelector('.diamond').style.backgroundColor = 'transparent';
            selectedDivider = active;
            active.querySelector('.diamond').style.backgroundColor = 'yellow';
        }
    } else if (active.matches('.footer span')) {
        active.click();
    } else if (active.classList.contains('blog')) {
        window.location.href = '../placeholder/index.html';
    } else {
        alert('Redirecting to placeholder for: ' + active.textContent.trim().replace(/^>\s*/, ''));
    }
}

// Section Resizing & Collapsing
function getTarget(divider) {
    const isAbove = ['top', 'middle'].includes(divider.dataset.id);
    return isAbove ? divider.previousElementSibling : divider.nextElementSibling;
}

function collapseSection(divider) {
    divider.classList.add('collapsed');
    const target = getTarget(divider);
    if (target) target.style.display = 'none';
}

function expandSection(divider) {
    divider.classList.remove('collapsed');
    const target = getTarget(divider);
    if (target) target.style.display = '';
}

function resizeSection(divider, delta) {
    const target = getTarget(divider);
    if (!target) return;

    if (divider.classList.contains('collapsed')) expandSection(divider);

    const currentHeight = target.getBoundingClientRect().height;
    const spacerHeight = $('#spacer-section').getBoundingClientRect().height;
    const maxAvailable = currentHeight + spacerHeight - 10;

    const isAbove = ['top', 'middle'].includes(divider.dataset.id);
    let newHeight = isAbove ? currentHeight + delta : currentHeight - delta;
    newHeight = Math.max(0, Math.min(newHeight, maxAvailable));

    target.style.flex = `0 0 ${newHeight}px`;

    if (newHeight <= 20) collapseSection(divider);
    else expandSection(divider);
}

// Navigation
function findNextVisible(startIdx, direction, dividersOnly = false) {
    let i = startIdx + direction;
    while (i >= 0 && i < navigable.length) {
        const el = navigable[i];
        if (el.offsetParent !== null && (!dividersOnly || el.classList.contains('divider'))) {
            return i;
        }
        i += direction;
    }
    return startIdx;
}

document.addEventListener('keydown', (e) => {
    if (selectedDivider) {
        if (e.key === 'ArrowUp') { resizeSection(selectedDivider, -5); e.preventDefault(); return; }
        if (e.key === 'ArrowDown') { resizeSection(selectedDivider, 5); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft') { collapseSection(selectedDivider); e.preventDefault(); return; }
        if (e.key === 'ArrowRight') { expandSection(selectedDivider); e.preventDefault(); return; }
        if (['Escape', 'Enter', 'z', 'Z'].includes(e.key)) {
            selectedDivider.querySelector('.diamond').style.backgroundColor = 'transparent';
            selectedDivider = null;
            e.preventDefault();
            return;
        }
    }

    // Pointer
    if (e.key === 'ArrowDown') {
        pointerIdx = findNextVisible(pointerIdx, 1, e.altKey);
        updatePointer(); updateInfo(navigable[pointerIdx]); e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        pointerIdx = findNextVisible(pointerIdx, -1, e.altKey);
        updatePointer(); updateInfo(navigable[pointerIdx]); e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        const active = navigable[pointerIdx];
        if (active.classList.contains('parent')) {
            active.dataset.collapsed = 'false';
            $$(`.child[data-parent="${active.dataset.id}"]`).forEach(c => c.style.display = 'block');
            const firstChild = $(`.child[data-parent="${active.dataset.id}"]`);
            if (firstChild) pointerIdx = navigable.indexOf(firstChild);
            updatePointer(); updateInfo(navigable[pointerIdx]);
        }
    } else if (e.key === 'ArrowLeft') {
        const active = navigable[pointerIdx];
        if (active.classList.contains('child')) {
            const parent = $(`[data-id="${active.dataset.parent}"]`);
            if (parent) pointerIdx = navigable.indexOf(parent);
            updatePointer(); updateInfo(navigable[pointerIdx]);
        } else if (active.classList.contains('parent') && active.dataset.collapsed !== 'true') {
            active.dataset.collapsed = 'true';
            $$(`.child[data-parent="${active.dataset.id}"]`).forEach(c => c.style.display = 'none');
        }
    } else if (['Enter', 'z', 'Z'].includes(e.key)) {
        handleEnter();
        e.preventDefault();
    }
});

// Mouse
navigable.forEach((el, idx) => {
    el.addEventListener('click', () => {
        pointerIdx = idx;
        updatePointer();
        updateInfo(el);

        if (el.classList.contains('parent')) {
            el.dataset.collapsed = el.dataset.collapsed === 'true' ? 'false' : 'true';
            const display = el.dataset.collapsed === 'true' ? 'none' : 'block';
            $$(`.child[data-parent="${el.dataset.id}"]`).forEach(c => c.style.display = display);
        } else if (!el.matches('.footer span') && !el.classList.contains('divider')) {
            handleEnter();
        }
    });

    // Hover updates info for blog posts and buttons — but not dividers (click-only for dividers)
    if (!el.classList.contains('divider')) {
        el.addEventListener('mouseenter', () => {
            if (selectedDivider) {
                selectedDivider.querySelector('.diamond').style.backgroundColor = 'transparent';
                selectedDivider = null;
            }
            pointerIdx = idx;
            updatePointer();
            updateInfo(el);
        });
    }
});

// Draggable Dividers
let isDragging = false;
let activeDivider = null;
let startY = 0;
let startHeight = 0;
let startSpacerHeight = 0;

$$('.divider').forEach(div => {
    div.addEventListener('mousedown', (e) => {
        activeDivider = div;
        isDragging = true;
        startY = e.clientY;
        
        const target = getTarget(div);
        if (target) {
            if (div.classList.contains('collapsed')) expandSection(div);
            startHeight = target.getBoundingClientRect().height;
            startSpacerHeight = $('#spacer-section').getBoundingClientRect().height;
        }
        div.style.cursor = 'grabbing';
        e.preventDefault();
    });

    div.addEventListener('dblclick', () => {
        div.classList.contains('collapsed') ? expandSection(div) : collapseSection(div);
    });
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !activeDivider) return;
    const dy = e.clientY - startY;
    const isAbove = ['top', 'middle'].includes(activeDivider.dataset.id);
    const target = getTarget(activeDivider);
    if (!target) return;

    let newHeight = isAbove ? (startHeight + dy) : (startHeight - dy);
    const maxAvailable = startHeight + startSpacerHeight - 10;

    newHeight = Math.max(0, Math.min(newHeight, maxAvailable));
    target.style.flex = `0 0 ${newHeight}px`;

    if (newHeight <= 20) {
        if (!activeDivider.classList.contains('collapsed')) collapseSection(activeDivider);
    } else {
        if (activeDivider.classList.contains('collapsed')) expandSection(activeDivider);
    }
});

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    if (activeDivider) activeDivider.style.cursor = 'grab';
});

// Setup & DOM Sync
const greetings = ["Welcome back", "Hello again", "Good to see you", "Greetings", "Salutations"];
$('.header > :nth-child(2)').textContent = greetings[Math.floor(Math.random() * greetings.length)];

const today = new Date();
const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
$('.header > :nth-child(3)').textContent = dateStr;
$('.header > :nth-child(4)').textContent = `Last updated: ${dateStr}`;

$$('.parent').forEach(p => p.dataset.collapsed = 'true');
updatePointer();

$('.footer span[data-id="btn-filter"]').addEventListener('click', () => alert('Filter clicked'));
$('.footer span[data-id="btn-settings"]').addEventListener('click', () => alert('Settings clicked'));

// Theme button — label reflects current state, click toggles
const lightBtn = $('.footer span[data-id="btn-light"]');
function syncLightLabel() {
  lightBtn.textContent = '[ ' + (document.body.getAttribute('data-theme') === 'light' ? 'Dark' : 'Light') + ' Mode ]';
  if (navigable[pointerIdx] === lightBtn) updateInfo(lightBtn);
}
lightBtn.addEventListener('click', () => { toggleTheme(); syncLightLabel(); });
syncLightLabel();
