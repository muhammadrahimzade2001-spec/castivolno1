// ╔══════════════════════════════════════════════════╗
// ║          CastiVol Discord Bot - index.js         ║
// ║         Minecraft Klan Botu | by Claude          ║
// ╚══════════════════════════════════════════════════╝

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

require('dotenv').config();

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
};

// ─── XP Sistemi ───────────────────────────────────────────────────────────────
const xpData = new Map(); // userId → { xp, level }

function getUser(id) {
  if (!xpData.has(id)) xpData.set(id, { xp: 0, level: 1 });
  return xpData.get(id);
}

function addXP(id, amount) {
  const u = getUser(id);
  u.xp += amount;
  const needed = u.level * 100;
  if (u.xp >= needed) {
    u.xp -= needed;
    u.level++;
    return true;
  }
  return false;
}

// ─── Klan Sistemi ─────────────────────────────────────────────────────────────
const klanlar  = new Map(); // klanAdı → { sahip, uyeler[], aciklama }
const userKlan = new Map(); // userId  → klanAdı

// ─── Embed Yardımcıları ───────────────────────────────────────────────────────
function embed(baslik, aciklama, renk = COLORS.DIAMOND) {
  return new EmbedBuilder()
    .setTitle(`⛏️  ${baslik}`)
    .setDescription(aciklama)
    .setColor(renk)
    .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
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
    .setTitle('✅  Başarılı')
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
  console.log(`║  Kullanıcı: ${client.user.tag.padEnd(20)}║`);
  console.log(`╚══════════════════════════════════╝\n`);
  client.user.setActivity('⛏️ Minecraft Klan | !yardim', { type: 0 });
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
          'Seviye Atladın! 🎉',
          `Tebrikler ${message.author}! Artık **Seviye ${u.level}** oldun! 🏆`,
          COLORS.GOLD
        )],
      });
    }
    return;
  }

  const args   = message.content.slice(PREFIX.length).trim().split(/ +/);
  const komut  = args.shift().toLowerCase();

  // ── GENEL ─────────────────────────────────────────────────────────────────

  if (komut === 'ping') {
    const baslangic = Date.now();
    const msg = await message.reply({ embeds: [embed('Pong! 🏓', 'Ölçülüyor...', COLORS.EMERALD)] });
    msg.edit({
      embeds: [embed(
        'Pong! 🏓',
        `🏓 **Bot Gecikmesi:** \`${Date.now() - baslangic}ms\`\n📡 **API Gecikmesi:** \`${client.ws.ping}ms\``,
        COLORS.EMERALD
      )],
    });
    return;
  }

  if (komut === 'sunucu') {
    const g = message.guild;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏰  ${g.name}`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: '👥 Üye Sayısı',   value: `${g.memberCount}`,                                         inline: true },
            { name: '📅 Kuruluş',       value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,            inline: true },
            { name: '👑 Sahip',         value: `<@${g.ownerId}>`,                                           inline: true },
            { name: '📢 Kanal Sayısı',  value: `${g.channels.cache.size}`,                                  inline: true },
            { name: '🎭 Rol Sayısı',    value: `${g.roles.cache.size}`,                                     inline: true },
            { name: '😀 Emoji Sayısı',  value: `${g.emojis.cache.size}`,                                    inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
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
            { name: '🏷️ Kullanıcı Adı', value: hedef.user.tag,                                            inline: true },
            { name: '🆔 ID',             value: hedef.id,                                                   inline: true },
            { name: '📅 Katılma',        value: `<t:${Math.floor(hedef.joinedTimestamp / 1000)}:D>`,         inline: true },
            { name: '🎂 Hesap Tarihi',   value: `<t:${Math.floor(hedef.user.createdTimestamp / 1000)}:D>`,   inline: true },
            { name: '🎭 En Yüksek Rol',  value: `${hedef.roles.highest}`,                                   inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const metin = args.join(' ');
    if (!metin) return message.reply({ embeds: [hata('`!duyuru <metin>`')] });
    message.delete().catch(() => {});
    return message.channel.send({
      content: '@everyone',
      embeds: [
        new EmbedBuilder()
          .setTitle('📣  Duyuru')
          .setDescription(metin)
          .setColor(COLORS.GOLD)
          .setFooter({ text: `Duyuran: ${message.author.tag}` })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'minecraft-ip') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌍  CastiVol Minecraft Sunucusu')
          .setDescription('> Sunucuya katılmak için aşağıdaki IP\'yi kullan!')
          .addFields(
            { name: '🖥️ IP Adresi', value: '`mc.castivol.net`', inline: true },
            { name: '🔌 Port',       value: '`25565`',           inline: true },
            { name: '🎮 Versiyon',   value: '`1.21.x`',          inline: true },
          )
          .setColor(COLORS.EMERALD)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
    });
  }

  // ── MODERATİF ──────────────────────────────────────────────────────────────

  if (komut === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('**Üye Yasakla** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!ban @kullanıcı [sebep]`')] });
    if (!hedef.bannable) return message.reply({ embeds: [hata('Bu kullanıcıyı yasaklayamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.ban({ reason: sebep });
    return message.reply({ embeds: [embed('Kullanıcı Yasaklandı 🔨', `**${hedef.user.tag}** yasaklandı.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [hata('**Üye At** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!kick @kullanıcı [sebep]`')] });
    if (!hedef.kickable) return message.reply({ embeds: [hata('Bu kullanıcıyı atamam!')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.kick(sebep);
    return message.reply({ embeds: [embed('Kullanıcı Atıldı 👢', `**${hedef.user.tag}** atıldı.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  if (komut === 'temizle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('**Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const miktar = parseInt(args[0]);
    if (isNaN(miktar) || miktar < 1 || miktar > 100)
      return message.reply({ embeds: [hata('1–100 arası bir sayı gir! `!temizle <sayı>`')] });
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    const bilgi = await message.channel.send({ embeds: [basari(`**${miktar}** mesaj silindi! 🧹`)] });
    setTimeout(() => bilgi.delete().catch(() => {}), 3000);
    return;
  }

  if (komut === 'kilitle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply({ embeds: [embed('Kanal Kilitlendi 🔒', `${message.channel} kilitlendi.`, COLORS.RED)] });
  }

  if (komut === 'ac' || komut === 'aç') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('**Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    return message.reply({ embeds: [embed('Kanal Açıldı 🔓', `${message.channel} açıldı.`, COLORS.GREEN)] });
  }

  if (komut === 'sustur') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('**Üyeleri Sustur** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!sustur @kullanıcı <dakika>`')] });
    const dakika = parseInt(args[1]) || 10;
    await hedef.timeout(dakika * 60 * 1000, 'Susturuldu');
    return message.reply({ embeds: [embed('Kullanıcı Susturuldu 🔇', `**${hedef.user.tag}** **${dakika} dakika** susturuldu.`, COLORS.RED)] });
  }

  // ── XP KOMUTLARI ──────────────────────────────────────────────────────────

  if (komut === 'profil') {
    const hedef = message.mentions.users.first() || message.author;
    const u      = getUser(hedef.id);
    const needed = u.level * 100;
    const dolu   = Math.floor((u.xp / needed) * 10);
    const bar    = '█'.repeat(dolu) + '░'.repeat(10 - dolu);
    const klan   = userKlan.get(hedef.id) || 'Klansız';
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚔️  ${hedef.username} — Profil`)
          .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏅 Seviye', value: `${u.level}`,          inline: true },
            { name: '✨ XP',     value: `${u.xp} / ${needed}`, inline: true },
            { name: '🏰 Klan',   value: klan,                   inline: true },
            { name: '📊 XP Barı', value: `\`[${bar}]\``,       inline: false },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'siralama' || komut === 'sıralama') {
    const sorted = [...xpData.entries()]
      .sort((a, b) => (b[1].level * 1000 + b[1].xp) - (a[1].level * 1000 + a[1].xp))
      .slice(0, 10);
    if (!sorted.length) return message.reply({ embeds: [hata('Henüz XP kazanmış kimse yok!')] });
    const medals = ['🥇', '🥈', '🥉'];
    const desc   = sorted
      .map(([id, u], i) => `${medals[i] ?? `**${i + 1}.**`} <@${id}> — Seviye **${u.level}** (\`${u.xp} XP\`)`)
      .join('\n');
    return message.reply({ embeds: [embed('🏆  XP Sıralaması', desc, COLORS.GOLD)] });
  }

  if (komut === 'xpver') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpver @kullanıcı <miktar>`')] });
    addXP(hedef.id, miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'e **${miktar} XP** verildi!`)] });
  }

  if (komut === 'xpcikar' || komut === 'xpçıkar') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef  = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpcikar @kullanıcı <miktar>`')] });
    const u = getUser(hedef.id);
    u.xp = Math.max(0, u.xp - miktar);
    return message.reply({ embeds: [basari(`**${hedef.username}**'den **${miktar} XP** çıkarıldı!`)] });
  }

  if (komut === 'xpsifirla' || komut === 'xpsıfırla') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply({ embeds: [hata('`!xpsifirla @kullanıcı`')] });
    xpData.set(hedef.id, { xp: 0, level: 1 });
    return message.reply({ embeds: [basari(`**${hedef.username}**'in XP'si sıfırlandı!`)] });
  }

  // ── KLAN KOMUTLARI ────────────────────────────────────────────────────────

  if (komut === 'klan-kur') {
    const ad = args[0];
    if (!ad) return message.reply({ embeds: [hata('`!klan-kur <klan adı>`')] });
    if (userKlan.has(message.author.id))
      return message.reply({ embeds: [hata('Zaten bir klana üyesin!')] });
    if (klanlar.has(ad))
      return message.reply({ embeds: [hata('Bu isimde klan zaten var!')] });
    klanlar.set(ad, { sahip: message.author.id, uyeler: [message.author.id], aciklama: '—' });
    userKlan.set(message.author.id, ad);
    return message.reply({ embeds: [embed('Klan Kuruldu! 🏰', `**${ad}** klanu başarıyla kuruldu!\nSahip: ${message.author}`, COLORS.GOLD)] });
  }

  if (komut === 'uye' || komut === 'üye') {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!uye @kullanıcı`')] });
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana sahip değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id)
      return message.reply({ embeds: [hata('Sadece klan sahibi üye ekleyebilir!')] });
    if (userKlan.has(hedef.id))
      return message.reply({ embeds: [hata('Bu kişi zaten bir klana üye!')] });
    klan.uyeler.push(hedef.id);
    userKlan.set(hedef.id, ad);
    return message.reply({ embeds: [basari(`${hedef} **${ad}** klanına eklendi! ⚔️`)] });
  }

  if (komut === 'uyeler' || komut === 'üyeler') {
    const ad   = args[0] || userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Klan adı belirt veya bir klana gir!')] });
    const klan = klanlar.get(ad);
    if (!klan) return message.reply({ embeds: [hata('Böyle bir klan yok!')] });
    const liste = klan.uyeler
      .map((id, i) => `${i + 1}. <@${id}>${id === klan.sahip ? ' 👑' : ''}`)
      .join('\n');
    return message.reply({ embeds: [embed(`🏰  ${ad} — Üyeler`, liste || 'Hiç üye yok.', COLORS.DIAMOND)] });
  }

  if (komut === 'cikar' || komut === 'çıkar') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana üye değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip === message.author.id)
      return message.reply({ embeds: [hata('Klan sahibi çıkamaz! Önce klanı sil: `!klan-sil`')] });
    klan.uyeler = klan.uyeler.filter(id => id !== message.author.id);
    userKlan.delete(message.author.id);
    return message.reply({ embeds: [basari(`**${ad}** klanından çıktın!`)] });
  }

  if (komut === 'klan-sil') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klan sahibi değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id)
      return message.reply({ embeds: [hata('Sadece klan sahibi silebilir!')] });
    klan.uyeler.forEach(id => userKlan.delete(id));
    klanlar.delete(ad);
    return message.reply({ embeds: [embed('Klan Silindi 💔', `**${ad}** klanu silindi.`, COLORS.RED)] });
  }

  if (komut === 'klan-bilgi') {
    const ad   = args[0] || userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('`!klan-bilgi <klan adı>`')] });
    const klan = klanlar.get(ad);
    if (!klan) return message.reply({ embeds: [hata('Böyle bir klan yok!')] });
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏰  ${ad}`)
          .addFields(
            { name: '👑 Sahip',       value: `<@${klan.sahip}>`,     inline: true },
            { name: '👥 Üye Sayısı',  value: `${klan.uyeler.length}`, inline: true },
            { name: '📝 Açıklama',    value: klan.aciklama,           inline: false },
          )
          .setColor(COLORS.GOLD)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
    });
  }

  if (komut === 'klan-aciklama' || komut === 'klan-açıklama') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana üye değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id)
      return message.reply({ embeds: [hata('Sadece klan sahibi açıklama değiştirebilir!')] });
    const aciklama = args.join(' ');
    if (!aciklama) return message.reply({ embeds: [hata('`!klan-aciklama <metin>`')] });
    klan.aciklama = aciklama;
    return message.reply({ embeds: [basari('Klan açıklaması güncellendi!')] });
  }

  // ── TİCKET SİSTEMİ ────────────────────────────────────────────────────────

  if (komut === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_ac')
        .setLabel('🎫 Ticket Aç')
        .setStyle(ButtonStyle.Primary),
    );

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫  Destek Ticket Sistemi')
          .setDescription(
            '**Yardıma mı ihtiyacın var?**\n\n' +
            'Aşağıdaki butona tıklayarak özel bir destek kanalı aç.\n' +
            'Ekibimiz en kısa sürede seninle ilgilenecek! 💙'
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
      components: [row],
    });

    return message.reply({ embeds: [basari('Ticket sistemi kuruldu!')] });
  }

  // ── EĞLENCELİ KOMUTLAR ────────────────────────────────────────────────────

  if (komut === 'zar') {
    const yuz   = parseInt(args[0]) || 6;
    const sonuc = Math.floor(Math.random() * yuz) + 1;
    return message.reply({ embeds: [embed(`🎲  Zar (1–${yuz})`, `**${message.author.username}** zar attı: **${sonuc}**`, COLORS.EMERALD)] });
  }

  if (komut === 'yazi-tura' || komut === 'yazı-tura') {
    const sonuc = Math.random() < 0.5 ? '🪙 Yazı' : '🪙 Tura';
    return message.reply({ embeds: [embed('Yazı mı Tura mı?', `**${sonuc}!**`, COLORS.GOLD)] });
  }

  if (komut === 'evcil') {
    const hayvanlar = ['🐶', '🐱', '🐸', '🐰', '🐼', '🦊', '🐺', '🦝'];
    const secilen   = hayvanlar[Math.floor(Math.random() * hayvanlar.length)];
    return message.reply({ embeds: [embed('Evcil Hayvanın', `${secilen} senin yeni evcil hayvanın!`, COLORS.EMERALD)] });
  }

  if (komut === '8top') {
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('Bir soru sor! `!8top <soru>`')] });
    const cevaplar = [
      'Kesinlikle evet! ✅', 'Evet! ✅', 'Bence evet! 🟢',
      'Şüpheli... 🟡', 'Belki! 🟡', 'Emin değilim 🟡',
      'Hayır! ❌', 'Kesinlikle hayır! ❌', 'İmkânsız! ❌',
    ];
    const cevap = cevaplar[Math.floor(Math.random() * cevaplar.length)];
    return message.reply({ embeds: [embed('🎱  Sihirli 8 Top', `**Soru:** ${soru}\n**Cevap:** ${cevap}`, COLORS.NETHERITE)] });
  }

  if (komut === 'saat') {
    return message.reply({ embeds: [embed('🕐  Şu An', `**Tarih/Saat:** \`${new Date().toLocaleString('tr-TR')}\``, COLORS.DIAMOND)] });
  }

  // ── YARDIM ────────────────────────────────────────────────────────────────

  if (komut === 'yardim' || komut === 'yardım' || komut === 'help') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⛏️  CastiVol Komut Listesi')
          .setColor(COLORS.DIAMOND)
          .addFields(
            { name: '🛡️ Moderasyon', value: '`!ban` `!kick` `!temizle` `!kilitle` `!ac` `!sustur` `!duyuru`' },
            { name: '✨ XP Sistemi',  value: '`!profil` `!siralama` `!xpver` `!xpcikar` `!xpsifirla`' },
            { name: '🏰 Klan',        value: '`!klan-kur` `!klan-sil` `!klan-bilgi` `!klan-aciklama` `!uye` `!uyeler` `!cikar`' },
            { name: '🎫 Ticket',      value: '`!ticket-kur` — Admin ile ticket açmak için butona tıkla' },
            { name: '🌍 Genel',       value: '`!ping` `!sunucu` `!avatar` `!kullanici` `!minecraft-ip`' },
            { name: '🎲 Eğlence',     value: '`!zar [yüz]` `!yazi-tura` `!evcil` `!8top <soru>` `!saat`' },
          )
          .setFooter({ text: 'CastiVol • Prefix: ! ' })
          .setTimestamp(),
      ],
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BUTON EVENT — Ticket
// ══════════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // ── Ticket Aç ─────────────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_ac') {
    await interaction.deferReply({ ephemeral: true });

    const mevcutKanal = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );
    if (mevcutKanal) {
      return interaction.editReply({
        content: `❌ Zaten açık bir ticketin var: ${mevcutKanal}`,
      });
    }

    // Admin rolünü bul (varsa)
    const adminRol = interaction.guild.roles.cache.find(
      r => r.permissions.has(PermissionFlagsBits.Administrator)
    );

    const overwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (adminRol) {
      overwrites.push({
        id: adminRol.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const kanal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      topic: `${interaction.user.tag} destek talebi`,
      permissionOverwrites: overwrites,
    });

    const kapatRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_kapat')
        .setLabel('🔒 Ticketi Kapat')
        .setStyle(ButtonStyle.Danger),
    );

    await kanal.send({
      content: `${interaction.user}${adminRol ? ` | ${adminRol}` : ''}`,
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫  Ticket Açıldı')
          .setDescription(
            `Merhaba ${interaction.user}! 👋\n\n` +
            'Sorununu veya talebini buraya yaz.\n' +
            'Ekibimiz en kısa sürede seninle ilgilenecek! 💙\n\n' +
            '> Ticketi kapatmak için aşağıdaki butonu kullan.'
          )
          .addFields(
            { name: '👤 Kullanıcı', value: `${interaction.user.tag}`, inline: true },
            { name: '🆔 ID',        value: interaction.user.id,        inline: true },
          )
          .setColor(0x00B5E2)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp(),
      ],
      components: [kapatRow],
    });

    return interaction.editReply({
      content: `✅ Ticketin açıldı: ${kanal}`,
    });
  }

  // ── Ticket Kapat ──────────────────────────────────────────────────────────
  if (interaction.customId === 'ticket_kapat') {
    // Sadece kanalın sahibi veya admin kapatabilir
    const kanalAd  = interaction.channel.name; // ticket-123456789
    const sahibiId = kanalAd.replace('ticket-', '');
    const isAdmin  = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    const isSahip  = interaction.user.id === sahibiId;

    if (!isAdmin && !isSahip) {
      return interaction.reply({
        content: '❌ Bu ticketi kapatma yetkin yok!',
        ephemeral: true,
      });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription('🔒 Ticket **5 saniye** içinde kapatılıyor...')
          .setColor(0xFF4136),
      ],
    });

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════════════════════
client.login(process.env.BOT_TOKEN);
