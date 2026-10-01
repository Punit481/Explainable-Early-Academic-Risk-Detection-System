// Clicks through the running dashboard like a teacher would, checks the key results,
// and saves the README screenshots to figures/dashboard/.
//
// Needs the whole stack running (docker compose up -d) and Playwright's Chromium
// (npx playwright-core install chromium). Run from web/:  npm run screenshots
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:8000'
const OUT = '../figures/dashboard'
const DATA = '../data'

function check(condition, message) {
  if (!condition) throw new Error(`Check failed: ${message}`)
  console.log(`  ok: ${message}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function uploadClass(name, csvFile) {
  await page.goto(`${BASE}/`)
  await page.getByLabel('Class name').fill(name)
  await page.getByRole('button', { name: 'Create class' }).click()
  await page.getByRole('link', { name }).click()
  await page.locator('input[type=file]').setInputFiles(`${DATA}/${csvFile}`)
  // Either the summary (role=status) or an error message (role=alert) appears
  const outcome = page.getByRole('status').or(page.getByRole('alert'))
  const status = await outcome.textContent()
  check(status === '30 students imported', `${csvFile}: ${status}`)
  await page.locator('tbody tr').first().waitFor()
}

async function openRiskiestStudent() {
  await page.locator('tbody tr a').first().click()
  await page.locator('.recharts-bar-rectangle').first().waitFor()
}

try {
  console.log('Register a teacher')
  await page.goto(`${BASE}/login`)
  await page.getByText('New here? Create an account').click()
  await page.getByLabel('Name').fill('Ms. Sharma')
  await page.getByLabel('Email').fill(`sharma-${Date.now()}@school.test`)
  await page.getByLabel('Password').fill('demo-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByText('My classes').waitFor()

  console.log('Start of term: no grades yet')
  await uploadClass('Math 10-A (start of term)', 'sample_class_start_of_term.csv')
  const earlyStages = await page.locator('tbody tr td:nth-child(4)').allTextContents()
  check(earlyStages.every((s) => s.trim() === 'No grades yet'), 'every student uses the start-of-term model')

  console.log('After period 2: both grades known')
  await uploadClass('Math 10-A (after period 2)', 'sample_class.csv')
  const lateStages = await page.locator('tbody tr td:nth-child(4)').allTextContents()
  check(lateStages.every((s) => s.trim() === 'Period 1 & 2 grades'), 'every student uses the period-2 model')
  await page.screenshot({ path: `${OUT}/class.png` })

  await page.goto(`${BASE}/`)
  await page.getByText('30 students').first().waitFor()
  await page.screenshot({ path: `${OUT}/classes.png` })

  console.log('Riskiest student after period 2, and a what-if')
  await page.getByRole('link', { name: 'Math 10-A (after period 2)' }).click()
  await openRiskiestStudent()
  await page.screenshot({ path: `${OUT}/student.png`, fullPage: true })
  const sliders = page.getByRole('slider')
  await sliders.nth(0).fill('14')
  await sliders.nth(1).fill('15')
  const result = page.getByTestId('what-if-result')
  await result.waitFor()
  await page.waitForTimeout(500)
  check(/→/.test(await result.innerText()), `what-if: ${(await result.innerText()).replace(/\s+/g, ' ')}`)
  await page.locator('section', { hasText: 'What if' }).screenshot({ path: `${OUT}/what-if.png` })

  console.log('Riskiest student at the start of term, then "what if their first grade is 8?"')
  await page.goto(`${BASE}/`)
  await page.getByRole('link', { name: 'Math 10-A (start of term)' }).click()
  await openRiskiestStudent()
  await page.screenshot({ path: `${OUT}/student-start-of-term.png`, fullPage: true })
  await page.getByRole('slider').nth(0).fill('8')
  await page.getByText('Now predicted from: Period 1 grade').waitFor()
  check(true, `what-if switched model: ${(await result.innerText()).replace(/\s+/g, ' ')}`)

  check(errors.length === 0, `no browser errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
  console.log(`Screenshots saved to ${OUT}/`)
} finally {
  await browser.close()
}
