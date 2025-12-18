const Sequelize = require('sequelize');
const database = require('../config/database');

const Carteira = database.define('carteira', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    codigo: {
        type: Sequelize.STRING,
        allowNull: false
    },
    validade: Sequelize.DATEONLY
});

module.exports = Carteira;