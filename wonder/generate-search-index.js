/**
 * *inhales* basically:
 *   -scans the wonder/ directory for child page folders,
 *   -reads each index.html, extracts title & body text,
 *   -writes search-index.json to wonder/search-index.json.
 * 
 * usage: node wonder/generate-search-index.js
 *   (run from the SententiaWeb root directory)
 */

const fs = require('fs');
const path = require('path');
const SKIP_DIRS = new Set(['MEDIA', 'search']);
const wonderDir = __dirname;
const outputPath = path.join(wonderDir, 'search-index.json');

// Extract text content between two simple HTML markers.

function extractTagContent(html, tag) {
  const openPattern = new RegExp(`<${tag}[^>]*>`, 'i');
  const closePattern = new RegExp(`</${tag}>`, 'i');
  const openMatch = html.match(openPattern);
  const closeMatch = html.match(closePattern);
  if (openMatch && closeMatch) {
    const start = openMatch.index + openMatch[0].length;
    const end = closeMatch.index;
    return html.substring(start, end).trim();
  }
  return '';
}

// Strip all HTML tags and collapse whitespace.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // Remove script blocks
    .replace(/<style[\s\S]*?<\/style>/gi, '')     // Remove style blocks
    .replace(/<[^>]+>/g, ' ')                     // Strip tags
    .replace(/&[a-z]+;/gi, ' ')                   // Strip HTML entities
    .replace(/\s+/g, ' ')                         // Collapse whitespace
    .trim();
}

// Extract the body text from an HTML string.
function extractBodyText(html) {
  const bodyContent = extractTagContent(html, 'body');
  return stripHtml(bodyContent || html);
}

// Main
const entries = fs.readdirSync(wonderDir, { withFileTypes: true });
const pages = [];

for (const entry of entries) {
  // Skip the non-directories, exclusion list, and hidden dirs
  if (!entry.isDirectory()) continue;
  if (SKIP_DIRS.has(entry.name)) continue;
  if (entry.name.startsWith('.')) continue;

  const indexPath = path.join(wonderDir, entry.name, 'index.html');

  // Only process if index exists
  if (!fs.existsSync(indexPath)) continue;

  const html = fs.readFileSync(indexPath, 'utf-8');
  const title = extractTagContent(html, 'title') || entry.name;
  const body = extractBodyText(html);

  pages.push({
    id: entry.name,
    title: title,
    body: body,
    url: `/wonder/${entry.name}`
  });
}

// Sort alphabetically by id
pages.sort((a, b) => a.id.localeCompare(b.id));

// Write
fs.writeFileSync(outputPath, JSON.stringify(pages, null, 2), 'utf-8');

console.log(`✓ Generated search-index.json with ${pages.length} page(s):`);
pages.forEach(p => console.log(`  - ${p.id}: "${p.title}"`));
