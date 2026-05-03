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
const WELCOME_CHANNEL_ID = "1500414696170459297"; // Senin verdiğin kanal ID'si

// --- 1. HOŞ GELDİN SİSTEMİ (SABİT ID) ---
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return console.log("❌ Hoş geldin kanalı bulunamadı!");

    const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎉 Bir Kahraman Geldi!")
        .setDescription(`Selam ${member}, **Castivol İmparatorluğu**'na hoş geldin! \n\nSeninle birlikte **${member.guild.memberCount}** kişi olduk. Gücümüze güç kattın! ⚔️`)
        .setColor("#FFD700")
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: "Castivol Hoş Geldin Sistemi" });

    channel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
});

client.on('ready', () => {
    client.user.setActivity('🛡️ Castivol İmparatorluğu', { type: ActivityType.Watching });
    console.log(`🛡️ Castivol v10.0 Aktif! Kanal ID Sabitlendi.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Yetki: 🛡️ Castivol rolü veya Yönetici
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // --- KOMUTLAR ---

    if (command === "kurallar") {
        const rulesEmbed = new EmbedBuilder()
            .setTitle("📜 Sunucu Kuralları")
            .setColor("Red")
            .setDescription("1. Küfür/Taciz yasaktır.\n2. Reklam yasaktır.\n3. Siyaset yasaktır.\n4. Patlatma tehdidi BAN sebebidir.\n5. Yetkililere saygı esastır.")
            .setFooter({ text: "Castivol Adalet Sistemi" });
        return message.channel.send({ embeds: [rulesEmbed] });
    }

    if (command === "ticket-kur") {
        if (!hasAuthority) return;
        const embed = new EmbedBuilder().setTitle("🎫 Destek Merkezi").setDescription("Yardım için butona tıkla!").setColor("Blue");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_ac').setLabel('Destek Aç').setStyle(ButtonStyle.Primary).setEmoji('📩'));
        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (command === "duyuru") {
        if (!hasAuthority) return;
        const text = args.join(" ");
        if (!text) return;
        const embed = new EmbedBuilder().setTitle("📢 DUYURU").setDescription(text).setColor("Gold").setTimestamp();
        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    if (command === "sil") {
        if (!hasAuthority) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(() => {});
        message.channel.send(`🧹 **${sayi}** mesaj uçuruldu.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return;
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger));
        message.channel.send({ content: "🚨 Sunucuyu baştan aşağı kurmak için butona bas!", components: [btn] });
    }

    if (command === "yardım") {
        const h = new EmbedBuilder().setTitle("🛠️ Komutlar").setColor("White").addFields(
            { name: "🛡️ Yetkili", value: "`!kur`, `!ticket-kur`, `!duyuru`, `!sil`" },
            { name: "👤 Üye", value: "`!kurallar`, `!profil`, `!oyla`, `!yazıtura`" }
        );
        return message.channel.send({ embeds: [h] });
    }
});

// --- ETKİLEŞİMLER (BUTONLAR) ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 'ticket_ac') {
        const ticketChannel = await i.guild.channels.create({
            name: `ticket-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ]
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Kapat').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ content: `${i.user} Hoş geldin, yetkililer burada olacak.`, components: [row] });
        return i.reply({ content: `✅ Ticket açıldı: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal siliniyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 3000);
    }

    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return;
        await i.reply({ content: "🛠️ İnşaat başladı...", ephemeral: true });
        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});

        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });

        const c1 = await createCat('── BİLGİ ──');
        await createCh('📢-duyuru', c1.id); await createCh('📜-kurallar', c1.id); await createCh('🎫-ticket-merkezi', c1.id);
        
        const c2 = await createCat('── SOSYAL ──');
        for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım']) await createCh(n, c2.id);

        const c3 = await createCat('── SAVAŞ ──');
        for (const n of ['⚔️-savaş-duyuru', '🛡️-kadro', '📊-istatistik']) await createCh(n, c3.id);

        const c4 = await createCat('── SESLİ ──');
        for (const n of ['🔊-Genel', '🎮-Oyun', '🎵-Müzik', '💤-AFK']) await createCh(n, c4.id, ChannelType.GuildVoice);
    }
});

client.login(process.env.TOKEN);
