export interface AddressFields {
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
}

const REQUIRED_FIELDS: (keyof AddressFields)[] = [
  "phone",
  "address",
  "neighborhood",
  "city",
];

export function validateAddress(fields: AddressFields): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS) {
    if (!fields[field] || fields[field].trim() === "") {
      errors[field] = "Este campo es obligatorio";
    }
  }
  return errors;
}

export function buildAddressLine(fields: AddressFields): string {
  return `${fields.address}, ${fields.neighborhood}, ${fields.city}`;
}
