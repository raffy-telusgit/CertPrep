// Run with: node scripts/merge-gcp-pca.mjs
//
// Merges 11 batch JSON files (7 domain + 4 case-study) into src/data/questions/gcp-pca.json.
// Reads case-study definitions from .claude/pca-case-studies.json.
// Validates the merged bank before writing.
// Exit non-zero on validation failure.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// --- Constants ---

/** Domain batch slugs in merge order. */
const DOMAIN_SLUGS = [
  'design-plan-A',
  'design-plan-B',
  'provisioning',
  'security',
  'processes',
  'implementation',
  'operations',
];

/** Case-study batch slugs (one per case study). */
const CASE_STUDY_SLUGS = [
  'case-study-altostrat-media',
  'case-study-cymbal-retail',
  'case-study-ehr-healthcare',
  'case-study-knightmotives-automotive',
];

/** All 11 expected batch files. */
const ALL_SLUGS = [...DOMAIN_SLUGS, ...CASE_STUDY_SLUGS];

/** Unicode artifact patterns that should not appear in the output. */
const ARTIFACT_RE = /Ã—|â€"|â€™|â€œ|â€|â€˜|â€™|Ã|â/;

// --- Helpers ---

function fail(msg) {
  console.error(`\nFATAL: ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`  WARN: ${msg}`);
}

function readJson(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// --- Main ---

console.log('merge-gcp-pca.mjs — merging GCP PCA question bank');
console.log('='.repeat(60));

// 1. Discover batch files
const batchDir = join(ROOT, 'src', 'data', 'questions');
const missingBatches = [];
for (const slug of ALL_SLUGS) {
  const filePath = join(batchDir, `gcp-pca-batch-${slug}.json`);
  if (!existsSync(filePath)) {
    missingBatches.push(`gcp-pca-batch-${slug}.json`);
  }
}

if (missingBatches.length > 0) {
  fail(
    `Expected exactly ${ALL_SLUGS.length} batch files. Missing:\n` +
      missingBatches.map((f) => `  - ${f}`).join('\n'),
  );
}

console.log(`Found all ${ALL_SLUGS.length} batch files.`);

// 2. Read case-study source
const caseStudiesPath = join(ROOT, '.claude', 'pca-case-studies.json');
if (!existsSync(caseStudiesPath)) {
  fail(`Case study source not found: ${caseStudiesPath}`);
}
const caseStudies = readJson(caseStudiesPath);
console.log(`Loaded ${caseStudies.length} case studies from pca-case-studies.json.`);

// Build lookup: id → title
const caseStudyMap = new Map(caseStudies.map((cs) => [cs.id, cs]));

// 3. Concatenate questions from all batches
const allQuestions = [];
const perBatchCounts = {};

for (const slug of DOMAIN_SLUGS) {
  const filePath = join(batchDir, `gcp-pca-batch-${slug}.json`);
  const bank = readJson(filePath);
  const questions = bank.questions ?? [];
  perBatchCounts[slug] = questions.length;
  allQuestions.push(...questions);
}

for (const slug of CASE_STUDY_SLUGS) {
  const filePath = join(batchDir, `gcp-pca-batch-${slug}.json`);
  const bank = readJson(filePath);
  const questions = bank.questions ?? [];
  perBatchCounts[slug] = questions.length;
  allQuestions.push(...questions);
}

console.log(`\nTotal questions collected: ${allQuestions.length}`);

// 4. Validate
let validationFailed = false;

function validationError(msg) {
  console.error(`  ERROR: ${msg}`);
  validationFailed = true;
}

// 4a. Total count
if (allQuestions.length !== 300) {
  validationError(`Expected 300 questions, got ${allQuestions.length}.`);
}

// 4b. Unique IDs
const idsSeen = new Set();
const duplicateIds = [];
for (const q of allQuestions) {
  if (idsSeen.has(q.id)) {
    duplicateIds.push(q.id);
  }
  idsSeen.add(q.id);
}
if (duplicateIds.length > 0) {
  validationError(`Duplicate question IDs: ${duplicateIds.join(', ')}`);
}

// 4c. Each question has exactly 4 options, valid correctAnswers, non-empty explanation
const malformedIds = [];
for (const q of allQuestions) {
  const issues = [];
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    issues.push(`options.length=${Array.isArray(q.options) ? q.options.length : 'N/A'} (expected 4)`);
  }
  if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
    issues.push('correctAnswers is empty or missing');
  } else {
    for (const idx of q.correctAnswers) {
      if (typeof idx !== 'number' || idx < 0 || idx > 3) {
        issues.push(`correctAnswers contains invalid index ${idx}`);
      }
    }
  }
  if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
    issues.push('explanation is empty or missing');
  }
  if (issues.length > 0) {
    malformedIds.push(`${q.id}: ${issues.join('; ')}`);
  }
}
if (malformedIds.length > 0) {
  validationError(`Malformed questions:\n${malformedIds.map((m) => `    ${m}`).join('\n')}`);
}

// 4d. caseStudyId validation: every referenced id must exist in caseStudies
const csCounts = new Map(); // caseStudyId → count
const unknownCsIds = [];
for (const q of allQuestions) {
  if (q.caseStudyId) {
    if (!caseStudyMap.has(q.caseStudyId)) {
      unknownCsIds.push(`${q.id} → ${q.caseStudyId}`);
    } else {
      csCounts.set(q.caseStudyId, (csCounts.get(q.caseStudyId) ?? 0) + 1);
    }
  }
}
if (unknownCsIds.length > 0) {
  validationError(`Questions reference unknown caseStudyId:\n${unknownCsIds.map((m) => `    ${m}`).join('\n')}`);
}

// 4e. Each case study must be referenced by exactly 15 questions
for (const cs of caseStudies) {
  const count = csCounts.get(cs.id) ?? 0;
  if (count !== 15) {
    validationError(`Case study "${cs.id}" is referenced by ${count} questions (expected 15).`);
  }
}

// 4f. Unicode artifact check
const artifactIds = [];
for (const q of allQuestions) {
  const text = JSON.stringify(q);
  if (ARTIFACT_RE.test(text)) {
    artifactIds.push(q.id);
  }
}
if (artifactIds.length > 0) {
  validationError(`Unicode artifacts detected in: ${artifactIds.join(', ')}`);
}

// 4g. Length-bias check (warn only — do not fail)
let longestIsCorrect = 0;
for (const q of allQuestions) {
  if (!Array.isArray(q.options) || !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) continue;
  const lengths = q.options.map((o) => (typeof o === 'string' ? o.length : 0));
  const maxLen = Math.max(...lengths);
  const correctIdx = q.correctAnswers[0];
  if (typeof correctIdx === 'number' && lengths[correctIdx] === maxLen) {
    longestIsCorrect++;
  }
}
const lengthBiasPct = allQuestions.length > 0 ? (longestIsCorrect / allQuestions.length) * 100 : 0;
if (lengthBiasPct > 50) {
  warn(`Length-bias: correct answer is longest in ${longestIsCorrect}/${allQuestions.length} (${lengthBiasPct.toFixed(1)}%) questions. Exceeds 50% threshold.`);
}

// 4h. Multi-answer ratio (warn only)
const multiAnswerCount = allQuestions.filter((q) => Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1).length;
const multiPct = allQuestions.length > 0 ? (multiAnswerCount / allQuestions.length) * 100 : 0;
if (multiPct < 12 || multiPct > 18) {
  warn(`Multi-answer ratio: ${multiAnswerCount}/${allQuestions.length} (${multiPct.toFixed(1)}%). Expected 12–18%.`);
}

// Stop on hard failures
if (validationFailed) {
  console.error('\nValidation FAILED. Not writing output file.');
  process.exit(1);
}

console.log('\nValidation passed.');

// 5. Write merged output
const generatedAt = new Date().toISOString();
const outputBank = {
  examId: 'gcp-pca',
  version: 2,
  placeholder: false,
  generatedAt,
  questions: allQuestions,
  caseStudies,
};

const outputPath = join(batchDir, 'gcp-pca.json');
writeFileSync(outputPath, JSON.stringify(outputBank, null, 2) + '\n', 'utf-8');
console.log(`\nWritten: ${outputPath}`);

// 6. Print summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log(`  Total questions : ${allQuestions.length}`);
console.log(`  Case studies    : ${caseStudies.length}`);
console.log(`  Generated at    : ${generatedAt}`);
console.log('\nPer-batch counts:');
for (const slug of ALL_SLUGS) {
  console.log(`  gcp-pca-batch-${slug}.json : ${perBatchCounts[slug] ?? 0}`);
}
console.log('\nPer-case-study question counts:');
for (const cs of caseStudies) {
  console.log(`  ${cs.id} : ${csCounts.get(cs.id) ?? 0}`);
}
console.log(`\nLength-bias  : ${longestIsCorrect}/${allQuestions.length} (${lengthBiasPct.toFixed(1)}%)`);
console.log(`Multi-answer : ${multiAnswerCount}/${allQuestions.length} (${multiPct.toFixed(1)}%)`);

// Position distribution
const positionCounts = [0, 0, 0, 0];
for (const q of allQuestions) {
  if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
    const pos = q.correctAnswers[0];
    if (pos >= 0 && pos <= 3) positionCounts[pos]++;
  }
}
console.log('\nCorrect-answer position distribution (correctAnswers[0]):');
for (let i = 0; i < 4; i++) {
  const label = ['A', 'B', 'C', 'D'][i];
  console.log(`  ${label} (${i}): ${positionCounts[i]}`);
}

console.log('\nDone.');
