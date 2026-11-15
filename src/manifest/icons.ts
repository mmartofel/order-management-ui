import { CircleHelp, CreditCard, ListChecks, MapPin, Package, ShoppingCart, Truck, Users, type LucideIcon } from 'lucide-react'

// Icon names used by `nav.icon` in ui-manifest.yaml. Add an entry when a resource uses a new icon.
const icons: Record<string, LucideIcon> = {
  users: Users,
  'list-checks': ListChecks,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  truck: Truck,
  'map-pin': MapPin,
  package: Package,
}

export function getIcon(name: string): LucideIcon {
  return icons[name] ?? CircleHelp
}
