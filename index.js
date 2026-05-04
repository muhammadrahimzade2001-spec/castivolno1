require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Database = require("better-sqlite3");
const ms = require("ms");

// ── VERİTABANI BAĞLANTISI ──────────────────────────────
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

// ── CLIENT AYARLARI ───────────────────────────────────
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

// ── BOT HAZIR ─────────────────────────────────────────
client.once("ready", () => {
    console.log(`✅ ${client.user.tag} aktif! Hatalar giderildi.`);
    client.user.setActivity("!yardım | ⚔️ Castivol", { type: 3 });
});

// ── MESAJ EVENTİ (ANA KOMUTLAR) ───────────────────────
client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    // 🏆 XP Sistemi (Otomatik)
    const uid = `${msg.guild.id}_${msg.author.id}`;
    if (!xpCooldown.has(uid) || Date.now() - xpCooldown.get(uid) > 60000) {
        xpCooldown.set(uid, Date.now());
        let currentXp = (db.get(`xp_${uid}`) || 0) + 10;
        let oldLvl = xpLevel(currentXp - 10);
        db.set(`xp_${uid}`, currentXp);

        if (xpLevel(currentXp) > oldLvl) {
            msg.channel.send({ embeds: [e("🎉 Seviye Atladın!", `${msg.author} → **${xpLevel(currentXp)}. seviye**!`, COLORS.yellow)] }).catch(() => {});
        }
    }

    if (!msg.content.startsWith("!")) return;
    const args = msg.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ── YARDIM ──
    if (cmd === "yardım" || cmd === "yardim") {
        const helpEmbed = new EmbedBuilder()
            .setTitle("⚔️ Castivol Komut Listesi")
            .setColor(COLORS.blue)
            .addFields(
                { name: "🛡️ Moderasyon", value: "`ban`, `kick`, `temizle`, `kilitle`, `aç`, `duyuru`" },
                { name: "🏆 XP Sistemi", value: "`profil`, `sıralama`, `xpver`, `xpçıkar`, `xpsifirla`" },
                { name: "⚔️ Klan", value: "`kayıt`, `üye`, `üyeler`, `çıkar`" },
                { name: "🎫 Ticket", value: "`ticket-kur`" },
                { name: "ℹ️ Genel", value: "`ping`, `sunucu`, `avatar`" }
            );
        return msg.reply({ embeds: [helpEmbed] });
    }

    // ── XP KOMUTLARI (FİXED) ──
    if (cmd === "xpver") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return msg.reply("❌ Yetkin yok!");
        const t = msg.mentions.members.first();
        const val = parseInt(args[1]);
        if (!t || isNaN(val)) return msg.reply("❌ Kullanım: `!xpver @üye miktar` ");
        
        const key = `xp_${msg.guild.id}_${t.id}`;
        db.set(key, (db.get(key) || 0) + val);
        return msg.reply({ embeds: [e("✅ Başarılı", `${t} kullanıcısına **${val}** XP verildi.`)] });
    }

    if (cmd === "sıralama" || cmd === "siralama") {
        const allXp = db.all(`xp_${msg.guild.id}_`);
        if (!allXp.length) return msg.reply("❌ Henüz sıralama oluşmamış.");

        const sorted = allXp.sort((a, b) => b.value - a.value).slice(0, 10);
        let content = "";
        
        for(let i=0; i < sorted.length; i++) {
            const memberId = sorted[i].id.split("_")[2]; // Fix: uid formatı guildId_userId şeklindeydi
            content += `**${i+1}.** <@${memberId}> — \`${sorted[i].value} XP\`\n`;
        }

        return msg.reply({ embeds: [e("🏆 XP Sıralaması", content, COLORS.yellow)] });
    }

    if (cmd === "profil") {
        const t = msg.mentions.members.first() || msg.member;
        const xp = db.get(`xp_${msg.guild.id}_${t.id}`) || 0;
        const lvl = xpLevel(xp);
        const bar = "█".repeat(Math.floor((xp % 100) / 5)) + "░".repeat(20 - Math.floor((xp % 100) / 5));
        
        return msg.reply({ embeds: [new EmbedBuilder().setTitle(`👤 ${t.user.username}`).setThumbnail(t.user.displayAvatarURL()).addFields(
            { name: "Seviye", value: `\`${lvl}\``, inline: true },
            { name: "Toplam XP", value: `\`${xp}\``, inline: true },
            { name: "İlerleme", value: `\`[${bar}]\`` }
        ).setColor(COLORS.green)] });
    }

    // ── MODERASYON (FİXED) ──
    if (cmd === "ban") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.BanMembers)) return msg.reply("❌ Yetkin yok.");
        const t = msg.mentions.members.first();
        if (!t) return msg.reply("❌ Üye etiketle.");
        await t.ban().catch(err => msg.reply("❌ Hata: " + err.message));
        return msg.reply("✅ Kullanıcı banlandı.");
    }

    if (cmd === "temizle") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageMessages)) return msg.reply("❌ Yetkin yok.");
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) return msg.reply("❌ 1-100 arası sayı gir.");
        await msg.channel.bulkDelete(amount, true);
        const delMsg = await msg.channel.send(`✅ **${amount}** mesaj temizlendi.`);
        setTimeout(() => delMsg.delete().catch(() => {}), 3000);
    }

    if (cmd === "kilitle") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageChannels)) return;
        await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
        return msg.reply("🔒 Kanal kilitlendi.");
    }

    if (cmd === "aç" || cmd === "ac") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.ManageChannels)) return;
        await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: null });
        return msg.reply("🔓 Kanal açıldı.");
    }

    // ── TICKET SİSTEMİ ──
    if (cmd === "ticket-kur") {
        if (!hasPerm(msg.member, PermissionsBitField.Flags.Administrator)) return;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("tk_klan").setLabel("⚔️ Klan Alım").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("tk_destek").setLabel("🎫 Destek").setStyle(ButtonStyle.Primary)
        );
        return msg.channel.send({ embeds: [e("🎫 Destek Paneli", "Bilet açmak için tıklayın.")], components: [row] });
    }
});

// ── BUTON ETKİLEŞİMLERİ ──
client.on("interactionCreate", async (i) => {
    if (!i.isButton()) return;
    
    if (i.customId === "close_tk") return i.channel.delete().catch(() => {});

    if (i.customId.startsWith("tk_")) {
        const type = i.customId.split("_")[1];
        const ch = await i.guild.channels.create({
            name: `bilet-${type}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_tk").setLabel("Kapat").setStyle(ButtonStyle.Danger));
        await ch.send({ content: `${i.user} Hoş geldin!`, components: [row] });
        return i.reply({ content: `✅ Kanal oluşturuldu: ${ch}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
