require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Database = require("better-sqlite3");
const ms = require("ms");

// ── VERİTABANI ────────────────────────────────────────
const sql = new Database("castivol.db");
sql.exec("CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)");

const db = {
  get: (key) => { 
    const r = sql.prepare("SELECT value FROM store WHERE key=?").get(key); 
    return r ? JSON.parse(r.value) : null; 
  },
  set: (key, val) => sql.prepare("INSERT OR REPLACE INTO store (key,value) VALUES (?,?)").run(key, JSON.stringify(val)),
  del: (key) => sql.prepare("DELETE FROM store WHERE key=?").run(key),
  all: (prefix) => sql.prepare("SELECT key,value FROM store WHERE key LIKE ?").all(prefix + "%").map(r => ({ id: r.key, value: JSON.parse(r.value) })),
};

// ── CLIENT ────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

const COLORS = { green: 0x2ecc71, red: 0xe74c3c, yellow: 0xf1c40f, blue: 0x3498db };

const xpCooldown = new Map();
const recentJoins = [];

const e = (title, desc, color = COLORS.green) =>
  new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setFooter({ text: "⚔️ Castivol" }).setTimestamp();

const hasPerm = (member, perm) => member.permissions.has(perm);
const xpLevel = (xp) => Math.floor(xp / 100);

// ── READY ─────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} hazır!`);
  client.user.setActivity("!yardım | ⚔️ Castivol", { type: 3 });
});

// ── RAİD KORUMASI ─────────────────────────────────────
client.on("guildMemberAdd", async (member) => {
  const now = Date.now();
  if ((now - member.user.createdTimestamp) / 86400000 < 7) {
    await member.kick("Raid Koruması: Hesap çok yeni").catch(() => {});
    return;
  }

  recentJoins.push(now);
  const recent = recentJoins.filter((t) => now - t < 10000);
  if (recent.length >= 5) {
    const logCh = member.guild.channels.cache.find((c) => c.name === "castivol-log");
    if (logCh) logCh.send({ embeds: [e("🚨 RAİD ALARMI!", `${recent.length} kişi 10 saniyede katıldı!`, COLORS.red)] });
  }
  while (recentJoins.length && now - recentJoins[0] > 10000) recentJoins.shift();
});

// ── MESAJLAR ──────────────────────────────────────────
client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.guild) return;

  // XP Sistemi
  const uid = `${msg.guild.id}_${msg.author.id}`;
  if (!xpCooldown.has(uid) || Date.now() - xpCooldown.get(uid) > 60000) {
    xpCooldown.set(uid, Date.now());
    const currentXp = (db.get(`xp_${uid}`) || 0) + 10;
    const oldLvl = xpLevel(currentXp - 10);
    db.set(`xp_${uid}`, currentXp);

    if (xpLevel(currentXp) > oldLvl) {
      msg.channel.send({ embeds: [e("🎉 Seviye Atladın!", `${msg.author} → **${xpLevel(currentXp)}. seviye**! 🏆`, COLORS.yellow)] });
    }
  }

  if (!msg.content.startsWith("!")) return;

  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ── YARDIM ──
  if (cmd === "yardım" || cmd === "yardim") {
    return msg.reply({
      embeds: [new EmbedBuilder()
        .setTitle("⚔️ Castivol Bot — Komutlar")
        .setColor(COLORS.green)
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "🛡️ Moderasyon", value: "`!ban` `!kick` `!mute` `!unmute` `!temizle` `!uyar` `!kilitle` `!aç`" },
          { name: "📢 Duyuru", value: "`!duyuru <mesaj>`" },
          { name: "⚔️ Klan", value: "`!kayıt` `!üye` `!üyeler` `!çıkar`" },
          { name: "🏆 XP", value: "`!profil` `!sıralama` `!xpver`" },
          { name: "🎫 Ticket", value: "`!ticket-kur`" },
          { name: "ℹ️ Genel", value: "`!ping` `!sunucu` `!avatar`" }
        )
        .setFooter({ text: "⚔️ Castivol | Prefix: !" })
        .setTimestamp()]
    });
  }

  // ── DUYURU ──
  if (cmd === "duyuru") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator))
      return msg.reply({ embeds: [e("❌ Yetki Yok", "Bu komutu sadece yöneticiler kullanabilir.", COLORS.red)] });

    const duyuruMesaj = args.join(" ");
    if (!duyuruMesaj) return msg.reply({ embeds: [e("❌ Hata", "Duyuru mesajı yazmalısın!\nÖrnek: `!duyuru Klan etkinliği bugün saat 20:00'da!`", COLORS.red)] });

    const embed = new EmbedBuilder()
      .setTitle("📢 Castivol Duyuru")
      .setDescription(duyuruMesaj)
      .setColor(COLORS.yellow)
      .setTimestamp()
      .setFooter({ text: `Duyuran: ${msg.author.username}` });

    await msg.channel.send({ content: "@everyone", embeds: [embed] });
    return msg.reply({ embeds: [e("✅ Duyuru Gönderildi", "Duyuru başarıyla gönderildi.", COLORS.green)] });
  }

  // ── TICKET KUR ──
  if (cmd === "ticket-kur" || cmd === "ticketkur") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) 
      return msg.reply({ embeds: [e("❌ Yetki Yok", "Bu komutu sadece yöneticiler kullanabilir.", COLORS.red)] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_merge").setLabel("🔄 Merge").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_partner").setLabel("🤝 Partnerlik").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ticket_klan").setLabel("⚔️ Klan Alım").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ticket_yetkili").setLabel("👮 Yetkili Alım").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("ticket_sikayet").setLabel("❌ Şikayet").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("🎫 Castivol Destek Talebi")
      .setDescription("**Aşağıdaki butonlardan birine tıklayarak ticket oluşturabilirsiniz.**")
      .setColor(COLORS.blue)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "⚔️ Castivol • Ticket Sistemi" })
      .setTimestamp();

    await msg.channel.send({ embeds: [embed], components: [row] });
    return msg.reply({ embeds: [e("✅ Ticket Paneli Kuruldu", "Destek talebi paneli bu kanala gönderildi.", COLORS.green)] });
  }

  // ── Diğer Komutlar (kısaltılmış) ──
  if (cmd === "ban") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.BanMembers)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Ban yetkin yok.", COLORS.red)] });
    const t = msg.mentions.members.first();
    if (!t) return msg.reply({ embeds: [e("❌ Hata", "Kullanıcı etiketle.", COLORS.red)] });
    await t.ban({ reason: args.slice(1).join(" ") || "Sebep yok" }).catch(() => {});
    return msg.channel.send({ embeds: [e("🔨 Banlandı", `**${t.user.tag}** banlandı.`, COLORS.red)] });
  }

  // ... (kick, mute, unmute, temizle, kayıt, üye, üyeler, çıkar, profil, sıralama, xpver, ping, sunucu, avatar komutları aynı kalıyor)

  if (cmd === "kapat") {
    if (!msg.channel.name.startsWith("ticket-")) return msg.reply({ embeds: [e("❌ Hata", "Sadece ticket kanallarında çalışır.", COLORS.red)] });
    await msg.channel.send({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
    setTimeout(() => msg.channel.delete().catch(() => {}), 5000);
  }
});

// ── TICKET BUTONLARI ──────────────────────────────────
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  if (i.customId === "close_ticket") {
    await i.reply({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    return;
  }

  const ticketTypes = {
    "ticket_merge": { name: "merge", title: "🔄 Merge Talebi", color: COLORS.blue },
    "ticket_partner": { name: "partner", title: "🤝 Partnerlik Talebi", color: COLORS.blue },
    "ticket_klan": { name: "klan", title: "⚔️ Klan Alım Talebi", color: COLORS.green },
    "ticket_yetkili": { name: "yetkili", title: "👮 Yetkili Alım Talebi", color: COLORS.green },
    "ticket_sikayet": { name: "sikayet", title: "❌ Şikayet Talebi", color: COLORS.red }
  };

  const type = ticketTypes[i.customId];
  if (!type) return;

  const existing = i.guild.channels.cache.find(c => c.name.includes(`ticket-${type.name}`) && c.topic?.includes(i.user.id));
  if (existing) return i.reply({ embeds: [e("❌ Hata", `Zaten açık bir **${type.title}** ticketin var.`, COLORS.red)], ephemeral: true });

  const channel = await i.guild.channels.create({
    name: `ticket-${type.name}-${i.user.username}`,
    type: ChannelType.GuildText,
    topic: `Ticket Sahibi: ${i.user.id} | Tür: ${type.title}`,
    permissionOverwrites: [
      { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
    ],
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Ticket Kapat").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${i.user}`,
    embeds: [e(type.title, `Merhaba ${i.user}!\n\nLütfen talebinle ilgili detaylı bilgi ver.`, type.color)],
    components: [closeRow]
  });

  await i.reply({ embeds: [e("✅ Ticket Oluşturuldu", `${channel} kanalına yönlendirildin.`, COLORS.green)], ephemeral: true });
});

client.login(process.env.TOKEN);
