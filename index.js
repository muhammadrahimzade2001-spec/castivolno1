const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Castivol Professional System Online! 🛡️'));
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

client.on('ready', () => { console.log(`🛡️ ${client.user.tag} Aktif!`); });

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- 🧹 TEMİZLE (TAMİR EDİLDİ) ---
    if (command === "temizle" || command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const miktar = parseInt(args[0]) || 50;
        if (miktar > 100) return message.reply("Tek seferde en fazla 100 mesaj silebilirsin.");
        
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send(`✅ **${miktar}** mesaj silindi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- 📢 DUYURULAR (TAMİR EDİLDİ) ---
    if (command === "duyuru" || command === "savaş-duyuru") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const msg = args.join(' ');
        if (!msg) return message.reply("Duyuru metni yazmalısın.");
        
        const isWar = command === "savaş-duyuru";
        const dEmbed = new EmbedBuilder()
            .setTitle(isWar ? "⚔️ SAVAŞ ALARMI: KADROLAR TOPLANSIN!" : "📢 CASTIVOL DUYURUSU")
            .setDescription(msg)
            .setColor(isWar ? "#ff0000" : "#ffffff")
            .setTimestamp();

        message.channel.send({ content: "@everyone", embeds: [dEmbed] });
        return message.delete().catch(() => {});
    }

    // --- 🎫 TICKET SİSTEMİ KURULUMU (YENİ) ---
    if (command === "ticket-kur") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        const tEmbed = new EmbedBuilder()
            .setTitle("🧧 CASTIVOL İŞLEM PANELİ")
            .setDescription("İşlem yapmak için aşağıdaki menüden kategori seçin.")
            .setColor("#000000");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('tk_menu').setPlaceholder('Kategori seç...').addOptions([
                { label: 'Klan Alımı', value: 'klan', emoji: '⚔️' },
                { label: 'Partnerlik', value: 'partner', emoji: '🤝' },
                { label: 'Destek', value: 'destek', emoji: '🎫' }
            ])
        );

        return message.channel.send({ embeds: [tEmbed], components: [menu] });
    }

    // --- 🏗️ ESKİ KUR KOMUTUN (AYNEN DURUYOR) ---
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("Sadece sunucu sahibi yapabilir.");
        const setupEmbed = new EmbedBuilder().setTitle("⚙️ SİSTEM KURULUMU").setDescription("Tüm sunucu sıfırlanacak. Onaylıyor musun?").setColor("#000000");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_setup').setLabel('Sistemi Kur').setStyle(ButtonStyle.Danger));
        return message.channel.send({ embeds: [setupEmbed], components: [row] });
    }

    // --- 🛡️ YARDIM MENÜSÜ ---
    if (command === "yardım") {
        const helpEmbed = new EmbedBuilder()
            .setTitle("🛡️ CASTIVOL YARDIM")
            .setColor("#990000")
            .addFields(
                { name: 'Yönetim', value: '`!kur`, `!ticket-kur`, `!temizle`' },
                { name: 'Duyuru', value: '`!duyuru`, `!savaş-duyuru`' }
            );
        return message.channel.send({ embeds: [helpEmbed] });
    }
});

// --- ETKİLEŞİMLER ---
client.on('interactionCreate', async (i) => {
    // Ticket Açma
    if (i.customId === 'tk_menu') {
        const chan = await i.guild.channels.create({
            name: `${i.values[0]}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_tk').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger));
        await chan.send({ content: `${i.user} Hoş geldin, yetkililer birazdan burada olur.`, components: [row] });
        await i.reply({ content: `Kanal açıldı: ${chan}`, ephemeral: true });
    }

    // Ticket Kapatma
    if (i.customId === 'close_tk') {
        await i.reply("Kanal siliniyor...");
        setTimeout(() => i.channel.delete(), 2000);
    }

    // Sunucu Kur (Confirm)
    if (i.customId === 'confirm_setup') {
        await i.reply({ content: "İşlem başlatıldı...", ephemeral: true });
        // Buraya senin o uzun kanal/rol oluşturma kodlarını ekleyebilirsin.
    }
});

client.login(process.env.TOKEN);
