"use strict";
/**
 * org.gnome.Platform//48 bundles gjs 1.84.2 which
 * is based on SpiderMonkey 128. It doesn't have
 * DataView.prototype.getFloat16 method yet. This is
 * a polyfill.
 * 
 * Source: https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.data-view.get-float16.js
 */
const pow = Math.pow;

const EXP_MASK16 = 31; // 2 ** 5 - 1
const SIGNIFICAND_MASK16 = 1023; // 2 ** 10 - 1
const MIN_SUBNORMAL16 = pow(2, -24); // 2 ** -10 * 2 ** -14
const SIGNIFICAND_DENOM16 = 0.0009765625; // 2 ** -10

function unpackFloat16(bytes) {
  const sign = bytes >>> 15;
  const exponent = (bytes >>> 10) & EXP_MASK16;
  const significand = bytes & SIGNIFICAND_MASK16;
  if (exponent === EXP_MASK16)
    return significand === 0 ? (sign === 0 ? Infinity : -Infinity) : NaN;
  if (exponent === 0)
    return significand * (sign === 0 ? MIN_SUBNORMAL16 : -MIN_SUBNORMAL16);
  return (
    pow(2, exponent - 15) *
    (sign === 0
      ? 1 + significand * SIGNIFICAND_DENOM16
      : -1 - significand * SIGNIFICAND_DENOM16)
  );
}

const getUint16 = Function.prototype.bind.call(
  Function.prototype.call,
  Function.prototype.call,
  DataView.prototype.getUint16
);

if (!Object.hasOwn(DataView.prototype, "getFloat16")) {
  Object.defineProperty(DataView.prototype, "getFloat16", {
    writable: true,
    enumerable: false,
    configurable: true,
    value: function (byteOffset /* , littleEndian */) {
      return unpackFloat16(
        getUint16(this, byteOffset, arguments.length > 1 ? arguments[1] : false)
      );
    },
  });
}
