// The mouse on every floor (owner, Oct 13): the left button fires and keeps firing while held, the right one slashes.
(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const box = () => c.getBoundingClientRect();
  const mouse = (type, button) => c.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', button, bubbles: true, cancelable: true, clientX: box().left + box().width / 2, clientY: box().top + box().height / 2 }));
  try {
    for (const stage of ['floor13', 'elevator', 'roof']) {
      RUN.force = 42; newRun(null, stage); RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0;
      mouse('pointerdown', 0);
      check(shooting() && input.shoot > 0, stage + ': the left button fires');
      mouse('pointerup', 0);
      check(!shooting(), stage + ': letting go stops');
      input.slash = 0; mouse('pointerdown', 2); mouse('pointerup', 2);
      check(input.slash > 0, stage + ': the right button slashes');
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); c.dispatchEvent(menu);
      check(menu.defaultPrevented, stage + ': no context menu in play');
    }
  } finally { clearHeld(); input.jump = input.slash = input.shoot = 0; travelHook = null; checkpoint = null; RUN.force = null; newRun(); setState('title'); showCard('title'); }
})();
