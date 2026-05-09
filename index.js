// ╔══════════════════════════════════════════════════╗
// ║          CastiVol Discord Bot - index.js         ║
// ║              by Claude  •  v2.1                  ║
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

// ─── Hoşgeldin / Güle Güle Kanalı ─────────────────────────────────────────────
// .env dosyana şunu ekle:  WELCOME_CHANNEL_ID=buraya_kanal_idsi
// Tanımlanmazsa bot sunucudaki system channel ya da ilk yazı kanalını kullanır.

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,   // Hosgeldin/Gule gule icin zorunlu
  ],
});

const PREFIX = '!';

// Renk Paleti
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

// XP Sistemi
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

// Ticket Kategorileri
const TICKET_KATEGORILER = {
  'genel_destek': { label: 'Genel Destek',   renk: COLORS.DIAMOND },
  'klan_alim':    { label: 'Klan Alim',       renk: COLORS.GOLD    },
  'klan_merge':   { label: 'Klan Merge',      renk: COLORS.EMERALD },
  'partnerlik':   { label: 'Partnerlik',      renk: COLORS.PURPLE  },
  'yetkili_alim': { label: 'Yetkili Alim',    renk: COLORS.ORANGE  },
  'sikayet':      { label: 'Sikayet',         renk: COLORS.RED     },
  'oneri':        { label: 'Oneri',           renk: COLORS.GREEN   },
};

const TICKET_ACIKLAMALAR = {
  genel_destek:  'Sorununu veya talebini detaylica anlat. Ekibimiz yardimci olacak!',
  klan_alim:     'Klan Alim Basvurusu\n\nIGN, seviye, neden katilmak istedigini yaz.',
  klan_merge:    'Klan Merge Talebi\n\nKlan adin, uye sayisi ve birlesme gerekceni yaz.',
  partnerlik:    'Partnerlik Basvurusu\n\nSunucu adi, daveti, uye sayisi ve beklentilerini yaz.',
  yetkili_alim:  'Yetkili Alim Basvurusu\n\nYasin, aktifligin, deneyimin ve motivasyonunu yaz.',
  sikayet:       'Sikayet Bildirimi\n\nSikayet ettigin kullanici, olay zamani ve detaylari yaz.',
  oneri:         'Oneri Formu\n\nOnerin ve sunucuya katkilarini detaylica anlat.',
};

const acikTicketler = new Map();

// Embed Yardimcilari
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
    .setTitle('Hata')
    .setDescription(msg)
    .setColor(COLORS.RED)
    .setTimestamp();
}

function basari(msg) {
  return new EmbedBuilder()
    .setTitle('Basarili')
    .setDescription(msg)
    .setColor(COLORS.GREEN)
    .setTimestamp();
}

// Hosgeldin/Gule gule kanal bulucu
function welcomeKanalBul(guild) {
  if (process.env.WELCOME_CHANNEL_ID) {
    const kanal = guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (kanal) return kanal;
  }
  if (guild.systemChannel) return guild.systemChannel;
  return guild.channels.cache.find(
    c => c.type === ChannelType.GuildText &&
         c.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
  );
}

// READY
client.once('ready', () => {
  console.log('CastiVol Bot Aktif! Kullanici: ' + client.user.tag);
  client.user.setActivity('CastiVol | !yardim', { type: 0 });
});

// HOSGELDIN
client.on('guildMemberAdd', async (member) => {
  const kanal = welcomeKanalBul(member.guild);
  if (!kanal) return;

  const hesapYasi = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

  await kanal.send({
    content: `${member}`,
    embeds: [
      new EmbedBuilder()
        .setTitle('Sunucumuza Hos Geldin!')
        .setDescription(
          `Aramiza katildigin icin cok mutluyuz, **${member.user.username}**!\n\n` +
          `Kurallari okudugundan emin ol.\n` +
          `Sorun yasarsan ticket olusturabilirsin.\n\n` +
          `Keyifli vakit gecirimeni dileriz!`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Kullanici',    value: `${member}`,                                                       inline: true },
          { name: 'ID',           value: member.id,                                                         inline: true },
          { name: 'Hesap Yasi',   value: `${hesapYasi} gun`,                                                inline: true },
          { name: 'Toplam Uye',   value: `${member.guild.memberCount}. uye oldu!`,                          inline: true },
          { name: 'Hesap Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`,        inline: true },
          { name: 'Katilma',      value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,              inline: true },
        )
        .setColor(COLORS.EMERALD)
        .setFooter({ text: `CastiVol • ${member.guild.name}` })
        .setTimestamp(),
    ],
  });
});

// GULE GULE
client.on('guildMemberRemove', async (member) => {
  const kanal = welcomeKanalBul(member.guild);
  if (!kanal) return;

  const kaldigiGun = member.joinedTimestamp
    ? Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))
    : null;

  const roller = member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .map(r => r.name)
    .join(', ') || 'Yok';

  await kanal.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('Bir Uye Ayrildi')
        .setDescription(`**${member.user.username}** sunucudan ayrildi. Umariz tekrar gorusuruz!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Kullanici',       value: member.user.tag,                                            inline: true },
          { name: 'ID',              value: member.id,                                                  inline: true },
          { name: 'Kalan Uye',       value: `${member.guild.memberCount}`,                              inline: true },
          ...(kaldigiGun !== null
            ? [{ name: 'Sunucuda Kaldi', value: `${kaldigiGun} gun`,                                   inline: true }]
            : []),
          { name: 'Rolleri',         value: roller,                                                     inline: false },
        )
        .setColor(COLORS.RED)
        .setFooter({ text: `CastiVol • ${member.guild.name}` })
        .setTimestamp(),
    ],
  });
});

// MESAJ EVENT
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith(PREFIX)) {
    const leveled = addXP(message.author.id, Math.floor(Math.random() * 5) + 1);
    if (leveled) {
      const u = getUser(message.author.id);
      message.channel.send({
        embeds: [embed(
          'Seviye Atladin!',
          `Tebrikler ${message.author}! Artik **Seviye ${u.level}** oldun!`,
          COLORS.GOLD
        )],
      });
    }
    return;
  }

  const args  = message.content.slice(PREFIX.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();

  if (komut === 'ping') {
    const t = Date.now();
    const msg = await message.reply({ embeds: [embed('Pong!', 'Olculuyor...', COLORS.EMERALD)] });
    return msg.edit({ embeds: [embed('Pong!', `Bot: \`${Date.now() - t}ms\`\nAPI: \`${client.ws.ping}ms\``, COLORS.EMERALD)] });
  }

  if (komut === 'sunucu') {
    const g = message.guild;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(g.name)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: 'Uye',     value: `${g.memberCount}`,                                    inline: true },
            { name: 'Kurulus', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,       inline: true },
            { name: 'Sahip',   value: `<@${g.ownerId}>`,                                     inline: true },
            { name: 'Kanal',   value: `${g.channels.cache.size}`,                            inline: true },
            { name: 'Rol',     value: `${g.roles.cache.size}`,                               inline: true },
            { name: 'Emoji',   value: `${g.emojis.cache.size}`,                              inline: true },
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
          .setTitle(`${hedef.username} Avatar`)
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
          .setTitle(hedef.user.username)
          .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Tag',          value: hedef.user.tag,                                           inline: true },
            { name: 'ID',           value: hedef.id,                                                 inline: true },
            { name: 'Katilma',      value: `<t:${Math.floor(hedef.joinedTimestamp / 1000)}:D>`,      inline: true },
            { name: 'Hesap Tarihi', value: `<t:${Math.floor(hedef.user.createdTimestamp / 1000)}:D>`,inline: true },
            { name: 'En Yuksek Rol',value: `${hedef.roles.highest}`,                                 inline: true },
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
          .setTitle('Sunucu Kurallari')
          .setDescription(
            '**1.** Saygi goster, hakaret etme.\n' +
            '**2.** Spam ve flood yasaktir.\n' +
            '**3.** Reklam yapmak yasaktir.\n' +
            '**4.** NSFW icerik paylasmak yasaktir.\n' +
            '**5.** Yetkililerin kararlarina uy.\n' +
            '**6.** Troll ve provokasyon yasaktir.\n' +
            '**7.** Kural ihlalleri ban/kick ile sonuclanir.\n\n' +
            '> Kurallari cigneyenler uyarilmadan cezalandirabilir!'
          )
          .setColor(COLORS.GOLD)
          .setFooter({ text: 'CastiVol • Sunucu Kurallari' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('Mesajlari Yonet yetkisine ihtiyacin var!')] });

    let pingIcerik = '@everyone';
    let metin = '';
    let duyuruRenk = COLORS.GOLD;
    let duyuruBaslik = 'Duyuru';
    let tip = 'Normal';

    if (args[0] === '-rol') {
      const rolMention = message.mentions.roles.first();
      if (!rolMention) return message.reply({ embeds: [hata('`!duyuru -rol @rol <metin>`')] });
      pingIcerik = `${rolMention}`;
      metin = args.slice(2).join(' ');
      tip = 'Role Ozel';
      duyuruBaslik = 'Role Ozel Duyuru';
    } else if (args[0] === '-sessiz') {
      pingIcerik = null;
      metin = args.slice(1).join(' ');
      tip = 'Sessiz';
      duyuruRenk = COLORS.DIAMOND;
      duyuruBaslik = 'Sessiz Duyuru';
    } else if (args[0] === '-acil') {
      metin = args.slice(1).join(' ');
      tip = 'Acil';
      duyuruRenk = COLORS.RED;
      duyuruBaslik = 'ACIL DUYURU';
    } else {
      metin = args.join(' ');
    }

    if (!metin) return message.reply({ embeds: [hata(
      'Duyuru Kullanimi:\n' +
      '`!duyuru <metin>` - Normal @everyone\n' +
      '`!duyuru -rol @rol <metin>` - Role ozel\n' +
      '`!duyuru -sessiz <metin>` - Pingsiz\n' +
      '`!duyuru -acil <metin>` - Acil'
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
            { name: 'Duyuran', value: `${message.author}`,                      inline: true },
            { name: 'Tip',     value: tip,                                       inline: true },
            { name: 'Tarih',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          )
          .setFooter({ text: `CastiVol • ${tip} Duyuru` })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('Uye Yasakla yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!ban @kullanici [sebep]`')] });
    if (!hedef.bannable) return message.reply({ embeds: [hata('Bu kullaniciyi yasaklayamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.ban({ reason: sebep });
    return message.reply({ embeds: [embed('Kullanici Yasaklandi', `**${hedef.user.tag}** yasaklandi.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [hata('Uye At yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!kick @kullanici [sebep]`')] });
    if (!hedef.kickable) return message.reply({ embeds: [hata('Bu kullaniciyi atamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.kick(sebep);
    return message.reply({ embeds: [embed('Kullanici Atildi', `**${hedef.user.tag}** atildi.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'unban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('Uye Yasakla yetkisine ihtiyacin var!')] });
    const userId = args[0];
    if (!userId) return message.reply({ embeds: [hata('`!unban <kullanici ID>`')] });
    await message.guild.members.unban(userId).catch(() => {});
    return message.reply({ embeds: [basari(`**${userId}** yasagi kaldirildi!`)] });
  }

  if (komut === 'temizle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('Mesajlari Yonet yetkisine ihtiyacin var!')] });
    const miktar = parseInt(args[0]);
    if (isNaN(miktar) || miktar < 1 || miktar > 100)
      return message.reply({ embeds: [hata('1-100 arasi sayi gir! `!temizle <sayi>`')] });
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    const bilgi = await message.channel.send({ embeds: [basari(`**${miktar}** mesaj silindi!`)] });
    setTimeout(() => bilgi.delete().catch(() => {}), 3000);
    return;
  }

  if (komut === 'kilitle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('Kanallari Yonet yetkisine ihtiyacin var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply({ embeds: [embed('Kanal Kilitlendi', `${message.channel} kilitlendi.`, COLORS.RED)] });
  }

  if (komut === 'ac') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('Kanallari Yonet yetkisine ihtiyacin var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.reply({ embeds: [embed('Kanal Acildi', `${message.channel} acildi.`, COLORS.GREEN)] });
  }

  if (komut === 'sustur') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('Uyeleri Sustur yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!sustur @kullanici <dakika>`')] });
    const dakika = parseInt(args[1]) || 10;
    await hedef.timeout(dakika * 60 * 1000, 'Susturuldu');
    return message.reply({ embeds: [embed('Kullanici Susturuldu', `**${hedef.user.tag}** **${dakika} dakika** susturuldu.`, COLORS.RED)] });
  }

  if (komut === 'uyar') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('Uyeleri Sustur yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!uyar @kullanici <sebep>`')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    hedef.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Uyari Aldin')
          .setDescription(`**${message.guild.name}** sunucusunda uyarildin.`)
          .addFields({ name: 'Sebep', value: sebep })
          .setColor(COLORS.ORANGE)
          .setTimestamp(),
      ],
    }).catch(() => {});
    return message.reply({ embeds: [embed('Uyari Verildi', `${hedef} uyarildi.\n**Sebep:** ${sebep}`, COLORS.ORANGE)] });
  }

  if (komut === 'rol-ver') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('Rolleri Yonet yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-ver @kullanici @rol`')] });
    await hedef.roles.add(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullanicisina **${rol.name}** rolu verildi!`)] });
  }

  if (komut === 'rol-al') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply({ embeds: [hata('Rolleri Yonet yetkisine ihtiyacin var!')] });
    const hedef = message.mentions.members.first();
    const rol   = message.mentions.roles.first();
    if (!hedef || !rol) return message.reply({ embeds: [hata('`!rol-al @kullanici @rol`')] });
    await hedef.roles.remove(rol).catch(() => {});
    return message.reply({ embeds: [basari(`${hedef} kullacisindan **${rol.name}** rolu alindi!`)] });
  }

  if (komut === 'anket') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('Mesajlari Yonet yetkisine ihtiyacin var!')] });
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!anket <soru>`')] });
    message.delete().catch(() => {});
    const anketMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Anket')
          .setDescription(`**${soru}**`)
          .addFields({ name: 'Oy Kullan', value: 'Evet   |   Hayir' })
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
      return message.reply({ embeds: [hata('Mesajlari Yonet yetkisine ihtiyacin var!')] });
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

  if (komut === 'profil') {
    const hedef  = message.mentions.users.first() || message.author;
    const u      = getUser(hedef.id);
    const needed = u.level * 100;
    const dolu   = Math.floor((u.xp / needed) * 10);
    const bar    = '\u2588'.repeat(dolu) + '\u2591'.repeat(10 - dolu);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${hedef.username} Profil`)
          .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Seviye', value: `${u.level}`,          inline: true },
            { name: 'XP',     value: `${u.xp} / ${needed}`, inline: true },
            { name: 'XP Bar', value: `\`[${bar}]\``,         inline: false },
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
    if (!sorted.length) return message.reply({ embeds: [hata('Henuz XP kazanmis kimse yok!')] });
    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    const desc   = sorted
      .map(([id, u], i) => `${medals[i] ?? `**${i + 1}.**`} <@${id}> Seviye **${u.level}** (\`${u.xp} XP\`)`)
      .join('\n');
    return message.reply({ embeds: [embed('XP Siralamasi', desc, COLORS.GOLD)] });
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

  if (komut === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Sadece adminler kullanabilir!')] });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_kategori_sec')
      .setPlaceholder('Ticket kategorini sec...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Genel Destek').setDescription('Genel sorular ve yardim talebi').setValue('genel_destek').setEmoji('🎫'),
        new StringSelectMenuOptionBuilder().setLabel('Klan Alim').setDescription('Klana katilmak icin basvur').setValue('klan_alim').setEmoji('⚔️'),
        new StringSelectMenuOptionBuilder().setLabel('Klan Merge').setDescription('Klan birlesme talebi').setValue('klan_merge').setEmoji('🤝'),
        new StringSelectMenuOptionBuilder().setLabel('Partnerlik').setDescription('Sunucu partnerlik basvurusu').setValue('partnerlik').setEmoji('🌐'),
        new StringSelectMenuOptionBuilder().setLabel('Yetkili Alim').setDescription('Yetkili olmak icin basvur').setValue('yetkili_alim').setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder().setLabel('Sikayet').setDescription('Kullanici veya durumu sikayet et').setValue('sikayet').setEmoji('🚨'),
        new StringSelectMenuOptionBuilder().setLabel('Oneri').setDescription('Sunucu icin onerin var mi?').setValue('oneri').setEmoji('💡'),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('CastiVol Destek Merkezi')
          .setDescription(
            'Merhaba!\n\n' +
            'Asagidaki menuuden kategoriyi secerek ozel ticket acabilirsin.\n' +
            'Ekibimiz en kisa surede seninle ilgilenecek!\n\n' +
            'Klan Alim - Klana katilmak istiyorum\n' +
            'Klan Merge - Klan birlesme talebi\n' +
            'Partnerlik - Sunucu partnerlik\n' +
            'Yetkili Alim - Yetkili basvurusu\n' +
            'Sikayet - Kullanici sikayeti\n' +
            'Oneri - Sunucu onerileri\n' +
            'Genel Destek - Diger talepler'
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Destek Sistemi' })
          .setTimestamp(),
      ],
      components: [row],
    });

    return message.reply({ embeds: [basari('Ticket sistemi kuruldu!')] });
  }

  if (komut === 'zar') {
    const yuz   = parseInt(args[0]) || 6;
    const sonuc = Math.floor(Math.random() * yuz) + 1;
    return message.reply({ embeds: [embed(`Zar (1-${yuz})`, `**${message.author.username}** zar atti: **${sonuc}**`, COLORS.EMERALD)] });
  }

  if (komut === 'yazi-tura') {
    const sonuc = Math.random() < 0.5 ? 'Yazi' : 'Tura';
    return message.reply({ embeds: [embed('Yazi mi Tura mi?', `**${sonuc}!**`, COLORS.GOLD)] });
  }

  if (komut === '8top') {
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('`!8top <soru>`')] });
    const cevaplar = [
      'Kesinlikle evet!', 'Evet!', 'Bence evet!',
      'Supheli...', 'Belki!', 'Emin degilim',
      'Hayir!', 'Kesinlikle hayir!', 'Imkansiz!',
    ];
    const cevap = cevaplar[Math.floor(Math.random() * cevaplar.length)];
    return message.reply({ embeds: [embed('Sihirli 8 Top', `**Soru:** ${soru}\n**Cevap:** ${cevap}`, COLORS.NETHERITE)] });
  }

  if (komut === 'saat') {
    return message.reply({ embeds: [embed('Su An', `**Tarih/Saat:** \`${new Date().toLocaleString('tr-TR')}\``, COLORS.DIAMOND)] });
  }

  if (komut === 'yardim' || komut === 'help') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('CastiVol Komut Listesi')
          .setColor(COLORS.DIAMOND)
          .addFields(
            { name: 'Moderasyon',    value: '`!ban` `!kick` `!unban` `!temizle` `!kilitle` `!ac` `!sustur` `!uyar` `!rol-ver` `!rol-al`' },
            { name: 'Duyuru',        value: '`!duyuru <metin>` `!duyuru -rol @rol <metin>` `!duyuru -sessiz` `!duyuru -acil`' },
            { name: 'Ticket',        value: '`!ticket-kur` (Admin)' },
            { name: 'XP Sistemi',    value: '`!profil` `!siralama` `!xpver` `!xpcikar` `!xpsifirla`' },
            { name: 'Genel',         value: '`!ping` `!sunucu` `!avatar` `!kullanici` `!kurallar` `!anket` `!embed-gonder`' },
            { name: 'Eglence',       value: '`!zar [yuz]` `!yazi-tura` `!8top <soru>` `!saat`' },
          )
          .setFooter({ text: 'CastiVol • Prefix: !' })
          .setTimestamp(),
      ],
    });
  }
});

// INTERACTION EVENT
client.on('interactionCreate', async (interaction) => {

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_kategori_sec') {
    await interaction.deferReply({ ephemeral: true });

    const secilen  = interaction.values[0];
    const kategori = TICKET_KATEGORILER[secilen];
    const kanalAdi = `ticket-${secilen.replace(/_/g, '-')}-${interaction.user.id}`;

    const mevcutKanal = interaction.guild.channels.cache.find(c => c.name === kanalAdi);
    if (mevcutKanal) {
      return interaction.editReply({ content: `Bu kategoride zaten acik bir ticketin var: ${mevcutKanal}` });
    }

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

    const butonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_kapat').setLabel('Ticketi Kapat').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_sahiplen').setLabel('Sahiplen').setStyle(ButtonStyle.Secondary),
    );

    await kanal.send({
      content: `${interaction.user}${adminRol ? ` | ${adminRol}` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setTitle(`${kategori.label} Ticket Acildi`)
          .setDescription(TICKET_ACIKLAMALAR[secilen])
          .addFields(
            { name: 'Kullanici', value: `${interaction.user}`,                    inline: true },
            { name: 'Tag',       value: interaction.user.tag,                     inline: true },
            { name: 'ID',        value: interaction.user.id,                      inline: true },
            { name: 'Acilis',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          )
          .setColor(kategori.renk)
          .setFooter({ text: 'CastiVol • Ticket Sistemi' })
          .setTimestamp(),
      ],
      components: [butonRow],
    });

    return interaction.editReply({
      content: `Ticketin acildi: ${kanal}\nKategori: **${kategori.label}**`,
    });
  }

  if (!interaction.isButton()) return;

  if (interaction.customId === 'ticket_kapat') {
    const ticketBilgi = acikTicketler.get(interaction.channel.id);
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const isSahip = ticketBilgi && interaction.user.id === ticketBilgi.userId;

    if (!isAdmin && !isSahip) {
      return interaction.reply({ content: 'Bu ticketi kapatma yetkin yok!', ephemeral: true });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Ticket 5 saniye icinde kapatiliyor...\nKapatan: ${interaction.user}`)
          .setColor(COLORS.RED),
      ],
    });

    acikTicketler.delete(interaction.channel.id);
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }

  if (interaction.customId === 'ticket_sahiplen') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
    }
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Bu ticket **${interaction.user}** tarafindan sahiplenildi!`)
          .setColor(COLORS.EMERALD),
      ],
    });
  }
});

// LOGIN
client.login(process.env.TOKEN || process.env.BOT_TOKEN);
