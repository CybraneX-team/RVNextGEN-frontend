/**
 * Display helpers for analytics locations. Countries use the browser's Intl data; states and
 * provinces (ISO 3166-2 suffixes such as "MH") are named for the markets we sell in, and any
 * other subdivision falls back to its code ("FR-IDF").
 */
const SUBDIVISIONS: Record<string, Record<string, string>> = {
  IN: {
    AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CH: "Chandigarh",
    CG: "Chhattisgarh", CT: "Chhattisgarh", DH: "Dadra and Nagar Haveli and Daman and Diu", DN: "Dadra and Nagar Haveli and Daman and Diu",
    DD: "Dadra and Nagar Haveli and Daman and Diu", DL: "Delhi", GA: "Goa", GJ: "Gujarat", HP: "Himachal Pradesh", HR: "Haryana",
    JH: "Jharkhand", JK: "Jammu and Kashmir", KA: "Karnataka", KL: "Kerala", LA: "Ladakh", LD: "Lakshadweep", MH: "Maharashtra",
    ML: "Meghalaya", MN: "Manipur", MP: "Madhya Pradesh", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", OR: "Odisha", PB: "Punjab",
    PY: "Puducherry", RJ: "Rajasthan", SK: "Sikkim", TG: "Telangana", TS: "Telangana", TN: "Tamil Nadu", TR: "Tripura",
    UP: "Uttar Pradesh", UK: "Uttarakhand", UT: "Uttarakhand", WB: "West Bengal",
  },
  US: {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
    DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
    UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  },
  AE: { AZ: "Abu Dhabi", AJ: "Ajman", DU: "Dubai", FU: "Fujairah", RK: "Ras Al Khaimah", SH: "Sharjah", UQ: "Umm Al Quwain" },
  CA: {
    AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia",
    NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
  },
  AU: { ACT: "Australian Capital Territory", NSW: "New South Wales", NT: "Northern Territory", QLD: "Queensland", SA: "South Australia", TAS: "Tasmania", VIC: "Victoria", WA: "Western Australia" },
  GB: { ENG: "England", NIR: "Northern Ireland", SCT: "Scotland", WLS: "Wales" },
};

let countryNames: Intl.DisplayNames | null | undefined;
export function countryName(code: string): string {
  if (countryNames === undefined) {
    try { countryNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch { countryNames = null; }
  }
  try { return countryNames?.of(code) ?? code; } catch { return code; }
}

export function regionName(country: string, region: string): string {
  return SUBDIVISIONS[country]?.[region] ?? `${country}-${region}`;
}

/** Emoji flag from a two-letter country code (regional indicator symbols). */
export function flag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🏳️";
}
