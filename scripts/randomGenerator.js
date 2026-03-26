/* randomGenerator.js
 * Utility functions for random numbers, letters, strings, weights, ranges, and shuffling.
 * Usage: include script and call functions directly (or add export in module builds if needed).
 */

/** Normalize min/max and ensure min <= max. */
function normalizeRange(min = 0, max = 1) {
  min = Number(min);
  max = Number(max);
  if (Number.isNaN(min) || Number.isNaN(max)) {
    throw new TypeError('min and max must be numeric');
  }
  if (min > max) [min, max] = [max, min];
  return { min, max };
}

/** Random float in [min, max) (or [min,max] when includeMax true) */
function randomFloat(min = 0, max = 1, { step = null, includeMax = false } = {}) {
  const range = normalizeRange(min, max);
  const span = range.max - range.min;
  const raw = Math.random() * span + range.min;
  const value = includeMax ? Math.min(raw, range.max) : Math.min(raw, Math.nextAfter ? Math.nextAfter(range.max, -Infinity) : Number.MAX_VALUE);

  if (step != null) {
    const s = Number(step);
    if (!(s > 0)) throw new TypeError('step must be positive');
    const normalized = Math.round((value - range.min) / s) * s + range.min;
    return Math.min(range.max, Math.max(range.min, normalized));
  }
  return value;
}

/** Random integer in [min,max] inclusive */
function randomInt(min = 0, max = 1) {
  const r = normalizeRange(min, max);
  return Math.floor(Math.random() * (r.max - r.min + 1)) + r.min;
}

/** Random number in range with optional divisions or step.
 *  divisions: number of equal segments; e.g., divisions=10 -> increments of span/10.
 *  step: explicit granularity value.
 */
function randomInRange(min = 0, max = 1, { divisions = null, step = null, includeMax = false } = {}) {
  const r = normalizeRange(min, max);
  if (step != null && divisions != null) {
    throw new Error('Use either divisions or step, not both');
  }
  if (divisions != null) {
    const d = Number(divisions);
    if (!(d > 0 && Number.isInteger(d))) throw new TypeError('divisions must be a positive integer');
    const scale = (r.max - r.min) / d;
    return randomFloat(r.min, r.max, { step: scale, includeMax });
  }
  if (step != null) {
    return randomFloat(r.min, r.max, { step, includeMax });
  }
  return includeMax ? Math.random() * (r.max - r.min) + r.min : randomFloat(r.min, r.max, { includeMax: false });
}

/** Random boolean with optional probability of true. */
function randomBool(trueProbability = 0.5) {
  const p = Number(trueProbability);
  if (Number.isNaN(p) || p < 0 || p > 1) throw new TypeError('trueProbability must be between 0 and 1');
  return Math.random() < p;
}

/** Random choice from an array. */
function randomChoice(array) {
  if (!Array.isArray(array) || array.length === 0) throw new TypeError('array must be a non-empty array');
  return array[randomInt(0, array.length - 1)];
}

/** Weighted choice: accepts array of values, object map values->weights, or array of { value, weight }.
 *  Returns one selected value.
 */
function randomWeightedChoice(source) {
  let items;

  if (Array.isArray(source)) {
    if (source.length === 0) throw new TypeError('source must not be empty');
    if (source[0] && typeof source[0] === 'object' && 'value' in source[0] && 'weight' in source[0]) {
      items = source.map(({ value, weight }) => ({ value, weight: Number(weight) }));
    } else {
      items = source.map((value) => ({ value, weight: 1 }));
    }
  } else if (source && typeof source === 'object') {
    items = Object.keys(source).map((key) => ({ value: key, weight: Number(source[key]) }));
  } else {
    throw new TypeError('source must be array or object');
  }

  const totalWeight = items.reduce((sum, item) => {
    if (!Number.isFinite(item.weight) || item.weight < 0) throw new TypeError('weights must be non-negative numbers');
    return sum + item.weight;
  }, 0);

  if (totalWeight <= 0) throw new Error('total weight must be > 0');

  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item.value;
  }

  return items[items.length - 1].value;
}

/** Generate random alphabet letter (optionally uppercase/lowercase). */
function randomLetter({ uppercase = false, lowercase = false } = {}) {
  if (uppercase && lowercase) throw new Error('choose either uppercase or lowercase, not both');
  const letter = String.fromCharCode(65 + randomInt(0, 25));
  if (lowercase) return letter.toLowerCase();
  if (uppercase) return letter;
  return Math.random() < 0.5 ? letter : letter.toLowerCase();
}

/** Generate random string.
 * options:
 *  - length: number
 *  - charset: 'alphanumeric'|'alpha'|'numeric'|'hex'|'base64'|'custom'
 *  - customCharset: string (if charset='custom')
 *  - uppercase/lowercase flags for alpha
 */
function randomString(length = 16, options = {}) {
  const len = Number(length);
  if (!Number.isInteger(len) || len < 0) throw new TypeError('length must be a non-negative integer');

  const charset = options.charset || 'alphanumeric';
  let chars = '';

  switch (charset) {
    case 'alphanumeric':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      break;
    case 'alpha':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      break;
    case 'numeric':
      chars = '0123456789';
      break;
    case 'hex':
      chars = '0123456789abcdef';
      break;
    case 'base64':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      break;
    case 'custom':
      if (!options.customCharset) throw new Error('customCharset required when charset=custom');
      chars = String(options.customCharset);
      break;
    default:
      throw new Error('Unsupported charset: ' + charset);
  }

  let result = '';
  for (let i = 0; i < len; i += 1) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

/** Random date between start and end (Date/number strings) */
function randomDate(start = new Date(1970, 0, 1), end = new Date()) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) throw new TypeError('start and end must be valid dates');
  const { min, max } = normalizeRange(startTime, endTime);
  return new Date(randomInt(min, max));
}

/** Fisher-Yates shuffle (mutates in-place and returns array). */
function shuffle(array) {
  if (!Array.isArray(array)) throw new TypeError('array must be an array');
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Sample k unique items from array (without replacement). */
function sample(array, k = 1) {
  if (!Array.isArray(array)) throw new TypeError('array must be an array');
  const n = array.length;
  if (!Number.isInteger(k) || k < 1 || k > n) throw new RangeError('k must be between 1 and array length');
  const copy = array.slice();
  shuffle(copy);
  return copy.slice(0, k);
}

// Export in environment where module is available. Otherwise attach to global.
const randomGenerator = {
  normalizeRange,
  randomFloat,
  randomInt,
  randomInRange,
  randomBool,
  randomChoice,
  randomWeightedChoice,
  randomLetter,
  randomString,
  randomDate,
  shuffle,
  sample,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = randomGenerator;
} else if (typeof window !== 'undefined') {
  window.randomGenerator = randomGenerator;
} else if (typeof globalThis !== 'undefined') {
  globalThis.randomGenerator = randomGenerator;
}
