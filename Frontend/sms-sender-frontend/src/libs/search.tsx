import type { CaseData } from "../types/case-data";

export function searchData(items: CaseData[], query: string): CaseData[] {
  const lowerCaseQuery = query.toLowerCase().trim();

  if (!lowerCaseQuery) {
    return items;
  }

  return items.filter(card =>
    card.id.toLowerCase().includes(lowerCaseQuery) ||
    card.sender.toLowerCase().includes(lowerCaseQuery) ||
    card.telco.toLowerCase().includes(lowerCaseQuery) ||
    card.actualTelco.toLowerCase().includes(lowerCaseQuery) ||
    (card.phone_number?.toLowerCase().includes(lowerCaseQuery) ?? false) ||
    (card.full_name?.toLowerCase().includes(lowerCaseQuery) ?? false) ||
    (card.details?.toLowerCase().includes(lowerCaseQuery) ?? false)
  );
}