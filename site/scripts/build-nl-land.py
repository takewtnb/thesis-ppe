#!/usr/bin/env python3
"""
Regenerate scripts/nl-land-rings.json from gis/Mint authorities.geojson.

Requires: shapely (site/.venv-gis recommended).

  site/.venv-gis/bin/python scripts/build-nl-land.py
"""
from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import Point, Polygon, box, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
GIS = ROOT / "gis" / "Mint authorities.geojson"
OUT = Path(__file__).resolve().parent / "nl-land-rings.json"

WANTED = [
    ("Holland", "1586/01/01", "1794/12/31"),
    ("West-Friesland", "1586/01/01", "1794/12/31"),
    ("Zeeland", "1585/01/01", "1794/12/31"),
    ("Utrecht", "1527/01/01", "1794/12/31"),
    ("Overijssel", "1527/01/01", "1794/12/31"),
    ("Friesland", "1527/01/01", "1794/12/31"),
    ("Groningen", "1594/01/01", "1794/12/31"),
    ("Drenthe", "1527/01/01", "1794/12/31"),
    ("Guelders", "1585/01/01", "1734/12/31"),
    ("Brabant of the States", "1585/01/01", "1794/12/31"),
    ("Flanders of the States", "1585/01/01", "1794/12/31"),
]

# Sample cities that must remain on land (lon, lat)
CITIES = {
    "Hoorn": (5.0597, 52.6425),
    "Enkhuizen": (5.2917, 52.7033),
    "Harlingen": (5.4224, 53.1748),
    "Harderwijk": (5.6208, 52.3417),
    "Kampen": (5.9111, 52.555),
    "Rotterdam": (4.4792, 51.9225),
    "Terschelling": (5.2148, 53.3591),
    "Leiden": (4.4931, 52.1583),
    "Groningen": (6.5667, 53.2192),
    "Dordrecht": (4.6736, 51.81),
    "The Hague": (4.2986, 52.0767),
    "Franeker": (5.5412, 53.1855),
    "Alkmaar": (4.7486, 52.6317),
    "Amsterdam": (4.9041, 52.3676),
    "Zwolle": (6.0944, 52.5125),
}

# GIS search boxes for the main Wadden islands (west → east)
WADDEN_BOXES = {
    "Texel": box(4.68, 52.98, 4.95, 53.20),
    "Vlieland": box(4.90, 53.22, 5.15, 53.33),
    "Terschelling": box(5.12, 53.33, 5.55, 53.46),
    "Ameland": box(5.58, 53.40, 6.02, 53.49),
    "Schiermonnikoog": box(6.08, 53.43, 6.32, 53.52),
    "Rottumerplaat": box(6.32, 53.48, 6.45, 53.55),
}


def get(data, auth: str, dfrom: str, dto: str):
    for f in data["features"]:
        p = f["properties"]
        if p["AUTHORITY"] == auth and p["DATEfrom"] == dfrom and p["DATEto"] == dto:
            return shape(f["geometry"])
    raise KeyError(auth)


def ring_coords(poly, max_pts=50, target_simplify=0.01):
    s = poly
    tol = target_simplify
    while len(s.exterior.coords) > max_pts and tol < 0.05:
        s = poly.simplify(tol, preserve_topology=True)
        tol *= 1.2
    coords = [(round(x, 3), round(y, 3)) for x, y in list(s.exterior.coords)[:-1]]
    cleaned = [coords[0]]
    for c in coords[1:]:
        if c != cleaned[-1]:
            cleaned.append(c)
    if cleaned[0] != cleaned[-1]:
        cleaned.append(cleaned[0])
    return cleaned


def rings_from(geom, min_area=0.004, max_pts=50, simplify=0.01):
    if geom.is_empty:
        return []
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    out = [ring_coords(p, max_pts, simplify) for p in polys if p.area >= min_area]
    out.sort(key=lambda c: -Polygon(c).area)
    return out


def extract_wadden_islands(sources):
    """Pull each Wadden island as its own polygon from GIS, with light smoothing."""
    islands = []
    names = []
    for name, b in WADDEN_BOXES.items():
        g = sources.intersection(b)
        if g.is_empty:
            continue
        parts = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
        parts = [p for p in parts if p.area >= 0.0008]
        if not parts:
            continue
        blob = unary_union(parts).buffer(0.004).buffer(-0.0025)
        if blob.is_empty:
            continue
        if blob.geom_type == "MultiPolygon":
            blob = max(blob.geoms, key=lambda p: p.area)
        # Slightly enlarge eastern islands so they stay readable at map scale
        if name in ("Schiermonnikoog", "Ameland", "Terschelling"):
            blob = blob.buffer(0.006).buffer(-0.002)
        blob = blob.simplify(0.0015, preserve_topology=True)
        if blob.area < 0.0012 and name != "Rottumerplaat":
            continue
        islands.append(blob)
        names.append(name)
    return islands, names


def main() -> None:
    data = json.loads(GIS.read_text())
    clip = box(3.25, 51.15, 7.25, 53.55)
    mild = unary_union([get(data, *k).intersection(clip).buffer(0.008) for k in WANTED])
    mild = mild.buffer(0.012).buffer(-0.012)

    city_pads = unary_union([Point(xy).buffer(0.04) for xy in CITIES.values()])
    # Keep Terschelling pad only for the island check later — don't glue it to mainland
    mainland_city_pads = unary_union(
        [Point(xy).buffer(0.04) for n, xy in CITIES.items() if n != "Terschelling"]
    )

    # Stylized Zuiderzee — keep the NE lip west of the Friesland shore near Harlingen
    # so the cut does not swallow the peninsula south/west of the town (GIS land).
    friesland_protect = get(data, "Friesland", "1527/01/01", "1794/12/31").intersection(
        box(5.15, 52.95, 5.75, 53.35)
    ).buffer(0.008)

    zuiderzee = Polygon(
        [
            (4.95, 53.18),
            (5.00, 52.95),
            (5.10, 52.78),
            (5.22, 52.70),
            (5.42, 52.74),
            (5.52, 52.55),
            (5.58, 52.40),
            (5.68, 52.35),
            (5.85, 52.34),
            (5.92, 52.42),
            (5.90, 52.58),
            (5.82, 52.82),
            (5.72, 52.95),
            (5.55, 53.05),
            (5.40, 53.10),  # west of Friesland shore (S of Harlingen)
            (5.32, 53.14),
            (5.22, 53.17),
            (5.10, 53.18),
            (4.95, 53.18),
        ]
    )
    zuiderzee = zuiderzee.difference(mainland_city_pads).difference(friesland_protect)

    land = mild.difference(zuiderzee).union(mainland_city_pads.intersection(mild.buffer(0.02)))
    # Restore Friesland coast near Harlingen at higher detail (GIS), then light smooth
    harlingen_coast = friesland_protect.buffer(0.004).buffer(-0.002).simplify(0.004, preserve_topology=True)
    land = unary_union([land, harlingen_coast])

    # --- Wadden islands from GIS (separate entities) ---
    wadden_sources = unary_union(
        [
            get(data, "Holland", "1586/01/01", "1794/12/31"),
            get(data, "West-Friesland", "1586/01/01", "1794/12/31"),
            get(data, "Friesland", "1527/01/01", "1794/12/31"),
            get(data, "Groningen", "1594/01/01", "1794/12/31"),
        ]
    )
    wadden_islands, wadden_names = extract_wadden_islands(wadden_sources)
    wadden_union = unary_union(wadden_islands) if wadden_islands else Polygon()

    # --- Zeeland islands (GIS-based, keep more estuary detail) ---
    zee_raw = unary_union(
        [
            get(data, "Zeeland", "1585/01/01", "1794/12/31").intersection(clip),
            get(data, "Flanders of the States", "1585/01/01", "1794/12/31").intersection(clip),
        ]
    ).intersection(box(3.25, 51.15, 4.50, 51.82))
    # Light merge only for micro-islets; preserve major island outlines
    zee_blob = zee_raw.buffer(0.0025).buffer(-0.0015)
    zee_parts = sorted(
        (list(zee_blob.geoms) if zee_blob.geom_type == "MultiPolygon" else [zee_blob]),
        key=lambda g: -g.area,
    )
    zee_islands = []
    for p in zee_parts:
        if p.area < 0.0035:
            continue
        s = p.buffer(0.003).buffer(-0.002).simplify(0.002, preserve_topology=True)
        if s.is_empty:
            continue
        if s.geom_type == "MultiPolygon":
            s = max(s.geoms, key=lambda g: g.area)
        zee_islands.append(s)
        if len(zee_islands) >= 8:
            break

    # --- Mainland: strip Zeeland zone; free Wadden islands with a clear sea channel ---
    mainland = land.difference(box(3.25, 51.15, 4.30, 51.70))
    if not wadden_union.is_empty:
        mainland = mainland.difference(wadden_union.buffer(0.02))
    # Clear channel under Ameland → Schiermonnikoog → Rottum (no NE spike toward islands)
    mainland = mainland.difference(box(5.55, 53.37, 6.55, 53.56))
    # Restore Friesland/Groningen mainland coast from GIS, but keep it south of the channel
    coastal_restore = mild.intersection(box(5.2, 53.15, 7.2, 53.38)).difference(
        wadden_union.buffer(0.018) if not wadden_union.is_empty else Polygon()
    )
    # Keep true NE Groningen coast (east of Schier longitude), capped so it stays below the islands
    ne_coast = mild.intersection(box(6.55, 53.25, 7.2, 53.42))
    mainland = unary_union([mainland, coastal_restore, ne_coast])
    mainland = mainland.buffer(0.005).buffer(-0.005).simplify(0.01, preserve_topology=True)
    mainland = mainland.union(mainland_city_pads.intersection(box(4.2, 51.7, 7.2, 53.35)))
    # Restore Friesland west coast near Harlingen from GIS — keep tight to the
    # true shoreline so we do not invent a NW lobe toward Terschelling.
    fri_base = get(data, "Friesland", "1527/01/01", "1794/12/31")
    fri_west = (
        fri_base.intersection(box(5.20, 52.98, 5.75, 53.30))
        .buffer(0.004)
        .buffer(-0.002)
        .simplify(0.002, preserve_topology=True)
    )
    mainland = unary_union([mainland, fri_west, harlingen_coast])
    # Carve away any invented water→land overshoot NW of Harlingen (toward Terschelling)
    false_lobe = box(5.05, 53.22, 5.45, 53.40)
    mainland = mainland.difference(false_lobe.difference(fri_base.buffer(0.006)))
    mainland = mainland.buffer(0.002).buffer(-0.001).simplify(0.0025, preserve_topology=True)

    # Drop orphaned northern scraps (do not re-inflate Friesland toward the Wadden)
    if mainland.geom_type == "MultiPolygon":
        parts = sorted(mainland.geoms, key=lambda g: -g.area)
        body = parts[0]
        extras = [p for p in parts[1:] if p.area >= 0.04]
        mainland = unary_union([body, *extras]) if extras else body
        mainland = mainland.simplify(0.0025, preserve_topology=True)

    all_rings = (
        rings_from(mainland, 0.02, 140, 0.0025)
        + [ring_coords(p, 36, 0.0018) for p in zee_islands]
        + [ring_coords(p, 28, 0.0015) for p in wadden_islands]
    )
    mp = unary_union([Polygon(r) for r in all_rings if len(r) >= 4])
    off = [n for n, xy in CITIES.items() if mp.distance(Point(*xy)) >= 0.015]
    if off:
        raise SystemExit(f"cities off land: {off}")

    gap = None
    if wadden_names and "Schiermonnikoog" in wadden_names:
        schier = wadden_islands[wadden_names.index("Schiermonnikoog")]
        main_poly = unary_union([Polygon(r) for r in rings_from(mainland, 0.02, 140, 0.0025)])
        gap = schier.distance(main_poly)
        if gap < 0.025:
            raise SystemExit(f"Schiermonnikoog still too close to mainland (gap={gap:.4f})")

    OUT.write_text(json.dumps(all_rings))
    extra = f"; Schier gap={gap:.3f}°" if gap is not None else ""
    print(
        f"Wrote {OUT} ({len(all_rings)} rings; "
        f"{len(zee_islands)} Zeeland; Wadden={', '.join(wadden_names)}{extra})"
    )


if __name__ == "__main__":
    main()
