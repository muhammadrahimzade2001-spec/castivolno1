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
    console.log(`🛡️ Castivol Mega v6.0 Aktif! Ticket Sistemi Yüklendi.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 🎫 TICKET PANELİ KURMA (Sadece Yetkili)
    if (command === "ticket-kur") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        const embed = new EmbedBuilder()
            .setTitle("🎫 Castivol Destek Merkezi")
            .setDescription("Bir sorun mu var? Yetkililerle görüşmek için aşağıdaki butona tıkla ve talep oluştur!")
            .setColor("Blue")
            .setFooter({ text: "Castivol Ticket Sistemi" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_ac').setLabel('Destek Talebi Aç').setStyle(ButtonStyle.Primary).setEmoji('📩')
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // 📢 DUYURU KOMUTU
    if (command === "duyuru") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) return message.reply("❌ Yetkin yok.");
        const text = args.join(" ");
        if (!text) return message.reply("❌ Metin yazmadın.");
        const embed = new EmbedBuilder().setTitle("📢 DUYURU").setDescription(text).setColor("Gold").setTimestamp();
        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 🔨 MODERASYON (SİL)
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(() => {});
        return message.channel.send(`🧹 **${sayi}** mesaj silindi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    // 🏗️ MEGA KUR (OWNER)
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Sadece Owner!");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur (30+ Kanal)').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 Sunucu sıfırlanacak, onaylıyor musun?", components: [btn] });
    }
});

// --- ETKİLEŞİMLER (BUTONLAR) ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    // 📩 TICKET AÇMA İŞLEMİ
    if (i.customId === 'ticket_ac') {
        const channelName = `ticket-${i.user.username}`;
        const exists = i.guild.channels.cache.find(ch => ch.name === channelName.toLowerCase());
        if (exists) return i.reply({ content: "❌ Zaten açık bir talebin var kanka: " + `<#${exists.id}>`, ephemeral: true });

        const ticketChannel = await i.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek Talebi")
            .setDescription(`Selam ${i.user}, yetkililer birazdan burada olacak. Sorununu yazabilirsin.\n\nTalebi kapatmak için aşağıdaki butona tıkla.`)
            .setColor("Green");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: `✅ Talebin oluşturuldu: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // 🔒 TICKET KAPATMA
    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal 5 saniye içinde siliniyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }

    // 🏗️ MEGA KURULUM BUTONU (AYNI SİSTEM)
    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "Yetkin yok.", ephemeral: true });
        await i.reply({ content: "🛠️ İnşaat başladı...", ephemeral: true });

        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});

        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });

        // Temel Kategoriler
        const c1 = await createCat('── BİLGİ ──');
        await createCh('📢-duyuru', c1.id);
        await createCh('📜-kurallar', c1.id);
        await createCh('🎫-ticket-merkezi', c1.id); // Ticket kanalı buraya gelecek

        const c2 = await createCat('── SOSYAL ──');
        for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım', '🎰-kumar', '🕊️-itiraf']) await createCh(n, c2.id);

        const c3 = await createCat('── SAVAŞ ──');
        for (const n of ['⚔️-savaş-duyuru', '🛡️-kadro', '📊-istatistik', '🎖️-başarılar']) await createCh(n, c3.id);

        const c4 = await createCat('── SESLİ ──');
        for (const n of ['🔊-Genel', '🎮-Oyun', '🎵-Müzik', '💤-AFK']) await createCh(n, c4.id, ChannelType.GuildVoice);
        
        // ... (Diğer kanallar döngüyle eklenebilir)
    }
});

client.login(process.env.TOKEN);
