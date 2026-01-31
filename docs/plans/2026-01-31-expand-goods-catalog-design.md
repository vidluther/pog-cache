# Expand Goods Catalog

**Date:** 2026-01-31
**Status:** Ready

## Goal

Expand the goods catalog from 15 items across 4 categories to 27 items across 6 categories. Restructure categories to be more logical (eggs moved to dairy, produce split into fruits/vegetables, new pantry category including coffee).

## What Changes

- **`src/goods.json`** -- restructured categories and 12 new items added
- **`src/worker.js`** -- no changes needed (iterates `categories` generically)
- **R2 storage** -- new item keys appear automatically at `{region}/{itemKey}.json`

## Constraints

- BLS API v2 allows 50 series per batch request. At 27 items per region, we stay under the limit.
- 27 items x 5 regions = 135 total series (up from 75).
- All series IDs verified against the BLS API on 2026-01-31.

## Category Structure

### Proteins (5 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| chicken | Chicken | pound | `🐔` | APU0000706111 | APU0100706111 | APU0200706111 | APU0300706111 | APU0400706111 |
| ground_beef | Ground Beef | pound | `🥩` | APU0000703112 | APU0100703112 | APU0200703112 | APU0300703112 | APU0400703112 |
| bacon | Bacon | pound | `🥓` | APU0000704111 | APU0100704111 | APU0200704111 | APU0300704111 | APU0400704111 |
| pork_chops | Pork Chops | pound | `🍖` | APU0000FD3101 | APU0100FD3101 | APU0200FD3101 | APU0300FD3101 | APU0400FD3101 |
| ham | Ham | pound | `🐷` | APU0000FD2101 | APU0100FD2101 | APU0200FD2101 | APU0300FD2101 | APU0400FD2101 |

### Dairy & Eggs (6 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| eggs | Eggs | dozen | `🥚` | APU0000708111 | APU0100708111 | APU0200708111 | APU0300708111 | APU0400708112 |
| milk | Whole Milk | gallon | `🥛` | APU0000709112 | APU0100709112 | APU0200709112 | APU0300709112 | APU0400709112 |
| cheese | Cheese | pound | `🧀` | APU0000710212 | APU0100710212 | APU0200710212 | APU0300710212 | APU0400710212 |
| ice_cream | Ice Cream | half gallon | `🍨` | APU0000710411 | APU0100710411 | APU0200710411 | APU0300710411 | APU0400710411 |
| butter | Butter | pound | `🧈` | APU0000FS1101 | APU0100FS1101 | APU0200FS1101 | APU0300FS1101 | APU0400FS1101 |
| yogurt | Yogurt | 8 oz | `🫙` | APU0000FJ4101 | APU0100FJ4101 | APU0200FJ4101 | APU0300FJ4101 | APU0400FJ4101 |

### Fruits (4 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| bananas | Bananas | pound | `🍌` | APU0000711211 | APU0100711211 | APU0200711211 | APU0300711211 | APU0400711211 |
| apples | Apples | pound | `🍎` | APU0000711311 | APU0100711311 | APU0200711311 | APU0300711311 | APU0400711311 |
| citrus | Oranges | pound | `🍊` | APU0000711411 | APU0100711411 | APU0200711411 | APU0300711411 | APU0400711411 |
| strawberries | Strawberries | 12 oz | `🍓` | APU0000711415 | APU0100711415 | APU0200711415 | APU0300711415 | APU0400711415 |

### Vegetables (3 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| potatoes | Potatoes | pound | `🥔` | APU0000712112 | APU0100712112 | APU0200712112 | APU0300712112 | APU0400712112 |
| lettuce | Lettuce | pound | `🥬` | APU0000712211 | APU0100712211 | APU0200712211 | APU0300712211 | APU0400712211 |
| tomatoes | Tomatoes | pound | `🍅` | APU0000712311 | APU0100712311 | APU0200712311 | APU0300712311 | APU0400712311 |

### Pantry (6 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| white_bread | White Bread | pound | `🍞` | APU0000702111 | APU0100702111 | APU0200702111 | APU0300702111 | APU0400702111 |
| whole_wheat_bread | Whole Wheat Bread | pound | `🌾` | APU0000702212 | APU0100702212 | APU0200702212 | APU0300702212 | APU0400702212 |
| rice | Rice | pound | `🍚` | APU0000701312 | APU0100701312 | APU0200701312 | APU0300701312 | APU0400701312 |
| spaghetti | Spaghetti & Macaroni | pound | `🍝` | APU0000701322 | APU0100701322 | APU0200701322 | APU0300701322 | APU0400701322 |
| flour | Flour | pound | `🌿` | APU0000701111 | APU0100701111 | APU0200701111 | APU0300701111 | APU0400701111 |
| coffee | Coffee | pound | `☕` | APU0000717311 | APU0100717311 | APU0200717311 | APU0300717311 | APU0400717311 |

### Energy (3 items)

| Key | Name | Unit | Icon | National | Northeast | Midwest | South | West |
|-----|------|------|------|----------|-----------|---------|-------|------|
| gas | Unleaded Regular Gas | gallon | `⛽` | APU000074714 | APU010074714 | APU020074714 | APU030074714 | APU040074714 |
| electricity | Electricity | KWH | `💡` | APU000072610 | APU010072610 | APU020072610 | APU030072610 | APU040072610 |
| natural_gas | Natural Gas | therm | `🔥` | APU000072620 | APU010072620 | APU020072620 | APU030072620 | APU040072620 |

## Display Metadata (new items)

Colors should complement existing items within each category:

| Item | bgColor | lineColor |
|------|---------|-----------|
| pork_chops | bg-orange-50 | #c2410c |
| ham | bg-rose-50 | #be123c |
| butter | bg-yellow-50 | #ca8a04 |
| yogurt | bg-violet-50 | #7c3aed |
| strawberries | bg-red-50 | #dc2626 |
| white_bread | bg-amber-50 | #d97706 |
| whole_wheat_bread | bg-orange-50 | #c2410c |
| rice | bg-stone-50 | #78716c |
| spaghetti | bg-yellow-50 | #ca8a04 |
| flour | bg-neutral-50 | #737373 |
| coffee | bg-stone-50 | #57534e |
| natural_gas | bg-orange-50 | #ea580c |

## Verification Results (2026-01-31)

All 12 new national series IDs were verified against the BLS API v2 with data through December 2025.

**Dropped from original draft (5 items):**
- `turkey` (APU0000706311) -- BLS discontinued, last data Feb 2020
- `tuna` (APU0000707111) -- invalid series ID, no data ever returned
- `grapes` (APU0000711417) -- BLS discontinued, last data Sep 2021
- `broccoli` (APU0000712412) -- BLS discontinued, last data Mar 2020
- `peanut_butter` (APU0000716141) -- invalid series ID, no data ever returned

## Implementation Steps

1. Update `src/goods.json` with the new 6-category structure and all 27 items
2. Run tests to confirm the worker handles the new structure
3. Deploy and trigger a manual update via `POST /update` to populate R2

## Notes

- Eggs west region uses `APU0400708112` (not `708111`) -- preserved from existing config
- Some items use alpha-prefixed item codes (FD, FS, FJ) rather than purely numeric codes. The worker handles these identically since it just passes series IDs to the BLS API.
- Strawberries may have seasonal gaps where BLS doesn't publish if sample sizes are insufficient.

## Sources

- [BLS Average Price Data Factsheet](https://www.bls.gov/cpi/factsheets/average-prices.htm)
- [BLS Average Price Publication List (item codes)](https://www.bls.gov/cpi/additional-resources/average-price-publication-list.htm)
- [FRED Average Price Data](https://fred.stlouisfed.org/release?rid=454)
