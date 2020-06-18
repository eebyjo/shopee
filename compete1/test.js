'use strict';

const { Sequelize } = require('sequelize');

const _ = require('lodash');
const fs = require('fs');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'shopee.sqlite',
  define: { freezeTableName: true, timestamps: false },
});

const Order = sequelize.import('./model/order');

async function main() {
  console.log(new Date());
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
    const blackList = [];
    // console.log(`${index + 1} / ${ordersByShop.length} => shopid: ${shopid}, orders length: ${orders.length}`);

    if (orders.length < 3) {
      // 訂單小於 3 的店家，視為正常店家
      result.push({ shopid, users: 0 });
    } else {
      if (orders.length === _.uniqBy(orders, 'userid').length) {
        // 訂單數與不重複購買人數相同，視為正常店家
        result.push({ shopid, users: 0 });
      } else {
        const ordersByUserList = _.chain(orders)
          .groupBy('userid')
          .map((orders, userid) => {
            return {
              userid,
              orders: orders.map(order => new Date(order.eventTime).getTime()),
            };
          })
          .value();

        // 找出所有在商家內訂單數大於等於 3 的人
        const checkList = ordersByUserList.filter(ordersByUser => ordersByUser.orders.length >= 3);

        if (checkList.length > 0) {
          // 遍歷所有候選人
          checkList.forEach(({ userid, orders }) => {
            orders.some(order => {
              if (orders.filter(o => o >= order && o <= (order + 3600000)).length >= 3) {
                blackList.push(userid);
                return true;
              }
              return false;
            });
          });
        }
        result.push({ shopid, users: blackList.join('&') || 0 });
      }
    }
  });

  const csv = result.map(r => `${r.shopid},${r.users}`).join('\n');
  fs.writeFile('result.csv', csv, () => {
    console.log(new Date());
  });
}

main();
