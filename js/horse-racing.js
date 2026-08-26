(function () {
  'use strict';

  const phaseNames = {
    betting: '下注中',
    racing: '比赛中',
    finished: '已结束',
    canceled: '已取消'
  };

  class HorseRacingView {
    constructor() {
      this.container = document.getElementById('horse-racing-container');
      if (!this.container) return;
      this.launcher = document.getElementById('horse-racing-launcher');
      this.tracks = document.getElementById('horse-tracks');
      this.phase = document.getElementById('horse-phase');
      this.countdown = document.getElementById('horse-countdown');
      this.pot = document.getElementById('horse-pot');
      this.round = document.getElementById('horse-round-id');
      this.commitment = document.getElementById('horse-commitment');
      this.eventStrip = document.getElementById('horse-event-strip').querySelector('span');
      this.form = document.getElementById('horse-bet-form');
      this.select = document.getElementById('horse-select');
      this.amount = document.getElementById('horse-bet-amount');
      this.betButton = document.getElementById('horse-bet-button');
      this.payouts = document.getElementById('horse-payouts');
      this.data = null;
      this.serverOffset = 0;
      this.dismissedRound = null;

      window.addEventListener('horse-racing-event', (event) => this.render(event.detail));
      document.getElementById('horse-close').addEventListener('click', () => this.hide());
      document.getElementById('horse-fullscreen').addEventListener('click', () => this.toggleFullscreen());
      this.launcher.addEventListener('click', () => this.show());
      this.form.addEventListener('submit', (event) => this.submitBet(event));
      this.timer = window.setInterval(() => this.renderCountdown(), 250);
    }

    render(data) {
      if (!data || !Array.isArray(data.horses)) return;
      const isNewRound = !this.data || this.data.roundId !== data.roundId;
      this.data = data;
      this.serverOffset = Number(data.serverTime || Date.now()) - Date.now();
      if (isNewRound) {
        this.dismissedRound = null;
        this.payouts.hidden = true;
        this.payouts.textContent = '';
      }
      if (this.dismissedRound !== data.roundId) this.show();

      this.phase.textContent = phaseNames[data.phase] || data.phase;
      this.pot.textContent = String(data.pot || 0);
      this.round.textContent = '轮次 ' + data.roundId;
      this.commitment.textContent = data.commitment;
      this.commitment.title = data.commitment;
      if (data.seed) this.verifyFairness(data);
      this.betButton.disabled = data.phase !== 'betting';
      this.select.disabled = data.phase !== 'betting';
      this.amount.disabled = data.phase !== 'betting';

      this.renderHorses(data.horses, data.funEvent, data.winnerId);
      this.renderHorseOptions(data.horses);
      if (data.funEvent && data.funEvent.message) {
        this.eventStrip.textContent = data.funEvent.message;
      } else if (data.event === 'race_start') {
        this.eventStrip.textContent = '闸门开启，六匹马同时出发！';
      } else if (data.phase === 'betting') {
        this.eventStrip.textContent = '请选择一匹马下注，截止前可追加同一匹马。';
      } else if (data.phase === 'finished') {
        const winner = data.horses.find((horse) => horse.id === data.winnerId);
        this.eventStrip.textContent = winner ? `${winner.id} 号${winner.name}率先冲线！` : '比赛已经结束。';
      }
      this.renderPayouts(data.payouts || []);
      this.renderCountdown();
    }

    renderHorses(horses, funEvent, winnerId) {
      const existing = new Map(Array.from(this.tracks.children).map((node) => [Number(node.dataset.horseId), node]));
      horses.forEach((horse) => {
        let track = existing.get(horse.id);
        if (!track) {
          track = document.createElement('div');
          track.className = 'horse-track';
          track.dataset.horseId = horse.id;
          track.innerHTML = `
            <div class="horse-label"><strong></strong><span></span></div>
            <div class="horse-lane"><div class="horse-marker" aria-hidden="true">🏇</div></div>
            <div class="horse-progress"></div>`;
          this.tracks.appendChild(track);
        }
        track.querySelector('.horse-label strong').textContent = `${horse.id}号 ${horse.name}`;
        track.querySelector('.horse-label span').textContent = `投注 ${horse.totalBet || 0}`;
        track.querySelector('.horse-progress').textContent = `${Math.min(100, horse.progress || 0)}%`;
        track.querySelector('.horse-marker').style.left = `calc(${Math.min(100, horse.progress || 0)}% - 17px)`;
        track.classList.toggle('winner', horse.id === winnerId);
        track.classList.toggle('event-positive', Boolean(funEvent && funEvent.horseId === horse.id && funEvent.delta > 0));
        track.classList.toggle('event-negative', Boolean(funEvent && funEvent.horseId === horse.id && funEvent.delta < 0));
      });
    }

    renderHorseOptions(horses) {
      const selected = this.select.value;
      const signature = horses.map((horse) => `${horse.id}:${horse.name}`).join('|');
      if (this.select.dataset.signature === signature) return;
      this.select.dataset.signature = signature;
      this.select.innerHTML = '';
      horses.forEach((horse) => {
        const option = document.createElement('option');
        option.value = horse.id;
        option.textContent = `${horse.id}号 ${horse.name}`;
        this.select.appendChild(option);
      });
      if (selected) this.select.value = selected;
    }

    renderPayouts(payouts) {
      if (!payouts.length || !this.data || this.data.phase !== 'finished') return;
      this.payouts.hidden = false;
      this.payouts.textContent = '结算：' + payouts.map((payout) => `${payout.playerName} +${payout.amount}`).join('，');
    }

    renderCountdown() {
      if (!this.data) return;
      if (this.data.phase !== 'betting' || !this.data.deadline) {
        this.countdown.textContent = this.data.phase === 'racing' ? '冲线中' : '--';
        return;
      }
      const remaining = Math.max(0, Number(this.data.deadline) - (Date.now() + this.serverOffset));
      this.countdown.textContent = `${Math.ceil(remaining / 1000)} 秒`;
    }

    async verifyFairness(data) {
      if (!window.crypto || !window.crypto.subtle) {
        this.commitment.textContent = '随机种子已公开';
        this.commitment.title = data.seed;
        return;
      }
      const input = new TextEncoder().encode(`${data.roundId}:${data.seed}`);
      const digest = await window.crypto.subtle.digest('SHA-256', input);
      const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      const verified = actual === data.commitment;
      this.commitment.textContent = verified ? '随机已验证' : '随机验证失败';
      this.commitment.title = `公开种子：${data.seed}`;
    }

    submitBet(event) {
      event.preventDefault();
      const horseId = Number(this.select.value);
      const amount = Number(this.amount.value);
      if (!Number.isInteger(horseId) || !Number.isInteger(amount) || amount < 10) {
        this.eventStrip.textContent = '请选择赛马，并输入不少于 10 的整数积分。';
        return;
      }
      if (!window.wsClient || !window.wsClient.sendMsg(`bet ${horseId} ${amount}`)) {
        this.eventStrip.textContent = '连接尚未恢复，暂时无法下注。';
        return;
      }
      this.eventStrip.textContent = `已提交：${horseId} 号马，${amount} 积分。`;
      const commandInput = document.getElementById('command-input');
      if (commandInput) commandInput.focus();
    }

    toggleFullscreen() {
      this.container.classList.toggle('fullscreen');
      const icon = document.querySelector('#horse-fullscreen i');
      icon.className = this.container.classList.contains('fullscreen') ? 'fa fa-compress' : 'fa fa-expand';
    }

    hide() {
      if (this.data) this.dismissedRound = this.data.roundId;
      this.container.hidden = true;
      this.launcher.hidden = false;
    }

    show() {
      this.container.hidden = false;
      this.launcher.hidden = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.horseRacingView = new HorseRacingView();
  });
})();
