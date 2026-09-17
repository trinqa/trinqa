# Trinqa
### Working PRD — Pro Hackathon 2026

**Domain:** trinqa.com

**One-liner:**  
**Paran ihtiyacın olana kadar boşta durmasın.**

**Elevator pitch:**  
Trinqa, kullanıcının parasını en uygun fiat giriş rotasıyla Stellar ekosistemine taşıyan, paraya ne zaman ihtiyaç duyacağını ve risk tercihini anlayarak bakiyeyi uygun DeFi stratejilerinde değerlendiren, gerektiğinde kişilere veya merchant'lara gönderebilen ve en uygun çıkış rotasıyla istenen para birimine geri çeviren self-driving balance platformudur.

---

# 1. Problem

Bugün banka hesabında duran para çoğu kullanıcı için iki durumda:

- **Harcanıyor**
- **Boşta bekliyor**

DeFi tarafında ise:

- onlarca protocol,
- farklı APY'ler,
- farklı riskler,
- farklı stablecoin'ler,
- swap ve liquidity karmaşası,
- on-ramp / off-ramp problemi,
- kullanıcıdan finans bilgisi beklenmesi

var.

Kullanıcının gerçek sorusu:

> **"₺100.000 param var ve 20 gün buna ihtiyacım olmayacak; bu para o zamana kadar ne yapabilir?"**

Aynı kullanıcı ayrıca şunu da ister:

> **"€250'yi Maria'ya göndermek istiyorum — hangi anchor, hangi chain, hangi swap?"**

Trinqa bu soruları altyapı sorusu olmadan cevaplar.

---

# 2. Product Thesis

Trinqa kullanıcıya:

> "Hangi DeFi protocolünü kullanmak istiyorsun?"

diye sormaz.

Şunu sorar:

> **Bu paraya ne zaman ihtiyacın olacak?**

Kullanıcı sadece:

1. **Ne kadar?**
2. **Ne zaman lazım?**
3. **Ne kadar risk?**

sorularını cevaplar.

Ödeme ve transfer için de aynı prensip geçerlidir:

> **"€250'yi Maria'ya gönder."**

Kullanıcı anchor, chain, swap route, bridge veya payout rail seçmez.

Gerisini Trinqa çözer.

---

## Core Product Principle

**User chooses intent. Trinqa chooses infrastructure.**

Kullanıcı şunları düşünür:

- amount
- recipient
- currency
- time horizon
- risk

Şunları düşünmez:

- chain
- anchor
- protocol
- bridge
- liquidity pool

---

# 3. Positioning

## ❌ Banka hesabı

Fazla generic ve regülasyon açısından gereksiz beklenti yaratır.

## ❌ Yield Aggregator

Teknik olarak doğru ama consumer için anlamsızdır.

## ❌ Crypto Wallet

Ürünü gereksiz şekilde karmaşık gösterir.

## ✅ Trinqa = Self-Driving Balance

**Your money works until you need it.**

Türkçe:

> **Paran beklerken beklemesin.**

Alternatif:

> **Paranın autopilot'u.**

Trinqa yalnızca yield ürünü değildir. Para girişi, idle-balance earning, risk/liquidity yönetimi, gönderme/ödeme/alma ve çıkışı tek bir money orchestration katmanında birleştirir.

---

# 4. Core Experience

## Core surfaces

Trinqa'nın kilit ürün yüzeyleri:

- **Home**
- **Pay**
- **Earn**
- **Activity**

---

## Add Money

Kullanıcı:

**₺50.000 ekler.**

Trinqa:

- Anchor seçeneklerini karşılaştırır,
- en uygun fiat → Stellar rotasını seçer,
- net alınacak miktarı hesaplar,
- kullanıcıya sonucu gösterir.

Kullanıcı Anchor veya SEP bilmek zorunda değildir.

---

## Pay / Send / Receive

Kullanıcı:

**€250'yi Maria'ya göndermek istiyor.**

Trinqa:

- kaynak bakiyeyi seçer (available / earning'den gerekirse unwind),
- gerekiyorsa swap yapar,
- hedef para birimini ve payout rail'i belirler,
- fee + estimated arrival hesaplar,
- kullanıcıya sonucu gösterir.

Kullanıcı şunları seçer:

- recipient
- amount
- target receive currency (gerektiğinde)

Kullanıcı şunları seçmez:

- anchor
- chain
- swap route
- bridge
- payout rail

Onay ekranı önceliklendirir:

- recipient receives
- fee
- estimated arrival
- source balance

Kullanıcı ayrıca:

- bir merchant'a ödeme yapabilir,
- para alabilir,
- desteklenen yerlerde para talep edebilir.

---

## Earn

Trinqa parayı idle kaldığı süre boyunca uygun stratejide değerlendirir.

Kullanıcı risk ve time horizon seçer; Trinqa allocation kararını verir.

---

## Withdraw

Kullanıcı yalnızca ne istediğini söyler:

### ₺10,000 TRY

veya

### €300 EUR

veya

### $500 USD

Trinqa geri kalanını çözer.

---

# 5. When Do You Need It?

### Anytime

Likidite öncelikli.

### 7+ days

Düşük riskli yield.

### 30+ days

Daha geniş strategy selection.

### Pick a date

Örneğin:

**25 October 2026**

Trinqa allocation kararını buna göre verir.

---

# 6. Risk Profile

### 🟢 Stable

Lower risk  
Higher liquidity

### 🟡 Balanced

Moderate risk  
Balanced yield

### 🔴 Growth

Higher risk  
Higher expected return

Protocol detayları default olarak gizlidir.

---

# 7. Trinqa Strategy Engine

Trinqa mevcut stratejileri değerlendirir.

### MVP — DeFindex (primary)

Yield / vault infrastructure.

Hackathon MVP'de gerçek yield allocation, position visibility ve withdraw DeFindex üzerinden yapılır.

### Future strategy universe — Blend V2

Lending yield.

Blend strateji evreninde kalır; doğrudan entegrasyon hackathon MVP'si için zorunlu değildir.

### Soroswap

Swap ve liquidity routing.

---

# 8. Strategy Scoring

Trinqa yalnızca en yüksek APY'yi seçmez.

### Safety — 35%

### Liquidity — 25%

### Net Yield — 20%

### Asset Risk — 10%

### Diversification — 10%

Sonuç:

> **Highest APY ≠ Best strategy**

Trinqa kullanıcının hedefi için en uygun stratejiyi seçer.

---

# 9. Money Autopilot

## Vision

Trinqa sürekli şu soruyu sorar:

> **Bu para şu anda doğru yerde mi?**

Örneğin kullanıcının parasına 30 gün sonra ihtiyacı varsa:

### Day 30

80% earning  
20% liquid

### Day 10

60% earning  
40% liquid

### Day 3

20% earning  
80% liquid

### Day 1

100% liquid

Deadline yaklaştıkça sistem otomatik olarak daha likit hale gelir.

Bu, ürün vizyonunun stratejik anlatımıdır.

## MVP scope

Hackathon MVP'de:

- strategy recommendation
- controlled allocation
- optional manual / approved rebalance
- target-date based recommended liquidity shift

Tam otonom, sürekli auto-rebalancing MVP için hard requirement değildir.

---

# 10. Auto Rebalancing

## Vision

Trinqa şu durumlarda allocation değiştirebilir:

- APY değişirse
- liquidity düşerse
- pool utilization yükselirse
- protocol risk değişirse
- daha iyi strategy çıkarsa
- hedef tarih yaklaşırsa

Örneğin:

> **Trinqa moved $820 from Blend → DeFindex.**

**Why?**

Better liquidity with similar yield.

## MVP scope

Hackathon MVP'de auto rebalance **SHOULD** seviyesindedir.

MVP'de zorunlu olan:

- strategy recommendation
- controlled allocation
- kullanıcı onaylı veya manuel rebalance (desteklenirse)
- target-date liquidity shift önerisi

Sürekli, tam otonom rebalancing post-hackathon roadmap'e taşınır.

---

# 11. Home

# ₺52,481

### +₺2,481 earned

---

## Your money is working

**₺41,000**

earning

**₺11,481**

available

---

### Estimated monthly earnings

**+₺437**

---

### Available

**Anytime**

Ana CTA:

### Withdraw

İkinci CTA:

### Add Money

Shortcut:

### Pay

---

# 12. Pay

Kullanıcı:

- kişiye para gönderir,
- merchant'a ödeme yapar,
- para alır,
- desteklenen yerlerde para talep eder.

Örnek intent:

> **Send €250 to Maria.**

Trinqa Payment Router:

1. source balance seçer,
2. gerekiyorsa earning pozisyonunu unwind eder,
3. asset / swap kararını verir,
4. anchor / payout rail seçer,
5. fee + estimated arrival hesaplar,
6. transferi execute eder.

Kullanıcı confirmation'da görür:

- recipient receives
- fee
- estimated arrival
- source balance

---

# 13. Withdraw

Kullanıcı yalnızca ne istediğini söyler:

### ₺10,000 TRY

veya

### €300 EUR

veya

### $500 USD

Trinqa:

1. gerekli pozisyonları kapatır,
2. gerekiyorsa swap yapar,
3. Anchor seçeneklerini karşılaştırır,
4. fee + FX + settlement süresini hesaplar,
5. en iyi net payout rotasını seçer,
6. parayı kullanıcıya çıkarır.

---

# 14. Trinqa Router

Anchor seçimi sadece:

> **en ucuz Anchor**

değildir.

Trinqa şu skoru hesaplar:

### Net payout — 40%

### Settlement speed — 20%

### Reliability — 15%

### KYC friction — 15%

### Limits — 10%

Amaç:

> **Best effective route**

Aynı mantık Pay / Send / Receive için de geçerlidir: Payment Router en iyi desteklenen rotayı seçer.

---

# 15. Killer User Story

Kullanıcının:

**₺100.000**

parası var.

Bu paraya:

**35 gün sonra**

ihtiyacı olacak.

Ayrıca yol boyunca:

**€250'yi Maria'ya göndermek**

isteyebilir.

Trinqa:

```text
TRY
 ↓
Best Anchor
 ↓
USDC
 ↓
DeFindex allocation
 ↓
Recommended liquidity shift
 ↓
Pay €250 to Maria (Trinqa chooses route)
 ↓
Best Exit Route
 ↓
TRY
```

Kullanıcı deneyimi:

> **₺100.000 yatırdım.**

> **35 gün boyunca Trinqa yönetti.**

> **Ara sıra para gönderdim.**

> **İhtiyacım olduğunda tek tıkla geri çektim.**

Crypto complexity görünmez.

---

# 16. Why Stellar?

Stellar Trinqa için teknoloji vitrini değil, core infrastructure'dır.

### Anchors

Fiat giriş / çıkış.

### SEP-38

Quote discovery.

### Soroban

Policy enforcement ve authorization.

### DeFindex

Yield (MVP primary).

### Blend

Lending (future strategy universe).

### Soroswap

Liquidity routing.

Bu katmanlardan biri çıkarıldığında Trinqa'nın ana ürünü bozulur.

---

# 17. Hackathon MVP

## MUST

- Wallet / account onboarding
- TRY → usable Stellar balance
- Add Money
- Pay / Send
- Receive
- Time horizon
- Risk selection
- DeFindex integration
- Real strategy allocation
- Earnings dashboard
- Withdraw flow
- Anchor routing
- Lightweight Soroban policy contract
- At least one complete lifecycle:
  **deposit → earn → pay/withdraw**

---

## SHOULD

Demo yetişirse:

- Auto rebalance
- Direct Blend integration
- Multi-anchor comparison
- TRY / EUR / USD payout
- "Why this strategy?"
- Risk explanation
- Route comparison
- Target-date liquidity automation

---

# 18. WON'T

Hackathon sırasında:

- debit card
- credit
- borrowing UX
- POS
- bank integrations
- tax engine
- insurance
- active trading
- dozens of protocols

yok.

---

# 19. Architecture

### Mobile

React Native / Expo

### Backend

TypeScript orchestration layer

### Wallet / Account Adapter

Adapter-based wallet abstraction.

Final provider, Expo / React Native compatibility validation sonrası seçilir.

Olası adaylar:

- Privy
- Stellar smart wallet / passkey tooling
- diğer Stellar-compatible embedded wallet yaklaşımları

UI ve business logic doğrudan provider API'sine değil, wallet/account interface'ine bağlanır.

### Anchor Adapter

SEP-10  
SEP-12  
SEP-24 / SEP-6  
SEP-38

### Yield Adapter

DeFindex first

Blend ve diğer stratejiler adapter arkasında kalır; MVP'de DeFindex önceliklidir.

### Swap / Routing Adapter

Soroswap

### Risk Engine

Off-chain scoring service

### Policy Contract

Soroban  
`TrinqaPolicy` / `TrinqaAllocationPolicy`

### Payment Router

Seçer:

- source balance
- asset
- swap
- anchor
- payout rail
- target currency

### Network

Stellar + Soroban

---

# 20. TrinqaPolicy

Trinqa ikinci bir DeFi vault inşa etmez.

Yield / strategy execution provider-specific adapter'ların arkasında kalır (DeFindex first).

Policy contract amacı:

Kullanıcı intent ve allocation policy'sini saklamak / enforce etmek — fon custodisi değil.

Conceptual state:

```text
UserPolicy
 ├─ riskProfile
 ├─ targetDate
 ├─ liquidityTarget
 ├─ allowedStrategies
 └─ rebalancePolicy
```

Functions:

```text
setPolicy()
updateRisk()
updateTargetDate()
authorizeAllocation()
authorizeRebalance()
pauseAutomation()
```

Strategy engine karar verir.

Soroban policy enforcement ve authorization sağlar.

Gerçek yield pozisyonları DeFindex gibi external infrastructure üzerinde kalır.

---

# 21. Risk UX

Kullanıcı şunları görür:

### Expected Return

**~7.2% APY**

### Access

**Usually <24h**

### Main Risk

**Smart contract + stablecoin risk**

Detay isteyen kullanıcı:

### See full risk breakdown

ile açabilir.

---

# 22. Earnings UX

Trinqa garanti getiri dili kullanmaz.

❌

> 30 günde ₺1.420 kazanacaksın.

✅

> **Estimated +₺1,420**

> Based on current rates.

---

# 23. Core Differentiator

Klasik yield aggregator:

> **En yüksek yield nerede?**

Trinqa:

> **Senin paran şu anda nerede olmalı?**

Yield aggregator:

**asset-centric**

Trinqa:

**intent-centric**

Kullanıcı intent'i sadece "ne kadar yield?" değil; aynı zamanda "kime, ne kadar, hangi para biriminde?" olabilir.

---

# 24. North Star

## Money Managed by Trinqa

Secondary metrics:

- funded users
- managed balance
- % balance earning
- earned value
- average net APY
- completed withdrawals
- completed sends / payments
- average exit cost
- routing savings

---

# 25. Hackathon Success

Hedef:

### 10+

onboarded users

### 5+

funded accounts

### 3+

Anchor deposits

### 3+

real yield positions

### 1+

full lifecycle:

**deposit → earn → pay/withdraw**

---

# 26. Demo Story

Demo şu soruyla başlar:

> **"Şu anda banka hesabınızda bekleyen para ne yapıyor?"**

Muhtemel cevap:

> **"Hiçbir şey."**

Sonra:

### ₺10,000 Add Money

↓

### Need it in 30 days

↓

### Balanced

↓

### Trinqa finds the route

↓

### Money starts working

↓

### Send €250 to Maria

↓

### Recommended liquidity shift

↓

### Withdraw in EUR

↓

### Done

Final:

> **Your money works until you need it.**

---

# 27. Brand Narrative

## Trinqa

Bir banka değil.

Bir crypto wallet değil.

Bir investment dashboard değil.

**Paranın kendini yönetmesini sağlayan bir financial orchestration layer.**

Trinqa:

### Finds the best way in.

### Finds the best place to wait.

### Finds the best way out.

Ve arada parayı göndermeni, almanı ve ödemeni sağlar.

Kullanıcı aradaki complexity'yi görmez.

---

# 28. Product Statement

## Trinqa

**The self-driving balance.**

Kullanıcı yalnızca:

### How much?

### When?

### How much risk?

### To whom?

### In what currency?

der.

Trinqa gerisini çözer.

---

# Core Principle

> **Fiat in.**

> **Trinqa works.**

> **Fiat out.**

> **Everything in between disappears.**

---

# Core Product Principle

> **User chooses intent. Trinqa chooses infrastructure.**
