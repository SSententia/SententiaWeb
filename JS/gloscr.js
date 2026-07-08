/* Global scripts */

/* Shorthand selectors — $ for one, $$ for all */
var $  = (sel, root) => (root || document).querySelector(sel);
var $$ = (sel, root) => (root || document).querySelectorAll(sel);

/* Escape text for safe insertion as HTML */
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* Shuffle fuction that returns a new array*/
function shuffleArray(arr) {
  var a = [...arr];
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Theme toggle
   Pages declare their default theme via data-theme on <body> in HTML.
   toggleTheme() flips between dark and light and persists to localStorage.
   Use with id="modeToggle
   */
function toggleTheme() {
  var current = document.body.getAttribute('data-theme') || 'light';
  var next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

(function initTheme() {
  var saved = localStorage.getItem('theme');
  if (saved) document.body.setAttribute('data-theme', saved);
  var toggle = document.getElementById('modeToggle');
  if (toggle) toggle.addEventListener('click', toggleTheme);
})();
