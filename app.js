const playlists = [
  {
    name: 'NUYsTV S1',
    file: 'aynaott.m3u',
    description: 'A mix of channels from various genres to explore and enjoy.',
  },
  {
    name: 'NUYsTV S2',
    file: 'Sports-138.m3u',
    description: 'A collection of sports channels to keep you updated on all the action.',
  },
];

const state = {
  groups: [],
  channels: [],
  currentIndex: -1,
  hls: null,
  theme: 'dark',
  search: '',
};

const collectionsEl = document.getElementById('collections');
const videoEl = document.getElementById('video');
const heroTitleEl = document.getElementById('heroTitle');
const heroMetaEl = document.getElementById('heroMeta');
const sourceChipEl = document.getElementById('sourceChip');
const searchInputEl = document.getElementById('searchInput');
const allChannelsModalEl = document.getElementById('allChannelsModal');
const allChannelsListEl = document.getElementById('allChannelsList');
const allChannelsTitleEl = document.getElementById('allChannelsTitle');

function parsePlaylist(content, sourceName) {
  const lines = content.replace(/\r/g, '').split('\n');
  const channels = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line.startsWith('#EXTINF')) {
      continue;
    }

    const url = (lines[index + 1] || '').trim();
    if (!url || url.startsWith('#')) {
      continue;
    }

    const info = line;
    const name = (info.split(',').slice(1).join(',') || 'Unknown Channel').trim();
    const logoMatch = info.match(/tvg-logo="(.*?)"/i);
    const groupMatch = info.match(/group-title="(.*?)"/i);

    channels.push({
      name,
      url,
      logo: logoMatch ? logoMatch[1] : '',
      group: groupMatch ? groupMatch[1] : sourceName,
      source: sourceName,
    });
  }

  return channels;
}

async function loadAllPlaylists() {
  const loadedGroups = await Promise.allSettled(playlists.map(async (playlist) => {
    const response = await fetch(playlist.file);
    const text = await response.text();
    return {
      ...playlist,
      channels: parsePlaylist(text, playlist.name),
    };
  }));

  const successfulGroups = loadedGroups
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  state.channels = [];
  state.groups = successfulGroups;
  state.groups.forEach((group) => {
    group.channels = group.channels.map((channel, idx) => {
      const id = `${group.name}::${idx}`;
      const ch = { ...channel, source: group.name, __id: id };
      return ch;
    });
    state.channels.push(...group.channels);
  });

  renderCollections();
  renderAllChannelsList();

  if (!state.channels.length) {
    collectionsEl.innerHTML = '<p class="subtitle">No playlists loaded. Open this page through a local server so the M3U files can be fetched.</p>';
    return;
  }

  const firstPlayable = state.channels.findIndex((channel) => Boolean(channel.url));
  if (firstPlayable >= 0) {
    playChannel(firstPlayable, false);
  }
}

function renderCollections() {
  collectionsEl.innerHTML = '';

  state.groups.forEach((group) => {
    const filtered = group.channels.filter((channel) => {
      const search = state.search.toLowerCase();
      if (!search) {
        return true;
      }

      return [channel.name, channel.group, group.name].join(' ').toLowerCase().includes(search);
    });

    const section = document.createElement('section');
    section.className = 'collection';
    const safeGroupName = group.name.replace(/'/g, "\\'");

    section.innerHTML = `
      <div class="collection-head">
        <h3>${group.name}</h3>
        <div class="collection-head-actions">
          <button class="rail-btn rail-btn-wide" type="button" onclick="openAllChannels('${safeGroupName}')">View All</button>
          <button class="rail-btn" type="button" aria-label="Scroll ${group.name} left" onclick="scrollRail('${safeGroupName}', -1)">‹</button>
          <button class="rail-btn" type="button" aria-label="Scroll ${group.name} right" onclick="scrollRail('${safeGroupName}', 1)">›</button>
        </div>
      </div>
      <span class="subtitle">${group.description}</span>
      <div class="channel-rail" data-group="${group.name}"></div>
    `;

    const rail = section.querySelector('.channel-rail');

    filtered.forEach((channel) => {
      const globalIndex = state.channels.indexOf(channel);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'channel-card';
      card.dataset.index = String(globalIndex);
      card.title = channel.name;
      card.innerHTML = channel.logo
        ? `<img src="${channel.logo}" alt="${channel.name}">`
        : `<span class="channel-fallback">${channel.name}</span>`;
      card.addEventListener('click', () => playChannel(globalIndex));
      rail.appendChild(card);
    });

    collectionsEl.appendChild(section);
  });

  setupRailDrag();
  syncActiveCard();
}

function renderAllChannelsList() {
  if (!allChannelsListEl) {
    return;
  }

  allChannelsListEl.innerHTML = '';

  const groupsToRender = state.viewAllGroup
    ? state.groups.filter((group) => group.name === state.viewAllGroup)
    : state.groups;

  groupsToRender.forEach((group) => {
    const filtered = group.channels.filter((channel) => {
      const search = state.search.toLowerCase();
      if (!search) {
        return true;
      }

      return [channel.name, channel.group, group.name].join(' ').toLowerCase().includes(search);
    });

    const wrapper = document.createElement('section');
    wrapper.className = 'all-group';
    wrapper.innerHTML = `
      <div class="all-group-head">
        <h3>${group.name}</h3>
        <span>${filtered.length} channels</span>
      </div>
      <div class="all-channel-grid"></div>
    `;

    const grid = wrapper.querySelector('.all-channel-grid');

    filtered.forEach((channel) => {
      const globalIndex = state.channels.indexOf(channel);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'all-channel-card';
      card.title = channel.name;
      card.innerHTML = channel.logo
        ? `<img src="${channel.logo}" alt="${channel.name}">`
        : `<span class="channel-fallback">${channel.name}</span>`;
      card.addEventListener('click', () => {
        playChannel(globalIndex);
        closeAllChannels();
      });
      grid.appendChild(card);
    });

    allChannelsListEl.appendChild(wrapper);
  });

  if (!groupsToRender.length) {
    allChannelsListEl.innerHTML = '<p class="subtitle">No channels found for this playlist.</p>';
  }
}

function syncActiveCard() {
  document.querySelectorAll('.channel-card').forEach((card) => {
    card.classList.toggle('active', Number(card.dataset.index) === state.currentIndex);
  });
}

function setHeroDetails(channel) {
  heroTitleEl.textContent = channel ? channel.name : 'Select a channel';
  heroMetaEl.textContent = channel
    ? `${channel.group || 'Channel'} · ${channel.source}`
    : 'Choose a channel from either row below to load the stream in the preview.';
  sourceChipEl.textContent = channel ? channel.source : 'Featured';
}

function attachStream(url) {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  videoEl.pause();
  videoEl.removeAttribute('src');
  videoEl.load();

  if (window.Hls && Hls.isSupported()) {
    state.hls = new Hls();
    state.hls.loadSource(url);
    state.hls.attachMedia(videoEl);
    return state.hls;
  }

  videoEl.src = url;
  return null;
}

function playChannel(index, shouldAutoplay = true) {
  const channel = state.channels[index];
  if (!channel) {
    return;
  }

  state.currentIndex = index;
  setHeroDetails(channel);
  attachStream(channel.url);
  syncActiveCard();

  if (shouldAutoplay) {
    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      });
    }
  }
}

function nextChannel() {
  if (!state.channels.length) {
    return;
  }

  const nextIndex = (state.currentIndex + 1 + state.channels.length) % state.channels.length;
  playChannel(nextIndex);
}

function prevChannel() {
  if (!state.channels.length) {
    return;
  }

  const prevIndex = (state.currentIndex - 1 + state.channels.length) % state.channels.length;
  playChannel(prevIndex);
}

function togglePlay() {
  if (videoEl.paused) {
    videoEl.play().catch(() => {});
  } else {
    videoEl.pause();
  }
}

function handleSearch() {
  state.search = searchInputEl.value.trim();
  renderCollections();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', state.theme === 'light');
}

function openAllChannels(groupName = '') {
  state.viewAllGroup = groupName;
  renderAllChannelsList(groupName);
  if (allChannelsTitleEl) {
    allChannelsTitleEl.textContent = groupName ? `${groupName} Channels` : 'All Channels';
  }
  allChannelsModalEl.hidden = false;
}

function closeAllChannels() {
  allChannelsModalEl.hidden = true;
}

function scrollRail(groupName, direction) {
  const rail = document.querySelector(`.channel-rail[data-group="${groupName}"]`);
  if (!rail) {
    return;
  }

  rail.scrollBy({ left: direction * Math.max(320, rail.clientWidth * 0.8), behavior: 'smooth' });
}

function escapeForAttribute(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function setupRailDrag() {
  document.querySelectorAll('.channel-rail').forEach((rail) => {
    if (rail.dataset.dragReady === 'true') {
      return;
    }

    rail.dataset.dragReady = 'true';

    const dragState = {
      isDown: false,
      isDragging: false,
      startX: 0,
      startScrollLeft: 0,
    };

    const handleMouseMove = (event) => {
      if (!dragState.isDown) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;

      if (!dragState.isDragging && Math.abs(deltaX) < 5) {
        return;
      }

      dragState.isDragging = true;
      rail.scrollLeft = dragState.startScrollLeft - deltaX;
      event.preventDefault();
    };

    const endDrag = (event) => {
      if (!dragState.isDown) {
        return;
      }

      dragState.isDown = false;
      rail.classList.remove('is-dragging');

      if (dragState.isDragging) {
        event.preventDefault();
        event.stopPropagation();
        dragState.isDragging = false;
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', endDrag);
    };

    rail.addEventListener('mousedown', (event) => {
      if (event.button !== 0) {
        return;
      }

      dragState.isDown = true;
      dragState.isDragging = false;
      dragState.startX = event.clientX;
      dragState.startScrollLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', endDrag);
    });

    rail.addEventListener('click', (event) => {
      if (dragState.isDragging) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  });
}

videoEl.addEventListener('play', () => {
  videoEl.muted = false;
});

loadAllPlaylists().catch((error) => {
  collectionsEl.innerHTML = `<p class="subtitle">Failed to load playlists: ${error.message}</p>`;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && allChannelsModalEl && !allChannelsModalEl.hidden) {
    closeAllChannels();
  }
});

window.nextChannel = nextChannel;
window.prevChannel = prevChannel;
window.togglePlay = togglePlay;
window.toggleTheme = toggleTheme;
window.openAllChannels = openAllChannels;
window.closeAllChannels = closeAllChannels;
window.handleSearch = handleSearch;
window.playChannel = playChannel;
window.scrollRail = scrollRail;