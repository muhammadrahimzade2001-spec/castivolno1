const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, ActivityType, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Castivol Operasyon Merkezi Aktif! 🛡️'));
app.listen(process.env.PORT || 3000);

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
    console.log(`🛡️ ${client.user.tag} Castivol Operasyon Merkezi Yayında!`);
    client.user.setActivity("🛡️ Castivol Hiyerarşisini", { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const hasAuthority = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // --- 🏮 SELAMLAMA ---
    if (command === "sa") return message.reply("Aleyküm Selam Asker! Castivol saflarına hoş geldin. 🛡️");

    // --- 🧹 GELİŞMİŞ TEMİZLİK ---
    if (command === "sil" || command === "temizle") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const miktar = parseInt(args[0]) || 50;
        await message.channel.bulkDelete(miktar > 100 ? 100 : miktar, true).catch(() => {});
        return message.channel.send({ 
            embeds: [new EmbedBuilder().setDescription(`✅ **${miktar}** adet gereksiz veri imha edildi.`).setColor("Green")] 
        }).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- 📣 GELİŞMİŞ DUYURU ---
    if (command === "duyuru" || command === "savaş-duyuru") {
        if (!hasAuthority) return;
        const msg = args.join(' ');
        if (!msg) return message.reply("Duyuru içeriği boş bırakılamaz.");

        const isWar = command === "savaş-duyuru";
        const dEmbed = new EmbedBuilder()
            .setTitle(isWar ? "⚔️ ACİL DURUM: SAVAŞ ALARMI!" : "📢 RESMİ CASTIVOL DUYURUSU")
            .setDescription(msg)
            .setColor(isWar ? "#FF0000" : "#990000")
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: `Castivol Komuta Zinciri • ${message.author.username}` })
            .setTimestamp();

        message.channel.send({ content: "@everyone", embeds: [dEmbed] });
        return message.delete().catch(() => {});
    }

    // --- 📖 MENÜLÜ YARDIM SİSTEMİ (IZAKAYA STYLE) ---
    if (command === "yardım") {
        const helpEmbed = new EmbedBuilder()
            .setAuthor({ name: "Castivol Bilgi Merkezi", iconURL: client.user.displayAvatarURL() })
            .setTitle("🛡️ Operasyon Rehberine Hoş Geldiniz")
            .setDescription("Sistemleri yönetmek ve bilgi almak için aşağıdaki menüden kategori seçin.")
            .setColor("#990000")
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: "Castivol Security & Management" });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('Görüntülemek istediğiniz birimi seçin...')
                .addOptions([
                    { label: 'Yönetim Birimi', value: 'help_admin', emoji: '🛡️', description: 'Kurulum ve moderasyon araçları.' },
                    { label: 'İletişim Birimi', value: 'help_comm', emoji: '📣', description: 'Duyuru ve protokoller.' },
                    { label: 'Üye Birimi', value: 'help_user', emoji: '👥', description: 'Genel kullanım komutları.' }
                ])
        );

        return message.channel.send({ embeds: [helpEmbed], components: [row] });
    }

    // --- 🏗️ KRİTİK KURULUM ---
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("Bu işlem için tam yetkili (Owner) olmalısınız.");
        const setupEmbed = new EmbedBuilder()
            .setTitle("⚙️ SİSTEM YAPILANDIRMASI")
            .setDescription("Sunucu Castivol standartlarına göre inşa edilecektir. Bu işlem mevcut her şeyi siler!")
            .setColor("#000000");
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_setup').setLabel('İnşayı Başlat').setStyle(ButtonStyle.Danger)
        );
        return message.channel.send({ embeds: [setupEmbed], components: [row] });
    }

    // --- 🎫 TICKET KUR (GELİŞMİŞ) ---
    if (command === "ticket-kur") {
        if (!hasAuthority) return;
        const ticketEmbed = new EmbedBuilder()
            .setAuthor({ name: "Castivol İşlem Merkezi", iconURL: client.user.displayAvatarURL() })
            .setTitle("🧧 Destek ve İşlem Talebi")
            .setDescription("Yapmak istediğiniz işlemi menüden seçin. Yetkililerimiz en kısa sürede müdahale edecektir.")
            .addFields(
                { name: "🛡️ | İşlem Kuralları", value: "• Gereksiz talep açmak cezai işlem sebebidir.\n• Talebinize kanıt eklemeyi unutmayın." }
            )
            .setColor("#990000");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('tk_menu')
                .setPlaceholder('Bir işlem kategorisi seçin...')
                .addOptions([
                    { label: 'Merge (Birleşme)', value: 'merge', emoji: '🤝' },
                    { label: 'Partnerlik', value: 'partnerlik', emoji: '💎' },
                    { label: 'Yetkili Alımı', value: 'yetkili_alim', emoji: '👔' },
                    { label: 'Öneri / Destek', value: 'oneri', emoji: '💡' }
                ])
        );
        return message.channel.send({ embeds: [ticketEmbed], components: [menu] });
    }
});

// --- ETKİLEŞİMLER (INTERACTIONS) ---
client.on('interactionCreate', async (i) => {

    // YARDIM MENÜSÜ GÜNCELLEME
    if (i.isStringSelectMenu() && i.customId === 'help_menu') {
        let title, desc;
        if (i.values[0] === 'help_admin') {
            title = "🛡️ Yönetim Birimi";
            desc = "`!kur`: Sunucuyu inşa eder.\n`!sil`: Mesajları temizler.\n`!ticket-kur`: Destek sistemini kurar.";
        } else if (i.values[0] === 'help_comm') {
            title = "📣 İletişim Birimi";
            desc = "`!duyuru`: Genel duyuru yapar.\n`!savaş-duyuru`: Savaş alarmı verir.";
        } else {
            title = "👥 Üye Birimi";
            desc = "`!sa`: Selamlaşma.\n`!yardım`: Bu menüyü açar.\n`!izakaya`: Sunucu bilgisini gösterir.";
        }
        const editEmbed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor("#990000");
        return i.update({ embeds: [editEmbed] });
    }

    // TICKET SİSTEMİ
    if (i.isStringSelectMenu() && i.customId === 'tk_menu') {
        const cat = i.values[0];
        const chan = await i.guild.channels.create({
            name: `${cat}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_tk').setLabel('Dosyayı Kapat').setStyle(ButtonStyle.Danger));
        const tEmbed = new EmbedBuilder().setTitle(`🛡️ ${cat.toUpperCase()} Dosyası`).setDescription(`Hoş geldin asker. Bu kanal ${cat} işlemleri için açıldı.`).setColor("#990000");
        
        await chan.send({ content: `${i.user}`, embeds: [tEmbed], components: [row] });
        
        // Yetkili alım formu otomatik atılsın
        if (cat === 'yetkili_alim') {
            await chan.send("🏮 **YETKİLİ BAŞVURU FORMU**\n1. Ad/Yaş:\n2. Aktiflik Süren:\n3. Neden Castivol?\n\nLütfen doldur asker! 🛡️");
        }

        return i.reply({ content: `✅ Dosyan açıldı: <#${chan.id}>`, ephemeral: true });
    }

    if (i.isButton() && i.customId === 'close_tk') {
        await i.reply("🔒 Dosya arşivleniyor (5sn)...");
        setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }

    // KURULUM (SETUP)
    if (i.isButton() && i.customId === 'confirm_setup') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "Yetkisiz erişim engellendi.", ephemeral: true });
        await i.reply({ content: "🛠️ Operasyon başladı, kanallar yapılandırılıyor...", ephemeral: true });
        
        const channels = await i.guild.channels.fetch();
        for (const c of channels.values()) await c.delete().catch(() => {});

        const createCat = (n) => i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });

        const c1 = await createCat('─── GİRİŞ PANELİ ───');
        await i.guild.channels.create({ name: '📢-duyurular', parent: c1.id });
        await i.guild.channels.create({ name: '📜-kurallar', parent: c1.id });

        const c2 = await createCat('─── İŞLEM MERKEZİ ───');
        await i.guild.channels.create({ name: '🧧-destek-ve-basvuru', parent: c2.id });

        const c3 = await createCat('─── SOHBET ───');
        await i.guild.channels.create({ name: '💬-sohbet', parent: c3.id });
        await i.guild.channels.create({ name: '📷-medya', parent: c3.id });

        const c4 = await createCat('─── SES ODALARI ───');
        await i.guild.channels.create({ name: '🔊 Genel Sohbet', type: ChannelType.GuildVoice, parent: c4.id });
    }
});

client.login(process.env.TOKEN);
