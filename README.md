# Party IPFS Hosting

Ensures that all IPFS content uploaded to party.app and create.party.app remains retrievable indefinitely.

## How It Works

Party hosts a [Kubo](https://github.com/ipfs/kubo) IPFS node on [Fly.io](https://fly.io) that keeps all content pinned and accessible via an IPFS gateway indefinitely. This is hosted at [https://ipfs-node.fly.dev/](https://ipfs-node.fly.dev/)The full list of pinned CIDs is stored in this repo as `cids.json`.

## Self-Hosting

If our hosted node goes down, anyone can run their own IPFS node to serve the content. The `pinning-box/` directory contains our Docker and Fly.io configuration, but it's compatible with any Docker-based hosting environment.

## Disaster Recovery

If the content is no longer pinned anywhere on the IPFS network, a full backup of the IPFS block store is available at:

**https://pub-ac99b6e4f94a40ab927548cb984b7e4c.r2.dev/ipfs-backup.tar.gz** (~19 GB)

To restore from backup:

1. Start a fresh Kubo node
2. Stop the daemon
3. Extract the backup into the node's data directory (replacing `blocks/`, `datastore/`, `keystore/`, and `config`)
4. Restart the daemon

All 22,247 pins will be restored.

## Repo Structure

- **`cids.json`** — Complete list of all pinned CIDs
- **`pinning-box/`** — Dockerfile, `fly.toml`, and init scripts for hosting the IPFS node
- **`scripts/`** — Tooling for exporting CIDs from Pinata
