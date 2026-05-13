const { encode, decode } = require('../../backend/src/utils/base62');

// CHARSET: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
// Indices: 0-9 → '0'-'9', 10-35 → 'A'-'Z', 36-61 → 'a'-'z'

describe('base62 — encode', () => {
  test('encode(1) = "1"', () => expect(encode(1)).toBe('1'));
  test('encode(0) = "0"', () => expect(encode(0)).toBe('0'));
  test('encode(62) = "10"  (62 = 1×62^1)', () => expect(encode(62)).toBe('10'));
  test('encode(3844) = "100" (62^2)', () => expect(encode(3844)).toBe('100'));
  test('encode(238328) = "1000" (62^3)', () => expect(encode(238328)).toBe('1000'));
  test('all codes are at least 1 character', () => {
    [1, 100, 9999, 1_000_000].forEach(n => {
      expect(encode(n).length).toBeGreaterThanOrEqual(1);
    });
  });
  test('codes only contain charset characters', () => {
    const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    [1, 42, 999, 12345, 999999].forEach(n => {
      for (const ch of encode(n)) {
        expect(CHARSET.includes(ch)).toBe(true);
      }
    });
  });
});

describe('base62 — decode', () => {
  test('decode("1") = 1', () => expect(decode('1')).toBe(1));
  test('decode("0") = 0', () => expect(decode('0')).toBe(0));
  test('decode("10") = 62', () => expect(decode('10')).toBe(62));
  test('roundtrip: decode(encode(12345)) === 12345', () => {
    expect(decode(encode(12345))).toBe(12345);
  });
  test('roundtrip: decode(encode(999999)) === 999999', () => {
    expect(decode(encode(999999))).toBe(999999);
  });
  test('roundtrip: decode(encode(56800235583)) === 56800235583 (max 6-char = "zzzzzz")', () => {
    // 62^6 - 1 = 56,800,235,583 → 'zzzzzz'
    expect(encode(56800235583)).toBe('zzzzzz');
    expect(decode(encode(56800235583))).toBe(56800235583);
  });
});

// ---------------------------------------------------------------------------
// Collision Rate Test
//
// In this URL shortener every row gets a unique auto-increment primary key.
// encode() is a bijection (one-to-one map) from integers → base-62 strings,
// so two distinct IDs can NEVER produce the same short code.
// The tests below verify this empirically and document theoretical capacity.
// ---------------------------------------------------------------------------
describe('base62 — collision rate test', () => {
  const SAMPLE_SIZE = 100_000;

  test(`zero collisions across ${SAMPLE_SIZE.toLocaleString()} sequential IDs`, () => {
    const seen = new Set();
    for (let id = 1; id <= SAMPLE_SIZE; id++) {
      seen.add(encode(id));
    }

    const collisions = SAMPLE_SIZE - seen.size;
    const collisionRate = collisions / SAMPLE_SIZE;

    console.log('\n[base62 Collision Rate Test]');
    console.log(`  Sample size:    ${SAMPLE_SIZE.toLocaleString()} IDs`);
    console.log(`  Unique codes:   ${seen.size.toLocaleString()}`);
    console.log(`  Collisions:     ${collisions}`);
    console.log(`  Collision rate: ${(collisionRate * 100).toFixed(6)}%`);
    console.log(`  Capacity (6-char codes): 62^6 = ${Math.pow(62, 6).toLocaleString()}`);

    expect(collisions).toBe(0);
    expect(collisionRate).toBe(0);
  });

  test('theoretical capacity: 62^6 = 56,800,235,584 unique short codes', () => {
    // A 6-character base-62 string can represent this many distinct values,
    // supporting over 56 billion unique shortened URLs before needing 7 chars.
    const capacity = Math.pow(62, 6);
    expect(capacity).toBe(56_800_235_584);
    expect(capacity).toBeGreaterThan(56_000_000_000);
  });

  test('consecutive IDs always produce distinct codes', () => {
    for (let id = 1; id < 1_000; id++) {
      expect(encode(id)).not.toBe(encode(id + 1));
    }
  });

  test('10,000 unique IDs → 10,000 unique codes (Set cardinality matches)', () => {
    const codes = new Set();
    for (let id = 1; id <= 10_000; id++) codes.add(encode(id));
    expect(codes.size).toBe(10_000);
  });

  test('encode is a pure function: same input → same output', () => {
    const id = 42_000;
    expect(encode(id)).toBe(encode(id));
    expect(encode(id)).toBe(encode(id));
  });
});
