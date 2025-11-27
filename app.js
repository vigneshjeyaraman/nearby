/* ============================================================
   Proximity — client app
   Single class, no bundler. Plain ES2020.
   ============================================================ */

const PALETTE = ['#22E1FF', '#34F5C5', '#B8FF3B', '#FFB020', '#A86CFF', '#FF7AD9'];

const CALLSIGN_LEFT  = ['GHOST', 'NEON', 'V0ID', 'NOVA', 'ECHO', 'AXIS', 'ORBIT', 'DELTA', 'KILO', 'NIGHT', 'PIXEL', 'RAVEN', 'RUNE', 'CIPHER', 'STATIC', 'WIRE'];
const CALLSIGN_RIGHT = ['07', '42', '11', '99', '77', '03', '21', '88', '13', '31', '64', '08'];

class ProximityChat {
  constructor() {
    // ---------- backend ----------
    this.firebaseUrl = 'https://nearby-b1a8d-default-rtdb.europe-west1.firebasedatabase.app';

    // ---------- identity ----------
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
    this.username = this.loadUsername() || this.generateCallsign();
    this.deviceId = this.generateDeviceFingerprint();
    this.userReputation = this.loadReputation();

    // ---------- location ----------
    this.location = null;
    this.locationKey = null;
    this.radius = 3000; // fixed 3 km
    this.locationName = '';
    this.country = '';
    this.cityName = '';
    this.customLocation = this.loadCustomLocation();
    this.usingCustomLocation = this.loadUsingCustomLocation();
    this.selectedMapLocation = null;
    this.map = null;

    // ---------- chat state ----------
    this.messages = [];
    this.lastMessageTime = Date.now();
    this.autoRefreshInterval = null;
    this.lastAutoRefresh = 0;

    // ---------- security ----------
    this.sessionMessages = 0;
    this.maxSessionMessages = 30;
    this.maxWordCount = 75;
    this.sentMessageIds = [];
    this.cleanupStarted = false;
    this.messageCount = 0;
    this.lastMessageSent = 0;
    this.locationVerified = false;
    this.suspiciousActivity = 0;

    // ---------- presence ----------
    this.heartbeatInterval = null;
    this.presencePollInterval = null;
    this.activeUsers = []; // [{ userId, ts }]
    this.lastBlipUserId = null;

    this.bindElements();
    this.wireEvents();
    this.setupCleanupListeners();
    setTimeout(() => this.cleanupOldSessionMessages(), 1000);
    this.requestLocation();
  }

  /* ============================================================
     DOM
     ============================================================ */

  bindElements() {
    this.brandLoc          = document.getElementById('brandLoc');
    this.radarChip         = document.getElementById('radarChip');
    this.radarCount        = document.getElementById('radarCount');
    this.sysBtn            = document.getElementById('sysBtn');
    this.statusStrip       = document.getElementById('statusStrip');
    this.feed              = document.getElementById('feed');
    this.welcomeEl         = document.getElementById('welcome');
    this.welcomeText       = document.getElementById('welcomeText');
    this.welcomeRetry      = document.getElementById('welcomeRetry');

    this.messageInput      = document.getElementById('messageInput');
    this.sendBtn           = document.getElementById('sendBtn');

    this.toastStack        = document.getElementById('toastStack');

    // Radar overlay
    this.radarOverlay      = document.getElementById('radarOverlay');
    this.radarClose        = document.getElementById('radarClose');
    this.radarSvg          = document.getElementById('radarSvg');
    this.radarBlips        = document.getElementById('radarBlips');
    this.radarUsersStat    = document.getElementById('radarUsersStat');
    this.radarRadiusStat   = document.getElementById('radarRadiusStat');

    // SYS overlay
    this.sysOverlay        = document.getElementById('sysOverlay');
    this.sysClose          = document.getElementById('sysClose');
    this.usernameInput     = document.getElementById('usernameInput');
    this.callsignSave      = document.getElementById('callsignSave');
    this.locKv             = document.getElementById('locKv');
    this.customLocBtn      = document.getElementById('customLocBtn');
    this.gpsBtn            = document.getElementById('gpsBtn');
    this.clearBtn          = document.getElementById('clearBtn');

    // Map overlay
    this.mapOverlay        = document.getElementById('mapOverlay');
    this.mapClose          = document.getElementById('mapClose');
    this.useSelectedBtn    = document.getElementById('useSelectedBtn');
    this.mapLoading        = document.getElementById('mapLoading');

    // Confirm
    this.clearOverlay      = document.getElementById('clearOverlay');
    this.confirmClear      = document.getElementById('confirmClear');
    this.cancelClear       = document.getElementById('cancelClear');
  }

  wireEvents() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', e => { if (e.key === 'Enter') this.sendMessage(); });
    this.messageInput.addEventListener('input', () => this.updateInputState());

    this.radarChip.addEventListener('click', () => this.openRadar());
    this.radarClose.addEventListener('click', () => this.closeRadar());
    this.radarOverlay.addEventListener('click', e => { if (e.target === this.radarOverlay) this.closeRadar(); });

    this.sysBtn.addEventListener('click', () => this.openSys());
    this.sysClose.addEventListener('click', () => this.closeSys());
    this.sysOverlay.addEventListener('click', e => { if (e.target === this.sysOverlay) this.closeSys(); });

    this.callsignSave.addEventListener('click', () => this.saveCallsign());
    this.customLocBtn.addEventListener('click', () => this.openMap());
    this.gpsBtn.addEventListener('click', () => this.useGpsLocation());
    this.clearBtn.addEventListener('click', () => this.openClearConfirm());

    this.mapClose.addEventListener('click', () => this.closeMap());
    this.useSelectedBtn.addEventListener('click', () => this.useSelectedLocation());
    this.mapOverlay.addEventListener('click', e => { if (e.target === this.mapOverlay) this.closeMap(); });

    this.confirmClear.addEventListener('click', () => this.clearAllMessages());
    this.cancelClear.addEventListener('click', () => this.closeClearConfirm());
    this.clearOverlay.addEventListener('click', e => { if (e.target === this.clearOverlay) this.closeClearConfirm(); });

    this.welcomeRetry?.addEventListener('click', () => location.reload());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.closeRadar(); this.closeSys(); this.closeMap(); this.closeClearConfirm();
      }
    });
  }

  /* ============================================================
     Identity
     ============================================================ */

  generateCallsign() {
    const left = CALLSIGN_LEFT[Math.floor(Math.random() * CALLSIGN_LEFT.length)];
    const right = CALLSIGN_RIGHT[Math.floor(Math.random() * CALLSIGN_RIGHT.length)];
    return `${left}_${right}`;
  }

  loadUsername()                 { return localStorage.getItem('proximityChat_username'); }
  saveUsername(u)                { localStorage.setItem('proximityChat_username', u); }
  loadReputation()               { return parseInt(localStorage.getItem('userReputation')) || 50; }
  saveReputation(r)              { localStorage.setItem('userReputation', r.toString()); }
  loadCustomLocation() {
    try { return JSON.parse(localStorage.getItem('proximityChat_customLocation')); }
    catch { return null; }
  }
  saveCustomLocation(loc) {
    if (loc) localStorage.setItem('proximityChat_customLocation', JSON.stringify({ ...loc, timestamp: Date.now() }));
    else     localStorage.removeItem('proximityChat_customLocation');
  }
  loadUsingCustomLocation()      { return localStorage.getItem('proximityChat_usingCustomLocation') === 'true'; }
  saveUsingCustomLocation(v)     { localStorage.setItem('proximityChat_usingCustomLocation', String(v)); }

  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    const print = canvas.toDataURL();
    const data = [
      navigator.userAgent, navigator.language,
      screen.width + 'x' + screen.height, screen.colorDepth,
      new Date().getTimezoneOffset(), !!window.sessionStorage, !!window.localStorage,
      navigator.hardwareConcurrency || 'unknown', print.slice(-50)
    ].join('|');
    return 'dev_' + this.hashCode(data);
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Stable color for a callsign — index into PALETTE
  colorForUser(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
  }

  /* ============================================================
     Location bootstrap
     ============================================================ */

  async requestLocation() {
    if (this.usingCustomLocation && this.customLocation) {
      this.setBrandLoc('CUSTOM · LOADING');
      try {
        this.location = { ...this.customLocation };
        this.locationKey = this.generateLocationKey(this.location.lat, this.location.lon);
        await this.getLocationInfo();
        const ok = await this.testFirebase();
        if (!ok) throw new Error('cannot connect');
        this.enableChat();
        await this.loadExistingMessages();
        this.startPresence();
        this.toast('Connected via custom location.', 'success');
        return;
      } catch (err) {
        console.error('Custom location failed, falling back to GPS:', err);
        this.usingCustomLocation = false;
        this.saveUsingCustomLocation(false);
      }
    }

    this.setBrandLoc('LOCATING…');
    try {
      if (!navigator.geolocation) throw new Error('Geolocation not supported');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 30000
        });
      });
      this.location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      this.usingCustomLocation = false;
      this.saveUsingCustomLocation(false);
      this.checkIPLocation();
      this.locationKey = this.generateLocationKey(this.location.lat, this.location.lon);
      await this.getLocationInfo();
      this.setBrandLoc('CONNECTING…');
      const ok = await this.testFirebase();
      if (!ok) throw new Error('cannot connect to chat server');
      this.enableChat();
      await this.loadExistingMessages();
      this.startPresence();
      this.toast('Connected — chatting nearby.', 'success');
    } catch (err) {
      console.error('Location/Firebase error:', err);
      let msg = 'Failed to start. ';
      if (err.code === 1) msg += 'Location permission denied.';
      else if (err.code === 2) msg += 'Location unavailable.';
      else if (err.code === 3) msg += 'Location timed out.';
      else msg += err.message || 'Try again.';
      this.setBrandLoc('OFFLINE');
      this.showWelcome('CONNECTION FAILED', msg, true);
      this.toast(msg, 'error');
    }
  }

  async checkIPLocation() {
    try {
      const r = await fetch('https://ipapi.co/json/');
      const d = await r.json();
      if (this.location && d?.latitude) {
        this.calculateDistance(this.location.lat, this.location.lon, d.latitude, d.longitude);
      }
    } catch { /* silent */ }
  }

  generateLocationKey(lat, lon) {
    const precision = 0.001;
    const gridLat = Math.floor(lat / precision) * precision;
    const gridLon = Math.floor(lon / precision) * precision;
    const id = `${gridLat.toFixed(3)}_${gridLon.toFixed(3)}`;
    return `area_${id.replace(/\./g, '_').replace(/-/g, 'n')}_r${this.radius}`;
  }

  getNearbyLocationKeys(lat, lon) {
    const precision = 0.001;
    const baseLat = Math.floor(lat / precision) * precision;
    const baseLon = Math.floor(lon / precision) * precision;
    const keys = [];
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const gLat = baseLat + (dLat * precision);
        const gLon = baseLon + (dLon * precision);
        const id = `${gLat.toFixed(3)}_${gLon.toFixed(3)}`;
        keys.push(`area_${id.replace(/\./g, '_').replace(/-/g, 'n')}_r${this.radius}`);
      }
    }
    return [...new Set(keys)];
  }

  async testFirebase() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${this.firebaseUrl}/.json`, {
        signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(t);
      return r.ok;
    } catch (err) {
      console.error('Firebase test failed:', err);
      return false;
    }
  }

  enableChat() {
    this.messageInput.disabled = false;
    this.sendBtn.disabled = false;
    this.updateInputState();
    this.updateBrandLocDisplay();
    this.hideWelcome();
    this.startAutoRefresh();
  }

  /* ============================================================
     Geocoding
     ============================================================ */

  async getLocationInfo() {
    try {
      const lat = this.location.lat;
      const lon = this.location.lon || this.location.lng;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'ProximityChat/1.0' } }
      );
      if (r.ok) {
        const d = await r.json();
        if (d.address) {
          this.cityName = d.address.city || d.address.town || d.address.village || d.address.hamlet || d.address.suburb || 'Unknown City';
          this.country = d.address.country || 'Unknown Country';
          const state = d.address.state || d.address.region || '';
          this.locationName = state ? `${this.cityName}, ${state}` : this.cityName;
          return;
        }
      }
      await this.getFallbackLocationInfo();
    } catch (err) {
      console.error('getLocationInfo error:', err);
      await this.getFallbackLocationInfo();
    }
  }

  async getFallbackLocationInfo() {
    try {
      const r = await fetch('https://ipapi.co/json/');
      if (r.ok) {
        const d = await r.json();
        this.cityName = d.city || 'Unknown City';
        this.country = d.country_name || 'Unknown Country';
        this.locationName = d.region ? `${this.cityName}, ${d.region}` : this.cityName;
      } else this.setDefaultLocationInfo();
    } catch { this.setDefaultLocationInfo(); }
  }

  setDefaultLocationInfo() {
    this.cityName = 'Unknown'; this.country = ''; this.locationName = 'Unknown';
  }

  async reverseGeocode(lat, lon) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'ProximityChat/1.0' } }
      );
      if (r.ok) {
        const d = await r.json();
        if (d.address) {
          const city = d.address.city || d.address.town || d.address.village || d.address.hamlet || d.address.suburb || 'Unknown';
          const country = d.address.country || '';
          const state = d.address.state || d.address.region || '';
          const name = state ? `${city}, ${state}` : city;
          return country ? `${name}, ${country}` : name;
        }
      }
    } catch { /* ignore */ }
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }

  /* ============================================================
     Header / location display
     ============================================================ */

  setBrandLoc(text) {
    this.brandLoc.textContent = text;
  }

  updateBrandLocDisplay() {
    if (!this.location) return;
    const tag = this.usingCustomLocation ? 'CUSTOM' : 'GPS';
    const cityPart = (this.locationName && this.locationName !== 'Unknown')
      ? this.locationName
      : `${this.location.lat.toFixed(3)}, ${this.location.lon.toFixed(3)}`;
    this.brandLoc.innerHTML = `<span class="dim">${tag} ·</span> ${this.escapeHtml(cityPart)}`;
  }

  /* ============================================================
     Welcome / status
     ============================================================ */

  showWelcome(title, body, withRetry = false) {
    this.feed.innerHTML = '';
    const w = document.createElement('div');
    w.className = 'welcome';
    w.innerHTML = `
      <div class="ring"></div>
      <h2>${this.escapeHtml(title)}</h2>
      <p>${this.escapeHtml(body)}</p>
      ${withRetry ? `<button class="retry-btn" id="welcomeRetry">⟲ RETRY</button>` : ''}
    `;
    this.feed.appendChild(w);
    if (withRetry) {
      document.getElementById('welcomeRetry').addEventListener('click', () => location.reload());
    }
  }

  hideWelcome() {
    const w = this.feed.querySelector('.welcome');
    if (w) w.remove();
  }

  flashStatus(text, kind = 'ok', durationMs = 1500) {
    this.statusStrip.className = `status-strip visible ${kind}`;
    this.statusStrip.innerHTML = `<span class="dot"></span><span>${this.escapeHtml(text)}</span>`;
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => {
      this.statusStrip.classList.remove('visible');
    }, durationMs);
  }

  /* ============================================================
     Toasts
     ============================================================ */

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    this.toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 220);
    }, 3000);
  }

  showError(text)   { this.toast(text, 'error'); }
  showSuccess(text) { this.toast(text, 'success'); }

  /* ============================================================
     Send / receive messages
     ============================================================ */

  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content || !this.location) return;
    if (!this.passesSecurityChecks(content)) return;
    if (content.length > 500) { this.showError('Message too long (max 500 chars).'); return; }

    const msg = {
      message: content,
      username: this.username || 'Anonymous',
      timestamp: Date.now(),
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      content,
      userId: this.userId,
      deviceId: this.deviceId,
      location: this.location,
      reputation: this.userReputation,
      verified: this.locationVerified,
      radius: this.radius,
      locationName: this.locationName,
      country: this.country
    };

    await this.addMessageToUI(msg, true);
    this.messageInput.value = '';

    this.messageCount++;
    this.sessionMessages++;
    this.lastMessageSent = Date.now();
    this.sentMessageIds.push(msg.id);
    this.updateInputState();

    try {
      const res = await fetch(`${this.firebaseUrl}/proximity/${this.locationKey}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      if (!res.ok) {
        if (res.status === 401) {
          const minimal = { message: content, username: msg.username, timestamp: msg.timestamp };
          const retry = await fetch(`${this.firebaseUrl}/proximity/${this.locationKey}.json`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(minimal)
          });
          if (!retry.ok) throw new Error(`Firebase rules error: ${retry.status}`);
        } else {
          throw new Error(`Send failed: ${res.status}`);
        }
      }
      if (this.userReputation < 1000) { this.userReputation += 1; this.saveReputation(this.userReputation); }
    } catch (err) {
      console.error('Send error:', err);
      this.showError('Failed to send. Try again.');
      this.suspiciousActivity++;
    }
  }

  async loadExistingMessages() {
    try {
      const keys = this.getNearbyLocationKeys(this.location.lat, this.location.lon);
      const all = new Map();
      await Promise.all(keys.map(async k => {
        try {
          const r = await fetch(`${this.firebaseUrl}/proximity/${k}.json`);
          if (!r.ok) return;
          const data = await r.json();
          if (!data) return;
          for (const [, m] of Object.entries(data)) {
            if (m && m.id && !all.has(m.id)) all.set(m.id, m);
          }
        } catch { /* silent per bucket */ }
      }));
      const oneHour = Date.now() - 3600000;
      const recent = [...all.values()]
        .filter(m => m.timestamp > oneHour)
        .sort((a, b) => a.timestamp - b.timestamp);
      // wipe non-own messages from the feed and re-render so deletions reflect
      [...this.feed.querySelectorAll('.msg')].forEach(n => n.remove());
      this.messages = [];
      for (const m of recent) {
        if (!m.location || this.isWithinRange(m.location)) {
          await this.addMessageToUI(m, m.userId === this.userId);
        }
      }
    } catch (err) {
      console.error('loadExistingMessages error:', err);
    }
  }

  async pollMessages() {
    if (!this.locationKey) return;
    try {
      const keys = this.getNearbyLocationKeys(this.location.lat, this.location.lon);
      let total = 0;
      await Promise.all(keys.map(async k => {
        try {
          const r = await fetch(`${this.firebaseUrl}/proximity/${k}.json`);
          if (!r.ok) return;
          const data = await r.json();
          if (!data) return;
          for (const [, m] of Object.entries(data)) {
            if (!m || m.userId === this.userId) continue;
            if (m.timestamp <= this.lastMessageTime) continue;
            if (m.location && this.isWithinRange(m.location)) {
              await this.addMessageToUI(m, false);
              this.lastMessageTime = Math.max(this.lastMessageTime, m.timestamp);
              total++;
            }
          }
        } catch { /* per-bucket silent */ }
      }));
      return total;
    } catch (err) {
      console.error('pollMessages error:', err);
    }
  }

  isWithinRange(messageLocation) {
    if (!this.location || !messageLocation) return false;
    const d = this.calculateDistance(this.location.lat, this.location.lon, messageLocation.lat, messageLocation.lon);
    return d < 100000;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  toRad(deg) { return deg * Math.PI / 180; }

  bearingText(fromLat, fromLon, toLat, toLon) {
    const φ1 = this.toRad(fromLat), φ2 = this.toRad(toLat);
    const Δλ = this.toRad(toLon - fromLon);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const deg = (θ * 180 / Math.PI + 360) % 360;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  formatDistance(m) {
    if (m < 50)   return '<50m';
    if (m < 1000) return `~${Math.round(m / 10) * 10}m`;
    return `~${(m / 1000).toFixed(1)}km`;
  }

  async addMessageToUI(message, isOwn) {
    if (this.messages.find(m => m.id === message.id)) return;
    this.messages.push(message);

    const el = document.createElement('div');
    el.className = 'msg' + (isOwn ? ' own' : '');
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const callsign = (isOwn ? this.username : (message.username || 'ANON')).toUpperCase();
    const color = isOwn ? '#FF2E88' : this.colorForUser(callsign);
    el.style.setProperty('--user-color', color);

    let distTag = '';
    if (!isOwn && message.location && this.location) {
      const d = this.calculateDistance(this.location.lat, this.location.lon, message.location.lat, message.location.lon);
      const dir = this.bearingText(this.location.lat, this.location.lon, message.location.lat, message.location.lon);
      distTag = `<span class="tag dist">${this.formatDistance(d)} ${dir}</span>`;
    } else if (isOwn) {
      distTag = `<span class="tag dist">YOU</span>`;
    }

    el.innerHTML = `
      <div class="stripe"></div>
      <div class="body">
        <div class="meta">
          <span class="callsign">${this.escapeHtml(callsign)}</span>
          ${distTag}
          <span class="tag time">${time}</span>
        </div>
        <div class="text">${this.escapeHtml(message.message || message.content)}</div>
      </div>
    `;
    this.feed.appendChild(el);
    this.feed.scrollTop = this.feed.scrollHeight;

    // pulse the radar chip when a new non-own message arrives
    if (!isOwn) this.flashRadarChip();
  }

  flashRadarChip() {
    this.radarChip.classList.remove('flash');
    void this.radarChip.offsetWidth;
    this.radarChip.classList.add('flash');
  }

  /* ============================================================
     Refresh loop
     ============================================================ */

  startAutoRefresh() {
    clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = setInterval(() => this.performAutoRefresh(), 20000);
  }

  stopAutoRefresh() {
    clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = null;
  }

  async performAutoRefresh() {
    if (!this.locationKey) return;
    try {
      const before = this.messages.length;
      await this.loadExistingMessages();
      const delta = this.messages.length - before;
      this.lastAutoRefresh = Date.now();
      if (delta > 0) this.flashStatus(`SYNC · ${delta} new`, 'ok', 1400);
    } catch (err) {
      console.error('auto refresh error:', err);
      this.flashStatus('SYNC FAILED', 'error', 1400);
    }
  }

  /* ============================================================
     Presence (heartbeat)
     ============================================================ */

  startPresence() {
    this.writeHeartbeat();
    this.heartbeatInterval = setInterval(() => this.writeHeartbeat(), 20000);
    this.pollPresence();
    this.presencePollInterval = setInterval(() => this.pollPresence(), 12000);
  }

  stopPresence() {
    clearInterval(this.heartbeatInterval); this.heartbeatInterval = null;
    clearInterval(this.presencePollInterval); this.presencePollInterval = null;
  }

  async writeHeartbeat() {
    if (!this.locationKey) return;
    try {
      await fetch(`${this.firebaseUrl}/presence/${this.locationKey}/${this.userId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ts: Date.now(), c: this.username })
      });
    } catch { /* silent */ }
  }

  async clearMyPresenceSync() {
    if (!this.locationKey) return;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('DELETE', `${this.firebaseUrl}/presence/${this.locationKey}/${this.userId}.json`, false);
      xhr.send();
    } catch { /* silent */ }
  }

  async pollPresence() {
    if (!this.locationKey) return;
    const now = Date.now();
    const cutoff = now - 60000;
    try {
      const keys = this.getNearbyLocationKeys(this.location.lat, this.location.lon);
      const seen = new Map();
      await Promise.all(keys.map(async k => {
        try {
          const r = await fetch(`${this.firebaseUrl}/presence/${k}.json`);
          if (!r.ok) return;
          const data = await r.json();
          if (!data) return;
          for (const [uid, rec] of Object.entries(data)) {
            if (rec?.ts && rec.ts > cutoff && uid !== this.userId) {
              const prev = seen.get(uid);
              if (!prev || rec.ts > prev.ts) seen.set(uid, { userId: uid, ts: rec.ts });
            }
          }
        } catch { /* silent per bucket */ }
      }));
      this.activeUsers = [...seen.values()];
      this.renderRadarChip();
      // if radar overlay open, repaint
      if (this.radarOverlay.classList.contains('open')) this.renderRadarBlips();
    } catch (err) {
      console.error('pollPresence error:', err);
    }
  }

  renderRadarChip() {
    const n = this.activeUsers.length + 1; // +1 for self
    this.radarCount.textContent = String(n).padStart(2, '0');
  }

  /* ============================================================
     Radar overlay rendering
     ============================================================ */

  openRadar() {
    this.radarOverlay.classList.add('open');
    this.renderRadarBlips();
    this.radarRadiusStat.textContent = '3.0K';
    this.pollPresence();
  }

  closeRadar() {
    this.radarOverlay.classList.remove('open');
  }

  renderRadarBlips() {
    if (!this.radarBlips) return;
    this.radarBlips.innerHTML = '';

    // Place anonymized blips by deterministic angle/distance per userId.
    // Distance is mapped onto a normalized radial range r ∈ [0.18, 0.95] of the radar.
    const cx = 100, cy = 100; // viewBox 0..200
    for (const u of this.activeUsers) {
      const a = (this.hashFloat(u.userId + '#a') % 360) * Math.PI / 180;
      const r = 18 + (this.hashFloat(u.userId + '#r') % 78); // 18..95
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x.toFixed(2));
      c.setAttribute('cy', y.toFixed(2));
      c.setAttribute('r', '2.6');
      c.setAttribute('class', 'r-blip');
      this.radarBlips.appendChild(c);
    }
    this.radarUsersStat.textContent = String(this.activeUsers.length + 1).padStart(2, '0');
  }

  hashFloat(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h);
  }

  /* ============================================================
     SYS overlay
     ============================================================ */

  openSys() {
    this.sysOverlay.classList.add('open');
    this.usernameInput.value = this.username;
    this.renderLocKv();
    this.updateLocButtonsVisibility();
  }

  closeSys() {
    this.sysOverlay.classList.remove('open');
  }

  renderLocKv() {
    const tag = this.usingCustomLocation ? 'CUSTOM' : 'GPS';
    const cityPart = (this.locationName && this.locationName !== 'Unknown')
      ? this.locationName : '—';
    const coordsPart = this.location
      ? `${this.location.lat.toFixed(4)}, ${this.location.lon.toFixed(4)}`
      : '—';
    this.locKv.innerHTML = `
      <dt>Source</dt><dd>${tag}</dd>
      <dt>Place</dt><dd>${this.escapeHtml(cityPart)}</dd>
      <dt>Coords</dt><dd>${coordsPart}</dd>
      <dt>Radius</dt><dd>3.0 km broadcast</dd>
      <dt>Reputation</dt><dd>${this.userReputation}</dd>
    `;
  }

  updateLocButtonsVisibility() {
    if (this.usingCustomLocation) {
      this.customLocBtn.textContent = 'CHANGE LOCATION';
      this.gpsBtn.style.display = '';
    } else {
      this.customLocBtn.textContent = 'PICK ON MAP';
      this.gpsBtn.style.display = 'none';
    }
  }

  saveCallsign() {
    const v = this.usernameInput.value.trim();
    if (!v) { this.showError('Callsign cannot be empty.'); return; }
    if (v.length > 20) { this.showError('Max 20 characters.'); return; }
    this.username = v;
    this.saveUsername(v);
    this.toast('Callsign updated.', 'success');
  }

  /* ============================================================
     Map (custom location)
     ============================================================ */

  openMap() {
    this.mapOverlay.classList.add('open');
    this.mapLoading.style.display = '';
    this.useSelectedBtn.disabled = true;
    setTimeout(() => this.initializeMap(), 30);
  }

  closeMap() {
    this.mapOverlay.classList.remove('open');
    if (this.map) { this.map.remove(); this.map = null; }
    this.selectedMapLocation = null;
    this.useSelectedBtn.disabled = true;
  }

  async initializeMap() {
    try {
      const lat = this.location ? this.location.lat : 40.7128;
      const lon = this.location ? this.location.lon : -74.0060;
      this.map = L.map('map').setView([lat, lon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18
      }).addTo(this.map);
      if (this.location && !this.usingCustomLocation) {
        L.marker([this.location.lat, this.location.lon]).addTo(this.map)
          .bindPopup('Your current location').openPopup();
      }
      this.map.on('click', e => this.onMapClick(e));
      setTimeout(() => { this.mapLoading.style.display = 'none'; }, 700);
    } catch (err) {
      console.error('initializeMap error:', err);
      this.mapLoading.textContent = 'MAP UNAVAILABLE';
    }
  }

  onMapClick(e) {
    if (this.selectedLocationMarker) this.map.removeLayer(this.selectedLocationMarker);
    this.selectedLocationMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(this.map)
      .bindPopup('Chat from here').openPopup();
    this.selectedMapLocation = { lat: e.latlng.lat, lon: e.latlng.lng };
    this.useSelectedBtn.disabled = false;
  }

  async useSelectedLocation() {
    if (!this.selectedMapLocation) { this.showError('Pick a point on the map first.'); return; }
    try {
      this.customLocation = { ...this.selectedMapLocation };
      this.location = { ...this.selectedMapLocation };
      this.usingCustomLocation = true;
      this.saveCustomLocation(this.customLocation);
      this.saveUsingCustomLocation(true);
      this.locationKey = this.generateLocationKey(this.location.lat, this.location.lon);
      await this.getLocationInfo();
      this.updateBrandLocDisplay();
      this.renderLocKv();
      this.updateLocButtonsVisibility();
      this.closeMap();
      this.closeSys();
      await this.reconnectWithNewLocation();
      this.toast('Custom location set.', 'success');
    } catch (err) {
      console.error('useSelectedLocation error:', err);
      this.showError('Failed to set location.');
    }
  }

  async useGpsLocation() {
    try {
      this.flashStatus('SWITCHING TO GPS', 'ok', 1200);
      this.usingCustomLocation = false;
      this.customLocation = null;
      this.saveUsingCustomLocation(false);
      this.saveCustomLocation(null);
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 30000
        });
      });
      this.location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      this.locationKey = this.generateLocationKey(this.location.lat, this.location.lon);
      await this.getLocationInfo();
      this.updateBrandLocDisplay();
      this.renderLocKv();
      this.updateLocButtonsVisibility();
      this.closeSys();
      await this.reconnectWithNewLocation();
      this.toast('Switched to GPS location.', 'success');
    } catch (err) {
      console.error('useGpsLocation error:', err);
      this.showError('Failed to get GPS location.');
    }
  }

  async reconnectWithNewLocation() {
    try {
      this.messages = [];
      [...this.feed.querySelectorAll('.msg')].forEach(n => n.remove());
      this.flashStatus('RECONNECTING…', 'ok', 1200);
      const ok = await this.testFirebase();
      if (!ok) throw new Error('cannot connect');
      this.stopPresence();
      await this.loadExistingMessages();
      this.startPresence();
      this.flashStatus('SYNCED', 'ok', 1200);
    } catch (err) {
      console.error('reconnect error:', err);
      this.showError('Reconnect failed.');
    }
  }

  /* ============================================================
     Clear my messages
     ============================================================ */

  openClearConfirm()  { this.clearOverlay.classList.add('open'); }
  closeClearConfirm() { this.clearOverlay.classList.remove('open'); }

  async clearAllMessages() {
    this.closeClearConfirm();
    this.confirmClear.disabled = true;
    const original = this.confirmClear.textContent;
    this.confirmClear.textContent = 'CLEARING…';
    try {
      await this.asyncClearUserMessages();
      await this.loadExistingMessages();
      if (this.sentMessageIds.length === 0) this.toast('Your messages were cleared.', 'success');
      else this.showError('Some messages could not be cleared.');
    } catch (err) {
      console.error('clearAllMessages error:', err);
      this.showError('Clear failed. Try again.');
    } finally {
      this.confirmClear.disabled = false;
      this.confirmClear.textContent = original;
    }
  }

  async asyncClearUserMessages() {
    if (!this.locationKey || this.sentMessageIds.length === 0) return;
    try {
      const r = await fetch(`${this.firebaseUrl}/proximity/${this.locationKey}.json`);
      if (!r.ok) return;
      const data = await r.json();
      if (!data) return;
      let deleted = 0;
      for (const [fbKey, m] of Object.entries(data)) {
        if (this.sentMessageIds.includes(m.id)) {
          const rr = await fetch(`${this.firebaseUrl}/proximity/${this.locationKey}/${fbKey}.json`, { method: 'DELETE' });
          if (rr.ok) deleted++;
        }
      }
      this.sentMessageIds = [];
      this.clearStoredCleanupInfo();
      return deleted;
    } catch (err) {
      console.error('asyncClearUserMessages error:', err);
    }
  }

  /* ============================================================
     Cleanup on unload (preserved logic, lightly trimmed)
     ============================================================ */

  setupCleanupListeners() {
    const storeCleanupInfo = () => {
      if (this.locationKey && this.sentMessageIds.length > 0) {
        const info = {
          locationKey: this.locationKey,
          messageIds: [...this.sentMessageIds],
          userId: this.userId,
          timestamp: Date.now(),
          firebaseUrl: this.firebaseUrl
        };
        sessionStorage.setItem('emergencyCleanup', JSON.stringify(info));
        localStorage.setItem('emergencyCleanup', JSON.stringify(info));
      }
    };

    window.addEventListener('beforeunload', () => {
      storeCleanupInfo();
      this.clearMyPresenceSync();
      this.performEmergencyCleanup();
    });
    window.addEventListener('pagehide', () => {
      storeCleanupInfo();
      this.clearMyPresenceSync();
      this.performEmergencyCleanup();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) storeCleanupInfo();
      else sessionStorage.removeItem('emergencyCleanup');
    });

    this.checkForEmergencyCleanup();
  }

  performEmergencyCleanup() {
    if (!this.locationKey || this.sentMessageIds.length === 0) return;
    const data = {
      messageIds: [...this.sentMessageIds],
      locationKey: this.locationKey,
      timestamp: Date.now(),
      userId: this.userId
    };
    localStorage.setItem('pendingUserCleanup', JSON.stringify(data));
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.firebaseUrl}/cleanup.json`,
          JSON.stringify({ action: 'deleteUserMessages', messageIds: this.sentMessageIds, userId: this.userId })
        );
      }
      this.deleteUserMessagesSync();
    } catch (err) {
      console.error('emergency cleanup failed:', err);
    }
  }

  deleteUserMessagesSync() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${this.firebaseUrl}/proximity/${this.locationKey}.json`, false);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        if (data) {
          for (const [fbKey, m] of Object.entries(data)) {
            if (this.sentMessageIds.includes(m.id)) {
              const dx = new XMLHttpRequest();
              dx.open('DELETE', `${this.firebaseUrl}/proximity/${this.locationKey}/${fbKey}.json`, false);
              dx.send();
            }
          }
          this.sentMessageIds = [];
          localStorage.removeItem('pendingUserCleanup');
        }
      }
    } catch (err) {
      console.error('sync cleanup failed:', err);
    }
  }

  checkForEmergencyCleanup() {
    const s = sessionStorage.getItem('emergencyCleanup');
    const l = localStorage.getItem('emergencyCleanup');
    const info = s ? JSON.parse(s) : (l ? JSON.parse(l) : null);
    if (!info?.locationKey) return;
    if (Date.now() - info.timestamp >= 300000) { this.clearStoredCleanupInfo(); return; }
    this.executeDeferredCleanup(info);
  }

  async executeDeferredCleanup(info) {
    try {
      if (!info.messageIds?.length) return;
      const r = await fetch(`${info.firebaseUrl}/proximity/${info.locationKey}.json`);
      if (!r.ok) return;
      const data = await r.json();
      if (!data) return;
      for (const [fbKey, m] of Object.entries(data)) {
        if (info.messageIds.includes(m.id)) {
          await fetch(`${info.firebaseUrl}/proximity/${info.locationKey}/${fbKey}.json`, { method: 'DELETE' });
        }
      }
    } catch (err) {
      console.error('deferred cleanup failed:', err);
    } finally {
      this.clearStoredCleanupInfo();
    }
  }

  clearStoredCleanupInfo() {
    sessionStorage.removeItem('emergencyCleanup');
    localStorage.removeItem('emergencyCleanup');
    localStorage.removeItem('failedCleanup');
  }

  async cleanupOldSessionMessages() {
    const pending = localStorage.getItem('pendingUserCleanup');
    if (!pending) return;
    try {
      const data = JSON.parse(pending);
      if (Date.now() - data.timestamp >= 300000) {
        localStorage.removeItem('pendingUserCleanup');
        return;
      }
      if (data.messageIds?.length) {
        this.locationKey = data.locationKey;
        this.sentMessageIds = data.messageIds;
        await this.asyncClearUserMessages();
      }
    } catch { localStorage.removeItem('pendingUserCleanup'); }
  }

  /* ============================================================
     Security checks
     ============================================================ */

  passesSecurityChecks(content) {
    const now = Date.now();
    if (!this.passesContentFilter(content)) return false;
    if (this.sessionMessages >= this.maxSessionMessages) {
      this.showError(`Session limit (${this.maxSessionMessages}) reached.`); return false;
    }
    const wc = content.trim().split(/\s+/).filter(w => w.length).length;
    if (wc > this.maxWordCount) {
      this.showError(`Max ${this.maxWordCount} words (you have ${wc}).`); return false;
    }
    if (now - this.lastMessageSent < 3000) {
      this.showError('Slow down — wait a moment.'); return false;
    }
    if (this.messageCount >= 20) {
      const fiveMin = now - 300000;
      if (this.lastMessageTime > fiveMin) {
        this.showError('Too many messages. Wait a few minutes.'); return false;
      }
      this.messageCount = 0;
    }
    if (this.userReputation < 10 && this.suspiciousActivity > 3) {
      this.showError('Account temporarily restricted.'); return false;
    }
    return true;
  }

  passesContentFilter(content) {
    const text = content.toLowerCase().trim();
    const threats = ['kill','murder','die','death','hurt','harm','attack','beat up','violence','shoot','stab','gun','weapon','bomb','explosive','terrorist','threat','kidnap','abuse','assault','rape','molest'];
    const sexual  = ['sex','porn','nude','naked','boobs','penis','vagina','orgasm','masturbate','horny','aroused','seduce','escort','prostitute','hookup','nsfw','xxx','adult','erotic','fetish','kinky','slutty','whore'];
    const drugs   = ['weed','marijuana','cannabis','cocaine','heroin','meth','crack','lsd','ecstasy','molly','dealer','drug','high','stoned','junkie','addict','pills','prescription','xanax','opioid','fentanyl','ketamine','mushrooms','acid','dope','blow','snow','ice'];
    const cats = [
      { words: threats, label: 'violent or threatening' },
      { words: sexual,  label: 'sexual or inappropriate' },
      { words: drugs,   label: 'drug-related' }
    ];
    for (const c of cats) {
      for (const w of c.words) {
        const patt = [
          new RegExp(`\\b${w}\\b`, 'i'),
          new RegExp(`\\b${w}s\\b`, 'i'),
          new RegExp(`\\b${w}ing\\b`, 'i'),
          new RegExp(`\\b${w}ed\\b`, 'i')
        ];
        if (patt.some(p => p.test(text))) {
          this.showError(`Blocked: ${c.label} content not allowed.`);
          this.suspiciousActivity++;
          if (this.suspiciousActivity > 3) {
            this.userReputation = Math.max(0, this.userReputation - 10);
            this.saveReputation(this.userReputation);
          }
          return false;
        }
      }
    }
    const sanitized = text.replace(/[@4]/g,'a').replace(/[3]/g,'e').replace(/[1!]/g,'i').replace(/[0]/g,'o').replace(/[5$]/g,'s').replace(/[7]/g,'t').replace(/[+]/g,'t');
    for (const c of cats) {
      for (const w of c.words) {
        if (sanitized.includes(w)) {
          this.showError(`Blocked: ${c.label} content not allowed.`);
          this.suspiciousActivity++;
          return false;
        }
      }
    }
    return true;
  }

  /* ============================================================
     Input state / placeholder
     ============================================================ */

  updateInputState() {
    const content = this.messageInput.value.trim();
    const wc = content.length ? content.split(/\s+/).filter(w => w.length).length : 0;
    const remaining = this.maxWordCount - wc;
    const sessionLeft = this.maxSessionMessages - this.sessionMessages;
    this.messageInput.placeholder = `Type message · ${Math.max(remaining, 0)}w left · ${sessionLeft} sends`;

    const overWord = wc > this.maxWordCount;
    const sessionDone = this.sessionMessages >= this.maxSessionMessages;

    if (sessionDone) {
      this.messageInput.disabled = true;
      this.sendBtn.disabled = true;
      this.messageInput.placeholder = 'Session limit reached — refresh to continue';
      return;
    }
    this.sendBtn.disabled = overWord || !content;
  }

  /* ============================================================
     Util
     ============================================================ */

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ProximityChat();
});
