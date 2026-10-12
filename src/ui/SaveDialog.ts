import { readSlots, type SaveChoice } from '../systems/SaveSlots';
import type { RoomId } from '../maps/types';

const AREAS: Record<RoomId, string> = {
  'prison-cell': 'Cela inicial', 'prison-cell-block': 'Bloco de Celas',
  'prison-chain-well': 'Poço das Correntes', 'prison-drowned-galleries': 'Galerias Alagadas',
  'prison-sewers': 'Esgotos do Grilhão', 'prison-root-arena': 'Sumidouro dos Condenados',
  'prison-boss-lair': 'Ossuário do Rei Ceifador', 'prison-service-wing': 'Alas Esquecidas',
  'prison-surgical-theater': 'Anfiteatro Cirúrgico',
};

export function showSaveDialog(newOnly = false): Promise<SaveChoice | null> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'av-modal-overlay';
    overlay.innerHTML = `<form class="av-modal-card av-save-card" role="dialog" aria-modal="true" aria-labelledby="av-save-title">
      <h2 class="av-modal-title" id="av-save-title">SUAS JORNADAS</h2>
      <p class="av-modal-subtitle">Escolha onde o caminho continua.</p>
      <div class="av-save-list" role="group" aria-label="Jornadas salvas"></div>
      <p class="av-save-details" aria-live="polite"></p>
      <div class="av-modal-group av-save-name"><label for="av-save-name">Nome da jornada</label>
      <input id="av-save-name" maxlength="40" placeholder="Ex.: Prisão com os amigos" autocomplete="off" /></div>
      <p class="av-modal-subtitle">No cooperativo, vocês seguem o mundo do anfitrião.</p>
      <div class="av-modal-actions"><button type="button" class="av-btn av-btn-secondary">Cancelar</button>
      <button type="submit" class="av-btn av-btn-primary">Continuar</button></div>
    </form>`;
    const list = overlay.querySelector<HTMLElement>('.av-save-list')!;
    const input = overlay.querySelector('input')!;
    const details = overlay.querySelector<HTMLElement>('.av-save-details')!;
    const nameGroup = overlay.querySelector<HTMLElement>('.av-save-name')!;
    const submit = overlay.querySelector<HTMLButtonElement>('[type=submit]')!;
    const slots = newOnly ? [] : readSlots();
    let selected = slots[0]?.id ?? 'new';
    const buttons: HTMLButtonElement[] = [];
    const addChoice = (id: string, title: string, subtitle: string, badge: string): void => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'av-save-option';
      button.dataset.id = id;
      const icon = document.createElement('span');
      icon.className = 'av-save-icon'; icon.textContent = id === 'new' ? '+' : '◇';
      icon.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span'); copy.className = 'av-save-copy';
      const heading = document.createElement('strong'); heading.textContent = title;
      const sub = document.createElement('small'); sub.textContent = subtitle;
      copy.append(heading, sub);
      const tag = document.createElement('span'); tag.className = 'av-save-tag'; tag.textContent = badge;
      button.append(icon, copy, tag);
      button.addEventListener('click', () => { selected = id; update(); });
      list.append(button); buttons.push(button);
    };
    slots.forEach((slot, index) => addChoice(slot.id, slot.name,
      AREAS[slot.data.checkpoint.roomId] ?? slot.data.checkpoint.roomId, index === 0 ? 'RECENTE' : ''));
    addChoice('new', 'Nova jornada', 'Um novo começo, sem apagar suas jornadas.', '+ NOVA');
    const update = (): void => {
      const slot = slots.find(s => s.id === selected);
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === selected)));
      nameGroup.hidden = Boolean(slot);
      submit.textContent = slot ? 'Continuar neste save' : 'Criar nova jornada';
      const bosses = slot?.data.flags.filter(f => f.startsWith('boss-defeated:')) ?? [];
      details.textContent = slot
        ? `${slot.data.difficulty === 'easy' ? 'Fácil' : 'Normal'}  ·  ${bosses.length} bosses vencidos  ·  ${slot.updatedAt ? new Date(slot.updatedAt).toLocaleDateString('pt-BR') : 'Progresso anterior'}${bosses.includes('boss-defeated:crimson-surgeon') ? '\nCirurgião Rubro já derrotado neste mundo.' : ''}`
        : '';
      details.hidden = !slot;

    };
    let closed = false;
    const finish = (choice: SaveChoice | null): void => {
      if (closed) return;
      closed = true; overlay.remove(); resolve(choice);
    };
    overlay.querySelector('.av-btn-secondary')!.addEventListener('click', () => finish(null));
    overlay.querySelector('form')!.addEventListener('submit', e => {
      e.preventDefault();
      finish(selected === 'new'
        ? { kind: 'new', name: input.value.trim() || 'Nova jornada' }
        : { kind: 'existing', id: selected });
    });
    overlay.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      if (e.key === 'Tab') {
        const fields = Array.from(overlay.querySelectorAll<HTMLElement>('input, button')).filter(el => el.offsetParent !== null);
        const first = fields[0], last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.append(overlay); update(); buttons[0].focus();
  });
}
