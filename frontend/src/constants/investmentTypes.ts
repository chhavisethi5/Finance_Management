/**
 * constants/investmentTypes.ts — Shared lists for the Investments section,
 * so the Initial Setup form, "+ Add New Investment" modal, and history
 * filter bar never drift out of sync.
 */

import type { InvestmentType } from "../api";

export const INVESTMENT_TYPES: InvestmentType[] = [
    "Property",
    "Precious Metals",
    "Stocks",
    "Mutual Funds",
    "Bank FD",
    "Post Office",
];

export const METAL_TYPES = ["Gold", "Silver", "Diamond", "Platinum"] as const;

export const PROPERTY_TYPES = ["Residential", "Commercial", "Land", "Other"] as const;

/** Does this investment type require the sub_type + quantity (grams) fields? */
export const isPreciousMetal = (type: InvestmentType) => type === "Precious Metals";

/** Does this investment type require the sub_type (property type) field? */
export const isProperty = (type: InvestmentType) => type === "Property";