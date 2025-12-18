const Sequelize = require('sequelize');
const database = require('../config/database');

const Biblioteca = database.define('biblioteca', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    cnpj: {
        type: Sequelize.STRING,
        allowNull: false
    },
    cep: {
        type: Sequelize.STRING
    },
    acervo_total: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    }
});

module.exports = Biblioteca;