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
    console.log(`🛡️ Castivol Mega Sistem Aktif!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("❌ Sadece **Owner** kurabilir.");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mega_kur').setLabel('İmparatorluğu İnşa Et (30+ Kanal)').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 **CASTIVOL MEGA KURULUM** başlıyor. Sunucu tamamen sıfırlanacak. Hazır mısın?", components: [btn] });
    }

    if (command === "yardım") {
        return message.reply("📜 **Komutlar:** `!kur` (Sunucuyu Kur), `!sil [1-100]` (Mesaj Sil), `!savaş` (Savaş Alarmi), `!ping` (Gecikme)");
    }
});

client.on('interactionCreate', async (i) => {
    if (i.customId === 'mega_kur') {
        await i.reply({ content: "🛠️ Dev inşaat başladı, lütfen bekleyin...", ephemeral: true });

        // --- 🌪️ TEMİZLİK ---
        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});
        const rls = await i.guild.roles.fetch();
        for (const r of rls.values()) { if (!r.managed && r.name !== "@everyone") await r.delete().catch(() => {}); }

        // --- 👑 ROLLER ---
        const roles = [
            { n: '🛡️ Castivol', c: '#000000' }, { n: '👑 owner', c: '#ff0000' }, { n: '👑 founder', c: '#910000' },
            { n: '⚔️ co founder', c: '#ff4a4a' }, { n: '🎖️ yönetici', c: '#e67e22' }, { n: '💎 admin', c: '#2ecc71' },
            { n: '🔥 elit üye', c: '#f1c40f' }, { n: '👤 üye', c: '#bdc3c7' }
        ];
        for (const r of roles) await i.guild.roles.create({ name: r.n, color: r.c, hoist: true });

        // --- 📂 KATEGORİ VE KANAL YAPISI ---
        const createCat = async (name) => await i.guild.channels.create({ name: name, type: ChannelType.GuildCategory });
        const createCh = async (name, parentId, type = ChannelType.GuildText) => await i.guild.channels.create({ name: name, parent: parentId, type: type });

        // 1. BİLGİLENDİRME
        const c1 = await createCat('─── BİLGİ ───');
        const BilgiCh = ['📢-duyuru', '📜-kurallar', '🧧-işlem-merkezi', '🎭-rol-alma', '🚀-boost-bilgi'];
        for (const n of BilgiCh) await createCh(n, c1.id);

        // 2. SOSYAL ALAN
        const c2 = await createCat('─── SOSYAL ───');
        const SosyalCh = ['💬-sohbet', '🤖-bot-komut', '📷-medya', '🎨-tasarım', '🎰-kumar'];
        for (const n of SosyalCh) await createCh(n, c2.id);

        // 3. KLAN / SAVAŞ MERKEZİ
        const c3 = await createCat('─── SAVAŞ MERKEZİ ───');
        const SavasCh = ['⚔️-savaş-duyuru', '🛡️-kadro-listesi', '📊-savaş-istatistik', '🛑-cezalılar', '🏅-başarılar'];
        for (const n of SavasCh) await createCh(n, c3.id);

        // 4. SESLİ ODALAR
        const c4 = await createCat('─── SESLİ ALAN ───');
        const SesCh = ['🔊-Genel-Sohbet', '🎮-Oyun-Odası', '🎵-Müzik-1', '🎵-Müzik-2', '💤-AFK'];
        for (const n of SesCh) await createCh(n, c4.id, ChannelType.GuildVoice);

        // 5. YÖNETİM (SADECE YETKİLİ)
        const c5 = await createCat('─── YÖNETİM ───');
        const YonetimCh = ['👑-owner-private', '📂-toplantı-odası', '📝-log-merkezi', '🛡️-yetkili-chat'];
        for (const n of YonetimCh) await createCh(n, c5.id);

        // 6. DESTEK
        const c6 = await createCat('─── DESTEK ───');
        await createCh('🎫-ticket-aç', c6.id);
        await createCh('🆘-yardım', c6.id);

        console.log("✅ Kurulum Tamamlandı.");
    }
});

client.login(process.env.TOKEN);
