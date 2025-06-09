const radixObject = {
  Binary: 2,
  Octal: 8,
  Decimal: 10,
  Hexadecimal: 16,
};

export function clamp(min, max, num) {
  return Math.max(min, Math.min(num, max));
}

export function round(number, decPlaces = 0) {
  const multiple = Math.pow(10, decPlaces);
  return Math.round(number * multiple) / multiple;
}

export function getRadix(radix) {
  return radixObject[radix];
}

export function getMaxLength(base) {
  if (base === 2) return 8;
  if (base === 8 || base === 10) return 3;
  return 2;
}

export function getTextOffsets(segments) {
  const textOffsets = [];
  let i = 0;

  for (const { segment } of segments) {
    const codePoints = [...segment].length;
    textOffsets.push([i, i + codePoints]);
    i += codePoints;
  }

  return textOffsets;
}

export function getEncodingOffsets(encoding, byteSep = " ") {
  const encodingOffsets = [];
  let encodedStr = "";

  for (const byte of encoding) {
    encodedStr = encodedStr.length
      ? encodedStr + byteSep + byte
      : encodedStr + byte;
    encodingOffsets.push([encodedStr.length - byte.length, encodedStr.length]);
  }

  return encodingOffsets;
}
