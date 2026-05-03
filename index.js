const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, ActivityType, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = "!";
const WELCOME_CHANNEL_ID = "1500414696170459297"; 

// --- 1. HOŞ GELDİN SİSTEMİ ---
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;
    const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎉 Bir Kahraman Geldi!")
        .setDescription(`Selam ${member}, **Castivol İmparatorluğu**'na hoş geldin! \n\nSeninle birlikte **${member.guild.memberCount}** kişi olduk. 🔥`)
        .setColor("#FFD700")
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    channel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
});

client.on('ready', () => {
    client.user.setActivity('🛡️ Castivol İmparatorluğu', { type: ActivityType.Watching });
    console.log(`🛡️ Castivol v12.0 Aktif! Tüm komutlar fixlendi.`);
});

// --- 2. KOMUTLAR (DÜZELTİLDİ) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // ❓ YARDIM
    if (command === "yardım") {
        const h = new EmbedBuilder().setTitle("🛠️ Castivol Komutları").setColor("White").addFields(
            { name: "🛡️ Yetkili", value: "`!kur`, `!ticket-kur`, `!duyuru`, `!sil`" },
            { name: "👤 Üye", value: "`!kurallar`, `!profil`, `!oyla`, `!yazıtura`" }
        );
        return message.channel.send({ embeds: [h] });
    }

    // 📜 KURALLAR
    if (command === "kurallar") {
        const rulesEmbed = new EmbedBuilder()
            .setTitle("📜 Sunucu Kuralları")
            .setColor("Red")
            .setDescription("1. Küfür/Taciz yasaktır.\n2. Reklam yasaktır.\n3. Siyaset yasaktır.\n4. Patlatma tehdidi BAN sebebidir.\n5. Yetkililere saygı esastır.");
        return message.channel.send({ embeds: [rulesEmbed] });
    }

    // 🎫 TICKET KUR (YENİ KATEGORİLER)
    if (command === "ticket-kur") {
        if (!hasAuthority) return message.reply("❌ Yetkin yok kanka.");
        const ticketEmbed = new EmbedBuilder()
            .setAuthor({ name: "Castivol Destek", iconURL: client.user.displayAvatarURL() })
            .setTitle("Destek Talebi Oluştur")
            .setDescription("Kategori seçin ve talebinizi oluşturun.")
            .setColor("#2f3136")
            .addFields(
                { name: "📑 | Kurallar", value: "• Boş yere talep açmayın.\n• Kanıtlarınızı hazır bulundurun." },
                { name: "🕒 | Saatler", value: "• 7/24 Aktif Destek Sistemi" }
            );

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('Bir destek kategorisi seçin!')
                .addOptions([
                    { label: 'Merge', value: 'merge', emoji: '🤝' },
                    { label: 'Partnerlik', value: 'partnerlik', emoji: '💎' },
                    { label: 'Klan Alım', value: 'klan_alim', emoji: '⚔️' },
                    { label: 'Kanıt', value: 'kanit', emoji: '📸' }
                ])
        );
        return message.channel.send({ embeds: [ticketEmbed], components: [menu] });
    }

    // 📢 DUYURU
    if (command === "duyuru") {
        if (!hasAuthority) return;
        const text = args.join(" ");
        if (!text) return;
        const embed = new EmbedBuilder().setTitle("📢 DUYURU").setDescription(text).setColor("Gold");
        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 🧹 SİL
    if (command === "sil") {
        if (!hasAuthority) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(() => {});
        return message.channel.send(`🧹 **${sayi}** mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    // 🏗️ KUR
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return;
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 Sunucuyu kurmak için onayla!", components: [btn] });
    }
});

// --- 3. ETKİLEŞİMLER (BUTONLAR VE MENÜ) ---
client.on('interactionCreate', async (i) => {
    // TICKET MENÜSÜ
    if (i.isStringSelectMenu() && i.customId === 'ticket_menu') {
        const cat = i.values[0];
        const ticketChannel = await i.guild.channels.create({
            name: `${cat}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ]
        });

        const closeBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Kapat').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ content: `🛎️ **Yeni Talep!**\n**Kategori:** ${cat.toUpperCase()}\n**Açan:** ${i.user}`, components: [closeBtn] });
        return i.reply({ content: `✅ Kanal açıldı: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (!i.isButton()) return;

    // TICKET KAPAT
    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal siliniyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 3000);
    }

    // MEGA KUR (HIZLI)
    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return;
        await i.reply({ content: "🛠️ Kuruluyor...", ephemeral: true });
        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});
        const createCat = async (n) => await i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });
        const createCh = async (n, p, t = ChannelType.GuildText) => await i.guild.channels.create({ name: n, parent: p, type: t });
        
        const c1 = await createCat('── BİLGİ ──');
        await createCh('📢-duyuru', c1.id); await createCh('📜-kurallar', c1.id); await createCh('🎫-destek', c1.id);
        const c2 = await createCat('── SOHBET ──');
        await createCh('💬-sohbet', c2.id); await createCh('📷-medya', c2.id);
    }
});

client.login(process.env.TOKEN);
