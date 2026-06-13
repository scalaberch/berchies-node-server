import type { Faker } from '@faker-js/faker';

/**
 * Random Philippines mobile-style number: `+639` or `+630` plus 9 digits (e.g. +639171234567).
 * Uses Faker for digits and prefix choice; reproducible when `faker.seed` is set.
 */
export function randomPhilippinesMobile(f: Faker): string {
  const nine = f.string.numeric({ length: 9, allowLeadingZeros: true });
  return f.datatype.boolean() ? `+639${nine}` : `+630${nine}`;
}
