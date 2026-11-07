// 開幕這一章：把劇情節點、清單畫面、動作組起來。從標題畫面開始。
import nodes from './nodes.js';
import actions from './actions.js';
import home from './screens-home.js';
import booking from './screens-booking.js';
import road from './screens-road.js';

export default {
  id: 'opening',
  start: 'title',
  nodes,
  actions,
  screens: { ...home, ...booking, ...road },
};
