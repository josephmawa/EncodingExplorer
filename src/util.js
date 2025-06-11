const radixObject = {
  Binary: 2,
  Octal: 8,
  Decimal: 10,
  Hexadecimal: 16,
};

export const floatingPointFormats = [
  {
    key: "half_precision",
    format: _("Half Precision"),
  },
  {
    key: "single_precision",
    format: _("Single Precision"),
  },
  {
    key: "double_precision",
    format: _("Double Precision"),
  },
];

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

export function getIEEEBitFields(encoding, format) {
  let exponentBits = 5;
  if (format === "single_precision") {
    exponentBits = 8;
  }

  if (format === "double_precision") {
    exponentBits = 11;
  }

  return [
    encoding.slice(0, 1),
    encoding.slice(1, 1 + exponentBits),
    encoding.slice(1 + exponentBits),
  ];
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
    if (encodedStr.length) {
      encodedStr = encodedStr + byteSep + byte;
    } else {
      encodedStr = encodedStr + byte;
    }
    encodingOffsets.push([encodedStr.length - byte.length, encodedStr.length]);
  }

  return encodingOffsets;
}

export function getIEEEEncodedString(bitFields, actualNumber, numberStored) {
  const [signBit, exponentBits, mantissaBits] = bitFields;
  return (
    `<span weight="ultraheavy">Binary encoding</span>\n` +
    `<span>${signBit}</span> <span>${exponentBits}</span> <span>${mantissaBits}</span>\n\n` +
    `<span weight="bold">Sign Bit</span>\n` +
    `<span>${signBit}</span>\n\n` +
    `<span weight="bold">Exponent bits</span>\n` +
    `<span>${exponentBits}</span>\n\n` +
    `<span weight="bold">Mantissa bits</span>\n` +
    `<span>${mantissaBits}</span>\n\n` +
    `<span weight="bold">Actual number</span>\n` +
    `<span>${actualNumber}</span>\n\n` +
    `<span weight="bold">Stored number</span>\n` +
    `<span>${numberStored}</span>\n\n` +
     `<span weight="bold">Conversion Error</span>\n` +
    `<span>${numberStored}</span>\n\n`
  );
}
