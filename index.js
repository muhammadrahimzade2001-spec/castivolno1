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
    console.log(`🛡️ Castivol v6.0 İmparatorluğu Aktif! Bot: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- 📜 YARDIM KOMUTU ---
    if (command === "yardım") {
        const helpEmbed = new EmbedBuilder()
            .setTitle("🛡️ Castivol v6.0 Komut Paneli")
            .setColor("#000000")
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🏗️ Ana Komutlar', value: '`!kur` - Sunucuyu sıfırlar ve Castivol düzenini kurar.\n`!sil [sayı]` - Belirtilen miktarda mesajı temizler.' },
                { name: '📢 Duyuru Komutları', value: '`!duyuru [mesaj]` - Herkese etiket atarak duyuru yapar.\n`!savaş` - Acil durum savaş çağrısı başlatır.' },
                { name: 'ℹ️ Bilgi', value: '`!ping` - Botun gecikmesini gösterir.\n`!avatar` - Profil fotoğrafınızı gösterir.' }
            )
            .setFooter({ text: 'Castivol Management System' });
        
        return message.channel.send({ embeds: [helpEmbed] });
    }

    // --- 🏗️ KUR KOMUTU (GELİŞTİRİLDİ) ---
    if (command === "kur") {
        // Güvenlik: Sadece sunucu sahibi
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Bu işlem için **Owner** olman lazım kanka.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('onay').setLabel('İnşayı Başlat').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('iptal').setLabel('İptal Et').setStyle(ButtonStyle.Secondary)
        );

        const kurEmbed = new EmbedBuilder()
            .setTitle("⚠️ Sunucu Yapılandırması")
            .setDescription("Bu işlem tüm kanalları ve rolleri silecek. **Castivol İmparatorluk** düzeni kurulacak. Onaylıyor musun?")
            .setColor("Red");

        return message.channel.send({ embeds: [kurEmbed], components: [row] });
    }

    // --- 🧹 SİL KOMUTU ---
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const count = parseInt(args[0]) || 100;
        await message.channel.bulkDelete(count > 100 ? 100 : count, true);
        return message.channel.send(`🧹 **${count}** mesaj süpürüldü.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- ⚔️ SAVAŞ KOMUTU ---
    if (command === "savaş") {
        const warEmbed = new EmbedBuilder()
            .setTitle("⚔️ ACİL DURUM: SAVAŞ ÇAĞRISI")
            .setDescription("Tüm kadro toplanın! Castivol saldırı altında veya operasyon başlıyor!")
            .setColor("DarkRed")
            .setImage("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXF4ZzZ4eXN4ZzZ4eXN4ZzZ4eXN4ZzZ4eXN4ZzZ4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2z6OlbAisS6Z2/giphy.gif");
        
        return message.channel.send({ content: "@everyone", embeds: [warEmbed] });
    }
});

// --- 🖱️ BUTON ETKİLEŞİMLERİ ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 'onay') {
        await i.reply({ content: "🛠️ Eski düzen yıkılıyor, Castivol inşa ediliyor...", ephemeral: true });

        // Kanalları sil
        const channels = await i.guild.channels.fetch();
        for (const c of channels.values()) await c.delete().catch(() => {});
        
        // Rolleri sil (Botun rolünün altındakileri siler)
        const roles = await i.guild.roles.fetch();
        for (const r of roles.values()) {
            if (!r.managed && r.name !== "@everyone") await r.delete().catch(() => {});
        }

        // Yeni Roller
        const roleData = [
            { n: '🛡️ Castivol', c: '#000000' },
            { n: '👑 owner', c: '#ff0000' }, 
            { n: '👑 founder', c: '#990000' },
            { n: '⚔️ co founder', c: '#ff4d4d' },
            { n: '👤 üye', c: '#bdc3c7' }
        ];

        for (const r of roleData) {
            await i.guild.roles.create({ name: r.n, color: r.c, hoist: true });
        }

        // Yeni Kanallar
        const cat = await i.guild.channels.create({ name: '─── CASTIVOL ───', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '💬-sohbet', parent: cat.id });
        await i.guild.channels.create({ name: '📢-duyurular', parent: cat.id });
        await i.guild.channels.create({ name: '🧧-işlem-merkezi', parent: cat.id });

    } else if (i.customId === 'iptal') {
        await i.update({ content: "❌ İşlem iptal edildi.", embeds: [], components: [] });
    }
});

client.login(process.env.TOKEN);
