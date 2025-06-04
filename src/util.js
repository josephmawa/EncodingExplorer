export const radixObject = {
  Binary: 2,
  Octal: 8,
  Decimal: 10,
  Hexadecimal: 16,
};

export function getMaxLength(base) {
  if (base === 2) return 8;
  if (base === 8 || base === 10) return 3;
  return 2;
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
