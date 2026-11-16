import { expect, test, type Page } from '@playwright/test'
import { expectAccessible } from './support/a11y.ts'
import { appOrigin, authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, expectListParams, unique } from './support/data.ts'
import { switchLanguage } from './support/shell.ts'

// People are reference data (plain CRUD): create, edit and delete in the UI, server errors on the fields, a person
// still in use, a stale version, and the list state in the URL. Records each test creates are deleted afterwards,
// newest first, so addresses go before the persons they belong to.

let created: string[] = []

/** Creates a person through the API (fast test data) and returns its detail URL. */
async function createViaApi(page: Page, firstName: string, lastName: string) {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase()
  const person = await callApi(page, 'POST', '/persons', { firstName, lastName, email })
  const url = `/persons/${person!.id}`
  created.push(url)
  return url
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith(appOrigin)) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('persons as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('creates, edits and deletes a person', async ({ page }) => {
    const id = unique()
    const lastName = `E2e${id}`
    await openAs(page, '/persons')

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New person' })).toBeVisible()
    await expectAccessible(page)
    await page.getByLabel('First name').fill('Anna')
    await page.getByLabel('Last name').fill(lastName)
    await page.getByLabel('Email').fill(`anna.${id}@example.com`)
    await page.getByLabel('Phone').fill('+48 600 100 200')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1, name: `Anna ${lastName}` })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText(`Anna ${lastName} was created.`)).toBeVisible()
    await expect(page.getByText('+48 600 100 200')).toBeVisible()
    await expectAccessible(page)

    // Edit: rename and clear the optional phone (PUT replaces the record).
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('First name').fill('Anne')
    await page.getByLabel('Phone').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Anne ${lastName}` })).toBeVisible()
    await expect(page.getByText('Phone').locator('xpath=following-sibling::dd[1]')).toHaveText('Not provided')

    await page.getByRole('button', { name: 'Delete' }).click()
    await expectAccessible(page, '[role=alertdialog]')
    await page.getByRole('alertdialog', { name: `Delete Anne ${lastName}?` }).getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(/\/persons(\?|$)/)
    await expect(page.getByText(`Anne ${lastName} was deleted.`)).toBeVisible()
    await page.getByRole('searchbox').fill(lastName)
    await expect(page.getByText(`Nothing matches “${lastName}”.`, { exact: false })).toBeVisible()
  })

  test('client-side validation stops the save', async ({ page }) => {
    await openAs(page, '/persons/new')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This field is required.')).toHaveCount(2)
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')
  })

  test('a duplicate email is shown on the email field, in the current language', async ({ page }) => {
    const id = unique()
    await openAs(page, '/persons')
    const url = await createViaApi(page, 'First', `Dup${id}`)

    await page.goto('/persons/new')
    await page.getByLabel('First name').fill('Second')
    await page.getByLabel('Last name').fill(`Dup${id}`)
    await page.getByLabel('Email').fill(`first.dup${id}@example.com`)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).toBeFocused()
    await expect(page.getByText('This value is already in use.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')

    await switchLanguage(page, 'Polski')
    await expect(page.getByText('Ta wartość jest już zajęta.')).toBeVisible()
    expect(created).toEqual([url])
  })

  test('a person with an address is kept; the address is listed on the person', async ({ page }) => {
    const tag = `Use${unique()}`
    await openAs(page, '/persons')
    const url = await createViaApi(page, 'Ole', tag)
    const address = await callApi(page, 'POST', '/addresses', {
      personId: Number(url.split('/').at(-1)),
      street: `Długa ${tag}`,
      city: 'Gdańsk',
      postalCode: '80-001',
      country: 'PL',
    })
    created.push(`/addresses/${address!.id}`)

    await page.goto(url)
    await expect(page.getByRole('link', { name: new RegExp(`Długa ${tag}`) })).toBeVisible()
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`Ole ${tag} is still used by other records and was not deleted.`)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: `Ole ${tag}` })).toBeVisible()
  })

  test('saving over a newer version offers to reload the record', async ({ page }) => {
    const tag = `Ver${unique()}`
    await openAs(page, '/persons')
    const url = await createViaApi(page, 'Stale', tag)
    await page.goto(`${url}/edit`)
    await expect(page.getByLabel('First name')).toHaveValue('Stale')

    // Someone else saves the same record first.
    await callApi(page, 'PUT', url, {
      firstName: 'Newer',
      lastName: tag,
      email: `stale.${tag}@example.com`.toLowerCase(),
      version: 0,
    })

    await page.getByLabel('First name').fill('Older')
    await page.getByRole('button', { name: 'Save' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'This record was changed' })
    await expectAccessible(page, '[role=alertdialog]')
    await dialog.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByLabel('First name')).toHaveValue('Newer')
  })

  test('search, sorting and paging are kept in the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sorts with the table headers, shown from md')
    const tag = `Pag${unique()}`
    await openAs(page, '/persons')
    // One more than the page size of 10, so a second page exists.
    for (let i = 0; i <= 10; i++) await createViaApi(page, `P${String(i).padStart(2, '0')}`, tag)
    const firstRow = page.getByRole('table').getByRole('row').nth(1)

    await page.getByRole('searchbox').fill(tag)
    await expectListParams(page, { q: tag })
    await page.getByLabel('Rows per page').click()
    await page.getByRole('option', { name: '10', exact: true }).click()
    await expectListParams(page, { q: tag, size: '10' })
    await expect(page.getByText('1–10 of 11')).toBeVisible()

    await page.getByRole('button', { name: 'First name' }).click()
    await expect(page.getByRole('columnheader', { name: /First name/ })).toHaveAttribute('aria-sort', 'ascending')
    await page.getByRole('button', { name: 'First name' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc' })
    await expect(firstRow).toContainText('P10')

    await page.getByRole('button', { name: 'Next page' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc', page: '1' })
    await expect(firstRow).toContainText('P00')
    await page.reload()
    await expect(firstRow).toContainText('P00')
  })
})

test.describe('persons as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('sees no write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/persons')
    await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toHaveCount(0)

    await page.goto('/persons/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
    await expectAccessible(page)
  })

  test('an unknown person id shows the 404 page', async ({ page }) => {
    await openAs(page, '/persons/999999999')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
