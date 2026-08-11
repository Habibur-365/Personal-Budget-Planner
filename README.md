# 💰 HR Fund Manager — Personal Budget Planner

<div align="center">

![HR Fund Manager Banner](icons/icon-192.png)

**একটি সুন্দর, ফিচার-সমৃদ্ধ পার্সোনাল বাজেট ট্র্যাকার**

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6c63ff?style=for-the-badge&logo=github)](https://YOUR-USERNAME.github.io/personal-budget-planner/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-00d4ff?style=for-the-badge&logo=pwa)](https://YOUR-USERNAME.github.io/personal-budget-planner/)
[![Offline Support](https://img.shields.io/badge/Offline-Supported-4caf50?style=for-the-badge)](https://YOUR-USERNAME.github.io/personal-budget-planner/)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Real-time financial overview with charts |
| 💸 **Transactions** | Add, edit, delete income & expenses |
| 🎯 **Budget Goals** | Set and track monthly budget limits |
| 📈 **Analytics** | Detailed spending insights & trends |
| 📅 **Calendar View** | Visual transaction calendar |
| ⚙️ **Settings** | Themes, currency, data import/export |
| 📱 **PWA** | Install on mobile like a native app |
| 🔌 **Offline** | Works without internet connection |
| 🌙 **Dark Mode** | Beautiful dark/light theme |

---

## 📱 মোবাইলে ইন্সটল করার পদ্ধতি

### Android (Chrome)
1. ব্রাউজারে লাইভ লিংক ওপেন করুন
2. মেনু (⋮) → **"Add to Home Screen"** ক্লিক করুন
3. **"Install"** বা **"Add"** চাপুন
4. হোম স্ক্রিনে HR Fund Manager অ্যাপ চলে আসবে ✅

### iPhone/iPad (Safari)
1. Safari-তে লাইভ লিংক ওপেন করুন
2. Share বাটন (□↑) চাপুন
3. **"Add to Home Screen"** চাপুন
4. নাম দিয়ে **"Add"** চাপুন ✅

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/personal-budget-planner.git
cd personal-budget-planner

# Open in browser (no build step needed!)
# Just open index.html in your browser
# Or use a local server:
npx serve .
# Then visit http://localhost:3000
```

---

## 🏗️ Project Structure

```
personal-budget-planner/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline support)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── app.js          # Main app controller
│   ├── dashboard.js    # Dashboard module
│   ├── transactions.js # Transactions module
│   ├── budget.js       # Budget goals module
│   ├── analytics.js    # Analytics & charts module
│   ├── calendar.js     # Calendar module
│   ├── settings.js     # Settings module
│   ├── storage.js      # LocalStorage data layer
│   └── utils.js        # Utility functions
└── icons/              # PWA app icons
    ├── icon-72.png
    ├── icon-192.png
    └── icon-512.png
```

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, animations, glassmorphism
- **Vanilla JavaScript** — No frameworks, pure ES6+
- **Chart.js** — Beautiful data visualizations
- **jsPDF** — PDF export
- **XLSX.js** — Excel export
- **LocalStorage** — Client-side data persistence
- **Service Worker** — Offline PWA support

---

## 📄 License

MIT License — Free to use and modify.

---

<div align="center">
Made with ❤️ | HR Fund Manager v1.0
</div>
