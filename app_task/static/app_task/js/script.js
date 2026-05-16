/* ══════════════════════════════════════════
   TASK PAI D'ÉGUA — script.js
   Organização:
   1. Estado global
   2. Inicialização + API
   3. Renderização de tarefas
   4. Pesquisa
   5. Controle de modais
   6. Modal Adicionar / Editar
   7. Modal Ver Detalhes
   8. Modal Remover
   9. Concluir tarefa
   10. Modal de Sucesso
══════════════════════════════════════════ */

/* ── 1. ESTADO GLOBAL ── */
let tarefas = [];
let editandoId  = null;
let removendoId = null;

// Normaliza e verifica se um status representa tarefa concluída
function statusIsConcluido(status) {
  if (!status) return false;
  try {
    const s = String(status).toLowerCase().normalize('NFD');
    // remove diacríticos e verifica substring 'conclu' (cobre 'concluído' e 'concluido')
    const semAcento = s.replace(/[\u0300-\u036f]/g, '');
    return semAcento.includes('conclu');
  } catch (e) {
    return String(status).toLowerCase().includes('conclu');
  }
}

/* ── 2. INICIALIZAÇÃO ── */
document.addEventListener("DOMContentLoaded", async () => {
  await carregarTarefas();
  renderizarCalendario();
  renderizar();
  registrarFecharOverlay();
});

/* ── FUNÇÕES DA API ── */

function redirecionarSeNaoAutorizado(res) {
  if (res.status === 401) {
    window.location.href = '/entrar/';
    return true;
  }
  return false;
}

async function carregarTarefas() {
  const res = await fetch('/api/tarefas/');
  if (redirecionarSeNaoAutorizado(res)) return;
  tarefas = await res.json();
}

async function salvarTarefa() {
  const titulo    = document.getElementById("inputTitulo").value.trim();
  const descricao = document.getElementById("inputDescricao").value.trim();
  const data      = document.getElementById("inputData").value;
  const status    = document.getElementById("inputStatus").value;

  if (!titulo) { document.getElementById("inputTitulo").focus(); return; }
  if (!data)   { document.getElementById("inputData").focus();   return; }

  let res;
  if (editandoId !== null) {
    res = await fetch(`/api/tarefas/${editandoId}/editar/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descricao, data, status }),
    });
    if (redirecionarSeNaoAutorizado(res)) return;
    mostrarSucesso("✏️", "TAREFA EDITADA", "Alterações salvas com sucesso!");
  } else {
    res = await fetch('/api/tarefas/criar/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descricao, data, status }),
    });
    if (redirecionarSeNaoAutorizado(res)) return;
    mostrarSucesso("✅", "TAREFA ADICIONADA", "Nova tarefa criada com sucesso!");
  }

  fecharModal("overlayForm");
  await carregarTarefas();
  renderizar();
  renderizarCalendario();
}

async function confirmarRemocao() {
  const res = await fetch(`/api/tarefas/${removendoId}/deletar/`, { method: 'DELETE' });
  if (redirecionarSeNaoAutorizado(res)) return;
  removendoId = null;
  fecharModal("overlayConfirm");
  await carregarTarefas();
  renderizar();
  renderizarCalendario();
  mostrarSucesso("🗑️", "REMOVIDA!", "A tarefa foi removida com sucesso.");
}

async function concluirTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;
  const res = await fetch(`/api/tarefas/${id}/concluir/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Concluído' }),
  });
  if (redirecionarSeNaoAutorizado(res)) return;
  await carregarTarefas();
  renderizar();
  mostrarSucesso("🎉", "CONCLUÍDA!", "Boa! Tarefa marcada como concluída.");
}

/* ── CALENDÁRIO INTERATIVO ── */
const MESES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

let calAno          = new Date().getFullYear();
let calMes          = new Date().getMonth();
let dataSelecionada = null;

function mudarMes(direcao) {
  calMes += direcao;
  if (calMes < 0)  { calMes = 11; calAno--; }
  if (calMes > 11) { calMes = 0;  calAno++; }
  renderizarCalendario();
}

function irParaHoje() {
  const agora = new Date();
  calAno = agora.getFullYear();
  calMes = agora.getMonth();
  // Seleciona o dia de hoje e atualiza calendário + lista filtrada
  dataSelecionada = toISO(agora.getFullYear(), agora.getMonth(), agora.getDate());
  renderizarCalendario();
  renderizar(tarefas.filter(t => t.data === dataSelecionada));
}

function limparFiltroData() {
  dataSelecionada = null;
  renderizarCalendario();
  renderizar();
}

function selecionarDia(dataISO) {
  dataSelecionada = (dataSelecionada === dataISO) ? null : dataISO;
  renderizarCalendario();
  if (dataSelecionada) {
    renderizar(tarefas.filter(t => t.data === dataSelecionada));
  } else {
    renderizar();
  }
}

function renderizarCalendario() {
  document.getElementById("calTitulo").textContent = `${MESES_NOMES[calMes]} ${calAno}`;

  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  const hoje    = new Date();
  const hojeISO = toISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const datasComTarefa = new Set(tarefas.map(t => t.data));

  const primeiroDia = new Date(calAno, calMes, 1).getDay();
  const diasNoMes   = new Date(calAno, calMes + 1, 0).getDate();
  const diasMesAnt  = new Date(calAno, calMes, 0).getDate();

  for (let i = primeiroDia - 1; i >= 0; i--) {
    const dia     = diasMesAnt - i;
    const mesAnts = calMes === 0 ? 11 : calMes - 1;
    const anoAnts = calMes === 0 ? calAno - 1 : calAno;
    grid.appendChild(criarCelula(dia, toISO(anoAnts, mesAnts, dia), ["outro-mes"], datasComTarefa, hojeISO));
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataISO = toISO(calAno, calMes, dia);
    const classes = [];
    if (dataISO === hojeISO)         classes.push("hoje");
    if (dataISO === dataSelecionada) classes.push("selecionado");
    grid.appendChild(criarCelula(dia, dataISO, classes, datasComTarefa, hojeISO));
  }

  const total = primeiroDia + diasNoMes;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let dia = 1; dia <= resto; dia++) {
    const mesProx = calMes === 11 ? 0  : calMes + 1;
    const anoProx = calMes === 11 ? calAno + 1 : calAno;
    grid.appendChild(criarCelula(dia, toISO(anoProx, mesProx, dia), ["outro-mes"], datasComTarefa, hojeISO));
  }
}

function criarCelula(dia, dataISO, classes, datasComTarefa, hojeISO) {
  const cel = document.createElement("div");
  cel.className = "cal-dia " + classes.join(" ");
  if (datasComTarefa.has(dataISO)) cel.classList.add("tem-tarefa");
  cel.textContent = dia;
  cel.onclick = () => selecionarDia(dataISO);
  return cel;
}

function toISO(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function registrarFecharOverlay() {
  document.querySelectorAll(".overlay").forEach(overlay => {
    overlay.addEventListener("click", (evento) => {
      if (evento.target === overlay) {
        overlay.classList.remove("ativo");
      }
    });
  });
}

/* ── 3. RENDERIZAÇÃO DE TAREFAS ── */

function renderizar(lista) {
  const container = document.getElementById("listaTarefas");
  const containerConcluidas = document.getElementById("listaTarefasConcluidas");

  if (!lista) lista = tarefas;

  // DEBUG: inspecionar lista recebida
  ('renderizar() recebido lista:', lista);

  const tarefasConcluidas = lista.filter(t => statusIsConcluido(t.status));
  const tarefasAtivas = lista.filter(t => !statusIsConcluido(t.status));

  if (tarefasAtivas.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.9rem;">Nenhuma tarefa encontrada.</p>';
  } else {
    container.innerHTML = tarefasAtivas.map(criarCardTarefa).join("");
  }

  if (tarefasConcluidas.length === 0) {
    containerConcluidas.innerHTML = '<p style="color:var(--muted);font-size:.9rem;">Nenhuma tarefa concluída.</p>';
  } else {
    containerConcluidas.innerHTML = tarefasConcluidas.map(criarCardTarefa).join("");
  }
}

function criarCardTarefa(t) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataTarefa    = new Date(t.data + "T00:00:00");
  const dataFormatada = dataTarefa.toLocaleDateString("pt-BR");

  let classeStatus = "pendente";
  let rotuloStatus = t.status;

  if (statusIsConcluido(t.status)) {
    classeStatus = "concluido";
  } else if (dataTarefa < hoje) {
    classeStatus = "atrasado";
    rotuloStatus = "⚠ Atrasada";
  }

  const mostrarConcluir = !statusIsConcluido(t.status);

  return `
    <div class="tarefa" id="tarefa-${t.id}">
      <h3>${t.titulo}</h3>
      <p>${t.descricao || "—"}</p>
      <p><strong>Data:</strong> ${dataFormatada}</p>
      <p class="status ${classeStatus}">Status: ${rotuloStatus}</p>
      <div class="botoes-tarefa">
        <button class="editar"   onclick="abrirModalEditar(${t.id})">Editar</button>
        <button class="remover"  onclick="abrirModalRemover(${t.id})">Remover</button>
        ${mostrarConcluir ? `<button class="concluir" onclick="concluirTarefa(${t.id})">Concluir</button>` : ''}
        ${mostrarConcluir ? `<button class="ver"      onclick="abrirModalVer(${t.id})">Ver</button>` : ''}
      </div>
    </div>
  `;
}

/* ── 4. PESQUISA ── */

function filtrarTarefas() {
  const termo = document.getElementById("campoPesquisa").value.toLowerCase();

  const resultado = tarefas.filter(t =>
    t.titulo.toLowerCase().includes(termo) ||
    (t.descricao || "").toLowerCase().includes(termo)
  );

  renderizar(resultado);
}

/* ── 5. CONTROLE DE MODAIS ── */

function abrirModal(id) {
  document.getElementById(id).classList.add("ativo");
}

function fecharModal(id) {
  document.getElementById(id).classList.remove("ativo");
}

/* ── 6. MODAL ADICIONAR / EDITAR ── */

function abrirModalAdicionar() {
  editandoId = null;
  document.getElementById("modalFormTitulo").textContent = "ADICIONAR TAREFA";
  document.getElementById("inputTitulo").value    = "";
  document.getElementById("inputDescricao").value = "";
  document.getElementById("inputData").value      = "";
  document.getElementById("inputStatus").value    = "Pendente";
  abrirModal("overlayForm");
}

function abrirModalEditar(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  editandoId = id;
  document.getElementById("modalFormTitulo").textContent = "EDITAR TAREFA";
  document.getElementById("inputTitulo").value    = tarefa.titulo;
  document.getElementById("inputDescricao").value = tarefa.descricao || "";
  document.getElementById("inputData").value      = tarefa.data;
  document.getElementById("inputStatus").value    = tarefa.status;

  abrirModal("overlayForm");
}

/* ── 7. MODAL VER DETALHES ── */

function abrirModalVer(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  const dataTarefa = new Date(tarefa.data + "T00:00:00");

  document.getElementById("verTitulo").textContent    = tarefa.titulo;
  document.getElementById("verDescricao").textContent = tarefa.descricao || "—";
  document.getElementById("verData").textContent      = dataTarefa.toLocaleDateString("pt-BR");
  document.getElementById("verStatus").textContent    = tarefa.status;

  abrirModal("overlayVer");
}

/* ── 8. MODAL REMOVER ── */

function abrirModalRemover(id) {
  removendoId = id;
  abrirModal("overlayConfirm");
}

/* ── 9. CONCLUIR TAREFA — veja função concluirTarefa() na seção API acima ── */

/* ── 10. MODAL DE SUCESSO ── */

function mostrarSucesso(icone, titulo, msg) {
  document.getElementById("sucessoIcone").textContent  = icone;
  document.getElementById("sucessoTitulo").textContent = titulo;
  document.getElementById("sucessoMsg").textContent    = msg;

  abrirModal("overlaySucesso");
  setTimeout(() => fecharModal("overlaySucesso"), 2200);
}