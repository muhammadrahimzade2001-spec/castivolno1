// ╔══════════════════════════════════════════════════╗
// ║         CastiVol Discord Bot — index.js          ║
// ║        ⛏️ Minecraft Klan Sunucusu Botu           ║
// ║              v2.1 • PVP Klan Savaşları           ║
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
    GatewayIntentBits.GuildModeration,
  ],
});

const PREFIX = '!';

// ─── YAPILANDIRMA ─────────────────────────────────────────────────────────────
const OWNER_ID        = '1241737610318860298'; // Senin Discord ID'n
const HOSGELDIN_KANAL = '1500414696170459297'; // Hoşgeldin kanalı

// ─── KÜFÜR FİLTRESİ ───────────────────────────────────────────────────────────
const KUFUR_LISTESI = [
  'orospu','oç','göt','sik','amk','bok','yarrak','piç','salak',
  'gerizekalı','aptal','mal','ibne','götlek','kahpe','şerefsiz',
];
function kufurVarMi(metin) {
  const lower = metin.toLowerCase().replace(/[^a-züöşğçı ]/g, '');
  return KUFUR_LISTESI.some(k => lower.includes(k));
}

// ─── ANTI-RAID ────────────────────────────────────────────────────────────────
const raidTakip = new Map();
const RAID_LIMIT = 3;
const RAID_WINDOW = 10000;

// ─── RENK PALETİ (Minecraft PVP Teması) ──────────────────────────────────────
const COLORS = {
  CREEPER:  0x5B8C3E,   // Ana renk - Creeper yeşili
  NETHERITE:0x1B1A1A,   // Netherite siyahı
  DIAMOND:  0x00B5E2,   // Elmas mavisi
  GOLD:     0xFFD700,   // Klan lideri altın
  EMERALD:  0x2ECC40,   // Başarı yeşili
  REDSTONE: 0xFF4136,   // Ban/kritik kırmızı
  OBSIDIAN: 0x2C2F33,   // Koyu arka plan
};

// ─── PVP KLan UNVANLARI ───────────────────────────────────────────────────────
const UNVANLAR = [
  { min: 1,  unvan: '🪵 Yeni Savaşçı',     emoji: '🪵' },
  { min: 5,  unvan: '🪨 Taş Savaşçısı',   emoji: '🪨' },
  { min: 15, unvan: '⚔️ Demir Gladyatör', emoji: '⚔️' },
  { min: 30, unvan: '🥇 Altın Şampiyon',   emoji: '🥇' },
  { min: 50, unvan: '💎 Elmas Katili',    emoji: '💎' },
  { min: 80, unvan: '🔥 Netherite Lord',  emoji: '🔥' },
  { min: 120,unvan: '🏰 Klan Generali',   emoji: '🏰' },
  { min: 200,unvan: '👑 Klan İmparatoru', emoji: '👑' },
];

function getUnvan(level) {
  return UNVANLAR.find(u => level >= u.min) || UNVANLAR[0];
}

// ─── XP SİSTEMİ ───────────────────────────────────────────────────────────────
const xpData = new Map();
const xpCooldown = new Map();

function getUser(id) {
  if (!xpData.has(id)) xpData.set(id, { xp: 0, level: 1, kill: 0, death: 0, kdr: 0 });
  return xpData.get(id);
}

function addXP(id, amount) {
  const u = getUser(id);
  u.xp += amount;
  const needed = u.level * 150;
  if (u.xp >= needed) {
    u.xp -= needed;
    u.level++;
    return true;
  }
  return false;
}

// ─── TICKET KATEGORİLERİ (PVP Klan Temalı) ────────────────────────────────────
const TICKET_KATEGORILER = {
  'killeader':     { label: '⚔️ Kill Leader Başvuru', renk: COLORS.GOLD },
  'klan_merge':    { label: '🏰 Klan Merge Talebi',   renk: COLORS.DIAMOND },
  'pvp_sikayet':   { label: '🔥 PVP Şikayet',         renk: COLORS.REDSTONE },
  'ekipman_talebi':{ label: '🛡️ Ekipman Talebi',     renk: COLORS.EMERALD },
  'yetkili':       { label: '👑 Yetkili Başvurusu',   renk: COLORS.GOLD },
  'bug':           { label: '🐛 Bug Raporu',          renk: COLORS.NETHERITE },
};

const TICKET_ACIKLAMALAR = {
  killeader: '⚔️ **Kill Leader Başvurusu**\n\nIGN, K/D, PVP videolarını paylaş!',
  klan_merge: '🏰 **Klan Merge**\n\nKlanın: Üye sayısı, lider IGN, başarılar?',
  pvp_sikayet: '🔥 **PVP Şikayet**\n\nRakip IGN, maç linki/video, detaylar?',
  ekipman_talebi: '🛡️ **Ekipman Talebi**\n\nSeviyen, mevcut ekipman, ihtiyacın?',
  yetkili: '👑 **Yetkili Başvurusu**\n\nYaş, aktiflik, PVP deneyimi?',
  bug: '🐛 **Bug Raporu**\n\nNerede oldu, nasıl tekrarlanır?',
};

// ─── EMBED YARDIMCILARI ───────────────────────────────────────────────────────
function embed(title, desc, color = COLORS.CREEPER) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setFooter({ text: '⛏️ CastiVol PVP Klan • !yardim' })
    .setTimestamp();
}

function hata(desc) {
  return embed('❌ Hata!', desc, COLORS.REDSTONE);
}

function basari(desc) {
  return embed('✅ Başarılı!', desc, COLORS.EMERALD);
}

// ══════════════════════════════════════════════════════════════════════════════
// READY
client.once('ready', () => {
  console.log(`\n🟢 CastiVol PVP Bot Aktif!\n👤 ${client.user.tag}`);
  client.user.setActivity('PVP Klan Savaşları | !yardim', { type: 0 });
});

// ══════════════════════════════════════════════════════════════════════════════
// MESAJ OLAYLARI
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  // KÜFÜR FİLTRESİ
  if (!msg.content.startsWith(PREFIX) && kufurVarMi(msg.content)) {
    msg.delete().catch(() => {});
    msg.channel.send({ 
      embeds: [embed('⚠️ Küfür Tespit!', `${msg.author} küfür kullandın!`, COLORS.REDSTONE)] 
    }).then(m => setTimeout(() => m.delete().catch(() => {}), 5e3));
    return;
  }

  // PASİF XP (15s cooldown)
  if (!msg.content.startsWith(PREFIX)) {
    const now = Date.now();
    if (xpCooldown.get(msg.author.id) > now - 15000) return;
    xpCooldown.set(msg.author.id, now);
    
    const xp = Math.floor(Math.random() * 5) + 2;
    const levelUp = addXP(msg.author.id, xp);
    
    if (levelUp) {
      const u = getUser(msg.author.id);
      const unvan = getUnvan(u.level);
      msg.channel.send({ 
        embeds: [embed(
          `${unvan.emoji} LEVEL UP!`,
          `**${msg.author}** → **Seviye ${u.level}** ${unvan.unvan}\n**+${xp} XP** 💎`,
          COLORS.GOLD
        )] 
      });
    }
    return;
  }

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PİNG
  if (cmd === 'ping') {
    const start = Date.now();
    const m = await msg.reply({ embeds: [embed('🏓 Ping ölçülüyor...', '...')] });
    m.edit({ embeds: [embed('🏓 Pong!', `Bot: **${Date.now()-start}ms** | API: **${client.ws.ping}ms**`, COLORS.DIAMOND)] });
  }

  // SUNUCU BİLGİSİ
  if (cmd === 'sunucu') {
    const g = msg.guild;
    msg.reply({ embeds: [embed(
      `🏰 ${g.name}`,
      `**Üye:** ${g.memberCount} | **Kanal:** ${g.channels.cache.size}\n**Kuruluş:** <t:${Math.floor(g.createdTimestamp/1e3)}:D>`,
      COLORS.CREEPER
    )] });
  }

  // PROFİL
  if (cmd === 'profil') {
    const target = msg.mentions.users.first() || msg.author;
    const u = getUser(target.id);
    const unvan = getUnvan(u.level);
    const progress = Math.floor((u.xp / (u.level * 150)) * 10);
    const bar = '█'.repeat(progress) + '░'.repeat(10-progress);
    
    msg.reply({ embeds: [embed(
      `${unvan.emoji} ${target.username}`,
      `**Seviye:** ${u.level} ${unvan.unvan}\n**XP:** ${u.xp}/${u.level*150} \`${bar}\`\n**K/D:** ${u.kill}/${u.death}`,
      COLORS.DIAMOND
    )] });
  }

  // LİDER TABLOSU
  if (cmd === 'siralama') {
    const top = [...xpData.entries()]
      .sort(([,a], [,b]) => b.level*1000 + b.xp - (a.level*1000 + a.xp))
      .slice(0, 10);
    
    const list = top.map(([id, u], i) => 
      `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} <@${id}> **Lv${u.level}**`
    ).join('\n');
    
    msg.reply({ embeds: [embed('🏆 PVP Lider Tablosu', list, COLORS.GOLD)] });
  }

  // PVP KOMUTLARI
  if (cmd === 'pvp-ip') {
    msg.reply({ embeds: [embed(
      '🌍 CastiVol PVP Sunucusu',
      '`play.castivol.net` **• Port: 25565** • **1.20+**',
      COLORS.DIAMOND
    )] });
  }

  if (cmd === 'kill') {
    const target = msg.mentions.members.first();
    if (!target) return msg.reply(hata('`!kill @kullanici`'));
    const u = getUser(msg.author.id);
    u.kill++;
    u.kdr = u.kill / Math.max(1, u.death);
    msg.reply({ embeds: [embed(
      '💀 KILL!',
      `**${msg.author}** → **${target.user}**\n**K/D:** ${u.kdr.toFixed(2)}`,
      COLORS.GOLD
    )] });
  }

  if (cmd === 'death') {
    const u = getUser(msg.author.id);
    u.death++;
    u.kdr = u.kill / Math.max(1, u.death);
    msg.reply({ embeds: [embed(
      '☠️ DEATH!',
      `**${msg.author}** öldü!\n**Yeni K/D:** ${u.kdr.toFixed(2)}`,
      COLORS.REDSTONE
    )] });
  }

  // MODERASYON
  if (cmd === 'ban' && msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    const target = msg.mentions.members.first();
    if (!target) return msg.reply(hata('`!ban @kullanici [sebep]`'));
    await target.ban({ reason: args.slice(1).join(' ') || 'Sebep yok' });
    msg.reply({ embeds: [basari(`**${target.user.tag}** PVP arenasından atıldı! 🔨`)] });
  }

  if (cmd === 'temizle' && msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    const amount = parseInt(args[0]);
    if (!amount || amount > 100) return msg.reply(hata('1-100 arası sayı!'));
    await msg.channel.bulkDelete(amount, true);
    msg.channel.send(basari(`${amount} mesaj temizlendi! 🧹`)).then(m => setTimeout(() => m.delete(), 3e3));
  }

  // TICKET KURULUMU
  if (cmd === 'ticket-kur' && msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_menu')
      .setPlaceholder('⚔️ PVP Ticket Seç...')
      .addOptions(Object.entries(TICKET_KATEGORILER).map(([k, v]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(v.label).setValue(k).setEmoji(v.label.includes('Kill') ? '⚔️' : '🏰')
      ));

    msg.channel.send({
      embeds: [embed('⚔️ CastiVol PVP Destek', 'Ticket kategorini seç! 👑')],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
    msg.delete();
  }

  // YARDIM
  if (['yardim', 'help'].includes(cmd)) {
    msg.reply({ embeds: [embed(
      '⚔️ CastiVol PVP Bot Komutları',
      '`!profil` • `!siralama` • `!pvp-ip`\n' +
      '`!kill @hedef` • `!death` • `!ping`\n' +
      '`!ban` • `!temizle` • `!ticket-kur` (admin)\n\n' +
      '**⛏️ Prefix: ! • PVP Klan Savaşları**',
      COLORS.CREEPER
    )] });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TICKET & BUTTONS
client.on('interactionCreate', async i => {
  if (i.isStringSelectMenu() && i.customId === 'ticket_menu') {
    const kategori = TICKET_KATEGORILER[i.values[0]];
    const kanal = await i.guild.channels.create({
      name: `pvp-${i.values[0]}-${i.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    kanal.send(embed(
      `${kategori.label} Ticket`,
      TICKET_ACIKLAMALAR[i.values[0]],
      kategori.renk
    ));
    
    i.reply({ content: `✅ Ticket açıldı: ${kanal}`, ephemeral: true });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// HOŞGELDİN
client.on('guildMemberAdd', member => {
  const kanal = member.guild.channels.cache.get(HOSGELDIN_KANAL);
  if (!kanal) return;
  
  kanal.send(embed(
    '⚔️ Yeni PVP Savaşçısı!',
    `**${member}** arenaya katıldı!\n**!pvp-ip** ile sunucuya bağlan!\n**!profil** seviye öğren!`,
    COLORS.GOLD
  ));
});

// LOGIN
client.login(process.env.TOKEN);
