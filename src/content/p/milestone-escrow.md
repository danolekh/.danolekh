---
title: Milestone Escrow
subtitle: USDC milestone escrow on Base - the client funds, the freelancer delivers, nobody holds a master key
client: Personal project
role: Solidity, tests, frontend
year: 2026
liveUrl: https://escrow.danolekh.com
draft: true
stack:
  - Solidity
  - Foundry
  - OpenZeppelin
  - Base
  - USDC
  - viem
  - wagmi
  - React
---

```block:onchain
{
  "contracts": [
    { "name": "MilestoneEscrow", "chain": "base-sepolia", "address": "pending", "verified": false },
    { "name": "MilestoneEscrow", "chain": "base", "address": "pending", "verified": false }
  ],
  "repo": "https://github.com/danolekh/milestone-escrow",
  "demo": "https://escrow.danolekh.com"
}
```

## What it is

A small contract for the most common freelance deal: a client agrees to pay for work in
milestones and wants the money to exist before the work starts. The freelancer wants to know that
once a milestone is accepted, the payment cannot be pulled back.

The contract holds USDC for one agreement between one client and one freelancer. The client
creates the agreement with a list of milestones and amounts, then funds each milestone. The
freelancer submits a milestone when it is done. The client either releases it or does nothing -
and if the review window runs out, the freelancer claims it themselves.

There is no admin key. There is no arbitration. If the two parties cannot agree, the contract does
not pretend to know who is right. This is a deliberate limit, not a missing feature - see "What it
does not do" below.

## How it holds money

Every milestone has one of a few states: `Created`, `Funded`, `Submitted`, `Released`,
`Refunded`. Each transition is one function with one allowed caller.

- **Fund.** The client transfers USDC for a milestone into the contract with `transferFrom`. The
  contract stores the amount per milestone; it never trusts its own `balanceOf` as the source of
  truth for what belongs to whom.
- **Submit.** The freelancer marks a funded milestone as submitted. This starts the review window.
- **Release.** The client releases a submitted milestone. USDC goes to the freelancer, state moves
  to `Released`. Final.
- **Claim after timeout.** If the review window (TBD days, set at agreement creation) passes with
  no release, the freelancer calls `claim` and gets paid. The client's silence is not a veto.
- **Refund.** The client can refund a milestone that is funded but not yet submitted. Once
  submitted, a refund needs the freelancer's consent, or it does not happen.

Money moves only in `release`, `claim` and `refund`, and each of these follows checks-effects-
interactions: the state is written before the token call. `SafeERC20` from OpenZeppelin wraps the
transfers. `ReentrancyGuard` is on every function that moves tokens, even though USDC does not have
callbacks - the contract should still be correct if the token is swapped for one that does.

Testing is where most of the time went. Unit tests cover each transition and each revert path.
Fuzz tests throw random amounts, callers and orderings at the state machine. The invariant tests
run a handler that performs random valid actions over many steps and check after every step that:

- the contract's USDC balance equals the sum of all milestones in `Funded` or `Submitted`;
- no milestone leaves a final state;
- the sum of released plus refunded plus still-held equals the sum of everything ever funded.

Runs and coverage numbers: TBD.

## What it does not do

- No dispute resolution. If the freelancer submits bad work, the client's only options are to
  release or to refund with consent. The escrow trusts the review window, not a judge.
- No fee, no protocol treasury, no upgradeability. The deployed bytecode is the contract.
- No support for tokens other than USDC. Fee-on-transfer or rebasing tokens would break the
  balance invariant, so they are simply not allowed.
- No multi-party agreements. One client, one freelancer, one agreement per contract instance
  (factory: TBD).

## Stack

Solidity 0.8.x, built and tested with Foundry (`forge test`, `forge fuzz`, invariant tests via
the `StdInvariant` handler). OpenZeppelin for `SafeERC20` and `ReentrancyGuard`. Deployed to Base
Sepolia first, then Base; verified on Basescan.

The demo is a small React app on wagmi and viem: connect a wallet, create an agreement, fund a
milestone, submit, release. Same flow as the tests, but with a button.
