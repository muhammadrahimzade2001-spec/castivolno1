// ╔══════════════════════════════════════════════════╗
// ║          CastiVol Discord Bot - index.js         ║
// ║         Minecraft Klan Botu | by Claude          ║
// ╚══════════════════════════════════════════════════╝

const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

const PREFIX = '!';
const BOT_TOKEN = 'BURAYA_BOT_TOKENINI_YAZ';

// ─── Renk Paleti (Minecraft Temalı) ───────────────────────────────────────────
const COLORS = {
  GREEN:    0x2ECC40,   // Creeper yeşili
  RED:      0xFF4136,   // Redstone kırmızısı
  GOLD:     0xFFD700,   // Altın
  DIAMOND:  0x00B5E2,   // Elmas mavisi
  DARK:     0x2C2F33,   // Koyu arka plan
  EMERALD:  0x00FF7F,   // Zümrüt
  NETHERITE:0x4A4A4A,   // Netherite gri
};

// ─── XP Sistemi (Bellekte tutar — kalıcı için DB ekle) ────────────────────────
const xpData = new Map();   // userId → { xp, level }

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

function levelFromXP(u) { return u.level; }

// ─── Klan Sistemi ─────────────────────────────────────────────────────────────
const klanlar = new Map();   // klanAdı → { sahip, üyeler[], açıklama }
const userKlan = new Map();  // userId → klanAdı

// ─── Yardımcı: Güzel Embed ────────────────────────────────────────────────────
function embed(baslik, aciklama, renk = COLORS.DIAMOND, footer = 'CastiVol • Minecraft Klan Botu') {
  return new EmbedBuilder()
    .setTitle(`⛏️  ${baslik}`)
    .setDescription(aciklama)
    .setColor(renk)
    .setFooter({ text: footer })
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
  console.log(`
╔══════════════════════════════════╗
║  CastiVol Bot Aktif!             ║
║  Kullanıcı: ${client.user.tag.padEnd(20)}║
╚══════════════════════════════════╝`);

  client.user.setActivity('⛏️ Minecraft Klan | !yardım', { type: 0 });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MESAJ EVENT — Komutlar
// ══════════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) {

    // Pasif XP — her mesajda küçük xp ver
    const leveled = addXP(message.author.id, Math.floor(Math.random() * 5) + 1);
    if (leveled) {
      const u = getUser(message.author.id);
      message.channel.send({
        embeds: [embed('Seviye Atladın! 🎉',
          `Tebrikler ${message.author}! Artık **Seviye ${u.level}** oldun! 🏆`,
          COLORS.GOLD)]
      });
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const komut = args.shift().toLowerCase();

  // ──────────────────────────────────────────────────────────────────────────
  //  GENEL KOMUTLAR
  // ──────────────────────────────────────────────────────────────────────────

  // !ping
  if (komut === 'ping') {
    const ms = Date.now();
    const msg = await message.reply({ embeds: [embed('Pong! 🏓', 'Ölçülüyor...', COLORS.EMERALD)] });
    msg.edit({ embeds: [embed('Pong! 🏓', `🏓 **Bot Gecikmesi:** \`${Date.now() - ms}ms\`\n📡 **API Gecikmesi:** \`${client.ws.ping}ms\``, COLORS.EMERALD)] });
  }

  // !sunucu
  else if (komut === 'sunucu') {
    const g = message.guild;
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏰  ${g.name}`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: '👥 Üye Sayısı', value: `${g.memberCount}`, inline: true },
            { name: '📅 Kuruluş', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '👑 Sahip', value: `<@${g.ownerId}>`, inline: true },
            { name: '📢 Kanal Sayısı', value: `${g.channels.cache.size}`, inline: true },
            { name: '🎭 Rol Sayısı', value: `${g.roles.cache.size}`, inline: true },
            { name: '😀 Emoji Sayısı', value: `${g.emojis.cache.size}`, inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp()
      ]
    });
  }

  // !avatar
  else if (komut === 'avatar') {
    const hedef = message.mentions.users.first() || message.author;
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️  ${hedef.username} — Avatar`)
          .setImage(hedef.displayAvatarURL({ dynamic: true, size: 512 }))
          .setColor(COLORS.DIAMOND)
          .setTimestamp()
      ]
    });
  }

  // !kullanici
  else if (komut === 'kullanici') {
    const hedef = message.mentions.members.first() || message.member;
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`👤  ${hedef.user.username}`)
          .setThumbnail(hedef.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏷️ Kullanıcı Adı', value: hedef.user.tag, inline: true },
            { name: '🆔 ID', value: hedef.id, inline: true },
            { name: '📅 Katılma', value: `<t:${Math.floor(hedef.joinedTimestamp / 1000)}:D>`, inline: true },
            { name: '🎂 Hesap Tarihi', value: `<t:${Math.floor(hedef.user.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '🎭 En Yüksek Rol', value: `${hedef.roles.highest}`, inline: true },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp()
      ]
    });
  }

  // !duyuru
  else if (komut === 'duyuru') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Mesajları Yönet** yetkisine ihtiyacın var!')] });
    }
    const metin = args.join(' ');
    if (!metin) return message.reply({ embeds: [hata('Duyuru metni yazmalısın! `!duyuru <metin>`')] });
    message.delete().catch(() => {});
    message.channel.send({
      content: '@everyone',
      embeds: [
        new EmbedBuilder()
          .setTitle('📣  Duyuru')
          .setDescription(metin)
          .setColor(COLORS.GOLD)
          .setFooter({ text: `Duyuran: ${message.author.tag}` })
          .setTimestamp()
      ]
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  MODERASYON KOMUTLARI
  // ──────────────────────────────────────────────────────────────────────────

  // !ban
  else if (komut === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Üye Yasakla** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('Bir kullanıcı etiketle! `!ban @kullanıcı [sebep]`')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.ban({ reason: sebep }).catch(() => {});
    message.reply({ embeds: [embed('Kullanıcı Yasaklandı 🔨', `**${hedef.user.tag}** sunucudan yasaklandı.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  // !kick
  else if (komut === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Üye At** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('Bir kullanıcı etiketle! `!kick @kullanıcı [sebep]`')] });
    const sebep = args.slice(1).join(' ') || 'Sebep belirtilmedi';
    await hedef.kick(sebep).catch(() => {});
    message.reply({ embeds: [embed('Kullanıcı Atıldı 👢', `**${hedef.user.tag}** sunucudan atıldı.\n**Sebep:** ${sebep}`, COLORS.RED)] });
  }

  // !temizle
  else if (komut === 'temizle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Mesajları Yönet** yetkisine ihtiyacın var!')] });
    const miktar = parseInt(args[0]);
    if (isNaN(miktar) || miktar < 1 || miktar > 100)
      return message.reply({ embeds: [hata('1–100 arası bir sayı yaz! `!temizle <sayı>`')] });
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    const bilgi = await message.channel.send({ embeds: [basari(`**${miktar}** mesaj silindi! 🧹`)] });
    setTimeout(() => bilgi.delete().catch(() => {}), 3000);
  }

  // !kilitle
  else if (komut === 'kilitle') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    message.reply({ embeds: [embed('Kanal Kilitlendi 🔒', `${message.channel} kanalı kilitlendi.`, COLORS.RED)] });
  }

  // !aç
  else if (komut === 'aç') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Kanalları Yönet** yetkisine ihtiyacın var!')] });
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
    message.reply({ embeds: [embed('Kanal Açıldı 🔓', `${message.channel} kanalı açıldı.`, COLORS.GREEN)] });
  }

  // !sustur
  else if (komut === 'sustur') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [hata('Bu komutu kullanmak için **Üyeleri Sustur** yetkisine ihtiyacın var!')] });
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('Bir kullanıcı etiketle! `!sustur @kullanıcı <dakika>`')] });
    const dakika = parseInt(args[1]) || 10;
    await hedef.timeout(dakika * 60 * 1000, 'Susturuldu').catch(() => {});
    message.reply({ embeds: [embed('Kullanıcı Susturuldu 🔇', `**${hedef.user.tag}** **${dakika} dakika** susturuldu.`, COLORS.RED)] });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  XP SİSTEMİ KOMUTLARI
  // ──────────────────────────────────────────────────────────────────────────

  // !profil
  else if (komut === 'profil') {
    const hedef = message.mentions.users.first() || message.author;
    const u = getUser(hedef.id);
    const needed = u.level * 100;
    const bar = '█'.repeat(Math.floor((u.xp / needed) * 10)) + '░'.repeat(10 - Math.floor((u.xp / needed) * 10));
    const klan = userKlan.get(hedef.id) || 'Klansız';
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚔️  ${hedef.username} — Profil`)
          .setThumbnail(hedef.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏅 Seviye', value: `${u.level}`, inline: true },
            { name: '✨ XP', value: `${u.xp} / ${needed}`, inline: true },
            { name: '🏰 Klan', value: klan, inline: true },
            { name: '📊 XP Barı', value: `\`[${bar}]\``, inline: false },
          )
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp()
      ]
    });
  }

  // !sıralama
  else if (komut === 'sıralama' || komut === 'siralama') {
    const sorted = [...xpData.entries()]
      .sort((a, b) => (b[1].level * 1000 + b[1].xp) - (a[1].level * 1000 + a[1].xp))
      .slice(0, 10);

    if (sorted.length === 0) return message.reply({ embeds: [hata('Henüz XP kazanmış kimse yok!')] });

    const medals = ['🥇', '🥈', '🥉'];
    const desc = sorted.map(([id, u], i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${id}> — Seviye **${u.level}** (\`${u.xp} XP\`)`;
    }).join('\n');

    message.reply({ embeds: [embed('🏆  XP Sıralaması', desc, COLORS.GOLD)] });
  }

  // !xpver (Admin)
  else if (komut === 'xpver') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpver @kullanıcı <miktar>`')] });
    addXP(hedef.id, miktar);
    message.reply({ embeds: [basari(`**${hedef.username}**'e **${miktar} XP** verildi!`)] });
  }

  // !xpçıkar (Admin)
  else if (komut === 'xpçıkar' || komut === 'xpcikar') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    const miktar = parseInt(args[1]);
    if (!hedef || isNaN(miktar)) return message.reply({ embeds: [hata('`!xpçıkar @kullanıcı <miktar>`')] });
    const u = getUser(hedef.id);
    u.xp = Math.max(0, u.xp - miktar);
    message.reply({ embeds: [basari(`**${hedef.username}**'den **${miktar} XP** çıkarıldı!`)] });
  }

  // !xpsıfırla (Admin)
  else if (komut === 'xpsıfırla' || komut === 'xpsifirla') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply({ embeds: [hata('`!xpsıfırla @kullanıcı`')] });
    xpData.set(hedef.id, { xp: 0, level: 1 });
    message.reply({ embeds: [basari(`**${hedef.username}**'in XP'si sıfırlandı!`)] });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  KLAN SİSTEMİ KOMUTLARI
  // ──────────────────────────────────────────────────────────────────────────

  // !klan-kur
  else if (komut === 'klan-kur') {
    const ad = args[0];
    if (!ad) return message.reply({ embeds: [hata('`!klan-kur <klan adı>`')] });
    if (userKlan.has(message.author.id)) return message.reply({ embeds: [hata('Zaten bir klana üyesin!')] });
    if (klanlar.has(ad)) return message.reply({ embeds: [hata('Bu isimde klan zaten var!')] });
    klanlar.set(ad, { sahip: message.author.id, üyeler: [message.author.id], açıklama: '—' });
    userKlan.set(message.author.id, ad);
    message.reply({ embeds: [embed('Klan Kuruldu! 🏰', `**${ad}** klanu başarıyla kuruldu!\nSahip: ${message.author}`, COLORS.GOLD)] });
  }

  // !üye
  else if (komut === 'üye' || komut === 'uye') {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply({ embeds: [hata('`!üye @kullanıcı`')] });
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana sahip değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id) return message.reply({ embeds: [hata('Sadece klan sahibi üye ekleyebilir!')] });
    if (userKlan.has(hedef.id)) return message.reply({ embeds: [hata('Bu kişi zaten bir klana üye!')] });
    klan.üyeler.push(hedef.id);
    userKlan.set(hedef.id, ad);
    message.reply({ embeds: [basari(`${hedef} **${ad}** klanına eklendi! ⚔️`)] });
  }

  // !üyeler
  else if (komut === 'üyeler' || komut === 'uyeler') {
    const ad = args[0] || userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Klan adı belirt veya bir klana gir!')] });
    const klan = klanlar.get(ad);
    if (!klan) return message.reply({ embeds: [hata('Böyle bir klan yok!')] });
    const liste = klan.üyeler.map((id, i) => `${i + 1}. <@${id}>${id === klan.sahip ? ' 👑' : ''}`).join('\n');
    message.reply({ embeds: [embed(`🏰  ${ad} — Üyeler`, liste || 'Hiç üye yok.', COLORS.DIAMOND)] });
  }

  // !çıkar (klandan)
  else if (komut === 'çıkar' || komut === 'cikar') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana üye değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip === message.author.id) return message.reply({ embeds: [hata('Klan sahibi çıkamaz! Önce klanı sil: `!klan-sil`')] });
    klan.üyeler = klan.üyeler.filter(id => id !== message.author.id);
    userKlan.delete(message.author.id);
    message.reply({ embeds: [basari(`**${ad}** klanından çıktın!`)] });
  }

  // !klan-sil
  else if (komut === 'klan-sil') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klan sahibi değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id) return message.reply({ embeds: [hata('Sadece klan sahibi silebilir!')] });
    klan.üyeler.forEach(id => userKlan.delete(id));
    klanlar.delete(ad);
    message.reply({ embeds: [embed('Klan Silindi 💔', `**${ad}** klanu silindi.`, COLORS.RED)] });
  }

  // !klan-bilgi
  else if (komut === 'klan-bilgi') {
    const ad = args[0] || userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('`!klan-bilgi <klan adı>`')] });
    const klan = klanlar.get(ad);
    if (!klan) return message.reply({ embeds: [hata('Böyle bir klan yok!')] });
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏰  ${ad}`)
          .addFields(
            { name: '👑 Sahip', value: `<@${klan.sahip}>`, inline: true },
            { name: '👥 Üye Sayısı', value: `${klan.üyeler.length}`, inline: true },
            { name: '📝 Açıklama', value: klan.açıklama, inline: false },
          )
          .setColor(COLORS.GOLD)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp()
      ]
    });
  }

  // !klan-açıklama
  else if (komut === 'klan-açıklama' || komut === 'klan-aciklama') {
    const ad = userKlan.get(message.author.id);
    if (!ad) return message.reply({ embeds: [hata('Bir klana üye değilsin!')] });
    const klan = klanlar.get(ad);
    if (klan.sahip !== message.author.id) return message.reply({ embeds: [hata('Sadece klan sahibi açıklama değiştirebilir!')] });
    const aciklama = args.join(' ');
    if (!aciklama) return message.reply({ embeds: [hata('`!klan-açıklama <metin>`')] });
    klan.açıklama = aciklama;
    message.reply({ embeds: [basari('Klan açıklaması güncellendi!')] });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  TICKET SİSTEMİ
  // ──────────────────────────────────────────────────────────────────────────

  // !ticket-kur  → kurulum mesajı gönderir
  else if (komut === 'ticket-kur') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply({ embeds: [hata('Bu komutu sadece adminler kullanabilir!')] });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_aç')
        .setLabel('🎫 Ticket Aç')
        .setStyle(ButtonStyle.Primary),
    );

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫  Destek Ticket Sistemi')
          .setDescription('Yardım almak için aşağıdaki butona tıkla.\nEkibimiz en kısa sürede sana yardımcı olacak!')
          .setColor(COLORS.DIAMOND)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
      ],
      components: [row],
    });
    message.reply({ embeds: [basari('Ticket sistemi kuruldu!')] });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  EĞLENCELİ KOMUTLAR
  // ──────────────────────────────────────────────────────────────────────────

  // !zar
  else if (komut === 'zar') {
    const yüz = parseInt(args[0]) || 6;
    const sonuç = Math.floor(Math.random() * yüz) + 1;
    message.reply({ embeds: [embed(`🎲  Zar (1–${yüz})`, `**${message.author.username}** zar attı: **${sonuç}**`, COLORS.EMERALD)] });
  }

  // !yazı-tura
  else if (komut === 'yazı-tura' || komut === 'yazi-tura') {
    const sonuç = Math.random() < 0.5 ? '🪙 Yazı' : '🪙 Tura';
    message.reply({ embeds: [embed('Yazı mı Tura mı?', `**${sonuç}!**`, COLORS.GOLD)] });
  }

  // !evcil  (rastgele hayvan)
  else if (komut === 'evcil') {
    const hayvanlar = ['🐶', '🐱', '🐸', '🐰', '🐼', '🦊', '🐺', '🦝'];
    const seçilen = hayvanlar[Math.floor(Math.random() * hayvanlar.length)];
    message.reply({ embeds: [embed('Evcil Hayvanın', `${seçilen} senin yeni evcil hayvanın!`, COLORS.EMERALD)] });
  }

  // !minecraft-ip
  else if (komut === 'minecraft-ip') {
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🌍  CastiVol Minecraft Sunucusu')
          .setDescription('> Sunucuya katılmak için aşağıdaki IP\'yi kullan!')
          .addFields(
            { name: '🖥️ IP Adresi', value: '`mc.castivol.net`', inline: true },
            { name: '🔌 Port', value: '`25565`', inline: true },
            { name: '🎮 Versiyon', value: '`1.21.x`', inline: true },
          )
          .setColor(COLORS.EMERALD)
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu' })
          .setTimestamp()
      ]
    });
  }

  // !8top  (sihirli 8 top)
  else if (komut === '8top') {
    const soru = args.join(' ');
    if (!soru) return message.reply({ embeds: [hata('Bir soru sor! `!8top <soru>`')] });
    const cevaplar = [
      'Kesinlikle evet! ✅', 'Evet! ✅', 'Bence evet! 🟢',
      'Şüpheli... 🟡', 'Belki! 🟡', 'Emin değilim 🟡',
      'Hayır! ❌', 'Kesinlikle hayır! ❌', 'İmkânsız! ❌',
    ];
    const cevap = cevaplar[Math.floor(Math.random() * cevaplar.length)];
    message.reply({ embeds: [embed('🎱  Sihirli 8 Top', `**Soru:** ${soru}\n**Cevap:** ${cevap}`, COLORS.NETHERITE)] });
  }

  // !saat
  else if (komut === 'saat') {
    const şimdi = new Date();
    message.reply({ embeds: [embed('🕐  Şu An', `**Tarih/Saat:** \`${şimdi.toLocaleString('tr-TR')}\``, COLORS.DIAMOND)] });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  YARDIM KOMUTU
  // ──────────────────────────────────────────────────────────────────────────

  else if (komut === 'yardım' || komut === 'yardim' || komut === 'help') {
    message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⛏️  CastiVol Komut Listesi')
          .setColor(COLORS.DIAMOND)
          .addFields(
            {
              name: '🛡️ Moderasyon',
              value: '`!ban` `!kick` `!temizle` `!kilitle` `!aç` `!sustur` `!duyuru`',
            },
            {
              name: '✨ XP Sistemi',
              value: '`!profil` `!sıralama` `!xpver` `!xpçıkar` `!xpsıfırla`',
            },
            {
              name: '🏰 Klan Sistemi',
              value: '`!klan-kur` `!klan-sil` `!klan-bilgi` `!klan-açıklama` `!üye` `!üyeler` `!çıkar`',
            },
            {
              name: '🎫 Ticket',
              value: '`!ticket-kur`',
            },
            {
              name: '🌍 Genel',
              value: '`!ping` `!sunucu` `!avatar` `!kullanici` `!minecraft-ip`',
            },
            {
              name: '🎲 Eğlence',
              value: '`!zar` `!yazı-tura` `!evcil` `!8top` `!saat`',
            },
          )
          .setFooter({ text: 'CastiVol • Minecraft Klan Botu | Prefix: !' })
          .setTimestamp()
      ]
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BUTON EVENT — Ticket
// ══════════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'ticket_aç') {
    const mevcut = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );
    if (mevcut) return interaction.reply({ content: `Zaten açık bir ticketin var: ${mevcut}`, ephemeral: true });

    const kanal = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const kapat = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_kapat')
        .setLabel('🔒 Ticketi Kapat')
        .setStyle(ButtonStyle.Danger),
    );

    kanal.send({
      content: `${interaction.user}`,
      embeds: [embed('Ticket Açıldı 🎫', 'Ekibimiz en kısa sürede seninle ilgilenecek!\nSorununu açıkla, yardım edelim! 💙', COLORS.DIAMOND)],
      components: [kapat],
    });

    interaction.reply({ content: `Ticketin açıldı: ${kanal}`, ephemeral: true });
  }

  if (interaction.customId === 'ticket_kapat') {
    await interaction.reply({ content: '🔒 Kanal 5 saniye sonra silinecek...', ephemeral: false });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════════════════════
client.login(BOT_TOKEN);
