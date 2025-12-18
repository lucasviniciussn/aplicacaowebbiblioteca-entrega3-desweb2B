const Sequelize = require('sequelize');
const database = require('../config/database');

const Categoria = database.define('categoria', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    descricao: {
        type: Sequelize.STRING,
        allowNull: false
    },
    codigo: Sequelize.STRING
});

module.exports = Categoria;