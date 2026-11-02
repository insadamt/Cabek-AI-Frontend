/** Plate validation accepts the backend's Latin/Arabic single-letter format without rewriting Arabic input. */
export function validMoroccanPlate(plate: string) {
  return /^[0-9]{1,6}-(?:[a-z]|(?=\p{L})\p{Script=Arabic})-[0-9]{1,6}$/iu.test(plate);
}
