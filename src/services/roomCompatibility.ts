import { BedConfig, BedKind, RoomTypeConfig } from '../types.ts';

export const BED_LABELS: Record<BedKind, string> = {
  single: 'Solteiro',
  double: 'Casal',
  queen: 'Queen',
  king: 'King',
  bunk: 'Beliche',
  sofa_bed: 'Sofá-cama',
  extra_bed: 'Cama extra',
  crib: 'Berço'
};

export interface RoomCompatibilityResult {
  compatible: boolean;
  reason?: string;
  usesBedRules: boolean;
  bedSummary: string;
  maxOccupancy: number;
}

function normalizeBed(bed: BedConfig): BedConfig {
  const adultsPerBed = Math.max(0, Number(bed.adultsPerBed || 0));
  const childrenPerBed = Math.max(0, Number(bed.childrenPerBed || 0));
  const maxOccupants = Math.max(
    1,
    Number(bed.maxOccupants || Math.max(adultsPerBed, childrenPerBed, 1))
  );

  return {
    ...bed,
    quantity: Math.max(1, Number(bed.quantity || 1)),
    adultsPerBed,
    childrenPerBed,
    maxOccupants
  };
}

export function getBedSummary(roomType: RoomTypeConfig): string {
  const beds = (roomType.beds || []).map(normalizeBed);
  if (!beds.length) return 'Configuração de camas ainda não informada';

  return beds
    .map(bed => `${bed.quantity}× ${BED_LABELS[bed.type]}${bed.optional ? ' (opcional)' : ''}`)
    .join(' · ');
}

function bedLayoutFits(beds: BedConfig[], adults: number, children: number): boolean {
  const targetAdults = Math.max(0, adults);
  const targetChildren = Math.max(0, children);
  const units: BedConfig[] = [];

  for (const rawBed of beds) {
    const bed = normalizeBed(rawBed);
    const safeQuantity = Math.min(12, bed.quantity);
    for (let i = 0; i < safeQuantity; i += 1) units.push({ ...bed, quantity: 1 });
  }

  if (!units.length) return false;

  let states = new Set<string>(['0,0']);

  for (const bed of units) {
    const next = new Set(states);
    const maxOccupants = Math.max(1, Number(bed.maxOccupants || 1));

    for (const state of states) {
      const [coveredAdults, coveredChildren] = state.split(',').map(Number);

      for (let a = 0; a <= Math.min(bed.adultsPerBed, targetAdults - coveredAdults); a += 1) {
        for (let c = 0; c <= Math.min(bed.childrenPerBed, targetChildren - coveredChildren); c += 1) {
          if (a + c === 0 || a + c > maxOccupants) continue;
          const nextAdults = coveredAdults + a;
          const nextChildren = coveredChildren + c;
          next.add(`${nextAdults},${nextChildren}`);
        }
      }
    }

    states = next;
    if (states.has(`${targetAdults},${targetChildren}`)) return true;
  }

  return states.has(`${targetAdults},${targetChildren}`);
}

export function evaluateRoomTypeCompatibility(
  roomType: RoomTypeConfig,
  adults: number,
  children: number,
  infants = 0
): RoomCompatibilityResult {
  const requestedAdults = Math.max(0, Number(adults || 0));
  const requestedChildren = Math.max(0, Number(children || 0));
  const requestedInfants = Math.max(0, Number(infants || 0));
  const maxAdults = Math.max(0, Number(roomType.capacityAdults || 0));
  const maxChildren = Math.max(0, Number(roomType.capacityChildren || 0));
  const maxInfants = Math.max(0, Number(roomType.capacityInfants || 0));
  const maxOccupancy = Math.max(
    1,
    Number(roomType.maxOccupancy || maxAdults + maxChildren + maxInfants || 1)
  );
  const totalRequested = requestedAdults + requestedChildren + requestedInfants;
  const bedSummary = getBedSummary(roomType);
  const beds = Array.isArray(roomType.beds) ? roomType.beds : [];

  if (requestedAdults > maxAdults) {
    return { compatible: false, reason: `Máximo de ${maxAdults} adulto${maxAdults === 1 ? '' : 's'}.`, usesBedRules: beds.length > 0, bedSummary, maxOccupancy };
  }
  if (requestedChildren > maxChildren) {
    return { compatible: false, reason: `Máximo de ${maxChildren} criança${maxChildren === 1 ? '' : 's'}.`, usesBedRules: beds.length > 0, bedSummary, maxOccupancy };
  }
  if (requestedInfants > maxInfants) {
    return { compatible: false, reason: `Máximo de ${maxInfants} bebê${maxInfants === 1 ? '' : 's'}.`, usesBedRules: beds.length > 0, bedSummary, maxOccupancy };
  }
  if (totalRequested > maxOccupancy) {
    return { compatible: false, reason: `Ocupação comercial máxima de ${maxOccupancy} hóspedes.`, usesBedRules: beds.length > 0, bedSummary, maxOccupancy };
  }

  if (!beds.length) {
    return { compatible: true, usesBedRules: false, bedSummary, maxOccupancy };
  }

  const compatible = bedLayoutFits(beds, requestedAdults, requestedChildren);
  return {
    compatible,
    reason: compatible ? undefined : 'A configuração de camas não acomoda este grupo de forma válida.',
    usesBedRules: true,
    bedSummary,
    maxOccupancy
  };
}
