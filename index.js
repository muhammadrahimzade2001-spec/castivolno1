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
    console.log(`🛡️ Castivol v6.0 İmparatorluğu Başlatıldı!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 📜 YARDIM PANELİ
    if (command === "yardım") {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Castivol v6.0 Komut Listesi")
            .setColor("#000000")
            .addFields(
                { name: '🏗️ Ana Sistem', value: '`!kur` - Sunucuyu sıfırlar ve düzeni kurar.' },
                { name: '🧹 Moderasyon', value: '`!sil [sayı]` - Belirtilen sayıda mesajı siler.' },
                { name: '⚔️ Savaş', value: '`!savaş` - Acil durum savaş çağrısı yapar.' },
                { name: '🛰️ Sistem', value: '`!ping` - Bot hızını ölçer.' }
            )
            .setFooter({ text: "Castivol Management" });
        return message.channel.send({ embeds: [embed] });
    }

    // 🏗️ GELİŞMİŞ KUR KOMUTU
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Bu komutu sadece **Owner** kullanabilir.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('onay_kur').setLabel('EVET, KUR').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('iptal_kur').setLabel('HAYIR, İPTAL').setStyle(ButtonStyle.Secondary)
        );

        return message.channel.send({ 
            content: "🚨 **DİKKAT!** Sunucu tamamen sıfırlanacak ve Castivol düzeni kurulacak. Onaylıyor musun?", 
            components: [row] 
        });
    }

    // 🧹 SİL KOMUTU
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("Yetkin yok kanka.");
        const sayi = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(sayi > 100 ? 100 : sayi, true).catch(err => message.reply("14 günden eski mesajları silemem kanka."));
        return message.channel.send(`🧹 **${sayi}** mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // ⚔️ SAVAŞ KOMUTU
    if (command === "savaş") {
        const warEmbed = new EmbedBuilder()
            .setTitle("⚔️ CASTIVOL SAVAŞ ALARMI!")
            .setDescription("Tüm kadro aktif olsun, operasyon başlıyor! @everyone")
            .setColor("DarkRed")
            .setImage("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXF4ZzZ4eXN4ZzZ4eXN4ZzZ4eXN4ZzZ4eXN4ZzZ4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2z6OlbAisS6Z2/giphy.gif");
        return message.channel.send({ content: "@everyone", embeds: [warEmbed] });
    }

    // 🛰️ PİNG
    if (command === "ping") return message.reply(`🛰️ Gecikme: **${client.ws.ping}ms**`);
});

// 🖱️ ETKİLEŞİMLER (BUTONLAR)
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 'onay_kur') {
        await i.reply({ content: "🛠️ İmparatorluk inşası başladı, bu biraz sürebilir...", ephemeral: true });

        // 🌪️ TÜM KANALLARI SİL
        const channels = await i.guild.channels.fetch();
        for (const c of channels.values()) {
            await c.delete().catch(() => {});
        }

        // 👑 ROLLERİ OLUŞTUR (Hiyerarşik)
        const roles = [
            { n: '🛡️ Castivol', c: '#000000' },
            { n: '👑 owner', c: '#ff0000' },
            { n: '👑 founder', c: '#910000' },
            { n: '⚔️ co founder', c: '#ff4a4a' },
            { n: '💎 admin', c: '#2ecc71' },
            { n: '👤 üye', c: '#bdc3c7' }
        ];

        for (const r of roles) {
            await i.guild.roles.create({ name: r.n, color: r.c, hoist: true }).catch(() => {});
        }

        // 📂 KATEGORİ VE KANALLAR
        const category = await i.guild.channels.create({ name: '─── CASTIVOL ───', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '💬-sohbet', parent: category.id });
        await i.guild.channels.create({ name: '📢-duyuru', parent: category.id });
        await i.guild.channels.create({ name: '🧧-işlem-merkezi', parent: category.id });

    } else if (i.customId === 'iptal_kur') {
        await i.update({ content: "❌ Kurulum iptal edildi.", components: [], embeds: [] });
    }
});

client.login(process.env.TOKEN);
