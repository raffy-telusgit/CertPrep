// Run with: node scripts/splitOptionExplanations.mjs
//
// Reads src/data/questions/gcp-pcde.json and src/data/questions/sc-900.json.
// Splits each question's `explanation` into per-option rationales and an optional preamble.
// Writes `optionExplanations` and `explanationPreamble` fields to each question.
// Idempotent: skips questions that already have optionExplanations with correct length.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BANK_FILES = [
  'gcp-pcde.json',
  'sc-900.json',
];

/**
 * Detect indentation from the second line of a JSON string.
 * @param {string} jsonText
 * @returns {number} number of leading spaces (2 or 4)
 */
function detectIndent(jsonText) {
  const lines = jsonText.split('\n');
  if (lines.length < 2) return 2;
  const secondLine = lines[1];
  const match = secondLine.match(/^(\s+)/);
  if (!match) return 2;
  return match[1].length;
}

/**
 * Split explanation into preamble + per-option chunks.
 * Primary marker regex: (^|\s)Option\s+([A-D])\s+(?:is|as)\b
 * Fallback marker regex: (^|\s)Option\s+([A-D])\s+\w+ (any verb after letter)
 * Each chunk includes its leading "Option X …" prefix.
 *
 * @param {string} explanation
 * @returns {{ preamble: string, chunks: Record<string, string> }}
 */
function splitExplanation(explanation) {
  // We split on the marker boundaries, keeping the delimiter in the result.
  // Strategy: find all marker positions, then slice between them.

  // Primary regex — specific "is" or "as" verb (architect spec)
  const primaryRe = /(?:^|(?<=\s))Option\s+([A-D])\s+(?:is|as)\b/g;

  // Fallback regex — any single word following "Option X " (broadens to works/helps/describes/etc.)
  const fallbackRe = /(?:^|(?<=\s))Option\s+([A-D])\s+\w+/g;

  // Try primary first
  let markerRe = primaryRe;
  let matches = [];
  let m;
  while ((m = markerRe.exec(explanation)) !== null) {
    matches.push({ index: m.index, letter: m[1], fullMatch: m[0] });
  }

  // If primary doesn't find all four letters, try fallback
  const foundLetters = new Set(matches.map(match => match.letter));
  if (foundLetters.size < 4) {
    matches = [];
    markerRe = fallbackRe;
    while ((m = markerRe.exec(explanation)) !== null) {
      matches.push({ index: m.index, letter: m[1], fullMatch: m[0] });
    }
  }

  if (matches.length === 0) {
    return { preamble: explanation.trim(), chunks: {} };
  }

  // Preamble: text before the first marker
  const preamble = explanation.slice(0, matches[0].index).trim();

  const chunks = {};
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : explanation.length;
    const chunk = explanation.slice(start, end).trim();
    const letter = matches[i].letter;
    chunks[letter] = chunk;
  }

  return { preamble, chunks };
}

/**
 * Validate and build optionExplanations array (length 4, A→0 B→1 C→2 D→3).
 * Returns null if any letter is missing or duplicated.
 *
 * @param {Record<string, string>} chunks
 * @returns {string[] | null}
 */
function buildOptionExplanations(chunks) {
  const letters = ['A', 'B', 'C', 'D'];
  const result = [];
  for (const letter of letters) {
    if (!(letter in chunks)) return null;
    result.push(chunks[letter]);
  }
  return result;
}

function processBank(filename) {
  const filePath = join(__dirname, '..', 'src', 'data', 'questions', filename);
  const rawBuffer = readFileSync(filePath);
  // Strip UTF-8 BOM (EF BB BF) if present, then decode
  const hasBom = rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF;
  const rawText = hasBom ? rawBuffer.slice(3).toString('utf-8') : rawBuffer.toString('utf-8');
  const indent = detectIndent(rawText);
  const bank = JSON.parse(rawText);
  const questions = bank.questions;

  let parsed = 0;
  let skipped = 0;
  const skippedIds = [];

  // Dry-run pass: validate all questions
  const results = questions.map((q) => {
    // Idempotent check
    if (Array.isArray(q.optionExplanations) && q.optionExplanations.length === q.options.length) {
      parsed++;
      return { action: 'already-done', q };
    }

    const { preamble, chunks } = splitExplanation(q.explanation);
    const optionExplanations = buildOptionExplanations(chunks);

    if (optionExplanations === null) {
      skipped++;
      skippedIds.push(q.id);
      return { action: 'skip', q, preamble, chunks };
    }

    parsed++;
    return { action: 'write', q, optionExplanations, preamble };
  });

  const total = questions.length;

  console.log(`\n--- ${filename} ---`);
  console.log(`  parsed: ${parsed}, skipped: ${skipped}, total: ${total}`);
  if (skippedIds.length > 0) {
    console.log(`  Skipped question IDs:`);
    for (const id of skippedIds) {
      console.log(`    - ${id}`);
    }
  }

  if (parsed + skipped !== total) {
    console.error(`  ABORT: parsed (${parsed}) + skipped (${skipped}) !== total (${total}). Not writing ${filename}.`);
    return { filename, written: false, parsed, skipped, total };
  }

  // Apply mutations: rebuild questions array with inserted fields in correct order
  const updatedQuestions = results.map(({ action, q, optionExplanations, preamble }) => {
    if (action === 'already-done' || action === 'skip') {
      return q;
    }

    // Reconstruct the question object with fields in required order:
    // id, question, options, correctAnswers, explanation, optionExplanations,
    // [explanationPreamble if non-empty], category, difficulty
    const rebuilt = {
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswers: q.correctAnswers,
      explanation: q.explanation,
      optionExplanations,
    };

    if (preamble && preamble.length > 0) {
      rebuilt.explanationPreamble = preamble;
    }

    rebuilt.category = q.category;
    rebuilt.difficulty = q.difficulty;

    return rebuilt;
  });

  const updatedBank = {
    ...bank,
    questions: updatedQuestions,
  };

  const output = JSON.stringify(updatedBank, null, indent);
  writeFileSync(filePath, output + '\n', 'utf-8');
  console.log(`  Written: ${filePath} (indent: ${indent} spaces)`);

  return { filename, written: true, parsed, skipped, total };
}

console.log('splitOptionExplanations.mjs — splitting per-option rationales');
console.log('='.repeat(60));

const summaries = [];
for (const filename of BANK_FILES) {
  const summary = processBank(filename);
  summaries.push(summary);
}

console.log('\n' + '='.repeat(60));
console.log('Summary:');
for (const s of summaries) {
  const status = s.written ? 'WRITTEN' : 'SKIPPED (abort)';
  console.log(`  ${s.filename}: parsed=${s.parsed} skipped=${s.skipped} total=${s.total} [${status}]`);
}
console.log('Done.');
