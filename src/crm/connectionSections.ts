// Single source of truth for connection sections: used by the sidebar and the hub page.
// `to` is a route suffix (`/supplies`) or a hash panel on ConnectionDetail (`#settings`).

export type DataSourceName = 'ozon' | 'wildberries'

export interface ConnectionSection {
  key: string
  nav: string          // short label for the sidebar
  title: string        // tile title on the hub
  description: string
  to: string
  activeAlso?: string  // route suffix of sub-pages that belong to a hash panel
}

export interface ConnectionSectionGroup {
  title: string
  items: ConnectionSection[]
}

const OZON: ConnectionSectionGroup[] = [
  {
    title: 'Поставки',
    items: [
      { key: 'supply-templates', nav: 'Формирование', title: 'Формирование поставок', description: 'План и создание поставок по остаткам и доступности складов', to: '/supply-templates' },
      { key: 'supplies', nav: 'Поставки Ozon', title: 'Поставки Ozon', description: 'Грузоместа и документы к поставке', to: '/supplies' },
      { key: 'stock-history', nav: 'Остатки и дефицит', title: 'Остатки и дефицит', description: 'История остатков и продаж: что поставить и что произвести', to: '/stock-history' },
    ],
  },
  {
    title: 'Каталог',
    items: [
      { key: 'vendor-products', nav: 'Товары поставщика', title: 'Товары поставщика', description: 'Остатки на складах поставщика', to: '/vendor-products' },
      { key: 'ozon-products', nav: 'Товары Ozon', title: 'Товары Ozon', description: 'Кратность товаров в коробе', to: '/ozon-products' },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { key: 'chestny-znak', nav: 'Честный ЗНАК', title: 'Честный ЗНАК', description: 'Коды маркировки и ввод в оборот', to: '#chestny-znak', activeAlso: '/chestny-znak' },
      { key: 'reports', nav: 'Отчёты', title: 'Отчёты', description: 'Выгрузка отчётов в CSV', to: '#reports' },
      { key: 'kaiten', nav: 'Kaiten', title: 'Kaiten', description: 'Интеграция с досками Kaiten', to: '#kaiten' },
    ],
  },
]

const WB: ConnectionSectionGroup[] = [
  {
    title: 'Поставки',
    items: [
      { key: 'wb-supply-plans', nav: 'Запланировать', title: 'Запланировать поставку', description: 'Забронировать дату поставки (небезопасно)', to: '/wb-supply-plans' },
      { key: 'redistribution-orders', nav: 'Перераспределение', title: 'Перераспределить остатки', description: 'Перемещение товара между складами', to: '/redistribution-orders' },
      { key: 'wb-products', nav: 'Товары WB', title: 'Товары Wildberries', description: 'Карточки с тегом «В работе» и кратность коробов', to: '/wb-products' },
    ],
  },
  {
    title: 'FBS',
    items: [
      { key: 'fulfillments', nav: 'Фулфилменты', title: 'Фулфилменты', description: 'Организации, склады, тарифы', to: '/fulfillments' },
      { key: 'product-categories', nav: 'Категории', title: 'Категории товаров', description: 'Категории для расчёта тарифов', to: '/product-categories' },
      { key: 'fbs-orders', nav: 'Заказы FBS', title: 'Заказы FBS', description: 'Статусы и история заказов', to: '/fbs-orders' },
      { key: 'fulfillment-supplies', nav: 'Поставки FBS', title: 'Поставки FBS', description: 'Стоимость фулфилмента по тарифам', to: '/fulfillment-supplies' },
      { key: 'fbs-shipments', nav: 'Отгрузки', title: 'Отгрузки товаров', description: 'Отгрузки фулфилментам по категориям и датам', to: '/fbs-shipments' },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { key: 'chestny-znak', nav: 'Честный ЗНАК', title: 'Честный ЗНАК', description: 'Коды маркировки и ввод в оборот', to: '#chestny-znak', activeAlso: '/chestny-znak' },
      { key: 'reports', nav: 'Отчёты', title: 'Отчёты', description: 'Выгрузка отчётов в CSV', to: '#reports' },
      { key: 'kaiten', nav: 'Kaiten', title: 'Kaiten', description: 'Интеграция с досками Kaiten', to: '#kaiten' },
    ],
  },
]

export const getSectionGroups = (source?: string | null): ConnectionSectionGroup[] =>
  source === 'wildberries' ? WB : OZON

// Settings live at the bottom of the sidebar, not in the tile grid.
export const SETTINGS_SECTION: Record<DataSourceName, ConnectionSection | null> = {
  ozon: { key: 'settings', nav: 'Настройки поставок', title: 'Настройки поставок', description: '', to: '#settings' },
  wildberries: { key: 'wb-auth', nav: 'Авторизация WB', title: 'Авторизация Wildberries', description: '', to: '#wb-auth' },
}

export const sectionHref = (connectionId: number | string, to: string) => `/connections/${connectionId}${to}`
