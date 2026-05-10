import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:5173'

async function clearStorage(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage).filter((k) => k.startsWith('certprep:')).forEach((k) => localStorage.removeItem(k))
  })
}

async function getCertprepKeys(page: Page): Promise<string[]> {
  return await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('certprep:')))
}

async function startPracticeSession(page: Page) {
  await page.goto(BASE)
  await clearStorage(page)
  await page.reload()
  await page.locator('[aria-label="Select Azure Fundamentals"]').click()
  await page.locator('[role="dialog"]').locator('text=Practice Mode').click()
  await expect(page).toHaveURL(new RegExp('/exam/az-900'))
}

async function navigateToSingleAnswerQuestion(page: Page) {
  for (let i = 0; i < 10; i++) {
    if (await page.locator('[role="radio"]').count() > 0) break
    const nextBtn = page.locator('[aria-label="Next question"]')
    if ((await nextBtn.count()) === 0) break
    await nextBtn.click()
  }
}

async function startExamSession(page: Page) {
  await page.goto(BASE)
  await clearStorage(page)
  await page.reload()
  await page.locator('[aria-label="Select Azure Fundamentals"]').click()
  await page.locator('[role="dialog"]').locator('text=Exam Mode').click()
  await expect(page).toHaveURL(new RegExp('/exam/az-900'))
}

// --- 1. All 9 exams are selectable from the welcome screen with vendor logos ---

test.describe('Welcome screen exam badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await clearStorage(page)
    await page.reload()
  })

  const EXAMS = [
    { ariaLabel: 'Select Azure Fundamentals', id: 'az-900' },
    { ariaLabel: 'Select Azure Administrator', id: 'az-104' },
    { ariaLabel: 'Select Azure Solutions Architect Expert', id: 'az-305' },
    { ariaLabel: 'Select Security, Compliance & Identity', id: 'sc-900' },
    { ariaLabel: 'Select GCP Professional Cloud Architect', id: 'gcp-pca' },
    { ariaLabel: 'Select GCP Professional Cloud DevOps Engineer', id: 'gcp-pcde' },
    { ariaLabel: 'Select GCP Professional Cloud Developer', id: 'gcp-pcd' },
    { ariaLabel: 'Select AWS Solutions Architect Professional', id: 'aws-sap' },
    { ariaLabel: 'Select AWS DevOps Engineer Professional', id: 'aws-dop' },
  ]

  for (const exam of EXAMS) {
    test(`badge present with svg: ${exam.id}`, async ({ page }) => {
      const badge = page.locator(`[aria-label="${exam.ariaLabel}"]`)
      await expect(badge).toBeVisible()
      await expect(badge.locator('svg')).toBeVisible()
    })
  }

  test('all 9 badges are rendered', async ({ page }) => {
    let count = 0
    for (const exam of EXAMS) {
      if (await page.locator(`[aria-label="${exam.ariaLabel}"]`).isVisible()) count++
    }
    expect(count).toBe(9)
  })
})
// --- 2. Clicking a badge opens mode-selector modal ---

test.describe('Mode selector modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await clearStorage(page)
    await page.reload()
  })

  test('clicking AZ-900 opens dialog with both mode buttons', async ({ page }) => {
    await page.locator('[aria-label="Select Azure Fundamentals"]').click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('text=Exam Mode')).toBeVisible()
    await expect(dialog.locator('text=Practice Mode')).toBeVisible()
  })

  test('dialog title matches the exam full name', async ({ page }) => {
    await page.locator('[aria-label="Select Azure Fundamentals"]').click()
    await expect(page.locator('[role="dialog"]').locator('text=Azure Fundamentals')).toBeVisible()
  })

  test('Cancel button closes dialog', async ({ page }) => {
    await page.locator('[aria-label="Select Azure Fundamentals"]').click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.locator('button', { hasText: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()
  })
})

// --- 3. Practice mode starts a session and navigates to /exam/:id ---

test.describe('Practice mode session start', () => {
  test('selecting Practice Mode navigates to /exam/az-900', async ({ page }) => {
    await page.goto(BASE)
    await clearStorage(page)
    await page.reload()
    await page.locator('[aria-label="Select Azure Fundamentals"]').click()
    await page.locator('[role="dialog"]').locator('text=Practice Mode').click()
    await expect(page).toHaveURL(new RegExp('/exam/az-900'))
  })

  test('practice mode shows no timer', async ({ page }) => {
    await startPracticeSession(page)
    await expect(page.locator('[aria-label^="Time remaining"]')).not.toBeVisible()
  })
})

// --- 4. Exam mode starts a timed session (timer visible) ---

test.describe('Exam mode session start', () => {
  test('selecting Exam Mode navigates to /exam/az-900', async ({ page }) => {
    await page.goto(BASE)
    await clearStorage(page)
    await page.reload()
    await page.locator('[aria-label="Select Azure Fundamentals"]').click()
    await page.locator('[role="dialog"]').locator('text=Exam Mode').click()
    await expect(page).toHaveURL(new RegExp('/exam/az-900'))
  })

  test('exam mode shows a visible timer', async ({ page }) => {
    await startExamSession(page)
    const timer = page.locator('[aria-label^="Time remaining"]')
    await expect(timer).toBeVisible()
    const timerText = await timer.textContent()
    expect(timerText).toMatch(/^\d+:\d{2}(:\d{2})?$/)
  })
})
// --- 5. Questions render with options ---

test.describe('Question rendering', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('question text is visible', async ({ page }) => {
    const q = page.locator('.rounded-lg.border.bg-card p.text-lg').first()
    await expect(q).toBeVisible()
    const text = await q.textContent()
    expect(text!.length).toBeGreaterThan(5)
  })

  test('progress indicator is visible', async ({ page }) => {
    await expect(page.locator('text=/Question [0-9]+ of [0-9]+/')).toBeVisible()
  })

  test('single-answer question uses radio buttons', async ({ page }) => {
    let foundRadio = false
    for (let i = 0; i < 10; i++) {
      const isMulti = await page.locator('text=Select all that apply').first().isVisible()
      if (!isMulti) {
        const count = await page.locator('[role="radio"]').count()
        if (count > 0) { foundRadio = true; expect(count).toBeGreaterThanOrEqual(2); break }
      }
      const nextBtn = page.locator('[aria-label="Next question"]')
      if (await nextBtn.isDisabled()) break
      await nextBtn.click()
    }
    expect(foundRadio).toBe(true)
  })

  test('multi-answer question uses checkboxes', async ({ page }) => {
    let foundCheckbox = false
    for (let i = 0; i < 10; i++) {
      const isMulti = await page.locator('text=Select all that apply').first().isVisible()
      if (isMulti) {
        const count = await page.locator('[role="checkbox"]').count()
        expect(count).toBeGreaterThanOrEqual(2)
        foundCheckbox = true
        break
      }
      const nextBtn = page.locator('[aria-label="Next question"]')
      if ((await nextBtn.count()) === 0 || await nextBtn.isDisabled()) break
      await nextBtn.click()
    }
    if (!foundCheckbox) test.skip()
  })
})

// --- 6. In practice mode, Show Answer reveals correct answer ---

test.describe('Show Answer in practice mode', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('Show Answer button present in practice mode', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Show Answer' })).toBeVisible()
  })

  test('clicking Show Answer reveals Correct label and explanation', async ({ page }) => {
    await page.locator('button', { hasText: 'Show Answer' }).click()
    await expect(page.locator('[aria-label="Correct answer"]').first()).toBeVisible()
    await expect(page.locator('text=Explanation').first()).toBeVisible()
  })

  test('Show Answer resets when navigating to next question', async ({ page }) => {
    await page.locator('button', { hasText: 'Show Answer' }).click()
    await expect(page.locator('text=Explanation').first()).toBeVisible()
    await page.locator('[aria-label="Next question"]').click()
    await expect(page.locator('button', { hasText: 'Show Answer' })).toBeVisible()
    await expect(page.locator('text=Explanation')).not.toBeVisible()
  })

  test('Show Answer NOT visible in exam mode', async ({ page }) => {
    await startExamSession(page)
    await expect(page.locator('button', { hasText: 'Show Answer' })).not.toBeVisible()
  })
})
// --- 7. Flagging a question works ---

test.describe('Question flagging', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('flag button present with correct aria-label', async ({ page }) => {
    await expect(page.locator('[aria-label="Flag this question"]')).toBeVisible()
  })

  test('clicking flag changes aria-label to Remove flag', async ({ page }) => {
    await page.locator('[aria-label="Flag this question"]').click()
    await expect(page.locator('[aria-label="Remove flag"]')).toBeVisible()
  })

  test('clicking flag again toggles back to unflagged', async ({ page }) => {
    await page.locator('[aria-label="Flag this question"]').click()
    await page.locator('[aria-label="Remove flag"]').click()
    await expect(page.locator('[aria-label="Flag this question"]')).toBeVisible()
  })

  test('flagged question shows ring highlight in navigator', async ({ page }) => {
    await page.locator('[aria-label="Flag this question"]').click()
    const navBtn = page.locator('[aria-label^="Question 1,"]')
    await expect(navBtn).toBeVisible()
    const classes = await navBtn.getAttribute('class')
    expect(classes).toContain('ring-yellow-500')
  })
})

// --- 8. Navigation: Previous/Next buttons move between questions ---

test.describe('Question navigation', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('Previous button is disabled on first question', async ({ page }) => {
    await expect(page.locator('[aria-label="Previous question"]')).toBeDisabled()
  })

  test('Next button moves to question 2', async ({ page }) => {
    await expect(page.locator('text=Question 1 of')).toBeVisible()
    await page.locator('[aria-label="Next question"]').click()
    await expect(page.locator('text=Question 2 of')).toBeVisible()
  })

  test('Previous button moves back to question 1', async ({ page }) => {
    await page.locator('[aria-label="Next question"]').click()
    await page.locator('[aria-label="Previous question"]').click()
    await expect(page.locator('text=Question 1 of')).toBeVisible()
  })

  test('Submit button appears on last question instead of Next', async ({ page }) => {
    const allNavBtns = page.locator('.border.rounded-lg button[type="button"]')
    const total = await allNavBtns.count()
    await allNavBtns.nth(total - 1).click()
    await expect(page.locator('[aria-label="Submit exam"]')).toBeVisible()
    await expect(page.locator('[aria-label="Next question"]')).not.toBeVisible()
  })

  test('question navigator buttons jump to correct question', async ({ page }) => {
    await page.locator('[aria-label^="Question 3,"]').click()
    await expect(page.locator('text=Question 3 of')).toBeVisible()
  })
})
// --- 9. Session state is saved to localStorage on every answer ---

test.describe('localStorage persistence on answer', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('certprep:current-session key exists after session starts', async ({ page }) => {
    const keys = await getCertprepKeys(page)
    expect(keys).toContain('certprep:current-session')
  })

  test('current-session answers updated after answering', async ({ page }) => {
    await navigateToSingleAnswerQuestion(page)
    await page.locator('[role="radio"]').first().click()
    const session = await page.evaluate(() => {
      const raw = localStorage.getItem('certprep:current-session')
      return raw ? JSON.parse(raw) : null
    })
    expect(session).not.toBeNull()
    expect(Object.keys(session.answers).length).toBeGreaterThan(0)
  })
})

// --- 10. Page reload mid-session shows Resume banner ---

test.describe('Session resume banner', () => {
  test('resume banner appears after reload mid-session', async ({ page }) => {
    await startPracticeSession(page)
    await page.goto(BASE)
    await expect(page.locator('text=Resume previous session')).toBeVisible()
    await expect(page.locator('button', { hasText: 'Resume' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Discard' })).toBeVisible()
  })

  test('resume banner shows correct exam name and mode', async ({ page }) => {
    await startPracticeSession(page)
    await page.goto(BASE)
    await expect(page.locator('[data-testid="resume-banner"]').locator('text=AZ-900')).toBeVisible()
    await expect(page.locator('[data-testid="resume-banner"]').locator('text=Practice mode')).toBeVisible()
  })

  test('no resume banner when there is no saved session', async ({ page }) => {
    await page.goto(BASE)
    await clearStorage(page)
    await page.reload()
    await expect(page.locator('text=Resume previous session')).not.toBeVisible()
  })
})

// --- 11. Resuming a session restores position ---

test.describe('Session resume restores position', () => {
  test('clicking Resume navigates back to the exam runner', async ({ page }) => {
    await startPracticeSession(page)
    await page.goto(BASE)
    await expect(page.locator('button', { hasText: 'Resume' })).toBeVisible()
    await page.locator('button', { hasText: 'Resume' }).click()
    await expect(page).toHaveURL(new RegExp('/exam/az-900'))
    await expect(page.locator('text=Question 1 of')).toBeVisible()
  })

  test('Discard removes banner and clears current-session', async ({ page }) => {
    await startPracticeSession(page)
    await page.goto(BASE)
    await page.locator('button', { hasText: 'Discard' }).click()
    await expect(page.locator('text=Resume previous session')).not.toBeVisible()
    const keys = await getCertprepKeys(page)
    expect(keys).not.toContain('certprep:current-session')
  })
})
// --- 12. Submitting a session navigates to results screen ---

test.describe('Session submission', () => {
  test('submit navigates to /results/:sessionId', async ({ page }) => {
    await startPracticeSession(page)
    const allNavBtns = page.locator('.border.rounded-lg button[type="button"]')
    const total = await allNavBtns.count()
    await allNavBtns.nth(total - 1).click()
    await page.locator('[aria-label="Submit exam"]').click()
    const alertDialog = page.locator('[role="alertdialog"]')
    await expect(alertDialog).toBeVisible()
    await alertDialog.locator('button', { hasText: 'Submit' }).click()
    await expect(page).toHaveURL(new RegExp('/results/[a-z0-9-]+'))
  })

  test('AlertDialog asks for confirmation before submitting', async ({ page }) => {
    await startPracticeSession(page)
    const allNavBtns = page.locator('.border.rounded-lg button[type="button"]')
    const total = await allNavBtns.count()
    await allNavBtns.nth(total - 1).click()
    await page.locator('[aria-label="Submit exam"]').click()
    const dialog = page.locator('[role="alertdialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('text=Submit your answers?')).toBeVisible()
    await dialog.locator('button', { hasText: 'Continue Reviewing' }).click()
    await expect(page).toHaveURL(new RegExp('/exam/az-900'))
  })
})

// --- 13. Results screen shows pass/fail badge, score %, correct count ---

test.describe('Results screen', () => {
  async function navigateToResults(page: Page) {
    await startPracticeSession(page)
    const allNavBtns = page.locator('.border.rounded-lg button[type="button"]')
    const total = await allNavBtns.count()
    await allNavBtns.nth(total - 1).click()
    await page.locator('[aria-label="Submit exam"]').click()
    await page.locator('[role="alertdialog"]').locator('button', { hasText: 'Submit' }).click()
    await expect(page).toHaveURL(new RegExp('/results/[a-z0-9-]+'))
  }

  test('results page shows a score percentage', async ({ page }) => {
    await navigateToResults(page)
    const scoreEl = page.locator('span.text-6xl')
    await expect(scoreEl).toBeVisible()
    const text = await scoreEl.textContent()
    expect(text).toMatch(/^\d+%$/)
  })

  test('results page shows PASS or FAIL badge', async ({ page }) => {
    await navigateToResults(page)
    await expect(page.locator('span', { hasText: /^(PASS|FAIL)$/ })).toBeVisible()
  })

  test('results page shows correct count', async ({ page }) => {
    await navigateToResults(page)
    await expect(page.locator('span:has-text("correct")').first()).toBeVisible()
  })

  test('results page has Review Answers section', async ({ page }) => {
    await navigateToResults(page)
    await expect(page.locator('text=Review Answers')).toBeVisible()
  })

  test('Back to Home button navigates to home', async ({ page }) => {
    await navigateToResults(page)
    await expect(page.locator('button', { hasText: 'Back to Home' })).toBeVisible()
    await page.locator('button', { hasText: 'Back to Home' }).click()
    await expect(page).toHaveURL(BASE + '/')
  })
})
// --- 14. History page shows the completed session ---

test.describe('History page', () => {
  test('completed session appears in history table', async ({ page }) => {
    await startPracticeSession(page)
    const allNavBtns = page.locator('.border.rounded-lg button[type="button"]')
    const total = await allNavBtns.count()
    await allNavBtns.nth(total - 1).click()
    await page.locator('[aria-label="Submit exam"]').click()
    await page.locator('[role="alertdialog"]').locator('button', { hasText: 'Submit' }).click()
    await expect(page).toHaveURL(new RegExp('/results/'))
    await page.locator('[aria-label="View history"]').click()
    await expect(page).toHaveURL(BASE + '/history')
    await expect(page.locator('text=AZ-900')).toBeVisible()
    await expect(page.locator('text=Practice')).toBeVisible()
    await expect(page.locator('span', { hasText: /^(PASS|FAIL)$/ }).first()).toBeVisible()
  })

  test('history page shows empty state when no attempts', async ({ page }) => {
    await page.goto(BASE + '/history')
    await clearStorage(page)
    await page.reload()
    await expect(page.locator('text=No attempts yet')).toBeVisible()
  })
})

// --- 15. All three reset buttons require AlertDialog confirmation ---

test.describe('History page reset buttons', () => {
  test.beforeEach(async ({ page }) => { await page.goto(BASE + '/history') })

  test('Reset History button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Reset History' })).toBeVisible()
  })

  test('Reset Question Tracker button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Reset Question Tracker' })).toBeVisible()
  })

  test('Reset Everything button is present', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Reset Everything' })).toBeVisible()
  })

  test('Reset History opens an AlertDialog', async ({ page }) => {
    await page.locator('button', { hasText: 'Reset History' }).click()
    await expect(page.locator('[role="alertdialog"]')).toBeVisible()
    await expect(page.locator('text=Reset History?')).toBeVisible()
  })

  test('Reset Question Tracker opens an AlertDialog', async ({ page }) => {
    await page.locator('button', { hasText: 'Reset Question Tracker' }).click()
    await expect(page.locator('[role="alertdialog"]')).toBeVisible()
    await expect(page.locator('text=Reset Question Tracker?')).toBeVisible()
  })

  test('Reset Everything opens an AlertDialog', async ({ page }) => {
    await page.locator('button', { hasText: 'Reset Everything' }).click()
    await expect(page.locator('[role="alertdialog"]')).toBeVisible()
    await expect(page.locator('text=Reset Everything?')).toBeVisible()
  })

  test('cancelling Reset History does NOT clear history', async ({ page }) => {
    await page.evaluate(() => {
      const e = { id: 't1', examId: 'az-900', mode: 'practice', score: 50,
        correctCount: 5, totalQuestions: 10, durationSeconds: 120, passed: false, completedAt: Date.now() }
      localStorage.setItem('certprep:history', JSON.stringify([e]))
    })
    await page.reload()
    await page.locator('button', { hasText: 'Reset History' }).click()
    await page.locator('[role="alertdialog"]').locator('button', { hasText: 'Cancel' }).click()
    await expect(page.locator('text=AZ-900')).toBeVisible()
  })

  test('confirming Reset History clears history', async ({ page }) => {
    await page.evaluate(() => {
      const e = { id: 't2', examId: 'az-900', mode: 'practice', score: 50,
        correctCount: 5, totalQuestions: 10, durationSeconds: 120, passed: false, completedAt: Date.now() }
      localStorage.setItem('certprep:history', JSON.stringify([e]))
    })
    await page.reload()
    await page.locator('button', { hasText: 'Reset History' }).click()
    await page.locator('[role="alertdialog"]').locator('button', { hasText: 'Reset History' }).click()
    await expect(page.locator('text=No attempts yet')).toBeVisible()
  })

  test('confirming Reset Everything does NOT clear theme', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('certprep:theme', 'dark'))
    await page.locator('button', { hasText: 'Reset Everything' }).click()
    await page.locator('[role="alertdialog"]').locator('button', { hasText: 'Reset Everything' }).click()
    const theme = await page.evaluate(() => localStorage.getItem('certprep:theme'))
    expect(theme).toBe('dark')
  })
})
// --- 16. Dark/light theme toggle persists across reload ---

test.describe('Theme toggle', () => {
  test('theme toggle button is visible in the header', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('button[aria-label^="Switch to"]')).toBeVisible()
  })

  test('clicking toggle to dark persists to localStorage', async ({ page }) => {
    await page.goto(BASE)
    await page.evaluate(() => localStorage.setItem('certprep:theme', 'light'))
    await page.reload()
    await page.locator('button[aria-label="Switch to dark mode"]').click()
    const storedTheme = await page.evaluate(() => localStorage.getItem('certprep:theme'))
    expect(storedTheme).toBe('dark')
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('dark theme persists after page reload', async ({ page }) => {
    await page.goto(BASE)
    await page.evaluate(() => localStorage.setItem('certprep:theme', 'dark'))
    await page.reload()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('light theme persists after page reload', async ({ page }) => {
    await page.goto(BASE)
    await page.evaluate(() => localStorage.setItem('certprep:theme', 'light'))
    await page.reload()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass ?? '').not.toContain('dark')
  })
})

// --- 17. Keyboard shortcuts ---

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => { await startPracticeSession(page) })

  test('pressing 1 selects the first answer option', async ({ page }) => {
    await navigateToSingleAnswerQuestion(page)
    await page.locator('body').click()
    await page.keyboard.press('1')
    await expect(page.locator('[role="radio"]').first()).toBeChecked()
  })

  test('pressing F flags the current question', async ({ page }) => {
    await page.locator('body').click()
    await page.keyboard.press('f')
    await expect(page.locator('[aria-label="Remove flag"]')).toBeVisible()
  })

  test('pressing F again unflags the current question', async ({ page }) => {
    await page.locator('body').click()
    await page.keyboard.press('f')
    await expect(page.locator('[aria-label="Remove flag"]')).toBeVisible()
    await page.keyboard.press('f')
    await expect(page.locator('[aria-label="Flag this question"]')).toBeVisible()
  })

  test('pressing ArrowRight advances to next question', async ({ page }) => {
    await expect(page.locator('text=Question 1 of')).toBeVisible()
    await page.locator('body').click()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('text=Question 2 of')).toBeVisible()
  })

  test('pressing ArrowLeft goes to previous question', async ({ page }) => {
    await page.locator('[aria-label="Next question"]').click()
    await expect(page.locator('text=Question 2 of')).toBeVisible()
    await page.locator('body').click()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('text=Question 1 of')).toBeVisible()
  })

  test('pressing 2 selects the second answer option', async ({ page }) => {
    await navigateToSingleAnswerQuestion(page)
    await page.locator('body').click()
    await page.keyboard.press('2')
    await expect(page.locator('[role="radio"]').nth(1)).toBeChecked()
  })
})
