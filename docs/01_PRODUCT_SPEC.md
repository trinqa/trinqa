# Trinqa — Product Spec v0.1

## Definition
Trinqa is a consumer money app combining payments, global money movement, idle-balance earning, risk-selected yield strategies, fiat on/off-ramping and blockchain settlement.

## Core promise
A user can:
1. add money,
2. keep part liquid,
3. put part to work,
4. choose a risk preference,
5. send or spend available money,
6. receive money,
7. withdraw through a supported local rail.

## Foreground / background rule
Foreground:
- Add Money
- Pay
- Earn
- Available
- Earning
- Fee
- Arrives
- Risk
- Strategy

Background:
- anchor
- SEP
- bridge
- chain route
- swap route
- vault / contract details

## Phase 1 surfaces

### Home
Shows:
- account/card visual
- main balance
- Add Money
- Pay
- More
- short Recent list

No route lists or blockchain jargon.

### Pay
User chooses:
- recipient
- amount
- target receive currency if needed

Trinqa decides the supported route.

Confirmation prioritizes:
- recipient receives
- fee
- estimated arrival
- source balance

### Earn
Shows:
- earning balance
- earned today / period
- current strategy
- risk
- estimated APY
- withdrawal behavior

Strategy model:
- Conservative
- Balanced
- Growth

Optional time preference:
- Flexible
- 30 days
- 90 days

Do not imply bank-deposit insurance or guaranteed returns unless the underlying product actually provides them.

## Balance model
Expose:
- Total Balance
- Available
- Earning

Do not use “Locked” unless funds are truly locked.

## Add Money
Sources:
- Bank / local fiat rail
- Another wallet / supported chain
- Stellar address / QR

## Phase 1 non-goals
Do not build yet:
- full analytics suite
- route visualizer
- merchant dashboard
- social feed
- agentic payments
- privacy/ZK
- reward gamification
- advanced NFC acquiring stack

## Winning-project design lesson
Stellar winners such as DeFindex and Decaf reduce infrastructure complexity for the end user. Trinqa should follow the same abstraction principle.
