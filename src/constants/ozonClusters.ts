/**
 * Ozon cluster_ids of CIS (non-Russian) clusters, i.e. those returned by
 * Ozon for CLUSTER_TYPE_CIS. The backend does not store cluster type, so
 * Russian and CIS clusters are listed here by hand.
 */
export const OZON_CIS_CLUSTER_IDS: ReadonlySet<number> = new Set([
  107, // Армения
  109, // Беларусь
  111, // Узбекистан
  195, // Алматы
  196, // Астана
])

/**
 * Ozon cluster_ids prefilled by the "Все РФ" button in the supply modal.
 * Comment out a line to exclude that cluster from the prefill.
 */
export const OZON_RU_CLUSTER_IDS: ReadonlySet<number> = new Set([
  154, // Москва, МО и Дальние регионы
  2, // Санкт-Петербург и СЗО
  147, // Ростов
  151, // Новосибирск
  176, // Екатеринбург
  16, // Воронеж
  17, // Краснодар
  144, // Тюмень
  148, // Уфа
  149, // Казань
  150, // Самара
  152, // Омск
  7, // Дальний Восток
  155, // Красноярск
  170, // Ярославль
  171, // Саратов
  174, // Тверь
  179, // Оренбург
  180, // Пермь
  191, // Невинномысск
  193, // Махачкала
])
