// IMPORTANDO BIBLIOTECAS E BD
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const app = express();
const db = require('./config/database');

// IMPORTANDO MODELOS
const { 
    database, 
    Livro, 
    Usuario, 
    Biblioteca, 
    Acervo, 
    Autor, 
    Categoria, 
    Reserva,
    Carteira
} = require('./models');

// PORTA LOCAL
const PORT = 3000;

// CONFIGURAÇÃO EXPRESS-HANDLEBARS

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.engine('handlebars', exphbs.engine({
    defaultLayout: false,
    helpers: {
        json: (context) => JSON.stringify(context),
        eq: (a, b) => a === b,
        isIn: (id, array) => array && array.some(item => item.id === id)
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    }
}));
app.set('view engine', 'handlebars');

// Outros
const mapNivel = { 1: 'Leitor/Cliente', 2: 'Funcionário', 3: 'Bibliotecário' };

// ROTA HOME
app.get('/', (req, res) => {
    res.render('home');
});


// 1º CRUD: LIVROS

app.get('/livros', async (req, res) => {
    const livros = await Livro.findAll({ 
        include: [
            { model: Autor, as: 'autores' }, 
            { model: Categoria, as: 'categoria' }
        ] 
    });
    
    const bibliotecas = await Biblioteca.findAll();
    const autores = await Autor.findAll();
    const categorias = await Categoria.findAll();

    const livrosView = livros.map(l => l.toJSON());

    res.render('livros', {
        livros: livrosView,
        bibliotecas: bibliotecas.map(b => b.toJSON()),
        autores: autores.map(a => a.toJSON()),
        categorias: categorias.map(c => c.toJSON())
    });
});

app.get('/livros/:id', async (req, res) => {
    const livro = await Livro.findByPk(req.params.id, {
        include: [
            { model: Autor, as: 'autores' },
            { model: Categoria, as: 'categoria' }
        ]
    });
    
    const bibliotecas = await Biblioteca.findAll();
    const autores = await Autor.findAll();
    const categorias = await Categoria.findAll();
    
    if (livro) {
        res.render('livro_detalhe', { 
            livro: livro.toJSON(), 
            bibliotecas: bibliotecas.map(b => b.toJSON()),
            autores: autores.map(a => a.toJSON()),       
            categorias: categorias.map(c => c.toJSON())  
        });
    } else {
        res.redirect('/livros');
    }
});

app.post('/livros/new', async (req, res) => {
    try {
        const { nome, categoriaId, autoresIds, tags, quantidade_total, idbiblioteca } = req.body;

        const qtdTotal = parseInt(quantidade_total);

        const novoLivro = await Livro.create({
            titulo: nome,
            categoriaId: categoriaId,
            tags: Array.isArray(tags) ? tags.join(',') : tags,
            quantidade_total: qtdTotal
        });

        if (autoresIds) {
            const ids = Array.isArray(autoresIds) ? autoresIds : [autoresIds];
            const autoresSelecionados = await Autor.findAll({ where: { id: ids } });
            await novoLivro.addAutores(autoresSelecionados);
        }

        const copias = [];
        for (let i = 0; i < qtdTotal; i++) {
            copias.push({
                livroId: novoLivro.id,
                bibliotecaId: parseInt(idbiblioteca),
                usuarioId: null
            });
        }
        await Acervo.bulkCreate(copias);

        res.redirect('/livros');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao salvar livro: ' + error.message);
    }
});

app.put('/livros/:id', async (req, res) => {
    try {
        const livro = await Livro.findByPk(req.params.id);
        if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

        const { nome, categoriaId, autoresIds, tags, quantidade_total, idbiblioteca } = req.body;
        
        if (nome) livro.titulo = nome;
        if (categoriaId) livro.categoriaId = categoriaId;
        if (tags) livro.tags = Array.isArray(tags) ? tags.join(',') : tags;

        if (autoresIds) {
            const ids = Array.isArray(autoresIds) ? autoresIds : [autoresIds];
            const autores = await Autor.findAll({ where: { id: ids } });
            await livro.setAutores(autores);
        }

        const oldQuantidade = livro.quantidade_total;
        if (quantidade_total !== undefined) {
            const newQuantidade = parseInt(quantidade_total);
            const diff = newQuantidade - oldQuantidade;
            livro.quantidade_total = newQuantidade;

            if (diff > 0) {
                const libId = idbiblioteca ? parseInt(idbiblioteca) : 1;
                const novasCopias = [];
                for (let i = 0; i < diff; i++) {
                    novasCopias.push({ livroId: livro.id, bibliotecaId: libId, usuarioId: null });
                }
                await Acervo.bulkCreate(novasCopias);
            } else if (diff < 0) {
                const remover = Math.abs(diff);
                const copiasDisponiveis = await Acervo.findAll({
                    where: { livroId: livro.id, usuarioId: null },
                    limit: remover
                });
                if (copiasDisponiveis.length < remover) {
                    return res.status(400).json({ error: 'Não há cópias disponíveis suficientes para remover.' });
                }
                const idsParaRemover = copiasDisponiveis.map(c => c.id);
                await Acervo.destroy({ where: { id: idsParaRemover } });
            }
        }

        await livro.save();
        res.json(livro);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/livros/:id', async (req, res) => {
    try {
        const livro = await Livro.findByPk(req.params.id);
        if (!livro) return res.status(404).json({ error: 'Não encontrado!' });

        await livro.setAutores([]); 
        await Acervo.destroy({ where: { livroId: livro.id } });
        
        await livro.destroy();
        res.json({ mensagem: 'Deletado', livro });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2º CRUD: USUÁRIOS

app.get('/usuarios', async (req, res) => {
    const usuarios = await Usuario.findAll({ include: ['carteira'] });
    const niveisArr = Object.entries(mapNivel).map(([k, v]) => ({ id: k, nome: v }));

    const usuariosView = usuarios.map(u => {
        const userJson = u.toJSON();
        return { 
            ...userJson, 
            nivelLabel: mapNivel[userJson.nivel],
            carteiraCodigo: userJson.carteira ? userJson.carteira.codigo : 'Sem Carteira'
        };
    });

    res.render('usuarios', { usuarios: usuariosView, niveis: niveisArr });
});

app.get('/usuarios/:id', async (req, res) => {
    const usuario = await Usuario.findByPk(req.params.id, { include: ['carteira'] });
    const niveisArr = Object.entries(mapNivel).map(([k, v]) => ({ id: parseInt(k), nome: v }));

    if (usuario) res.render('usuario_detalhe', { usuario: usuario.toJSON(), niveis: niveisArr });
    else res.redirect('/usuarios');
});

app.post('/usuarios', async (req, res) => {
    try {
        const { nome, cpf, idade, nivel, codigoCarteira } = req.body;
        await Usuario.create({ 
            nome, 
            cpf, 
            idade, 
            nivel,
            carteira: {
                codigo: codigoCarteira || `CART-${Math.floor(Math.random() * 10000)}`,
                validade: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // +1 ano
            }
        }, {
            include: ['carteira']
        });

        // [AJUSTE] Redirect
        res.redirect('/usuarios');
    } catch (e) {
        res.status(400).send('Erro ao criar usuário: ' + e.message);
    }
});

app.put('/usuarios/:id', async (req, res) => {
    try {
        await Usuario.update(req.body, { where: { id: req.params.id } });
        const atualizado = await Usuario.findByPk(req.params.id);
        res.json(atualizado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    try {
        const result = await Usuario.destroy({ where: { id: req.params.id } });
        if (result) res.json({ mensagem: 'Deletado' });
        else res.status(404).json({ error: 'Não encontrado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3º CRUD: BIBLIOTECAS

app.get('/bibliotecas', async (req, res) => {
    const bibliotecas = await Biblioteca.findAll();
    res.render('bibliotecas', { bibliotecas: bibliotecas.map(b => b.toJSON()) });
});

app.get('/bibliotecas/:id', async (req, res) => {
    const biblioteca = await Biblioteca.findByPk(req.params.id);
    if (biblioteca) res.render('biblioteca_detalhe', { biblioteca: biblioteca.toJSON() });
    else res.redirect('/bibliotecas');
});

app.post('/bibliotecas', async (req, res) => {
    try {
        const { cnpj, acervo, cep } = req.body;
        await Biblioteca.create({ cnpj, acervo_total: acervo, cep });
        res.redirect('/bibliotecas');
    } catch (e) {
        res.status(400).send(e.message);
    }
});

app.put('/bibliotecas/:id', async (req, res) => {
    try {
        await Biblioteca.update(req.body, { where: { id: req.params.id } });
        const b = await Biblioteca.findByPk(req.params.id);
        res.json(b);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/bibliotecas/:id', async (req, res) => {
    try {
        const r = await Biblioteca.destroy({ where: { id: req.params.id } });
        if (r) res.json({ mensagem: 'Deletada' });
        else res.status(404).json({ error: 'Não encontrada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4º CRUD: ACERVO (ITENS FÍSICOS)

app.get('/acervo', async (req, res) => {

    const acervo = await Acervo.findAll({ 
        include: [
            { model: Livro, as: 'livro' }, 
            { model: Biblioteca, as: 'biblioteca' }, 
            { model: Usuario, as: 'usuario' }
        ] 
    });
    const livros = await Livro.findAll();
    const bibliotecas = await Biblioteca.findAll();

    const acervoView = acervo.map(item => {
        const i = item.toJSON();
        return {
            ...i,
            nomeLivro: i.livro ? i.livro.titulo : 'Desconhecido',
            cnpjBiblioteca: i.biblioteca ? i.biblioteca.cnpj : 'Desconhecido',
            status: i.usuarioId ? `Emprestado (User ${i.usuarioId})` : 'Disponível'
        };
    });

    res.render('acervo', {
        acervo: acervoView,
        livros: livros.map(l => l.toJSON()),
        bibliotecas: bibliotecas.map(b => b.toJSON())
    });
});

app.get('/acervo/:id', async (req, res) => {
    try {
        const item = await Acervo.findByPk(req.params.id, { 
            include: [
                { model: Livro, as: 'livro' }, 
                { model: Biblioteca, as: 'biblioteca' }, 
                { model: Usuario, as: 'usuario' }
            ] 
        });
        const livros = await Livro.findAll();
        const bibliotecas = await Biblioteca.findAll();

        if (item) {
            const i = item.toJSON();
            const itemName = i.livro ? i.livro.titulo : 'Item #' + i.id;
            res.render('acervo_detalhe', {
                item: i,
                itemName,
                livros: livros.map(l => l.toJSON()),
                bibliotecas: bibliotecas.map(b => b.toJSON())
            });
        } else {
            res.redirect('/acervo');
        }
    } catch (error) {
        res.status(500).send("Erro ao buscar detalhes");
    }
});

app.post('/acervo', async (req, res) => {
    try {
        const { livroId, bibliotecaId, quantidade } = req.body;
        const qtd = parseInt(quantidade) || 1;
        
        const novasCopias = [];
        for (let i = 0; i < qtd; i++) {
            novasCopias.push({ livroId, bibliotecaId, usuarioId: null });
        }
        await Acervo.bulkCreate(novasCopias);

        const livro = await Livro.findByPk(livroId);
        if (livro) {
            livro.quantidade_total += qtd;
            await livro.save();
        }
        // [AJUSTE] Redirect
        res.redirect('/acervo');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.put('/acervo/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { livroId, bibliotecaId, idUsuario } = req.body;
        const copia = await Acervo.findByPk(id);
        
        if (!copia) return res.status(404).json({ error: 'Não encontrado' });

        if (livroId && parseInt(livroId) !== copia.livroId) {
            const livroAntigo = await Livro.findByPk(copia.livroId);
            const livroNovo = await Livro.findByPk(livroId);
            if (livroAntigo) { livroAntigo.quantidade_total -= 1; await livroAntigo.save(); }
            if (livroNovo) { livroNovo.quantidade_total += 1; await livroNovo.save(); }
            copia.livroId = parseInt(livroId);
        }

        if (bibliotecaId) copia.bibliotecaId = parseInt(bibliotecaId);

        if (idUsuario !== undefined) {
            const uId = parseInt(idUsuario);
            if (uId <= 0 || isNaN(uId)) {
                copia.usuarioId = null;
            } else {
                const userExists = await Usuario.findByPk(uId);
                if (!userExists) return res.status(404).json({ error: 'Usuário não existe' });
                copia.usuarioId = uId;
            }
        }
        await copia.save();
        res.json(copia);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/acervo/:id', async (req, res) => {
    try {
        const copia = await Acervo.findByPk(req.params.id);
        if (!copia) return res.status(404).json({ error: 'Não encontrado' });
        
        const livroId = copia.livroId;
        await copia.destroy();

        const livro = await Livro.findByPk(livroId);
        if (livro && livro.quantidade_total > 0) {
            livro.quantidade_total -= 1;
            await livro.save();
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5º CRUD: AUTORES

app.get('/autores', async (req, res) => {
    try {
        const autores = await Autor.findAll();
        res.render('autores', { autores: autores.map(a => a.toJSON()) });
    } catch (e) {
        res.status(500).send("Erro: " + e.message);
    }
});

app.get('/autores/:id', async (req, res) => {
    const autor = await Autor.findByPk(req.params.id);
    if (autor) res.render('autor_detalhe', { autor: autor.toJSON() });
    else res.redirect('/autores');
});

app.post('/autores', async (req, res) => {
    try {
        const { nome, nacionalidade, biografia } = req.body;
        await Autor.create({ nome, nacionalidade, biografia });
        res.redirect('/autores');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.put('/autores/:id', async (req, res) => {
    try {
        const autor = await Autor.findByPk(req.params.id);
        if (!autor) return res.status(404).json({ error: 'Autor não encontrado' });
        await autor.update(req.body);
        res.json(autor);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/autores/:id', async (req, res) => {
    try {
        const autor = await Autor.findByPk(req.params.id, { include: [{ model: Livro, as: 'livros' }] });
        
        if (autor && autor.livros && autor.livros.length > 0) {
            return res.status(400).json({ error: 'Não é possível excluir autor que possui livros vinculados.' });
        }

        if (!autor) return res.status(404).json({ error: 'Autor não encontrado' });
        await autor.destroy();
        res.json({ message: 'Autor removido com sucesso' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6º CRUD: CATEGORIAS

app.get('/categorias', async (req, res) => {
    try {
        const categorias = await Categoria.findAll();
        res.render('categoria', { categorias: categorias.map(c => c.toJSON()) }); 
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.get('/categorias/:id', async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id);
        if (categoria) {
            res.render('categoria_detalhe', { categoria: categoria.toJSON() });
        } else {
            res.redirect('/categorias');
        }
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post('/categorias', async (req, res) => {
    try {
        const { descricao, codigo } = req.body;
        await Categoria.create({ descricao, codigo });
        res.redirect('/categorias');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.put('/categorias/:id', async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id);
        if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada' });
        await categoria.update(req.body);
        res.json(categoria);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/categorias/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const livrosNaCategoria = await Livro.findOne({ where: { categoriaId: id } });
        if (livrosNaCategoria) {
            return res.status(400).json({ error: 'Existem livros vinculados a esta categoria.' });
        }
        const categoria = await Categoria.findByPk(id);
        if (!categoria) return res.status(404).json({ error: 'Categoria não encontrada' });
        await categoria.destroy();
        res.json({ message: 'Categoria removida' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 7º CRUD: RESERVAS

app.get('/reservas', async (req, res) => {
    try {
        const { status } = req.query;
        const whereClause = status ? { status } : {};
        
        const reservas = await Reserva.findAll({ 
            where: whereClause, 
            include: [
                { model: Usuario, as: 'usuario' }, 
                { model: Livro, as: 'livroReservado' }
            ] 
        });
        

        const reservasView = reservas.map(r => {
            const json = r.toJSON();
            return {
                ...json,
                nomeUsuario: json.usuario ? json.usuario.nome : 'N/A',
                tituloLivro: json.livroReservado ? json.livroReservado.titulo : 'N/A'
            };
        });

        res.render('reservas', { reservas: reservasView });
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.post('/reservas', async (req, res) => {
    try {
        const { usuarioId, livroId } = req.body;
        const usuario = await Usuario.findByPk(usuarioId);
        const livro = await Livro.findByPk(livroId);

        if (!usuario || !livro) {
            return res.status(404).send('Usuário ou Livro não encontrados.');
        }

        await Reserva.create({
            usuarioId,
            livroId,
            dataReserva: new Date(),
            status: 'PENDENTE'
        });

        res.redirect('/reservas');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

app.put('/reservas/:id', async (req, res) => {
    try {
        const reserva = await Reserva.findByPk(req.params.id);
        if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada' });

        const { status } = req.body;
        if (status) {
            if (['PENDENTE', 'ATENDIDA', 'CANCELADA'].includes(status)) {
                reserva.status = status;
            } else {
                return res.status(400).json({ error: 'Status inválido' });
            }
        }
        await reserva.save();
        res.json(reserva);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/reservas/:id', async (req, res) => {
    try {
        const reserva = await Reserva.findByPk(req.params.id);
        if (!reserva) return res.status(404).json({ error: 'Reserva não encontrada' });
        await reserva.destroy();
        res.json({ message: 'Reserva removida' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// INICIALIZAÇÃO DO SERVIDOR E BANCO DE DADOS

db.sync({ force: true }).then(() => {
    console.log('Banco de dados sincronizado!');
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});