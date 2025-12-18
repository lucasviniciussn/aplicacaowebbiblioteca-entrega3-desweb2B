const Sequelize = require('sequelize');
const database = require('../config/database');

const Reserva = database.define('reserva', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    dataReserva: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    status: {
        type: Sequelize.STRING,
        defaultValue: 'PENDENTE'
    }
});

module.exports = Reserva;