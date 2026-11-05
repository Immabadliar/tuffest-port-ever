const API = 'https://api.hth.sh';
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
    const decoration = image(`https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=160`, 'presence-decoration');
    if (decoration) portrait.append(decoration);
  }
  portrait.append(node('span', 'presence-dot'));
  const content = node('div', 'presence-content');
  const title = node('div', 'presence-title');
  title.append(node('span', 'presence-name', user?.display_name || user?.global_name || data.name));
  const guild = user?.primary_guild;
  if (guild?.tag && guild.identity_enabled !== false) title.append(node('span', 'presence-guild', guild.tag));
  for (const badge of profile?.hth?.badges || []) {
    const icon = image(badge.icon_url, 'presence-badge', badge.label);
    if (icon) { icon.title = badge.label; title.append(icon); }
  }
  content.append(title, node('p', 'presence-handle', '@' + (user?.username || data.discord)));
  const status = node('p', 'presence-status', profile ? labels[profile.discord_status] || message : message);
  status.setAttribute('role', 'status'); content.append(status);
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
    if (artwork) root.prepend(artwork);
  } else if (profile?.hth?.profile_background === 'banner' && user?.banner) {
    const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
    const banner = image(`https://cdn.discordapp.com/banners/${data.discordUserId}/${user.banner}.${ext}?size=600`, 'presence-background');
    if (banner) root.prepend(banner);
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
