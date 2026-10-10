import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSlots, writeSlot } from '../src/systems/SaveSlots.ts';
const memory = () => {
  const entries = new Map();
  return { getItem: k => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
};
const data = { flags: ['boss-defeated:crimson-surgeon'], items: [], rings: [],
  checkpoint: { roomId: 'prison-service-wing', entryId: 'theater' },
  weaponId: 'unarmed', bonusAmpoules: 2, difficulty: 'normal' };

test('migra o save anterior uma vez e preserva o backup e as flags', () => {
  const storage = memory();
  const original = JSON.stringify(data);
  storage.setItem('ashen-veil:save:v1', original);
  assert.deepEqual(readSlots(storage)[0].data, data);
  assert.equal(readSlots(storage).length, 1);
  assert.equal(storage.getItem('ashen-veil:save:v1'), original);
});

test('novo mundo não herda boss derrotado nem sobrescreve outro save', () => {
  const storage = memory();
  writeSlot({ id: 'solo', name: 'Minha jornada', updatedAt: 10, data }, storage);
  writeSlot({ id: 'coop', name: 'Sala dos amigos', updatedAt: 20, data: { ...data, flags: [] } }, storage);
  const slots = readSlots(storage);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].name, 'Sala dos amigos');
  assert.deepEqual(slots[0].data.flags, []);
  assert.deepEqual(slots[1].data.flags, data.flags);
  writeSlot({ ...slots[1], updatedAt: 30 }, storage);
  assert.equal(readSlots(storage).length, 2);
  assert.equal(readSlots(storage)[0].id, 'solo');
});

test('save inválido e armazenamento indisponível não derrubam a listagem', () => {
  const storage = memory();
  storage.setItem('ashen-veil:saves:v2', '[null, {"id":"invalido"}]');
  assert.deepEqual(readSlots(storage), []);
  assert.deepEqual(readSlots({ getItem() { throw new Error('blocked'); } }), []);
});

test('falha ao gravar mantém os dados anteriores', () => {
  const storage = memory();
  writeSlot({ id: 'solo', name: 'Solo', updatedAt: 1, data }, storage);
  const blocked = { getItem: storage.getItem, setItem() { throw new Error('quota'); } };
  assert.throws(() => writeSlot({ id: 'new', name: 'Novo', updatedAt: 2, data }, blocked));
  assert.equal(readSlots(storage)[0].id, 'solo');
});
