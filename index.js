require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Database = require("better-sqlite3");
const ms = require("ms");

// ── VERİTABANI ────────────────────────────────────────
const sql = new Database("castivol.db");
sql.exec("CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)");
const db = {
  get: (key) => { const r = sql.prepare("SELECT value FROM store WHERE key=?").get(key); return r ? JSON.parse(r.value) : null; },
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

  // XP
  const uid = `${msg.guild.id}_${msg.author.id}`;
  if (!xpCooldown.has(uid) || Date.now() - xpCooldown.get(uid) > 60000) {
    xpCooldown.set(uid, Date.now());
    const xp = (db.get(`xp_${uid}`) || 0) + 10;
    const oldLvl = xpLevel(xp - 10);
    db.set(`xp_${uid}`, xp);
    if (xpLevel(xp) > oldLvl)
      msg.channel.send({ embeds: [e("🎉 Seviye Atladın!", `${msg.author} → **${xpLevel(xp)}. seviye**! 🏆`, COLORS.yellow)] });
  }

  if (!msg.content.startsWith("!")) return;
  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ── !yardım ──
  if (cmd === "yardım" || cmd === "yardim") {
    return msg.reply({
      embeds: [new EmbedBuilder()
        .setTitle("⚔️ Castivol Bot — Komutlar").setColor(COLORS.green).setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "🛡️ Moderasyon", value: "`!ban` `!kick` `!mute <süre>` `!unmute` `!temizle <n>` `!uyar` `!kilitle` `!aç`" },
          { name: "⚔️ Klan", value: "`!kayıt @üye McAdı` `!üye` `!üyeler` `!çıkar`" },
          { name: "🏆 XP", value: "`!profil` `!sıralama` `!xpver @üye <n>`" },
          { name: "🎫 Ticket", value: "`!ticket` `!kapat`" },
          { name: "ℹ️ Genel", value: "`!ping` `!sunucu` `!avatar`" }
        ).setFooter({ text: "⚔️ Castivol | Prefix: !" }).setTimestamp()],
    });
  }

  // ── MOD ──
  if (cmd === "ban") {
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

  if (cmd === "uyar") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ModerateMembers)) return;
    const t = msg.mentions.users.first();
    if (!t) return;
    const key = `warns_${msg.guild.id}_${t.id}`;
    const warns = db.get(key) || [];
    warns.push({ reason: args.slice(1).join(" ") || "Sebep yok", by: msg.author.tag });
    db.set(key, warns);
    return msg.channel.send({ embeds: [e("⚠️ Uyarıldı", `${t.tag} uyarıldı. Toplam: **${warns.length}**`, COLORS.yellow)] });
  }

  if (cmd === "kilitle") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageChannels)) return;
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
    return msg.channel.send({ embeds: [e("🔒 Kilitlendi", `${msg.channel} kanalı kilitlendi.`, COLORS.red)] });
  }

  if (cmd === "aç" || cmd === "ac") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageChannels)) return;
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: null });
    return msg.channel.send({ embeds: [e("🔓 Açıldı", `${msg.channel} kanalı açıldı.`)] });
  }

  // ── KLAN ──
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
    return msg.channel.send({
      embeds: [new EmbedBuilder().setTitle(`⚔️ ${data.ign}`).setColor(COLORS.green).setThumbnail(t.user.displayAvatarURL())
        .addFields(
          { name: "Discord", value: data.tag, inline: true },
          { name: "MC Adı", value: `\`${data.ign}\``, inline: true },
          { name: "Seviye", value: `${xpLevel(xp)}`, inline: true },
          { name: "XP", value: `${xp}`, inline: true },
          { name: "Katılım", value: data.date, inline: true }
        ).setFooter({ text: "⚔️ Castivol" }).setTimestamp()],
    });
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

  // ── XP ──
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

  // ── TİCKET ──
  if (cmd === "ticket") {
    const exists = msg.guild.channels.cache.find((c) => c.name === `ticket-${msg.author.id}`);
    if (exists) return msg.reply({ embeds: [e("❌ Hata", `Zaten açık ticketin var: ${exists}`, COLORS.red)] });
    const ch = await msg.guild.channels.create({
      name: `ticket-${msg.author.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: msg.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: msg.author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Kapat").setStyle(ButtonStyle.Danger));
    await ch.send({ embeds: [e("🎫 Destek Talebi", `Merhaba ${msg.author}! Sorununu yaz, ekip yardımcı olacak.`, COLORS.blue)], components: [row] });
    return msg.reply({ embeds: [e("✅ Ticket Açıldı", `${ch} kanalı oluşturuldu.`)] });
  }

  if (cmd === "kapat") {
    if (!msg.channel.name.startsWith("ticket-")) return msg.reply({ embeds: [e("❌ Hata", "Sadece ticket kanallarında çalışır.", COLORS.red)] });
    await msg.channel.send({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
    setTimeout(() => msg.channel.delete().catch(() => {}), 5000);
    return;
  }

  // ── GENEL ──
  if (cmd === "ping") {
    const s = await msg.reply({ embeds: [e("🏓 Pong!", "Hesaplanıyor...")] });
    return s.edit({ embeds: [e("🏓 Pong!", `Bot: **${s.createdTimestamp - msg.createdTimestamp}ms** | API: **${Math.round(client.ws.ping)}ms**`, COLORS.blue)] });
  }

  if (cmd === "sunucu") {
    const g = msg.guild;
    return msg.channel.send({
      embeds: [new EmbedBuilder().setTitle(`🌐 ${g.name}`).setColor(COLORS.green).setThumbnail(g.iconURL())
        .addFields(
          { name: "Üyeler", value: `${g.memberCount}`, inline: true },
          { name: "Kanallar", value: `${g.channels.cache.size}`, inline: true },
          { name: "Sahip", value: `<@${g.ownerId}>`, inline: true }
        ).setFooter({ text: "⚔️ Castivol" }).setTimestamp()],
    });
  }

  if (cmd === "avatar") {
    const t = msg.mentions.users.first() || msg.author;
    return msg.channel.send({ embeds: [new EmbedBuilder().setTitle(`🖼️ ${t.username}`).setImage(t.displayAvatarURL({ size: 512 })).setColor(COLORS.green)] });
  }
});

// ── TICKET BUTON ──────────────────────────────────────
client.on("interactionCreate", async (i) => {
  if (!i.isButton() || i.customId !== "close_ticket") return;
  await i.reply({ embeds: [e("🔒 Kapatılıyor", "5 saniye içinde silinecek.", COLORS.yellow)] });
  setTimeout(() => i.channel.delete().catch(() => {}), 5000);
});

client.login(process.env.TOKEN);
