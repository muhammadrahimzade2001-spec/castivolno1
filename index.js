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

// --- HOŞ GELDİN SİSTEMİ ---
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
    console.log(`🛡️ Castivol v11.0 | Profesyonel Ticket Sistemi Aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const hasAuthority = message.member.roles.cache.some(role => role.name === '🛡️ Castivol') || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // --- YENİ TICKET KUR KOMUTU ---
    if (command === "ticket-kur") {
        if (!hasAuthority) return;

        const ticketEmbed = new EmbedBuilder()
            .setAuthor({ name: "Castivol Destek", iconURL: client.user.displayAvatarURL() })
            .setTitle("Destek Talebi Oluştur")
            .setDescription("Kategori seçin ve talebinizi oluşturun.")
            .setColor("#2f3136")
            .setThumbnail("https://i.imgur.com/8N99GfS.png") // Buraya istediğin logoyu koyabilirsin
            .addFields(
                { name: "📑 | Destek Talebi Kuralları", value: "• Yetkililere sabırsız bir şekilde etiket atmayınız.\n• Sorununuz hakkında yeterli kanıt sunmanız zorunludur, aksi takdirde size yardımcı olamayız.\n\n**Kurallara uyulmazsa talebiniz kapatılır.**" },
                { name: "🕒 | Destek Talebi Saatleri", value: "• Hafta içi: **14:00 - 01:00**\n• Hafta sonu: **10:00 - 02:00**" }
            )
            .setFooter({ text: `Castivol Destek • ${new Date().toLocaleDateString()}` });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('Bir destek kategorisi seçin!')
                .addOptions([
                    { label: 'Küfür', value: 'kufur', emoji: '🤬' },
                    { label: 'Hile', value: 'hile', emoji: '🚫' },
                    { label: 'Bug', value: 'bug', emoji: '🐛' },
                    { label: 'Sosyal Medya', value: 'sosyal', emoji: '📱' },
                    { label: 'Kredi', value: 'kredi', emoji: '💳' },
                ])
        );

        return message.channel.send({ embeds: [ticketEmbed], components: [menu] });
    }

    // --- DİĞER KOMUTLAR (AYNI KALDI) ---
    if (command === "kurallar") {
        const rulesEmbed = new EmbedBuilder().setTitle("📜 Kurallar").setColor("Red").setDescription("1. Saygı, 2. Reklam Yasak, 3. Spam Yasak.");
        return message.channel.send({ embeds: [rulesEmbed] });
    }
    if (command === "sil") {
        if (!hasAuthority) return;
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true);
        message.channel.send(`🧹 **${sayi}** mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 2000));
    }
    if (command === "duyuru") {
        if (!hasAuthority) return;
        const text = args.join(" ");
        if (!text) return;
        const embed = new EmbedBuilder().setTitle("📢 DUYURU").setDescription(text).setColor("Gold");
        message.delete();
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return;
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger));
        message.channel.send({ content: "🚨 Sunucuyu kurmak için onayla!", components: [btn] });
    }
});

// --- ETKİLEŞİMLER (MENÜ VE BUTONLAR) ---
client.on('interactionCreate', async (i) => {
    
    // TICKET MENÜ SEÇİMİ
    if (i.isStringSelectMenu() && i.customId === 'ticket_menu') {
        const category = i.values[0];
        const ticketChannel = await i.guild.channels.create({
            name: `${category}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ]
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger));
        
        await ticketChannel.send({ 
            content: `📢 **Yeni Destek Talebi!** \n**Kategori:** ${category.toUpperCase()} \n**Açan:** ${i.user}`, 
            components: [row] 
        });

        return i.reply({ content: `✅ Talebin açıldı: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (!i.isButton()) return;

    if (i.customId === 'ticket_kapat') {
        await i.reply("🔒 Kanal 3 saniye içinde kapatılıyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 3000);
    }

    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return;
        await i.reply({ content: "🛠️ İmparatorluk inşa ediliyor...", ephemeral: true });
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
