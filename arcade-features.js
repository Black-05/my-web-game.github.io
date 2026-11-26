window.ArcadeFeatures = (() => {
  const skins = {
    cosmic: {
      label: '星際藍',
      accent: '#89b4fa',
      player: '#89b4fa',
      enemy: '#f38ba8',
      food: '#f9e2af',
      snake: '#40a878',
      blocks: [null, '#00f0f0', '#3b82f6', '#f97316', '#eab308', '#22c55e', '#a855f7', '#ef4444', '#6c7086']
    },
    ocean: {
      label: '深海青',
      accent: '#89dceb',
      player: '#89dceb',
      enemy: '#f2cdcd',
      food: '#f5c2e7',
      snake: '#40c9a2',
      blocks: [null, '#89dceb', '#74c7ec', '#94e2d5', '#f9e2af', '#a6e3a1', '#cba6f7', '#f38ba8', '#6c7086']
    },
    sunset: {
      label: '夕陽橘',
      accent: '#fab387',
      player: '#fab387',
      enemy: '#f38ba8',
      food: '#f9e2af',
      snake: '#f5a97f',
      blocks: [null, '#f5a97f', '#8aadf4', '#fab387', '#eed49f', '#a6da95', '#c6a0f6', '#ed8796', '#6c7086']
    }
  };
  const leaderboardKey = (game, mode) => `arcade-scores:${game}:${mode}`;

  function getSkin() {
    return skins[localStorage.getItem('arcade-skin') || 'cosmic'] || skins.cosmic;
  }

  function bindSkin(select, onChange) {
    select.value = localStorage.getItem('arcade-skin') || 'cosmic';
    const apply = () => {
      const skin = skins[select.value] || skins.cosmic;
      localStorage.setItem('arcade-skin', select.value);
      document.documentElement.style.setProperty('--arcade-accent', skin.accent);
      document.documentElement.style.setProperty('--arcade-player', skin.player);
      document.documentElement.style.setProperty('--arcade-enemy', skin.enemy);
      document.documentElement.style.setProperty('--arcade-food', skin.food);
      if (onChange) onChange(skin);
    };
    select.addEventListener('change', apply);
    apply();
  }

  function bindSoundToggle(input) {
    input.checked = localStorage.getItem('arcade-sound') !== 'off';
    input.addEventListener('change', () => {
      localStorage.setItem('arcade-sound', input.checked ? 'on' : 'off');
    });
  }

  function playSound(kind) {
    if (localStorage.getItem('arcade-sound') === 'off') return;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies = { clear: 660, hit: 180, collect: 880, shoot: 520, gameover: 130 };
    oscillator.frequency.value = frequencies[kind] || 440;
    oscillator.type = 'triangle';
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener('ended', () => context.close(), { once: true });
  }

  function getScores(game, mode) {
    const raw = localStorage.getItem(leaderboardKey(game, mode));
    if (!raw) return [];
    try {
      const records = JSON.parse(raw);
      if (!Array.isArray(records)) return [];
      return records.filter(record =>
        record && Number.isFinite(record.score) && typeof record.date === 'string'
      ).slice(0, 5);
    } catch (error) {
      console.warn('無法讀取排行榜資料：', error);
      return [];
    }
  }

  function recordScore(game, mode, score) {
    const records = getScores(game, mode);
    records.push({ score, date: new Date().toISOString() });
    records.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
    const topScores = records.slice(0, 5);
    localStorage.setItem(leaderboardKey(game, mode), JSON.stringify(topScores));
    return topScores;
  }

  function renderLeaderboard(list, records) {
    list.replaceChildren();
    if (!records.length) {
      const item = document.createElement('li');
      item.className = 'leaderboard-empty';
      item.textContent = '完成一場遊戲，成績就會出現在這裡。';
      list.append(item);
      return;
    }

    records.forEach((record, index) => {
      const item = document.createElement('li');
      const place = document.createElement('span');
      const score = document.createElement('strong');
      const date = document.createElement('time');
      place.textContent = `${index + 1}.`;
      score.textContent = record.score.toLocaleString();
      date.textContent = new Date(record.date).toLocaleDateString();
      item.append(place, score, date);
      list.append(item);
    });
  }

  return { bindSkin, bindSoundToggle, getSkin, playSound, getScores, recordScore, renderLeaderboard };
})();
