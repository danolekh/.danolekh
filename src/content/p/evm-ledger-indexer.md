---
title: EVM Ledger Indexer
subtitle: A reorg-safe double-entry ledger built from on-chain events - Effect, viem and Cloudflare D1
client: Personal project
role: Design and implementation
year: 2026
liveUrl: https://ledger.danolekh.com
draft: true
stack:
  - Effect
  - viem
  - Cloudflare Workers
  - Cloudflare D1
  - TypeScript
  - Base
---

```block:onchain
{
  "contracts": [
    { "name": "MilestoneEscrow (source of events)", "chain": "base-sepolia", "address": "pending" }
  ],
  "repo": "https://github.com/danolekh/evm-ledger-indexer",
  "demo": "https://ledger.danolekh.com"
}
```

## What it is

An indexer that turns on-chain events into a ledger you can trust. It watches a list of addresses
on Base, reads USDC `Transfer` events and the escrow contract's own events, and writes each one as
a journal entry with debits and credits that sum to zero. Balances are derived from the journal,
not stored on their own.

The point is the same as in a bank ledger: at any moment you can ask "how much does this address
hold, according to us" and "how did it get there", and the two answers agree with each other and
with the chain.

This is the same shape of problem I worked on in the wallet and withdrawal services of an iGaming
platform. The chain adds one thing that a database does not: the past can change.

## How reorgs are handled

A block that was final a moment ago can be replaced. If the indexer wrote entries for a block that
is no longer on the canonical chain, the ledger is wrong until those entries are gone.

- **Cursors carry block hashes.** The cursor for each watched address stores the block number
  _and_ the block hash of the last processed block. On every tick the indexer fetches the block at
  the cursor's number and compares hashes.
- **Walk back to the fork point.** If the hashes differ, it steps back one block at a time,
  comparing the stored hash for each processed block with the chain's current hash, until it finds
  a block that still matches. That is the fork point.
- **Undo and re-ingest.** Every journal entry is tagged with the block hash it came from. Entries
  from orphaned blocks are deleted, the balances they touched are recomputed, and the range from
  the fork point forward is ingested again.
- **Single-statement upserts.** Balance updates are one `INSERT ... ON CONFLICT DO UPDATE` per
  account per event, so there is no read-then-write window. D1 runs each statement atomically,
  which is enough here because each event's journal entry and balance effect are applied in one
  batch.
- **Reconcile.** A separate job calls `balanceOf` for each watched address at the cursor's block
  and compares it with the ledger balance. A mismatch is logged as a first-class error, not
  silently corrected. So far the number of mismatches found is TBD.

The pipeline is written in Effect. Each stage - fetch logs, decode, journalize, persist - is a
service with typed errors, so a transient RPC failure retries with backoff and a decode failure
stops the batch instead of writing half of it. Log streaming uses `effect-viem`, a small library
of viem clients wrapped as Effect services that came out of this project.

## What it does not do

- It does not index the whole chain. It follows a watch-list of addresses and the event types it
  understands. Adding a new event type means writing its journalization rule.
- It does not trust finality. Even blocks that are old enough to be practically final are kept
  with their hash, because "practically" is not "always".
- It does not serve as a source of truth over the chain. When the reconcile job disagrees with
  `balanceOf`, the chain is right and the indexer has a bug.
- Throughput numbers: TBD. It is built for a handful of addresses, not for indexing USDC on Base
  as a whole.

## Stack

TypeScript throughout. Effect for the pipeline, services, retries and error types. viem for RPC
and ABI decoding, via `effect-viem`. Cloudflare Workers with a cron trigger for the tick, D1 for
the journal, balances and cursors. Drizzle for the schema and migrations.
