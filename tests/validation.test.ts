import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateSuiAddress,
  validateCoinType,
  validateMistAmount,
  validateSymbol,
  validateName,
} from '../src/validation.js'

describe('ValidationError', () => {
  it('creates an error with the given message', () => {
    const err = new ValidationError('test message')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('test message')
    expect(err.name).toBe('ValidationError')
  })
})

describe('validateSuiAddress', () => {
  it('accepts a valid 0x-prefixed address', () => {
    expect(() => validateSuiAddress('0x1234abcd', 'address')).not.toThrow()
  })

  it('accepts a full-length address', () => {
    expect(() => validateSuiAddress('0x' + 'a'.repeat(64), 'address')).not.toThrow()
  })

  it('rejects address without 0x prefix', () => {
    expect(() => validateSuiAddress('1234abcd', 'address')).toThrow(ValidationError)
    expect(() => validateSuiAddress('1234abcd', 'address')).toThrow(/address/)
  })

  it('rejects empty string', () => {
    expect(() => validateSuiAddress('', 'address')).toThrow(ValidationError)
  })

  it('rejects address with invalid hex chars', () => {
    expect(() => validateSuiAddress('0xzzzz', 'address')).toThrow(ValidationError)
  })
})

describe('validateCoinType', () => {
  it('accepts a valid coin type', () => {
    expect(() => validateCoinType('0x2::sui::SUI', 'coinType')).not.toThrow()
  })

  it('accepts a full coin type with module and type', () => {
    expect(() => validateCoinType('0xabc::my_module::MyToken', 'coinType')).not.toThrow()
  })

  it('rejects coin type without 0x prefix', () => {
    expect(() => validateCoinType('2::sui::SUI', 'coinType')).toThrow(ValidationError)
  })

  it('rejects coin type without double colon separators', () => {
    expect(() => validateCoinType('0x2-sui-SUI', 'coinType')).toThrow(ValidationError)
  })

  it('rejects empty string', () => {
    expect(() => validateCoinType('', 'coinType')).toThrow(ValidationError)
  })
})

describe('validateMistAmount', () => {
  it('accepts a positive integer string', () => {
    expect(() => validateMistAmount('1000000', 'amount')).not.toThrow()
  })

  it('rejects zero', () => {
    expect(() => validateMistAmount('0', 'amount')).toThrow(ValidationError)
  })

  it('rejects negative string', () => {
    expect(() => validateMistAmount('-100', 'amount')).toThrow(ValidationError)
  })

  it('rejects empty string', () => {
    expect(() => validateMistAmount('', 'amount')).toThrow(ValidationError)
  })

  it('rejects non-numeric string', () => {
    expect(() => validateMistAmount('abc', 'amount')).toThrow(ValidationError)
  })
})

describe('validateSymbol', () => {
  it('accepts a short symbol', () => {
    expect(() => validateSymbol('TEST')).not.toThrow()
  })

  it('accepts a 10-char symbol', () => {
    expect(() => validateSymbol('A1B2C3D4E5')).not.toThrow()
  })

  it('accepts symbol with numbers and underscores', () => {
    expect(() => validateSymbol('MY_TOKEN')).not.toThrow()
  })

  it('rejects symbol longer than 10 chars', () => {
    expect(() => validateSymbol('TOOLONG_SYM')).toThrow(ValidationError)
  })

  it('rejects empty symbol', () => {
    expect(() => validateSymbol('')).toThrow(ValidationError)
  })

  it('rejects symbol with spaces', () => {
    expect(() => validateSymbol('AB C')).toThrow(ValidationError)
  })
})

describe('validateName', () => {
  it('accepts a standard name', () => {
    expect(() => validateName('My Token')).not.toThrow()
  })

  it('accepts a 100-char name', () => {
    expect(() => validateName('a'.repeat(100))).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => validateName('')).toThrow(ValidationError)
  })

  it('rejects name longer than 100 chars', () => {
    expect(() => validateName('a'.repeat(101))).toThrow(ValidationError)
  })
})
