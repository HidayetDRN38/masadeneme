# Matematik Duello - 2 Kişilik Online Oyun

## Kurulum

### 1. Supabase Projesi Oluşturma
1. [Supabase](https://supabase.com) sitesine gidin
2. Yeni bir proje oluşturun
3. Proje ayarlarından API URL'i ve anonim anahtarı kopyalayın

### 2. Veritabanı Kurulumu
1. Supabase projenizde SQL Editor'e gidin
2. `supabase-setup.sql` dosyasındaki kodu kopyalayıp çalıştırın
3. Tabloların oluşturulduğunu doğrulayın

### 3. Yapılandırma
1. `supabase-config.js` dosyasını açın
2. `YOUR_SUPABASE_URL` ve `YOUR_SUPABASE_ANON_KEY` değerlerini güncelleyin:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 4. Çalıştırma
```bash
# Python ile sunucu başlatma
python -m http.server 8080

# Veya Node.js ile
npx serve .
```

## Özellikler

### 🎮 Oyun Özellikleri
- 2 kişilik online matematik yarışı
- 5 matematik sorusu
- 3D animasyonlar ve efektler
- Mobil uyumlu tasarım
- Jiroskop desteği

### 🌐 Online Özellikler
- Oda oluşturma/katılma sistemi
- Real-time multiplayer
- Supabase backend
- Otomatik eşleştirme

### 🎲 Ek Özellikler
- Zar atma animasyonları
- Işık hüzmesi efektleri
- 3D kart flip animasyonları
- Smooth geçişler

## Kullanım

### Oda Oluşturma
1. "Oda Oluştur" butonuna tıklayın
2. Oda kodunu kopyalayın
3. Arkadaşınıza kodu gönderin

### Odaya Katılma
1. "Odaya Katıl" butonuna tıklayın
2. Oda kodunu girin
3. "Katıl" butonuna basın

### Oyun Başlatma
- İki oyuncu da odaya katılınca "Oyuna Başla" butonu aktif olur
- Her iki oyuncu da başlatabilir

## Teknolojiler

- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: TailwindCSS
- **Animasyon**: GSAP
- **Backend**: Supabase
- **Real-time**: Supabase Realtime
- **Icons**: Font Awesome

## Mobil Desteği

- Responsive tasarım
- Touch-friendly arayüz
- Jiroskop efektleri
- Dikey kullanım optimize

## Geliştirme

### Yeni Soru Ekleme
```javascript
{
    question: "Yeni soru metni",
    answers: ["Şık1", "Şık2", "Şık3", "Şık4"],
    correct: 0 // Doğru şıkkın indeksi
}
```

### Yeni Animasyon
GSAP kütüphanesi kullanarak yeni animasyonlar eklenebilir.

## Lisans

MIT License
