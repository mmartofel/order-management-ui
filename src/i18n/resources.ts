// One file per top-level key: common.json -> `common.*`, enums.json -> `enums.*`,
// <resource>.json -> `<resource>.*`. A new language: src/locales/<lang>/ plus one entry here, then list it in
// ui-manifest.yaml `app.languages`.
import enOrders from '@/locales/en/orders.json'
import enPayments from '@/locales/en/payments.json'
import enDeliveries from '@/locales/en/deliveries.json'
import enPersons from '@/locales/en/persons.json'
import enAddresses from '@/locales/en/addresses.json'
import enItems from '@/locales/en/items.json'
import enCommon from '@/locales/en/common.json'
import enEnums from '@/locales/en/enums.json'
import plOrders from '@/locales/pl/orders.json'
import plPayments from '@/locales/pl/payments.json'
import plDeliveries from '@/locales/pl/deliveries.json'
import plPersons from '@/locales/pl/persons.json'
import plAddresses from '@/locales/pl/addresses.json'
import plItems from '@/locales/pl/items.json'
import plCommon from '@/locales/pl/common.json'
import plEnums from '@/locales/pl/enums.json'
import { app } from '@/manifest'

export const resources = {
  en: {
    translation: {
      common: enCommon,
      enums: enEnums,
      orders: enOrders,
      payments: enPayments,
      deliveries: enDeliveries,
      persons: enPersons,
      addresses: enAddresses,
      items: enItems,
    },
  },
  pl: {
    translation: {
      common: plCommon,
      enums: plEnums,
      orders: plOrders,
      payments: plPayments,
      deliveries: plDeliveries,
      persons: plPersons,
      addresses: plAddresses,
      items: plItems,
    },
  },
} as const

export type Language = keyof typeof resources

const isAvailable = (value: unknown): value is Language => typeof value === 'string' && value in resources

/** The languages offered (ui-manifest.yaml `app.languages` with locale files); the first is the default. */
export const languages: Language[] = app.languages.filter(isAvailable)
if (languages.length === 0) throw new Error('ui-manifest.yaml app.languages names no language with locale files')

export const defaultLanguage: Language = languages[0]

export function isLanguage(value: unknown): value is Language {
  return isAvailable(value) && languages.includes(value)
}
