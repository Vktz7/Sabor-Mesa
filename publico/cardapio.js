const db = supabase.createClient('https://bfhfmnvkbodyardspgga.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaGZtbnZrYm9keWFyZHNwZ2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODA0NDUsImV4cCI6MjEwNTA1NjQ0NX0.XpefKJ3F1VI3esUilU5BgbCk2bXzvkLaTBw1gofu8rU');
let produtos = [], pedido = [], categoriaAtual = 'todos';
const $ = (s) => document.querySelector(s);
const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function renderizarProdutos() {
  const busca = $('#busca').value.trim().toLowerCase(), faixa = $('#filtro-preco').value, ordem = $('#ordenacao').value;
  let lista = produtos.filter((p) => (categoriaAtual === 'todos' || p.categoria === categoriaAtual) && p.nome.toLowerCase().includes(busca));
  if (faixa === 'ate-30') lista = lista.filter((p) => p.preco <= 30);
  if (faixa === '30-60') lista = lista.filter((p) => p.preco > 30 && p.preco <= 60);
  if (faixa === 'acima-60') lista = lista.filter((p) => p.preco > 60);
  if (ordem === 'menor-preco') lista.sort((a,b) => a.preco - b.preco);
  if (ordem === 'maior-preco') lista.sort((a,b) => b.preco - a.preco);
  if (ordem === 'nome') lista.sort((a,b) => a.nome.localeCompare(b.nome));
  $('#lista-produtos').innerHTML = lista.length ? lista.map((p) => `<article class="produto"><div>${p.imagem_url ? `<img src="${p.imagem_url}" alt="${p.nome}">` : '<div class="produto-sem-imagem">🍽</div>'}</div><div><h3>${p.nome}</h3><p>${p.descricao || 'Sem descrição.'}</p><div class="produto-rodape"><strong>${moeda(p.preco)}</strong><button class="adicionar" data-id="${p.id}" type="button">Adicionar</button></div></div></article>`).join('') : '<div class="estado-vazio-cardapio"><span>🍽</span><h3>Nenhum produto encontrado</h3><p>Tente outra busca ou filtro.</p></div>';
  document.querySelectorAll('.adicionar').forEach((b) => b.onclick = () => adicionarProduto(b.dataset.id));
}
function adicionarProduto(id) { const p = produtos.find((item) => item.id === id), item = pedido.find((i) => i.id === id); if (item) item.quantidade++; else pedido.push({ ...p, quantidade: 1 }); renderizarPedido(); }
function renderizarPedido() {
  const quantidade = pedido.reduce((t, i) => t + i.quantidade, 0); $('#contador-pedido').textContent = quantidade; $('#contador-mobile').textContent = quantidade;
  $('#itens-pedido').innerHTML = pedido.length ? pedido.map((i) => `<div class="item-pedido"><div><h4>${i.nome}</h4><small>${moeda(i.preco)} cada</small></div><div><strong>${moeda(i.preco * i.quantidade)}</strong><div class="controles"><button data-acao="menos" data-id="${i.id}">−</button><span>${i.quantidade}</span><button data-acao="mais" data-id="${i.id}">+</button><button class="remover" data-acao="remover" data-id="${i.id}">×</button></div></div></div>`).join('') : '<div class="pedido-vazio"><span>🛒</span><p>Seu pedido está vazio.</p><small>Adicione itens do cardápio para começar.</small></div>';
  document.querySelectorAll('[data-acao]').forEach((b) => b.onclick = () => alterarItem(b.dataset.id, b.dataset.acao)); atualizarTotais();
}
function alterarItem(id, acao) { const item = pedido.find((i) => i.id === id); if (acao === 'mais') item.quantidade++; if (acao === 'menos') item.quantidade--; if (acao === 'remover' || item.quantidade === 0) pedido = pedido.filter((i) => i.id !== id); renderizarPedido(); }
function atualizarTotais() { const subtotal = pedido.reduce((s, i) => s + i.preco * i.quantidade, 0), taxa = $('#taxa-garcom').checked ? subtotal * .1 : 0; $('#subtotal').textContent = moeda(subtotal); $('#valor-garcom').textContent = moeda(taxa); $('#total').textContent = moeda(subtotal + taxa); }
async function carregarProdutos() { const { data, error } = await db.from('produtos').select('*').eq('disponivel', true); if (error) { $('#lista-produtos').innerHTML = '<p class="erro-carregamento">Não foi possível carregar o cardápio. Configure a base de dados primeiro.</p>'; return; } produtos = data; renderizarProdutos(); }

$('#taxa-garcom').onchange = atualizarTotais;
['#busca', '#filtro-preco', '#ordenacao'].forEach((s) => $(s).addEventListener(s === '#busca' ? 'input' : 'change', renderizarProdutos));
document.querySelectorAll('.categoria').forEach((b) => b.onclick = () => { $('.categoria.ativa').classList.remove('ativa'); b.classList.add('ativa'); categoriaAtual = b.dataset.categoria; renderizarProdutos(); });
$('#limpar-pedido').onclick = () => { pedido = []; renderizarPedido(); };
$('#formulario-cliente').onsubmit = async (e) => { e.preventDefault(); if (!pedido.length) return alert('Adicione pelo menos um produto antes de finalizar o pedido.'); const { data, error } = await db.rpc('criar_pedido', { p_cliente: $('#nome-cliente').value.trim(), p_mesa: $('#numero-mesa').value.trim(), p_observacoes: $('#observacoes').value.trim(), p_garcom: $('#taxa-garcom').checked, p_itens: pedido.map((i) => ({ produto_id: i.id, quantidade: i.quantidade })) }); if (error) return alert('Não foi possível enviar o pedido. Tente novamente.'); $('#conteudo-resumo').innerHTML = `<p>Pedido <strong>#${data.numero}</strong> registrado para <strong>${data.cliente}</strong>, mesa <strong>${data.mesa}</strong>.</p><div class="resumo-itens">${pedido.map((i) => `<div class="resumo-linha"><span>${i.quantidade}× ${i.nome}</span><strong>${moeda(i.preco * i.quantidade)}</strong></div>`).join('')}</div><div class="resumo-linha"><span>Total</span><strong>${moeda(data.total)}</strong></div>`; $('#modal-resumo').hidden = false; pedido = []; $('#formulario-cliente').reset(); renderizarPedido(); };
$('#fechar-modal').onclick = () => { $('#modal-resumo').hidden = true; };
carregarProdutos();
