// Shop supply icons, drawn with Stick Army's pen in a 44x44 box. Classic script; load before game.js.
// game.js passes its pen kit once; each icon is then called with the icon canvas context as G.
var StickArmyIcons = function (kit) {
  'use strict';
  var L = kit.L, SP = kit.SP, Ci = kit.Ci, ink = kit.ink, stick = kit.stick, dogTag = kit.dogTag, hat = kit.hat, tube = kit.tube;
  var INK = kit.INK, INK2 = kit.INK2, RED = kit.RED, BLUE = kit.BLUE, HAT = kit.HAT, PAPER = kit.PAPER;
  return {
    fire: function (G) {
      [[8, 34], [17, 26], [26, 18]].forEach(function (p) { G.beginPath(); L(p[0], p[1], p[0] + 8, p[1] - 8, 0.4); ink(INK, 3.4); G.stroke(); });
      G.beginPath(); L(4, 26, 10, 20, 0.3); L(13, 38, 19, 32, 0.3); L(29, 32, 35, 26, 0.3); ink(INK2, 1.4); G.stroke();
    },
    cool: function (G) {
      G.beginPath(); SP([15, 30, 15, 9, 17, 6, 21, 6, 23, 9, 23, 30], false, 0.3); ink(INK, 2.2); G.stroke();
      G.beginPath(); G.arc(19, 35, 5.5, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill(); G.beginPath(); Ci(19, 35, 5.5, 0.3); ink(INK, 2.2); G.stroke();
      G.beginPath(); L(19, 30, 19, 21, 0.2); ink(BLUE, 3); G.stroke();
      G.beginPath(); for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; L(34 - Math.cos(a) * 7, 13 - Math.sin(a) * 7, 34 + Math.cos(a) * 7, 13 + Math.sin(a) * 7, 0.3); } ink(BLUE, 2); G.stroke();
    },
    slot: function (G) {
      G.save(); G.translate(14, 6); G.scale(0.85, 0.85); stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], BLUE, 3); G.restore();
      G.beginPath(); L(33, 14, 33, 28, 0.3); L(26, 21, 40, 21, 0.3); ink(INK, 3); G.stroke();
    },
    repair: function (G) {
      G.beginPath(); L(4, 22, 32, 22, 0.4); L(4, 30, 32, 30, 0.4); L(4, 38, 32, 38, 0.4); L(4, 22, 4, 38, 0.4); L(32, 22, 32, 38, 0.4);
      L(13, 22, 13, 30, 0.3); L(23, 22, 23, 30, 0.3); L(9, 30, 9, 38, 0.3); L(19, 30, 19, 38, 0.3); L(28, 30, 28, 38, 0.3); ink(INK, 1.8); G.stroke();
      G.beginPath(); L(22, 19, 35, 7, 0.3); ink(INK, 2.4); G.stroke();
      G.beginPath(); L(31, 3, 40, 11, 0.3); ink(INK, 5); G.stroke();
    },
    mat: function (G) {
      G.beginPath(); L(10, 27, 8, 37, 0.3); L(34, 27, 36, 37, 0.3); ink(INK, 2); G.stroke();
      G.beginPath(); G.moveTo(9, 27); G.quadraticCurveTo(22, 33, 35, 27); ink(INK, 3); G.stroke();
      G.beginPath(); L(2, 16, 15, 16, 0.3); L(2, 16, 6, 12, 0.2); L(2, 16, 6, 20, 0.2); L(29, 16, 42, 16, 0.3); L(42, 16, 38, 12, 0.2); L(42, 16, 38, 20, 0.2); ink(BLUE, 2.2); G.stroke();
    },
    aim: function (G) {
      G.beginPath(); Ci(22, 22, 12, 0.4); L(22, 4, 22, 13, 0.3); L(22, 31, 22, 40, 0.3); L(4, 22, 13, 22, 0.3); L(31, 22, 40, 22, 0.3); ink(INK, 2.2); G.stroke();
      G.beginPath(); G.arc(22, 22, 2.5, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
    },
    sandbags: function (G) {
      [[13, 32], [31, 32], [22, 21]].forEach(function (p) {
        G.beginPath(); SP([p[0] - 10, p[1], p[0] - 8, p[1] - 6, p[0] + 8, p[1] - 6, p[0] + 10, p[1], p[0] + 8, p[1] + 6, p[0] - 8, p[1] + 6], true, 0.4);
        G.fillStyle = '#efe6cf'; G.fill(); ink(INK, 2); G.stroke();
        G.beginPath(); L(p[0] - 3, p[1] - 2, p[0] + 3, p[1] + 2, 0.2); ink(INK2, 1.2); G.stroke();
      });
    },
    wire: function (G) {
      G.beginPath(); L(6, 10, 6, 38, 0.3); L(38, 10, 38, 38, 0.3); ink(INK, 2.4); G.stroke();
      G.beginPath(); SP([6, 18, 13, 24, 20, 17, 27, 24, 34, 17, 38, 21], false, 0.4); SP([6, 30, 13, 36, 20, 29, 27, 36, 34, 29, 38, 33], false, 0.4); ink(INK2, 1.6); G.stroke();
      G.beginPath(); [[13, 24], [27, 24], [20, 29], [34, 29]].forEach(function (p) { L(p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3, 0.2); L(p[0] - 3, p[1] + 3, p[0] + 3, p[1] - 3, 0.2); }); ink(INK, 1.8); G.stroke();
    },
    double: function (G) {
      G.save(); G.translate(18, 33); G.rotate(-0.8);
      [-4.5, 4.5].forEach(function (o) { G.fillStyle = PAPER; G.fillRect(0, o - 3, 22, 6); G.beginPath(); L(0, o - 3, 22, o - 3, 0.3); L(0, o + 3, 22, o + 3, 0.3); L(22, o - 3.5, 22, o + 3.5, 0.2); ink(INK, 2); G.stroke(); });
      G.restore();
      G.beginPath(); G.moveTo(6, 39); G.arc(18, 39, 12, Math.PI, 0); G.closePath(); G.fillStyle = PAPER; G.fill(); ink(INK, 2.2); G.stroke();
    },
    tramp: function (G) {
      [11, 33].forEach(function (cx) {
        G.beginPath(); L(cx - 8, 28, cx - 9, 38, 0.3); L(cx + 8, 28, cx + 9, 38, 0.3); ink(INK, 1.8); G.stroke();
        G.beginPath(); G.moveTo(cx - 9, 28); G.quadraticCurveTo(cx, 33, cx + 9, 28); ink(INK, 2.6); G.stroke();
        G.fillStyle = BLUE; G.fillRect(cx - 11, 25, 4, 4); G.fillRect(cx + 7, 25, 4, 4);
      });
      G.beginPath(); L(33, 6, 33, 18, 0.3); L(27, 12, 39, 12, 0.3); ink(INK, 2.4); G.stroke();
    },
    spread: function (G) {
      G.beginPath(); [-0.45, 0, 0.45].forEach(function (a) { L(22, 39, 22 + Math.sin(a) * 27, 39 - Math.cos(a) * 27, 0.3); }); ink(INK, 2.4); G.stroke();
      [-0.45, 0, 0.45].forEach(function (a) { G.beginPath(); G.arc(22 + Math.sin(a) * 30, 39 - Math.cos(a) * 30, 2.4, 0, Math.PI * 2); G.fillStyle = INK; G.fill(); });
    },
    flak: function (G) {
      G.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; L(22 + Math.cos(a) * 7, 22 + Math.sin(a) * 7, 22 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, 0.4); } ink(INK, 2.2); G.stroke();
      G.beginPath(); G.arc(22, 22, 5, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    },
    rockets: function (G) {
      G.save(); G.translate(23, 21); G.rotate(-0.8);
      G.beginPath(); G.moveTo(-12, -4); G.lineTo(8, -4); G.lineTo(15, 0); G.lineTo(8, 4); G.lineTo(-12, 4); G.closePath(); G.fillStyle = PAPER; G.fill();
      G.beginPath(); L(-12, -4, 8, -4, 0.3); L(8, -4, 15, 0, 0.2); L(15, 0, 8, 4, 0.2); L(8, 4, -12, 4, 0.3); L(-12, 4, -12, -4, 0.2); L(-12, -4, -16, -9, 0.2); L(-12, 4, -16, 9, 0.2); ink(INK, 2.2); G.stroke();
      G.beginPath(); SP([-14, 0, -18, -3, -22, 0, -18, 3, -14, 0], false, 0.6); ink(RED, 2); G.stroke();
      G.restore();
    },
    pierce: function (G) {
      G.beginPath(); Ci(16, 28, 6, 0.3); Ci(28, 16, 6, 0.3); ink(INK2, 2); G.stroke();
      G.beginPath(); L(5, 39, 39, 5, 0.3); L(39, 5, 31, 6, 0.2); L(39, 5, 38, 13, 0.2); ink(INK, 2.6); G.stroke();
    },
    mines: function (G) {
      G.beginPath(); L(3, 35, 41, 35, 0.3); ink(INK, 2); G.stroke();
      G.beginPath(); G.moveTo(10, 35); G.arc(22, 35, 12, Math.PI, 0); G.closePath(); G.fillStyle = '#d9d2c2'; G.fill(); ink(INK, 2.2); G.stroke();
      G.beginPath(); L(22, 23, 22, 17, 0.2); L(13, 27, 9, 23, 0.2); L(31, 27, 35, 23, 0.2); ink(INK, 2); G.stroke();
      G.beginPath(); G.arc(22, 15, 2.6, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    },
    auto: function (G) {
      // A little gun on a lattice tower.
      G.beginPath(); L(13, 41, 18, 19, 0.3); L(31, 41, 26, 19, 0.3); L(14, 36, 29, 26, 0.2); L(30, 36, 15, 26, 0.2); ink(INK, 1.8); G.stroke();
      G.beginPath(); L(12, 19, 32, 19, 0.3); ink(INK, 2.6); G.stroke();
      G.save(); G.translate(22, 14); G.rotate(-0.6); G.fillStyle = PAPER; G.fillRect(0, -2.5, 15, 5); G.beginPath(); L(0, -2.5, 15, -2.5, 0.2); L(0, 2.5, 15, 2.5, 0.2); L(15, -3, 15, 3, 0.2); ink(INK, 1.8); G.stroke(); G.restore();
      G.beginPath(); G.moveTo(16, 18); G.arc(22, 18, 6, Math.PI, 0); G.closePath(); G.fillStyle = BLUE; G.fill(); ink(INK, 1.8); G.stroke();
    },
    catcher: function (G) {
      G.beginPath(); L(5, 33, 4, 41, 0.3); L(21, 33, 22, 41, 0.3); ink(INK, 1.8); G.stroke();
      G.beginPath(); G.moveTo(4, 33); G.quadraticCurveTo(13, 38, 22, 33); ink(INK, 2.6); G.stroke();
      G.setLineDash([2, 3]); G.beginPath(); G.moveTo(13, 31); G.quadraticCurveTo(22, 2, 32, 17); ink(BLUE, 1.8); G.stroke(); G.setLineDash([]);
      G.save(); G.translate(35, 17); G.scale(0.6, 0.6); stick(0, 0, [-9, 6, 9, 6, -5, 33, 5, 33], BLUE, 3.4); G.restore();
    },
    pizza: function (G) {
      G.beginPath(); G.moveTo(6, 10); G.lineTo(38, 10); G.lineTo(22, 40); G.closePath(); G.fillStyle = '#f6d58a'; G.fill();
      G.beginPath(); L(6, 10, 38, 10, 0.4); L(38, 10, 22, 40, 0.4); L(22, 40, 6, 10, 0.4); ink(INK, 2.2); G.stroke();
      G.beginPath(); G.moveTo(5, 9); G.quadraticCurveTo(22, 3, 39, 9); ink('#9b6a15', 3.4); G.stroke();
      [[16, 16], [27, 17], [22, 27]].forEach(function (p) { G.beginPath(); G.arc(p[0], p[1], 3, 0, Math.PI * 2); G.fillStyle = RED; G.fill(); });
    },
    trench: function (G) {
      G.beginPath(); L(2, 30, 12, 30, 0.3); G.moveTo(12, 30); G.quadraticCurveTo(22, 42, 32, 30); L(32, 30, 42, 30, 0.3); ink(INK, 2.2); G.stroke();
      [[10, 24], [22, 22], [34, 24]].forEach(function (p) {
        G.beginPath(); SP([p[0] - 6, p[1], p[0] - 4, p[1] - 4, p[0] + 4, p[1] - 4, p[0] + 6, p[1], p[0] + 4, p[1] + 3, p[0] - 4, p[1] + 3], true, 0.3);
        G.fillStyle = '#e7dcc0'; G.fill(); ink(INK, 1.8); G.stroke();
      });
      G.save(); G.translate(22, 30); G.scale(0.45, 0.45); stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], BLUE, 4); G.restore();
    },
    helmet: function (G) {
      G.beginPath(); G.moveTo(7, 30); G.quadraticCurveTo(8, 10, 22, 10); G.quadraticCurveTo(36, 10, 37, 30); G.closePath(); G.fillStyle = '#7d8a64'; G.fill(); ink(INK, 2.2); G.stroke();
      G.beginPath(); L(2, 31, 42, 31, 0.4); ink(INK, 3); G.stroke();
      G.beginPath(); L(33, 6, 33, 16, 0.3); L(28, 11, 38, 11, 0.3); ink(BLUE, 2.4); G.stroke();
    },
    strike: function (G) {
      G.beginPath(); SP([4, 16, 26, 16, 32, 9, 36, 9, 33, 16, 40, 16, 40, 20, 33, 20, 36, 27, 32, 27, 26, 20, 4, 20], true, 0.3);
      G.fillStyle = PAPER; G.fill(); ink(INK, 2); G.stroke();
      G.beginPath(); G.arc(20, 18, 2.6, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
      [[12, 30], [20, 34], [28, 38]].forEach(function (b) { G.beginPath(); G.ellipse(b[0], b[1], 2.4, 3.6, 0, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill(); });
    },
    hospital: function (G) {
      G.beginPath(); G.moveTo(4, 38); G.lineTo(22, 10); G.lineTo(40, 38); G.closePath(); G.fillStyle = PAPER; G.fill();
      G.beginPath(); SP([4, 38, 22, 10, 40, 38], false, 0.4); L(2, 38, 42, 38, 0.3); L(22, 10, 18, 38, 0.2); L(22, 10, 26, 38, 0.2); ink(INK, 2.2); G.stroke();
      G.fillStyle = RED; G.fillRect(19.5, 21, 5, 13); G.fillRect(15.5, 25, 13, 5);
    },
    fighter: function (G) {
      // A small fast plane, nose left, guns blazing.
      G.beginPath(); SP([11, 21, 30, 21, 35, 14, 39, 14, 36, 21, 42, 21, 42, 24, 36, 24, 39, 31, 35, 31, 30, 24, 11, 24], true, 0.3);
      G.fillStyle = PAPER; G.fill(); ink(INK, 2); G.stroke();
      G.beginPath(); G.arc(25, 22.5, 2.4, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
      G.beginPath(); L(2, 20, 8, 21.5, 0.2); L(2, 25, 8, 23.5, 0.2); ink(HAT, 2.4); G.stroke();
    },
    // Hiring roles: a blue recruit with the tool of his trade.
    'hire-rifle': function (G) {
      G.save(); G.translate(16, 6); G.scale(0.85, 0.85); stick(0, 0, [8, 12, 13, 8, -5, 33, 5, 33], BLUE, 3); G.restore();
      G.beginPath(); L(19, 16, 31, 2, 0.3); ink(INK, 2.6); G.stroke();
    },
    'hire-engineer': function (G) {
      G.save(); G.translate(17, 9); G.scale(0.85, 0.85); stick(0, 0, [-7, 19, 12, 9, -5, 33, 5, 33], BLUE, 3); hat(0, 0); G.restore();
      G.beginPath(); L(27, 16, 35, 7, 0.3); ink(INK, 2.4); G.stroke();
      G.beginPath(); L(32, 3, 39, 10, 0.3); ink(INK, 4.5); G.stroke();
    },
    'hire-bazooka': function (G) {
      G.save(); G.translate(20, 8); G.scale(0.85, 0.85); tube(-14, 14, 18, -2); stick(0, 0, [-6, 13, 8, 9, -5, 33, 5, 33], BLUE, 3); G.restore();
    },
    'hire-sniper': function (G) {
      G.save(); G.translate(13, 8); G.scale(0.85, 0.85); stick(0, 0, [10, 14, 16, 12, -5, 33, 5, 33], BLUE, 3); G.restore();
      G.beginPath(); L(15, 19, 41, 9, 0.3); ink(INK, 2.4); G.stroke();
      G.beginPath(); Ci(29, 11, 3, 0.2); ink(INK, 1.8); G.stroke();
    },
    'hire-medic': function (G) {
      G.beginPath(); Ci(22, 22, 16, 0.4); ink(INK, 2); G.stroke();
      G.fillStyle = RED; G.fillRect(18, 11, 8, 22); G.fillRect(11, 18, 22, 8);
    },
    fallback: function (G) { G.beginPath(); Ci(22, 22, 12, 0.5); L(22, 14, 22, 26, 0.3); ink(INK, 2.4); G.stroke(); G.beginPath(); G.arc(22, 31, 1.8, 0, Math.PI * 2); G.fillStyle = INK; G.fill(); }
  };
};
