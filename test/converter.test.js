/**
 * Unit tests for the Myanmar Unicode <-> Zawgyi converter.
 * Run with: npm test   (uses the built-in node:test runner, no extra deps)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const converter = require('../public/js/converter.js');

test('exposes isZawgyi and zawgyiToUnicode', () => {
  assert.equal(typeof converter.isZawgyi, 'function');
  assert.equal(typeof converter.zawgyiToUnicode, 'function');
});

test('isZawgyi returns false for plain ASCII', () => {
  assert.equal(converter.isZawgyi('hello world'), false);
});

test('isZawgyi returns false for standard Unicode Myanmar', () => {
  // "မြန်မာ" (Unicode) must not be flagged as Zawgyi.
  assert.equal(converter.isZawgyi('မြန်မာ'), false);
});

test('isZawgyi is safe for empty and non-string input', () => {
  assert.equal(converter.isZawgyi(''), false);
  assert.equal(converter.isZawgyi(null), false);
  assert.equal(converter.isZawgyi(undefined), false);
});

test('zawgyiToUnicode returns empty string for bad input', () => {
  assert.equal(converter.zawgyiToUnicode(''), '');
  assert.equal(converter.zawgyiToUnicode(null), '');
});

test('reorders the "e" vowel typed before its consonant', () => {
  // Zawgyi \u1031\u1000 -> Unicode \u1000\u1031
  assert.equal(converter.zawgyiToUnicode('\u1031\u1000'), '\u1000\u1031');
});

test('converts Zawgyi kinzi (U+1064)', () => {
  assert.equal(converter.zawgyiToUnicode('\u1064'), '\u1004\u103a\u1039');
});

test('maps Zawgyi yapint (U+107E) to Unicode yayit (U+103C-ish)', () => {
  assert.equal(converter.zawgyiToUnicode('\u107e'), '\u103b');
});

test('maps Zawgyi stacked consonants from the private-use area', () => {
  // U+1060 is a stacked "ka" in Zawgyi -> Unicode virama + ka
  assert.equal(converter.zawgyiToUnicode('\u1060'), '\u1039\u1000');
});

test('strips zero width spaces', () => {
  assert.equal(converter.zawgyiToUnicode('\u1000\u200b\u1001'), '\u1000\u1001');
});

test('detects and converts a medial typed before its consonant', () => {
  // Zawgyi order: medial ra (U+103B) typed before the consonant -> Unicode "မြန်မာ".
  const zawgyi = '\u103b\u1019\u1014\u103a\u1019\u102c';
  const unicode = '\u1019\u103c\u1014\u103a\u1019\u102c';
  assert.equal(converter.isZawgyi(zawgyi), true);
  assert.equal(converter.zawgyiToUnicode(zawgyi), unicode);
});

test('does not flag valid Unicode where a medial is followed by a consonant', () => {
  // "ကျပ်" (က + ျ + ပ) and "မြန်မာ" (မ + ြ + န) are plain Unicode.
  assert.equal(converter.isZawgyi('\u1000\u103b\u1015\u103a'), false);
  assert.equal(converter.isZawgyi('\u1019\u103c\u1014\u103a\u1019\u102c'), false);
});

test('moves Zawgyi kinzi in front of its consonant', () => {
  // Zawgyi stores kinzi as U+1064 after its consonant -> Unicode "မင်္ဂလာပါ".
  assert.equal(
    converter.zawgyiToUnicode('\u1019\u1002\u1064\u101c\u102c\u1015\u102b'),
    '\u1019\u1004\u103a\u1039\u1002\u101c\u102c\u1015\u102b'
  );
});
