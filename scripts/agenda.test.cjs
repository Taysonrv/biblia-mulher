const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the TypeScript services directly without adding a test framework.
function loadService(name, mocks = {}, cache = new Map()) {
  const filename = path.resolve(path.dirname(require.resolve('../package.json')), 'src/services', name + '.ts');
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, Date, Math, Set, Error,
    require: request => {
      if (Object.hasOwn(mocks, request)) return mocks[request];
      if (request.startsWith('./')) return loadService(request.slice(2), mocks, cache);
      throw new Error('Unexpected dependency in test: ' + request);
    },
  }, { filename });
  return module.exports;
}
const model = loadService('agenda-model');
const { createAgendaRepository, decodeAgenda } = loadService('agenda-repository');
const NOW = new Date(2030, 0, 10, 12).getTime();
function draft(overrides = {}) {
  return { title: 'Pregação de domingo', category: 'Pregação', date: '20/01/2030', time: '19:30',
    location: 'Igreja', notes: 'Preparar Salmos 23', reminderMinutes: 30, ...overrides };
}
function setup() {
  const state = { raw: null, failWrite: false, failCancel: false, notifications: new Map(), operations: [] };
  const storage = {
    async getItem() { return state.raw; },
    async setItem(_key, value) {
      if (state.failWrite) throw new Error('Disk full');
      state.raw = value;
    },
  };
  const reminders = {
    async schedule(event) {
      state.operations.push('schedule:' + event.id);
      if (event.reminderMinutes === null) return 'off';
      state.notifications.set(model.agendaNotificationId(event.id), event);
      return 'scheduled';
    },
    async cancel(id) {
      state.operations.push('cancel:' + id);
      if (state.failCancel) throw new Error('Native cancel failed');
      state.notifications.delete(model.agendaNotificationId(id));
    },
  };
  return { state, storage, reminders, repo: createAgendaRepository(storage, reminders, () => NOW) };
}
test('strict local dates reject rollover, invalid time and elapsed events', () => {
  assert.throws(() => model.parseLocalDateTime('31/02/2030', '19:30'));
  assert.throws(() => model.parseLocalDateTime('29/02/2030', '19:30'));
  assert.throws(() => model.parseLocalDateTime('20/01/2030', '24:00'));
  assert.throws(() => model.parseLocalDateTime('20/01/2030', '19:60'));
  assert.throws(() => model.validateDraft(draft({ date: '01/01/2030' }), NOW));
  assert.throws(() => model.validateDraft(draft({ title: '   ' }), NOW));
  assert.throws(() => model.validateDraft(draft({ reminderMinutes: 999 }), NOW));
  assert.throws(() => model.validateDraft(draft({ category: 'Invalid' }), NOW));
  const leap = model.parseLocalDateTime('29/02/2032', '19:30');
  assert.equal(model.dateInput(leap), '29/02/2032');
  assert.equal(model.timeInput(leap), '19:30');
});
test('linked sermon is persisted, editable, removable and compatible with older events', async () => {
  const { repo, state } = setup();
  const linked = await repo.save(draft({ sermonId: 'sermon-123' }));
  assert.equal(linked.sermonId, 'sermon-123');
  assert.equal((await repo.list())[0].sermonId, 'sermon-123');
  const updated = await repo.save(draft({ sermonId: null }), linked.id);
  assert.equal(updated.sermonId, undefined);
  assert.equal((await repo.list())[0].sermonId, undefined);
  assert.equal(decodeAgenda(state.raw).length, 1);
  assert.throws(() => model.validateDraft(draft({ sermonId: 'invalid/id' }), NOW));
});
test('calendar grid includes leap day and full weeks at month boundaries', () => {
  const days = model.monthDays(new Date(2032, 1, 1));
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days.length % 7, 0);
  assert.equal(days.find(Boolean).getDay(), days.indexOf(days.find(Boolean)));
  assert.equal(model.localDateKey(new Date(2030, 0, 1, 0, 5)), '2030-01-01');
});
test('save, restart and edit persist one event and replace one notification', async () => {
  const { state, storage, reminders, repo } = setup();
  const event = await repo.save(draft());
  assert.equal(state.notifications.size, 1);
  assert.equal(model.reminderAt(event), Date.parse(event.startsAt) - 30 * 60000);
  const restarted = createAgendaRepository(storage, reminders, () => NOW);
  assert.equal((await restarted.list())[0].title, draft().title);
  await restarted.save(draft({ title: 'Novo tema', time: '20:00' }), event.id);
  assert.equal((await restarted.list()).length, 1);
  assert.equal((await restarted.list())[0].title, 'Novo tema');
  assert.equal(state.notifications.size, 1);
  await restarted.save(draft({ reminderMinutes: null }), event.id);
  assert.equal(state.notifications.size, 0);
  assert.equal((await restarted.list())[0].reminderState, 'off');
});
test('deleting cancels the reminder and removes the stored event', async () => {
  const { state, repo } = setup();
  const event = await repo.save(draft());
  await repo.remove(event.id);
  assert.equal((await repo.list()).length, 0);
  assert.equal(state.notifications.size, 0);
});
test('failed writes roll back native edits and preserve the previous record', async () => {
  const { state, repo } = setup();
  const event = await repo.save(draft());
  const before = state.raw;
  state.failWrite = true;
  await assert.rejects(repo.save(draft({ title: 'Unsaved edit' }), event.id));
  assert.equal(state.raw, before);
  assert.equal(state.notifications.size, 1);
  assert.equal(state.notifications.get(model.agendaNotificationId(event.id)).title, event.title);
  await assert.rejects(repo.remove(event.id));
  assert.equal(state.raw, before);
  assert.equal(state.notifications.size, 1);
});
test('failed initial writes leave no orphan reminder', async () => {
  const { state, repo } = setup();
  state.failWrite = true;
  await assert.rejects(repo.save(draft()));
  assert.equal(state.raw, null);
  assert.equal(state.notifications.size, 0);
});
test('failed cancellation leaves original data and reminder intact', async () => {
  const { state, repo } = setup();
  const event = await repo.save(draft());
  const before = state.raw;
  state.failCancel = true;
  await assert.rejects(repo.save(draft({ title: 'Do not overwrite' }), event.id));
  await assert.rejects(repo.remove(event.id));
  assert.equal(state.raw, before);
  assert.equal(state.notifications.size, 1);
});
test('concurrent saves serialize and retain both events in chronological order', async () => {
  const { repo } = setup();
  await Promise.all([repo.save(draft({ date: '22/01/2030' })), repo.save(draft({ date: '21/01/2030' }))]);
  const events = await repo.list();
  assert.equal(events.length, 2);
  assert.ok(Date.parse(events[0].startsAt) < Date.parse(events[1].startsAt));
  assert.notEqual(events[0].id, events[1].id);
});
test('corrupt or unsupported stores are preserved and prevent overwriting', async () => {
  const { state, repo } = setup();
  for (const raw of ['{invalid', '{"version":2,"events":[]}', '{"version":1,"events":[{}]}']) {
    state.raw = raw;
    await assert.rejects(repo.list());
    await assert.rejects(repo.save(draft()));
    assert.equal(state.raw, raw);
    assert.equal(state.notifications.size, 0);
  }
  assert.equal(decodeAgenda(null).length, 0);
});
function nativeSetup(platform = 'android', permission = { granted: true, canAskAgain: true }) {
  const calls = [];
  let handler;
  const notifications = {
    AndroidImportance: { HIGH: 4 },
    IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler(value) { handler = value; },
    async setNotificationChannelAsync(id) { calls.push(['channel', id]); },
    async getPermissionsAsync() { calls.push(['permission']); return permission; },
    async requestPermissionsAsync() { calls.push(['request']); return permission; },
    async scheduleNotificationAsync(value) { calls.push(['schedule', value]); return value.identifier; },
    async cancelScheduledNotificationAsync(id) { calls.push(['cancel', id]); },
  };
  const { agendaReminders } = loadService('agenda-reminders.native', {
    'react-native': { Platform: { OS: platform } }, './local-notifications.native': notifications,
  });
  return { calls, notifications, agendaReminders, get handler() { return handler; } };
}
function nativeEvent(overrides = {}) {
  return { id: 'test-event', title: 'Culto', category: 'Culto', location: 'Igreja', notes: '',
    startsAt: new Date(Date.now() + 3600000).toISOString(), reminderMinutes: 10, reminderState: 'off', ...overrides };
}
test('Android creates channel before permission and schedules one dated reminder', async () => {
  const native = nativeSetup();
  const event = nativeEvent();
  assert.equal(await native.agendaReminders.schedule(event), 'scheduled');
  assert.equal(native.calls[0][0], 'channel');
  const request = native.calls.find(call => call[0] === 'schedule')[1];
  assert.equal(request.identifier, model.agendaNotificationId(event.id));
  assert.equal(request.content.sound, undefined);
  assert.equal(request.trigger.channelId, 'ministerial-agenda-v2');
  assert.equal(request.trigger.type, 'date');
  assert.equal(request.trigger.date.getTime(), model.reminderAt(event));
  assert.equal(request.content.data.eventId, event.id);
  await native.agendaReminders.cancel(event.id);
  assert.equal(native.calls.at(-1)[1], request.identifier);
  const foreground = await native.handler.handleNotification({ request: { content: request.content } });
  assert.equal(foreground.shouldShowBanner, true);
});
test('denied notification permission still lets the repository save the event', async () => {
  const native = nativeSetup('android', { granted: false, canAskAgain: true });
  const { storage, state } = setup();
  const repo = createAgendaRepository(storage, native.agendaReminders, () => NOW);
  const event = await repo.save(draft({ date: '20/01/2099' }));
  assert.equal(event.reminderState, 'denied');
  assert.equal((await repo.list()).length, 1);
  assert.ok(state.raw);
  assert.ok(native.calls.some(call => call[0] === 'request'));
  assert.ok(!native.calls.some(call => call[0] === 'schedule'));
});
test('disabled or elapsed reminders do not request permissions or schedule', async () => {
  const native = nativeSetup();
  assert.equal(await native.agendaReminders.schedule(nativeEvent({ reminderMinutes: null })), 'off');
  assert.equal(await native.agendaReminders.schedule(nativeEvent({
    startsAt: new Date(Date.now() + 60000).toISOString(), reminderMinutes: 30,
  })), 'past');
  assert.equal(native.calls.length, 0);
});
test('iOS provisional permission works; native failure is reported as unscheduled', async () => {
  const native = nativeSetup('ios', { granted: false, canAskAgain: false, ios: { status: 3 } });
  assert.equal(await native.agendaReminders.schedule(nativeEvent()), 'scheduled');
  assert.ok(!native.calls.some(call => call[0] === 'channel' || call[0] === 'request'));
  native.notifications.scheduleNotificationAsync = async () => { throw new Error('Native scheduling unavailable'); };
  assert.equal(await native.agendaReminders.schedule(nativeEvent()), 'failed');
});
test('missing Android notification channels provider is reported as unavailable without scheduling', async () => {
  const native = nativeSetup();
  native.notifications.setNotificationChannelAsync = async () => {
    throw new Error("Call to function 'ExpoNotificationChannelManager.setNotificationChannelAsync' has been rejected. Caused by: java.lang.NullPointerException: null cannot be cast to non-null type expo.modules.notifications.notifications.channels.NotificationsChannelsProvider");
  };
  assert.equal(await native.agendaReminders.schedule(nativeEvent()), 'unavailable');
  assert.ok(!native.calls.some(call => call[0] === 'schedule'));
});
test('web keeps reminders explicitly unavailable rather than claiming success', async () => {
  const { agendaReminders } = loadService('agenda-reminders');
  assert.equal(await agendaReminders.schedule(nativeEvent()), 'unavailable');
  assert.equal(await agendaReminders.schedule(nativeEvent({ reminderMinutes: null })), 'off');
});
