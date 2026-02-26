# GitHub Pages Deployment Guide

## 🚀 Site Linki
**Local Development:** http://localhost:8080

## 📦 GitHub Pages'te Yayınlama

### Adım 1: Repository Oluşturma
```bash
# Git reposunu başlat
git init
git add .
git commit -m "Initial commit"

# GitHub'da yeni repo oluştur
# Repository adı: username.github.io
# Örnek: hdtdu.github.io
```

### Adım 2: GitHub'a Push Etme
```bash
git remote add origin https://github.com/KULLANICIADI/KULLANICIADI.github.io.git
git branch -M main
git push -u origin main
```

### Adım 3: GitHub Pages Ayarları
1. GitHub reposuna git
2. **Settings** > **Pages**'e tıkla
3. **Source**: **Deploy from a branch**
4. **Branch**: **main** > **/(root)**
5. **Save**'e tıkla

### Adım 4: Site Aktif!
**Site adresin:** https://KULLANICIADI.github.io

## ⚠️ Önemli Notlar

### Supabase Ayarları
GitHub Pages'de çalışması için Supabase CORS ayarları gerekli:

1. **Supabase Proje** > **Settings** > **API**
2. **CORS** bölümüne ekle:
   ```
   https://KULLANICIADI.github.io
   ```

### Dosya Yapısı
```
windsurf-project-3/
├── index.html
├── style.css
├── script.js
├── supabase-config.js
├── online-manager.js
├── README.md
└── github-deployment.md
```

## 🔧 Test Etme
1. Local'de test et: `python -m http.server 8080`
2. GitHub'a push et
3. 5-10 dakika bekle
4. https://KULLANICIADI.github.io adresini aç

## 🌐 Alternatif Hosting

### Netlify (Önerilen)
1. https://netlify.com'a git
2. "Drag and drop" ile dosyaları yükle
3. Otomatik yayınlanır

### Vercel
1. https://vercel.com'a git
2. GitHub reposunu import et
3. Otomatik deployment

## 📱 Mobil Uyumluluk
Site zaten mobil uyumlu. GitHub Pages'de sorunsuz çalışır.

## 🔒 Güvenlik
Supabase anahtarları client-side olduğu için herkes görebilir. Bu normal ve güvenli.

## 🎮 Online Özellikler
GitHub Pages'de online multiplayer özellikleri çalışır çünkü Supabase real-time API kullanıyor.
