import { expect, test, type Page } from '@playwright/test'
import { expectAccessible } from './support/a11y.ts'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, expectListParams, unique } from './support/data.ts'
import { switchLanguage } from './support/shell.ts'

// Addresses belong to a person (a relation picker in the form, a link on the detail, a filter on the list) and have a
// country picker. Records each test creates are deleted afterwards, the addresses before their persons.

let created: string[] = []

async function createPerson(page: Page, lastName: string) {
  const person = await callApi(page, 'POST', '/persons', {
    firstName: 'Ewa',
    lastName,
    email: `ewa.${lastName}@example.com`.toLowerCase(),
  })
  created.push(`/persons/${person!.id}`)
  return person!.id
}

async function createAddress(page: Page, personId: number, street: string, city = 'Warsaw') {
  const address = await callApi(page, 'POST', '/addresses', { personId, street, city, postalCode: '00-001', country: 'PL' })
  created.push(`/addresses/${address!.id}`)
  return `/addresses/${address!.id}`
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('addresses as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('creates an address for a person, shows the country in the UI language, edits and deletes it', async ({ page }) => {
    const tag = `Adr${unique()}`
    await openAs(page, '/addresses')
    await createPerson(page, tag)

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New address' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Person' }).click()
    await page.getByRole('dialog').getByPlaceholder('Search…').fill(tag)
    await page.getByRole('option', { name: new RegExp(tag) }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByLabel('Street').fill(`Floriańska ${tag}`)
    await page.getByLabel('Postal code').fill('31-019')
    await page.getByLabel('City').fill('Kraków')
    await page.getByRole('combobox', { name: 'Country' }).click()
    await page.getByPlaceholder('Search countries…').fill('pola')
    await page.getByRole('option', { name: 'Poland' }).click()
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Save' }).click()

    const name = `Floriańska ${tag}, 31-019 Kraków`
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByRole('link', { name: `Ewa ${tag}` })).toBeVisible()
    await expect(page.getByText('Poland')).toBeVisible()
    await expectAccessible(page)
    await switchLanguage(page, 'Polski')
    await expect(page.getByText('Polska')).toBeVisible()
    await switchLanguage(page, 'English')

    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('City').fill('Kraków-Podgórze')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Floriańska ${tag}, 31-019 Kraków-Podgórze` })).toBeVisible()

    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`Floriańska ${tag}, 31-019 Kraków-Podgórze was deleted.`)).toBeVisible()
    await expect(page).toHaveURL(/\/addresses(\?|$)/)
  })

  test('the form requires a person and a country', async ({ page }) => {
    await openAs(page, '/addresses/new')
    await page.getByLabel('Street').fill('Somewhere 1')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('combobox', { name: 'Person' })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL('/addresses/new')
  })

  test('the list filters by person, and the filter is kept in the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'filters are a row from md')
    const tag = `Flt${unique()}`
    await openAs(page, '/addresses')
    const first = await createPerson(page, `${tag}a`)
    const second = await createPerson(page, `${tag}b`)
    await createAddress(page, first, `First ${tag}`)
    await createAddress(page, first, `Second ${tag}`)
    await createAddress(page, second, `Third ${tag}`)
    await page.goto('/addresses')

    const filters = page.getByRole('group', { name: 'Filters' })
    await filters.getByRole('combobox', { name: 'Person' }).click()
    await page.getByRole('dialog').getByPlaceholder('Search…').fill(`${tag}a`)
    await page.getByRole('option', { name: new RegExp(`${tag}a`) }).click()
    await expectListParams(page, { personId: String(first) })
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(3)
    await expect(table).toContainText(`First ${tag}`)
    await expect(table).not.toContainText(`Third ${tag}`)

    await page.reload()
    await expect(table.getByRole('row')).toHaveCount(3)
    await filters.getByRole('button', { name: 'Clear filters' }).click()
    await expectListParams(page, {})
  })
})

test.describe('addresses as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('sees an address without write actions', async ({ page, browser }) => {
    const writer = await browser.newPage({ storageState: authFile('writer') })
    await openAs(writer, '/addresses')
    const tag = `Rd${unique()}`
    const personId = await createPerson(writer, tag)
    const url = await createAddress(writer, personId, `Reader ${tag}`)
    try {
      await openAs(page, url)
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Reader ${tag}`) })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)
      await expectAccessible(page)
    } finally {
      for (const created_ of created.toReversed()) await deleteViaApi(writer, created_)
      created = []
      await writer.close()
    }
  })
})
