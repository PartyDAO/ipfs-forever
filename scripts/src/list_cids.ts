import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT) {
  console.error("Missing PINATA_JWT. Set it in .env");
  process.exit(1);
}
const PAGE_LIMIT = 1000;
const PINATA_API = "https://api.pinata.cloud";

interface PinListRow {
  ipfs_pin_hash: string;
}

interface PinListResponse {
  count: number;
  rows: PinListRow[];
}

async function fetchAllCids(): Promise<string[]> {
  const cids: string[] = [];
  let offset = 0;

  while (true) {
    const url = `${PINATA_API}/data/pinList?status=pinned&pageLimit=${PAGE_LIMIT}&pageOffset=${offset}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Pinata API error: ${res.status} ${res.statusText}\n${body}`,
      );
    }

    const data: PinListResponse = await res.json();

    if (data.rows.length === 0) break;

    for (const row of data.rows) {
      cids.push(row.ipfs_pin_hash);
    }

    console.log(`Fetched ${cids.length} CIDs so far...`);

    if (data.rows.length < PAGE_LIMIT) break;

    offset += PAGE_LIMIT;
  }

  return cids;
}

async function main() {
  console.log("Fetching pinned CIDs from Pinata...");

  const cids = await fetchAllCids();
  console.log(`Total CIDs: ${cids.length}`);

  const outputDir = join(__dirname, "..", "outputs");
  mkdirSync(outputDir, { recursive: true });

  const filename = `cids_${Date.now()}.json`;
  const outputPath = join(outputDir, filename);
  writeFileSync(outputPath, JSON.stringify(cids, null, 2));

  console.log(`Written to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
