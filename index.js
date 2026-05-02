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
    console.log(`🛡️ Castivol v6.0 Online! Bot: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // KUR KOMUTU
    if (command === "kur") {
        if (message.author.id !== message.guild.ownerId) return message.reply("Sadece Owner yapabilir.");
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('onay').setLabel('Sistemi Kur').setStyle(ButtonStyle.Danger));
        return message.channel.send({ content: "🚨 Castivol v6.0 düzeni kurulsun mu?", components: [btn] });
    }

    // SIL KOMUTU
    if (command === "sil") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
        const count = parseInt(args[0]) || 100;
        await message.channel.bulkDelete(count > 100 ? 100 : count, true);
        return message.channel.send(`🧹 **${count}** mesaj temizlendi.`);
    }
});

client.on('interactionCreate', async (i) => {
    if (i.customId === 'onay') {
        await i.reply({ content: "🛠️ İnşaat başladı...", ephemeral: true });
        const chs = await i.guild.channels.fetch();
        for (const c of chs.values()) await c.delete().catch(() => {});
        
        const roles = [
            { n: '🛡️ Castivol', c: '#000000' },
            { n: '👑 owner', c: '#ff0000' }, 
            { n: '👑 founder', c: '#990000' },
            { n: '👤 üye', c: '#bdc3c7' }
        ];
        for (const r of roles) await i.guild.roles.create({ name: r.n, color: r.c, hoist: true });

        const cat = await i.guild.channels.create({ name: '─── CASTIVOL ───', type: ChannelType.GuildCategory });
        await i.guild.channels.create({ name: '💬-sohbet', parent: cat.id });
        await i.guild.channels.create({ name: '🧧-işlem-merkezi', parent: cat.id });
    }
});

// 🔑 KRİTİK NOKTA: Tokeni tırnak içine yazma, böyle kalsın!
client.login(process.env.TOKEN);
