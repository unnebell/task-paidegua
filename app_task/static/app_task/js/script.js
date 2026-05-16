/* ══════════════════════════════════════════
   TASK PAI D'ÉGUA — script.js
   Organização:
   1. Estado global
   2. Inicialização
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

let proximoId  = 2;
let editandoId = null;
let removendoId = null;

/* ── 2. INICIALIZAÇÃO ── */
document.addEventListener("DOMContentLoaded", () => {
  renderizarCalendario();
  renderizar();
  registrarFecharOverlay();
});

/* ── CALENDÁRIO INTERATIVO ── */
const MESES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

let calAno          = new Date().getFullYear();
let calMes          = new Date().getMonth(); // 0–11
let dataSelecionada = null;                  // "YYYY-MM-DD" ou null

/** Navega para o mês anterior (-1) ou próximo (+1). */
function mudarMes(direcao) {
  calMes += direcao;
  if (calMes < 0)  { calMes = 11; calAno--; }
  if (calMes > 11) { calMes = 0;  calAno++; }
  renderizarCalendario();
}

/** Volta o calendário para o mês atual. */
function irParaHoje() {
  const agora = new Date();
  calAno = agora.getFullYear();
  calMes = agora.getMonth();
  renderizarCalendario();
}

/** Remove o filtro de data e exibe todas as tarefas. */
function limparFiltroData() {
  dataSelecionada = null;
  renderizarCalendario();
  renderizar();
}

/**
 * Seleciona um dia e filtra as tarefas por aquela data.
 * Clicando no mesmo dia novamente, remove o filtro.
 * @param {string} dataISO - Formato "YYYY-MM-DD".
 */
function selecionarDia(dataISO) {
  dataSelecionada = (dataSelecionada === dataISO) ? null : dataISO;
  renderizarCalendario();
  if (dataSelecionada) {
    renderizar(tarefas.filter(t => t.data === dataSelecionada));
  } else {
    renderizar();
  }
}

/** Renderiza a grade completa do calendário no DOM. */
function renderizarCalendario() {
  document.getElementById("calTitulo").textContent = `${MESES_NOMES[calMes]} ${calAno}`;

  const grid  = document.getElementById("calGrid");
  grid.innerHTML = "";

  const hoje    = new Date();
  const hojeISO = toISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const datasComTarefa = new Set(tarefas.map(t => t.data));

  const primeiroDia = new Date(calAno, calMes, 1).getDay(); // 0 = Dom
  const diasNoMes   = new Date(calAno, calMes + 1, 0).getDate();
  const diasMesAnt  = new Date(calAno, calMes, 0).getDate();

  // Dias do mês anterior (preenchimento inicial)
  for (let i = primeiroDia - 1; i >= 0; i--) {
    const dia     = diasMesAnt - i;
    const mesAnts = calMes === 0 ? 11 : calMes - 1;
    const anoAnts = calMes === 0 ? calAno - 1 : calAno;
    grid.appendChild(criarCelula(dia, toISO(anoAnts, mesAnts, dia), ["outro-mes"], datasComTarefa, hojeISO));
  }

  // Dias do mês atual
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataISO = toISO(calAno, calMes, dia);
    const classes = [];
    if (dataISO === hojeISO)         classes.push("hoje");
    if (dataISO === dataSelecionada) classes.push("selecionado");
    grid.appendChild(criarCelula(dia, dataISO, classes, datasComTarefa, hojeISO));
  }

  // Dias do próximo mês (completar a última linha)
  const total = primeiroDia + diasNoMes;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let dia = 1; dia <= resto; dia++) {
    const mesProx = calMes === 11 ? 0  : calMes + 1;
    const anoProx = calMes === 11 ? calAno + 1 : calAno;
    grid.appendChild(criarCelula(dia, toISO(anoProx, mesProx, dia), ["outro-mes"], datasComTarefa, hojeISO));
  }
}

/**
 * Cria e retorna um elemento <div> de célula do calendário.
 */
function criarCelula(dia, dataISO, classes, datasComTarefa, hojeISO) {
  const cel = document.createElement("div");
  cel.className = "cal-dia " + classes.join(" ");
  if (datasComTarefa.has(dataISO)) cel.classList.add("tem-tarefa");
  cel.textContent = dia;
  cel.onclick = () => selecionarDia(dataISO);
  return cel;
}

/**
 * Converte ano, mês (0–11) e dia em string "YYYY-MM-DD".
 */
function toISO(ano, mes, dia) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Fecha o overlay ao clicar fora do modal.
 */
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

/**
 * Renderiza a lista de tarefas no DOM.
 * @param {Array} lista - Array de tarefas (usa global se não informado).
 */
function renderizar(lista) {
  const container = document.getElementById("listaTarefas");

  if (!lista) lista = tarefas;

  if (lista.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.9rem;">Nenhuma tarefa encontrada.</p>';
    return;
  }

  container.innerHTML = lista.map(criarCardTarefa).join("");
}

/**
 * Gera o HTML de um card de tarefa.
 * @param {Object} t - Objeto tarefa.
 * @returns {string} HTML do card.
 */
function criarCardTarefa(t) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataTarefa    = new Date(t.data + "T00:00:00");
  const dataFormatada = dataTarefa.toLocaleDateString("pt-BR");

  // Define classe e rótulo de status
  let classeStatus = "pendente";
  let rotuloStatus = t.status;

  if (t.status === "Concluído") {
    classeStatus = "concluido";
  } else if (dataTarefa < hoje) {
    classeStatus = "atrasado";
    rotuloStatus = "⚠ Atrasada";
  }

  return `
    <div class="tarefa" id="tarefa-${t.id}">
      <h3>${t.titulo}</h3>
      <p>${t.descricao || "—"}</p>
      <p><strong>Data:</strong> ${dataFormatada}</p>
      <p class="status ${classeStatus}">Status: ${rotuloStatus}</p>
      <div class="botoes-tarefa">
        <button class="editar"  onclick="abrirModalEditar(${t.id})">Editar</button>
        <button class="remover" onclick="abrirModalRemover(${t.id})">Remover</button>
        <button class="concluir" onclick="concluirTarefa(${t.id})">Concluir</button>
        <button class="ver"     onclick="abrirModalVer(${t.id})">Ver</button>
      </div>
    </div>
  `;
}

/* ── 4. PESQUISA ── */

/**
 * Filtra as tarefas em tempo real conforme a digitação.
 */
function filtrarTarefas() {
  const termo = document.getElementById("campoPesquisa").value.toLowerCase();

  const resultado = tarefas.filter(t =>
    t.titulo.toLowerCase().includes(termo) ||
    (t.descricao || "").toLowerCase().includes(termo)
  );

  renderizar(resultado);
}

/* ── 5. CONTROLE DE MODAIS ── */

/**
 * Abre um overlay pelo id.
 * @param {string} id - ID do elemento overlay.
 */
function abrirModal(id) {
  document.getElementById(id).classList.add("ativo");
}

/**
 * Fecha um overlay pelo id.
 * @param {string} id - ID do elemento overlay.
 */
function fecharModal(id) {
  document.getElementById(id).classList.remove("ativo");
}

/* ── 6. MODAL ADICIONAR / EDITAR ── */

/**
 * Abre o modal de formulário no modo "adicionar".
 */
function abrirModalAdicionar() {
  editandoId = null;
  document.getElementById("modalFormTitulo").textContent = "ADICIONAR TAREFA";
  document.getElementById("inputTitulo").value    = "";
  document.getElementById("inputDescricao").value = "";
  document.getElementById("inputData").value      = "";
  document.getElementById("inputStatus").value    = "Pendente";
  abrirModal("overlayForm");
}

/**
 * Abre o modal de formulário no modo "editar" com dados pré-preenchidos.
 * @param {number} id - ID da tarefa a editar.
 */
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

/**
 * Salva a tarefa (cria nova ou atualiza existente).
 */
function salvarTarefa() {
  const titulo    = document.getElementById("inputTitulo").value.trim();
  const descricao = document.getElementById("inputDescricao").value.trim();
  const data      = document.getElementById("inputData").value;
  const status    = document.getElementById("inputStatus").value;

  // Validação básica
  if (!titulo) { document.getElementById("inputTitulo").focus(); return; }
  if (!data)   { document.getElementById("inputData").focus();   return; }

  if (editandoId !== null) {
    // Atualiza tarefa existente
    const tarefa = tarefas.find(t => t.id === editandoId);
    Object.assign(tarefa, { titulo, descricao, data, status });
    mostrarSucesso("✏️", "TAREFA EDITADA", "Alterações salvas com sucesso!");
  } else {
    // Cria nova tarefa
    tarefas.push({ id: proximoId++, titulo, descricao, data, status });
    mostrarSucesso("✅", "TAREFA ADICIONADA", "Nova tarefa criada com sucesso!");
  }

  fecharModal("overlayForm");
  renderizar();
}

/* ── 7. MODAL VER DETALHES ── */

/**
 * Abre o modal com os detalhes de uma tarefa.
 * @param {number} id - ID da tarefa.
 */
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

/**
 * Abre o modal de confirmação de remoção.
 * @param {number} id - ID da tarefa a remover.
 */
function abrirModalRemover(id) {
  removendoId = id;
  abrirModal("overlayConfirm");
}

/**
 * Confirma e executa a remoção da tarefa.
 */
function confirmarRemocao() {
  tarefas = tarefas.filter(t => t.id !== removendoId);
  removendoId = null;

  fecharModal("overlayConfirm");
  renderizar();
  mostrarSucesso("🗑️", "REMOVIDA!", "A tarefa foi removida com sucesso.");
}

/* ── 9. CONCLUIR TAREFA ── */

/**
 * Marca uma tarefa como concluída.
 * @param {number} id - ID da tarefa.
 */
function concluirTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  tarefa.status = "Concluído";
  renderizar();
  mostrarSucesso("🎉", "CONCLUÍDA!", "Boa! Tarefa marcada como concluída.");
}

/* ── 10. MODAL DE SUCESSO ── */

/**
 * Exibe o modal de feedback de sucesso e fecha automaticamente.
 * @param {string} icone  - Emoji do ícone.
 * @param {string} titulo - Título do modal.
 * @param {string} msg    - Mensagem descritiva.
 */
function mostrarSucesso(icone, titulo, msg) {
  document.getElementById("sucessoIcone").textContent  = icone;
  document.getElementById("sucessoTitulo").textContent = titulo;
  document.getElementById("sucessoMsg").textContent    = msg;

  abrirModal("overlaySucesso");
  setTimeout(() => fecharModal("overlaySucesso"), 2200);
}