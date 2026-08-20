import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const naverClientId = process.env.NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const naverClientSecret = process.env.NAVER_CLIENT_SECRET;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

if (!naverClientId || !naverClientSecret) {
  console.error("Missing Naver Cloud Platform (NCP) credentials:");
  console.error("Please add to .env.local:");
  console.error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_client_id");
  console.error("NAVER_CLIENT_SECRET=your_client_secret");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanAddress(rawAddress, district) {
  let clean = String(rawAddress ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/외\s*\d+\s*필지[\s\S]*/g, " ")
    .replace(/외\s*[\d,]+\s*필지/g, " ")
    .replace(/일대/g, " ")
    .replace(/일원/g, " ")
    .replace(/일부/g, " ")
    .replace(/번지/g, " ")
    .replace(/([가-힣]{2,})[0-9]+동\b/g, "$1동")
    .replace(/\s+/g, " ")
    .trim();

  if (district && !clean.includes(district)) {
    clean = `${district} ${clean}`;
  }

  if (!clean.includes("서울")) {
    clean = `서울특별시 ${clean}`;
  }

  return clean;
}

async function geocodeNaver(address) {
  const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": naverClientId,
        "X-NCP-APIGW-API-KEY": naverClientSecret,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Naver Geocode Error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (data.status === "OK" && data.addresses && data.addresses.length > 0) {
      const first = data.addresses[0];
      return {
        lat: parseFloat(first.y),
        lng: parseFloat(first.x),
      };
    }
  } catch (err) {
    console.error("Geocoding fetch exception:", err);
  }
  return null;
}

async function run() {
  console.log("Starting Naver Geocoding batch pipeline...");

  // Fetch projects with null latitude
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, address, district")
    .is("latitude", null)
    .limit(1000);

  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }

  console.log(`Loaded ${projects.length} projects needing exact Naver coordinates.`);
  let successCount = 0;

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const targetAddr = cleanAddress(p.address, p.district);
    const coords = await geocodeNaver(targetAddr);

    if (coords && coords.lat && coords.lng) {
      const { error: updateErr } = await supabase
        .from("projects")
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq("id", p.id);

      if (!updateErr) {
        successCount++;
        console.log(`[${i + 1}/${projects.length}] ✓ ${p.name} (${targetAddr}) -> Lat: ${coords.lat}, Lng: ${coords.lng}`);
      }
    } else {
      console.log(`[${i + 1}/${projects.length}] ✗ Could not geocode: ${p.name} (${targetAddr})`);
    }

    // Naver rate-limit safe delay
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`🎉 Geocoding complete: ${successCount} projects updated with 100% exact Naver GPS coordinates!`);
}

run();
