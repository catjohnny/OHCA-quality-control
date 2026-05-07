# OHCA 品管系統 (OHCA Quality Control System)

這是一個專為 OHCA（到院前心肺功能停止）案件設計的高精度品管系統。用於記錄、校正並分析緊急救護勤務中的時間軸與救護處置數據。


## 思路來源
因為每次計算 CCF 很麻煩要一直切換視窗，用試算表又超難用，不然直接搞一個工具出來解決問題，承蒙新北的學長的種樹，來修樹葉。
計劃要變成一個通用的工具，然後整合可登入的後端，實現一個可一次性複製到試算表，也可以同步到自己後端 DB 的 一個工具 Web。

## 主要功能

- **時間校正**：校正密錄器與 AED 之間的時間落差。
- **時間紀錄**：記錄接觸患者、判斷 OHCA、CPR 開始、貼片、給藥等關鍵時間點。
- **中斷分析**：自動計算貼片前與 MCPR 架設前的 CPR 中斷時間。
- **CCF 計算**：自動計算胸外按壓分率 (Chest Compression Fraction)。
- **自動上傳**：將品管結果自動彙整並上傳至 Google Sheets 進行後續分析。

## 開發與執行

### 前置作業

- 安裝 [Node.js](https://nodejs.org/)

### 本地開發環境設置

1. 安裝依賴套件：

   ```bash
   npm install
   ```

2. 啟動開發伺服器：

   ```bash
   npm run dev
   ```

3. 建置生產版本：

   ```bash
   npm run build
   ```

## 技術棧

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Bundler**: Vite
- **Storage**: 待定*
