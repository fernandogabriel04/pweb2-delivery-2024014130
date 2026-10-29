// Delivery Tracker — ponto de entrada.
// Este arquivo APENAS configura o app (view engine, middlewares) e monta as rotas.
// A regra de negócio fica no Service; o acesso a dados no Repository; a
// composição das dependências (injeção) fica em src/routes/index.js.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import { criarRotas } from './src/routes/index.js';
import { disponibilizarLocals } from './src/middlewares/locals.js';
import { naoEncontrado, tratarErros } from './src/middlewares/erros.js';

try {
  process.loadEnvFile();
} catch {
  /* .env ausente */
}

const raiz = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// View engine EJS com layout padrão (src/views/layouts/base.ejs).
app.set('view engine', 'ejs');
app.set('views', path.join(raiz, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');

app.use(express.static(path.join(raiz, 'public')));
app.use(express.urlencoded({ extended: false })); // corpo dos <form>

// <form method="POST" action="...?_method=PATCH"> vira PATCH.
app.use(methodOverride('_method'));

// Sessão + flash: mensagens que sobrevivem a um redirect (PRG).
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'delivery-tracker-dev',
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(flash());
app.use(disponibilizarLocals);

// Health check exigido pelo contrato de execução (não remova).
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => res.redirect('/entregas'));

// Rotas web (composition root em src/routes).
app.use(criarRotas());

// 404 e erros renderizam HTML.
app.use(naoEncontrado);
app.use(tratarErros);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Delivery Tracker rodando em http://localhost:${PORT}`));
