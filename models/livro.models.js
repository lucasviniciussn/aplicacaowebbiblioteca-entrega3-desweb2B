const Sequelize = require('sequelize');
const database = require('../config/database');

const Livro = database.define('livro', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    titulo: {
        type: Sequelize.STRING,
        allowNull: false
    },
    isbn: {
        type: Sequelize.STRING
    },
    ano: {
        type: Sequelize.INTEGER
    },
    quantidade_total: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    }
});

module.exports = Livro;