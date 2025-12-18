const Sequelize = require('sequelize');
const database = require('../config/database');

const Biblioteca = database.define('biblioteca', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    nome: {
        type: Sequelize.STRING,
        allowNull: false
    },
    endereco: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

module.exports = Biblioteca;