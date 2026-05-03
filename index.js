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

// --- BOT HAZIR ---
client.on('ready', () => {
    client.user.setActivity('🛡️ Castivol İmparatorluğu', { type: ActivityType.Competing });
    console.log(`🛡️ Castivol Mega v7.0 Aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 🔑 YETKİ KONTROLÜ (🛡️ Castivol Rolü veya Yönetici)
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // ❓ YARDIM KOMUTU
    if (command === "yardım") {
        const helpEmbed = new EmbedBuilder()
            .setTitle("🛡️ Castivol Yönetim Paneli")
            .setColor("#2f3136")
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription("Bot üzerindeki tüm yetkili komutları aşağıda listelenmiştir.")
            .addFields(
                { name: '🏗️ Sistem', value: '`!kur`: Sunucuyu 30+ kanal ile sıfırdan kurar.\n`!ticket-kur`: Destek sistemini başlatır.' },
                { name: '🔨 Moderasyon', value: '`!sil [miktar]`: Belirtilen sayıda mesajı temizler.\n`!duyuru [mesaj]`: Şık bir duyuru paneli açar.' },
                { name: '⚙️ Bilgi', value: 'Komutları sadece **🛡️ Castivol** rolü ve Yöneticiler kullanabilir.' }
            )
            .setFooter({ text: 'Castivol Management System', iconURL: message.guild.iconURL() });

        return message.channel.send({ embeds: [helpEmbed] });
    }

    // 🎫 TICKET PANELİ KURMA
    if (command === "ticket-kur") {
        if (!hasAuthority) return message.reply("❌ Bu komutu kullanmak için **🛡️ Castivol** yetkisine sahip olmalısın kanka.");
        
        const embed = new EmbedBuilder()
            .setTitle("🎫 Castivol Destek Merkezi")
            .setDescription("Bir sorun mu var? Yetkililerle görüşmek için aşağıdaki butona tıkla ve talep oluştur!")
            .setColor("#5865F2")
            .setImage("https://i.imgur.com/your_image_here.png") // Opsiyonel: Buraya bir banner koyabilirsin
            .setFooter({ text: "Castivol Güvencesiyle" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_ac').setLabel('Destek Talebi Aç').setStyle(ButtonStyle.Secondary).setEmoji('📩')
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // 📢 DUYURU KOMUTU
    if (command === "duyuru") {
        if (!hasAuthority) return message.reply("❌ Yetkin yok kanka.");
        const text = args.join(" ");
        if (!text) return message.reply("❌ Ne duyuracağız? Metin yaz.");

        const embed = new EmbedBuilder()
            .setTitle("📢 Castivol İmparatorluk Duyurusu")
            .setDescription(`\n${text}\n`)
            .setColor("#FEE75C")
            .setTimestamp()
            .setFooter({ text: `Duyuruyu Yapan: ${message.author.username}` });

        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 🔨 MODERASYON (SİL)
    if (command === "sil") {
        if (!hasAuthority) return;
        const sayi = parseInt(args[0]) || 50;
        if (sayi > 100) return message.reply("❌ Tek seferde en fazla 100 mesaj silebilirsin.");

        await message.channel.bulkDelete(sayi, true).catch(() => {});
        return message.channel.send(`🧹 **${sayi}** mesaj Castivol tarafından süpürüldü.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // 🏗️ MEGA KUR (OWNER)
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Bu komut sunucuyu sıfırladığı için sadece **Sunucu Sahibi**ne özeldir.");
        
        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu İnşa Et').setStyle(ButtonStyle.Danger).setEmoji('🏗️'),
            new ButtonBuilder().setCustomId('kur_iptal').setLabel('İptal').setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ content: "🚨 **DİKKAT:** Sunucu tamamen sıfırlanıp 30+ kanal ve yeni rollerle baştan kurulacak. Onaylıyor musun?", components: [btn] });
    }
});

// --- ETKİLEŞİMLER ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 'ticket_ac') {
        const channelName = `ticket-${i.user.username}`;
        const exists = i.guild.channels.cache.find(ch => ch.name.includes(i.user.username.toLowerCase()));
        if (exists) return i.reply({ content: "❌ Zaten bir destek talebin açık kanka.", ephemeral: true });

        const ticketChannel = await i.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: i.guild.roles.cache.find(r => r.name === '🛡️ Castivol')?.id || i.guild.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎫 Destek Hattı")
            .setDescription(`Selam ${i.user}, talebin başarıyla oluşturuldu. **🛡️ Castivol** yetkilileri seninle ilgilenecek.`)
            .setColor("#57F287");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: `✅ Kanal oluşturuldu: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal 5 saniye içinde kalıcı olarak siliniyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }

    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "Sadece Owner yapabilir kanka.", ephemeral: true });
        
        await i.reply({ content: "🛠️ İmparatorluk inşası başladı, tüm kanallar siliniyor...", ephemeral: true });

        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});

        // Roller Oluşturma (🛡️ Castivol Rolünü de Ekler)
        const roles = [
            { name: '🛡️ Castivol', color: '#000000', permissions: [PermissionsBitField.Flags.Administrator] },
            { name: '👑 Owner', color: '#ff0000' },
            { name: '👤 Üye', color: '#ffffff' }
        ];
        for (const r of roles) await i.guild.roles.create({ name: r.name, color: r.color, permissions: r.permissions || [], hoist: true });

        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });

        // --- 30+ KANAL DÜZENİ ---
        const cat1 = await createCat('── BİLGİ ──');
        await createCh('📢-duyuru', cat1.id);
        await createCh('📜-kurallar', cat1.id);
        await createCh('🎫-ticket-merkezi', cat1.id);
        await createCh('🚀-boost', cat1.id);

        const cat2 = await createCat('── SOSYAL ──');
        for (const n of ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım', '🎰-kumar', '🕊️-itiraf', '📈-seviye']) await createCh(n, cat2.id);

        const cat3 = await createCat('── SAVAŞ ──');
        for (const n of ['⚔️-savaş-duyuru', '🛡️-kadro', '📊-istatistik', '🎖️-başarılar', '🛑-cezalılar']) await createCh(n, cat3.id);

        const cat4 = await createCat('── SESLİ ──');
        for (const n of ['🔊-Genel-1', '🔊-Genel-2', '🎮-Oyun', '🎵-Müzik-1', '🎵-Müzik-2', '💤-AFK']) await createCh(n, cat4.id, ChannelType.GuildVoice);

        const cat5 = await createCat('── YÖNETİM ──');
        for (const n of ['📁-log-merkezi', '🛡️-yetkili-chat', '🎤-toplantı', '📁-arşiv']) await createCh(n, cat5.id);
    }

    if (i.customId === 'kur_iptal') {
        await i.update({ content: "❌ İşlem iptal edildi.", components: [] });
    }
});

client.login(process.env.TOKEN);
