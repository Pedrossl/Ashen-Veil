// Modal estilizado com o visual dark fantasy de Ashen Veil para entrada de dados da sala.

export type CreateRoomData = {
  playerName: string;
  password?: string;
};

export type JoinRoomData = {
  roomId: string;
  playerName: string;
  password?: string;
};

export function showCreateRoomModal(): Promise<CreateRoomData | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'av-modal-overlay';

    overlay.innerHTML = `
      <div class="av-modal-card">
        <h2 class="av-modal-title">CRIAR SALA COOPERATIVA</h2>
        <p class="av-modal-subtitle">Dois viajantes sob o mesmo véu</p>

        <div class="av-modal-group">
          <label for="av-host-name">Seu Nome</label>
          <input id="av-host-name" type="text" maxlength="16" value="Viajante 1" placeholder="Nome do personagem" autocomplete="off" />
        </div>

        <div class="av-modal-group">
          <label for="av-room-pass">Senha da Sala (Opcional)</label>
          <input id="av-room-pass" type="password" maxlength="20" placeholder="Deixe em branco para sala aberta" autocomplete="off" />
        </div>

        <div class="av-modal-actions">
          <button id="av-btn-cancel" class="av-btn av-btn-secondary">Cancelar</button>
          <button id="av-btn-confirm" class="av-btn av-btn-primary">Criar Sala</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const nameInput = overlay.querySelector<HTMLInputElement>('#av-host-name');
    const passInput = overlay.querySelector<HTMLInputElement>('#av-room-pass');
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('#av-btn-confirm');
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('#av-btn-cancel');

    nameInput?.focus();
    nameInput?.select();

    const cleanup = (result: CreateRoomData | null) => {
      overlay.classList.add('av-modal-closing');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    confirmBtn?.addEventListener('click', () => {
      const playerName = nameInput?.value.trim() || 'Viajante 1';
      const password = passInput?.value.trim() || undefined;
      cleanup({ playerName, password });
    });

    cancelBtn?.addEventListener('click', () => cleanup(null));

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn?.click();
      } else if (e.key === 'Escape') {
        cleanup(null);
      }
    });
  });
}

export function showJoinRoomModal(): Promise<JoinRoomData | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'av-modal-overlay';

    overlay.innerHTML = `
      <div class="av-modal-card">
        <h2 class="av-modal-title">ENTRAR EM SALA</h2>
        <p class="av-modal-subtitle">Junte-se a outro viajante nas sombras</p>

        <div class="av-modal-group">
          <label for="av-room-id">Código da Sala</label>
          <input id="av-room-id" type="text" maxlength="32" placeholder="Cole o código do anfitrião" style="letter-spacing: 1px;" autocomplete="off" spellcheck="false" />
        </div>

        <div class="av-modal-group">
          <label for="av-guest-name">Seu Nome</label>
          <input id="av-guest-name" type="text" maxlength="16" value="Viajante 2" placeholder="Nome do personagem" autocomplete="off" />
        </div>

        <div class="av-modal-group">
          <label for="av-room-pass">Senha da Sala</label>
          <input id="av-room-pass" type="password" maxlength="20" placeholder="Senha definida pelo anfitrião" autocomplete="off" />
        </div>

        <div class="av-modal-actions">
          <button id="av-btn-cancel" class="av-btn av-btn-secondary">Cancelar</button>
          <button id="av-btn-confirm" class="av-btn av-btn-primary">Entrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const idInput = overlay.querySelector<HTMLInputElement>('#av-room-id');
    const nameInput = overlay.querySelector<HTMLInputElement>('#av-guest-name');
    const passInput = overlay.querySelector<HTMLInputElement>('#av-room-pass');
    const confirmBtn = overlay.querySelector<HTMLButtonElement>('#av-btn-confirm');
    const cancelBtn = overlay.querySelector<HTMLButtonElement>('#av-btn-cancel');

    idInput?.focus();

    const cleanup = (result: JoinRoomData | null) => {
      overlay.classList.add('av-modal-closing');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    confirmBtn?.addEventListener('click', () => {
      // O código do Colyseus diferencia maiúsculas de minúsculas: vai como está.
      const roomId = idInput?.value.trim() || '';
      if (!roomId) {
        idInput?.focus();
        return;
      }
      const playerName = nameInput?.value.trim() || 'Viajante 2';
      const password = passInput?.value.trim() || undefined;
      cleanup({ roomId, playerName, password });
    });

    cancelBtn?.addEventListener('click', () => cleanup(null));

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn?.click();
      } else if (e.key === 'Escape') {
        cleanup(null);
      }
    });
  });
}
