const Sequelize = require('sequelize');
const database = require('../config/database');

const Autor = database.define('autor', {
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
    nacionalidade: Sequelize.STRING,
    biografia: Sequelize.TEXT
});

module.exports = Autor;