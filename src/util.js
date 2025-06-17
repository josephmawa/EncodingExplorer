const radixObject = {
  Binary: 2,
  Octal: 8,
  Decimal: 10,
  Hexadecimal: 16,
};

export const regexes = {
  /**
   * FIXME:
   * This regex is AI-generated. I'm not sure I've fully understood
   * what it does. Read more to ensure I've fully understood what it
   * does or how it works.
   *
   * It checks for the validity of the string after inserting the
   * yet-to-be-inserted character in the buffer text. It is used in the
   * insert-text signal handler. The entry is blocked if the result
   * of the entry is not a valid string i.e. it is not a valid number,
   * Infinity, -Infinity, NaN, or a valid substring of the mentioned strings.
   */
  validEntry:
    /^(?:(?:-?(?:\d*(?:\.\d*)?)?)|(?:-?I(?:n(?:f(?:i(?:n(?:i(?:t(?:y)?)?)?)?)?)?)?)|(?:-)?|(?:N(?:a(?:N)?)?))$/,
  /**
   * This regex checks whether the character being inserted
   * in the text buffer is a valid character. Valid characters are
   * those that constitute valid numbers and characters in the words
   * Infinity, -Infinity, and NaN. It is for blocking non-valid character
   * key presses when converting numbers to IEEE-754 floating point format.
   */
  validCharacter: /[-.0-9InfityNa]/,
  /**
   * This regex checks whether an entry is complete. An entry must
   * be complete before processing. Incomplete entries include "-"", "I", "In",
   * "N", "Na" e.t.c. This happens when a user is entering or deleting text.
   */
  completeEntry: /^(?:-?(?:\d+\.\d+|\d+|\.\d+)|Infinity|-Infinity|NaN)$/,
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

export function getActualStoredNumber(storedNum) {
  return new BigNumber(storedNum.toString(16), 16).toString(10);
}

export function getConversionError(enteredText, storedNum) {
  const numbers = [+enteredText, storedNum];
  if (
    numbers.every((number) => number === Infinity) ||
    numbers.every((number) => number === -Infinity)
  ) {
    return "0";
  }

  if (numbers.every((number) => Number.isFinite(number))) {
    const actualBigNum = new BigNumber(enteredText);
    const storedBigNum = new BigNumber(getActualStoredNumber(storedNum));

    return actualBigNum.minus(storedBigNum).absoluteValue().toString();
  }

  return "Undefined";
}

export function getIEEEEncodedString({
  text,
  bitFields,
  conversionError,
  actualStoredNumber,
}) {
  const [signBit, exponentBits, mantissaBits] = bitFields;
  return (
    `<span weight="ultraheavy">${_("Binary encoding")}</span>\n` +
    `<span>${signBit}</span> <span>${exponentBits}</span> <span>${mantissaBits}</span>\n\n` +
    `<span weight="bold">${_("Sign Bit")}</span>\n` +
    `<span>${signBit}</span>\n\n` +
    `<span weight="bold">${_("Exponent bits")}</span>\n` +
    `<span>${exponentBits}</span>\n\n` +
    `<span weight="bold">${_("Mantissa bits")}</span>\n` +
    `<span>${mantissaBits}</span>\n\n` +
    `<span weight="bold">${_("Actual number")}</span>\n` +
    `<span>${text}</span>\n\n` +
    `<span weight="bold">${_("Stored number")}</span>\n` +
    `<span>${actualStoredNumber}</span>\n\n` +
    `<span weight="bold">${_("Conversion Error")}</span>\n` +
    `<span>${conversionError}</span>\n\n`
  );
}
