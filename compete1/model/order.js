'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('brush_order', {
    orderid: { type: DataTypes, primaryKey: true },
    shopid: { type: DataTypes },
    userid: { type: DataTypes },
    eventTime: { type: DataTypes.DATE, field: 'event_time' },
  });
};
