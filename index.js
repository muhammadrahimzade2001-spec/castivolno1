const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = "!";

// --- 1. HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.find(ch => ch.name.includes('sohbet') || ch.name.includes('hoşgeldin'));
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎉 Bir Kahraman Geldi!")
        .setDescription(`Selam ${member}, **Castivol İmparatorluğu**'na hoş geldin! Seninle birlikte artık daha güçlüyüz. \n\nŞu an **${member.guild.memberCount}** kişiyiz!`)
        .setColor("Gold")
                .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    channel.send({ content: `${member}`, embeds: [welcomeEmbed] });
});

client.on('ready', () => {
    client.user.setActivity('🛡️ Castivol İmparatorluğu', { type: ActivityType.Watching });
    console.log(`🛡️ v8.0 Yayında!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Yetki Kontrolü
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // --- 2. KURALLAR KOMUTU ---
    if (command === "kurallar") {
        const rulesEmbed = new EmbedBuilder()
            .setTitle("📜 Sunucu Kuralları")
            .setColor("Red")
            .setDescription(`
            1. Küfür, argo ve her türlü taciz kesinlikle yasaktır.
            2. Reklam yapmak (DM dahil) kalıcı yasaklanma sebebidir.
            3. Din, dil, ırk ve siyaset tartışmaları yapmak yasaktır.
            4. Odalarda spam ve flood yapmak yasaktır.
            5. Yetkililere karşı saygılı olunmalıdır.
            
            **Unutma, kuralları okumuş sayılacaksın!**`)
            .setFooter({ text: "Castivol Adalet Sistemi" });
        return message.channel.send({ embeds: [rulesEmbed] });
    }

    // --- 3. EKSTRA KOMUTLAR ---

    // 🕒 KULLANICI BİLGİ
    if (command === "profil") {
        const user = message.mentions.users.first() || message.author;
        const profile = new EmbedBuilder()
            .setTitle(`${user.username} - Bilgiler`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'ID', value: user.id },
                { name: 'Katılma Tarihi', value: `<t:${Math.floor(message.guild.members.cache.get(user.id).joinedTimestamp / 1000)}:R>` }
            )
            .setColor("Blue");
        return message.channel.send({ embeds: [profile] });
    }

    // 🎰 ŞANS OYUNU
    if (command === "yazıtura") {
        const sonuc = Math.random() > 0.5 ? "Yazı" : "Tura";
        return message.reply(`🪙 Parayı attım: **${sonuc}** geldi!`);
    }

    // 🛑 BAN KOMUTU
    if (command === "ban") {
        if (!hasAuthority) return;
        const user = message.mentions.members.first();
        if (!user) return message.reply("Banlanacak kişiyi etiketle.");
        await user.ban();
        return message.channel.send(`🚀 ${user.user.tag} yörüngeden fırlatıldı (Banlandı).`);
    }

    // 🦶 KICK KOMUTU
    if (command === "kick") {
        if (!hasAuthority) return;
        const user = message.mentions.members.first();
        if (!user) return message.reply("Atılacak kişiyi etiketle.");
        await user.kick();
        return message.channel.send(`👞 ${user.user.tag} kapı dışarı edildi (Atıldı).`);
    }

    // 🗳️ OYLAMA
    if (command === "oyla") {
        const soru = args.join(" ");
        if (!soru) return message.reply("Oylanacak bir şey yaz kanka.");
        const oylama = new EmbedBuilder()
            .setTitle("🗳️ Oylama Başladı")
            .setDescription(soru)
            .setColor("Purple")
            .setFooter({ text: `Başlatan: ${message.author.tag}` });
        const msg = await message.channel.send({ embeds: [oylama] });
        await msg.react("✅");
        await msg.react("❌");
    }

    // --- ESKİ KOMUTLAR (DÜZENLENMİŞ) ---

    if (command === "yardım") {
        const h = new EmbedBuilder()
            .setTitle("🛠️ Castivol Komut Listesi")
            .setColor("White")
            .addFields(
                { name: "🛡️ Yetkili", value: "`!kur`, `!ticket-kur`, `!duyuru`, `!sil`, `!ban`, `!kick`" },
                { name: "👤 Üye", value: "`!yardım`, `!kurallar`, `!profil`, `!yazıtura`, `!oyla`" }
            );
        return message.channel.send({ embeds: [h] });
    }

    if (command === "duyuru") {
        if (!hasAuthority) return;
        const text = args.join(" ");
        if (!text) return;
        const embed = new EmbedBuilder().setTitle("📢 DUYURU").setDescription(text).setColor("Gold");
        message.delete();
        message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    if (command === "sil") {
        if (!hasAuthority) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true);
        message.channel.send(`🧹 **${sayi}** mesaj silindi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return;
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger));
        message.channel.send({ content: "🚨 Onaylıyor musun?", components: [btn] });
    }
});

// --- BUTON ETKİLEŞİMLERİ (Ticket ve Mega Kur buraya gelecek - Bir önceki kodla aynı) ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    // ... (Önceki Ticket ve Kur kodlarını buraya ekleyebilirsin veya bu haliyle bırakabilirsin)
});

client.login(process.env.TOKEN);
