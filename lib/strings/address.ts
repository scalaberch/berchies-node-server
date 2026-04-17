import type { Faker } from '@faker-js/faker';

/** City / province / ZIP combinations (Philippines uses 4-digit ZIP codes). */
const PH_LOCATIONS = [
  { city: 'Quezon City', province: 'Metro Manila', zip: '1109' },
  { city: 'Makati', province: 'Metro Manila', zip: '1200' },
  { city: 'Taguig', province: 'Metro Manila', zip: '1630' },
  { city: 'Manila', province: 'Metro Manila', zip: '1000' },
  { city: 'Pasig', province: 'Metro Manila', zip: '1600' },
  { city: 'Cebu City', province: 'Cebu', zip: '6000' },
  { city: 'Davao City', province: 'Davao del Sur', zip: '8000' },
  { city: 'Iloilo City', province: 'Iloilo', zip: '5000' },
  { city: 'Bacolod', province: 'Negros Occidental', zip: '6100' },
  { city: 'Cagayan de Oro', province: 'Misamis Oriental', zip: '9000' },
  { city: 'Calamba', province: 'Laguna', zip: '4027' },
  { city: 'Antipolo', province: 'Rizal', zip: '1870' },
  { city: 'Baguio', province: 'Benguet', zip: '2600' },
  { city: 'Zamboanga City', province: 'Zamboanga del Sur', zip: '7000' },
  { city: 'General Santos', province: 'South Cotabato', zip: '9500' },
] as const;

const STREET_NAMES = [
  'Rizal',
  'Bonifacio',
  'Mabini',
  'Luna',
  'Aguinaldo',
  'Burgos',
  'Del Pilar',
  'Roxas',
  'Osmeña',
  'Quezon',
] as const;

const STREET_SUFFIXES = ['St.', 'Ave.', 'Rd.', 'Blvd.'] as const;

const BARANGAYS = [
  'San Antonio',
  'Poblacion',
  'Santa Cruz',
  'San Isidro',
  'Bagumbayan',
  'Tuktukan',
  'Ususan',
  'Fort Bonifacio',
  'Lahug',
  'Mabolo',
] as const;

/**
 * One-line Philippines-style mailing address: street, barangay, city, province, ZIP.
 * Uses Faker for variety; reproducible when `faker.seed` is set.
 */
export function randomPhilippinesAddress(f: Faker): string {
  const loc = f.helpers.arrayElement(PH_LOCATIONS);
  const num = f.number.int({ min: 1, max: 999 });
  const streetName = f.helpers.arrayElement(STREET_NAMES);
  const suffix = f.helpers.arrayElement(STREET_SUFFIXES);
  const brgy = f.helpers.arrayElement(BARANGAYS);

  return `${num} ${streetName} ${suffix}, Brgy. ${brgy}, ${loc.city}, ${loc.province}, ${loc.zip}`;
}
