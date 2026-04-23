const { encode, decode } = require('../../backend/src/utils/base62');
test('encode 1 = 000001', () => { expect(encode(1)).toBe('000001'); });
test('roundtrip', () => { expect(decode(encode(12345))).toBe(12345); });
