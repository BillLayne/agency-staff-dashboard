// Pure helpers for the "Check a VIN" quick tool. No DOM, no fetch — the
// component does the network work, this file does the thinking, and the
// node tests exercise it directly.
//
// Source of truth for vehicle data: NHTSA vPIC (free, public, CORS-enabled).
// Recalls come from NHTSA's recalls API, matched by make/model/year — NOT by
// VIN — so the UI must say so.

export const VIN_LENGTH = 17;

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5,
  P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Uppercase and drop anything that is not a letter or digit (spaces, dashes, stray punctuation). */
export const normalizeVin = (input: string): string =>
  (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** True when the text could plausibly be a VIN — used to prefill the tool from the search box. */
export const looksLikeVin = (input: string): boolean => {
  const vin = normalizeVin(input);
  return vin.length === VIN_LENGTH && !/[IOQ]/.test(vin);
};

/**
 * North American check digit (position 9). Imports built outside North America
 * may legitimately fail this, so callers treat a mismatch as a warning, not a block.
 */
export const checkDigitMatches = (vin: string): boolean => {
  const v = normalizeVin(vin);
  if (v.length !== VIN_LENGTH) return false;
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i += 1) {
    const ch = v[i];
    const value = /[0-9]/.test(ch) ? Number(ch) : TRANSLITERATION[ch];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }
  const expected = sum % 11 === 10 ? 'X' : String(sum % 11);
  return v[8] === expected;
};

export interface VinValidation {
  ok: boolean;
  reason?: string;
  checkDigitOk?: boolean;
}

export const validateVin = (input: string): VinValidation => {
  const vin = normalizeVin(input);
  if (vin.length !== VIN_LENGTH) {
    return { ok: false, reason: `A VIN has ${VIN_LENGTH} characters; this one has ${vin.length}.` };
  }
  if (/[IOQ]/.test(vin)) {
    return { ok: false, reason: 'VINs never contain the letters I, O or Q. Check whether those should be 1, 0 or 9.' };
  }
  return { ok: true, checkDigitOk: checkDigitMatches(vin) };
};

export const decodeUrl = (vin: string): string =>
  `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(normalizeVin(vin))}?format=json`;

export const recallsUrl = (make: string, model: string, year: string): string =>
  'https://api.nhtsa.gov/recalls/recallsByVehicle?make=' + encodeURIComponent(make) +
  '&model=' + encodeURIComponent(model) + '&modelYear=' + encodeURIComponent(year);

export interface VehicleFact { label: string; value: string }

export interface VehicleSummary {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  /** "2003 Honda Accord EX-V6" */
  headline: string;
  facts: VehicleFact[];
  /** True when vPIC reports ErrorCode 0. */
  clean: boolean;
  /** vPIC's own wording when the decode was not clean (code prefix stripped). */
  decodeNote: string;
}

type Raw = Record<string, string | number | null | undefined>;

const val = (raw: Raw, key: string): string => {
  const v = raw[key];
  if (v === null || v === undefined) return '';
  const text = String(v).trim();
  return text === '' || text === 'Not Applicable' ? '' : text;
};

/** "HONDA" -> "Honda", but "BMW"/"GMC"/"RAM" stay as they are. */
export const displayMake = (make: string): string =>
  make.length <= 3 ? make : make.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m) => m.toUpperCase());

const joinPresent = (parts: string[], sep = ' · '): string => parts.filter(Boolean).join(sep);

/** Turn vPIC's Results[0] into the fields the tool shows. Only allow-listed keys are read. */
export const summarizeVehicle = (vin: string, raw: Raw): VehicleSummary => {
  const year = val(raw, 'ModelYear');
  const make = val(raw, 'Make');
  const model = val(raw, 'Model');
  const trim = val(raw, 'Trim') || val(raw, 'Series');

  const litres = parseFloat(val(raw, 'DisplacementL'));
  const cylinders = val(raw, 'EngineCylinders');
  const config = val(raw, 'EngineConfiguration');
  const hp = val(raw, 'EngineHP');
  const engine = joinPresent([
    Number.isFinite(litres) ? litres.toFixed(1) + 'L' : '',
    cylinders ? (config.startsWith('V') ? 'V' + cylinders : cylinders + '-cyl') : '',
    hp ? hp + ' hp' : '',
  ], ' ');

  const fuel = joinPresent([val(raw, 'FuelTypePrimary'), val(raw, 'FuelTypeSecondary')], ' / ');
  const speeds = val(raw, 'TransmissionSpeeds');
  const transmission = joinPresent([val(raw, 'TransmissionStyle'), speeds ? speeds + '-speed' : ''], ', ');
  const plant = joinPresent([val(raw, 'PlantCity'), val(raw, 'PlantState'), val(raw, 'PlantCountry')], ', ');
  const airbags = joinPresent([
    val(raw, 'AirBagLocFront') ? 'Front' : '',
    val(raw, 'AirBagLocSide') ? 'Side' : '',
    val(raw, 'AirBagLocCurtain') ? 'Curtain' : '',
    val(raw, 'AirBagLocKnee') ? 'Knee' : '',
  ], ', ');

  const facts: VehicleFact[] = [
    { label: 'Body style', value: val(raw, 'BodyClass') },
    { label: 'Vehicle type', value: val(raw, 'VehicleType') },
    { label: 'Doors', value: val(raw, 'Doors') },
    { label: 'Engine', value: engine },
    { label: 'Fuel', value: fuel },
    { label: 'Drive', value: val(raw, 'DriveType') },
    { label: 'Transmission', value: transmission },
    { label: 'Gross weight class', value: val(raw, 'GVWR') },
    { label: 'Airbags', value: airbags },
    { label: 'Anti-lock brakes', value: val(raw, 'ABS') },
    { label: 'Stability control', value: val(raw, 'ESC') },
    { label: 'Manufacturer', value: val(raw, 'Manufacturer') },
    { label: 'Built in', value: plant },
  ].filter((fact) => fact.value);

  const errorCode = val(raw, 'ErrorCode');
  const clean = errorCode === '0';
  const decodeNote = clean ? '' : val(raw, 'ErrorText').replace(/^\d+\s*-\s*/, '');

  return {
    vin: normalizeVin(vin),
    year, make, model, trim,
    headline: joinPresent([year, displayMake(make), model, trim], ' '),
    facts, clean, decodeNote,
  };
};

/** One line Bill can paste into an Agency Matrix note or a text. */
export const vehicleSummaryText = (s: VehicleSummary): string => {
  const pick = (label: string) => s.facts.find((f) => f.label === label)?.value || '';
  return joinPresent([
    s.headline || 'Vehicle',
    'VIN ' + s.vin,
    pick('Body style'), pick('Engine'), pick('Fuel'), pick('Drive'), pick('Transmission'),
  ]);
};

export interface RecallItem {
  campaign: string;
  date: string;
  component: string;
  summary: string;
}

/** Allow-list the recall feed down to the four fields the UI shows; ignore anything else. */
export const normalizeRecalls = (payload: unknown): { count: number; items: RecallItem[] } => {
  const data = (payload && typeof payload === 'object' ? payload : {}) as { Count?: unknown; results?: unknown };
  const rows = Array.isArray(data.results) ? data.results : [];
  const items: RecallItem[] = rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      campaign: String(row.NHTSACampaignNumber ?? '').trim(),
      date: String(row.ReportReceivedDate ?? '').trim(),
      component: String(row.Component ?? '').trim(),
      summary: String(row.Summary ?? '').trim(),
    }))
    .filter((item) => item.campaign || item.component);
  const count = typeof data.Count === 'number' ? data.Count : items.length;
  return { count, items };
};
