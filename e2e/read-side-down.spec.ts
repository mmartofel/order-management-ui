import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, unique } from './support/data.ts'

// Opt-in: stops the query service, so the read model does not catch up with a command until it is started again.
// Set the shell commands that stop and start it, e.g. for the local stack:
//   E2E_READ_SIDE_STOP='pkill -f order-management-query-service'
//   E2E_READ_SIDE_START='cd ../order-management-cqrs-api && (java -jar order-management-query-service/target/order-management-query-service-2.0.0.jar > /tmp/query.log 2>&1 &)'
//   npx playwright test read-side-down --project=desktop --workers=1
const stop = process.env.E2E_READ_SIDE_STOP
const start = process.env.E2E_READ_SIDE_START

test.use({ storageState: authFile('writer') })
test.skip(!stop || !start, 'set E2E_READ_SIDE_STOP and E2E_READ_SIDE_START to run')
test.setTimeout(240_000)

let created: string[] = []

test.afterEach(async ({ page }) => {
  for (const url of created.toReversed()) await deleteViaApi(page, url)
  created = []
})

test('a command shows "still processing" while the read side is down, then the page catches up', async ({ page }) => {
  await openAs(page, '/orders')
  const id = unique()
  const person = await callApi(page, 'POST', '/persons', { firstName: 'Pro', lastName: `Cess${id}`, email: `p.${id}@example.com` })
  created.push(`/persons/${person!.id}`)
  const address = await callApi(page, 'POST', '/addresses', {
    personId: person!.id,
    street: 'Wolna 1',
    city: 'Łódź',
    postalCode: '90-001',
    country: 'PL',
  })
  created.push(`/addresses/${address!.id}`)
  const item = await callApi(page, 'POST', '/items', { sku: `SKU-${id}`, name: `Cup${id}`, price: 5 })
  created.push(`/items/${item!.id}`)
  const order = await callApi(page, 'POST', '/orders', {
    personId: person!.id,
    addressId: address!.id,
    lines: [{ itemId: item!.id, quantity: 1 }],
  })
  const orderId = String(order!.id)
  await expect
    .poll(() => callApi(page, 'GET', `/orders/${orderId}`).then(() => true, () => false), { timeout: 15_000 })
    .toBe(true)
  await page.goto(`/orders/${orderId}`)
  const cancel = page.getByRole('button', { name: 'Cancel order' })
  await expect(cancel).toBeEnabled()

  execSync(stop!)
  try {
    await cancel.click()
    const dialog = page.getByRole('dialog', { name: 'Cancel order' })
    await dialog.getByLabel('Reason').fill('read side down')
    await dialog.getByRole('button', { name: 'Cancel order' }).click()

    // Accepted by the command side; the read model still shows the old state, so the actions wait too.
    const notice = page.getByRole('status').filter({ hasText: /Processing|Still processing/ })
    await expect(notice).toContainText('Processing…', { timeout: 5_000 })
    await expect(cancel).toBeDisabled()
    await expect(notice).toContainText('Still processing', { timeout: 20_000 })
    await expect(cancel).toBeDisabled()
  } finally {
    execSync(start!)
  }

  // The page refetches on its own until the read model has the new version.
  await expect(page.getByRole('heading', { level: 1 }).locator('..')).toContainText('Cancelled', { timeout: 120_000 })
  await expect(page.getByRole('status').filter({ hasText: /Processing|Still processing/ })).toHaveCount(0)
  await expect(page.getByText('read side down')).toBeVisible()
  await expect(cancel).toBeHidden()
})
