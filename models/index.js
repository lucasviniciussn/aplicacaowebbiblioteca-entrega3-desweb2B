const { Sequelize } = require('sequelize');
const database = require('../config/database');

const Livro = require('./livro.models');
const Usuario = require('./usuario.models');
const Biblioteca = require('./biblioteca.models');
const Acervo = require('./acervo.models');
const Autor = require('./autor.models');
const Categoria = require('./categoria.models');
const Reserva = require('./reserva.models');
const Carteira = require('./carteira.models'); 

// 1. ASSOCIAÇÃO UM-PARA-UM

Usuario.hasOne(Carteira, { foreignKey: 'usuarioId', as: 'carteira' });
Carteira.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

// 2. ASSOCIAÇÃO MUITOS-PARA-MUITOS

Livro.belongsToMany(Autor, { 
    through: 'LivroAutores',
    foreignKey: 'livroId', 
    as: 'autores'
});

Autor.belongsToMany(Livro, { 
    through: 'LivroAutores', 
    foreignKey: 'autorId', 
    as: 'livros' 
});

// 3. OUTRAS ASSOCIAÇÕES

Categoria.hasMany(Livro, { as: 'livros', foreignKey: 'categoriaId' });
Livro.belongsTo(Categoria, { as: 'categoria', foreignKey: 'categoriaId' });

Livro.hasMany(Acervo, { as: 'copias', foreignKey: 'livroId' });
Acervo.belongsTo(Livro, { as: 'livro', foreignKey: 'livroId' });

Biblioteca.hasMany(Acervo, { as: 'itens', foreignKey: 'bibliotecaId' });
Acervo.belongsTo(Biblioteca, { as: 'biblioteca', foreignKey: 'bibliotecaId' });

Usuario.hasMany(Acervo, { as: 'emprestimos', foreignKey: 'usuarioId' });
Acervo.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });

Usuario.hasMany(Reserva, { as: 'reservas', foreignKey: 'usuarioId' });
Reserva.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });

Livro.hasMany(Reserva, { as: 'reservasLivro', foreignKey: 'livroId' });
Reserva.belongsTo(Livro, { as: 'livroReservado', foreignKey: 'livroId' });

// Exporta tudo, inclusive a Carteira
module.exports = {
    database, Livro, Usuario, Biblioteca, Acervo, Autor, Categoria, Reserva, Carteira

};
