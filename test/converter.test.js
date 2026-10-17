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
