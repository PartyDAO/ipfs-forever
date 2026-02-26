const fs = require("fs");

// ── Config ──────────────────────────────────────────────────
const FILE_PATH = "./ipfs-backup.tar.gz";
const LOG_FILE = "upload.log";
const RPC_URL = "https://mainnet.gateway.tenderly.co";
const USDC_DECIMALS = 6;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY env var is required");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function formatUsdc(atomicStr) {
  const n = BigInt(atomicStr.toString());
  const whole = n / 10n ** BigInt(USDC_DECIMALS);
  const frac = (n % 10n ** BigInt(USDC_DECIMALS)).toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${frac} USDC`;
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  // 1. Verify file exists
  if (!fs.existsSync(FILE_PATH)) {
    log(`❌ File not found: ${FILE_PATH}`);
    process.exit(1);
  }
  const { size: fileSize } = fs.statSync(FILE_PATH);
  log(`📦 File: ${FILE_PATH}`);
  log(`📦 Size: ${formatBytes(fileSize)} (${fileSize} bytes)`);

  // 2. Connect to Irys
  log("🔌 Connecting to Irys (mainnet, usdc-eth)...");
  const { Uploader } = await import("@irys/upload");
  const { USDCEth } = await import("@irys/upload-ethereum");

  const irys = await Uploader(USDCEth)
    .withWallet(PRIVATE_KEY)
    .withRpc(RPC_URL);
  log(`✅ Connected. Wallet: ${irys.address}`);
  log(`✅ Bundler: ${irys.url.toString()}`);

  // 3. Check price & balance
  //    Use raw atomic values — irys.utils.fromAtomic is broken for USDC
  //    (base defaults to 1e18 instead of 1e6 until getContract() is called)
  const price = await irys.getPrice(fileSize);
  const balance = await irys.getBalance(irys.address);
  log(`💰 Upload cost: ${price.toString()} atomic (${formatUsdc(price)})`);
  log(`💰 Balance:     ${balance.toString()} atomic (${formatUsdc(balance)})`);

  if (balance.lt(price)) {
    const deficit = price.minus(balance);
    log(`⚠️  Insufficient balance. Need ${deficit.toString()} more atomic (${formatUsdc(deficit)}).`);
    log("   Fund uploader.irys.xyz first, then re-run.");
    process.exit(1);
  }

  // 4. Get the chunked uploader — MUST store reference once,
  //    the getter creates a new ChunkingUploader each call.
  const uploader = irys.uploader.chunkedUploader;
  uploader.setChunkSize(25_000_000); // 25 MB chunks
  uploader.setBatchSize(5);          // 5 concurrent chunks

  const startTime = Date.now();
  let lastLogTime = 0;

  // 5. Subscribe to events
  //    chunkUpload: { id: number, offset: number, size: number, totalUploaded: number }
  uploader.on("chunkUpload", (chunkInfo) => {
    const pct = ((chunkInfo.totalUploaded / fileSize) * 100).toFixed(2);
    const elapsed = Date.now() - startTime;
    const speed = chunkInfo.totalUploaded / (elapsed / 1000);
    const remaining = (fileSize - chunkInfo.totalUploaded) / speed;
    const eta = formatDuration(remaining * 1000);

    const msg = `📤 ${pct}% | ${formatBytes(chunkInfo.totalUploaded)}/${formatBytes(fileSize)} | chunk #${chunkInfo.id} (${formatBytes(chunkInfo.size)}) | ${formatBytes(speed)}/s | ETA: ${eta}`;

    const now = Date.now();
    if (now - lastLogTime > 5000) {
      log(msg);
      lastLogTime = now;
    } else {
      fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    }
  });

  //    chunkError: { id: number, offset: number, size: number, res: AxiosResponse }
  uploader.on("chunkError", (e) => {
    log(`⚠️  Chunk #${e.id} error: ${e.res?.statusText || e.res?.status || "unknown"} (will retry)`);
  });

  //    done: AxiosResponse — full axios response, tx id is at .data.id
  uploader.on("done", (finishRes) => {
    const elapsed = Date.now() - startTime;
    log("");
    log("✅ Upload complete!");
    log(`🆔 TX ID: ${finishRes.data.id}`);
    log(`🔗 URL: https://gateway.irys.xyz/${finishRes.data.id}`);
    log(`⏱️  Duration: ${formatDuration(elapsed)}`);
    log(`📊 Avg speed: ${formatBytes(fileSize / (elapsed / 1000))}/s`);
  });

  // 6. Upload using chunked uploader directly.
  //    Signature: uploadData(Readable | Buffer, DataItemCreateOptions & { upload?: UploadOptions })
  //    Returns:   AxiosResponse<UploadResponse> — .data.id is the tx id
  log("🚀 Starting chunked upload (25 MB chunks, batch size 5)...");
  try {
    const response = await uploader.uploadData(
      fs.createReadStream(FILE_PATH),
      {
        tags: [{ name: "Content-Type", value: "application/gzip" }],
      }
    );
    log(`🆔 Response ID: ${response.data.id}`);
    log(`🔗 https://gateway.irys.xyz/${response.data.id}`);
  } catch (err) {
    log(`❌ Upload failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  log(`❌ Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
