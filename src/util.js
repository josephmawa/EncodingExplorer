export const radixObject = {
  Binary: 2,
  Octal: 8,
  Decimal: 10,
  Hexadecimal: 16,
};

export function clamp(min, max, num) {
  return Math.max(min, Math.min(num, max));
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

export class Encode {
  constructor() {
    this.utf8Encode = new TextEncoder().encode;
    this.radixObject = {
      Binary: 2,
      Octal: 8,
      Decimal: 10,
      Hexadecimal: 16,
    };
  }

  convertBase = (codeUnitsArr, radix) => {
    let maxLength;

    if (radix === 2) {
      maxLength = 8;
    } else if (radix === 8 || radix === 10) {
      maxLength = 3;
    } else if (radix === 16) {
      maxLength = 2;
    } else {
      throw new Error("Base must be 2, 8, 10, or 16");
    }

    return codeUnitsArr
      .map((codeUnit) => {
        return codeUnit.toString(radix).padStart(maxLength, "0");
      })
      .join(" ");
  };

  ascii = (string, radix) => {};

  utf8 = (string, radix) => {
    const codeUnits = [...this.utf8Encode(string)];
    return this.convertBase(codeUnits, this.radixObject[radix]);
  };
}
