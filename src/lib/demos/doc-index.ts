// Shared, client-safe module for the Document Index demo (no `cloudflare:workers` import here, so it's
// safe to import from the client component). The live Claude call lives in `doc-index-extract.ts`.

export type DocFields = {
  author: string;
  addressee: string;
  date: string; // YYYY-MM-DD when determinable
  subject: string;
};

export type DocResult = {
  docId: string;
  fields: DocFields;
  source: "live" | "fixture";
};

export type SampleDoc = {
  id: string;
  filename: string; // shown on the source chip
  label: string; // short title shown in the DOCUMENT column
  text: string; // raw, unstructured document body
};

// Five synthetic third-party engineering-firm documents (fictional names/firms) that mirror the kind of
// transmittals, inspection reports, RFIs, calc sets, and photo logs in a real discovery set. Each has a
// discernible author, addressee, date, and subject, plus body text to keyword-search.
export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: "geotech-transmittal",
    filename: "MGA_CedarHollow_Geotech_Transmittal.pdf",
    label: "Cedar Hollow Geotech Transmittal",
    text: `MERIDIAN GEOTECHNICAL ASSOCIATES
1420 Foundry Street, Suite 300

March 12, 2024

Ms. Karen Whitfield
Whitfield & Doss LLP
880 Market Avenue

RE: Transmittal of Geotechnical Investigation Report — Cedar Hollow Bridge Replacement (Project No. 23-118)

Dear Ms. Whitfield,

Enclosed please find two bound copies of our Geotechnical Investigation Report for the Cedar Hollow
Bridge Replacement. The report summarizes our subsurface exploration, including six borings advanced to
refusal, laboratory testing, and our foundation recommendations for the proposed pier locations. We note
moderate liquefaction potential in the upper alluvial layer and recommend driven piles as discussed.

Please contact me directly if you have questions regarding the findings.

Sincerely,
Harold Vance, P.E.
Principal Engineer, Meridian Geotechnical Associates`,
  },
  {
    id: "field-inspection",
    filename: "Lumen_FieldInspection_004.pdf",
    label: "Field Inspection Report #004",
    text: `LUMEN STRUCTURAL ENGINEERING
Field Inspection Report

Report No.: 4
Date of Inspection: March 14, 2024
Prepared by: Jason Patel
Distribution: Michael O'Connor, Lumen Builders

Project: Riverside Commons — Building B
Subject: Field Inspection Report — Foundation

The undersigned visited the site to observe foundation work prior to the concrete pour at the east
footings. Reinforcing steel placement and cover were checked against drawing S-101; anchor-bolt
templates at gridlines C and D were set and verified. Two areas of inadequate rebar lap were tagged for
correction before pour. A follow-up inspection is recommended once the noted items are remediated.

Jason Patel
Lumen Structural Engineering`,
  },
  {
    id: "rfi-118",
    filename: "Atlas_RFI-118_Response.pdf",
    label: "RFI-118 Response — Retaining Wall",
    text: `ATLAS ENGINEERS

March 15, 2024

To: David Lin, Atlas Engineers
From: Emily Rodriguez, P.E.

Subject: Response to RFI-118 — Retaining Wall Details

Please confirm the design intent for the retaining wall along Grid 3 between A and C. Specifically,
provide the required embedment depth below finish grade and confirm whether a footing key is required.
Our review of the current drawings shows a conflict between the wall section on S-301 and the grading
plan; the retaining wall stem height should be measured from final grade, not the temporary bench.
Please proceed once the embedment is confirmed.

Regards,
Emily Rodriguez, P.E.
Atlas Engineers`,
  },
  {
    id: "structural-calcs",
    filename: "Structural_Calcs_SheetSet_RevB.pdf",
    label: "Structural Calculations Set Rev. B",
    text: `LUMEN STRUCTURAL ENGINEERING
Structural Calculations — Building B (Revision B)

Date: March 16, 2024
Prepared by: Daniel Kim, S.E.
For: Sarah Nguyen, Lumen Builders

Subject: Structural Calculations — Building B

This revision updates the lateral analysis for the special steel moment frames at lines 2 and 5 to
reflect the increased roof equipment loads. Member checks, connection demands, and drift ratios are
included. The revised seismic base shear and the governing load combinations are summarized in the
attached sheets. No changes to the gravity framing are required.

Daniel Kim, S.E.
Lumen Structural Engineering`,
  },
  {
    id: "site-photolog",
    filename: "Site_Photolog_2024-03-08.pdf",
    label: "Site Photolog — 2024-03-08",
    text: `WHITFIELD & DOSS LLP — Site Documentation

Date: March 8, 2024
Compiled by: Chris Morales
To: Brian Lee, Whitfield & Doss LLP

Subject: Site Photographs — Week of 03/04–03/08

This photo log documents site conditions for the week, including excavation at the east retaining wall,
formwork at the building B footings, and delivery of structural steel. Each photograph is time-stamped
and keyed to a plan location. Notable item: standing water observed in the excavation following the
March 6 rain event.

Chris Morales`,
  },
];

// Correct fields by construction (the docs are authored here), used as the fallback fixture when there's
// no API key (local dev without .dev.vars) or the live call fails, so the demo always renders.
export const FIXTURES: Record<string, DocFields> = {
  "geotech-transmittal": {
    author: "Harold Vance, P.E. (Meridian Geotechnical Associates)",
    addressee: "Karen Whitfield, Whitfield & Doss LLP",
    date: "2024-03-12",
    subject: "Transmittal of Geotechnical Investigation Report",
  },
  "field-inspection": {
    author: "Jason Patel (Lumen Structural Engineering)",
    addressee: "Michael O'Connor, Lumen Builders",
    date: "2024-03-14",
    subject: "Field Inspection Report — Foundation",
  },
  "rfi-118": {
    author: "Emily Rodriguez, P.E. (Atlas Engineers)",
    addressee: "David Lin, Atlas Engineers",
    date: "2024-03-15",
    subject: "Response to RFI-118 — Retaining Wall Details",
  },
  "structural-calcs": {
    author: "Daniel Kim, S.E. (Lumen Structural Engineering)",
    addressee: "Sarah Nguyen, Lumen Builders",
    date: "2024-03-16",
    subject: "Structural Calculations — Building B",
  },
  "site-photolog": {
    author: "Chris Morales",
    addressee: "Brian Lee, Whitfield & Doss LLP",
    date: "2024-03-08",
    subject: "Site Photographs — Week of 03/04–03/08",
  },
};

export const SEARCH_SUGGESTIONS = ["retaining wall", "RFI", "borings", "steel"];

export type SearchHit = { docId: string; snippet: string };

// Simple keyword search across each document's body text + extracted fields, returning a highlighted
// snippet around the first match. This is exactly the "hold for keyword search" step, done locally.
export function searchDocs(
  query: string,
  results: Record<string, DocResult | undefined>,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const doc of SAMPLE_DOCS) {
    const fields = results[doc.id]?.fields;
    const fieldText = fields
      ? `${fields.author} ${fields.addressee} ${fields.subject} ${fields.date}`
      : "";
    const combined = `${doc.text}\n${fieldText}`;
    const idx = combined.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 48);
    const end = Math.min(combined.length, idx + q.length + 72);
    const snippet = `${start > 0 ? "… " : ""}${combined
      .slice(start, end)
      .replace(/\s+/g, " ")
      .trim()}${end < combined.length ? " …" : ""}`;
    hits.push({ docId: doc.id, snippet });
  }
  return hits;
}

// Splits a snippet around the query term so the component can emphasize the match.
export function splitSnippet(snippet: string, query: string): [string, string, string] {
  const q = query.trim();
  const i = snippet.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1 || !q) return [snippet, "", ""];
  return [snippet.slice(0, i), snippet.slice(i, i + q.length), snippet.slice(i + q.length)];
}
