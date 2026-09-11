import { RoomTypeConfig } from '../types.ts';
import { evaluateRoomTypeCompatibility } from './roomCompatibility.ts';

export interface RoomCombinationAllocation {
  roomType: RoomTypeConfig;
  adults: number;
  children: number;
  bedSummary: string;
  maxOccupancy: number;
}

export interface RoomCombination {
  id: string;
  allocations: RoomCombinationAllocation[];
  roomCount: number;
  nightlyTotal: number;
  unusedCapacity: number;
}

function candidateAllocations(roomType: RoomTypeConfig, adults: number, children: number): RoomCombinationAllocation[] {
  const result: RoomCombinationAllocation[] = [];
  const maxAdults = Math.min(adults, Math.max(0, Number(roomType.capacityAdults || 0)));
  const maxChildren = Math.min(children, Math.max(0, Number(roomType.capacityChildren || 0)));

  for (let roomAdults = 0; roomAdults <= maxAdults; roomAdults += 1) {
    for (let roomChildren = 0; roomChildren <= maxChildren; roomChildren += 1) {
      if (roomAdults + roomChildren === 0) continue;
      const compatibility = evaluateRoomTypeCompatibility(roomType, roomAdults, roomChildren);
      if (!compatibility.compatible) continue;
      result.push({
        roomType,
        adults: roomAdults,
        children: roomChildren,
        bedSummary: compatibility.bedSummary,
        maxOccupancy: compatibility.maxOccupancy
      });
    }
  }

  return result;
}

function canonicalSignature(allocations: RoomCombinationAllocation[]) {
  return allocations
    .map(item => `${item.roomType.id}:${item.adults}:${item.children}`)
    .sort()
    .join('|');
}

export function generateRoomCombinations(
  roomTypes: RoomTypeConfig[],
  availability: Record<string, number>,
  adults: number,
  children: number,
  maxRooms = 3,
  maxResults = 6
): RoomCombination[] {
  const requestedAdults = Math.max(0, Number(adults || 0));
  const requestedChildren = Math.max(0, Number(children || 0));
  if (requestedAdults + requestedChildren < 2) return [];

  const candidates = roomTypes
    .filter(roomType => (availability[roomType.id] || 0) > 0)
    .flatMap(roomType => candidateAllocations(roomType, requestedAdults, requestedChildren))
    .sort((a, b) => {
      const typeCompare = a.roomType.id.localeCompare(b.roomType.id);
      if (typeCompare !== 0) return typeCompare;
      if (a.adults !== b.adults) return b.adults - a.adults;
      return b.children - a.children;
    });

  const combinations = new Map<string, RoomCombination>();
  const usedByType = new Map<string, number>();

  const visit = (
    startIndex: number,
    selected: RoomCombinationAllocation[],
    remainingAdults: number,
    remainingChildren: number
  ) => {
    if (remainingAdults === 0 && remainingChildren === 0) {
      if (selected.length < 2 || selected.length > maxRooms) return;
      const signature = canonicalSignature(selected);
      if (combinations.has(signature)) return;
      const nightlyTotal = selected.reduce((sum, item) => sum + Number(item.roomType.basePrice || 0), 0);
      const unusedCapacity = Math.max(
        0,
        selected.reduce((sum, item) => sum + item.maxOccupancy, 0) - requestedAdults - requestedChildren
      );
      combinations.set(signature, {
        id: `combo-${signature}`,
        allocations: selected.map(item => ({ ...item })),
        roomCount: selected.length,
        nightlyTotal,
        unusedCapacity
      });
      return;
    }

    if (selected.length >= maxRooms) return;

    for (let index = startIndex; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (candidate.adults > remainingAdults || candidate.children > remainingChildren) continue;

      const typeId = candidate.roomType.id;
      const alreadyUsed = usedByType.get(typeId) || 0;
      if (alreadyUsed >= (availability[typeId] || 0)) continue;

      usedByType.set(typeId, alreadyUsed + 1);
      selected.push(candidate);
      visit(
        index,
        selected,
        remainingAdults - candidate.adults,
        remainingChildren - candidate.children
      );
      selected.pop();
      if (alreadyUsed === 0) usedByType.delete(typeId);
      else usedByType.set(typeId, alreadyUsed);
    }
  };

  visit(0, [], requestedAdults, requestedChildren);

  return Array.from(combinations.values())
    .sort((a, b) => {
      if (a.roomCount !== b.roomCount) return a.roomCount - b.roomCount;
      if (a.nightlyTotal !== b.nightlyTotal) return a.nightlyTotal - b.nightlyTotal;
      return a.unusedCapacity - b.unusedCapacity;
    })
    .slice(0, maxResults);
}
