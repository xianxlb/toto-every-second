export function randomInt(min: number, max: number) {
  const range = max - min + 1;
  const limit = 0x100000000 - (0x100000000 % range);
  const array = new Uint32Array(1);
  let value: number;
  let result: number;

  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);

  result = min + (value % range);

  return result;
}
