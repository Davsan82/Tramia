export const PHONE_COUNTRIES = [
  { country: "Perú", prefix: "+51", minLength: 9, maxLength: 9 },
  { country: "Argentina", prefix: "+54", minLength: 10, maxLength: 10 },
  { country: "Bolivia", prefix: "+591", minLength: 8, maxLength: 8 },
  { country: "Brasil", prefix: "+55", minLength: 10, maxLength: 11 },
  { country: "Chile", prefix: "+56", minLength: 9, maxLength: 9 },
  { country: "Colombia", prefix: "+57", minLength: 10, maxLength: 10 },
  { country: "Ecuador", prefix: "+593", minLength: 9, maxLength: 9 },
  { country: "EE. UU. / Canadá", prefix: "+1", minLength: 10, maxLength: 10 },
  { country: "México", prefix: "+52", minLength: 10, maxLength: 10 },
  { country: "Paraguay", prefix: "+595", minLength: 9, maxLength: 9 },
  { country: "Uruguay", prefix: "+598", minLength: 8, maxLength: 8 },
  { country: "Venezuela", prefix: "+58", minLength: 10, maxLength: 10 },
  { country: "España", prefix: "+34", minLength: 9, maxLength: 9 },
] as const;

export function getPhoneCountry(prefix: string) {
  return PHONE_COUNTRIES.find((item) => item.prefix === prefix);
}

export function phoneLengthMessage(prefix: string) {
  const country = getPhoneCountry(prefix);
  if (!country) return "Selecciona un prefijo válido.";
  const expected = country.minLength === country.maxLength
    ? `${country.minLength} dígitos`
    : `entre ${country.minLength} y ${country.maxLength} dígitos`;
  return `Ingresa un celular de ${expected} para ${country.country}.`;
}

export function isValidPhone(prefix: string, number: string) {
  const country = getPhoneCountry(prefix);
  return Boolean(
    country &&
      /^\d+$/.test(number) &&
      number.length >= country.minLength &&
      number.length <= country.maxLength,
  );
}

export function splitStoredPhone(value: string) {
  const compact = value.trim().replace(/[^\d+]/g, "");
  const country = [...PHONE_COUNTRIES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((item) => compact.startsWith(item.prefix));
  if (!country)
    return {
      phonePrefix: "+51",
      phoneNumber: compact.replace(/\D/g, "").slice(0, 15),
    };
  return {
    phonePrefix: country.prefix,
    phoneNumber: compact.slice(country.prefix.length).replace(/\D/g, "").slice(0, 15),
  };
}
