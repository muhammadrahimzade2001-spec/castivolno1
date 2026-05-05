// ╔══════════════════════════════════════════════════╗
// ║         IzaKaya Discord Bot — index.js           ║
// ║          🍶 Anime Sohbet Sunucusu Botu           ║
// ║              by Claude  •  v1.0                  ║
// ╚══════════════════════════════════════════════════╝

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} = require('discord.js');

try { require('dotenv').config(); } catch(e) {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
});

const PREFIX = '!';

// ─── Yapılandırma ─────────────────────────────────────────────────────────────
const OWNER_ID        = '1241737610318860298'; // Senin Discord ID'n (DM uyarıları için)
const HOSGELDIN_KANAL = '1500414696170459297'; // Sabit hoşgeldin kanalı

// ─── Küfür Filtresi ───────────────────────────────────────────────────────────
const KUFUR_LISTESI = [
  'orospu','oç','göt','sik','amk','bok','yarrak','piç','salak',
  'gerizekalı','aptal','mal','ibne','götlek','kahpe','şerefsiz',
];
function kufurVarMi(metin) {
  const lower = metin.toLowerCase().replace(/[^a-züöşğçı ]/g, '');
  return KUFUR_LISTESI.some(k => lower.includes(k));
}

// ─── Anti-Raid Takip ──────────────────────────────────────────────────────────
const raidTakip   = new Map();
const RAID_BAN_LIMIT = 3;
const RAID_DEL_LIMIT = 3;
const RAID_WINDOW_MS = 10000;

// ─── Renk Paleti (Anime / İzakaya Teması) ────────────────────────────────────
const COLORS = {
  SAKURA:   0xFF6B9D,   // Pembe - ana renk
  INDIGO:   0x4B0082,   // Koyu mor - vurgu
  KITSUNE:  0xFF8C00,   // Turuncu altın - seviye/XP
  YUKI:     0xA8D8EA,   // Buz mavisi - bilgi
  MIDORI:   0x5CB85C,   // Yeşil - başarı
  AKA:      0xE74C3C,   // Kırmızı - hata/ban
  NEON:     0x00FFCC,   // Neon turkuaz - eglence
  MURASAKI: 0x9B59B6,   // Mor - özel
  YORU:     0x1A1A2E,   // Gece mavisi - koyu arka plan
  TSUKI:    0xF0E6FF,   // Ay ışığı - açık
};

// ─── Anime XP Unvanları ───────────────────────────────────────────────────────
const UNVANLAR = [
  { min: 1,  unvan: '🌸 Genin',          emoji: '🌸' },
  { min: 5,  unvan: '⚔️ Chuunin',        emoji: '⚔️' },
  { min: 10, unvan: '🔥 Jounin',          emoji: '🔥' },
  { min: 20, unvan: '💫 ANBU',            emoji: '💫' },
  { min: 35, unvan: '🌟 Kage',            emoji: '🌟' },
  { min: 50, unvan: '⚡ Hokage',          emoji: '⚡' },
  { min: 75, unvan: '🏯 Efsane Ninja',    emoji: '🏯' },
  { min: 100, unvan: '🐉 Ejderha Lordu',  emoji: '🐉' },
];

function getUnvan(level) {
  let current = UNVANLAR[0];
  for (const u of UNVANLAR) {
    if (level >= u.min) current = u;
  }
  return current;
}

// ─── XP Sistemi ───────────────────────────────────────────────────────────────
const xpData = new Map();

function getUser(id) {
  if (!xpData.has(id)) xpData.set(id, { xp: 0, level: 1, mesajSayisi: 0 });
  return xpData.get(id);
}

function addXP(id, amount) {
  const u = getUser(id);
  u.xp += amount;
  u.mesajSayisi = (u.mesajSayisi || 0) + 1;
  const needed = u.level * 120;
  if (u.xp >= needed) { u.xp -= needed; u.level++; return true; }
  return false;
}

// ─── Cooldown (XP spam önlemi) ────────────────────────────────────────────────
const xpCooldown = new Map();

// ─── Ticket Kategorileri ──────────────────────────────────────────────────────
const TICKET_KATEGORILER = {
  'genel_sohbet':   { label: '💬 Genel Yardım',       renk: COLORS.YUKI    },
  'anime_oneri':    { label: '🎌 Anime Önerisi',       renk: COLORS.SAKURA  },
  'sikayet':        { label: '🚨 Şikayet',             renk: COLORS.AKA     },
  'ortak_izleme':   { label: '🎬 Ortak İzleme Talebi', renk: COLORS.MURASAKI},
  'yetkili_basvuru':{ label: '🛡️ Yetkili Başvurusu',   renk: COLORS.KITSUNE },
  'bug_report':     { label: '🐛 Hata Bildirimi',      renk: COLORS.NEON    },
  'oneri':          { label: '✨ Sunucu Önerisi',       renk: COLORS.MIDORI  },
};

const TICKET_ACIKLAMALAR = {
  genel_sohbet:
    '💬 **Genel Destek**\n\nMerhaba! Sorununu veya talebini detaylıca anlat.\nEkibimiz en kısa sürede yardımcı olacak! 🍵',
  anime_oneri:
    '🎌 **Anime Önerisi Formu**\n\nLütfen şu bilgileri paylaş:\n' +
    '• Önerdiğin anime adı\n• Tür (shounen, isekai, romance vb.)\n• Kısa özet\n• Neden öneriyorsun?',
  sikayet:
    '🚨 **Şikayet Bildirimi**\n\nLütfen şu bilgileri yaz:\n' +
    '• Şikayet ettiğin kullanıcı (@ ile)\n• Ne zaman oldu?\n• Ne yaşandı? (Detaylı anlat)\n• Varsa ekran görüntüleri',
  ortak_izleme:
    '🎬 **Ortak İzleme Talebi**\n\nLütfen şu bilgileri yaz:\n' +
    '• İzlemek istediğin anime/film\n• Tercih ettiğin tarih/saat\n• Bölüm aralığı (varsa)\n• Ek notlar',
  yetkili_basvuru:
    '🛡️ **Yetkili Başvurusu**\n\nLütfen şu bilgileri yaz:\n' +
    '• Yaşın\n• Günlük aktiflik saatin\n• Daha önce yetkili oldun mu?\n• Neden yetkili olmak istiyorsun?\n• Sunucuya katkın ne olur?',
  bug_report:
    '🐛 **Hata Bildirimi**\n\nLütfen şu bilgileri yaz:\n' +
    '• Hatanın kısa açıklaması\n• Hatayı nasıl tetikledin?\n• Ekran görüntüsü/video (varsa)\n• Hangi cihaz/tarayıcı kullanıyorsun?',
  oneri:
    '✨ **Sunucu Önerisi**\n\nÖnerini detaylıca anlat!\nNeden bu önerinin sunucuya katkısı olacağını da açıkla.',
};

// Açık ticketleri takip et
const acikTicketler = new Map();

// ─── Embed Yardımcıları ───────────────────────────────────────────────────────
function embed(baslik, aciklama, renk = COLORS.SAKURA) {
  return new EmbedBuilder()
    .setTitle(baslik)
    .setDescription(aciklama)
    .setColor(renk)
    .setFooter({ text: '🍶 IzaKaya • Anime Sohbet Sunucusu' })
    .setTimestamp();
}

function hata(msg) {
  return new EmbedBuilder()
    .setTitle('❌  Hata')
    .setDescription(msg)
    .setColor(COLORS.AKA)
    .setFooter({ text: '🍶 IzaKaya' })
    .setTimestamp();
}

function basari(msg) {
  return new EmbedBuilder()
    .setTitle('✅  Başarılı')
    .setDescription(msg)
    .setColor(COLORS.MIDORI)
    .setFooter({ text: '🍶 IzaKaya' })
    .setTimestamp();
}

// ─── Rastgele Anime Gifs (seviye atlama için) ─────────────────────────────────
const KUTLAMA_MESAJLARI = [
  '**Nakama!** Seviye atladın! 🎉',
  '**Sugoi!** Yeni seviyeye ulaştın! ✨',
  '**Yatta!** Tebrikler senpai! 🌸',
  '**Nani?!** Bu kadar hızlı büyüdün mü? 😲',
  '**Ore wa saijaku!** Güçleniyorsun! 💪',
];

// ══════════════════════════════════════════════════════════════════════════════
//  READY
// ══════════════════════════════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  🍶 IzaKaya Bot Aktif!               ║`);
  console.log(`║  Kullanici: ${client.user.tag.padEnd(24)}║`);
  console.log(`╚══════════════════════════════════════╝\n`);
  client.user.setActivity('🎌 IzaKaya | !yardim', { type: 0 });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MESAJ EVENT
// ══════════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ── Küfür Filtresi ────────────────────────────────────────────────────────
  if (!message.content.startsWith(PREFIX) && kufurVarMi(message.content)) {
    message.delete().catch(() => {});
    const uyariMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`⚠️ ${message.author} saygısız dil kullandın! Mesajın silindi. Lütfen kurallara uy. 🌸`)
          .setColor(COLORS.KITSUNE)
          .setFooter({ text: '🍶 IzaKaya • Küfür Filtresi' }),
      ],
    });
    setTimeout(() => uyariMsg.delete().catch(() => {}), 5000);
    return;
  }

  // ── Pasif XP (cooldown ile) ───────────────────────────────────────────────
  if (!message.content.startsWith(PREFIX)) {
    const now = Date.now();
    const lastMsg = xpCooldown.get(message.author.id) || 0;
    if (now - lastMsg < 20000) return; // 20 saniye cooldown
    xpCooldown.set(message.author.id, now);

    const kazanilanXP = Math.floor(Math.random() * 8) + 3; // 3-10 XP
    const leveled = addXP(message.author.id, kazanilanXP);

    if (leveled) {
      const u = getUser(message.author.id);
      const unvan = getUnvan(u.level);
      const kutlama = KUTLAMA_MESAJLARI[Math.floor(Math.random() * KUTLAMA_MESAJLARI.length)];
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`${unvan.emoji}  Seviye Atladın!`)
            .setDescription(
              `${kutlama}\n\n` +
              `${message.author} artık **Seviye ${u.level}**!\n` +
              `🏷️ Yeni unvan: **${unvan.unvan}**`
            )
            .setColor(COLORS.KITSUNE)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🍶 IzaKaya • Seviye Sistemi' })
            .setTimestamp(),
        ],
      });
    }
    return;
  }

  const args  = message.content.slice(PREFIX.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();

  // ══════════════════════════════════════════════════════════════════════════
  //  GENEL KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ping') {
    const t = Date.now();
    const msg = await message.reply({ embeds: [embed('🏓  Pong!', '⏳ Ölçülüyor...', COLORS.NEON)] });
    return msg.edit({ embeds: [embed('🏓  Pong!', `🏓 **Bot:** \`${Date.now() - t}ms\`\n📡 **API:** \`${client.ws.ping}ms\``, COLORS.NEON)] });
  }

  if (komut === 'sunucu') {
    const g = message.guild;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏯  ${g.name}`)
          .setDescription('*Anime severlerin buluşma noktası!*')
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: '👥 Üye Sayısı',  value: `${g.memberCount}`,                              inline: true },
            { name: '📅 Kuruluş',     value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '👑 Sahip',       value: `<@${g.ownerId}>`,                                inline: true },
            { name: '📢 Kanal',       value: `${g.channels.cache.size}`,                      inline: true },
            { name: '🎭 Rol',         value: `${g.roles.cache.size}`,                         inline: true },
            { name: '😀 Emoji',       value: `${g.emojis.cache.size}`,                        inline: true },
          )
          .setColor(COLORS.SAKURA)
          .setFooter({ text: '🍶 IzaKaya • Anime Sohbet Sunucusu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'avatar') {
    const hedef = message.mentions.users.first() || message.author;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️  ${hedef.username} — Avatar`)
          .setImage(hedef.displayAvatarURL({ dynamic: true, size: 512 }))
          .setColor(COLORS.SAKURA)
          .setFooter({ text: '🍶 IzaKaya' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'kullanici') {
    const hedef = message.mentions.members.first() || message.member;
    const u = getUser(hedef.id);
    const unvan = getUnvan(u.level);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`👤  ${hedef.user.username}`)
          .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏷️ Tag',          value: hedef.user.tag,                                              inline: true },
            { name: '🆔 ID',            value: hedef.id,                                                    inline: true },
            { name: '📅 Katılma',       value: `<t:${Math.floor(hedef.joinedTimestamp / 1000)}:D>`,         inline: true },
            { name: '🎂 Hesap Tarihi',  value: `<t:${Math.floor(hedef.user.createdTimestamp / 1000)}:D>`,   inline: true },
            { name: '🎭 En Yüksek Rol', value: `${hedef.roles.highest}`,                                    inline: true },
            { name: `${unvan.emoji} Unvan`, value: unvan.unvan,                                             inline: true },
          )
          .setColor(COLORS.SAKURA)
          .setFooter({ text: '🍶 IzaKaya • Anime Sohbet Sunucusu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'kurallar') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📜  IzaKaya Sunucu Kuralları')
          .setDescription(
            '> *"Nakama\'ya saygı göster, dostluk kazanırsın."*\n\n' +
            '**1.** 🌸 Herkese saygılı ol, hakaret yasak.\n' +
            '**2.** 🚫 Spam ve flood yasaktır.\n' +
            '**3.** 📢 İzinsiz reklam/davet yasaktır.\n' +
            '**4.** 🔞 NSFW içerik sadece belirlenmiş kanallarda.\n' +
            '**5.** 🛡️ Yetkililerin kararlarına uy.\n' +
            '**6.** 🎭 Troll ve provokasyon yasaktır.\n' +
            '**7.** 🎌 Spoiler içerikleri || arasında yaz!\n' +
            '**8.** 💬 Kanalları amacına uygun kullan.\n' +
            '**9.** 🤝 Kural ihlalleri uyarı/ban ile sonuçlanır.\n\n' +
            '> Keyifli sohbetler dileriz! 🍵'
          )
          .setColor(COLORS.MURASAKI)
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
          .setFooter({ text: '🍶 IzaKaya • Sunucu Kuralları' })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DUYURU
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajları Yönet** yetkisine ihtiyacın var!')] });

    let pingIcerik = '@everyone';
    let metin = '';
    let duyuruRenk = COLORS.KITSUNE;
    let duyuruBaslik = '📣  Duyuru';
    let tip = 'Normal';

    if (args[0] === '-rol') {
      const rolMention = message.mentions.roles.first();
      if (!rolMention) return message.reply({ embeds: [hata('`!duyuru -rol @rol <metin>`')] });
      pingIcerik = `${rolMention}`;
      metin = args.slice(2).join(' ');
      tip = 'Role Özel';
      duyuruBaslik = '📣  Role Özel Duyuru';
    } else if (args[0] === '-sessiz') {
      pingIcerik = null;
      metin = args.slice(1).join(' ');
      tip = 'Sessiz';
      duyuruRenk = COLORS.YUKI;
      duyuruBaslik = '📢  Sessiz Duyuru';
    } else if (args[0] === '-acil') {
      metin = args.slice(1).join(' ');
      tip = 'Acil';
      duyuruRenk = COLORS.AKA;
      duyuruBaslik = '🚨  ACİL DUYURU';
    } else if (args[0] === '-anime') {
      metin = args.slice(1).join(' ');
      tip = 'Anime';
      duyuruRenk = COLORS.SAKURA;
      duyuruBaslik = '🎌  Anime Duyurusu';
    } else {
      metin = args.join(' ');
    }

    if (!metin) return message.reply({ embeds: [hata(
      '**Duyuru Kullanımı:**\n' +
      '`!duyuru <metin>` — Normal @everyone\n' +
      '`!duyuru -rol @rol <metin>` — Role özel\n' +
      '`!duyuru -sessiz <metin>` — Pingsiz\n' +
      '`!duyuru -acil <metin>` — Acil kırmızı\n' +
      '`!duyuru -anime <metin>` — Anime duyurusu 🎌'
    )] });

    message.delete().catch(() => {});

    return message.channel.send({
      content: pingIcerik ?? undefined,
      embeds: [
        new EmbedBuilder()
          .setTitle(duyuruBaslik)
          .setDescription(metin)
          .setColor(duyuruRenk)
          .addFields(
            { name: '👤 Duyuran', value: `${message.author}`,                       inline: true },
            { name: '📋 Tip',     value: tip,                                        inline: true },
            { name: '📅 Tarih',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`,  inline: true },
          )
          .setFooter({ text: `🍶 IzaKaya • ${tip} Duyuru` })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MODERATİF KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('**Üye Yasakla** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!ban @kullanici [sebep]`')] });
    if (!hedef.bannable) return message.reply({ embeds: [hata('Bu kullanıcıyı yasaklayamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.ban({ reason: sebep });
    return message.reply({ embeds: [embed('🔨  Kullanıcı Yasaklandı', `**${hedef.user.tag}** sunucudan yasaklandı.\n**Sebep:** ${sebep}`, COLORS.AKA)] });
  }

  if (komut === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [hata('**Üye At** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!kick @kullanici [sebep]`')] });
    if (!hedef.kickable) return message.reply({ embeds: [hata('Bu kullanıcıyı atamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.kick(sebep);
    return message.reply({ embeds: [embed('👢  Kullanıcı Atıldı', `**${hedef.user.tag}** atıldı.\n**Sebep:** ${sebep}`, COLORS.AKA)] });
  }

  if (komut === 'unban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('**Üye Yasakla** yetkisine ihtiyacın var!')] });
    const userId = args[0];
    if (!userId) return message.reply({ embeds: [hata('`!unban <kullanici ID>`')] });
    await message.guild.members.unban(userId).catch(() => {});
    return message.reply({ embeds: [basari(`**${userId}** yasağı kaldırıldı!`)] });
  }

  if (komut === 'temizle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const miktar = parseInt(args[0]);
    if (isNaN(miktar) || miktar < 1 || miktar > 100)
      return message.reply({ embeds: [hata('1-100 arası sayı gir! `!temizle <sayi>`')] });
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    const bilgi = await message.channel.send({ embeds: [basari(`**${miktar}** mesaj silindi! 🧹`)] });
    setTimeout(() => bilgi.delete().catch(() => {}), 3000);
    return;
  }

  if (komut === 'kilitle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply({ embeds: [embed('🔒  Kanal Kilitlendi', `${message.channel} kilitlendi.`, COLORS.AKA)] });
  }

  if (komut === 'ac') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.reply({ embeds: [embed('🔓  Kanal Açıldı', `${message.channel} açıldı.`, COLORS.MIDORI)] });
  }

  if (komut === 'sustur') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('**Üyeleri Sustur** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!sustur @kullanici <dakika>`')] });
    const dakika = parseInt(args[1]) || 10;
    await hedef.timeout(dakika * 60 * 1000, 'Susturuldu');
    return message.reply({ embeds: [embed('🔇  Susturuldu', `**${hedef.user.tag}** **${dakika} dakika** susturuldu.`, COLORS.AKA)] });
  }

  if (komut === 'uyar') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('**Üyeleri Sustur** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!uyar @kullanici <sebep>`')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    hedef.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('⚠️  Uyarı Aldın')
          .setDescription(`**${message.guild.name}** sunucusunda uyarıldın.`)
          .addFields({ name: '📝 Sebep', value: sebep })
          .setColor(COLORS.KITSUNE)
          .setTimestamp(),
      ],
    }).catch(() => {});
    return message.reply({ embeds: [embed('⚠️  Uyarı Verildi', `${hedef} uyarıldı.\n**Sebep:** ${sebep}`, COLORS.KITSUNE)] });
  }

  if (komut === 'rol-ver') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('**Rolleri Yönet** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-ver @kullanici @rol`')] });
    await hedef.roles.add(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullanıcısına **${rol.name}** rolü verildi!`)] });
  }

  if (komut === 'rol-al') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('**Rolleri Yönet** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-al @kullanici @rol`')] });
    await hedef.roles.remove(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullanıcısından **${rol.name}** rolü alındı!`)] });
  }

  if (komut === 'anket') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!anket <soru>`')] });
    message.delete().catch(() => {});
    const anketMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('📊  Anket')
          .setDescription(`**${soru}**`)
          .addFields({ name: 'Oy Kullan', value: '✅ Evet   |   ❌ Hayır' })
          .setColor(COLORS.MURASAKI)
          .setFooter({ text: `📊 Anket başlatan: ${message.author.tag}` })
          .setTimestamp(),
      ],
    });
    await anketMsg.react('✅');
    await anketMsg.react('❌');
    return;
  }

  if (komut === 'embed-gonder') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const metin = args.join(' ');
    if (!metin) return message.reply({ embeds: [hata('`!embed-gonder <metin>`')] });
    message.delete().catch(() => {});
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(metin)
          .setColor(COLORS.SAKURA)
          .setFooter({ text: `🍶 IzaKaya • ${message.author.tag}` })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  XP / PROFİL KOMUTLARI
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'profil') {
    const hedef  = message.mentions.users.first() || message.author;
    const u      = getUser(hedef.id);
    const needed = u.level * 120;
    const dolu   = Math.floor((u.xp / needed) * 12);
    const bar    = '▰'.repeat(dolu) + '▱'.repeat(12 - dolu);
    const unvan  = getUnvan(u.level);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${unvan.emoji}  ${hedef.username} — Profil`)
          .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏅 Seviye',          value: `**${u.level}**`,          inline: true },
            { name: `${unvan.emoji} Unvan`, value: unvan.unvan,              inline: true },
            { name: '💬 Mesaj Sayısı',    value: `${u.mesajSayisi || 0}`,   inline: true },
            { name: '✨ XP Barı',         value: `\`[${bar}]\` ${u.xp}/${needed}`, inline: false },
          )
          .setColor(COLORS.SAKURA)
          .setFooter({ text: '🍶 IzaKaya • Profil Sistemi' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'siralama' || komut === 'leaderboard') {
    const sorted = [...xpData.entries()]
      .sort((a, b) => (b[1].level * 10000 + b[1].xp) - (a[1].level * 10000 + a[1].xp))
      .slice(0, 10);
    if (!sorted.length) return message.reply({ embeds: [hata('Henüz XP kazanmış kimse yok!')] });
    const medals = ['🥇', '🥈', '🥉'];
    const desc   = sorted
      .map(([id, u], i) => {
        const unvan = getUnvan(u.level);
        return `${medals[i] ?? `**${i + 1}.**`} <@${id}> — ${unvan.emoji} Seviye **${u.level}** (\`${u.xp} XP\`)`;
      })
      .join('\n');
    return message.reply({ embeds: [embed('🏆  XP Sıralaması', desc, COLORS.KITSUNE)] });
  }

  if (komut === 'xpver') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpver @kullanici <miktar>`')] });
    addXP(hedef.id, miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'e **${miktar} XP** verildi!`)] });
  }

  if (komut === 'xpcikar') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpcikar @kullanici <miktar>`')] });
    const u = getUser(hedef.id);
    u.xp = Math.max(0, u.xp - miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'den **${miktar} XP** çıkarıldı!`)] });
  }

  if (komut === 'xpsifirla') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply({ embeds: [hata('`!xpsifirla @kullanici`')] });
    xpData.set(hedef.id, { xp: 0, level: 1, mesajSayisi: 0 });
    return message.reply({ embeds: [basari(`**${hedef.username}**'in XP'si sıfırlandı!`)] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ANİME KOMUTLARI (Özel)
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'waifu') {
    const waifular = [
      'Zero Two (Darling in the FranXX) 💖',
      'Rem (Re:Zero) 💙',
      'Asuna (Sword Art Online) ⚔️',
      'Nezuko (Demon Slayer) 🌸',
      'Mikasa (Attack on Titan) 💪',
      'Hinata (Naruto) 🌺',
      'Erza (Fairy Tail) 🔴',
      'Violet (Violet Evergarden) 💜',
      'Miku (Quintessential Quintuplets) 🎵',
      'Yor (Spy x Family) 🌹',
    ];
    const secilen = waifular[Math.floor(Math.random() * waifular.length)];
    return message.reply({ embeds: [embed('💝  Günün Waifusu', `${message.author.username}'nin günün waifusu:\n\n**${secilen}**`, COLORS.SAKURA)] });
  }

  if (komut === 'husbando') {
    const husbanolar = [
      'Levi Ackerman (Attack on Titan) ⚔️',
      'Itachi Uchiha (Naruto) 👁️',
      'Gojo Satoru (Jujutsu Kaisen) 🌟',
      'Roronoa Zoro (One Piece) 🗡️',
      'Edward Elric (Fullmetal Alchemist) ✨',
      'Killua (Hunter x Hunter) ⚡',
      'Todoroki (My Hero Academia) 🔥❄️',
      'Yato (Noragami) 💙',
      'Kirito (Sword Art Online) ⚫',
      'Spike Spiegel (Cowboy Bebop) 🚀',
    ];
    const secilen = husbanolar[Math.floor(Math.random() * husbanolar.length)];
    return message.reply({ embeds: [embed('💙  Günün Husbandosu', `${message.author.username}'nin günün husbandosu:\n\n**${secilen}**`, COLORS.INDIGO)] });
  }

  if (komut === 'anime-bilgi') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎌  Anime Komutları')
          .setDescription('IzaKaya\'nın özel anime komutları!')
          .addFields(
            { name: '💝 Waifu/Husbando', value: '`!waifu` — Günün waifusunu öğren\n`!husbando` — Günün husbandosunu öğren' },
            { name: '🎲 Eğlence',        value: '`!zar` `!yazi-tura` `!8top` `!saat`' },
            { name: '📊 Anket',          value: '`!anket <soru>` — Anket oluştur' },
          )
          .setColor(COLORS.SAKURA)
          .setFooter({ text: '🍶 IzaKaya' })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TİCKET SİSTEMİ KURULUM
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_kategori_sec')
      .setPlaceholder('🎌 Ticket kategorini seç...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Genel Yardım').setDescription('Genel sorular ve yardım talebi').setValue('genel_sohbet').setEmoji('💬'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Anime Önerisi').setDescription('Anime önerin var mı? Paylaş!').setValue('anime_oneri').setEmoji('🎌'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Ortak İzleme').setDescription('Birlikte anime izleyelim!').setValue('ortak_izleme').setEmoji('🎬'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Yetkili Başvurusu').setDescription('Sunucuda yetkili olmak istiyorum').setValue('yetkili_basvuru').setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Şikayet').setDescription('Kullanıcı veya durum şikayeti').setValue('sikayet').setEmoji('🚨'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Hata Bildirimi').setDescription('Bot veya sunucu hatası').setValue('bug_report').setEmoji('🐛'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sunucu Önerisi').setDescription('Sunucuyu geliştirelim!').setValue('oneri').setEmoji('✨'),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫  IzaKaya Destek Merkezi')
          .setDescription(
            '**Merhaba, Nakama!** 🌸\n\n' +
            'Aşağıdaki menüden kategoriyi seçerek özel ticket açabilirsin.\n' +
            'Ekibimiz en kısa sürede seninle ilgilenecek!\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            '💬 **Genel Yardım** — Sorular & talepler\n' +
            '🎌 **Anime Önerisi** — Anime önerin mi var?\n' +
            '🎬 **Ortak İzleme** — Birlikte anime izleyelim\n' +
            '🛡️ **Yetkili Başvurusu** — Ekibe katıl\n' +
            '🚨 **Şikayet** — Kullanıcı şikayeti\n' +
            '🐛 **Hata Bildirimi** — Teknik sorunlar\n' +
            '✨ **Sunucu Önerisi** — Fikirlerini paylaş\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            '*Her ticket gizli ve sadece senin için açılır!* 🔒'
          )
          .setColor(COLORS.SAKURA)
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
          .setFooter({ text: '🍶 IzaKaya • Destek Sistemi' })
          .setTimestamp(),
      ],
      components: [row],
    });

    return message.reply({ embeds: [basari('Ticket sistemi kuruldu! 🎉')] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EĞLENCELİ KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'zar') {
    const yuz   = parseInt(args[0]) || 6;
    const sonuc = Math.floor(Math.random() * yuz) + 1;
    return message.reply({ embeds: [embed(`🎲  Zar (1-${yuz})`, `**${message.author.username}** zar attı: **${sonuc}**!`, COLORS.NEON)] });
  }

  if (komut === 'yazi-tura') {
    const sonuc = Math.random() < 0.5 ? '🪙 Yazı' : '🪙 Tura';
    return message.reply({ embeds: [embed('🪙  Yazı mı Tura mı?', `**${sonuc}!**`, COLORS.KITSUNE)] });
  }

  if (komut === '8top') {
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!8top <soru>`')] });
    const cevaplar = [
      'Kesinlikle evet! ✅', 'Evet! ✅', 'Bence evet! 🌸',
      'Şüpheli... 🌀', 'Belki! 🌙', 'Emin değilim 😶',
      'Hayır! ❌', 'Kesinlikle hayır! ❌', 'İmkansız! 🙅',
    ];
    const cevap = cevaplar[Math.floor(Math.random() * cevaplar.length)];
    return message.reply({ embeds: [embed('🎱  Sihirli 8 Top', `**Soru:** ${soru}\n\n**Cevap:** ${cevap}`, COLORS.MURASAKI)] });
  }

  if (komut === 'saat') {
    return message.reply({ embeds: [embed('🕐  Şu An', `**Tarih/Saat:** \`${new Date().toLocaleString('tr-TR')}\``, COLORS.YUKI)] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIM
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'yardim' || komut === 'help' || komut === 'yardım') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🍶  IzaKaya Komut Listesi')
          .setDescription('*Merhaba Nakama! İşte kullanabileceğin tüm komutlar:*')
          .setColor(COLORS.SAKURA)
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
          .addFields(
            {
              name: '🛡️ Moderasyon',
              value: '`!ban` `!kick` `!unban` `!temizle` `!kilitle` `!ac` `!sustur` `!uyar` `!rol-ver` `!rol-al`',
            },
            {
              name: '📣 Duyuru',
              value:
                '`!duyuru <metin>` — @everyone\n' +
                '`!duyuru -rol @rol <metin>` — Role özel\n' +
                '`!duyuru -sessiz <metin>` — Pingsiz\n' +
                '`!duyuru -acil <metin>` — Acil kırmızı\n' +
                '`!duyuru -anime <metin>` — Anime duyurusu 🎌',
            },
            {
              name: '🎫 Ticket Sistemi',
              value:
                '`!ticket-kur` — Paneli kur (Admin)\n' +
                'Kategoriler: Genel • Anime Önerisi • Ortak İzleme • Yetkili • Şikayet • Bug • Öneri',
            },
            {
              name: '✨ XP & Profil',
              value: '`!profil [@kullanici]` `!siralama` `!xpver` `!xpcikar` `!xpsifirla`',
            },
            {
              name: '🎌 Anime Komutları',
              value: '`!waifu` `!husbando` `!anime-bilgi`',
            },
            {
              name: '🌍 Genel',
              value: '`!ping` `!sunucu` `!avatar` `!kullanici` `!kurallar` `!anket` `!embed-gonder` `!saat`',
            },
            {
              name: '🎲 Eğlence',
              value: '`!zar [yüz]` `!yazi-tura` `!8top <soru>`',
            },
          )
          .setFooter({ text: '🍶 IzaKaya • Prefix: ! • Iyi sohbetler!' })
          .setTimestamp(),
      ],
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  INTERACTION EVENT — Dropdown + Butonlar
// ══════════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {

  // ── Dropdown Menü: Kategori Seç ───────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_kategori_sec') {
    await interaction.deferReply({ ephemeral: true });

    const secilen  = interaction.values[0];
    const kategori = TICKET_KATEGORILER[secilen];
    const kanalAdi = `🎫-${secilen.replace(/_/g, '-')}-${interaction.user.id}`;

    // Zaten açık ticket var mı?
    const mevcutKanal = interaction.guild.channels.cache.find(c => c.name === kanalAdi);
    if (mevcutKanal) {
      return interaction.editReply({ content: `❌ Bu kategoride zaten açık bir ticketin var: ${mevcutKanal}` });
    }

    // Admin rolü bul
    const adminRol = interaction.guild.roles.cache.find(
      r => r.permissions.has(PermissionFlagsBits.Administrator) && !r.managed
    );

    const overwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];
    if (adminRol) {
      overwrites.push({
        id: adminRol.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    const kanal = await interaction.guild.channels.create({
      name: kanalAdi,
      type: ChannelType.GuildText,
      topic: `${kategori.label} | ${interaction.user.tag}`,
      permissionOverwrites: overwrites,
    });

    acikTicketler.set(kanal.id, { userId: interaction.user.id, kategori: secilen });

    // Ticket içi butonlar
    const butonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_kapat')
        .setLabel('🔒 Ticketi Kapat')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_sahiplen')
        .setLabel('✋ Sahiplen')
        .setStyle(ButtonStyle.Secondary),
    );

    await kanal.send({
      content: `${interaction.user}${adminRol ? ` | ${adminRol}` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setTitle(`${kategori.label} — Ticket Açıldı`)
          .setDescription(TICKET_ACIKLAMALAR[secilen])
          .addFields(
            { name: '👤 Kullanıcı', value: `${interaction.user}`,                       inline: true },
            { name: '🏷️ Tag',       value: interaction.user.tag,                         inline: true },
            { name: '🆔 ID',        value: interaction.user.id,                          inline: true },
            { name: '📅 Açılış',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,    inline: false },
          )
          .setColor(kategori.renk)
          .setFooter({ text: '🍶 IzaKaya • Ticket Sistemi | Sahiplenmek için butona bas' })
          .setTimestamp(),
      ],
      components: [butonRow],
    });

    return interaction.editReply({
      content: `✅ Ticketin açıldı: ${kanal}\nKategori: **${kategori.label}**`,
    });
  }

  if (!interaction.isButton()) return;

  // ── Ticket Kapat ──────────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_kapat') {
    const ticketBilgi = acikTicketler.get(interaction.channel.id);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const isSahip = ticketBilgi && interaction.user.id === ticketBilgi.userId;

    if (!isAdmin && !isSahip) {
      return interaction.reply({ content: '❌ Bu ticketi kapatma yetkin yok!', ephemeral: true });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🔒 Ticket **5 saniye** içinde kapatılıyor...\nKapatan: ${interaction.user}`)
          .setColor(COLORS.AKA),
      ],
    });

    acikTicketler.delete(interaction.channel.id);
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }

  // ── Ticket Sahiplen ───────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_sahiplen') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
    }
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`✋ Bu ticket **${interaction.user}** tarafından sahiplenildi! 🌸`)
          .setColor(COLORS.MIDORI),
      ],
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  YENİ ÜYE KARŞILAMA (Sabit Kanal ID)
// ══════════════════════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return; // botları karşılama (ayrı event'te yönetiliyor)

  const karsilamaKanal = member.guild.channels.cache.get(HOSGELDIN_KANAL);
  if (!karsilamaKanal) return;

  const karsilamaMesajlari = [
    `*"Her büyük yolculuk tek bir adımla başlar..."* 🌸`,
    `*"Nakama olmak, birlikte güçlenmektir."* ⚔️`,
    `*"IzaKaya'nın kapıları sana sonsuza kadar açık!"* 🍶`,
    `*"Yeni bir anime severi daha aramıza katıldı!"* 🎌`,
  ];
  const alinti = karsilamaMesajlari[Math.floor(Math.random() * karsilamaMesajlari.length)];

  karsilamaKanal.send({
    content: `${member}`,
    embeds: [
      new EmbedBuilder()
        .setTitle('🌸  Yeni Nakama Geldi!')
        .setDescription(
          `**${member.user.username}** IzaKaya'ya hoş geldin! 🍶\n\n` +
          `> ${alinti}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📜 **Kuralları oku:** \`!kurallar\` yazabilirsin\n` +
          `✨ **XP kazan:** Mesaj attıkça seviye atlarsın!\n` +
          `🎫 **Yardım lazımsa:** Ticket açabilirsin\n` +
          `🎌 **Anime sohbeti:** Kanalları keşfet!\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`
        )
        .addFields(
          { name: '👤 Kullanıcı',  value: `${member}`,                                                       inline: true },
          { name: '📅 Hesap',      value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,        inline: true },
          { name: '👥 Üye No',     value: `**${member.guild.memberCount}.** üye`,                            inline: true },
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('https://i.imgur.com/your-banner.gif') // İstersen buraya sunucu banner gif URL'si koy
        .setColor(COLORS.SAKURA)
        .setFooter({ text: '🍶 IzaKaya • Anime Sohbet Sunucusu | Hoş geldin!' })
        .setTimestamp(),
    ],
  }).catch(() => {});
});

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════════════════════
client.login(process.env.TOKEN || process.env.BOT_TOKEN);

// ══════════════════════════════════════════════════════════════════════════════
//  ANTİ-RAİD: TOPLU BAN TESPİTİ
// ══════════════════════════════════════════════════════════════════════════════
client.on('guildBanAdd', async (ban) => {
  // Audit log'dan banlayan kişiyi bul
  await new Promise(r => setTimeout(r, 800));
  const logs = await ban.guild.fetchAuditLogs({ type: 22, limit: 5 }).catch(() => null);
  if (!logs) return;
  const entry = logs.entries.first();
  if (!entry || !entry.executor) return;
  const executorId = entry.executor.id;
  if (executorId === client.user.id) return; // botun kendi eylemi

  const now = Date.now();
  const kayit = raidTakip.get(executorId) || { banCount: 0, banTime: now, delCount: 0, delTime: now };

  // Pencere sıfırla
  if (now - kayit.banTime > RAID_WINDOW_MS) { kayit.banCount = 0; kayit.banTime = now; }
  kayit.banCount++;
  raidTakip.set(executorId, kayit);

  if (kayit.banCount >= RAID_BAN_LIMIT) {
    kayit.banCount = 0;
    await raidMudahale(ban.guild, executorId, `⚡ **${RAID_BAN_LIMIT} saniyede ${RAID_BAN_LIMIT}+ ban** attı!`);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ANTİ-RAİD: TOPLU KANAL SİLME TESPİTİ
// ══════════════════════════════════════════════════════════════════════════════
client.on('channelDelete', async (channel) => {
  const guild = channel.guild;
  if (!guild) return;
  await new Promise(r => setTimeout(r, 800));
  const logs = await guild.fetchAuditLogs({ type: 12, limit: 5 }).catch(() => null);
  if (!logs) return;
  const entry = logs.entries.first();
  if (!entry || !entry.executor) return;
  const executorId = entry.executor.id;
  if (executorId === client.user.id) return;

  const now = Date.now();
  const kayit = raidTakip.get(executorId) || { banCount: 0, banTime: now, delCount: 0, delTime: now };

  if (now - kayit.delTime > RAID_WINDOW_MS) { kayit.delCount = 0; kayit.delTime = now; }
  kayit.delCount++;
  raidTakip.set(executorId, kayit);

  if (kayit.delCount >= RAID_DEL_LIMIT) {
    kayit.delCount = 0;
    await raidMudahale(guild, executorId, `🗑️ **${RAID_DEL_LIMIT} saniyede ${RAID_DEL_LIMIT}+ kanal sildi!**`);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ANTİ-RAİD: BOT EKLEME TESPİTİ (düşük yetki)
// ══════════════════════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  if (!member.user.bot) return; // sadece botlar
  await new Promise(r => setTimeout(r, 800));
  const logs = await member.guild.fetchAuditLogs({ type: 28, limit: 5 }).catch(() => null);
  const entry = logs?.entries?.first();
  const ekleyen = entry?.executor;

  // Sahibi veya admin değilse uyar
  if (ekleyen && ekleyen.id !== member.guild.ownerId) {
    const ekleyenMember = await member.guild.members.fetch(ekleyen.id).catch(() => null);
    const isAdmin = ekleyenMember?.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      // Owner'a DM
      const owner = await client.users.fetch(OWNER_ID).catch(() => null);
      if (owner) {
        owner.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🤖  Yetkisiz Bot Ekleme Girişimi!')
              .setDescription(
                `**${ekleyen.tag}** (ID: \`${ekleyen.id}\`) sunucuna **${member.user.tag}** botunu ekledi!\n\n` +
                `Bu kişi **admin değil**. Dikkatli ol! 🚨`
              )
              .addFields(
                { name: '🤖 Eklenen Bot',  value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
                { name: '👤 Ekleyen Kişi', value: `${ekleyen.tag} (\`${ekleyen.id}\`)`,        inline: true },
                { name: '🏰 Sunucu',       value: member.guild.name,                             inline: true },
              )
              .setColor(COLORS.AKA)
              .setFooter({ text: '🍶 IzaKaya • Güvenlik Sistemi' })
              .setTimestamp(),
          ],
        }).catch(() => {});
      }
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  RAİD MÜDAHALESİ — Yetkileri al + owner'a DM
// ══════════════════════════════════════════════════════════════════════════════
async function raidMudahale(guild, executorId, sebep) {
  try {
    const hedef = await guild.members.fetch(executorId).catch(() => null);
    if (!hedef) return;

    // Tüm rolleri al (owner veya bot değilse)
    if (hedef.id !== guild.ownerId && hedef.manageable) {
      const kaldirilacakRoller = hedef.roles.cache.filter(r => r.id !== guild.id);
      await hedef.roles.remove(kaldirilacakRoller, 'Anti-Raid: Otomatik yetki kaldırma').catch(() => {});
      await hedef.timeout(60 * 60 * 1000, 'Anti-Raid: 1 saat timeout').catch(() => {}); // 1 saat sustur
    }

    // Owner'a DM
    const owner = await client.users.fetch(OWNER_ID).catch(() => null);
    if (owner) {
      owner.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🚨  RAİD TESPİT EDİLDİ!')
            .setDescription(
              `**${hedef.user.tag}** raid davranışı tespit edildi!\n\n` +
              `**Sebep:** ${sebep}\n\n` +
              `✅ Tüm rolleri alındı ve 1 saat susturuldu!`
            )
            .addFields(
              { name: '👤 Saldırgan',  value: `${hedef.user.tag} (\`${hedef.id}\`)`, inline: true },
              { name: '🏰 Sunucu',     value: guild.name,                             inline: true },
            )
            .setColor(COLORS.AKA)
            .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🍶 IzaKaya • Anti-Raid Sistemi' })
            .setTimestamp(),
        ],
      }).catch(() => {});
    }

    // Sunucuda da duyur (varsa log kanalı)
    const logKanal = guild.channels.cache.find(c =>
      c.name.includes('log') || c.name.includes('güvenlik') || c.name.includes('mod')
    );
    if (logKanal) {
      logKanal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🚨  Anti-Raid Devreye Girdi!')
            .setDescription(`**${hedef.user.tag}** kullanıcısının yetkileri otomatik olarak alındı.\n**Sebep:** ${sebep}`)
            .setColor(COLORS.AKA)
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Raid müdahale hatası:', e);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
client.login(process.env.TOKEN || process.env.BOT_TOKEN);
