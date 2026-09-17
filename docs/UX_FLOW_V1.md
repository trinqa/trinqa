# Trinqa — UX Flow V1

**Status:** Locked for hackathon MVP  
**Primary platform:** iOS / Expo / React Native  
**Navigation principle:** Minimum screens, native interactions, infrastructure hidden

---

# 1. Final Bottom Tab Bar

The final bottom tab navigation is:

1. **Home**
2. **Wallet**
3. **Earn**
4. **Activity**

## Why this structure

### Home = Actions
The fastest place to understand the account and start a task.

### Wallet = State
Where the user's money is and how much is available vs. working.

### Earn = Strategy + Performance
How idle money is being managed, risk preference, time horizon, earnings and strategy.

### Activity = History
Everything that happened: payments, deposits, withdrawals, received funds, yield and rebalances.

## Important

**Pay is NOT a bottom tab.**

Pay is a task flow launched from Home.

**Progress is NOT a final tab name.**

The existing `Progress` tab becomes **Earn**.

---

# 2. Global UX Principle

> **User chooses intent. Trinqa chooses infrastructure.**

The user thinks in:

- amount
- recipient
- currency
- time horizon
- risk

The user should normally NOT think in:

- chain
- anchor
- bridge
- protocol
- liquidity pool
- swap route
- SEP standard

These belong in the backend / orchestration layer.

---

# 3. Home

## Purpose

Give the user an immediate account snapshot and expose the highest-frequency actions.

## Existing approved layout

Use the current approved Home UI.

## Visible content

### Header
- Trinqa avatar / identity
- support
- notifications

### Main Trinqa account card
- account identity
- account balance

### Three primary actions
- **Add Money**
- **Pay**
- **More**

### Recent
Compact recent transactions.

Examples:

- Maria — Received — +€250
- Coffee Shop — Payment — -$4.80
- Deposit — Bank Transfer — +₺10,000

## Home does NOT show

- chain names
- anchor names
- APY dashboard
- strategy details
- routing
- protocol names

---

# 4. Home → Add Money

## Goal

Fund Trinqa with the minimum possible friction.

## Presentation

Use a **native BottomSheet** for source selection.

## Step 1 — Choose source

Options:

### Bank
Local fiat deposit.

Primary hackathon flow:
TRY → usable Stellar balance.

### Crypto / Another Wallet
Bring a supported asset from another wallet / supported chain.

### Receive
Show receiving details / QR where appropriate.

## Step 2 — Amount

Example:

`₺10,000`

Show only essential information:

- amount
- estimated received value where conversion is required
- fee if known

Do not show infrastructure unless the user opens details.

## Step 3 — Provider flow

If the selected fiat rail requires hosted KYC / anchor interaction:

Open the required provider / SEP-hosted flow.

The user should not have to manually select an anchor.

## Step 4 — Success

Show:

- amount added
- resulting available balance
- status

Primary action:
**Done**

Secondary action:
**Put it to work**

This can deep-link into Earn.

---

# 5. Home → Pay

## Purpose

Send money or pay without asking the user how blockchain settlement should happen.

Pay is a **flow**, not a persistent tab.

## Step 1 — Destination

Minimal destination selector:

- Person / contact
- QR
- Wallet / address when necessary
- Merchant where supported

Future:
- NFC / contactless where technically supported

## Step 2 — Amount

User selects:

- amount
- desired recipient currency when relevant

Example:

`€250`

`Maria receives €250`

## Step 3 — Quote / confirmation

Display only:

- recipient
- recipient receives
- total deducted
- fee
- estimated arrival

Optional disclosure:
**View route details**

Only inside details may Trinqa expose technical route information.

## Step 4 — Confirm

Use native confirmation interaction.

## Step 5 — Success

Show:

- recipient
- amount
- status
- timestamp

Actions:

- Done
- View transaction

## Payment routing rule

The backend may choose:

- source balance
- asset
- swap
- Stellar route
- anchor / payout provider
- payout rail

The user does not choose these manually.

---

# 6. Home → More

Use a native **Menu** or **BottomSheet** rather than creating a large new navigation hub.

Items:

- Withdraw
- Receive
- Account Details
- Settings

Keep this list short.

---

# 7. Wallet

## Purpose

Answer:

> **Where is my money right now?**

This is the balance / account-state screen.

## Existing approved layout

Use the current approved second reference screen.

## Top section

### Total Balance

### Available
Money immediately usable for payment / withdrawal.

### Earning
Money currently allocated to earning strategies.

## Secondary allocation module

This replaces the reference's card-limit module while preserving its exact visual hierarchy.

Show:

- available allocation
- earning allocation
- current earning percentage

Primary action:
**Manage allocation**

## Wallet transaction preview

Compact account-related transactions.

Examples:

- Deposit
- Withdrawal
- Added to earning
- Returned to available

## Wallet actions

Do not turn this page into a button dashboard.

Primary actions should come from:

- existing compact action row / native menu
- Manage allocation
- contextual transaction interactions

---

# 8. Wallet → Withdraw

## Purpose

Get money out in the user's desired form.

## Step 1 — Amount + currency

Examples:

- ₺10,000 TRY
- €300 EUR
- $500 USD

## Step 2 — Destination

Examples:

- saved bank account
- new bank account / supported local payout destination
- supported wallet

## Step 3 — Quote

Show:

- amount received
- total fee
- estimated arrival

Trinqa automatically chooses the best supported exit route.

## Step 4 — Confirm

Native confirmation.

## Step 5 — Success

Show completed / pending state and transaction details.

---

# 9. Earn

## Purpose

Answer:

> **How is my money working?**

Earn replaces the current temporary **Progress** tab name.

The existing Progress visual language may be reused, but all content must reflect earning strategy and performance.

## Top metric

Recommended:
**Total Earned**

Do not repeat Wallet's Total Balance as the primary hero unless the visual reference requires it.

## Main chart

Show earning performance over time.

Examples:

- earned value
- selected period

Do not make the chart a trading chart.

## Three compact metrics

Recommended:

- **Earned**
- **Current APY**
- **Earning Balance**

Alternative if better for the reference geometry:

- Earned
- Avg. APY
- Earning

## Main segmented control

Recommended:

- **Earnings**
- **Strategies**

### Earnings
List yield accrual events.

### Strategies
Show current and historical strategy allocation / rebalance events.

## Earn should NOT duplicate Wallet

Wallet = current balance state.

Earn = performance, strategy, risk and time horizon.

---

# 10. Earn → Manage Strategy

## Presentation

Native **BottomSheet**.

## User inputs

### When do you need the money?

Options:

- Anytime
- 7+ days
- 30+ days
- Pick a date

### Risk

Options:

- Stable
- Balanced
- Growth

## Output

Show the resulting strategy recommendation.

Essential information only:

- estimated APY
- liquidity / access expectation
- primary risk
- selected risk profile

Example:

**Balanced**

Estimated APY  
`~6.2%`

Access  
`Flexible`

Main risk  
`Smart contract + stablecoin risk`

Actions:

- Apply
- See risk details

## Important

Do not promise guaranteed returns.

Use:

- Estimated APY
- Based on current rates
- Expected / estimated earnings

---

# 11. Earn → Strategy Details

This should be a **sheet or detail screen only if needed**.

Do not expose it by default.

Contents:

- selected strategy
- current allocation
- risk breakdown
- liquidity
- current estimated APY
- why Trinqa selected it

Optional advanced section:

- underlying provider / protocol

Default experience remains provider-agnostic.

---

# 12. Activity

## Purpose

Answer:

> **What happened with my money?**

Activity is the complete chronological record.

## Visual direction

Use the approved analytics/activity reference design.

## Header

**Activity**

## Main metric

Recommended:

**Total Flow**

or a period-specific equivalent.

Do not use `Total Spending` if it ignores deposits / received / earnings.

## Chart

Shows money movement over the selected period.

## Three summary metrics

Recommended:

- **Sent**
- **Earned**
- **Received**

## Segment

- **Payments**
- **Earnings**

### Payments list includes

- sent payments
- received payments
- merchant spend
- deposits
- withdrawals

### Earnings list includes

- yield earned
- strategy allocation
- strategy withdrawal
- rebalance

## Transaction row

Keep rows compact and use the existing design system.

Tap → Transaction Details.

---

# 13. Transaction Details

Use a **native BottomSheet** wherever the amount of information allows it.

Show:

- type
- amount
- date/time
- status
- recipient / source
- fee where applicable

Advanced details collapsed:

- network
- transaction hash
- provider / route details

Do not expose technical information above normal payment information.

---

# 14. Settings / Account

Do not add a Settings bottom tab.

Access from:

Home → More → Settings

Minimum MVP settings:

- account
- security
- default display currency
- risk disclaimer / legal
- support

Everything else waits.

---

# 15. Minimum Screen Inventory

The MVP should use the fewest full screens possible.

## Persistent tab screens — 4

1. Home
2. Wallet
3. Earn
4. Activity

## Required task screens — 4

5. Pay
6. Add Money Amount / Provider Flow
7. Withdraw
8. Transaction / Payment Success

## Native sheets / menus instead of full screens

- Add Money source selector
- More menu
- Strategy configuration
- payment confirmation
- transaction details
- account details where practical

This keeps navigation shallow.

---

# 16. Primary User Journeys

## Journey A — Fund and keep available

Home  
→ Add Money  
→ Bank  
→ Amount  
→ Anchor / provider flow  
→ Success  
→ Home

---

## Journey B — Fund and earn

Home  
→ Add Money  
→ Amount  
→ Success  
→ Put it to work  
→ Earn strategy sheet  
→ Risk + time horizon  
→ Apply  
→ Earn

---

## Journey C — Pay

Home  
→ Pay  
→ Recipient  
→ Amount / currency  
→ Confirm  
→ Success  
→ Home

---

## Journey D — Change earning strategy

Earn  
→ Manage Strategy  
→ Time horizon  
→ Risk  
→ Review  
→ Apply  
→ Earn

---

## Journey E — Withdraw

Home  
→ More  
→ Withdraw  

or

Wallet  
→ Withdraw

→ Amount / currency  
→ Destination  
→ Quote  
→ Confirm  
→ Success

---

## Journey F — Inspect history

Activity  
→ Payments / Earnings  
→ Transaction  
→ Details sheet

---

# 17. Backend / UX Contract

UI asks for intent.

Backend returns an outcome.

## Add Money

Input:
- source
- amount
- desired display currency

Backend:
- anchor discovery
- authentication
- quote
- deposit route

## Pay

Input:
- recipient
- amount
- target currency

Backend:
- source balance selection
- route selection
- conversion
- payout

## Earn

Input:
- amount
- time horizon
- risk

Backend:
- score available strategy
- return recommendation
- execute approved allocation

## Withdraw

Input:
- amount
- payout currency
- destination

Backend:
- unwind required position
- conversion
- best exit route
- payout

---

# 18. Hackathon MVP Priority

## MUST

- Home
- Wallet
- Earn
- Activity
- Add Money
- TRY → usable Stellar balance
- Pay / Send
- Receive
- risk selection
- time horizon
- DeFindex allocation
- earnings visibility
- Withdraw
- at least one complete:
  **deposit → earn → pay/withdraw**
  lifecycle

## SHOULD

- target-date liquidity recommendation
- direct Blend integration
- multi-anchor comparison
- multiple payout currencies
- why-this-strategy explanation
- route details
- automated rebalance

## NOT NOW

- card issuing
- credit
- borrowing UI
- merchant POS suite
- advanced NFC acquiring
- tax engine
- insurance
- active trading
- dozens of protocols

---

# 19. Navigation Rules

1. Bottom tabs are only:
   **Home · Wallet · Earn · Activity**

2. Pay is launched from Home.

3. Add Money is launched from Home.

4. Withdraw is accessible from Wallet and Home → More.

5. Strategy management lives under Earn.

6. History lives under Activity.

7. Settings lives under Home → More.

8. Infrastructure details are secondary disclosures, never primary navigation.

9. Prefer native:
   - BottomSheet
   - Menu
   - ConfirmationDialog
   - Picker
   - Button

   over creating unnecessary full-screen pages.

10. Every new full screen must answer:
   > Could this be a native sheet instead?

If yes, use the sheet.

---

# 20. Final Information Architecture

```text
Home
├── Add Money
│   ├── Bank
│   ├── Crypto / Wallet
│   └── Receive
├── Pay
│   ├── Recipient
│   ├── Amount
│   ├── Confirm
│   └── Success
└── More
    ├── Withdraw
    ├── Receive
    ├── Account Details
    └── Settings

Wallet
├── Total Balance
├── Available
├── Earning
├── Allocation
└── Withdraw

Earn
├── Performance
├── Earnings
├── Strategies
└── Manage Strategy
    ├── Time Horizon
    ├── Risk
    └── Apply

Activity
├── Overview
├── Payments
├── Earnings
└── Transaction Details
```

---

# 21. Core Product Statement

> **Home is where the user acts.**  
> **Wallet is where the money is.**  
> **Earn is how the money works.**  
> **Activity is what happened.**

Everything else is a short task flow or native sheet.

---

# 22. Product Reference Principle

This IA follows the same successful abstraction pattern seen in Stellar award-winning products:

- Decaf puts send / receive / invest / spend in front of the user while hiding the stablecoin/payment infrastructure.
- DeFindex converts multi-protocol DeFi complexity into a simple deposit/withdraw savings primitive for wallets.

Trinqa extends that model:

> **Get money in. Keep it productive. Pay or send it. Get it out. Hide everything in between.**
