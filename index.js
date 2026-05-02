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
    console.log(`🛡️ Castivol İmparatorluğu Komut Sistemi Yüklendi! Bot: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. YARDIM KOMUTU
    if (command === "yardım") {
        const embed = new EmbedBuilder()
            .setTitle("📜 Castivol Komut Rehberi")
            .setColor("#000000")
            .addFields(
                { name: '🛠️ Moderasyon', value: '`!sil`, `!ban`, `!kick`, `!kilit`' },
                { name: '⚔️ Klan/Savaş', value: '`!savaş`, `!toplan`, `!duyuru`' },
                { name: 'ℹ️ Bilgi & Eğlence', value: '`!avatar`, `!sunucu`, `!ping`, `!yaz`' },
                { name: '🏗️ Sistem', value: '`!kur` (Owner Özel)' }
            );
        return message.channel.send({ embeds: [embed] });
    }

    // 2. SİL KOMUTU (Gelişmiş)
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("❌ Yetkin yok kanka.");
        const sayi = parseInt(args[0]);
        if (!sayi || sayi < 1 || sayi > 100) return message.reply("❌ 1-100 arası bir sayı yazmalısın.");
        await message.channel.bulkDelete(sayi, true);
        return message.channel.send(`🧹 **${sayi}** mesaj uçuruldu!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // 3. BAN KOMUTU
    if (command === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Yetkin yok.");
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Kimi banlayacağız? Etiketle kanka.");
        await user.ban({ reason: 'Castivol Adalet Sistemi' });
        return message.channel.send(`🔨 **${user.user.tag}** sunucudan infaz edildi!`);
    }

    // 4. KICK KOMUTU
    if (command === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("❌ Yetkin yok.");
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Kimi atacaksın?");
        await user.kick();
        return message.channel.send(`👞 **${user.user.tag}** sunucudan tekmelendi!`);
    }

    // 5. KİLİT KOMUTU (Kanalı Kapatır)
    if (command === "kilit") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply("❌ Yetkin yok.");
        message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        return message.channel.send("🔒 Kanal konuşmaya kapatıldı.");
    }

    // 6. SAVAŞ ÇAĞRISI
    if (command === "savaş") {
        const embed = new EmbedBuilder()
            .setTitle("⚔️ SAVAŞ ALARMI!")
            .setDescription(`${message.author} tarafından savaş başlatıldı! Herkes mevzilere! @everyone`)
            .setColor("DarkRed")
            .setImage("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmY4bmN3b3ZpZHR6eHR4eHR4eHR4eHR4eHR4eHR4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2z6OlbAisS6Z2/giphy.gif");
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 7. TOPLAN KOMUTU
    if (command === "toplan") {
        return message.channel.send("🚨 **TOPLANIN LAN!** Castivol kadrosu acil toplantı moduna geçsin! @here");
    }

    // 8. AVATAR KOMUTU
    if (command === "avatar") {
        const user = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`${user.username} adlı kullanıcının resmi`)
            .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setColor("Random");
        return message.channel.send({ embeds: [embed] });
    }

    // 9. SUNUCU BİLGİ
    if (command === "sunucu") {
        const embed = new EmbedBuilder()
            .setTitle(message.guild.name)
            .addFields(
                { name: 'Üye Sayısı', value: `${message.guild.memberCount}`, inline: true },
                { name: 'Kanal Sayısı', value: `${message.guild.channels.cache.size}`, inline: true }
            )
            .setThumbnail(message.guild.iconURL())
            .setColor("Blue");
        return message.channel.send({ embeds: [embed] });
    }

    // 10. YAZ KOMUTU (Bota yazı yazdırır)
    if (command === "yaz") {
        const mesaj = args.join(" ");
        if (!mesaj) return message.reply("Ne yazayım kanka?");
        message.delete();
        return message.channel.send(mesaj);
    }

    // 11. PİNG
    if (command === "ping") {
        return message.reply(`🛰️ Sistem Hızı: **${client.ws.ping}ms**`);
    }

    // KUR KOMUTU (SABİT)
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Sadece **Owner** kurabilir.");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu İnşa Et').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 **CASTIVOL MEGA KURULUM** butonuna bas ve arkana yaslan.", components: [btn] });
    }
});

// --- KURULUM BUTONU (KANALLAR VE ROLLER) ---
client.on('interactionCreate', async (i) => {
    if (i.customId === 'mega_kur') {
        try {
            await i.reply({ content: "🛠️ Dev inşaat başladı, tüm kanallar ve roller baştan aşağı kuruluyor...", ephemeral: true });

            const chs = await i.guild.channels.fetch();
            for (const c of chs.values()) await c.delete().catch(() => {});
            
            const roles = [
                { n: '🛡️ Castivol', c: '#000000' }, { n: '👑 owner', c: '#ff0000' }, { n: '👑 founder', c: '#910000' },
                { n: '🎖️ yönetici', c: '#e67e22' }, { n: '💎 admin', c: '#2ecc71' }, { n: '👤 üye', c: '#bdc3c7' }
            ];
            for (const r of roles) await i.guild.roles.create({ name: r.n, color: r.c, hoist: true });

            const createCat = async (name) => await i.guild.channels.create({ name: name, type: ChannelType.GuildCategory });
            const createCh = async (name, parentId, type = ChannelType.GuildText) => await i.guild.channels.create({ name: name, parent: parentId, type: type });

            const c1 = await createCat('─── BİLGİ ───');
            for (const n of ['📢-duyuru', '📜-kurallar', '🧧-işlem-merkezi']) await createCh(n, c1.id);

            const c2 = await createCat('─── SOSYAL ───');
            for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya']) await createCh(n, c2.id);

            const c3 = await createCat('─── SAVAŞ MERKEZİ ───');
            for (const n of ['⚔️-savaş-duyuru', '📊-istatistik']) await createCh(n, c3.id);

            const c4 = await createCat('─── SESLİ ALAN ───');
            for (const n of ['🔊-Genel-Sohbet', '🎮-Oyun-Odası']) await createCh(n, c4.id, ChannelType.GuildVoice);

        } catch (e) { console.log("Hata:", e); }
    }
});

client.login(process.env.TOKEN);
