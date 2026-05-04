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
          { name: "⚔️ Klan", value: "`!kayıt` `!üye` `!üyeler` `!çıkar`" },
          { name: "🏆 XP", value: "`!profil` `!sıralama` `!xpver`" },
          { name: "🎫 Ticket", value: "`!ticket` `!ticket-kur` `!kapat`" },
          { name: "ℹ️ Genel", value: "`!ping` `!sunucu` `!avatar`" }
        )
        .setFooter({ text: "⚔️ Castivol | Prefix: !" })
        .setTimestamp()]
    });
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
      .setDescription("**Aşağıdaki butonlardan birine tıklayarak ticket oluşturabilirsiniz.**\n\nHer kategori için ayrı ticket açılır.")
      .setColor(COLORS.blue)
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "⚔️ Castivol • Ticket Sistemi" })
      .setTimestamp();

    await msg.channel.send({ embeds: [embed], components: [row] });
    return msg.reply({ embeds: [e("✅ Ticket Paneli Kuruldu", "Destek talebi paneli bu kanala gönderildi.", COLORS.green)] });
  }

  // ── MODERASYON KOMUTLARI (kısaltıldı) ──
  if (cmd === "ban") { /* ... mevcut kodun aynı ... */ 
    if (!hasPerm(msg.member, PermissionsBitField.Flags.BanMembers)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Ban yetkin yok.", COLORS.red)] });
    const t = msg.mentions.members.first();
    if (!t) return msg.reply({ embeds: [e("❌ Hata", "Kullanıcı etiketle.", COLORS.red)] });
    await t.ban({ reason: args.slice(1).join(" ") || "Sebep yok" }).catch(() => {});
    return msg.channel.send({ embeds: [e("🔨 Banlandı", `**${t.user.tag}** banlandı.`, COLORS.red)] });
  }

  if (cmd === "kick") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.KickMembers)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Kick yetkin yok.", COLORS.red)] });
    const t = msg.mentions.members.first();
    if (!t) return msg.reply({ embeds: [e("❌ Hata", "Kullanıcı etiketle.", COLORS.red)] });
    await t.kick(args.slice(1).join(" ") || "Sebep yok").catch(() => {});
    return msg.channel.send({ embeds: [e("👢 Atıldı", `**${t.user.tag}** atıldı.`, COLORS.yellow)] });
  }

  if (cmd === "mute") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ModerateMembers)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Mute yetkin yok.", COLORS.red)] });
    const t = msg.mentions.members.first();
    const dur = ms(args[1] || "");
    if (!t || !dur) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!mute @kullanıcı 10m`", COLORS.red)] });
    await t.timeout(dur).catch(() => {});
    return msg.channel.send({ embeds: [e("🔇 Susturuldu", `**${t.user.tag}** → **${args[1]}** susturuldu.`, COLORS.yellow)] });
  }

  if (cmd === "unmute") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ModerateMembers)) return;
    const t = msg.mentions.members.first();
    if (!t) return;
    await t.timeout(null).catch(() => {});
    return msg.channel.send({ embeds: [e("🔊 Susturma Kaldırıldı", `${t.user.tag} artık konuşabilir.`)] });
  }

  if (cmd === "temizle") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageMessages)) return;
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 99) return msg.reply({ embeds: [e("❌ Hata", "1-99 arası sayı gir.", COLORS.red)] });
    await msg.channel.bulkDelete(n + 1, true).catch(() => {});
    const r = await msg.channel.send({ embeds: [e("🗑️ Silindi", `**${n}** mesaj silindi.`, COLORS.blue)] });
    setTimeout(() => r.delete().catch(() => {}), 3000);
    return;
  }

  // Klan Komutları (kısaltıldı)
  if (cmd === "kayıt" || cmd === "kayit") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageRoles)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Kayıt yetkin yok.", COLORS.red)] });
    const t = msg.mentions.members.first();
    const ign = args[1];
    if (!t || !ign) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!kayıt @kullanıcı McAdı`", COLORS.red)] });
    db.set(`member_${msg.guild.id}_${t.id}`, { tag: t.user.tag, ign, date: new Date().toLocaleDateString("tr-TR") });
    await t.setNickname(ign).catch(() => {});
    return msg.channel.send({ embeds: [e("✅ Kayıt Edildi", `**${t.user.tag}** → Minecraft: \`${ign}\``)] });
  }

  if (cmd === "üye" || cmd === "uye") {
    const t = msg.mentions.members.first() || msg.member;
    const data = db.get(`member_${msg.guild.id}_${t.id}`);
    if (!data) return msg.reply({ embeds: [e("❌ Bulunamadı", "Bu kullanıcı klan üyesi değil.", COLORS.red)] });
    const xp = db.get(`xp_${msg.guild.id}_${t.id}`) || 0;
    return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(`⚔️ ${data.ign}`).setColor(COLORS.green).setThumbnail(t.user.displayAvatarURL())
      .addFields(
        { name: "Discord", value: data.tag, inline: true },
        { name: "MC Adı", value: `\`${data.ign}\``, inline: true },
        { name: "Seviye", value: `${xpLevel(xp)}`, inline: true },
        { name: "XP", value: `${xp}`, inline: true },
        { name: "Katılım", value: data.date, inline: true }
      ).setFooter({ text: "⚔️ Castivol" }).setTimestamp()] });
  }

  if (cmd === "üyeler" || cmd === "uyeler") {
    const members = db.all(`member_${msg.guild.id}_`);
    if (!members.length) return msg.reply({ embeds: [e("📋 Üyeler", "Kayıtlı üye yok.", COLORS.blue)] });
    const list = members.map((m, i) => `**${i + 1}.** \`${m.value.ign}\` — ${m.value.tag}`).join("\n");
    return msg.channel.send({ embeds: [e(`⚔️ Castivol Üyeleri (${members.length})`, list)] });
  }

  if (cmd === "çıkar" || cmd === "cikar") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageRoles)) return;
    const t = msg.mentions.members.first();
    if (!t) return msg.reply({ embeds: [e("❌ Hata", "Kullanıcı etiketle.", COLORS.red)] });
    db.del(`member_${msg.guild.id}_${t.id}`);
    return msg.channel.send({ embeds: [e("🚪 Çıkarıldı", `${t.user.tag} klandan çıkarıldı.`, COLORS.yellow)] });
  }

  // XP Komutları (profil, sıralama, xpver) aynı kaldı...

  if (cmd === "profil") {
    const t = msg.mentions.members.first() || msg.member;
    const xp = db.get(`xp_${msg.guild.id}_${t.id}`) || 0;
    const lvl = xpLevel(xp);
    const bar = "█".repeat(Math.floor((xp % 100) / 5)) + "░".repeat(20 - Math.floor((xp % 100) / 5));
    return msg.channel.send({
      embeds: [new EmbedBuilder().setTitle(`🏆 ${t.user.username}`).setColor(COLORS.yellow).setThumbnail(t.user.displayAvatarURL())
        .addFields(
          { name: "Seviye", value: `${lvl}`, inline: true },
          { name: "XP", value: `${xp}`, inline: true },
          { name: "Sonraki", value: `${(lvl + 1) * 100 - xp} XP`, inline: true },
          { name: "İlerleme", value: `\`[${bar}]\`` }
        ).setFooter({ text: "⚔️ Castivol" }).setTimestamp()],
    });
  }

  if (cmd === "sıralama" || cmd === "siralama") {
    const top = db.all(`xp_${msg.guild.id}_`).sort((a, b) => b.value - a.value).slice(0, 10);
    if (!top.length) return msg.reply({ embeds: [e("🏆 Sıralama", "Henüz XP yok.", COLORS.yellow)] });
    const medals = ["🥇", "🥈", "🥉"];
    const list = top.map((entry, i) => {
      const id = entry.id.split("_")[2];
      const name = msg.guild.members.cache.get(id)?.user.username || "Bilinmiyor";
      return `${medals[i] || `**${i + 1}.**`} ${name} — **${entry.value} XP** (Seviye ${xpLevel(entry.value)})`;
    }).join("\n");
    return msg.channel.send({ embeds: [e("🏆 XP Sıralaması", list, COLORS.yellow)] });
  }

  if (cmd === "xpver") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return;
    const t = msg.mentions.members.first();
    const n = parseInt(args[1]);
    if (!t || isNaN(n)) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!xpver @kullanıcı 100`", COLORS.red)] });
    const key = `xp_${msg.guild.id}_${t.id}`;
    db.set(key, (db.get(key) || 0) + n);
    return msg.channel.send({ embeds: [e("✅ XP Verildi", `${t.user.tag} → **+${n} XP**`)] });
  }

  // ── ESKİ TICKET ──
  if (cmd === "ticket") {
    const exists = msg.guild.channels.cache.find((c) => c.name === `ticket-${msg.author.id}`);
    if (exists) return msg.reply({ embeds: [e("❌ Hata", `Zaten açık ticketin var: ${exists}`, COLORS.red)] });
    // ... (eski ticket kodu aynı)
  }

  if (cmd === "kapat") {
    if (!msg.channel.name.startsWith("ticket-")) return msg.reply({ embeds: [e("❌ Hata", "Sadece ticket kanallarında çalışır.", COLORS.red)] });
    await msg.channel.send({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
    setTimeout(() => msg.channel.delete().catch(() => {}), 5000);
  }

  // Genel komutlar (ping, sunucu, avatar) aynı...
  if (cmd === "ping") {
    const s = await msg.reply({ embeds: [e("🏓 Pong!", "Hesaplanıyor...")] });
    return s.edit({ embeds: [e("🏓 Pong!", `Bot: **${s.createdTimestamp - msg.createdTimestamp}ms** | API: **${Math.round(client.ws.ping)}ms**`, COLORS.blue)] });
  }
});

// ── TİCKET BUTONLARI ──────────────────────────────────
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  // Ticket Kapat Butonu
  if (i.customId === "close_ticket") {
    await i.reply({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
    setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    return;
  }

  // Yeni Ticket Tipleri
  const ticketTypes = {
    "ticket_merge": { name: "merge", title: "🔄 Merge Talebi", color: COLORS.blue },
    "ticket_partner": { name: "partner", title: "🤝 Partnerlik Talebi", color: COLORS.blue },
    "ticket_klan": { name: "klan", title: "⚔️ Klan Alım Talebi", color: COLORS.green },
    "ticket_yetkili": { name: "yetkili", title: "👮 Yetkili Alım Talebi", color: COLORS.green },
    "ticket_sikayet": { name: "sikayet", title: "❌ Şikayet Talebi", color: COLORS.red }
  };

  const type = ticketTypes[i.customId];
  if (!type) return;

  const existing = i.guild.channels.cache.find(c => 
    c.name.includes(`ticket-${type.name}`) && c.topic?.includes(i.user.id)
  );

  if (existing) {
    return i.reply({ embeds: [e("❌ Hata", `Zaten açık bir **${type.title}** ticketin var: ${existing}`, COLORS.red)], ephemeral: true });
  }

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

  await i.reply({ 
    embeds: [e("✅ Ticket Oluşturuldu", `${channel} kanalına yönlendirildin.`, COLORS.green)], 
    ephemeral: true 
  });
});

client.login(process.env.TOKEN);
