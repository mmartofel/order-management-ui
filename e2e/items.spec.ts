import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y.ts'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, unique } from './support/data.ts'

// Items are reference data with a price and a unique SKU. Records each test creates are deleted afterwards.

let created: string[] = []

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('items as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('creates, edits and deletes an item', async ({ page }) => {
    const id = unique()
    await openAs(page, '/items')

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New item' })).toBeVisible()
    await page.getByLabel('SKU').fill(`SKU-${id}`)
    await page.getByLabel('Name').fill(`Teapot${id}`)
    await page.getByLabel('Price').fill('24.5')
    await page.getByLabel('Description').fill('Cast iron, 1 l.')
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1, name: `Teapot${id}` })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText('24.5')).toBeVisible()
    await expect(page.getByText('Cast iron, 1 l.')).toBeVisible()
    await expectAccessible(page)

    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Price').fill('19.99')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(`Teapot${id} was saved.`)).toBeVisible()
    await expect(page.getByText('19.99')).toBeVisible()

    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog', { name: `Delete Teapot${id}?` }).getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`Teapot${id} was deleted.`)).toBeVisible()
  })

  test('a price of zero is rejected before saving', async ({ page }) => {
    await openAs(page, '/items/new')
    await page.getByLabel('SKU').fill(`SKU-${unique()}`)
    await page.getByLabel('Name').fill('Free lunch')
    await page.getByLabel('Price').fill('0')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByLabel('Price')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL('/items/new')
  })

  test('a duplicate SKU is shown on the SKU field', async ({ page }) => {
    const sku = `SKU-${unique()}`
    await openAs(page, '/items')
    const item = await callApi(page, 'POST', '/items', { sku, name: 'Original', price: 1 })
    created.push(`/items/${item!.id}`)

    await page.goto('/items/new')
    await page.getByLabel('SKU').fill(sku)
    await page.getByLabel('Name').fill('Copy')
    await page.getByLabel('Price').fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByLabel('SKU')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This value is already in use.')).toBeVisible()
    await expect(page).toHaveURL('/items/new')
  })
})

test.describe('items as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('sees the list without write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/items')
    await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toHaveCount(0)
    await expectAccessible(page)
    await page.goto('/items/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })
})
