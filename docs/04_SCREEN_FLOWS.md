# Trinqa — Screen Flows v0.1

# 1. HOME
Mirror the supplied reference.

Contains:
- account/card visual
- account balance
- Add Money
- Pay
- More
- short Recent list

Example Recent:
- Maria — Received — +€250
- Coffee Shop — Payment — -€4.80
- Deposit — Bank Transfer — +₺10,000

No chain / anchor / route labels.

# 2. PAY
Entry:
- Home → Pay
- Native tab → Pay

Flow:
1. choose recipient / merchant / QR
2. enter amount
3. select receive currency only if needed
4. show quote
5. confirm
6. success

Quote shows only:
- recipient receives
- fee
- estimated arrival
- source balance

Technical route lives in optional details.

# 3. EARN
Use the second reference screen's balance layout.

Top:
- Total Balance
- Available
- Earning

Strategy module:
- current strategy
- risk
- estimated APY
- earning balance
- Manage allocation

Manage allocation opens native SwiftUI BottomSheet.

Options:
- Conservative
- Balanced
- Growth

Optional duration:
- Flexible
- 30 days
- 90 days

Do not call this an insured bank deposit unless it legally is one.

# 4. ACTIVITY
Phase 1 minimal:
- Payment
- Deposit
- Received
- Yield earned
- Withdrawal

Deep analytics wait for Phase 2.

# 5. ADD MONEY
Home → Add Money

Native BottomSheet source selector:
- Bank
- Another wallet / chain
- Stellar / QR

For fiat:
1. amount
2. supported anchor flow
3. balance credit
4. optionally allocate to Earn

# Copy rule
Prefer:
- Add Money
- Pay
- Earn
- Available
- Earning
- Received
- Sent
- Fee
- Arrives
- Strategy
- Risk

Avoid on primary screens:
- SEP-24
- Anchor
- Soroban
- Route
- Bridge
- Liquidity
- Vault contract
