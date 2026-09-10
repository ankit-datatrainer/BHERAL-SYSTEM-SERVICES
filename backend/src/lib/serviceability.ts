/**
 * Doorstep pickup serviceability by postal pincode.
 *
 * Delhi (11xxxx), Noida/Ghaziabad (201xxx) and Gurugram (122xxx) get the free
 * two-hour pickup; every other valid Indian pincode is served by insured
 * courier or a walk-in at the Nehru Place bench.
 */
const FREE_PICKUP = /^(11\d{4}|201\d{3}|122\d{3})$/;
const VALID_PINCODE = /^\d{6}$/;

export type Serviceability =
  | { valid: false; message: string }
  | { valid: true; freePickup: boolean; message: string };

export function checkPincode(pincode: string): Serviceability {
  const pin = pincode.trim();

  if (!VALID_PINCODE.test(pin)) {
    return { valid: false, message: 'Please enter a valid 6-digit postal pincode.' };
  }

  if (FREE_PICKUP.test(pin)) {
    return {
      valid: true,
      freePickup: true,
      message: `Pincode ${pin} qualifies for Free 2-Hour Doorstep Pickup!`,
    };
  }

  return {
    valid: true,
    freePickup: false,
    message: `Pincode ${pin} is serviced via Insured Courier / Center Drop-off.`,
  };
}
