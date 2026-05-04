// ╔══════════════════════════════════════════════════════════════╗
// ║           ⚔️  KLAN DISCORD BOTU  ⚔️                          ║
// ║     Moderasyon | XP | Ticket | Raid Koruması | Klan Yönetimi ║
// ╚══════════════════════════════════════════════════════════════╝

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Collection,
  AuditLogEvent,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const ms = require("ms");

// ───────────────────────────────────────────────
// ⚙️  AYARLAR — Buraya kendi bilgilerini yaz
// ───────────────────────────────────────────────
const CONFIG = {
  PREFIX: "!",
  TOKEN: process.env.TOKEN || "BURAYA_TOKEN_YAZ",

  // Renkler (embed renkleri)
  COLORS: {
    PRIMARY: 0x2ecc71,    // Yeşil — klan rengi
    ERROR: 0xe74c3c,      // Kırmızı
    WARN: 0xf39c12,       // Sarı
    INFO: 0x3498db,       // Mavi
    GOLD: 0xf1c40f,       // Altın — ödüller
    DARK: 0x2c3e50,       // Koyu — genel
  },

  // XP Ayarları
  XP: {
    PER_MESSAGE: 10,        // Her mesaja verilen XP
    COOLDOWN_MS: 60_000,    // 1 dakika bekleme (spam önleme)
    LEVEL_MULTIPLIER: 100,  // level * 100 = gereken XP
  },

  // Raid Koruması
  RAID: {
    JOIN_THRESHOLD: 5,      // X saniyede kaç kişi gelirse alarm
    JOIN_WINDOW_MS: 10_000, // Zaman penceresi (ms)
    MIN_ACCOUNT_AGE_DAYS: 7, // Hesap yaş kontrolü (gün)
  },

  // Ticket Kategorisi ID (kendi sunucundaki kategori ID'sini yaz)
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID || null,

  // Log Kanalı ID
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || null,
};

// ───────────────────────────────────────────────
// 🗄️  VERİTABANI
// ───────────────────────────────────────────────
const db = new QuickDB();

// ───────────────────────────────────────────────
// 🤖  CLIENT
// ───────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// XP cooldown map
const xpCooldowns = new Collection();
// Raid join tracker
const recentJoins = [];

// ╔══════════════════════════════════════════╗
// ║           📦 YARDIMCI FONKSİYONLAR       ║
// ╚══════════════════════════════════════════╝

function embed(title, description, color = CONFIG.COLORS.PRIMARY) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: "⚔️ Klan Bot" });
}

async function log(guild, content) {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  const ch = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
  if (ch) ch.send({ embeds: [content] }).catch(() => {});
}

function levelFromXP(xp) {
  return Math.floor(xp / CONFIG.XP.LEVEL_MULTIPLIER);
}

function xpForNextLevel(level) {
  return (level + 1) * CONFIG.XP.LEVEL_MULTIPLIER;
}

// ╔══════════════════════════════════════════╗
// ║            🚀 READY EVENT                ║
// ╚══════════════════════════════════════════╝

client.once("ready", () => {
  console.log(`
╔══════════════════════════════════════╗
║  ✅  Bot Hazır: ${client.user.tag.padEnd(20)}║
║  🌐  Sunucu: ${client.guilds.cache.size} sunucu              ║
╚══════════════════════════════════════╝
  `);
  client.user.setActivity("!yardım | ⚔️ Klan", { type: 3 });
});

// ╔══════════════════════════════════════════╗
// ║         🛡️  RAID KORUMASI                ║
// ╚══════════════════════════════════════════╝

client.on("guildMemberAdd", async (member) => {
  const now = Date.now();

  // Hesap yaşı kontrolü
  const accountAgeDays = (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < CONFIG.RAID.MIN_ACCOUNT_AGE_DAYS) {
    try {
      await member.kick(`🛡️ Raid Koruması: Hesap çok yeni (${Math.floor(accountAgeDays)} gün)`);
      await log(
        member.guild,
        embed(
          "🛡️ Raid Koruması — Yeni Hesap Atıldı",
          `**Kullanıcı:** ${member.user.tag}\n**Hesap Yaşı:** ${Math.floor(accountAgeDays)} gün\n**Sebep:** Minimum hesap yaşı sağlanamadı`,
          CONFIG.COLORS.WARN
        )
      );
    } catch {}
    return;
  }

  // Hızlı join tespiti
  recentJoins.push(now);
  const window = recentJoins.filter((t) => now - t < CONFIG.RAID.JOIN_WINDOW_MS);
  if (window.length >= CONFIG.RAID.JOIN_THRESHOLD) {
    await log(
      member.guild,
      embed(
        "🚨 RAID ALARMI!",
        `Son **${CONFIG.RAID.JOIN_WINDOW_MS / 1000} saniye** içinde **${window.length} kişi** katıldı!\nSunucuya raid yapılıyor olabilir! Lütfen kontrol et.`,
        CONFIG.COLORS.ERROR
      )
    );
    // Sunucuyu kilitle (verification level yükselt)
    try {
      await member.guild.setVerificationLevel(4, "Raid tespit edildi");
    } catch {}
  }
  // Eski kayıtları temizle
  while (recentJoins.length && now - recentJoins[0] > CONFIG.RAID.JOIN_WINDOW_MS) {
    recentJoins.shift();
  }
});

// ╔══════════════════════════════════════════╗
// ║       💬 MESAJ EVENT — XP + KOMUTLAR     ║
// ╚══════════════════════════════════════════╝

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // ─── XP SİSTEMİ ───
  const uid = `${message.guild.id}_${message.author.id}`;
  const lastXP = xpCooldowns.get(uid) || 0;
  if (Date.now() - lastXP > CONFIG.XP.COOLDOWN_MS) {
    xpCooldowns.set(uid, Date.now());
    const currentXP = (await db.get(`xp_${uid}`)) || 0;
    const newXP = currentXP + CONFIG.XP.PER_MESSAGE;
    await db.set(`xp_${uid}`, newXP);

    const oldLevel = levelFromXP(currentXP);
    const newLevel = levelFromXP(newXP);
    if (newLevel > oldLevel) {
      message.channel.send({
        embeds: [
          embed(
            "🎉 SEVİYE ATLADIN!",
            `Tebrikler ${message.author}! **${newLevel}. seviyeye** ulaştın! 🏆\nSonraki seviye için: **${xpForNextLevel(newLevel) - newXP} XP** daha lazım.`,
            CONFIG.COLORS.GOLD
          ),
        ],
      });
    }
  }

  // ─── PREFIX KONTROLÜ ───
  if (!message.content.startsWith(CONFIG.PREFIX)) return;

  const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ═══════════════════════════════════════════
  //  📖  !yardım
  // ═══════════════════════════════════════════
  if (command === "yardım" || command === "yardim" || command === "help") {
    const helpEmbed = new EmbedBuilder()
      .setTitle("⚔️ Klan Bot — Komut Listesi")
      .setColor(CONFIG.COLORS.PRIMARY)
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: "⚔️ Klan Bot • Prefix: !" })
      .addFields(
        {
          name: "🛡️ Moderasyon",
          value: [
            "`!ban <@kullanıcı> [sebep]` — Kullanıcıyı banlar",
            "`!kick <@kullanıcı> [sebep]` — Kullanıcıyı atar",
            "`!mute <@kullanıcı> <süre> [sebep]` — Susturur (ör: 10m, 1h)",
            "`!unmute <@kullanıcı>` — Susturmayı kaldırır",
            "`!temizle <miktar>` — Mesajları temizler",
            "`!uyar <@kullanıcı> [sebep]` — Uyarı verir",
            "`!uyarlar <@kullanıcı>` — Uyarıları gösterir",
          ].join("\n"),
          inline: false,
        },
        {
          name: "⚔️ Klan Yönetimi",
          value: [
            "`!kayıt <@kullanıcı> <isim>` — Klan üyesini kayıt eder",
            "`!üye <@kullanıcı>` — Üye bilgilerini gösterir",
            "`!üyeler` — Tüm klan üyelerini listeler",
            "`!çıkar <@kullanıcı>` — Üyeyi klandan çıkarır",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🏆 XP & Sıralama",
          value: [
            "`!profil [@kullanıcı]` — XP ve seviyeni gösterir",
            "`!sıralama` — Sunucu XP sıralaması",
            "`!xpver <@kullanıcı> <miktar>` — (Yönetici) XP verir",
            "`!xpset <@kullanıcı> <miktar>` — (Yönetici) XP ayarlar",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🎫 Ticket Sistemi",
          value: [
            "`!ticket` — Yeni destek bileti açar",
            "`!kapat` — Ticketi kapatır (ticket kanalında)",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🛡️ Koruma",
          value: [
            "`!raidmod <aç/kapat>` — Raid korumasını ayarlar",
            "`!kilitle` — Kanalı kilitler",
            "`!aç` — Kanal kilidini açar",
          ].join("\n"),
          inline: false,
        },
        {
          name: "ℹ️ Genel",
          value: [
            "`!ping` — Bot gecikmesini gösterir",
            "`!sunucu` — Sunucu bilgileri",
            "`!kullanıcı [@kullanıcı]` — Kullanıcı bilgileri",
            "`!avatar [@kullanıcı]` — Avatar gösterir",
          ].join("\n"),
          inline: false,
        }
      );
    return message.channel.send({ embeds: [helpEmbed] });
  }

  // ═══════════════════════════════════════════
  //  🛡️  MODERASYON KOMUTLARI
  // ═══════════════════════════════════════════

  // !ban
  if (command === "ban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Ban atma yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    try {
      await target.ban({ reason });
      const e = embed("🔨 Kullanıcı Banlandı", `**Kullanıcı:** ${target.user.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${message.author.tag}`, CONFIG.COLORS.ERROR);
      message.channel.send({ embeds: [e] });
      await log(message.guild, e);
    } catch (err) {
      message.reply({ embeds: [embed("❌ Hata", `Ban atılamadı: ${err.message}`, CONFIG.COLORS.ERROR)] });
    }
    return;
  }

  // !kick
  if (command === "kick") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Kick atma yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    try {
      await target.kick(reason);
      const e = embed("👢 Kullanıcı Atıldı", `**Kullanıcı:** ${target.user.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${message.author.tag}`, CONFIG.COLORS.WARN);
      message.channel.send({ embeds: [e] });
      await log(message.guild, e);
    } catch (err) {
      message.reply({ embeds: [embed("❌ Hata", `Kick atılamadı: ${err.message}`, CONFIG.COLORS.ERROR)] });
    }
    return;
  }

  // !mute
  if (command === "mute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Mute yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    const duration = args[1] ? ms(args[1]) : null;
    if (!duration) return message.reply({ embeds: [embed("❌ Hata", "Süre gir. Örnek: `!mute @kullanıcı 10m`", CONFIG.COLORS.ERROR)] });

    const reason = args.slice(2).join(" ") || "Sebep belirtilmedi";
    try {
      await target.timeout(duration, reason);
      const e = embed("🔇 Kullanıcı Susturuldu", `**Kullanıcı:** ${target.user.tag}\n**Süre:** ${args[1]}\n**Sebep:** ${reason}\n**Yetkili:** ${message.author.tag}`, CONFIG.COLORS.WARN);
      message.channel.send({ embeds: [e] });
      await log(message.guild, e);
    } catch (err) {
      message.reply({ embeds: [embed("❌ Hata", `Mute yapılamadı: ${err.message}`, CONFIG.COLORS.ERROR)] });
    }
    return;
  }

  // !unmute
  if (command === "unmute") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Unmute yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    try {
      await target.timeout(null);
      message.channel.send({ embeds: [embed("🔊 Susturma Kaldırıldı", `${target.user.tag} artık konuşabilir.`, CONFIG.COLORS.PRIMARY)] });
    } catch (err) {
      message.reply({ embeds: [embed("❌ Hata", err.message, CONFIG.COLORS.ERROR)] });
    }
    return;
  }

  // !temizle
  if (command === "temizle" || command === "clear") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Mesaj silme yetkin yok.", CONFIG.COLORS.ERROR)] });

    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100)
      return message.reply({ embeds: [embed("❌ Hata", "1 ile 100 arası bir sayı gir.", CONFIG.COLORS.ERROR)] });

    try {
      const deleted = await message.channel.bulkDelete(amount + 1, true);
      const reply = await message.channel.send({ embeds: [embed("🗑️ Mesajlar Silindi", `**${deleted.size - 1}** mesaj silindi.`, CONFIG.COLORS.INFO)] });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    } catch (err) {
      message.reply({ embeds: [embed("❌ Hata", err.message, CONFIG.COLORS.ERROR)] });
    }
    return;
  }

  // !uyar
  if (command === "uyar" || command === "warn") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Uyarı yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    const key = `warns_${message.guild.id}_${target.id}`;
    const warns = (await db.get(key)) || [];
    warns.push({ reason, by: message.author.tag, date: new Date().toLocaleDateString("tr-TR") });
    await db.set(key, warns);

    const e = embed("⚠️ Kullanıcı Uyarıldı", `**Kullanıcı:** ${target.tag}\n**Sebep:** ${reason}\n**Toplam Uyarı:** ${warns.length}\n**Yetkili:** ${message.author.tag}`, CONFIG.COLORS.WARN);
    message.channel.send({ embeds: [e] });
    await log(message.guild, e);
    return;
  }

  // !uyarlar
  if (command === "uyarlar" || command === "warns") {
    const target = message.mentions.users.first() || message.author;
    const key = `warns_${message.guild.id}_${target.id}`;
    const warns = (await db.get(key)) || [];

    if (warns.length === 0)
      return message.reply({ embeds: [embed("✅ Uyarı Yok", `${target.tag} hiç uyarı almamış.`, CONFIG.COLORS.PRIMARY)] });

    const list = warns.map((w, i) => `**${i + 1}.** ${w.reason} — *${w.by}* (${w.date})`).join("\n");
    message.channel.send({ embeds: [embed(`⚠️ ${target.tag} Uyarıları`, list, CONFIG.COLORS.WARN)] });
    return;
  }

  // !kilitle
  if (command === "kilitle" || command === "lock") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Kanal yönetme yetkin yok.", CONFIG.COLORS.ERROR)] });

    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    message.channel.send({ embeds: [embed("🔒 Kanal Kilitlendi", `${message.channel} kanalı kilitlendi. Mesaj gönderilemez.`, CONFIG.COLORS.ERROR)] });
    return;
  }

  // !aç
  if (command === "aç" || command === "unlock") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Kanal yönetme yetkin yok.", CONFIG.COLORS.ERROR)] });

    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    message.channel.send({ embeds: [embed("🔓 Kanal Açıldı", `${message.channel} kanalı tekrar açık.`, CONFIG.COLORS.PRIMARY)] });
    return;
  }

  // ═══════════════════════════════════════════
  //  ⚔️  KLAN YÖNETİMİ
  // ═══════════════════════════════════════════

  // !kayıt
  if (command === "kayıt" || command === "kayit") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Kayıt yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    const ign = args[1]; // Minecraft kullanıcı adı
    if (!target || !ign)
      return message.reply({ embeds: [embed("❌ Hata", "Kullanım: `!kayıt @kullanıcı MinecraftAdı`", CONFIG.COLORS.ERROR)] });

    await db.set(`member_${message.guild.id}_${target.id}`, {
      tag: target.user.tag,
      ign,
      joinedAt: new Date().toLocaleDateString("tr-TR"),
      by: message.author.tag,
    });

    try {
      await target.setNickname(ign);
    } catch {}

    const e = embed("✅ Üye Kayıt Edildi", `**Discord:** ${target.user.tag}\n**Minecraft Adı:** \`${ign}\`\n**Kaydeden:** ${message.author.tag}`, CONFIG.COLORS.PRIMARY);
    message.channel.send({ embeds: [e] });
    return;
  }

  // !üye
  if (command === "üye" || command === "uye") {
    const target = message.mentions.members.first() || message.member;
    const data = await db.get(`member_${message.guild.id}_${target.id}`);
    if (!data)
      return message.reply({ embeds: [embed("❌ Bulunamadı", "Bu kullanıcı klan üyesi değil.", CONFIG.COLORS.ERROR)] });

    const xp = (await db.get(`xp_${message.guild.id}_${target.id}`)) || 0;
    const level = levelFromXP(xp);

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚔️ ${data.ign} — Klan Üyesi`)
          .setColor(CONFIG.COLORS.PRIMARY)
          .setThumbnail(target.user.displayAvatarURL())
          .addFields(
            { name: "Discord", value: data.tag, inline: true },
            { name: "Minecraft", value: `\`${data.ign}\``, inline: true },
            { name: "Katılım", value: data.joinedAt, inline: true },
            { name: "Seviye", value: `${level}`, inline: true },
            { name: "XP", value: `${xp}`, inline: true },
            { name: "Kaydeden", value: data.by, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "⚔️ Klan Bot" }),
      ],
    });
    return;
  }

  // !üyeler
  if (command === "üyeler" || command === "uyeler") {
    const keys = await db.all();
    const guildMembers = keys.filter((k) => k.id.startsWith(`member_${message.guild.id}_`));

    if (!guildMembers.length)
      return message.reply({ embeds: [embed("📋 Üye Listesi", "Henüz kayıtlı üye yok.", CONFIG.COLORS.INFO)] });

    const list = guildMembers.map((m, i) => `**${i + 1}.** \`${m.value.ign}\` — ${m.value.tag}`).join("\n");
    message.channel.send({ embeds: [embed(`⚔️ Klan Üyeleri (${guildMembers.length})`, list, CONFIG.COLORS.PRIMARY)] });
    return;
  }

  // !çıkar
  if (command === "çıkar" || command === "cikar") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Bu işlem için yetkin yok.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [embed("❌ Hata", "Bir kullanıcı etiketle.", CONFIG.COLORS.ERROR)] });

    await db.delete(`member_${message.guild.id}_${target.id}`);
    message.channel.send({ embeds: [embed("🚪 Üye Çıkarıldı", `${target.user.tag} klandan çıkarıldı.`, CONFIG.COLORS.WARN)] });
    return;
  }

  // ═══════════════════════════════════════════
  //  🏆  XP & SIRALAMA
  // ═══════════════════════════════════════════

  // !profil
  if (command === "profil" || command === "level") {
    const target = message.mentions.members.first() || message.member;
    const uid2 = `${message.guild.id}_${target.id}`;
    const xp = (await db.get(`xp_${uid2}`)) || 0;
    const level = levelFromXP(xp);
    const nextXP = xpForNextLevel(level);
    const progress = Math.floor((xp % CONFIG.XP.LEVEL_MULTIPLIER) / CONFIG.XP.LEVEL_MULTIPLIER * 20);
    const bar = "█".repeat(progress) + "░".repeat(20 - progress);

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏆 ${target.user.username} — Profil`)
          .setColor(CONFIG.COLORS.GOLD)
          .setThumbnail(target.user.displayAvatarURL())
          .addFields(
            { name: "Seviye", value: `**${level}**`, inline: true },
            { name: "Toplam XP", value: `**${xp}**`, inline: true },
            { name: "Sonraki Seviye", value: `**${nextXP - xp} XP** lazım`, inline: true },
            { name: "İlerleme", value: `\`[${bar}]\``, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: "⚔️ Klan Bot" }),
      ],
    });
    return;
  }

  // !sıralama
  if (command === "sıralama" || command === "siralama" || command === "top") {
    const keys = await db.all();
    const guildXP = keys
      .filter((k) => k.id.startsWith(`xp_${message.guild.id}_`))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (!guildXP.length)
      return message.reply({ embeds: [embed("🏆 Sıralama", "Henüz XP kazanan yok.", CONFIG.COLORS.GOLD)] });

    const medals = ["🥇", "🥈", "🥉"];
    const list = guildXP
      .map((entry, i) => {
        const userId = entry.id.split("_")[2];
        const member = message.guild.members.cache.get(userId);
        const name = member ? member.user.username : "Bilinmiyor";
        const medal = medals[i] || `**${i + 1}.**`;
        return `${medal} ${name} — **${entry.value} XP** (Seviye ${levelFromXP(entry.value)})`;
      })
      .join("\n");

    message.channel.send({ embeds: [embed("🏆 XP Sıralaması — Top 10", list, CONFIG.COLORS.GOLD)] });
    return;
  }

  // !xpver
  if (command === "xpver") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Admin yetkisi gerekli.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount))
      return message.reply({ embeds: [embed("❌ Hata", "Kullanım: `!xpver @kullanıcı <miktar>`", CONFIG.COLORS.ERROR)] });

    const uid2 = `xp_${message.guild.id}_${target.id}`;
    const current = (await db.get(uid2)) || 0;
    await db.set(uid2, current + amount);
    message.channel.send({ embeds: [embed("✅ XP Verildi", `${target.user.tag} kullanıcısına **${amount} XP** verildi.`, CONFIG.COLORS.PRIMARY)] });
    return;
  }

  // !xpset
  if (command === "xpset") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply({ embeds: [embed("❌ Yetersiz Yetki", "Admin yetkisi gerekli.", CONFIG.COLORS.ERROR)] });

    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount))
      return message.reply({ embeds: [embed("❌ Hata", "Kullanım: `!xpset @kullanıcı <miktar>`", CONFIG.COLORS.ERROR)] });

    await db.set(`xp_${message.guild.id}_${target.id}`, amount);
    message.channel.send({ embeds: [embed("✅ XP Ayarlandı", `${target.user.tag} XP'si **${amount}** olarak ayarlandı.`, CONFIG.COLORS.PRIMARY)] });
    return;
  }

  // ═══════════════════════════════════════════
  //  🎫  TICKET SİSTEMİ
  // ═══════════════════════════════════════════

  // !ticket
  if (command === "ticket") {
    const existing = message.guild.channels.cache.find(
      (c) => c.name === `ticket-${message.author.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    );
    if (existing)
      return message.reply({ embeds: [embed("❌ Hata", `Zaten açık bir ticketin var: ${existing}`, CONFIG.COLORS.ERROR)] });

    const ticketChannel = await message.guild.channels.create({
      name: `ticket-${message.author.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      type: ChannelType.GuildText,
      parent: CONFIG.TICKET_CATEGORY_ID || undefined,
      permissionOverwrites: [
        { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: message.author.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Ticketi Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      embeds: [
        embed(
          "🎫 Destek Talebi Oluşturuldu",
          `Merhaba ${message.author}! 👋\n\nSorununu veya talebini açıkla, ekibimiz en kısa sürede yardımcı olacak.\n\n⏱️ Ortalama yanıt süresi: **< 24 saat**`,
          CONFIG.COLORS.INFO
        ),
      ],
      components: [row],
    });

    message.reply({ embeds: [embed("✅ Ticket Açıldı", `Ticketin oluşturuldu: ${ticketChannel}`, CONFIG.COLORS.PRIMARY)] });
    return;
  }

  // !kapat
  if (command === "kapat" || command === "close") {
    if (!message.channel.name.startsWith("ticket-"))
      return message.reply({ embeds: [embed("❌ Hata", "Bu komut sadece ticket kanallarında çalışır.", CONFIG.COLORS.ERROR)] });

    await message.channel.send({ embeds: [embed("🔒 Ticket Kapatılıyor", "Bu kanal 5 saniye içinde silinecek...", CONFIG.COLORS.WARN)] });
    setTimeout(() => message.channel.delete().catch(() => {}), 5000);
    return;
  }

  // ═══════════════════════════════════════════
  //  ℹ️  GENEL KOMUTLAR
  // ═══════════════════════════════════════════

  // !ping
  if (command === "ping") {
    const sent = await message.reply({ embeds: [embed("🏓 Pong!", "Hesaplanıyor...", CONFIG.COLORS.INFO)] });
    sent.edit({
      embeds: [
        embed(
          "🏓 Pong!",
          `**Bot Gecikmesi:** ${sent.createdTimestamp - message.createdTimestamp}ms\n**API Gecikmesi:** ${Math.round(client.ws.ping)}ms`,
          CONFIG.COLORS.INFO
        ),
      ],
    });
    return;
  }

  // !sunucu
  if (command === "sunucu" || command === "server") {
    const g = message.guild;
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🌐 ${g.name}`)
          .setColor(CONFIG.COLORS.PRIMARY)
          .setThumbnail(g.iconURL())
          .addFields(
            { name: "Üye Sayısı", value: `${g.memberCount}`, inline: true },
            { name: "Kanallar", value: `${g.channels.cache.size}`, inline: true },
            { name: "Roller", value: `${g.roles.cache.size}`, inline: true },
            { name: "Oluşturulma", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
            { name: "Sahip", value: `<@${g.ownerId}>`, inline: true },
            { name: "Boost", value: `${g.premiumSubscriptionCount || 0}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "⚔️ Klan Bot" }),
      ],
    });
    return;
  }

  // !kullanıcı
  if (command === "kullanıcı" || command === "kullanici" || command === "userinfo") {
    const target = message.mentions.members.first() || message.member;
    const u = target.user;
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`👤 ${u.tag}`)
          .setColor(CONFIG.COLORS.INFO)
          .setThumbnail(u.displayAvatarURL())
          .addFields(
            { name: "ID", value: u.id, inline: true },
            { name: "Hesap Oluşturulma", value: `<t:${Math.floor(u.createdTimestamp / 1000)}:D>`, inline: true },
            { name: "Sunucuya Katılma", value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
            { name: "Roller", value: target.roles.cache.filter((r) => r.id !== message.guild.id).map((r) => `<@&${r.id}>`).join(", ") || "Yok", inline: false }
          )
          .setTimestamp()
          .setFooter({ text: "⚔️ Klan Bot" }),
      ],
    });
    return;
  }

  // !avatar
  if (command === "avatar") {
    const target = message.mentions.users.first() || message.author;
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️ ${target.username} — Avatar`)
          .setImage(target.displayAvatarURL({ size: 512 }))
          .setColor(CONFIG.COLORS.PRIMARY),
      ],
    });
    return;
  }
});

// ╔══════════════════════════════════════════╗
// ║       🎫  TICKET BUTTON INTERACTION      ║
// ╚══════════════════════════════════════════╝

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "close_ticket") {
    if (!interaction.channel.name.startsWith("ticket-")) return;

    await interaction.reply({ embeds: [embed("🔒 Kapatılıyor", "Ticket 5 saniye içinde silinecek...", CONFIG.COLORS.WARN)] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// ╔══════════════════════════════════════════╗
// ║              🚀  LOGIN                   ║
// ╚══════════════════════════════════════════╝

client.login(CONFIG.TOKEN);
