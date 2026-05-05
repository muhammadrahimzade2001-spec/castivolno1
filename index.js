// ╔══════════════════════════════════════════════════╗
// ║          CastiVol Discord Bot - index.js         ║
// ║              by Claude  •  v2.0                  ║
// ╚══════════════════════════════════════════════════╝

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} = require('discord.js');

try { require('dotenv').config(); } catch(e) {}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = '!';

// ─── Renk Paleti ─────────────────────────────────────────────────────────────
const COLORS = {
  GREEN:     0x2ECC40,
  RED:       0xFF4136,
  GOLD:      0xFFD700,
  DIAMOND:   0x00B5E2,
  EMERALD:   0x00FF7F,
  NETHERITE: 0x4A4A4A,
  PURPLE:    0x9B59B6,
  ORANGE:    0xE67E22,
};

// ─── XP Sistemi ───────────────────────────────────────────────────────────────
const xpData = new Map();

function getUser(id) {
  if (!xpData.has(id)) xpData.set(id, { xp: 0, level: 1 });
  return xpData.get(id);
}

function addXP(id, amount) {
  const u = getUser(id);
  u.xp += amount;
  const needed = u.level * 100;
  if (u.xp >= needed) { u.xp -= needed; u.level++; return true; }
  return false;
}

// ─── Ticket Kategorileri ──────────────────────────────────────────────────────
const TICKET_KATEGORILER = {
  'genel_destek': { label: '🎫 Genel Destek',   renk: COLORS.DIAMOND },
  'klan_alim':    { label: '⚔️ Klan Alım',       renk: COLORS.GOLD    },
  'klan_merge':   { label: '🤝 Klan Merge',      renk: COLORS.EMERALD },
  'partnerlik':   { label: '🌐 Partnerlik',      renk: COLORS.PURPLE  },
  'yetkili_alim': { label: '🛡️ Yetkili Alım',    renk: COLORS.ORANGE  },
  'sikayet':      { label: '🚨 Sikayet',         renk: COLORS.RED     },
  'oneri':        { label: '💡 Öneri',           renk: COLORS.GREEN   },
};

const TICKET_ACIKLAMALAR = {
  genel_destek:  '📝 Sorununu veya talebini detaylıca anlat. Ekibimiz yardımcı olacak!',
  klan_alim:
    '⚔️ **Klan Alım Basvurusu**\n\nLütfen su bilgileri yaz:\n' +
    '• IGN (Oyun adin)\n• Seviye ve ekipman\n• Neden klana katilmak istiyorsun?\n• Aktiflik durumun',
  klan_merge:
    '🤝 **Klan Merge Talebi**\n\nLütfen su bilgileri yaz:\n' +
    '• Klan adin ve üye sayisi\n• Klan seviyesi\n• Birlesme gerekçen',
  partnerlik:
    '🌐 **Partnerlik Basvurusu**\n\nLütfen su bilgileri yaz:\n' +
    '• Sunucu adi ve daveti\n• Üye sayisi\n• Sunucu konusu\n• Partnerlik beklentilerin',
  yetkili_alim:
    '🛡️ **Yetkili Alim Basvurusu**\n\nLütfen su bilgileri yaz:\n' +
    '• Yasin\n• Aktiflik saatin\n• Daha önce yetkili oldun mu?\n• Neden yetkili olmak istiyorsun?\n• Bize katkin ne olur?',
  sikayet:
    '🚨 **Sikayet Bildirimi**\n\nLütfen su bilgileri yaz:\n' +
    '• Sikayet ettigin kullanici\n• Olay ne zaman oldu?\n• Ne yasandi? (Detayli anlat)\n• Varsa ekran görüntüleri',
  oneri:
    '💡 **Öneri Formu**\n\nÖnerini detaylica anlat. Neden bu önerinin sunucuya katkisi olacagini da açikla!',
};

// Açık ticketleri takip et: channelId → { userId, kategori }
const acikTicketler = new Map();

// ─── Embed Yardımcıları ───────────────────────────────────────────────────────
function embed(baslik, aciklama, renk = COLORS.DIAMOND) {
  return new EmbedBuilder()
    .setTitle(baslik)
    .setDescription(aciklama)
    .setColor(renk)
    .setFooter({ text: 'CastiVol • Discord Botu' })
    .setTimestamp();
}

function hata(msg) {
  return new EmbedBuilder()
    .setTitle('❌  Hata')
    .setDescription(msg)
    .setColor(COLORS.RED)
    .setTimestamp();
}

function basari(msg) {
  return new EmbedBuilder()
    .setTitle('✅  Basarili')
    .setDescription(msg)
    .setColor(COLORS.GREEN)
    .setTimestamp();
}

// ══════════════════════════════════════════════════════════════════════════════
//  READY
// ══════════════════════════════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║  CastiVol Bot Aktif!             ║`);
  console.log(`║  Kullanici: ${client.user.tag.padEnd(20)}║`);
  console.log(`╚══════════════════════════════════╝\n`);
  client.user.setActivity('⛏️ CastiVol | !yardim', { type: 0 });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MESAJ EVENT
// ══════════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Pasif XP
  if (!message.content.startsWith(PREFIX)) {
    const leveled = addXP(message.author.id, Math.floor(Math.random() * 5) + 1);
    if (leveled) {
      const u = getUser(message.author.id);
      message.channel.send({
        embeds: [embed(
          '🎉  Seviye Atladin!',
          `Tebrikler ${message.author}! Artik **Seviye ${u.level}** oldun! 🏆`,
          COLORS.GOLD
        )],
      });
    }
    return;
  }

  const args  = message.content.slice(PREFIX.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();

  // ══════════════════════════════════════════════════════════════════════════
  //  GENEL KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ping') {
    const t = Date.now();
    const msg = await message.reply({ embeds: [embed('🏓  Pong!', 'Ölçülüyor...', COLORS.EMERALD)] });
    return msg.edit({ embeds: [embed('🏓  Pong!', `🏓 **Bot:** \`${Date.now() - t}ms\`\n📡 **API:** \`${client.ws.ping}ms\``, COLORS.EMERALD)] });
  }

  if (komut === 'sunucu') {
    const g = message.guild;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏰  ${g.name}`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: '👥 Üye',      value: `${g.memberCount}`,                                     inline: true },
            { name: '📅 Kuruluş', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,         inline: true },
            { name: '👑 Sahip',   value: `<@${g.ownerId}>`,                                        inline: true },
            { name: '📢 Kanal',   value: `${g.channels.cache.size}`,                               inline: true },
            { name: '🎭 Rol',     value: `${g.roles.cache.size}`,                                  inline: true },
            { name: '😀 Emoji',   value: `${g.emojis.cache.size}`,                                 inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Discord Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'avatar') {
    const hedef = message.mentions.users.first() || message.author;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️  ${hedef.username} — Avatar`)
          .setImage(hedef.displayAvatarURL({ dynamic: true, size: 512 }))
          .setColor(COLORS.DIAMOND)
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'kullanici') {
    const hedef = message.mentions.members.first() || message.member;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`👤  ${hedef.user.username}`)
          .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏷️ Tag',          value: hedef.user.tag,                                            inline: true },
            { name: '🆔 ID',            value: hedef.id,                                                  inline: true },
            { name: '📅 Katilma',       value: `<t:${Math.floor(hedef.joinedTimestamp / 1000)}:D>`,       inline: true },
            { name: '🎂 Hesap Tarihi',  value: `<t:${Math.floor(hedef.user.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '🎭 En Yüksek Rol', value: `${hedef.roles.highest}`,                                  inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Discord Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'kurallar') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📜  Sunucu Kurallari')
          .setDescription(
            '**1.** Saygi göster, hakaret etme.\n' +
            '**2.** Spam ve flood yasaktir.\n' +
            '**3.** Reklam yapmak yasaktir.\n' +
            '**4.** NSFW içerik paylasmak yasaktir.\n' +
            '**5.** Yetkililerin kararlarina uy.\n' +
            '**6.** Troll ve provokasyon yasaktir.\n' +
            '**7.** Kural ihlalleri ban/kick ile sonuçlanir.\n\n' +
            '> Kurallari çigneyenler uyarilmadan cezalandirabilir!'
          )
          .setColor(COLORS.GOLD)
          .setFooter({ text: 'CastiVol • Sunucu Kurallari' })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DUYURU (GELİŞTİRİLMİŞ)
  // ══════════════════════════════════════════════════════════════════════════
  // Kullanim:
  //   !duyuru <metin>              → @everyone normal duyuru
  //   !duyuru -rol @rol <metin>   → role özel ping
  //   !duyuru -sessiz <metin>     → pingsiz duyuru
  //   !duyuru -acil <metin>       → kirmizi acil duyuru

  if (komut === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajlari Yönet** yetkisine ihtiyacin var!')] });

    let pingIcerik = '@everyone';
    let metin = '';
    let duyuruRenk = COLORS.GOLD;
    let duyuruBaslik = '📣  Duyuru';
    let tip = 'Normal';

    if (args[0] === '-rol') {
      const rolMention = message.mentions.roles.first();
      if (!rolMention) return message.reply({ embeds: [hata('`!duyuru -rol @rol <metin>`')] });
      pingIcerik = `${rolMention}`;
      metin = args.slice(2).join(' ');
      tip = 'Role Özel';
      duyuruBaslik = '📣  Role Özel Duyuru';
    } else if (args[0] === '-sessiz') {
      pingIcerik = null;
      metin = args.slice(1).join(' ');
      tip = 'Sessiz';
      duyuruRenk = COLORS.DIAMOND;
      duyuruBaslik = '📢  Sessiz Duyuru';
    } else if (args[0] === '-acil') {
      metin = args.slice(1).join(' ');
      tip = 'Acil';
      duyuruRenk = COLORS.RED;
      duyuruBaslik = '🚨  ACİL DUYURU';
    } else {
      metin = args.join(' ');
    }

    if (!metin) return message.reply({ embeds: [hata(
      '**Duyuru Kullanimi:**\n' +
      '`!duyuru <metin>` — Normal @everyone duyuru\n' +
      '`!duyuru -rol @rol <metin>` — Role özel ping\n' +
      '`!duyuru -sessiz <metin>` — Pingsiz duyuru\n' +
      '`!duyuru -acil <metin>` — Acil kirmizi duyuru'
    )] });

    message.delete().catch(() => {});

    return message.channel.send({
      content: pingIcerik ?? undefined,
      embeds: [
        new EmbedBuilder()
          .setTitle(duyuruBaslik)
          .setDescription(metin)
          .setColor(duyuruRenk)
          .addFields(
            { name: '👤 Duyuran', value: `${message.author}`,                         inline: true },
            { name: '📋 Tip',     value: tip,                                           inline: true },
            { name: '📅 Tarih',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`,     inline: true },
          )
          .setFooter({ text: `CastiVol • ${tip} Duyuru` })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MODERATİF KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('**Üye Yasakla** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!ban @kullanici [sebep]`')] });
    if (!hedef.bannable) return message.reply({ embeds: [hata('Bu kullaniciyi yasaklayamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.ban({ reason: sebep });
    return message.reply({ embeds: [embed('🔨  Kullanici Yasaklandi', `**${hedef.user.tag}** yasaklandi.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [hata('**Üye At** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!kick @kullanici [sebep]`')] });
    if (!hedef.kickable) return message.reply({ embeds: [hata('Bu kullaniciyi atamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.kick(sebep);
    return message.reply({ embeds: [embed('👢  Kullanici Atildi', `**${hedef.user.tag}** atildi.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'unban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('**Üye Yasakla** yetkisine ihtiyacin var!')] });
    const userId = args[0];
    if (!userId) return message.reply({ embeds: [hata('`!unban <kullanici ID>`')] });
    await message.guild.members.unban(userId).catch(() => {});
    return message.reply({ embeds: [basari(`**${userId}** yasagi kaldirildi!`)] });
  }

  if (komut === 'temizle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajlari Yönet** yetkisine ihtiyacin var!')] });
    const miktar = parseInt(args[0]);
    if (isNaN(miktar) || miktar < 1 || miktar > 100)
      return message.reply({ embeds: [hata('1-100 arasi sayi gir! `!temizle <sayi>`')] });
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    const bilgi = await message.channel.send({ embeds: [basari(`**${miktar}** mesaj silindi! 🧹`)] });
    setTimeout(() => bilgi.delete().catch(() => {}), 3000);
    return;
  }

  if (komut === 'kilitle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanallari Yönet** yetkisine ihtiyacin var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply({ embeds: [embed('🔒  Kanal Kilitlendi', `${message.channel} kilitlendi.`, COLORS.RED)] });
  }

  if (komut === 'ac') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanallari Yönet** yetkisine ihtiyacin var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.reply({ embeds: [embed('🔓  Kanal Açildi', `${message.channel} açildi.`, COLORS.GREEN)] });
  }

  if (komut === 'sustur') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('**Üyeleri Sustur** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!sustur @kullanici <dakika>`')] });
    const dakika = parseInt(args[1]) || 10;
    await hedef.timeout(dakika * 60 * 1000, 'Susturuldu');
    return message.reply({ embeds: [embed('🔇  Kullanici Susturuldu', `**${hedef.user.tag}** **${dakika} dakika** susturuldu.`, COLORS.RED)] });
  }

  if (komut === 'uyar') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('**Üyeleri Sustur** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!uyar @kullanici <sebep>`')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    hedef.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('⚠️  Uyari Aldin')
          .setDescription(`**${message.guild.name}** sunucusunda uyarildin.`)
          .addFields({ name: '📝 Sebep', value: sebep })
          .setColor(COLORS.ORANGE)
          .setTimestamp(),
      ],
    }).catch(() => {});
    return message.reply({ embeds: [embed('⚠️  Uyari Verildi', `${hedef} uyarildi.\n**Sebep:** ${sebep}`, COLORS.ORANGE)] });
  }

  if (komut === 'rol-ver') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('**Rolleri Yönet** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-ver @kullanici @rol`')] });
    await hedef.roles.add(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullanicisina **${rol.name}** rolü verildi!`)] });
  }

  if (komut === 'rol-al') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('**Rolleri Yönet** yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-al @kullanici @rol`')] });
    await hedef.roles.remove(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullacisindan **${rol.name}** rolü alindi!`)] });
  }

  if (komut === 'anket') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajlari Yönet** yetkisine ihtiyacin var!')] });
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!anket <soru>`')] });
    message.delete().catch(() => {});
    const anketMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('📊  Anket')
          .setDescription(`**${soru}**`)
          .addFields({ name: 'Oy Kullan', value: '✅ Evet   |   ❌ Hayir' })
          .setColor(COLORS.PURPLE)
          .setFooter({ text: `Anket baslatan: ${message.author.tag}` })
          .setTimestamp(),
      ],
    });
    await anketMsg.react('✅');
    await anketMsg.react('❌');
    return;
  }

  if (komut === 'embed-gonder') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajlari Yönet** yetkisine ihtiyacin var!')] });
    const metin = args.join(' ');
    if (!metin) return message.reply({ embeds: [hata('`!embed-gonder <metin>`')] });
    message.delete().catch(() => {});
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(metin)
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: `CastiVol • ${message.author.tag}` })
          .setTimestamp(),
      ],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  XP KOMUTLARI
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'profil') {
    const hedef  = message.mentions.users.first() || message.author;
    const u      = getUser(hedef.id);
    const needed = u.level * 100;
    const dolu   = Math.floor((u.xp / needed) * 10);
    const bar    = '█'.repeat(dolu) + '░'.repeat(10 - dolu);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚔️  ${hedef.username} — Profil`)
          .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏅 Seviye',  value: `${u.level}`,          inline: true },
            { name: '✨ XP',      value: `${u.xp} / ${needed}`, inline: true },
            { name: '📊 XP Bari', value: `\`[${bar}]\``,        inline: false },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Discord Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'siralama') {
    const sorted = [...xpData.entries()]
      .sort((a, b) => (b[1].level * 1000 + b[1].xp) - (a[1].level * 1000 + a[1].xp))
      .slice(0, 10);
    if (!sorted.length) return message.reply({ embeds: [hata('Henüz XP kazanmis kimse yok!')] });
    const medals = ['🥇', '🥈', '🥉'];
    const desc   = sorted
      .map(([id, u], i) => `${medals[i] ?? `**${i + 1}.**`} <@${id}> — Seviye **${u.level}** (\`${u.xp} XP\`)`)
      .join('\n');
    return message.reply({ embeds: [embed('🏆  XP Siralamasi', desc, COLORS.GOLD)] });
  }

  if (komut === 'xpver') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpver @kullanici <miktar>`')] });
    addXP(hedef.id, miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'e **${miktar} XP** verildi!`)] });
  }

  if (komut === 'xpcikar') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpcikar @kullanici <miktar>`')] });
    const u = getUser(hedef.id);
    u.xp = Math.max(0, u.xp - miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'den **${miktar} XP** cikarildi!`)] });
  }

  if (komut === 'xpsifirla') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply({ embeds: [hata('`!xpsifirla @kullanici`')] });
    xpData.set(hedef.id, { xp: 0, level: 1 });
    return message.reply({ embeds: [basari(`**${hedef.username}**'in XP'si sifirlandirildi!`)] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TİCKET SİSTEMİ KURULUM
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_kategori_sec')
      .setPlaceholder('📋 Ticket kategorini seç...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Genel Destek').setDescription('Genel sorular ve yardim talebi').setValue('genel_destek').setEmoji('🎫'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Klan Alim').setDescription('Klana katilmak icin basvur').setValue('klan_alim').setEmoji('⚔️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Klan Merge').setDescription('Klan birlesme talebi').setValue('klan_merge').setEmoji('🤝'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Partnerlik').setDescription('Sunucu partnerlik basvurusu').setValue('partnerlik').setEmoji('🌐'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Yetkili Alim').setDescription('Yetkili olmak icin basvur').setValue('yetkili_alim').setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sikayet').setDescription('Kullanici veya durumu sikayet et').setValue('sikayet').setEmoji('🚨'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Öneri').setDescription('Sunucu icin onerin var mi?').setValue('oneri').setEmoji('💡'),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫  CastiVol Destek Merkezi')
          .setDescription(
            '**Merhaba!** 👋\n\n' +
            'Asagidaki menüden kategoriyi seçerek özel ticket açabilirsin.\n' +
            'Ekibimiz en kisa sürede seninle ilgilenecek!\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n' +
            '⚔️ **Klan Alim** — Klana katilmak istiyorum\n' +
            '🤝 **Klan Merge** — Klan birlesme talebi\n' +
            '🌐 **Partnerlik** — Sunucu partnerlik\n' +
            '🛡️ **Yetkili Alim** — Yetkili basvurusu\n' +
            '🚨 **Sikayet** — Kullanici sikayeti\n' +
            '💡 **Öneri** — Sunucu onerileri\n' +
            '🎫 **Genel Destek** — Diger talepler\n' +
            '━━━━━━━━━━━━━━━━━━━━━━'
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Destek Sistemi' })
          .setTimestamp(),
      ],
      components: [row],
    });

    return message.reply({ embeds: [basari('Ticket sistemi kuruldu!')] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EĞLENCELİ KOMUTLAR
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'zar') {
    const yuz   = parseInt(args[0]) || 6;
    const sonuc = Math.floor(Math.random() * yuz) + 1;
    return message.reply({ embeds: [embed(`🎲  Zar (1-${yuz})`, `**${message.author.username}** zar atti: **${sonuc}**`, COLORS.EMERALD)] });
  }

  if (komut === 'yazi-tura') {
    const sonuc = Math.random() < 0.5 ? '🪙 Yazi' : '🪙 Tura';
    return message.reply({ embeds: [embed('🪙  Yazi mi Tura mi?', `**${sonuc}!**`, COLORS.GOLD)] });
  }

  if (komut === '8top') {
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!8top <soru>`')] });
    const cevaplar = [
      'Kesinlikle evet! ✅', 'Evet! ✅', 'Bence evet! 🟢',
      'Süpheli... 🟡', 'Belki! 🟡', 'Emin degilim 🟡',
      'Hayir! ❌', 'Kesinlikle hayir! ❌', 'Imkansiz! ❌',
    ];
    const cevap = cevaplar[Math.floor(Math.random() * cevaplar.length)];
    return message.reply({ embeds: [embed('🎱  Sihirli 8 Top', `**Soru:** ${soru}\n**Cevap:** ${cevap}`, COLORS.NETHERITE)] });
  }

  if (komut === 'saat') {
    return message.reply({ embeds: [embed('🕐  Su An', `**Tarih/Saat:** \`${new Date().toLocaleString('tr-TR')}\``, COLORS.DIAMOND)] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIM
  // ══════════════════════════════════════════════════════════════════════════

  if (komut === 'yardim' || komut === 'help') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋  CastiVol Komut Listesi')
          .setColor(COLORS.DIAMOND)
          .addFields(
            {
              name: '🛡️ Moderasyon',
              value: '`!ban` `!kick` `!unban` `!temizle` `!kilitle` `!ac` `!sustur` `!uyar` `!rol-ver` `!rol-al`',
            },
            {
              name: '📣 Duyuru',
              value:
                '`!duyuru <metin>` — @everyone\n' +
                '`!duyuru -rol @rol <metin>` — Role özel\n' +
                '`!duyuru -sessiz <metin>` — Pingsiz\n' +
                '`!duyuru -acil <metin>` — Acil',
            },
            {
              name: '🎫 Ticket Sistemi',
              value:
                '`!ticket-kur` — Paneli kur (Admin)\n' +
                'Kategoriler: Genel • Klan Alim • Merge • Partnerlik • Yetkili • Sikayet • Öneri',
            },
            {
              name: '✨ XP Sistemi',
              value: '`!profil` `!siralama` `!xpver` `!xpcikar` `!xpsifirla`',
            },
            {
              name: '🌍 Genel',
              value: '`!ping` `!sunucu` `!avatar` `!kullanici` `!kurallar` `!anket` `!embed-gonder`',
            },
            {
              name: '🎲 Eglence',
              value: '`!zar [yüz]` `!yazi-tura` `!8top <soru>` `!saat`',
            },
          )
          .setFooter({ text: 'CastiVol • Prefix: !' })
          .setTimestamp(),
      ],
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  INTERACTION EVENT — Dropdown + Butonlar
// ══════════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {

  // ── Dropdown Menü: Kategori Seç ───────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_kategori_sec') {
    await interaction.deferReply({ ephemeral: true });

    const secilen  = interaction.values[0];
    const kategori = TICKET_KATEGORILER[secilen];
    const kanalAdi = `ticket-${secilen.replace(/_/g, '-')}-${interaction.user.id}`;

    // Zaten açik ticket var mi?
    const mevcutKanal = interaction.guild.channels.cache.find(c => c.name === kanalAdi);
    if (mevcutKanal) {
      return interaction.editReply({ content: `❌ Bu kategoride zaten açik bir ticketin var: ${mevcutKanal}` });
    }

    // Admin rolü
    const adminRol = interaction.guild.roles.cache.find(
      r => r.permissions.has(PermissionFlagsBits.Administrator) && !r.managed
    );

    const overwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
    ];
    if (adminRol) {
      overwrites.push({
        id: adminRol.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      });
    }

    const kanal = await interaction.guild.channels.create({
      name: kanalAdi,
      type: ChannelType.GuildText,
      topic: `${kategori.label} | ${interaction.user.tag}`,
      permissionOverwrites: overwrites,
    });

    acikTicketler.set(kanal.id, { userId: interaction.user.id, kategori: secilen });

    // Ticket içi butonlar
    const butonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_kapat')
        .setLabel('🔒 Ticketi Kapat')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_sahiplen')
        .setLabel('✋ Sahiplen')
        .setStyle(ButtonStyle.Secondary),
    );

    await kanal.send({
      content: `${interaction.user}${adminRol ? ` | ${adminRol}` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setTitle(`${kategori.label} — Ticket Açildi`)
          .setDescription(TICKET_ACIKLAMALAR[secilen])
          .addFields(
            { name: '👤 Kullanici', value: `${interaction.user}`,                         inline: true },
            { name: '🏷️ Tag',       value: interaction.user.tag,                           inline: true },
            { name: '🆔 ID',        value: interaction.user.id,                            inline: true },
            { name: '📅 Açilis',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,       inline: false },
          )
          .setColor(kategori.renk)
          .setFooter({ text: 'CastiVol • Ticket Sistemi | Sahiplenmek icin butona bas' })
          .setTimestamp(),
      ],
      components: [butonRow],
    });

    return interaction.editReply({
      content: `✅ Ticketin açildi: ${kanal}\nKategori: **${kategori.label}**`,
    });
  }

  if (!interaction.isButton()) return;

  // ── Ticket Kapat ──────────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_kapat') {
    const ticketBilgi = acikTicketler.get(interaction.channel.id);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const isSahip = ticketBilgi && interaction.user.id === ticketBilgi.userId;

    if (!isAdmin && !isSahip) {
      return interaction.reply({ content: '❌ Bu ticketi kapatma yetkin yok!', ephemeral: true });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`🔒 Ticket **5 saniye** içinde kapatiliyor...\nKapatan: ${interaction.user}`)
          .setColor(COLORS.RED),
      ],
    });

    acikTicketler.delete(interaction.channel.id);
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }

  // ── Ticket Sahiplen ───────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_sahiplen') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ Yetkin yok!', ephemeral: true });
    }
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`✋ Bu ticket **${interaction.user}** tarafindan sahiplenildi!`)
          .setColor(COLORS.EMERALD),
      ],
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════════════════════
client.login(process.env.TOKEN || process.env.BOT_TOKEN);
