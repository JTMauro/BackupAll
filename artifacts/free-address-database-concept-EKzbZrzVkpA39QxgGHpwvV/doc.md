# Free Address Database Concept

# Tab 1

## Free Address Database Concept

2026-11-06 · @JT Mauro

### Summary

We can build a complete US and Canada address database of homes and businesses from free open data and free software, and feed it to our territory program as a flat file. The only pieces that cannot be free are the postal code files: the USPS ZIP+4 file and the Canada Post postal code file are licensed products.

- **Phase 1 (free):** every address with map coordinates, a home or business label, and a 5-digit ZIP (US) or partial postal code (Canada).
- **Phase 2 (two annual licenses):** add full ZIP+4 and complete Canadian postal codes by matching our addresses against the official files.

Record counts, license prices and effort below are approximate estimates from memory, not quotes. They need checking before any decision.

### Data sources

Overture Maps is the backbone: one free download covers addresses and businesses in both countries. The other sources fill its gaps.

| Source | Gives us | Country | Cost | Role |
|---|---|---|---|---|
| Overture Maps, addresses dataset | Every address point with coordinates (roughly 100M+ records) | US + Canada | Free | Main address list |
| Overture Maps, places dataset | Businesses with name, category, location (roughly 15–20M) | US + Canada | Free | Business list |
| US National Address Database (USDOT) | Government address points | US | Free | Fill gaps |
| OpenAddresses | County and city address data | US + Canada | Free | Fill gaps |
| County GIS portals (address points, parcels) | Addresses plus land-use codes | US, by county | Free | Gaps and home/business labels |
| StatCan Open Database of Addresses | Address points | Canada | Free | Fill gaps |
| StatCan Open Database of Businesses | Business locations | Canada | Free | Business list |
| OpenStreetMap | Businesses and buildings | US + Canada | Free | Extra business coverage |
| US Census TIGER blocks | Census block boundaries | US | Free | Small walkable groupings without ZIP+4 |
| USPS ZIP+4 file (Address Information System) | ZIP+4 ranges per street segment | US | Paid license | Phase 2 |
| Canada Post postal code data | Postal code per address range | Canada | Paid license | Phase 2 |

Licenses on the free data generally allow commercial use, but some sources require attribution and OpenStreetMap-derived data has share-alike terms. Legal should review before production use.

### How it works

Four scripted steps turn the downloads into one flat file, run monthly on free software (DuckDB or PostgreSQL/PostGIS).

[chart: address pipeline · 3 inputs, 4 steps]

Only step 3 depends on the licensed postal files; without them, the pipeline still produces Phase 1 output. Each run keeps a stable address ID so the territory program can update records instead of reloading everything.

### ZIP+4 and Canadian postal codes

ZIP+4 is added by matching each address to a range in the licensed USPS file; there is no legitimate free bulk source. The USPS file lists ranges per street segment, not individual addresses:

> `MAIN ST | 100–198 | even | 12345-6789`

Each address is matched in five steps:

1. **Standardize** the address to USPS abbreviations ("Main Street" becomes "MAIN ST") with free tools such as libpostal or usaddress.
2. **Match the street** on name, prefix/suffix and 5-digit ZIP.
3. **Find the range** that contains the house number, on the correct odd or even side.
4. **Match the unit** where apartments or suites have their own ZIP+4 range.
5. **Apply special records**: high-rise buildings, organizations with their own ZIP+4 (useful for businesses), PO boxes and rural routes.

Addresses that don't match (spelling differences, new construction, rural routes) are left blank or sent to a pay-per-lookup service in small batches.

**Free alternatives and why they don't scale**

| Option | Limit |
|---|---|
| USPS Addresses API | Free, but low hourly limits and terms aimed at shipping, not list cleaning |
| Smarty or Geocodio free tiers | Hundreds to a few thousand lookups |
| US Census Geocoder | Free batch, but 5-digit ZIP only |

**Canada:** there is no ZIP+4. The 6-character postal code is already block-level, but the free data often lacks it. The same range match against the licensed Canada Post file fills it in.

### Home vs business labelling

Each address is labelled by matching it against the business data, in order:

1. **Business match:** a business from Overture places, OpenStreetMap or StatCan sits at the address → **Business**, with name and category.
2. **Parcel land use:** county parcel data says commercial, industrial or office → **Business**; mixed-use → **Mixed**.
3. **Otherwise** → **Home**.

A confidence column records which rule set the label, so territory managers can filter out weak labels. Home-based businesses and shops with apartments above will not label cleanly.

### Output file

The database exports one pipe-delimited flat file per refresh, one row per address, for import into the territory program. At 100M+ rows it goes to a database or the program's bulk import, never Excel (limit about 1M rows).

| Field | Example | Phase |
|---|---|---|
| address_id | Stable ID kept across refreshes | 1 |
| street_number, street_name, unit | 120, MAIN ST, APT 4 | 1 |
| city, state_province | Irvine, CA | 1 |
| postal_code | 92618 / M5V 3L9 | 1 (partial in Canada) |
| zip4 | 1234 | 2 |
| country | US / CA | 1 |
| latitude, longitude | 33.6846, -117.8265 | 1 |
| type | Home / Business / Mixed | 1 |
| business_name, business_category | Joe's Pizza, Restaurant | 1 |
| label_source | business_match / parcel / default | 1 |
| census_block (US) | Block ID for walkable grouping | 1 |
| source, last_refreshed | overture, 2026-11-01 | 1 |

Check which fields the territory program requires before building, especially whether it needs ZIP+4 or carrier route to assign territories.

### Accuracy and limitations

The biggest gap versus a paid CASS-processed list is confirming that an address is real and occupied; free data only shows that it exists on a map.

| Measure | This concept | Paid CASS list |
|---|---|---|
| Completeness | Good in metro areas, gaps in some rural counties | Very good |
| Address receives mail | Not confirmed | Confirmed (delivery-point check) |
| Apartment and suite units | Spotty | Good |
| Map location | Usually good | Usually good |
| Vacancy | No flag | USPS vacancy flag |
| Home vs business | Inferred | USPS residential flag |
| ZIP+4 | Phase 2, range-matched | Yes |

**How to measure it:** pick one or two markets and compare the output with our current paid list. Count addresses found in only one list, missing units, and disagreeing home/business labels. That gives a real match rate before we commit.

### Effort, costs and next steps

Phase 1 costs only staff time and a small server; Phase 2 adds two annual licenses. All figures are rough estimates to confirm.

| Item | Phase 1 (free) | Phase 2 (ZIP+4) |
|---|---|---|
| Data | Free | USPS ZIP+4 file + Canada Post file, annual licenses (prices to confirm) |
| Software | Free (DuckDB or PostgreSQL/PostGIS, libpostal) | Same |
| Hosting | Small cloud server or database, tens of GB storage | Same |
| Build effort | About 1–2 weeks for a data engineer | About 1 more week for range matching and testing |
| Ongoing | Scripted monthly refresh | Same, plus license renewals |

**Next steps**

- [ ] Confirm the territory program's import limits and required fields
- [ ] Pick 1–2 test markets
- [ ] Build Phase 1 for those markets and compare against the current paid list
- [ ] Get USPS and Canada Post license quotes and terms
- [ ] Legal review of open data licenses
- [ ] Decide: free only, free + licenses, or stay with the current vendor
