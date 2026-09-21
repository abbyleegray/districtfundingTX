import rawVariables from '../data/mo_variables.json'
import type { MOVariable } from './types'

export const MO_VARIABLES = rawVariables as MOVariable[]

const bySymbol = new Map(MO_VARIABLES.map((v) => [v.symbol, v]))

export function getVariable(symbol: string): MOVariable {
  const v = bySymbol.get(symbol)
  if (!v) throw new Error(`Unknown MO variable symbol: ${symbol}`)
  return v
}

export function variablesByCategory(category: string): MOVariable[] {
  return MO_VARIABLES.filter((v) => v.category === category)
}

export function variablesByFspComponent(component: string): MOVariable[] {
  return MO_VARIABLES.filter((v) => v.fsp_component === component)
}
