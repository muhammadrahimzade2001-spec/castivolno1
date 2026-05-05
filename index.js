const { 
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, 
  PermissionFlagsBits, ChannelType, ActivityType 
} = require('discord.js');

// ══════════════════════════════════════════════════════════════════════════
//  İSTEMCİ AYARLARI (GELİŞMİŞ INTENTLER)
// ══════════════════════════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

// ══════════════════════════════════════════════════════════════════════════
//  YAPILANDIRMA (BURALARI KENDİNE GÖRE DOLDUR)
// ══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  PREFIX: '!',
  OWNER_ID: '774213567890123456', // Buraya kendi Discord ID'ni yaz
  GUILD_ID: '123456789012345678', // Sunucu ID'si
  LOG_KANAL: '123456789012345678', // Logların gideceği kanal
  HOSGELDIN_KANAL: '123456789012345678',
  VERSION: '2.0.0-PRO'
};

const COLORS = {
  SAKURA: 0xFFB7C5,
  YUKI: 0xE0FFFF,
  MURASAKI: 0x9370DB,
  MIDORI: 0x2ECC71,
  AKA: 0xE74C3C,
  KITSUNE: 0xE67E22,
  NEON: 0x00FFFF,
  GOLD: 0xF1C40F
};

// ══════════════════════════════════════════════════════════════════════════
//  VERİTABANI VE TAKİP SİSTEMLERİ (MAPS)
// ══════════════════════════════════════════════════════════════════════════
const xpData = new Map();
const uyarilar = new Map();
const raidTakip = new Map();
const klanVerisi = new Map();
const cooldowns = new Map();

// ══════════════════════════════════════════════════════════════════════════
//  GELİŞMİŞ TICKET YAPILANDIRMASI
// ══════════════════════════════════════════════════════════════════════════
const TICKET_SISTEMI = {
  genel: { label: 'Genel Destek', emoji: '🎫', renk: COLORS.SAKURA, desc: 'Genel sorunlarınız için destek talebi.' },
  klan: { label: 'Klan Alım / Merge', emoji: '⚔️', renk: COLORS.KITSUNE, desc: 'Klan başvuruları ve birleşme talepleri.' },
  basvuru: { label: 'Yetkili Başvurusu', emoji: '🛡️', renk: COLORS.MURASAKI, desc: 'Ekibimize katılmak için başvuru yapın.' },
  sikayet: { label: 'Şikayet & Bildirim', emoji: '🚨', renk: COLORS.AKA, desc: 'Kural ihlallerini buradan bildirin.' },
  bug: { label: 'Hata Bildirimi', emoji: '🐛', renk: COLORS.NEON, desc: 'Sunucudaki teknik hataları bildirin.' }
};

// ══════════════════════════════════════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR (UTIL)
// ══════════════════════════════════════════════════════════════════════════
const createEmbed = (title, desc, color = COLORS.SAKURA) => {
  return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp().setFooter({ text: 'CastiVol Security' });
};

function checkXP(userId) {
  if (!xpData.has(userId)) xpData.set(userId, { xp: 0, level: 1, messages: 0, money: 100 });
  return xpData.get(userId);
}

// ══════════════════════════════════════════════════════════════════════════
//  ANA MESAJ EVENTİ VE KOMUTLAR
// ══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // --- XP VE SEVİYE SİSTEMİ ---
  const userStats = checkXP(message.author.id);
  userStats.xp += Math.floor(Math.random() * 8) + 2;
  userStats.messages++;
  
  let targetXP = userStats.level * 200;
  if (userStats.xp >= targetXP) {
    userStats.level++;
    userStats.xp = 0;
    message.reply(`🌟 **TEBRİKLER!** Seviye atladın! Yeni Seviyen: **${userStats.level}**`).then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
  }

  if (!message.content.startsWith(CONFIG.PREFIX)) return;

  const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // --- MODERASYON KOMUTLARI ---
  if (command === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('Yetkiniz yok!');
    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.reply('Kimi banlayayım kanka? Etiketle veya ID yaz.');
    const reason = args.slice(1).join(' ') || 'Belirtilmedi';
    await member.ban({ reason });
    message.channel.send({ embeds: [createEmbed('🔨 Yasaklandı', `**${member.user.tag}** sunucudan uçuruldu.\n**Sebep:** ${reason}`, COLORS.AKA)] });
  }

  if (command === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('Yetkiniz yok!');
    const member = message.mentions.members.first();
    if (!member) return message.reply('Birini etiketle.');
    await member.kick();
    message.reply(`✅ ${member.user.tag} sunucudan atıldı.`);
  }

  if (command === 'temizle' || command === 'sil') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
    const count = parseInt(args[0]) || 100;
    await message.channel.bulkDelete(Math.min(count, 100));
    message.channel.send(`🧹 **${count}** mesaj temizlendi.`).then(m => setTimeout(() => m.delete(), 3000));
  }

  // --- DUYURU SİSTEMİ ---
  if (command === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    const content = args.join(' ');
    if (!content) return message.reply('Duyuru metni yazmalısın.');
    message.delete();
    const dEmbed = new EmbedBuilder()
      .setTitle('📣 Sunucu Duyurusu')
      .setDescription(content)
      .setColor(COLORS.GOLD)
      .setThumbnail(message.guild.iconURL())
      .setFooter({ text: `Duyuruyu Yapan: ${message.author.tag}` });
    message.channel.send({ content: '@everyone', embeds: [dEmbed] });
  }

  // --- PROFIL VE SIRALAMA ---
  if (command === 'profil') {
    const target = message.mentions.users.first() || message.author;
    const data = checkXP(target.id);
    const pEmbed = new EmbedBuilder()
      .setTitle(`👤 ${target.username} Profili`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏅 Seviye', value: `\`${data.level}\``, inline: true },
        { name: '💬 Mesaj', value: `\`${data.messages}\``, inline: true },
        { name: '💰 Bakiye', value: `\`${data.money}\` Altın`, inline: true },
        { name: '✨ XP', value: `\`${data.xp} / ${data.level * 200}\``, inline: false }
      )
      .setColor(COLORS.SAKURA);
    message.reply({ embeds: [pEmbed] });
  }

  // --- TICKET KURULUM ---
  if (command === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('Destek kategorisi seçin...')
      .addOptions(Object.entries(TICKET_SISTEMI).map(([key, val]) => 
        new StringSelectMenuOptionBuilder().setLabel(val.label).setValue(key).setEmoji(val.emoji).setDescription(val.desc)
      ));
    
    const row = new ActionRowBuilder().addComponents(menu);
    message.channel.send({
      embeds: [createEmbed('🎫 CastiVol Destek Merkezi', 'Yaşadığınız sorunları çözmek için aşağıdan kategori seçerek bir talep açabilirsiniz.', COLORS.SAKURA)],
      components: [row]
    });
  }

  // --- MINECRAFT IP ---
  if (command === 'ip' || command === 'minecraft') {
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌍 CastiVol Network')
          .addFields(
            { name: '🖥️ Sunucu IP', value: '`mc.castivol.net`', inline: true },
            { name: '🎮 Sürüm', value: '`1.21.x`', inline: true },
            { name: '🔗 Site', value: '[www.castivol.net](https://castivol.net)', inline: true }
          )
          .setColor(COLORS.NEON)
          .setImage('https://media.discordapp.net/attachments/123/banner.png') // Buraya kendi bannerını koy
      ]
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  GELİŞMİŞ ETKİLEŞİM İŞLEYİCİ (TICKET & BUTTONS)
// ══════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    const category = interaction.values[0];
    const settings = TICKET_SISTEMI[category];
    
    await interaction.deferReply({ ephemeral: true });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${category}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
        { id: CONFIG.OWNER_ID, allow: [PermissionFlagsBits.ViewChannel] }
      ]
    });

    const tEmbed = new EmbedBuilder()
      .setTitle(`${settings.emoji} ${settings.label} Talebi`)
      .setDescription(`Hoş geldin ${interaction.user}! Yetkililerimiz en kısa sürede seninle ilgilenecek.\n\n**Kategori:** ${settings.label}`)
      .setColor(settings.renk);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Talebi Kapat').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('Sahiplen').setEmoji('✋').setStyle(ButtonStyle.Success)
    );

    await channel.send({ content: `${interaction.user} | <@&YETKILI_ROL_ID>`, embeds: [tEmbed], components: [buttons] });
    interaction.editReply(`✅ Talebin açıldı: ${channel}`);
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'ticket_close') {
      await interaction.reply('🔒 Kanal 5 saniye içinde kalıcı olarak siliniyor...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
    if (interaction.customId === 'ticket_claim') {
      interaction.reply({ embeds: [createEmbed('✋ Sahiplenildi', `Bu destek talebi **${interaction.user.tag}** tarafından devralındı.`, COLORS.MIDORI)] });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  GÜVENLİK DUVARI (ANTI-RAID & PROTECTION)
// ══════════════════════════════════════════════════════════════════════════
client.on('guildBanAdd', async (ban) => {
  const auditLogs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null);
  const entry = auditLogs?.entries.first();
  if (!entry || entry.executor.id === client.user.id) return;

  const executorId = entry.executor.id;
  const now = Date.now();
  const data = raidTakip.get(executorId) || { count: 0, lastAction: now };

  if (now - data.lastAction > 10000) data.count = 0; // 10 saniye geçince sıfırla
  data.count++;
  data.lastAction = now;
  raidTakip.set(executorId, data);

  if (data.count >= 4) { // 10 saniyede 4 ban atarsa
    const member = await ban.guild.members.fetch(executorId).catch(() => null);
    if (member && member.id !== CONFIG.OWNER_ID) {
      await member.roles.remove(member.roles.cache).catch(() => {});
      await member.timeout(3600000, 'Anti-Raid: Toplu Ban Tespiti').catch(() => {});
      
      const owner = await client.users.fetch(CONFIG.OWNER_ID).catch(() => null);
      owner?.send(`🚨 **ACİL DURUM:** ${member.user.tag} sunucuda raid yapmaya çalıştı! Yetkileri alındı.`);
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  AÇILIŞ VE HATA YÖNETİMİ
// ══════════════════════════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃  🤖 BOT: ${client.user.tag}
  ┃  🆔 ID: ${client.user.id}
  ┃  🛡️ ANTI-RAID: AKTİF
  ┃  ✨ VERSİYON: ${CONFIG.VERSION}
  ┃  🚀 DURUM: Çalışıyor...
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  `);
  
  client.user.setPresence({
    activities: [{ name: '!yardim | mc.castivol.net', type: ActivityType.Watching }],
    status: 'dnd'
  });
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Beklenmedik bir hata oluştu:', error);
});

client.login(process.env.TOKEN); // Tokenini .env dosyasına TOKEN=... şeklinde ekle
