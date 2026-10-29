// Variáveis disponíveis em todas as views.
export function disponibilizarLocals(req, res, next) {
  // o connect-flash apaga a mensagem ao ler.
  res.locals.flash = { sucesso: req.flash('sucesso'), erro: req.flash('erro') };
  res.locals.caminho = req.path;
  res.locals.titulo = 'Delivery Tracker';
  next();
}
