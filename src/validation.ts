const SUI_ADDRESS_RE = /^0x[0-9a-fA-F]+$/
const COIN_TYPE_RE = /^0x[0-9a-fA-F]+::\w+::\w+$/
const MIST_AMOUNT_RE = /^\d+$/
const SYMBOL_RE = /^[A-Za-z0-9_]{1,10}$/
const NAME_RE = /^.{1,100}$/

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateSuiAddress(value: string, label: string): void {
  if (!SUI_ADDRESS_RE.test(value)) {
    throw new ValidationError(`Invalid ${label}: must be a valid 0x-prefixed Sui address (got "${value}")`)
  }
}

export function validateCoinType(value: string, label: string): void {
  if (!COIN_TYPE_RE.test(value)) {
    throw new ValidationError(`Invalid ${label}: must be a valid coin type (e.g. 0xPkg::mod::Type)`)
  }
}

export function validateMistAmount(value: string, label: string): void {
  if (!MIST_AMOUNT_RE.test(value) || value === '0') {
    throw new ValidationError(`Invalid ${label}: must be a positive integer string in MIST (got "${value}")`)
  }
}

export function validateSymbol(value: string): void {
  if (!SYMBOL_RE.test(value)) {
    throw new ValidationError(`Invalid symbol: 1-10 alphanumeric characters (got "${value}")`)
  }
}

export function validateName(value: string): void {
  if (!NAME_RE.test(value)) {
    throw new ValidationError(`Invalid name: 1-100 characters (got "${value}")`)
  }
}
