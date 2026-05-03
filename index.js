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

const PREFIX = "! "; // Kanka buraya dikkat, bazıları "!" bazıları "! " kullanıyor. Seninkini "!" yaptım.
const REAL_PREFIX = "!"; 

client.on('ready', () => { console.log(`🛡️ ${client.user.tag} Castivol Operasyon Merkezi Aktif!`); });

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(REAL_PREFIX)) return;
    const args = message.content.slice(REAL_PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- 📜 YARDIM MENÜSÜ (ORİJİNAL) ---
    if (command === "yardım") {
        const helpEmbed = new EmbedBuilder()
            .setTitle("🛡️ CASTIVOL OPERASYON REHBERİ")
            .setDescription("Sunucu düzenini korumak ve sistemleri yönetmek için aşağıdaki yönergeleri takip edin.")
            .setColor("#990000")
            .addFields(
                { name: '🌐 ANA ETKİLEŞİM', value: '`!sa`: Selamlaşma protokolü.\n`!istatistik`: Sunucu verileri.', inline: false },
                { name: '🏗️ YÖNETİM & KURULUM', value: '`!kur`: Sunucuyu inşa eder.\n`!ticket-kur`: Ticket panelini manuel atar.\n`!temizle [sayı]`: Sohbeti temizler.', inline: false },
                { name: '📣 BİLGİLENDİRME', value: '`!duyuru [mesaj]`: Resmi duyuru.\n`!savaş-duyuru`: Savaş alarmı.', inline: false },
                { name: '🎫 DESTEK HİTMETİ', value: 'Sorun bildirmek için `#başvuru-destek` kanalını kullanın.', inline: false }
            )
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: "Castivol Security & Management" })
            .setTimestamp();

        return message.channel.send({ embeds: [helpEmbed] });
    }

    if (command === "sa") return message.reply("Aleyküm Selam Asker! 🛡️");

    // --- 📢 DUYURU SİSTEMİ (TAMİR EDİLDİ) ---
    if (command === "duyuru" || command === "savaş-duyuru") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const msg = args.join(' ');
        if (!msg) return message.reply("Duyuru içeriği belirtilmedi.");
        
        const isWar = command === "savaş-duyuru";
        const dEmbed = new EmbedBuilder()
            .setTitle(isWar ? "⚔️ OPERASYON EMRİ: KADROLAR TOPLANSIN!" : "📢 RESMİ CASTIVOL DUYURUSU")
            .setDescription(`**Mesaj:**\n${msg}`)
            .setColor(isWar ? "#ff0000" : "#ffffff")
            .setFooter({ text: `Yetkili: ${message.author.username}` })
            .setTimestamp();

        message.channel.send({ content: "@everyone", embeds: [dEmbed] });
        return message.delete().catch(() => {});
    }

    // --- 🧹 TEMİZLİK (TAMİR EDİLDİ) ---
    if (command === "temizle" || command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const amount = parseInt(args[0]) || 50;
        const deleteAmount = amount > 100 ? 100 : amount;
        
        await message.channel.bulkDelete(deleteAmount, true).catch(() => {});
        return message.channel.send(`✅ **${deleteAmount}** mesaj imha edildi.`).then(m => setTimeout(() => m.delete(), 3000));
    }

    // --- 🎫 TICKET-KUR (YENİ EKLENDİ) ---
    if (command === "ticket-kur") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        const tEmbed = new EmbedBuilder()
            .setTitle("🧧 CASTIVOL İŞLEM PANELİ")
            .setDescription("Lütfen işlem yapmak istediğiniz kategoriyi seçin.")
            .setColor("#000000");

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('tk_menu').setPlaceholder('Kategori seçiniz...').addOptions([
                { label: 'Klan Alımı', value: 'klan', emoji: '⚔️' },
                { label: 'Partnerlik', value: 'partner', emoji: '🤝' },
                { label: 'Merge (Birleşme)', value: 'merge', emoji: '💠' },
                { label: 'Destek / Şikayet', value: 'destek', emoji: '🎫' }
            ])
        );

        return message.channel.send({ embeds: [tEmbed], components: [menu] });
    }

    // --- 🧨 KUR KOMUTU (ORİJİNAL) ---
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("Bu yetki sadece kurucu seviyesindedir.");

        const setupEmbed = new EmbedBuilder()
            .setTitle("⚙️ SİSTEM KURULUMU")
            .setDescription("Tüm sunucu yapısı Castivol standartlarına göre sıfırdan kurulacaktır. Onaylıyor musunuz?")
            .setColor("#000000");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_setup').setLabel('Sistemi Kur').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [setupEmbed], components: [row] });
    }
});

// --- ETKİLEŞİMLER ---
client.on('interactionCreate', async (i) => {
    // TICKET MENÜSÜ (TAMİR EDİLDİ)
    if (i.customId === 'tk_menu') {
        const chan = await i.guild.channels.create({
            name: `${i.values[0]}-${i.user.username}`,
            type: ChannelType.GuildText, // Kanal tipi eklendi (Hata veriyordu)
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });
        await chan.send({ 
            content: `${i.user} Talep açıldı. Yetkililer bilgilendirildi.`, 
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_tk').setLabel('Talebi Kapat').setStyle(ButtonStyle.Danger))] 
        });
        await i.reply({ content: `✅ Kanal oluşturuldu: ${chan}`, ephemeral: true });
    }

    // TICKET KAPATMA
    if (i.customId === 'close_tk') {
        await i.reply("Kanal kapatılıyor...");
        setTimeout(() => i.channel.delete().catch(() => {}), 2000);
    }

    // SUNUCU KURMA (ORİJİNAL)
    if (i.customId === 'confirm_setup') {
        await i.reply({ content: "🛠️ İşlem başlatıldı. Veriler yapılandırılıyor...", ephemeral: true });

        const channels = await i.guild.channels.fetch();
        for (const c of channels.values()) await c.delete().catch(() => {});
        
        const roles = await i.guild.roles.fetch();
        for (const r of roles.values()) { 
            if (!r.managed && r.name !== "@everyone") await r.delete().catch(() => {}); 
        }

        const roleList = ['Castivol', 'founder', 'co founder', 'co owner', 'owner', 'jr.founder', 'admin', 'jr.admin', 'Yardımcı', 'Asistan', 'AAC', 'deneme aac', 'rehber', 'deneme rehber', 'üye', 'abone'];
        for (const rName of roleList) await i.guild.roles.create({ name: rName, color: '#990000', hoist: true });

        const createCat = (n) => i.guild.channels.create({ name: n, type: ChannelType.GuildCategory });

        const cat1 = await createCat('─── GİRİŞ PANELİ ───');
        await i.guild.channels.create({ name: '🔔-duyurular', parent: cat1.id });
        await i.guild.channels.create({ name: '📜-kurallar', parent: cat1.id });
        await i.guild.channels.create({ name: '👋-hoşgeldin', parent: cat1.id });

        const cat2 = await createCat('─── İŞLEM MERKEZİ ───');
        const c_ticket = await i.guild.channels.create({ name: '🧧-başvuru-destek', parent: cat2.id });
        await i.guild.channels.create({ name: '🔥-partnerlik', parent: cat2.id });

        const cat3 = await createCat('─── SOHBET ───');
        await i.guild.channels.create({ name: '💬-global-sohbet', parent: cat3.id });
        await i.guild.channels.create({ name: '📷-medya', parent: cat3.id });

        const cat5 = await createCat('─── SES ODALARI ───');
        await i.guild.channels.create({ name: '🔊 Genel Sohbet', type: ChannelType.GuildVoice, parent: cat5.id });

        const tEmbed = new EmbedBuilder().setTitle("🧧 CASTIVOL İŞLEM PANELİ").setDescription("Lütfen işlem yapmak istediğiniz kategoriyi seçin.").setColor("#000000");
        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('tk_menu').setPlaceholder('Kategori seçiniz...').addOptions([
                { label: 'Klan Alımı', value: 'klan', emoji: '⚔️' },
                { label: 'Partnerlik', value: 'partner', emoji: '🤝' },
                { label: 'Merge (Birleşme)', value: 'merge', emoji: '💠' },
                { label: 'Destek / Şikayet', value: 'destek', emoji: '🎫' }
            ])
        );
        await c_ticket.send({ embeds: [tEmbed], components: [menu] });
    }
});

client.login(process.env.TOKEN);
