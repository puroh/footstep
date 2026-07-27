export interface AddressFields {
  street_type: string;
  road_number: string;
  cross_number: string;
  building_number: string;
  neighborhood: string;
  city: string;
  address_details: string;
}

export const STREET_TYPES = ["Calle", "Carrera", "Avenida", "Transversal", "Diagonal"];

const REQUIRED_ADDRESS_FIELDS: (keyof AddressFields)[] = [
  "street_type",
  "road_number",
  "cross_number",
  "building_number",
  "neighborhood",
  "city",
];

export function validateAddress(fields: AddressFields): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!fields[field] || fields[field].trim() === "") {
      errors[field] = "Este campo es obligatorio";
    }
  }
  return errors;
}

export function buildAddressLine(fields: AddressFields): string {
  const base = `${fields.street_type} ${fields.road_number} # ${fields.cross_number} - ${fields.building_number}`;
  const location = `${fields.neighborhood}, ${fields.city}`;
  const details = fields.address_details ? ` (${fields.address_details})` : "";
  return `${base}, ${location}${details}`;
}
