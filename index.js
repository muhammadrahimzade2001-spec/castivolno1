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
    console.log(`🛡️ v9.0 Yayında! Ticket ve Kur sistemleri stabilize edildi.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Yetki Kontrolü (🛡️ Castivol Rolü veya Yönetici)
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // --- KOMUTLAR ---

    if (command === "kurallar") {
        const rulesEmbed = new EmbedBuilder()
            .setTitle("📜 Sunucu Kuralları")
            .setColor("Red")
            .setDescription("1. Küfür ve taciz yasaktır.\n2. Reklam yasaktır.\n3. Siyaset ve din tartışması yasaktır.\n4. Spam yasaktır.\n5. Yetkililere saygı zorunludur.")
            .setFooter({ text: "Castivol Adalet Sistemi" });
        return message.channel.send({ embeds: [rulesEmbed] });
    }

    if (command === "yardım") {
        const h = new EmbedBuilder()
            .setTitle("🛠️ Castivol Komut Listesi")
            .setColor("White")
            .addFields(
                { name: "🛡️ Yetkili", value: "`!kur`, `!ticket-kur`, `!duyuru`, `!sil`, `!ban`, `!kick`" },
                { name: "👤 Üye", value: "`!kurallar`, `!profil`, `!yazıtura`, `!oyla`" }
            );
        return message.channel.send({ embeds: [h] });
    }

    if (command === "ticket-kur") {
        if (!hasAuthority) return message.reply("❌ Yetkin yok.");
        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek Merkezi")
            .setDescription("Sorunlarını çözmek için aşağıdaki butona tıkla!")
            .setColor("Blue");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_ac').setLabel('Destek Talebi Aç').setStyle(ButtonStyle.Primary).setEmoji('📩')
        );
        return message.channel.send({ embeds: [embed], components: [row] });
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
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(() => {});
        message.channel.send(`🧹 **${sayi}** mesaj silindi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Sadece Owner!");
        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger)
        );
        message.channel.send({ content: "🚨 Sunucuyu 30 kanalla kurmak için onayla!", components: [btn] });
    }
});

// --- BUTON İŞLEMLERİ (ASIL DÜZELTME BURASI) ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    // TICKET AÇMA
    if (i.customId === 'ticket_ac') {
        const channelName = `ticket-${i.user.username}`;
        const ticketChannel = await i.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek Hattı")
            .setDescription(`Selam ${i.user}, yetkililer gelene kadar sorununu yazabilirsin.`)
            .setColor("Green");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: `✅ Kanal açıldı: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // TICKET KAPATMA
    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal 5 saniye içinde siliniyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }

    // MEGA KURULUM
    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "Yetkin yok.", ephemeral: true });
        await i.reply({ content: "🛠️ Kanallar siliniyor ve imparatorluk kuruluyor...", ephemeral: true });

        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});

        // Kategoriler ve Kanallar
        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });

        const c1 = await createCat('── BİLGİ ──');
        await createCh('📢-duyuru', c1.id); await createCh('📜-kurallar', c1.id); await createCh('🎫-ticket-merkezi', c1.id);

        const c2 = await createCat('── SOSYAL ──');
        for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım', '🎰-kumar']) await createCh(n, c2.id);

        const c3 = await createCat('── SAVAŞ ──');
        for (const n of ['⚔️-savaş-duyuru', '🛡️-kadro', '📊-istatistik']) await createCh(n, c3.id);

        const c4 = await createCat('── SESLİ ──');
        for (const n of ['🔊-Genel', '🎮-Oyun', '🎵-Müzik', '💤-AFK']) await createCh(n, c4.id, ChannelType.GuildVoice);
    }
});

client.login(process.env.TOKEN);
