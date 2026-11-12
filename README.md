# Castra — Cozy Personal Financial Ledger

**Castra** is a private, local-first mobile personal finance tracker built with **Expo**, **React Native**, and **SQLite**. It offers high-fidelity credit card statement tracking, multiple bank accounts, multi-currency support, and full data export/import capabilities wrapped in a calm, cozy aesthetic.

---

## Key Features

1. **Smart Cards & Accounts Engine:**
   * **Credit Cards:** Tracks credit limits, statement closing dates, payment due dates, and real-time utilization progress bars. Includes a 1-tap **"Pay Card"** action that transfers funds from your checking bank without counting as a double expense.
   * **Debit Cards:** Directly linked to a checking account, immediately debiting available bank balance.
   * **Banks & Wallets:** Physical cash wallets, checking, and savings accounts.
   * **Account Switcher Carousel:** Horizontal card deck to view individual balances and filter transactions by card or account.

2. **Multi-Currency System:**
   * Set your **Home Base Currency** (USD, EUR, GBP, INR, JPY, CAD, AUD, etc.).
   * Log transactions in any currency with instantaneous converted base value display.
   * Real-time Net Worth calculation aggregating all multi-currency assets and liabilities into your base currency.

3. **Cozy, Tactile UI/UX:**
   * Warm linen and espresso palette (`#FAF7F2` canvas, terracotta for expenses, earthy sage for income).
   * Big, satisfying numeric keypad with native haptic clicks (`expo-haptics`).
   * Fast 3-second quick logging.

4. **100% Data Ownership & Portability:**
   * **CSV Spreadsheet Export:** Direct export to Excel, Google Sheets, or Apple Numbers via the native iOS/Android share sheet.
   * **Full JSON Database Backup:** Export complete database snapshots to iCloud, Google Drive, or AirDrop.
   * **JSON Restore:** 1-tap restore to migrate devices or restore data anytime.
   * **Zero Remote Servers:** Stored entirely in local SQLite (`castra.db`). 100% private, runs offline, $0/month fees.

---

## How to Run Castra on Your Phone

### Prerequisites
1. Install the free **Expo Go** app on your phone:
   * [Expo Go on iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   * [Expo Go on Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Ensure your phone and computer are on the same Wi-Fi network.

### Start the App
From this directory:

```bash
bun run start
```

1. A QR code will appear in your terminal.
2. **iPhone:** Open the native **Camera app**, scan the QR code, and tap the banner to open in Expo Go.
3. **Android:** Open the **Expo Go app**, tap **"Scan QR code"**, and scan the terminal QR code.
4. Your personal budget app will instantly boot up on your physical device with live reload enabled!
