import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Public Geocoding for Korean Address
async function geocodeAddress(address, district) {
  let clean = address
    .replace(/\([^)]*\)/g, " ")
    .replace(/외\s*\d+\s*필지[\s\S]*/g, " ")
    .replace(/외\s*[\d,]+\s*필지/g, " ")
    .replace(/일대/g, " ")
    .replace(/일원/g, " ")
    .replace(/일부/g, " ")
    .replace(/번지/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean.includes("서울")) {
    clean = `서울특별시 ${district ?? ""} ${clean}`.trim();
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&countrycodes=kr`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ReTrack-GeocodeBot/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function run() {
  console.log("Fetching projects without coordinates...");
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, address, district")
    .is("latitude", null)
    .limit(50);

  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }

  console.log(`Found ${projects.length} projects to geocode.`);
  let updatedCount = 0;

  for (const p of projects) {
    const coords = await geocodeAddress(p.address, p.district);
    if (coords) {
      const { error: updateErr } = await supabase
        .from("projects")
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq("id", p.id);

      if (!updateErr) {
        console.log(`✓ [${p.name}] -> ${coords.lat}, ${coords.lng}`);
        updatedCount++;
      }
    }
    // Respect rate limit
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`Finished geocoding: ${updatedCount} updated.`);
}

run();
