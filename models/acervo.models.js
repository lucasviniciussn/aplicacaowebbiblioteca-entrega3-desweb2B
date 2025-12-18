const Sequelize = require('sequelize');
const database = require('../config/database');

const Acervo = database.define('acervo', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: Sequelize.STRING, 
        defaultValue: 'Disponível'
    }
});

module.exports = Acervo;