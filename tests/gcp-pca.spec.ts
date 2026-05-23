import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:5173'

async function clearStorage(page: Page) {
  await page.evaluate(() => { Object.keys(localStorage).filter((k)=>k.startsWith('certprep:')).forEach((k)=>localStorage.removeItem(k)) })
}

async function startPcaPractice(page: Page) {
  await page.goto(BASE)
  await clearStorage(page)
  await page.reload()
  await page.locator('[aria-label="Select GCP Professional Cloud Architect"]').click()
  await page.locator('[role="dialog"]').locator('text=Practice Mode').click()
  await page.locator('[role="dialog"] button',{hasText:'Start Practice'}).click()
  await expect(page).toHaveURL(new RegExp('/exam/gcp-pca'))
}

async function startPcaExam(page: Page) {
  await page.goto(BASE)
  await clearStorage(page)
  await page.reload()
  await page.locator('[aria-label="Select GCP Professional Cloud Architect"]').click()
  await page.locator('[role="dialog"]').locator('text=Exam Mode').click()
  await expect(page).toHaveURL(new RegExp('/exam/gcp-pca'))
}

test('PCA: badge visible', async ({ page }) => {
  await page.goto(BASE)
  await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('certprep:')).forEach(k=>localStorage.removeItem(k))})
  await page.reload()
  const badge=page.locator('[aria-label="Select GCP Professional Cloud Architect"]')
  await expect(badge).toBeVisible()
  await expect(badge.locator("svg")).toBeVisible()
})

test('PCA: practice session at /exam/gcp-pca',async({page})=>{ await startPcaPractice(page) })
test('PCA: practice no timer',async({page})=>{ await startPcaPractice(page); await expect(page.locator('[aria-label^="Time remaining"]')).not.toBeVisible() })
test('PCA: practice shows progress',async({page})=>{ await startPcaPractice(page); await expect(page.locator('text=/Question [0-9]+ of [0-9]+/')).toBeVisible() })

test('PCA: CaseStudyPanel visible on Q1',async({page})=>{
  await startPcaPractice(page)
  await expect(page.locator('section[aria-labelledby^="case-study-title-"]')).toBeVisible()
})

test('PCA: CaseStudyPanel shows Case Study badge',async({page})=>{
  await startPcaPractice(page)
  const p=page.locator('section[aria-labelledby^="case-study-title-"]')
  await expect(p).toBeVisible()
  await expect(p.locator('span',{hasText:'Case Study'})).toBeVisible()
})

test('PCA: CaseStudyPanel shows known title',async({page})=>{
  await startPcaPractice(page)
  const p=page.locator('section[aria-labelledby^="case-study-title-"]')
  await expect(p).toBeVisible()
  const txt=await p.textContent()
  expect(['Altostrat Media','KnightMotives Automotive','Cymbal Retail','EHR Healthcare'].some(t=>txt?.includes(t))).toBe(true)
})

test('PCA: CaseStudyPanel shows industry tag',async({page})=>{
  await startPcaPractice(page)
  const p=page.locator('section[aria-labelledby^="case-study-title-"]')
  await expect(p).toBeVisible()
  const txt=await p.textContent()
  expect(['Media','Retail','Healthcare','Automotive'].some(i=>txt?.includes(i))).toBe(true)
})

test('PCA: panel auto-expands Company Overview',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await expect(page.locator('h3',{hasText:'Company Overview'})).toBeVisible()
})

test('PCA: panel shows Business Requirements',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await expect(page.locator('h3',{hasText:'Business Requirements'})).toBeVisible()
})

test('PCA: panel shows Technical Requirements',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await expect(page.locator('h3',{hasText:'Technical Requirements'})).toBeVisible()
})

test('PCA: panel shows Executive Statement',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await expect(page.locator('h3',{hasText:'Executive Statement'})).toBeVisible()
})

test('PCA: panel collapses on trigger click',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await expect(page.locator('h3',{hasText:'Company Overview'})).toBeVisible()
  await page.locator('[id^="case-study-title-"]').click()
  await page.waitForTimeout(200)
  await expect(page.locator('h3',{hasText:'Company Overview'})).not.toBeVisible()
})

test('PCA: panel re-expands after collapse',async({page})=>{
  await startPcaPractice(page)
  await page.waitForTimeout(300)
  await page.locator('[id^="case-study-title-"]').click()
  await page.waitForTimeout(200)
  await page.locator('[id^="case-study-title-"]').click()
  await page.waitForTimeout(200)
  await expect(page.locator('h3',{hasText:'Company Overview'})).toBeVisible()
})

test('PCA: Show Answer button visible',async({page})=>{
  await startPcaPractice(page)
  await expect(page.locator('button',{hasText:'Show Answer'})).toBeVisible()
})

test('PCA: Show Answer reveals 4+ rationale notes',async({page})=>{
  await startPcaPractice(page)
  await page.locator('button',{hasText:'Show Answer'}).click()
  const notes=page.locator('[role="note"]')
  await expect(notes.first()).toBeVisible()
  const count=await notes.count()
  expect(count).toBeGreaterThanOrEqual(4)
})

test('PCA: rationale notes have meaningful text',async({page})=>{
  await startPcaPractice(page)
  await page.locator('button',{hasText:'Show Answer'}).click()
  const txt=await page.locator('[role="note"]').first().textContent()
  expect(txt!.length).toBeGreaterThan(10)
})

test('PCA: no generic Explanation Alert with per-option rationale',async({page})=>{
  await startPcaPractice(page)
  await page.locator('button',{hasText:'Show Answer'}).click()
  await expect(page.locator('[role="alert"]')).not.toBeVisible()
})

test('PCA: exam mode timer visible',async({page})=>{
  await startPcaExam(page)
  const timer=page.locator('[aria-label^="Time remaining"]')
  await expect(timer).toBeVisible()
  const txt=await timer.textContent()
  expect(txt).toMatch(/^[0-9]+:[0-9]{2}(:[0-9]{2})?$/)
})

test('PCA: exam mode CaseStudyPanel on Q1',async({page})=>{
  await startPcaExam(page)
  await expect(page.locator('section[aria-labelledby^="case-study-title-"]')).toBeVisible()
})

test('PCA: exam mode no Show Answer',async({page})=>{
  await startPcaExam(page)
  await expect(page.locator('button',{hasText:'Show Answer'})).not.toBeVisible()
})

test('PCA: dark mode CaseStudyPanel visible',async({page})=>{
  await page.goto(BASE)
  await page.evaluate(()=>{localStorage.setItem('certprep:theme','dark')})
  await page.reload()
  const htmlClass=await page.locator('html').getAttribute('class')
  expect(htmlClass).toContain('dark')
  await page.locator('[aria-label="Select GCP Professional Cloud Architect"]').click()
  await page.locator('[role="dialog"]').locator('text=Practice Mode').click()
  await page.locator('[role="dialog"] button',{hasText:'Start Practice'}).click()
  await expect(page).toHaveURL(new RegExp('/exam/gcp-pca'))
  await expect(page.locator('section[aria-labelledby^="case-study-title-"]')).toBeVisible()
})

test('Regression: AZ-900 badge still present',async({page})=>{
  await page.goto(BASE)
  await expect(page.locator('[aria-label="Select Azure Fundamentals"]')).toBeVisible()
})

test('Regression: AZ-900 exam no CaseStudyPanel',async({page})=>{
  await page.goto(BASE)
  await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('certprep:')).forEach(k=>localStorage.removeItem(k))})
  await page.reload()
  await page.locator('[aria-label="Select Azure Fundamentals"]').click()
  await page.locator('[role="dialog"]').locator('text=Exam Mode').click()
  await expect(page).toHaveURL(new RegExp('/exam/az-900'))
  await expect(page.locator('section[aria-labelledby^="case-study-title-"]')).not.toBeVisible()
})

test('PCA: results screen reachable from PCA session',async({page})=>{
  await startPcaPractice(page)
  const navBtns=page.locator('.border.rounded-lg button[type="button"]')
  const count=await navBtns.count()
  await navBtns.nth(count-1).click()
  await page.locator('[aria-label="Submit exam"]').click()
  await page.locator('[role="alertdialog"]').locator('button',{hasText:'Submit'}).click()
  await expect(page).toHaveURL(new RegExp('/results/[a-z0-9-]+'))
  await expect(page.locator('text=GCP Professional Cloud Architect')).toBeVisible()
})

test('PCA: review item CS badge visible',async({page})=>{
  await startPcaPractice(page)
  const navBtns=page.locator('.border.rounded-lg button[type="button"]')
  const cnt=await navBtns.count()
  await navBtns.nth(cnt-1).click()
  await page.locator('[aria-label="Submit exam"]').click()
  await page.locator('[role="alertdialog"]').locator('button',{hasText:'Submit'}).click()
  await expect(page).toHaveURL(new RegExp('/results/[a-z0-9-]+'))
  const firstItem=page.locator('.rounded-lg.border.overflow-hidden button[type="button"]').first()
  await firstItem.click()
  await page.waitForTimeout(300)
  // Find CS badge via title attribute (works for all known case studies)
  const altostrat=page.locator("[title=\"Altostrat Media\"]");
  const knightmotives=page.locator("[title=\"KnightMotives Automotive\"]");
  const hasAltostrat=await altostrat.count()>0;
  const hasKnight=await knightmotives.count()>0;
  expect(hasAltostrat||hasKnight).toBe(true)
})
