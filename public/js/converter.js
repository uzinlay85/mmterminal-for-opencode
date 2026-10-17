/**
 * Myanmar Unicode <-> Zawgyi Converter and Detector
 * Standard Myanmar Language Processing Engine
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MyanmarConverter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Heuristic Zawgyi detection patterns
  const zgPatterns = [
    /\u1031\u103b/, // e + yayit
    /\u103b\u1031/, // yayit + e
    /\u1031\u107e/, // e + yapint
    /\u107e\u1031/, // yapint + e
    /\u1031\u103a/, // e + asat
    /\u103b\u103a/, // yayit + asat
    /\u1064/, // double asat in zg
    /\u1088/, // u below in zg
    /\u1089/, // u below in zg
    /\u107d/, // wasway tall in zg
    /\u1087/, // hathtoh in zg
    /\u1060|\u1061|\u1062|\u1063/, // stacked consonants in zg
    /\u1031[\u1000-\u1021]/, // e before consonant
    /[\u1000-\u1021]\u1031\u1038/, // cons + e + tone
    /\u1025\u102e/, // u + i
    /\u1033|\u1034/, // medial in zg
  ];

  const uniPatterns = [
    /[\u1000-\u1021]\u103c/, // cons + yayit
    /[\u1000-\u1021]\u103b/, // cons + yapint
    /[\u1000-\u1021]\u103d/, // cons + wasway
    /[\u1000-\u1021]\u103e/, // cons + hathtoh
    /[\u1000-\u1021]\u1039[\u1000-\u1021]/, // virama stack
    /[\u1000-\u1021]\u1031/, // cons + e
    /\u1004\u103a\u1039[\u1000-\u1021]/, // kinzi
    /\u1009\u103a/, // nya lay asat
  ];

  function isZawgyi(text) {
    if (!text || typeof text !== 'string') return false;
    let zgScore = 0;
    let uniScore = 0;

    for (const pat of zgPatterns) {
      const match = text.match(pat);
      if (match) zgScore += match.length * 2;
    }
    for (const pat of uniPatterns) {
      const match = text.match(pat);
      if (match) uniScore += match.length * 2;
    }

    // Specific Zawgyi indicators
    if (/[\u1060-\u1097]/.test(text)) {
      zgScore += 3;
    }

    return zgScore > uniScore;
  }

  // Regex replacement rules for Zawgyi to Unicode
  const zg2uniRules = [
    // Kinzi
    { from: /\u1064/g, to: '\u1004\u103a\u1039' },
    // Stacked consonants in Zawgyi private area
    { from: /\u1060/g, to: '\u1039\u1000' },
    { from: /\u1061/g, to: '\u1039\u1001' },
    { from: /\u1062/g, to: '\u1039\u1002' },
    { from: /\u1063/g, to: '\u1039\u1003' },
    { from: /\u1065/g, to: '\u1039\u1005' },
    { from: /\u1066/g, to: '\u1039\u1006' },
    { from: /\u1067/g, to: '\u1039\u1007' },
    { from: /\u1068/g, to: '\u1039\u1008' },
    { from: /\u1069/g, to: '\u1039\u1009' },
    { from: /\u106a/g, to: '\u1025' },
    { from: /\u106b/g, to: '\u1039\u100a' },
    { from: /\u106c/g, to: '\u1039\u100b' },
    { from: /\u106d/g, to: '\u1039\u100c' },
    { from: /\u106e/g, to: '\u1039\u100d' },
    { from: /\u106f/g, to: '\u1039\u100e' },
    { from: /\u1070/g, to: '\u1039\u100f' },
    { from: /\u1071/g, to: '\u1039\u1010' },
    { from: /\u1072/g, to: '\u1039\u1011' },
    { from: /\u1073/g, to: '\u1039\u1012' },
    { from: /\u1074/g, to: '\u1039\u1013' },
    { from: /\u1075/g, to: '\u1039\u1014' },
    { from: /\u1076/g, to: '\u1039\u1015' },
    { from: /\u1077/g, to: '\u1039\u1016' },
    { from: /\u1078/g, to: '\u1039\u1017' },
    { from: /\u1079/g, to: '\u1039\u1018' },
    { from: /\u107a/g, to: '\u1039\u1019' },
    { from: /\u107b/g, to: '\u1039\u101a' },
    { from: /\u107c/g, to: '\u1037' },
    { from: /\u107d/g, to: '\u103d' },
    { from: /\u107e/g, to: '\u103b' },
    { from: /\u107f/g, to: '\u103b' },
    { from: /\u1080/g, to: '\u103b' },
    { from: /\u1081/g, to: '\u103b' },
    { from: /\u1082/g, to: '\u103d' },
    { from: /\u1083/g, to: '\u103d' },
    { from: /\u1084/g, to: '\u103d' },
    { from: /\u1085/g, to: '\u103e' },
    { from: /\u1086/g, to: '\u103f' },
    { from: /\u1087/g, to: '\u103e' },
    { from: /\u1088/g, to: '\u103d\u103e' },
    { from: /\u1089/g, to: '\u103d\u103e' },
    { from: /\u108a/g, to: '\u103d\u103e' },
    { from: /\u108b/g, to: '\u103c' },
    { from: /\u108c/g, to: '\u103c' },
    { from: /\u108d/g, to: '\u103c' },
    { from: /\u108e/g, to: '\u103c' },
    { from: /\u108f/g, to: '\u103c' },
    { from: /\u1090/g, to: '\u101b' },
    { from: /\u1091/g, to: '\u1037' },
    { from: /\u1092/g, to: '\u1037' },
    { from: /\u1093/g, to: '\u1040' },
    { from: /\u1094/g, to: '\u1037' },
    { from: /\u1095/g, to: '\u1037' },
    { from: /\u1096/g, to: '\u1049' },
    { from: /\u1097/g, to: '\u1037' },
    // Medial Ra (Yayit) reordering: in ZG yayit is typed before or after
    { from: /\u103b([\u1000-\u1021])/g, to: '$1\u103c' },
    // "e" vowel reordering: in ZG \u1031 is typed BEFORE consonant
    { from: /\u1031([\u1000-\u1021])(\u1039[\u1000-\u1021])?/g, to: '$1$2\u1031' },
    // Great Nya \u1090
    { from: /\u1025\u102e/g, to: '\u1026' },
    { from: /\u1025\u103a/g, to: '\u1009\u103a' },
    // Zero width space or duplicates
    { from: /\u200b/g, to: '' }
  ];

  function zawgyiToUnicode(input) {
    if (!input || typeof input !== 'string') return '';
    let output = input;

    // Run conversion passes
    for (const rule of zg2uniRules) {
      output = output.replace(rule.from, rule.to);
    }

    // Secondary reordering for remaining "e" before consonants
    output = output.replace(/\u1031([\u1000-\u1021])/g, '$1\u1031');

    return output;
  }

  return {
    isZawgyi: isZawgyi,
    zawgyiToUnicode: zawgyiToUnicode
  };
}));
