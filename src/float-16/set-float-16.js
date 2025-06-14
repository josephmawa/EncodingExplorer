"use strict";
/**
 * org.gnome.Platform//48 bundles gjs 1.84.2 which
 * is based on SpiderMonkey 128. It doesn't have
 * DataView.prototype.setFloat16 method yet. This is
 * a polyfill.
 * 
 * Source: https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.data-view.set-float16.js
 */

const EPSILON = 2.220446049250313e-16; // Number.EPSILON
const INVERSE_EPSILON = 1 / EPSILON;

function roundTiesToEven(n) {
  return n + INVERSE_EPSILON - INVERSE_EPSILON;
}

const pow = Math.pow;
const log2 = Math.log2;

const MIN_INFINITY16 = 65520; // (2 - 2 ** -11) * 2 ** 15
const MIN_NORMAL16 = 0.000061005353927612305; // (1 - 2 ** -11) * 2 ** -14
const REC_MIN_SUBNORMAL16 = 16777216; // 2 ** 10 * 2 ** 14
const REC_SIGNIFICAND_DENOM16 = 1024; // 2 ** 10;

function packFloat16(value) {
  // eslint-disable-next-line no-self-compare -- NaN check
  if (value !== value) return 0x7e00; // NaN
  if (value === 0) return (1 / value === -Infinity) << 15; // +0 or -0

  const neg = value < 0;
  if (neg) value = -value;
  if (value >= MIN_INFINITY16) return (neg << 15) | 0x7c00; // Infinity
  if (value < MIN_NORMAL16)
    return (neg << 15) | roundTiesToEven(value * REC_MIN_SUBNORMAL16); // subnormal

  // normal
  const exponent = log2(value) | 0;
  if (exponent === -15) {
    // we round from a value between 2 ** -15 * (1 + 1022/1024) (the largest subnormal) and 2 ** -14 * (1 + 0/1024) (the smallest normal)
    // to the latter (former impossible because of the subnormal check above)
    return (neg << 15) | REC_SIGNIFICAND_DENOM16;
  }
  const significand = roundTiesToEven(
    (value * pow(2, -exponent) - 1) * REC_SIGNIFICAND_DENOM16
  );
  if (significand === REC_SIGNIFICAND_DENOM16) {
    // we round from a value between 2 ** n * (1 + 1023/1024) and 2 ** (n + 1) * (1 + 0/1024) to the latter
    return (neg << 15) | ((exponent + 16) << 10);
  }
  return (neg << 15) | ((exponent + 15) << 10) | significand;
}

const setUint16 = Function.prototype.bind.call(
  Function.prototype.call,
  Function.prototype.call,
  DataView.prototype.setUint16
);

if (!Object.hasOwn(DataView.prototype, "setFloat16")) {
  Object.defineProperty(DataView.prototype, "setFloat16", {
    writable: true,
    enumerable: false,
    configurable: true,
    value: function (byteOffset, value /* , littleEndian */) {
      setUint16(
        this,
        byteOffset,
        packFloat16(+value),
        arguments.length > 2 ? arguments[2] : false
      );
    },
  });
}
