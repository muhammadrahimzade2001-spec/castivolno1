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
        .addFields(
          { name: "🛡️ Moderasyon", value: "`!ban` `!kick` `!mute` `!unmute` `!temizle` `!uyar` `!kilitle` `!aç`" },
          { name: "📢 Duyuru", value: "`!duyuru`" },
          { name: "⚔️ Klan", value: "`!kayıt` `!üye` `!üyeler` `!çıkar`" },
          { name: "🏆 XP", value: "`!profil` `!sıralama` `!xpver` `!xpçıkar` `!xpsifirla`" },
          { name: "🎫 Ticket", value: "`!ticket-kur`" },
          { name: "ℹ️ Genel", value: "`!ping` `!sunucu` `!avatar`" }
        )
        .setFooter({ text: "⚔️ Castivol | Prefix: !" })
        .setTimestamp()]
    });
  }

  // ── XP KOMUTLARI ──
  if (cmd === "xpver") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Bu komut için yönetici yetkisi lazım.", COLORS.red)] });
    const t = msg.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!t || isNaN(amount)) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!xpver @üye 100`", COLORS.red)] });

    const key = `xp_${msg.guild.id}_${t.id}`;
    const newXp = (db.get(key) || 0) + amount;
    db.set(key, newXp);
    return msg.channel.send({ embeds: [e("✅ XP Eklendi", `${t.user.tag} +${amount} XP kazandı.`, COLORS.green)] });
  }

  if (cmd === "xpçıkar") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Bu komut için yönetici yetkisi lazım.", COLORS.red)] });
    const t = msg.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!t || isNaN(amount)) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!xpçıkar @üye 100`", COLORS.red)] });

    const key = `xp_${msg.guild.id}_${t.id}`;
    const current = db.get(key) || 0;
    const newXp = Math.max(0, current - amount);
    db.set(key, newXp);
    return msg.channel.send({ embeds: [e("✅ XP Çıkarıldı", `${t.user.tag} -${amount} XP (${newXp} XP kaldı).`, COLORS.yellow)] });
  }

  if (cmd === "xpsifirla") {
    if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return msg.reply({ embeds: [e("❌ Yetki Yok", "Bu komut için yönetici yetkisi lazım.", COLORS.red)] });

    if (args[0] === "hepsi" || args[0] === "all") {
      // Tüm XP'leri sıfırla
      const allXp = db.all(`xp_${msg.guild.id}_`);
      allXp.forEach(item => db.del(item.id));
      return msg.channel.send({ embeds: [e("🗑️ Tüm XP Sıfırlandı", "Tüm üyelerin XP puanları sıfırlandı.", COLORS.red)] });
    }

    const t = msg.mentions.members.first();
    if (!t) return msg.reply({ embeds: [e("❌ Hata", "Kullanım: `!xpsifirla @üye` veya `!xpsifirla hepsi`", COLORS.red)] });

    db.del(`xp_${msg.guild.id}_${t.id}`);
    return msg.channel.send({ embeds: [e("🗑️ XP Sıfırlandı", `${t.user.tag} kullanıcısının XP puanı sıfırlandı.`, COLORS.red)] });
  }

  // ── Diğer Komutlar (kısaca) ──
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
        ).setFooter({ text: "⚔️ Castivol" }).setTimestamp()]
    });
  }

  // ... (diğer tüm komutlar aynı kalıyor: kayıt, üyeler, kilitle, ticket-kur vs.)

  // Yardım menüsünde XP kısmını güncelledim, diğer komutları buraya eklemediğim için hata alırsan söyle.
});

client.login(process.env.TOKEN);
