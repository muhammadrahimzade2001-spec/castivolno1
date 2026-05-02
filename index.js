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
    console.log(`🛡️ Castivol Sistemi Aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. YARDIM KOMUTU (Sadeleşmiş)
    if (command === "yardım") {
        const embed = new EmbedBuilder()
            .setTitle("🛡️ Castivol Komut Paneli")
            .setColor("#000000")
            .setDescription("Güvenlik ve düzen için tasarlanmış komutlar.")
            .addFields(
                { name: '🔨 Yönetim', value: '`!sil`, `!ban`, `!kick`, `!kilit`' },
                { name: '⚔️ Operasyon', value: '`!savaş`, `!toplan`, `!yaz`' },
                { name: '🏗️ Sistem', value: '`!kur` (Owner Özel)' }
            );
        return message.channel.send({ embeds: [embed] });
    }

    // 2. SİL KOMUTU (Yetki Kontrollü)
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("❌ Bu komutu sadece **Mesajları Yönet** yetkisi olanlar kullanabilir.");
        const sayi = parseInt(args[0]);
        if (!sayi || sayi < 1 || sayi > 100) return message.reply("❌ 1-100 arası bir miktar belirt kanka.");
        await message.channel.bulkDelete(sayi, true).catch(() => {});
        return message.channel.send(`🧹 **${sayi}** mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 2000));
    }

    // 3. BAN KOMUTU (Yetki Kontrollü)
    if (command === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Üyeleri yasaklama yetkin yok kanka.");
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Banlanacak kişiyi etiketle.");
        if (user.roles.highest.position >= message.member.roles.highest.position) return message.reply("❌ Senden üstte veya seninle aynı rolde olan birini banlayamazsın.");
        await user.ban({ reason: 'Castivol Düzeni' }).catch(() => message.reply("❌ Yetkim yetmiyor."));
        return message.channel.send(`🔨 **${user.user.tag}** sunucudan yasaklandı.`);
    }

    // 4. KICK KOMUTU (Yetki Kontrollü)
    if (command === "kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply("❌ Üyeleri atma yetkin yok.");
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Atılacak kişiyi etiketle.");
        await user.kick().catch(() => message.reply("❌ Yetkim yetmiyor."));
        return message.channel.send(`👞 **${user.user.tag}** sunucudan atıldı.`);
    }

    // 5. KİLİT KOMUTU (Kanalı Konuşmaya Kapatır)
    if (command === "kilit") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply("❌ Kanalları yönetme yetkin yok.");
        message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        return message.channel.send("🔒 Kanal kilitlendi.");
    }

    // 6. SAVAŞ ÇAĞRISI
    if (command === "savaş") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) return message.reply("❌ Duyuru yetkin yok.");
        const embed = new EmbedBuilder()
            .setTitle("⚔️ CASTIVOL: SAVAŞ ÇAĞRISI")
            .setImage("https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmY4bmN3b3ZpZHR6eHR4eHR4eHR4eHR4eHR4eHR4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2z6OlbAisS6Z2/giphy.gif")
            .setColor("DarkRed");
        return message.channel.send({ content: "@everyone", embeds: [embed] });
    }

    // 7. TOPLAN KOMUTU
    if (command === "toplan") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) return message.reply("❌ Duyuru yetkin yok.");
        return message.channel.send("🚨 **ACİL TOPLANIN!** Castivol kadrosu buraya! @here");
    }

    // 8. YAZ KOMUTU
    if (command === "yaz") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const msg = args.join(" ");
        if (!msg) return;
        message.delete();
        return message.channel.send(msg);
    }

    // 9. KUR KOMUTU ( OWNER ÖZEL )
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Bu komut sadece **Sunucu Sahibi (Owner)** içindir.");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu Kur').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 **Sunucu Sıfırlanacak.** Onaylıyor musun?", components: [btn] });
    }
});

// --- KURULUM SİSTEMİ ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    if (i.customId === 'mega_kur') {
        if (i.user.id !== i.guild.ownerId) return i.reply({ content: "❌ Butonu sadece Owner kullanabilir.", ephemeral: true });

        await i.reply({ content: "🛠️ Temizlik ve inşa başladı...", ephemeral: true });

        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});
        
        const roles = [
            { n: '🛡️ Castivol', c: '#000000' }, { n: '👑 owner', c: '#ff0000' }, { n: '👑 founder', c: '#910000' },
            { n: '🎖️ yönetici', c: '#e67e22' }, { n: '💎 admin', c: '#2ecc71' }, { n: '👤 üye', c: '#bdc3c7' }
        ];
        for (const r of roles) await i.guild.roles.create({ name: r.n, color: r.c, hoist: true });

        const cat1 = await i.guild.channels.create({ name: '── BİLGİ ──', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '📢-duyuru', parent: cat1.id });
        await i.guild.channels.create({ name: '📜-kurallar', parent: cat1.id });

        const cat2 = await i.guild.channels.create({ name: '── SOSYAL ──', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '💬-sohbet', parent: cat2.id });
        await i.guild.channels.create({ name: '🤖-bot-komut', parent: cat2.id });

        const cat3 = await i.guild.channels.create({ name: '── SAVAŞ ──', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '⚔️-savaş-duyuru', parent: cat3.id });
        await i.guild.channels.create({ name: '📊-istatistik', parent: cat3.id });
    }
});

client.login(process.env.TOKEN);
