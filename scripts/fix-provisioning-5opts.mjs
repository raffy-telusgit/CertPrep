// One-shot script to trim 5-option questions in gcp-pca-batch-provisioning.json down to 4.
// Removes the specified distractor index per question, re-letters explanations accordingly.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../src/data/questions/gcp-pca-batch-provisioning.json');
const bank = JSON.parse(readFileSync(filePath, 'utf8'));

// Maps letter A-E to index 0-4
const idx = (letter) => letter.charCodeAt(0) - 65;

function removeOption(q, removeIdx) {
  q.options.splice(removeIdx, 1);
  // Update correctAnswers: indices that were > removeIdx shift down by 1
  q.correctAnswers = q.correctAnswers
    .filter(i => i !== removeIdx)
    .map(i => i > removeIdx ? i - 1 : i);
}

// Reletter explanation: e.g. replace "Option D" with "Option C" etc.
// letters: array like ['C','D','E'] → mapped to ['B','C','D']
function reletter(explanation, mappings) {
  let result = explanation;
  // Process in reverse order to avoid double-replacement
  for (let i = mappings.length - 1; i >= 0; i--) {
    const [from, to] = mappings[i];
    result = result.replace(new RegExp(`Option ${from}\\b`, 'g'), `Option ${to}`);
  }
  return result;
}

// --- pca-provisioning-005: remove option E (idx 4) ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-005');
  removeOption(q, 4);
  q.explanation = q.explanation.replace(/ Option E is wrong because Cloud IDS is its own managed service, not a firewall policy feature\./, '');
}

// --- pca-provisioning-014: remove option B (idx 1), reletter C→B, D→C, E→D ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-014');
  removeOption(q, 1);
  // After removing B: old C is now idx 1 (B), old D is now idx 2 (C), old E is now idx 3 (D)
  q.explanation = q.explanation
    .replace('Option B is wrong because IAM bindings do not expire automatically after seven days and project-level objectAdmin is far too broad. ', '');
  q.explanation = reletter(q.explanation, [['E','D'],['D','C'],['C','B']]);
}

// --- pca-provisioning-021: remove option E (idx 4) ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-021');
  removeOption(q, 4);
  q.explanation = q.explanation.replace(/ Option E is wrong because Cloud Run does support Cloud SQL Private IP through VPC connectivity\./, '');
}

// --- pca-provisioning-031: remove option E (idx 4) ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-031');
  removeOption(q, 4);
  q.explanation = q.explanation.replace(/ Option E is wrong because Bigtable is a low-latency NoSQL store, not an ML lineage system\./, '');
}

// --- pca-provisioning-034: remove option B (idx 1), reletter C→B, D→C, E→D ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-034');
  removeOption(q, 1);
  q.explanation = q.explanation
    .replace('Option B is wrong because Workbench is a development environment and manually resizing machine types does not optimize cost or operability. ', '');
  q.explanation = reletter(q.explanation, [['E','D'],['D','C'],['C','B']]);
}

// --- pca-provisioning-035: remove option E (idx 4) ---
{
  const q = bank.questions.find(q => q.id === 'pca-provisioning-035');
  removeOption(q, 4);
  q.explanation = q.explanation.replace(/ Option E is wrong because runtime lineage cannot be derived from source-code commits alone\./, '');
}

// Verify all questions now have exactly 4 options
const bad = bank.questions.filter(q => q.options.length !== 4);
if (bad.length > 0) {
  console.error('Still have non-4-option questions:', bad.map(q => q.id));
  process.exit(1);
}

writeFileSync(filePath, JSON.stringify(bank, null, 2) + '\n', 'utf8');
console.log('Fixed. All', bank.questions.length, 'questions now have exactly 4 options.');
