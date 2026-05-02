const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = "!";

client.on('ready', () => {
    console.log(`🛡️ Castivol Mega Sistem Aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📢 DUYURU KOMUTU (GELİŞMİŞ)
    if (command === "duyuru") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) return message.reply("❌ Duyuru yapma yetkin yok.");
        const text = args.join(" ");
        if (!text) return message.reply("❌ Duyuru metnini yazmadın kanka.");

        const embed = new EmbedBuilder()
            .setTitle("📢 CASTIVOL RESMİ DUYURU")
            .setDescription(`\n${text}\n`)
            .setColor("Gold")
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: `Duyuruyu Yapan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 🏗️ MEGA KUR KOMUTU (OWNER)
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Sadece **Owner** kurabilir.");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('30+ Kanalı İnşa Et').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 **CASTIVOL MEGA KURULUM** başlıyor. Hazır mısın?", components: [btn] });
    }

    // 🔨 MODERASYON
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(() => {});
        return message.channel.send(`🧹 **${sayi}** mesaj silindi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    if (command === "yardım") {
        const h = new EmbedBuilder().setTitle("🛡️ Komutlar").setColor("White").setDescription("`!kur`, `!duyuru`, `!sil`, `!ban`, `!kick`, `!savaş`, `!yaz`").setFooter({text: "Yetkisiz kişiler komut kullanamaz."});
        return message.channel.send({ embeds: [h] });
    }
});

// --- MEGA KURULUM ETKİLEŞİMİ ---
client.on('interactionCreate', async (i) => {
    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "❌ Yetkin yok.", ephemeral: true });

        await i.reply({ content: "🛠️ Dev yapılandırma başladı...", ephemeral: true });

        // Kanalları temizle
        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});
        
        // Roller
        const rls = ['🛡️ Castivol', '👑 owner', '👑 founder', '🎖️ yönetici', '💎 admin', '👤 üye'];
        for (const r of rls) await i.guild.roles.create({ name: r, color: 'Random', hoist: true });

        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });

        // 1. BİLGİ (5 Kanal)
        const c1 = await createCat('── BİLGİ ──');
        for (const n of ['📢-duyuru', '📜-kurallar', '🧧-işlem-merkezi', '🎭-rol-alma', '🚀-boost']) await createCh(n, c1.id);

        // 2. SOSYAL (7 Kanal)
        const c2 = await createCat('── SOSYAL ──');
        for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım', '🎰-kumar', '🕊️-itiraf', '🎂-doğum-günü']) await createCh(n, c2.id);

        // 3. SAVAŞ & KLAN (6 Kanal)
        const c3 = await createCat('── SAVAŞ MERKEZİ ──');
        for (const n of ['⚔️-savaş-duyuru', '📊-istatistik', '🛡️-kadro', '🛑-cezalılar', '🎖️-başarılar', '📣-toplanma']) await createCh(n, c3.id);

        // 4. SESLİ ODALAR (8 Kanal)
        const c4 = await createCat('── SESLİ ALAN ──');
        for (const n of ['🔊-Genel', '🎮-Oyun-1', '🎮-Oyun-2', '🎵-Müzik-1', '🎵-Müzik-2', '💤-AFK', '🎥-Yayın-Odası', '🎤-Toplantı']) await createCh(n, c4.id, ChannelType.GuildVoice);

        // 5. YÖNETİM (4 Kanal)
        const c5 = await createCat('── YÖNETİM ──');
        for (const n of ['👑-owner-özel', '🛡️-yetkili-chat', '📝-log', '📂-arşiv']) await createCh(n, c5.id);
    }
});

client.login(process.env.TOKEN);
