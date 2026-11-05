const API = 'https://api.hth.sh';
const rendered = new WeakMap();
const labels = { online: 'online', idle: 'idle', dnd: 'do not disturb', offline: 'offline' };
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
function safeImage(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, API);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}
function image(src, className, alt = '') {
  const url = safeImage(src);
  if (!url) return null;
  const img = node('img', className);
  img.alt = alt; img.src = url; img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}
export function renderPresence(root, profile, data, message = 'status unavailable') {
  const signature = JSON.stringify([profile?.discord_user, profile?.discord_status, profile?.activities, profile?.spotify, profile?.hth?.badges, profile?.hth?.profile_background, profile?.hth?.nameplate_image_url, profile?.active_on_discord_desktop, profile?.active_on_discord_mobile, profile?.active_on_discord_web, profile ? null : message]);
  if (rendered.get(root) === signature) return;
  rendered.set(root, signature);
  root.replaceChildren();
  root.dataset.status = profile ? profile.discord_status : 'unavailable';
  const user = profile?.discord_user;
  const portrait = node('div', 'presence-portrait');
  portrait.append(node('span', 'presence-initial', 'L'));
  if (user?.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    const avatar = image(`https://cdn.discordapp.com/avatars/${data.discordUserId}/${user.avatar}.${ext}?size=128`, 'presence-avatar');
    if (avatar) portrait.append(avatar);
  }
  if (user?.avatar_decoration_data?.asset) {
    const decoration = image(`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=160&passthrough=true`, 'presence-decoration');
    if (decoration) portrait.append(decoration);
  }
  portrait.append(node('span', 'presence-dot'));
  const content = node('div', 'presence-content');
  const title = node('div', 'presence-title');
  title.append(node('span', 'presence-name', user?.display_name || user?.global_name || data.name));
  const guild = user?.primary_guild;
  if (guild?.tag && guild.identity_enabled !== false) {
    const tag = node('span', 'presence-guild');
    if (guild.identity_guild_id && guild.badge) {
      const badge = image(`https://cdn.discordapp.com/guild-tag-badges/${guild.identity_guild_id}/${guild.badge}.png?size=32`, 'presence-guild-icon');
      if (badge) tag.append(badge);
    }
    tag.append(document.createTextNode(guild.tag)); title.append(tag);
  }
  if (profile && profile.discord_status !== 'offline') {
    for (const platform of ['desktop', 'mobile', 'web']) {
      if (!profile[`active_on_discord_${platform}`]) continue;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('class', 'presence-platform');
      icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', `${platform}: ${labels[profile.discord_status]}`);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', platform === 'desktop' ? 'M3 3h18v13H3z M12 16v5 M7 21h10' : platform === 'mobile' ? 'M7 2h10v20H7z M10 18h4' : 'M3 4h18v16H3z M3 9h18 M6 6.5h.1 M9 6.5h.1');
      icon.append(path); title.append(icon);
    }
  }
  for (const badge of profile?.hth?.badges || []) {
    const icon = badge.id === 'hype_squad_bravery' ? node('img', 'presence-badge') : image(badge.icon_url, 'presence-badge', badge.label);
    if (icon && badge.id === 'hype_squad_bravery') { icon.src = 'assets/discord/hype-squad-bravery.svg'; icon.alt = badge.label; }
    if (icon) { icon.title = badge.label; title.append(icon); }
  }
  content.append(title, node('p', 'presence-handle', '@' + (user?.username || data.discord)));
  const status = node('p', 'presence-status', profile ? labels[profile.discord_status] || message : message);
  status.setAttribute('role', 'status');
  if (profile) status.classList.add('sr-only');
  content.append(status);
  if (profile && profile.discord_status !== 'offline') {
    const platforms = ['desktop', 'mobile', 'web'].filter(platform => profile[`active_on_discord_${platform}`]);
    if (platforms.length) status.append(document.createTextNode(' · ' + platforms.join(', ')));
    const activities = profile.activities || [];
    const custom = activities.find(activity => activity.type === 4);
    if (custom?.state) content.append(node('p', 'presence-custom', custom.state));
    const activity = activities.find(activity => activity.type !== 4 && activity.name !== 'Spotify');
    if (profile.listening_to_spotify && profile.spotify) {
      content.append(node('p', 'presence-activity', `listening to ${profile.spotify.song || 'Spotify'}${profile.spotify.artist ? ' — ' + profile.spotify.artist : ''}`));
    } else if (activity?.name) {
      content.append(node('p', 'presence-activity', `${activity.type === 1 ? 'streaming' : activity.type === 3 ? 'watching' : 'playing'} ${activity.name}`));
    }
  }
  root.append(portrait, content);
  if (profile?.hth?.profile_background === 'nameplate' && profile.hth.nameplate_image_url) {
    const artwork = image(profile.hth.nameplate_image_url, 'presence-background');
    if (artwork) content.prepend(artwork);
    const asset = user?.collectibles?.nameplate?.asset;
    if (typeof asset === 'string' && /^nameplates\/[a-zA-Z0-9_/-]+\/$/.test(asset) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const video = node('video', 'presence-background presence-video');
      video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
      video.setAttribute('aria-hidden', 'true'); video.disablePictureInPicture = true;
      video.src = `https://cdn.discordapp.com/assets/collectibles/${asset}asset.webm`;
      video.addEventListener('error', () => video.remove(), { once: true });
      content.prepend(video);
      video.play().catch(() => video.remove());
    }
  } else if (profile?.hth?.profile_background === 'banner' && user?.banner) {
    const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
    const banner = image(`https://cdn.discordapp.com/banners/${data.discordUserId}/${user.banner}.${ext}?size=600`, 'presence-background');
    if (banner) content.prepend(banner);
  }
}
export function mountPresence(root, data) {
  if (!root || !/^\d{17,20}$/.test(data.discordUserId)) return;
  let timer, controller, failures = 0, stopped = false;
  renderPresence(root, null, data, 'checking status…');
  async function update() {
    clearTimeout(timer);
    if (stopped || document.hidden) return;
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let delay = 30000;
    try {
      const response = await fetch(`${API}/v1/users/${data.discordUserId}`, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
      const result = await response.json();
      if (!response.ok || !result.success || !labels[result.data?.discord_status]) {
        renderPresence(root, null, data);
        failures++;
        const retry = Number(response.headers.get('Retry-After'));
        delay = Math.max(Math.min(30000 * 2 ** Math.min(failures, 3), 240000), Number.isFinite(retry) ? retry * 1000 : 0);
      } else {
        failures = 0;
        renderPresence(root, result.data, data);
      }
    } catch {
      renderPresence(root, null, data);
      failures++;
      delay = Math.min(30000 * 2 ** Math.min(failures, 3), 240000);
    } finally {
      clearTimeout(timeout);
      if (!stopped && !document.hidden) timer = setTimeout(update, delay);
    }
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (document.hidden) { controller?.abort(); renderPresence(root, null, data); }
    else update();
  });
  window.addEventListener('pagehide', () => { stopped = true; clearTimeout(timer); controller?.abort(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { stopped = false; update(); } });
  update();
}
