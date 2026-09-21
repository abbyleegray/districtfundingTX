import type { CostBehaviorTag } from './types'

export interface LineItem {
  symbol: string
  name: string
  /** Tier One | Tier Two | ASF | IMTA | Other Programs */
  section: string
  category: string
  costBehaviorTag: CostBehaviorTag
  amount: number
  /** Whether this line also sums into WADA (Subchapter B/C allotments). */
  feedsWada: boolean
  note?: string
}

export function li(
  symbol: string,
  name: string,
  section: string,
  category: string,
  costBehaviorTag: CostBehaviorTag,
  amount: number,
  feedsWada: boolean,
  note?: string,
): LineItem {
  return { symbol, name, section, category, costBehaviorTag, amount, feedsWada, note }
}
