'use strict';

const { Sequelize } = require('sequelize');

const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'shopee.sqlite',
  define: { freezeTableName: true, timestamps: false },
});

const Order = sequelize.import('./model/order');

async function main() {
  let rawData = await Order.findAll();
  rawData = rawData.map(data => data.toJSON());

  // 透過商店索引將訂單分類
  const ordersByShop = _.chain(rawData)
    .groupBy('shopid')
    .map((orders, shopid) => {
      return {
        shopid,
        orders,
      };
    })
    .value();

  // 最終輸出結果
  const result = [];

  // {
  //   "orderid": 31431527100615,
  //   "shopid": 10061,
  //   "userid": 62464559,
  //   "eventTime": "2019-12-31 02:58:48"
  // },

  ordersByShop.some(({ shopid, orders }, index) => {
    console.log(`${index + 1} / ${ordersByShop.length} => shopid: ${shopid}, orders length: ${orders.length}`);

    // 黑名單
    let blackList = [];

    orders.forEach(order => {
      if (!blackList.includes(order.userid)) {
        const starts = moment(order.eventTime);
        const ends = moment(order.eventTime).add(1, 'hours');

        // 區間內訂單
        const priodOrders = orders.filter(o => {
          return moment(o.eventTime).isBetween(starts, ends, undefined, '[]');
        });

        // 區間內訂單不重複會員數
        const users = _.uniqBy(priodOrders, 'userid').map(u => u.userid);

        if (priodOrders.length / users.length >= 3) {
          blackList = _.concat(blackList, users);
        }
      }
    });

    result.push({ shopid, users: _.uniqBy(blackList).join('&') });
  });

  const csv = result.map(r => `${r.shopid},${r.users}`).join('\n');
  fs.writeFile('result.csv', csv, () => {});
}

main();
