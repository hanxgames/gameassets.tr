/** Privacy policy and terms. English and Turkish; other locales show the English text. */
export const LEGAL_UPDATED = '2026-11-27';
type Doc = { title: string; description: string; h1: string; lead: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<'privacy' | 'terms', Record<'en' | 'tr', Doc>> = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      description: 'How GameAssets.tr handles personal data: creator accounts, anonymous view counters, no tracking cookies. KVKK and GDPR rights.',
      h1: 'Privacy.',
      lead: 'Short version: browsing needs no account and sets no tracking cookies. Creators share only what their profile needs.',
      sections: [
        { h: 'Who we are', p: ['GameAssets.tr is run by HanX Games, an independent game studio in Türkiye, acting as data controller under the Turkish Personal Data Protection Law (KVKK, No. 6698) and, for visitors in the EU, the GDPR.'] },
        { h: 'Visitors', p: ['You can browse without an account. We count page views and clicks on Buy buttons per pack. These counters store no name, e-mail, IP address or cookie; a flag in your browser’s session storage only stops the same view from being counted twice. Your language choice is kept in your browser’s local storage.', 'The site is hosted on GitHub Pages and loads fonts from Google Fonts; those providers receive your IP address to deliver the files. Pack images load from the creator’s store image server.'] },
        { h: 'Creator accounts', p: ['When you create an account we process your e-mail address (or your Google account’s e-mail and name), a sign-in identifier, and what you add yourself: whether you are an asset creator, game developer or player, an optional studio name (seen only by you and the site team), handle, display name, bio, website, X username, your store username and the packs you list. Your profile, packs and their public view and click totals are shown on the site. Your e-mail is never shown.', 'Accounts and data are handled by Google Firebase (Authentication, Firestore, Cloud Functions) in the europe-west1 region. Firebase keeps you signed in with data stored in your browser.'] },
        { h: 'Why and on what basis', p: ['To run your account and show your listings (performance of a contract), to keep the service safe and count views (legitimate interest), and to meet legal duties. We do not sell data and we do not use it for advertising.'] },
        { h: 'How long', p: ['Account data stays until you delete your account or ask us to. Daily counters are kept for 35 days and then merged into totals. Hidden or deleted packs are removed from the site at the next update.'] },
        { h: 'Your rights', p: ['Under KVKK article 11 and the GDPR you can ask what we hold about you, get it corrected or deleted, object to processing, and complain to the Personal Data Protection Authority (KVKK) or your EU supervisory authority. Write to us through X (@Hanxgames_) or the contact options on hanxgames.net.'] },
      ],
    },
    tr: {
      title: 'Gizlilik Politikası',
      description: 'GameAssets.tr kişisel verileri nasıl işler: üretici hesapları, anonim görüntülenme sayaçları, izleme çerezi yok. KVKK ve GDPR hakları.',
      h1: 'Gizlilik.',
      lead: 'Kısaca: siteyi gezmek için hesap gerekmez ve izleme çerezi kullanılmaz. Üreticiler yalnızca profilleri için gerekeni paylaşır.',
      sections: [
        { h: 'Biz kimiz', p: ['GameAssets.tr, Türkiye’de bağımsız bir oyun stüdyosu olan HanX Games tarafından işletilir. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve AB’deki ziyaretçiler için GDPR kapsamında veri sorumlusudur.'] },
        { h: 'Ziyaretçiler', p: ['Siteyi hesapsız gezebilirsiniz. Her paket için sayfa görüntülenmelerini ve Satın al düğmesine tıklamaları sayarız. Bu sayaçlar ad, e-posta, IP adresi ya da çerez saklamaz; tarayıcınızın oturum deposundaki bir işaret yalnızca aynı görüntülenmenin iki kez sayılmasını önler. Dil seçiminiz tarayıcınızın yerel deposunda tutulur.', 'Site GitHub Pages üzerinde barındırılır ve yazı tiplerini Google Fonts’tan yükler; bu sağlayıcılar dosyaları iletmek için IP adresinizi alır. Paket görselleri üreticinin mağaza görsel sunucusundan yüklenir.'] },
        { h: 'Üretici hesapları', p: ['Hesap açtığınızda e-posta adresinizi (veya Google hesabınızın e-postasını ve adını), bir giriş kimliğini ve kendi eklediklerinizi işleriz: asset üreticisi, oyun geliştiricisi veya oyuncu olduğunuz bilgisi, isteğe bağlı stüdyo adınız (yalnızca siz ve site ekibi görür), kullanıcı adı, görünen ad, biyografi, web sitesi, X kullanıcı adı, mağaza kullanıcı adınız ve listelediğiniz paketler. Profiliniz, paketleriniz ve bunların toplam görüntülenme ve tıklama sayıları sitede gösterilir. E-posta adresiniz hiçbir zaman gösterilmez.', 'Hesaplar ve veriler Google Firebase (Authentication, Firestore, Cloud Functions) tarafından europe-west1 bölgesinde işlenir. Firebase oturumunuzu tarayıcınızda saklanan verilerle açık tutar.'] },
        { h: 'Amaç ve hukuki sebep', p: ['Hesabınızı yürütmek ve paketlerinizi göstermek (sözleşmenin ifası), hizmeti güvende tutmak ve görüntülenmeleri saymak (meşru menfaat) ve yasal yükümlülükleri yerine getirmek. Verileri satmayız ve reklam için kullanmayız.'] },
        { h: 'Saklama süresi', p: ['Hesap verileri, hesabınızı silene veya silinmesini isteyene kadar tutulur. Günlük sayaçlar 35 gün saklanır, sonra toplamlara eklenir. Gizlenen veya silinen paketler bir sonraki güncellemede siteden kaldırılır.'] },
        { h: 'Haklarınız', p: ['KVKK 11. madde ve GDPR kapsamında hakkınızda hangi verileri tuttuğumuzu öğrenebilir, düzeltilmesini veya silinmesini isteyebilir, işlemeye itiraz edebilir ve Kişisel Verileri Koruma Kurumu’na ya da AB denetim makamınıza şikâyette bulunabilirsiniz. Bize X (@Hanxgames_) veya hanxgames.net üzerindeki iletişim seçenekleriyle ulaşın.'] },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Use',
      description: 'The rules for using GameAssets.tr: a free showcase where creators list game assets and buyers purchase from the creator’s own store.',
      h1: 'Terms.',
      lead: 'GameAssets.tr is a free showcase. We list packs; every sale happens between you and the creator on the creator’s own store.',
      sections: [
        { h: 'The service', p: ['GameAssets.tr shows game asset packs from independent creators and links to the creator’s store to buy them. We are not a party to any purchase, do not handle payments and do not deliver files. Questions about a purchase, refunds, files and licenses go to the creator.'] },
        { h: 'Creator accounts', p: ['You must be at least 16, give accurate details and keep your sign-in safe. One person or studio may connect a store only once, and only a store they control.'] },
        { h: 'What you may list', p: ['List only game assets you made or have the right to sell. No games, no content copied from others, nothing illegal, hateful or sexually explicit, and no misleading titles, tags or images. Prices and sales are read from your store.'] },
        { h: 'Permission to show your listings', p: ['By listing a pack you allow GameAssets.tr to show its title, description, images, price and tags on the site and in search engines, social previews and feeds, for as long as the listing is live. You keep all rights to your work.'] },
        { h: 'Moderation', p: ['We may hide or delete listings, and restrict, suspend or ban accounts that break these terms or harm buyers, other creators or the site. Where we can, we tell you why.'] },
        { h: 'No warranty', p: ['The site is provided as is. Rankings and counters are estimates. To the extent the law allows, we are not liable for losses arising from listings, purchases or downtime.'] },
        { h: 'Changes and law', p: ['We may update these terms; the date above shows the latest version. Turkish law applies, and the courts of Istanbul have jurisdiction, without limiting consumer rights you have where you live.'] },
      ],
    },
    tr: {
      title: 'Kullanım Koşulları',
      description: 'GameAssets.tr kullanım kuralları: üreticilerin oyun assetlerini listelediği, alıcıların üreticinin kendi mağazasından satın aldığı ücretsiz bir vitrin.',
      h1: 'Koşullar.',
      lead: 'GameAssets.tr ücretsiz bir vitrindir. Paketleri listeleriz; her satış sizinle üretici arasında, üreticinin kendi mağazasında gerçekleşir.',
      sections: [
        { h: 'Hizmet', p: ['GameAssets.tr bağımsız üreticilerin oyun asset paketlerini gösterir ve satın almak için üreticinin mağazasına bağlantı verir. Hiçbir satın almanın tarafı değiliz, ödeme almayız ve dosya teslim etmeyiz. Satın alma, iade, dosya ve lisans soruları üreticiye yöneltilir.'] },
        { h: 'Üretici hesapları', p: ['En az 16 yaşında olmalı, doğru bilgi vermeli ve giriş bilgilerinizi korumalısınız. Bir kişi veya stüdyo bir mağazayı yalnızca bir kez ve yalnızca kendi yönettiği mağazayı bağlayabilir.'] },
        { h: 'Neler listelenebilir', p: ['Yalnızca kendi yaptığınız veya satma hakkına sahip olduğunuz oyun assetlerini listeleyin. Oyunlar, başkalarından kopyalanmış içerik, yasa dışı, nefret içeren veya müstehcen içerik ve yanıltıcı başlık, etiket ya da görseller yasaktır. Fiyatlar ve indirimler mağazanızdan okunur.'] },
        { h: 'Listelerinizi gösterme izni', p: ['Bir paketi listeleyerek, liste yayında kaldığı sürece başlığının, açıklamasının, görsellerinin, fiyatının ve etiketlerinin sitede, arama motorlarında, sosyal önizlemelerde ve akışlarda gösterilmesine izin verirsiniz. Eserinizin tüm hakları sizde kalır.'] },
        { h: 'Denetim', p: ['Bu koşulları ihlal eden veya alıcılara, diğer üreticilere ya da siteye zarar veren listeleri gizleyebilir veya silebilir, hesapları kısıtlayabilir, askıya alabilir veya yasaklayabiliriz. Mümkün olduğunda nedenini bildiririz.'] },
        { h: 'Garanti yoktur', p: ['Site olduğu gibi sunulur. Sıralamalar ve sayaçlar tahminidir. Yasanın izin verdiği ölçüde listelerden, satın almalardan veya kesintilerden doğan kayıplardan sorumlu değiliz.'] },
        { h: 'Değişiklikler ve hukuk', p: ['Bu koşulları güncelleyebiliriz; yukarıdaki tarih en son sürümü gösterir. Türk hukuku uygulanır ve İstanbul mahkemeleri yetkilidir; yaşadığınız yerdeki tüketici haklarınız saklıdır.'] },
      ],
    },
  },
};
