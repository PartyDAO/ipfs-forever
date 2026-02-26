# Irys Large File Upload

Uploads large files to Irys using chunked uploader with progress monitoring.
Uses USDC on Ethereum via `uploader.irys.xyz`.

## Install

```
npm install @irys/upload @irys/upload-ethereum
```

## Fund

The SDK uses `uploader.irys.xyz` — **not** `node1.irys.xyz` (which is where the CLI sends funds by default).

```bash
# Check price (atomic units, USDC has 6 decimals so 100000000 = $100)
curl "https://uploader.irys.xyz/price/usdc-eth/"

# Check balance
curl "https://uploader.irys.xyz/account/balance/usdc-eth?address="

# Fund via SDK (CLI ignores -h flag and sends to wrong node)
PRIVATE_KEY="0x..." node -e '(async()=>{
  const { Uploader } = await import("@irys/upload");
  const { USDCEth } = await import("@irys/upload-ethereum");
  const irys = await Uploader(USDCEth).withWallet(process.env.PRIVATE_KEY).withRpc("https://mainnet.gateway.tenderly.co");
  const tx = await irys.fund(100000000);
  console.log("funded:", tx);
})()'

# If you funded via ethers/metamask directly, notify the bundler:
curl -X POST "https://uploader.irys.xyz/account/balance/usdc-eth" \
  -H "Content-Type: application/json" \
  -d '{"tx_id": "0x..."}'
```

## Run

```bash
PRIVATE_KEY="0x..." nohup node upload.js > upload-stdout.log 2>&1 &
tail -f upload.log
```

## Config

Edit the top of `upload.js`:

```js
const FILE_PATH = "./ipfs-backup.tar.gz";
const RPC_URL = "https://mainnet.gateway.tenderly.co";
```
