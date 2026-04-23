const { isValidUrl, isValidAlias, isValidEmail } = require('../../backend/src/utils/validator');

describe('isValidUrl', () => {
  it('accepts https URLs', () => expect(isValidUrl('https://example.com')).toBe(true));
  it('accepts http URLs', () => expect(isValidUrl('http://example.com/path?q=1')).toBe(true));
  it('rejects plain text', () => expect(isValidUrl('not-a-url')).toBe(false));
  it('rejects empty string', () => expect(isValidUrl('')).toBe(false));
  it('rejects ftp URLs', () => expect(isValidUrl('ftp://example.com')).toBe(false));
  it('rejects javascript protocol', () => expect(isValidUrl('javascript:alert(1)')).toBe(false));
});

describe('isValidAlias', () => {
  it('accepts alphanumeric', () => expect(isValidAlias('mylink')).toBe(true));
  it('accepts hyphens', () => expect(isValidAlias('my-link')).toBe(true));
  it('accepts underscores', () => expect(isValidAlias('my_link')).toBe(true));
  it('rejects too short (< 3 chars)', () => expect(isValidAlias('ab')).toBe(false));
  it('rejects spaces', () => expect(isValidAlias('my link')).toBe(false));
  it('rejects special chars', () => expect(isValidAlias('my@link')).toBe(false));
  it('rejects too long (> 20 chars)', () => expect(isValidAlias('a'.repeat(21))).toBe(false));
});

describe('isValidEmail', () => {
  it('accepts valid email', () => expect(isValidEmail('user@example.com')).toBe(true));
  it('rejects missing @', () => expect(isValidEmail('userexample.com')).toBe(false));
  it('rejects empty string', () => expect(isValidEmail('')).toBe(false));
});
