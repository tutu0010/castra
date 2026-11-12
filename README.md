# Castra — 100% Private, Local-First Financial Ledger

**Castra** is an offline, local-first mobile personal financial ledger app built with **Expo (React Native)**, **Bun**, and **SQLite**. It offers high-contrast obsidian dark aesthetics, biometric authentication, credit card statement & limit tracking, category budgets with safe-to-spend daily pacing, recurring subscription tracking, and visual SVG analytics.

---

## Architecture & Privacy Guarantee

* **100% Offline & Private:** Zero tracking, zero analytics, zero remote database calls. All financial transactions, accounts, and budgets reside exclusively on your local device in SQLite (`castra.db`).
* **Hardware Biometrics:** Protected by native FaceID / Fingerprint lock (`expo-local-authentication`).
* **Full Data Ownership:** 1-tap encrypted JSON database snapshot exports and spreadsheet CSV exports.

---

## Core Capabilities

### 1. Multi-Account & Credit Card Hub
* **Credit Cards:** Real-time credit limit monitoring, statement closing day, due day, and visual credit utilization progress bars. Includes 1-tap **"Pay Card"** transfer from checking without double-counting expenses.
* **Bank Accounts & Wallets:** Direct checking, savings, and physical cash wallet support.
* **1-Tap Balance Adjuster:** Sub-page for every card and bank account featuring an instant custom numeric pad to modify account balances and state directly.
* **Bank-to-Card Transfers:** Seamless settlement transfers between checking accounts and credit cards.

### 2. Category Budgets & "Safe-to-Spend" Daily Pace
* **Safe-to-Spend Engine:** Calculates exact daily safe spending limits (`₹ / day`) based on remaining monthly allowances and days left in the current month.
* **Real-Time Pace Meter:** Instant alerts (`Safe Daily Pace`, `Fast Pace`, `Budget Exceeded`).
* **Category Progress Bars:** Color-coded limits (green `<75%`, amber `75–99%`, red `≥100%`) with quick-set preset caps (`₹2,000`, `₹5,000`, `₹10,000`, `₹20,000`, `₹50,000`).

### 3. Recurring Bills & Subscription Radar
* **Due Date Countdown:** Actively monitors recurring subscriptions (Netflix, Spotify, Wifi, Rent) with countdown tags (`Due Today!`, `Due in 3d`).
* **1-Tap "Mark Paid":** Instantly logs the payment to the ledger and deducts from the specified bank or credit card.
* **Custom Frequencies:** Supports Monthly, Weekly, and Yearly billing cycles.

### 4. Visual Cash Flow & Spending Breakdown (Charts)
* **Pure SVG Category Donut Chart:** High-contrast category expense distribution rendered with zero third-party chart library bloat.
* **Interactive Legend:** Percentage and total currency breakdown per category.
* **Cash Flow Bar Comparison:** Side-by-side comparison of Total Income vs. Total Spend, Net Cash Flow, and Savings Rate percentage.
* **Timeframe Filters:** Switch between **This Month** and **All Time** metrics.

### 5. Smart Search & Date-Range Filtering
* **Live Search:** Queries transaction notes, merchants, category names, or account names with 1-tap clear.
* **Date Range Filters:** 1-tap filter chips for **All**, **This Month**, **Last Month**, and **30 Days**.
* **Category Chips:** Horizontal filter chips with color-coded indicators.

---

## Tech Stack

* **Runtime & Package Manager:** Bun (`bun.lock`)
* **Framework:** React Native 0.88.1 / Expo SDK 58
* **Database:** `expo-sqlite` (Native WAL mode) + Web localStorage fallback
* **Icons:** `lucide-react-native`
* **Charts:** `react-native-svg`
* **Security:** `expo-local-authentication`
* **Haptics:** `expo-haptics`

---

## Development

```bash
# Install dependencies
bun install

# Start Expo Go development server
bun run start

# Run on Android
bun run android

# Type check
bunx tsc --noEmit
```
