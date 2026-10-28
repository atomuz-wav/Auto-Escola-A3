/* Front end da Auto Escola: SPA simples em JavaScript puro que conversa com src/api.py */

const estado = {
  demo: false,
  perfil: null,        // "recepcionista" | "aluno" | "instrutor"
  usuario: null,
  alunos: [],
  instrutores: [],
  exames: [],
  veiculos: [],
  aulas: [],
};

const app = document.getElementById("app");
const raizModal = document.getElementById("modal-raiz");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CATEGORIAS = ["A", "B", "AB", "C", "D", "E"];
const NOME_CATEGORIA = { A: "A (Moto)", B: "B (Carro)", AB: "AB (Carro e Moto)", C: "C (Caminhão)", D: "D (Ônibus)", E: "E (Articulado)" };
const STATUS_ALUNO = { Ativo: "Ativo", Concluido: "Concluído", Inativo: "Inativo" };
const STATUS_VEICULO = { Disponivel: "Disponível", "Em uso": "Em uso", Manutencao: "Manutenção" };
const STATUS_AULA = ["Agendada", "Realizada", "Falta", "Cancelada"];

/* ---------- Utilitários ---------- */

function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function icone(nome, classe = "icone") {
  return `<svg class="${classe}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
}

const digitos = (texto) => String(texto ?? "").replace(/\D/g, "");

function formatarCPF(cpf) {
  const d = digitos(cpf);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : d;
}

function formatarCelular(numero) {
  let d = digitos(numero);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return d;
}

/* Placa antiga ganha hífen (ABC-1234); Mercosul fica junta (ABC1D23) */
function formatarPlaca(placa) {
  const p = String(placa || "").toUpperCase();
  return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

/* Com permitirEmail, deixa de mascarar assim que a pessoa digita uma letra ou @ */
function mascaraCPF(input, permitirEmail = false) {
  input.addEventListener("input", () => {
    if (permitirEmail && /[a-z@]/i.test(input.value)) return;
    const d = digitos(input.value).slice(0, 11);
    input.value = d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  });
}

function mascaraCelular(input) {
  const aplicar = () => {
    const d = digitos(input.value).slice(0, 11);
    if (!d) { input.value = ""; return; }
    input.value = d.length > 10
      ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
      : d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
  };
  input.addEventListener("input", aplicar);
  aplicar();
}

/* "2026-11-12 09:00" -> partes para exibição */
function partesData(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(texto || "");
  if (!m) return null;
  const data = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return {
    data,
    dia: m[3],
    mes: MESES[+m[2] - 1],
    hora: m[4] ? `${m[4]}:${m[5]}` : "",
    curta: `${m[3]}/${m[2]}/${m[1]}`,
    completa: `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` às ${m[4]}:${m[5]}` : ""}`,
    semana: DIAS_SEMANA[data.getDay()],
  };
}

function isoLocal(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
const hojeISO = () => isoLocal(new Date());
const somarDias = (n) => isoLocal(new Date(Date.now() + n * 86400000));

function diasAte(data) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data); alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje) / 86400000);
}

function textoQuando(dias) {
  if (dias === null) return "";
  if (dias < 0) return "Realizada";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function seloTipo(tipo) {
  return tipo === "pratica"
    ? `<span class="selo selo-pratica">Prática</span>`
    : `<span class="selo selo-teorica">Teórica</span>`;
}

function seloAprovacao(aprovacao) {
  const v = String(aprovacao || "").toLowerCase();
  if (v === "aprovado") return `<span class="selo selo-ok">✓ Aprovado</span>`;
  if (v === "desaprovado" || v === "reprovado") return `<span class="selo selo-ruim">✕ Reprovado</span>`;
  return `<span class="selo selo-neutro">Aguardando</span>`;
}

function seloStatusAluno(status) {
  if (status === "Concluido") return `<span class="selo selo-ok">Concluído</span>`;
  if (status === "Inativo") return `<span class="selo selo-ruim">Inativo</span>`;
  return `<span class="selo selo-azul">Ativo</span>`;
}

function seloStatusInstrutor(status) {
  return status === "Inativo" ? `<span class="selo selo-ruim">Inativo</span>` : `<span class="selo selo-ok">Ativo</span>`;
}

function seloStatusVeiculo(status) {
  if (status === "Em uso") return `<span class="selo selo-azul">Em uso</span>`;
  if (status === "Manutencao") return `<span class="selo selo-aviso">Manutenção</span>`;
  return `<span class="selo selo-ok">Disponível</span>`;
}

function seloStatusAula(status) {
  const classe = { Agendada: "selo-azul", Realizada: "selo-ok", Falta: "selo-aviso", Cancelada: "selo-ruim" }[status] || "selo-neutro";
  return `<span class="selo ${classe}">${esc(status)}</span>`;
}

const tagsCategorias = (texto) => String(texto || "").split(",").filter(Boolean).map((c) => `<span class="cat">${esc(c)}</span>`).join(" ");

function blocoData(texto) {
  const p = partesData(texto);
  return `<div class="prova-data"><div class="mes">${p ? p.mes : "—"}</div><div class="dia">${p ? p.dia : "?"}</div></div>`;
}

function barraProgresso(feitas, total) {
  const pct = total ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  return `<div class="progresso-mini" data-tip="${feitas} de ${total} aulas obrigatórias (${pct}%)">
    <span>${feitas}/${total} aulas</span><div class="progresso"><span style="width:${pct}%"></span></div></div>`;
}

const opcoes = (mapa, atual) => Object.entries(mapa).map(([v, rotulo]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(rotulo)}</option>`).join("");

/* ---------- Tooltip dos gráficos e barras ---------- */

const dica = document.createElement("div");
dica.id = "dica";
dica.hidden = true;
document.body.appendChild(dica);
document.addEventListener("mouseover", (e) => {
  const alvo = e.target.closest("[data-tip]");
  if (!alvo) { dica.hidden = true; return; }
  dica.textContent = alvo.dataset.tip;
  dica.hidden = false;
});
document.addEventListener("mousemove", (e) => {
  if (dica.hidden) return;
  const x = Math.min(e.clientX + 14, innerWidth - dica.offsetWidth - 8);
  dica.style.left = `${x}px`;
  dica.style.top = `${e.clientY + 16}px`;
});

/* ---------- API ---------- */

async function api(metodo, url, corpo) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
    credentials: "same-origin",
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    if (resposta.status === 401 && estado.perfil) {
      estado.perfil = null;
      telaLogin();
    }
    throw new Error(dados.erro || "Não foi possível completar a operação");
  }
  return dados;
}

/* ---------- Toasts e modal ---------- */

function toast(mensagem, tipo = "sucesso") {
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  const nomeIcone = tipo === "whats" ? "whats" : tipo === "erro" ? "fechar" : "prova";
  el.innerHTML = `${icone(nomeIcone)}<div>${mensagem}</div>`;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), tipo === "whats" ? 6500 : 4000);
}

/* Mostra as mensagens de WhatsApp simuladas que surgiram desde a última consulta */
let totalMensagensVistas = 0;
async function avisarWhatsappSimulado() {
  if (!estado.demo) return;
  try {
    const msgs = await api("GET", "/api/whatsapp");
    msgs.slice(totalMensagensVistas).forEach((m) =>
      toast(`<strong>WhatsApp simulado para ${esc(formatarCelular(m.para))}</strong><br>${esc(m.mensagem)}`, "whats"));
    totalMensagensVistas = msgs.length;
  } catch { /* só informativo */ }
}

function abrirModal({ titulo, corpo, aoAbrir, largo = false }) {
  raizModal.innerHTML = `
    <div class="modal-fundo">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" ${largo ? 'style="max-width:640px"' : ""}>
        <div class="modal-cab">
          <h2 id="modal-titulo">${titulo}</h2>
          <button class="btn btn-fantasma btn-icone" data-fechar aria-label="Fechar">${icone("fechar")}</button>
        </div>
        <div class="modal-corpo">${corpo}</div>
      </div>
    </div>`;
  const fundo = raizModal.firstElementChild;
  fundo.addEventListener("click", (e) => {
    if (e.target === fundo || e.target.closest("[data-fechar]")) fecharModal();
  });
  document.addEventListener("keydown", fecharComEsc);
  aoAbrir?.(fundo.querySelector(".modal"));
  fundo.querySelector("input:not([disabled]), select, button:not([data-fechar])")?.focus();
}

function fecharModal() {
  raizModal.innerHTML = "";
  document.removeEventListener("keydown", fecharComEsc);
}
function fecharComEsc(e) { if (e.key === "Escape") fecharModal(); }

/* Liga um <form> a uma função assíncrona, cuidando de botão e mensagem de erro */
function ligarFormulario(form, enviar) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = form.querySelector("[type=submit]");
    const caixaErro = form.querySelector(".form-erro");
    caixaErro?.classList.add("oculto");
    botao.disabled = true;
    try {
      await enviar(new FormData(form));
    } catch (erro) {
      if (caixaErro) {
        caixaErro.textContent = erro.message;
        caixaErro.classList.remove("oculto");
      } else {
        toast(esc(erro.message), "erro");
      }
    } finally {
      botao.disabled = false;
    }
  });
}

/* Modal de confirmação para exclusões */
function confirmarExclusao({ titulo, texto, rotulo, acao }) {
  abrirModal({
    titulo,
    corpo: `
      <p style="color:var(--texto-2)">${texto} Essa ação não pode ser desfeita.</p>
      <div class="modal-acoes"><button class="btn btn-secundario" data-fechar>Cancelar</button>
        <button class="btn btn-perigo" id="confirmar-exclusao">${icone("lixo")} ${rotulo}</button></div>`,
    aoAbrir(modal) {
      const botao = modal.querySelector("#confirmar-exclusao");
      botao.addEventListener("click", async () => {
        botao.disabled = true;
        try {
          await acao();
          fecharModal();
        } catch (erro) {
          botao.disabled = false;
          toast(esc(erro.message), "erro");
        }
      });
    },
  });
}

/* ---------- Login ---------- */

function telaLogin(perfilInicial = "recepcionista") {
  document.title = "Entrar · Auto Escola";
  location.hash = "";
  app.innerHTML = `
    <main class="login">
      <section class="login-lado">
        <div>
          <div class="marca"><span class="marca-icone">${icone("volante")}</span> Auto Escola</div>
          <h1 style="margin-top:56px">Do primeiro dia até a <em>carteira na mão.</em></h1>
          <p>Sistema de gestão de alunos, instrutores, frota, aulas práticas e provas, com aviso automático por WhatsApp a cada etapa.</p>
          <ul class="login-lista">
            <li>${icone("alunos")} Cadastro de alunos e instrutores</li>
            <li>${icone("aula")} Agenda de aulas práticas e frota de veículos</li>
            <li>${icone("prova")} Provas teóricas e práticas do DETRAN</li>
            <li>${icone("whats")} Notificações por WhatsApp</li>
          </ul>
        </div>
        <div class="login-rodape">Projeto acadêmico · Avaliação A3</div>
      </section>

      <section class="login-form-area">
        <div class="login-cartao">
          <h2>Entrar</h2>
          <p class="sub">Escolha seu perfil para acessar o sistema.</p>

          <div class="abas" role="tablist" aria-label="Perfil">
            <button class="aba" role="tab" data-perfil="recepcionista">Recepção</button>
            <button class="aba" role="tab" data-perfil="aluno">Aluno</button>
            <button class="aba" role="tab" data-perfil="instrutor">Instrutor</button>
          </div>

          <form id="form-login" class="form-grade" novalidate>
            <div class="campo">
              <label for="login-cpf" id="rotulo-login">CPF</label>
              <input id="login-cpf" name="cpf" autocomplete="username" placeholder="000.000.000-00" required>
            </div>
            <div class="campo" id="campo-senha">
              <label for="login-senha">Senha</label>
              <input id="login-senha" name="senha" type="password" autocomplete="current-password" placeholder="Sua senha">
            </div>
            <div class="form-erro oculto"></div>
            <button class="btn btn-primario btn-bloco" type="submit">${icone("cadeado")} Entrar</button>
          </form>

          ${estado.demo ? `
          <div class="dica-demo">
            <strong>Modo demonstração (SQLite)</strong>
            Recepção: <button data-demo="recepcionista">123.456.789-09 / demo123</button><br>
            Aluno: <button data-demo="aluno">529.982.247-25</button> ou <button data-demo="aluno-email">mariana@email.com</button><br>
            Instrutor: <button data-demo="instrutor">111.222.333-44</button>
          </div>` : ""}
        </div>
      </section>
    </main>`;

  const form = document.getElementById("form-login");
  const cpf = document.getElementById("login-cpf");
  const senha = document.getElementById("login-senha");
  mascaraCPF(cpf, true);
  let perfil = perfilInicial;

  function selecionar(novo) {
    perfil = novo;
    app.querySelectorAll(".aba").forEach((a) => a.setAttribute("aria-selected", a.dataset.perfil === novo));
    document.getElementById("campo-senha").classList.toggle("oculto", novo !== "recepcionista");
    document.getElementById("rotulo-login").textContent = novo === "aluno" ? "CPF ou e-mail" : "CPF";
    cpf.placeholder = novo === "aluno" ? "000.000.000-00 ou seu@email.com" : "000.000.000-00";
    cpf.inputMode = novo === "aluno" ? "email" : "numeric";
    form.querySelector(".form-erro").classList.add("oculto");
  }
  app.querySelectorAll(".aba").forEach((a) => a.addEventListener("click", () => selecionar(a.dataset.perfil)));
  selecionar(perfil);

  const exemplos = {
    recepcionista: ["recepcionista", "123.456.789-09", "demo123"],
    aluno: ["aluno", "529.982.247-25", ""],
    "aluno-email": ["aluno", "mariana@email.com", ""],
    instrutor: ["instrutor", "111.222.333-44", ""],
  };
  app.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", () => {
    const [p, valorCpf, valorSenha] = exemplos[b.dataset.demo];
    selecionar(p);
    cpf.value = valorCpf;
    senha.value = valorSenha;
  }));

  ligarFormulario(form, async (dados) => {
    const corpo = { cpf: dados.get("cpf") };
    if (perfil === "recepcionista") corpo.senha = dados.get("senha");
    const usuario = await api("POST", `/api/login/${perfil}`, corpo);
    estado.perfil = perfil;
    estado.usuario = usuario;
    if (perfil === "recepcionista") abrirSistema();
    else if (perfil === "aluno") telaAluno();
    else telaInstrutor();
  });
}

async function sair() {
  await api("POST", "/api/logout").catch(() => {});
  estado.perfil = null;
  estado.usuario = null;
  telaLogin();
}

/* ---------- Sistema da recepção ---------- */

const PAGINAS = {
  painel: { titulo: "Painel", sub: "Visão geral da auto escola", icone: "painel", render: paginaPainel },
  alunos: { titulo: "Alunos", sub: "Cadastro, edição e acompanhamento dos alunos", icone: "alunos", render: paginaAlunos },
  instrutores: { titulo: "Instrutores", sub: "Equipe de instrução e categorias habilitadas", icone: "instrutor", render: paginaInstrutores },
  frota: { titulo: "Frota", sub: "Veículos usados nas aulas e provas", icone: "carro", render: paginaFrota },
  aulas: { titulo: "Aulas práticas", sub: "Agenda geral das aulas práticas", icone: "aula", render: paginaAulas },
  provas: { titulo: "Provas", sub: "Provas do DETRAN e resultados", icone: "prova", render: paginaProvas },
  equipe: { titulo: "Recepção", sub: "Cadastre novos recepcionistas", icone: "equipe", render: paginaEquipe },
  exames: { titulo: "Guia exames", sub: "Passo a passo para marcar o exame médico e o psicológico", icone: "guia", render: (el) => { el.innerHTML = guiaExames(); } },
  guia: { titulo: "Guia prova prática", sub: "Passo a passo para o aluno marcar a prova prática", icone: "guia", render: (el) => { el.innerHTML = guiaDetran(); } },
};

async function carregarDados() {
  [estado.alunos, estado.instrutores, estado.exames, estado.veiculos, estado.aulas] = await Promise.all([
    api("GET", "/api/alunos"), api("GET", "/api/instrutores"), api("GET", "/api/exames"),
    api("GET", "/api/veiculos"), api("GET", "/api/aulas"),
  ]);
}

async function abrirSistema() {
  app.innerHTML = `
    <div class="shell">
      <aside class="lateral">
        <div class="marca"><span class="marca-icone">${icone("volante")}</span> <span>Auto Escola</span></div>
        <nav class="nav" aria-label="Seções">
          ${Object.entries(PAGINAS).map(([id, p]) => `<a href="#/${id}" data-pagina="${id}" title="${p.titulo}">${icone(p.icone)}<span>${p.titulo}</span></a>`).join("")}
        </nav>
        <div class="lateral-rodape">
          <div class="nome">${esc(estado.usuario.nome)}</div>
          <div class="papel">Recepcionista</div>
        </div>
      </aside>
      <div class="principal">
        <header class="topo">
          <div><h1 id="titulo-pagina"></h1><p class="sub" id="sub-pagina"></p></div>
          <div class="topo-acoes">
            ${estado.demo ? `<span class="selo selo-demo">Modo demo</span>` : ""}
            <button class="btn btn-secundario" id="btn-sair">${icone("sair")}<span>Sair</span></button>
          </div>
        </header>
        <main class="conteudo" id="conteudo"><p class="vazio">Carregando…</p></main>
      </div>
    </div>`;
  document.getElementById("btn-sair").addEventListener("click", sair);

  try {
    await carregarDados();
  } catch (erro) {
    toast(esc(erro.message), "erro");
    return;
  }
  if (!location.hash.startsWith("#/")) location.hash = "#/painel";
  else renderizarPagina();
}

function renderizarPagina() {
  if (estado.perfil !== "recepcionista") return;
  const id = location.hash.replace("#/", "") || "painel";
  const pagina = PAGINAS[id] || PAGINAS.painel;
  document.title = `${pagina.titulo} · Auto Escola`;
  document.getElementById("titulo-pagina").textContent = pagina.titulo;
  document.getElementById("sub-pagina").textContent = pagina.sub;
  app.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.pagina === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  pagina.render(document.getElementById("conteudo"));
}
window.addEventListener("hashchange", renderizarPagina);

async function recarregar() {
  await carregarDados();
  renderizarPagina();
  avisarWhatsappSimulado();
}

/* --- Gráficos em HTML (barras de uma cor; status com cor + rótulo) --- */

function graficoBarrasH(itens, unidade = "aula(s)") {
  if (!itens.length) return `<p class="vazio">Sem dados ainda.</p>`;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return `<div class="barras-h">${itens.map((i) => `
    <div class="barra-h" data-tip="${esc(i.rotulo)}: ${i.valor} ${unidade}">
      <span class="rotulo">${esc(i.rotulo)}</span>
      <div class="trilho"><div class="preench" style="width:${(i.valor / max) * 100}%"></div></div>
      <span class="valor">${i.valor}</span>
    </div>`).join("")}</div>`;
}

function graficoBarrasV(itens, unidade = "aula(s)") {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return `
    <div class="barras-v">${itens.map((i) => `
      <div class="barra-v" data-tip="${esc(i.rotulo)}: ${i.valor} ${unidade}">
        <span class="valor">${i.valor || ""}</span>
        <div class="coluna" style="height:${(i.valor / max) * 80}%"></div>
      </div>`).join("")}</div>
    <div class="eixo-v">${itens.map((i) => `<span>${esc(i.rotulo)}</span>`).join("")}</div>`;
}

function graficoResultados(alunosComProva) {
  const grupos = [
    { rotulo: "Aprovados", cor: "cor-ok", valor: alunosComProva.filter((a) => a.aprovacao === "aprovado").length },
    { rotulo: "Reprovados", cor: "cor-ruim", valor: alunosComProva.filter((a) => a.aprovacao === "desaprovado").length },
    { rotulo: "Aguardando", cor: "cor-neutra", valor: alunosComProva.filter((a) => a.aprovacao !== "aprovado" && a.aprovacao !== "desaprovado").length },
  ];
  const total = grupos.reduce((s, g) => s + g.valor, 0);
  if (!total) return `<p class="vazio">Nenhum aluno com prova marcada.</p>`;
  return `
    <div class="empilhada" role="img" aria-label="${grupos.map((g) => `${g.rotulo}: ${g.valor}`).join(", ")}">
      ${grupos.filter((g) => g.valor).map((g) => `<span class="${g.cor}" style="flex:${g.valor}" data-tip="${g.rotulo}: ${g.valor} de ${total} (${Math.round((g.valor / total) * 100)}%)"></span>`).join("")}
    </div>
    <div class="legenda">${grupos.map((g) => `<span><i class="${g.cor}"></i>${g.rotulo} <strong>${g.valor}</strong></span>`).join("")}</div>`;
}

/* --- Painel --- */
function paginaPainel(el) {
  const hoje = hojeISO();
  const aulasValidas = estado.aulas.filter((a) => a.status !== "Cancelada");
  const aulasHoje = aulasValidas.filter((a) => a.data === hoje).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const provasSemana = estado.exames.filter((e) => { const p = partesData(e.data); const d = p ? diasAte(p.data) : -1; return d >= 0 && d <= 7; });
  const futuras = estado.exames
    .filter((e) => { const p = partesData(e.data); return p && diasAte(p.data) >= 0; })
    .sort((a, b) => a.data.localeCompare(b.data));
  const emUso = estado.veiculos.filter((v) => v.status === "Em uso").length;
  const ocupacao = estado.veiculos.length ? Math.round((emUso / estado.veiculos.length) * 100) : 0;
  const ativos = estado.alunos.filter((a) => a.status === "Ativo").length;

  const porCategoria = CATEGORIAS.map((c) => ({ rotulo: `Categoria ${c}`, valor: aulasValidas.filter((a) => a.categoria === c).length })).filter((i) => i.valor);
  const porDia = DIAS_SEMANA.map((d, n) => ({ rotulo: d, valor: aulasValidas.filter((a) => partesData(a.data)?.data.getDay() === n).length }));
  const porInstrutor = estado.instrutores.map((i) => ({ rotulo: i.nome, valor: i.total_aulas })).sort((a, b) => b.valor - a.valor);
  const alunosComProva = estado.alunos.filter((a) => a.exame_id);

  el.innerHTML = `
    <div class="estatisticas">
      ${estat("alunos", "azul", ativos, "Alunos ativos")}
      ${estat("aula", "amarelo", aulasHoje.length, "Aulas hoje")}
      ${estat("prova", "verde", provasSemana.length, "Provas nos próximos 7 dias")}
      ${estat("carro", "cinza", `${ocupacao}%`, `Frota em uso (${emUso} de ${estado.veiculos.length})`)}
    </div>

    <div class="grade-graficos">
      <section class="cartao"><div class="cartao-cab"><div><h2>Aulas por categoria de CNH</h2><p class="grafico-sub">Aulas agendadas e realizadas</p></div></div>
        <div class="cartao-corpo">${graficoBarrasH(porCategoria)}</div></section>
      <section class="cartao"><div class="cartao-cab"><div><h2>Aulas por dia da semana</h2><p class="grafico-sub">Todas as aulas não canceladas</p></div></div>
        <div class="cartao-corpo">${graficoBarrasV(porDia)}</div></section>
      <section class="cartao"><div class="cartao-cab"><div><h2>Carga de aulas por instrutor</h2><p class="grafico-sub">Aulas agendadas e realizadas</p></div></div>
        <div class="cartao-corpo">${graficoBarrasH(porInstrutor)}</div></section>
      <section class="cartao"><div class="cartao-cab"><div><h2>Resultados das provas</h2><p class="grafico-sub">Alunos com prova marcada</p></div><a class="btn btn-fantasma" href="#/provas">Lançar</a></div>
        <div class="cartao-corpo">${graficoResultados(alunosComProva)}</div></section>
    </div>

    <div class="grade-painel">
      <section class="cartao">
        <div class="cartao-cab"><h2>Aulas de hoje</h2><a class="btn btn-fantasma" href="#/aulas">Ver agenda</a></div>
        ${aulasHoje.length ? `<div class="tabela-wrap"><table>
          <thead><tr><th>Horário</th><th>Aluno</th><th class="m-oculto">Instrutor</th><th class="m-oculto">Veículo</th><th>Status</th></tr></thead>
          <tbody>${aulasHoje.map((a) => `<tr style="cursor:default">
            <td class="mono">${a.hora_inicio}–${a.hora_fim}</td><td><strong>${esc(a.aluno_nome)}</strong></td>
            <td class="m-oculto">${esc(a.instrutor_nome)}</td><td class="m-oculto">${a.veiculo_modelo ? esc(a.veiculo_modelo) : "—"}</td>
            <td>${seloStatusAula(a.status)}</td></tr>`).join("")}</tbody></table></div>`
          : `<p class="vazio">Nenhuma aula marcada para hoje.</p>`}
        <div class="cartao-cab" style="border-top:1px solid var(--borda)"><h2>Próximas provas</h2><a class="btn btn-fantasma" href="#/provas">Ver todas</a></div>
        <div class="cartao-corpo" style="padding-top:6px;padding-bottom:6px">
          ${futuras.length ? futuras.slice(0, 4).map((e) => `
            <div class="mini-prova">
              ${blocoData(e.data)}
              <div class="prova-info">
                <div class="prova-linha">${seloTipo(e.tipo)}<span class="prova-hora">${icone("relogio")}${partesData(e.data)?.hora || ""}</span>${e.local ? `<span class="mono" style="font-size:13px">· ${esc(e.local)}</span>` : ""}</div>
                <div class="mono" style="font-size:13px;margin-top:4px">${e.alunos.length} aluno(s) · ${esc(e.alunos.map((a) => a.nome).join(", ") || "nenhum aluno")}</div>
              </div>
            </div>`).join("") : `<p class="vazio">Nenhuma prova agendada.</p>`}
        </div>
      </section>
      <section class="cartao">
        <div class="cartao-cab"><h2>Ações rápidas</h2></div>
        <div class="cartao-corpo" style="display:grid;gap:10px">
          <button class="btn btn-primario" data-acao="aula">${icone("aula")} Agendar aula</button>
          <button class="btn btn-secundario" data-acao="aluno">${icone("mais")} Cadastrar aluno</button>
          <button class="btn btn-secundario" data-acao="prova">${icone("prova")} Marcar prova</button>
          <button class="btn btn-secundario" data-acao="veiculo">${icone("carro")} Cadastrar veículo</button>
        </div>
        ${estado.demo ? `<div class="cartao-cab" style="border-top:1px solid var(--borda)"><h2>WhatsApp (simulado)</h2></div>
        <div class="cartao-corpo"><div class="msgs" id="lista-msgs"><p class="vazio" style="padding:8px">Nenhuma mensagem enviada nesta sessão.</p></div></div>` : ""}
      </section>
    </div>`;

  el.querySelector('[data-acao="aula"]').addEventListener("click", modalAgendarAula);
  el.querySelector('[data-acao="aluno"]').addEventListener("click", () => modalFormAluno());
  el.querySelector('[data-acao="prova"]').addEventListener("click", modalMarcarProva);
  el.querySelector('[data-acao="veiculo"]').addEventListener("click", () => modalFormVeiculo());

  if (estado.demo) {
    api("GET", "/api/whatsapp").then((msgs) => {
      const lista = document.getElementById("lista-msgs");
      if (lista && msgs.length) {
        lista.innerHTML = msgs.slice(-4).reverse().map((m) => `
          <div class="msg"><div class="para">${icone("whats")} ${esc(formatarCelular(m.para))}</div>${esc(m.mensagem)}</div>`).join("");
      }
    }).catch(() => {});
  }
}

function estat(nomeIcone, cor, valor, rotulo) {
  return `<div class="cartao estat"><div class="estat-icone ${cor}">${icone(nomeIcone)}</div>
    <div><div class="estat-valor">${valor}</div><div class="estat-rotulo">${rotulo}</div></div></div>`;
}

/* --- Alunos --- */
function paginaAlunos(el) {
  el.innerHTML = `
    <div class="barra">
      <div class="filtros" style="flex:1">
        <label class="busca">${icone("busca")}<span class="sr">Buscar aluno</span>
          <input id="busca-aluno" placeholder="Buscar por nome, CPF ou e-mail"></label>
        <div class="campo"><label class="sr" for="filtro-status">Status</label>
          <select id="filtro-status"><option value="">Todos os status</option>${opcoes(STATUS_ALUNO)}</select></div>
      </div>
      <button class="btn btn-primario" id="novo-aluno">${icone("mais")} Novo aluno</button>
    </div>
    <section class="cartao">
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Aluno</th><th>Cat.</th><th class="m-oculto">Instrutor</th><th class="m-oculto">Aulas</th><th class="m-oculto">Prova</th><th>Status</th></tr></thead>
          <tbody id="corpo-alunos"></tbody>
        </table>
      </div>
    </section>`;

  const corpo = document.getElementById("corpo-alunos");
  const busca = document.getElementById("busca-aluno");
  const filtroStatus = document.getElementById("filtro-status");

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    const termoDigitos = digitos(termo);
    const lista = estado.alunos.filter((a) =>
      (!filtroStatus.value || a.status === filtroStatus.value) &&
      (!termo || a.nome.toLowerCase().includes(termo) || (a.email || "").includes(termo) || (termoDigitos && a.cpf.includes(termoDigitos))));

    corpo.innerHTML = lista.length ? lista.map((a) => {
      const p = partesData(a.exame_data);
      return `<tr data-cpf="${esc(a.cpf)}" tabindex="0">
        <td><div class="pessoa"><span class="avatar">${esc(iniciais(a.nome))}</span><div>${esc(a.nome)}<small>${esc(a.email || formatarCPF(a.cpf))}</small></div></div></td>
        <td><span class="cat">${esc(a.categoria)}</span></td>
        <td class="m-oculto">${esc(a.instrutor_nome || "—")}</td>
        <td class="m-oculto">${barraProgresso(a.aulas_realizadas, a.carga_obrigatoria)}</td>
        <td class="m-oculto">${a.exame_id ? `${seloTipo(a.exame_tipo)} <span class="mono">${p ? `${p.dia}/${p.mes}` : ""}</span>` : `<span class="mono">Sem prova</span>`}</td>
        <td>${seloStatusAluno(a.status)}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="6" class="vazio">${termo || filtroStatus.value ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda."}</td></tr>`;
  }

  busca.addEventListener("input", desenhar);
  filtroStatus.addEventListener("change", desenhar);
  corpo.addEventListener("click", (e) => { const tr = e.target.closest("tr[data-cpf]"); if (tr) modalAluno(tr.dataset.cpf); });
  corpo.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.dataset.cpf) modalAluno(e.target.dataset.cpf); });
  document.getElementById("novo-aluno").addEventListener("click", () => modalFormAluno());
  desenhar();
}

async function modalAluno(cpf) {
  try {
    const a = await api("GET", `/api/alunos/${cpf}`);
    const p = partesData(a.exame_data);
    const realizadas = a.aulas.filter((x) => x.status === "Realizada").length;
    const proximas = a.aulas.filter((x) => x.status === "Agendada" && x.data >= hojeISO());
    abrirModal({
      titulo: "Dados do aluno",
      largo: true,
      corpo: `
        <div class="cabecalho-detalhe">
          <div class="pessoa"><span class="avatar grande">${esc(iniciais(a.nome))}</span>
            <div style="font-size:18px">${esc(a.nome)}<small>${formatarCPF(a.cpf)}</small></div></div>
          ${seloStatusAluno(a.status)}
        </div>
        <dl class="detalhes">
          <div><dt>Categoria</dt><dd>${esc(NOME_CATEGORIA[a.categoria] || a.categoria)}</dd></div>
          <div><dt>Instrutor</dt><dd>${esc(a.instrutor_nome || "—")}</dd></div>
          <div><dt>Celular</dt><dd>${esc(formatarCelular(a.numero_cel) || "—")}</dd></div>
          <div><dt>E-mail</dt><dd>${esc(a.email || "—")}</dd></div>
          <div><dt>Aulas práticas</dt><dd>${barraProgresso(realizadas, a.carga_obrigatoria)}</dd></div>
          <div><dt>Próxima aula</dt><dd>${proximas[0] ? `${proximas[0].data === hojeISO() ? "Hoje" : partesData(proximas[0].data).curta} · ${proximas[0].hora_inicio}` : "Nenhuma agendada"}</dd></div>
          <div><dt>Prova</dt><dd>${a.exame_id ? `${seloTipo(a.exame_tipo)} <span style="display:block;margin-top:4px">${p ? p.completa : esc(a.exame_data)}</span>` : "Nenhuma prova marcada"}</dd></div>
          <div><dt>Resultado</dt><dd>${a.exame_id ? seloAprovacao(a.aprovacao) : "—"}</dd></div>
          <div><dt>Cadastro</dt><dd>${partesData(a.data_cadastro)?.curta || "—"}</dd></div>
        </dl>
        <div class="modal-acoes" style="justify-content:space-between">
          <button class="btn btn-fantasma" id="excluir-aluno" style="color:var(--vermelho)">${icone("lixo")} Excluir</button>
          <div style="display:flex;gap:10px"><button class="btn btn-secundario" data-fechar>Fechar</button>
          <button class="btn btn-primario" id="editar-aluno">${icone("lapis")} Editar</button></div>
        </div>`,
      aoAbrir(modal) {
        modal.querySelector("#editar-aluno").addEventListener("click", () => modalFormAluno(a));
        modal.querySelector("#excluir-aluno").addEventListener("click", () => confirmarExclusao({
          titulo: "Excluir aluno?",
          texto: `<strong>${esc(a.nome)}</strong> será removido(a) junto com ${a.aulas.length} aula(s) registrada(s).`,
          rotulo: "Excluir aluno",
          async acao() {
            await api("DELETE", `/api/alunos/${a.cpf}`);
            toast(`Aluno <strong>${esc(a.nome)}</strong> excluído.`);
            await recarregar();
          },
        }));
      },
    });
  } catch (erro) {
    toast(esc(erro.message), "erro");
  }
}

/* Sem argumento cadastra; com o aluno, edita (o CPF fica bloqueado) */
function modalFormAluno(aluno = null) {
  if (!estado.instrutores.length) {
    toast("Cadastre um instrutor antes de cadastrar alunos.", "erro");
    return;
  }
  const editando = Boolean(aluno);
  const instrutores = estado.instrutores.filter((i) => i.status === "Ativo" || i.id === aluno?.instrutor_id);
  abrirModal({
    titulo: editando ? "Editar aluno" : "Novo aluno",
    corpo: `
      <form class="form-grade" novalidate>
        <div class="campo"><label for="na-nome">Nome completo *</label><input id="na-nome" name="nome" required autocomplete="off" value="${esc(aluno?.nome)}"></div>
        <div class="form-grade duas">
          <div class="campo"><label for="na-cpf">CPF *</label><input id="na-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" required value="${esc(formatarCPF(aluno?.cpf))}" ${editando ? "disabled" : ""}>
            ${editando ? "<small>O CPF não pode ser alterado.</small>" : ""}</div>
          <div class="campo"><label for="na-cel">Celular (WhatsApp) *</label><input id="na-cel" name="celular" inputmode="tel" placeholder="(81) 90000-0000" required value="${esc(formatarCelular(aluno?.numero_cel))}"></div>
        </div>
        <div class="campo"><label for="na-email">E-mail *</label><input id="na-email" name="email" type="email" placeholder="aluno@email.com" required value="${esc(aluno?.email)}">
          <small>O aluno pode entrar no portal com o CPF ou com este e-mail.</small></div>
        <div class="form-grade duas">
          <div class="campo"><label for="na-cat">Categoria pretendida</label><select id="na-cat" name="categoria">${opcoes(NOME_CATEGORIA, aluno?.categoria || "B")}</select></div>
          <div class="campo"><label for="na-status">Status</label><select id="na-status" name="status">${opcoes(STATUS_ALUNO, aluno?.status || "Ativo")}</select></div>
        </div>
        <div class="campo"><label for="na-instrutor">Instrutor *</label>
          <select id="na-instrutor" name="instrutor_id" required>
            ${instrutores.map((i) => `<option value="${i.id}" ${i.id === aluno?.instrutor_id ? "selected" : ""}>${esc(i.nome)} · cat. ${esc(i.categorias)} · ${i.total_alunos} aluno(s)</option>`).join("")}
          </select>
          ${editando ? "" : "<small>O aluno recebe uma mensagem de boas-vindas no WhatsApp com o nome do instrutor.</small>"}
        </div>
        <div class="form-erro oculto"></div>
        <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? "Salvar alterações" : "Cadastrar aluno"}</button></div>
      </form>`,
    aoAbrir(modal) {
      mascaraCPF(modal.querySelector("#na-cpf"));
      mascaraCelular(modal.querySelector("#na-cel"));
      ligarFormulario(modal.querySelector("form"), async (d) => {
        const corpo = {
          nome: d.get("nome"), celular: d.get("celular"), email: d.get("email"),
          categoria: d.get("categoria"), status: d.get("status"), instrutor_id: Number(d.get("instrutor_id")),
        };
        if (editando) {
          const salvo = await api("PUT", `/api/alunos/${aluno.cpf}`, corpo);
          fecharModal();
          toast(`Dados de <strong>${esc(salvo.nome)}</strong> atualizados.`);
        } else {
          const salvo = await api("POST", "/api/alunos", { ...corpo, cpf: d.get("cpf") });
          fecharModal();
          toast(`Aluno <strong>${esc(salvo.nome)}</strong> cadastrado.`);
          if (!salvo.whatsapp_enviado) toast("O cadastro foi salvo, mas o WhatsApp de boas-vindas não pôde ser enviado.", "erro");
        }
        await recarregar();
      });
    },
  });
}

/* --- Instrutores --- */
function paginaInstrutores(el) {
  el.innerHTML = `
    <div class="barra">
      <label class="busca">${icone("busca")}<span class="sr">Buscar instrutor</span>
        <input id="busca-instrutor" placeholder="Buscar por nome ou CPF"></label>
      <button class="btn btn-primario" id="novo-instrutor">${icone("mais")} Novo instrutor</button>
    </div>
    <div class="grade-cartoes" id="lista-instrutores"></div>`;

  const lista = document.getElementById("lista-instrutores");
  const busca = document.getElementById("busca-instrutor");

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    const termoDigitos = digitos(termo);
    const filtrados = estado.instrutores.filter((i) =>
      !termo || i.nome.toLowerCase().includes(termo) || (termoDigitos && i.cpf.includes(termoDigitos)));
    lista.innerHTML = filtrados.length ? filtrados.map((i) => `
      <button class="cartao cartao-instrutor" data-cpf="${esc(i.cpf)}">
        <div class="cabecalho-detalhe"><span class="avatar grande">${esc(iniciais(i.nome))}</span>${seloStatusInstrutor(i.status)}</div>
        <h3>${esc(i.nome)}</h3>
        <div class="mono">${i.telefone ? esc(formatarCelular(i.telefone)) : `CPF ${formatarCPF(i.cpf)}`}</div>
        <div style="margin-top:10px">${tagsCategorias(i.categorias)}</div>
        <div class="rodape"><span>Alunos <strong>${i.total_alunos}</strong></span><span>Aulas <strong>${i.total_aulas}</strong></span></div>
      </button>`).join("") : `<div class="cartao vazio" style="grid-column:1/-1">Nenhum instrutor encontrado.</div>`;
  }

  busca.addEventListener("input", desenhar);
  lista.addEventListener("click", (e) => { const c = e.target.closest("[data-cpf]"); if (c) modalInstrutor(c.dataset.cpf); });
  document.getElementById("novo-instrutor").addEventListener("click", () => modalFormInstrutor());
  desenhar();
}

async function modalInstrutor(cpf) {
  try {
    const i = await api("GET", `/api/instrutores/${cpf}`);
    abrirModal({
      titulo: "Instrutor",
      corpo: `
        <div class="cabecalho-detalhe">
          <div class="pessoa"><span class="avatar grande">${esc(iniciais(i.nome))}</span>
            <div style="font-size:18px">${esc(i.nome)}<small>CPF ${formatarCPF(i.cpf)}</small></div></div>
          ${seloStatusInstrutor(i.status)}
        </div>
        <dl class="detalhes">
          <div><dt>Telefone</dt><dd>${esc(formatarCelular(i.telefone) || "—")}</dd></div>
          <div><dt>Categorias habilitadas</dt><dd>${tagsCategorias(i.categorias)}</dd></div>
        </dl>
        <h3 style="font-size:14px;margin:22px 0 10px;color:var(--texto-2)">Alunos (${i.alunos.length}) · ${i.total_aulas} aula(s) no total</h3>
        ${i.alunos.length ? `<div class="lista-escolha">${i.alunos.map((a) => `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--borda)">
            <span class="pessoa"><span class="avatar">${esc(iniciais(a.nome))}</span>${esc(a.nome)}</span>
            ${a.exame_id ? seloTipo(a.exame_tipo) : `<span class="mono" style="font-size:13px">Sem prova</span>`}
          </div>`).join("")}</div>` : `<p class="vazio" style="padding:16px">Sem alunos.</p>`}
        <div class="modal-acoes" style="justify-content:space-between">
          <button class="btn btn-fantasma" id="excluir-instrutor" style="color:var(--vermelho)">${icone("lixo")} Excluir</button>
          <div style="display:flex;gap:10px"><button class="btn btn-secundario" data-fechar>Fechar</button>
          <button class="btn btn-primario" id="editar-instrutor">${icone("lapis")} Editar</button></div>
        </div>`,
      aoAbrir(modal) {
        modal.querySelector("#editar-instrutor").addEventListener("click", () => modalFormInstrutor(i));
        modal.querySelector("#excluir-instrutor").addEventListener("click", () => confirmarExclusao({
          titulo: "Excluir instrutor?",
          texto: `<strong>${esc(i.nome)}</strong> será removido(a). ${i.alunos.length ? `Os ${i.alunos.length} aluno(s) dele(a) ficarão sem instrutor` : "Nenhum aluno será afetado"}${i.total_aulas ? ` e ${i.total_aulas} aula(s) serão apagadas` : ""}.`,
          rotulo: "Excluir instrutor",
          async acao() {
            await api("DELETE", `/api/instrutores/${i.cpf}`);
            toast(`Instrutor <strong>${esc(i.nome)}</strong> excluído.`);
            await recarregar();
          },
        }));
      },
    });
  } catch (erro) {
    toast(esc(erro.message), "erro");
  }
}

function modalFormInstrutor(instrutor = null) {
  const editando = Boolean(instrutor);
  const habilitadas = String(instrutor?.categorias || "B").split(",");
  abrirModal({
    titulo: editando ? "Editar instrutor" : "Novo instrutor",
    corpo: `
      <form class="form-grade" novalidate>
        <div class="campo"><label for="ni-nome">Nome completo *</label><input id="ni-nome" name="nome" required autocomplete="off" value="${esc(instrutor?.nome)}"></div>
        <div class="form-grade duas">
          <div class="campo"><label for="ni-cpf">CPF *</label><input id="ni-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" required value="${esc(formatarCPF(instrutor?.cpf))}" ${editando ? "disabled" : ""}></div>
          <div class="campo"><label for="ni-tel">Telefone</label><input id="ni-tel" name="telefone" inputmode="tel" placeholder="(81) 90000-0000" value="${esc(formatarCelular(instrutor?.telefone))}"></div>
        </div>
        <div class="campo"><span style="font-size:13px;font-weight:600;color:var(--texto-2)">Categorias habilitadas *</span>
          <div class="checks">${CATEGORIAS.map((c) => `<label><input type="checkbox" name="categorias" value="${c}" ${habilitadas.includes(c) ? "checked" : ""}> ${c}</label>`).join("")}</div>
        </div>
        <div class="campo"><label for="ni-status">Status</label><select id="ni-status" name="status">${opcoes({ Ativo: "Ativo", Inativo: "Inativo" }, instrutor?.status || "Ativo")}</select>
          <small>Instrutores inativos não podem receber novas aulas.</small></div>
        <div class="form-erro oculto"></div>
        <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? "Salvar alterações" : "Cadastrar instrutor"}</button></div>
      </form>`,
    aoAbrir(modal) {
      mascaraCPF(modal.querySelector("#ni-cpf"));
      mascaraCelular(modal.querySelector("#ni-tel"));
      ligarFormulario(modal.querySelector("form"), async (d) => {
        const corpo = { nome: d.get("nome"), telefone: d.get("telefone"), categorias: d.getAll("categorias").join(","), status: d.get("status") };
        if (editando) {
          await api("PUT", `/api/instrutores/${instrutor.cpf}`, corpo);
          toast(`Dados de <strong>${esc(corpo.nome)}</strong> atualizados.`);
        } else {
          await api("POST", "/api/instrutores", { ...corpo, cpf: d.get("cpf") });
          toast(`Instrutor <strong>${esc(corpo.nome)}</strong> cadastrado.`);
        }
        fecharModal();
        await recarregar();
      });
    },
  });
}

/* --- Frota --- */
function paginaFrota(el) {
  const contagem = (s) => estado.veiculos.filter((v) => v.status === s).length;
  el.innerHTML = `
    <div class="barra">
      <div class="legenda">
        <span><strong>${estado.veiculos.length}</strong> veículo(s)</span>
        <span>${seloStatusVeiculo("Disponivel")} <strong>${contagem("Disponivel")}</strong></span>
        <span>${seloStatusVeiculo("Em uso")} <strong>${contagem("Em uso")}</strong></span>
        <span>${seloStatusVeiculo("Manutencao")} <strong>${contagem("Manutencao")}</strong></span>
      </div>
      <button class="btn btn-primario" id="novo-veiculo">${icone("mais")} Novo veículo</button>
    </div>
    <section class="cartao">
      <div class="tabela-wrap"><table>
        <thead><tr><th>Placa</th><th>Modelo</th><th class="m-oculto">Cat.</th><th class="m-oculto">Aulas</th><th>Status</th><th><span class="sr">Ações</span></th></tr></thead>
        <tbody>${estado.veiculos.length ? estado.veiculos.map((v) => `
          <tr style="cursor:default">
            <td><span class="placa">${esc(formatarPlaca(v.placa))}</span></td>
            <td><strong>${esc(v.modelo)}</strong></td>
            <td class="m-oculto"><span class="cat">${esc(v.categoria)}</span></td>
            <td class="m-oculto mono">${estado.aulas.filter((a) => a.veiculo_id === v.id && a.status !== "Cancelada").length}</td>
            <td>${seloStatusVeiculo(v.status)}</td>
            <td><div class="acoes-linha">
              <button class="btn btn-fantasma btn-icone" data-editar="${v.id}" aria-label="Editar ${esc(v.modelo)}" title="Editar">${icone("lapis")}</button>
              <button class="btn btn-fantasma btn-icone" data-excluir="${v.id}" aria-label="Excluir ${esc(v.modelo)}" title="Excluir">${icone("lixo")}</button>
            </div></td>
          </tr>`).join("") : `<tr><td colspan="6" class="vazio">Nenhum veículo cadastrado.</td></tr>`}</tbody>
      </table></div>
    </section>`;

  document.getElementById("novo-veiculo").addEventListener("click", () => modalFormVeiculo());
  el.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () =>
    modalFormVeiculo(estado.veiculos.find((v) => v.id === Number(b.dataset.editar)))));
  el.querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", () => {
    const v = estado.veiculos.find((x) => x.id === Number(b.dataset.excluir));
    confirmarExclusao({
      titulo: "Excluir veículo?",
      texto: `O <strong>${esc(v.modelo)}</strong> (${esc(formatarPlaca(v.placa))}) será removido. As aulas que usavam esse veículo ficarão sem veículo definido.`,
      rotulo: "Excluir veículo",
      async acao() {
        await api("DELETE", `/api/veiculos/${v.id}`);
        toast(`Veículo ${esc(formatarPlaca(v.placa))} excluído.`);
        await recarregar();
      },
    });
  }));
}

function modalFormVeiculo(veiculo = null) {
  const editando = Boolean(veiculo);
  abrirModal({
    titulo: editando ? "Editar veículo" : "Novo veículo",
    corpo: `
      <form class="form-grade" novalidate>
        <div class="form-grade duas">
          <div class="campo"><label for="nv-placa">Placa *</label><input id="nv-placa" name="placa" placeholder="ABC1D23" maxlength="8" style="text-transform:uppercase" required value="${esc(formatarPlaca(veiculo?.placa))}"></div>
          <div class="campo"><label for="nv-cat">Categoria</label><select id="nv-cat" name="categoria">${opcoes(Object.fromEntries(CATEGORIAS.map((c) => [c, c])), veiculo?.categoria || "B")}</select></div>
        </div>
        <div class="campo"><label for="nv-modelo">Modelo *</label><input id="nv-modelo" name="modelo" placeholder="Ex.: Chevrolet Onix" required value="${esc(veiculo?.modelo)}"></div>
        <div class="campo"><label for="nv-status">Status</label><select id="nv-status" name="status">${opcoes(STATUS_VEICULO, veiculo?.status || "Disponivel")}</select>
          <small>Veículos em manutenção não podem ser usados em novas aulas.</small></div>
        <div class="form-erro oculto"></div>
        <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? "Salvar alterações" : "Cadastrar veículo"}</button></div>
      </form>`,
    aoAbrir(modal) {
      ligarFormulario(modal.querySelector("form"), async (d) => {
        const corpo = { placa: d.get("placa"), modelo: d.get("modelo"), categoria: d.get("categoria"), status: d.get("status") };
        const salvo = editando
          ? await api("PUT", `/api/veiculos/${veiculo.id}`, corpo)
          : await api("POST", "/api/veiculos", corpo);
        fecharModal();
        toast(`Veículo <strong>${esc(salvo.modelo)}</strong> ${editando ? "atualizado" : "cadastrado"}.`);
        await recarregar();
      });
    },
  });
}

/* --- Aulas práticas --- */
const filtroAulas = { inicio: hojeISO(), fim: somarDias(14), atalho: "proximas" };
const ATALHOS_AULA = {
  hoje: ["Hoje", () => [hojeISO(), hojeISO()]],
  proximas: ["Próximos 14 dias", () => [hojeISO(), somarDias(14)]],
  passadas: ["Últimos 30 dias", () => [somarDias(-30), hojeISO()]],
  todas: ["Todas", () => ["", ""]],
};

function paginaAulas(el) {
  el.innerHTML = `
    <div class="barra">
      <div class="filtros">
        <div class="campo"><label for="fa-inicio">Data inicial</label><input id="fa-inicio" type="date" value="${filtroAulas.inicio}"></div>
        <div class="campo"><label for="fa-fim">Data final</label><input id="fa-fim" type="date" value="${filtroAulas.fim}"></div>
        <div class="pilulas" style="padding-bottom:6px">${Object.entries(ATALHOS_AULA).map(([id, [rotulo]]) =>
          `<button class="pilula" data-atalho="${id}" aria-pressed="${filtroAulas.atalho === id}">${rotulo}</button>`).join("")}</div>
      </div>
      <button class="btn btn-primario" id="nova-aula">${icone("mais")} Agendar aula</button>
    </div>
    <section class="cartao">
      <div class="cartao-cab"><h2 id="resumo-aulas"></h2></div>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Data</th><th>Horário</th><th>Aluno</th><th class="m-oculto">Instrutor</th><th class="m-oculto">Veículo</th><th class="m-oculto">Cat.</th><th>Status</th><th><span class="sr">Ações</span></th></tr></thead>
        <tbody id="corpo-aulas"></tbody>
      </table></div>
    </section>`;

  const inicio = document.getElementById("fa-inicio");
  const fim = document.getElementById("fa-fim");
  const corpo = document.getElementById("corpo-aulas");

  function desenhar() {
    const lista = estado.aulas.filter((a) => (!filtroAulas.inicio || a.data >= filtroAulas.inicio) && (!filtroAulas.fim || a.data <= filtroAulas.fim));
    const realizadas = lista.filter((a) => a.status === "Realizada").length;
    document.getElementById("resumo-aulas").textContent = `${lista.length} aula(s) no período · ${realizadas} realizada(s)`;
    corpo.innerHTML = lista.length ? lista.map((a) => {
      const p = partesData(a.data);
      return `<tr style="cursor:default" ${a.data === hojeISO() ? 'class="hoje"' : ""}>
        <td><strong>${p.curta}</strong> <span class="mono" style="font-size:12px">${p.semana}</span></td>
        <td class="mono">${a.hora_inicio}–${a.hora_fim}</td>
        <td><strong>${esc(a.aluno_nome)}</strong></td>
        <td class="m-oculto">${esc(a.instrutor_nome)}</td>
        <td class="m-oculto">${a.veiculo_modelo ? `${esc(a.veiculo_modelo)} <span class="mono" style="font-size:12px">${esc(formatarPlaca(a.veiculo_placa))}</span>` : "—"}</td>
        <td class="m-oculto"><span class="cat">${esc(a.categoria)}</span></td>
        <td><select class="select-mini" data-status="${a.id}" aria-label="Status da aula de ${esc(a.aluno_nome)}">
          ${STATUS_AULA.map((s) => `<option ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
        <td><div class="acoes-linha"><button class="btn btn-fantasma btn-icone" data-excluir="${a.id}" aria-label="Excluir aula" title="Excluir aula">${icone("lixo")}</button></div></td>
      </tr>`;
    }).join("") : `<tr><td colspan="8" class="vazio">Nenhuma aula nesse período.</td></tr>`;
  }

  function aplicarDatas(atalho = null) {
    filtroAulas.inicio = inicio.value;
    filtroAulas.fim = fim.value;
    filtroAulas.atalho = atalho;
    el.querySelectorAll("[data-atalho]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.atalho === atalho));
    desenhar();
  }
  inicio.addEventListener("change", () => aplicarDatas());
  fim.addEventListener("change", () => aplicarDatas());
  el.querySelectorAll("[data-atalho]").forEach((b) => b.addEventListener("click", () => {
    [inicio.value, fim.value] = ATALHOS_AULA[b.dataset.atalho][1]();
    aplicarDatas(b.dataset.atalho);
  }));

  corpo.addEventListener("change", async (e) => {
    const id = e.target.dataset.status;
    if (!id) return;
    try {
      const aula = await api("PATCH", `/api/aulas/${id}`, { status: e.target.value });
      toast(`Aula de ${esc(aula.aluno_nome)} marcada como <strong>${esc(aula.status)}</strong>.`);
      await carregarDados();
      desenhar();
    } catch (erro) {
      toast(esc(erro.message), "erro");
    }
  });
  corpo.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-excluir]");
    if (!botao) return;
    const aula = estado.aulas.find((a) => a.id === Number(botao.dataset.excluir));
    confirmarExclusao({
      titulo: "Excluir aula?",
      texto: `A aula de <strong>${esc(aula.aluno_nome)}</strong> em ${partesData(aula.data).curta} (${aula.hora_inicio}–${aula.hora_fim}) será removida. Para manter o histórico, prefira mudar o status para “Cancelada”.`,
      rotulo: "Excluir aula",
      async acao() {
        await api("DELETE", `/api/aulas/${aula.id}`);
        toast("Aula excluída.");
        await recarregar();
      },
    });
  });

  document.getElementById("nova-aula").addEventListener("click", modalAgendarAula);
  desenhar();
}

function modalAgendarAula() {
  const alunos = estado.alunos.filter((a) => a.status === "Ativo");
  const instrutores = estado.instrutores.filter((i) => i.status === "Ativo");
  if (!alunos.length || !instrutores.length) {
    toast("É preciso ter pelo menos um aluno e um instrutor ativos.", "erro");
    return;
  }
  abrirModal({
    titulo: "Agendar aula prática",
    corpo: `
      <form class="form-grade" novalidate>
        <div class="campo"><label for="ag-aluno">Aluno *</label>
          <select id="ag-aluno" name="aluno_cpf">${alunos.map((a) => `<option value="${a.cpf}">${esc(a.nome)} · cat. ${esc(a.categoria)} · ${a.aulas_realizadas}/${a.carga_obrigatoria} aulas</option>`).join("")}</select></div>
        <div class="form-grade duas">
          <div class="campo"><label for="ag-instrutor">Instrutor *</label><select id="ag-instrutor" name="instrutor_id"></select></div>
          <div class="campo"><label for="ag-cat">Categoria</label><select id="ag-cat" name="categoria">${CATEGORIAS.map((c) => `<option>${c}</option>`).join("")}</select></div>
        </div>
        <div class="campo"><label for="ag-veiculo">Veículo</label><select id="ag-veiculo" name="veiculo_id"></select>
          <small>Aparecem os veículos da categoria escolhida que não estão em manutenção.</small></div>
        <div class="form-grade duas">
          <div class="campo"><label for="ag-data">Data *</label><input id="ag-data" name="data" type="date" required value="${somarDias(1)}" min="${hojeISO()}"></div>
          <div class="form-grade duas">
            <div class="campo"><label for="ag-ini">Início *</label><input id="ag-ini" name="hora_inicio" type="time" required value="08:00"></div>
            <div class="campo"><label for="ag-fim">Fim *</label><input id="ag-fim" name="hora_fim" type="time" required value="09:00"></div>
          </div>
        </div>
        <div class="form-erro oculto"></div>
        <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Agendar aula</button></div>
      </form>`,
    aoAbrir(modal) {
      const selAluno = modal.querySelector("#ag-aluno");
      const selCat = modal.querySelector("#ag-cat");
      const selInstrutor = modal.querySelector("#ag-instrutor");
      const selVeiculo = modal.querySelector("#ag-veiculo");
      const ini = modal.querySelector("#ag-ini");
      const fimAula = modal.querySelector("#ag-fim");

      // Aluno AB começa pelas aulas de carro (B); as listas seguem a categoria escolhida
      const categoriaDoAluno = () => {
        const cat = alunos.find((a) => a.cpf === selAluno.value)?.categoria || "B";
        return cat === "AB" ? "B" : cat;
      };
      function atualizarListas() {
        const cat = selCat.value;
        const aluno = alunos.find((a) => a.cpf === selAluno.value);
        const habilitados = instrutores.filter((i) => i.categorias.split(",").includes(cat));
        const atual = selInstrutor.value || String(aluno?.instrutor_id || "");
        selInstrutor.innerHTML = habilitados.length
          ? habilitados.map((i) => `<option value="${i.id}" ${String(i.id) === atual ? "selected" : ""}>${esc(i.nome)}${i.id === aluno?.instrutor_id ? " (instrutor do aluno)" : ""}</option>`).join("")
          : `<option value="">Nenhum instrutor habilitado na categoria ${cat}</option>`;
        const frota = estado.veiculos.filter((v) => v.categoria === cat && v.status !== "Manutencao");
        selVeiculo.innerHTML = `<option value="">Sem veículo definido</option>` +
          frota.map((v) => `<option value="${v.id}">${esc(v.modelo)} · ${esc(formatarPlaca(v.placa))}${v.status === "Em uso" ? " (em uso)" : ""}</option>`).join("");
        if (frota[0]) selVeiculo.value = String(frota[0].id);
      }
      selAluno.addEventListener("change", () => { selCat.value = categoriaDoAluno(); selInstrutor.value = ""; atualizarListas(); });
      selCat.addEventListener("change", atualizarListas);
      // Mantém 1h de duração ao trocar o início
      ini.addEventListener("change", () => {
        const [h, m] = ini.value.split(":").map(Number);
        if (!Number.isNaN(h)) fimAula.value = `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      });
      selCat.value = categoriaDoAluno();
      atualizarListas();

      ligarFormulario(modal.querySelector("form"), async (d) => {
        const resultado = await api("POST", "/api/aulas", {
          aluno_cpf: d.get("aluno_cpf"), instrutor_id: Number(d.get("instrutor_id")) || null,
          veiculo_id: Number(d.get("veiculo_id")) || null, categoria: d.get("categoria"),
          data: d.get("data"), hora_inicio: d.get("hora_inicio"), hora_fim: d.get("hora_fim"),
        });
        fecharModal();
        toast(`Aula agendada para ${partesData(d.get("data")).curta}, das ${d.get("hora_inicio")} às ${d.get("hora_fim")}.`);
        if (!resultado.whatsapp_enviado) toast("A aula foi salva, mas o aviso por WhatsApp não pôde ser enviado.", "erro");
        await recarregar();
      });
    },
  });
}

/* --- Provas --- */
function paginaProvas(el) {
  const ordenadas = [...estado.exames].sort((a, b) => a.data.localeCompare(b.data));
  el.innerHTML = `
    <div class="barra">
      <p class="mono">${ordenadas.length} prova(s) cadastrada(s)</p>
      <button class="btn btn-primario" id="marcar-prova">${icone("mais")} Marcar prova</button>
    </div>
    <div class="lista-provas">
      ${ordenadas.length ? ordenadas.map((e) => {
        const p = partesData(e.data);
        const dias = p ? diasAte(p.data) : null;
        return `
        <article class="cartao prova">
          ${blocoData(e.data)}
          <div class="prova-info">
            <div class="prova-linha">
              ${seloTipo(e.tipo)}
              <span class="prova-hora">${icone("relogio")}${p ? p.completa : esc(e.data)}</span>
              <span class="mono" style="font-size:13px">· ${textoQuando(dias)} · Prova nº ${e.id}</span>
            </div>
            ${e.local ? `<div class="mono" style="font-size:13px;margin-top:4px">${icone("aula", "icone icone-p")} ${esc(e.local)}</div>` : ""}
            ${e.alunos.length ? `<div class="lista-resultados">${e.alunos.map((a) => `
              <div class="linha-resultado">
                <span>${esc(a.nome)}</span>
                <select class="select-mini" data-prova="${e.id}" data-cpf="${esc(a.cpf)}" aria-label="Resultado de ${esc(a.nome)}">
                  <option value="N/C" ${a.aprovacao !== "aprovado" && a.aprovacao !== "desaprovado" ? "selected" : ""}>Aguardando</option>
                  <option value="aprovado" ${a.aprovacao === "aprovado" ? "selected" : ""}>Aprovado</option>
                  <option value="desaprovado" ${a.aprovacao === "desaprovado" ? "selected" : ""}>Reprovado</option>
                </select>
              </div>`).join("")}</div>` : `<div class="chips"><span class="mono" style="font-size:13px">Nenhum aluno vinculado</span></div>`}
          </div>
          <button class="btn btn-fantasma btn-icone" data-apagar="${e.id}" aria-label="Apagar prova ${e.id}" title="Apagar prova">${icone("lixo")}</button>
        </article>`;
      }).join("") : `<div class="cartao vazio">Nenhuma prova marcada. Clique em “Marcar prova” para agendar a primeira.</div>`}
    </div>`;

  document.getElementById("marcar-prova").addEventListener("click", modalMarcarProva);
  el.querySelectorAll("[data-apagar]").forEach((b) => b.addEventListener("click", () => modalApagarProva(Number(b.dataset.apagar))));
  el.querySelectorAll("select[data-prova]").forEach((s) => s.addEventListener("change", async () => {
    try {
      const aluno = await api("PUT", `/api/exames/${s.dataset.prova}/resultado`, { cpf: s.dataset.cpf, aprovacao: s.value });
      const texto = { aprovado: "aprovado(a)", desaprovado: "reprovado(a)" }[aluno.aprovacao] || "aguardando resultado";
      toast(`${esc(aluno.nome)}: ${texto}.`);
      await carregarDados();
    } catch (erro) {
      toast(esc(erro.message), "erro");
    }
  }));
}

function modalMarcarProva() {
  if (!estado.alunos.length) {
    toast("Cadastre alunos antes de marcar uma prova.", "erro");
    return;
  }
  const valorPadrao = `${somarDias(1)}T09:00`;
  const alunosOrdenados = estado.alunos.filter((a) => a.status === "Ativo")
    .sort((a, b) => Number(!!a.exame_id) - Number(!!b.exame_id) || a.nome.localeCompare(b.nome));

  abrirModal({
    titulo: "Marcar prova",
    corpo: `
      <form class="form-grade" novalidate>
        <div class="campo"><span style="font-size:13px;font-weight:600;color:var(--texto-2)">Tipo de prova</span>
          <div class="segmentado">
            <label><input type="radio" name="tipo" value="teorica" checked> Teórica</label>
            <label><input type="radio" name="tipo" value="pratica"> Prática</label>
          </div>
        </div>
        <div class="form-grade duas">
          <div class="campo"><label for="mp-data">Data e horário *</label><input id="mp-data" name="data" type="datetime-local" value="${valorPadrao}" required></div>
          <div class="campo"><label for="mp-local">Local</label><input id="mp-local" name="local" placeholder="Ex.: DETRAN-PE · Sede Recife" maxlength="100"></div>
        </div>
        <div class="campo">
          <label for="mp-busca">Alunos que farão a prova <span id="mp-contador" class="mono" style="font-weight:500"></span></label>
          <input id="mp-busca" placeholder="Filtrar alunos" autocomplete="off">
          <div class="lista-escolha" id="mp-lista">
            ${alunosOrdenados.map((a) => `
              <label data-nome="${esc(a.nome.toLowerCase())}">
                <input type="checkbox" name="cpfs" value="${esc(a.cpf)}">
                <span class="info">${esc(a.nome)}<small>${a.aulas_realizadas}/${a.carga_obrigatoria} aulas · ${a.exame_id ? `já tem prova ${a.exame_tipo === "pratica" ? "prática" : "teórica"} marcada (será substituída)` : "sem prova marcada"}</small></span>
              </label>`).join("")}
          </div>
          <small>Cada aluno selecionado recebe um aviso no WhatsApp.</small>
        </div>
        <div class="form-erro oculto"></div>
        <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Marcar prova</button></div>
      </form>`,
    aoAbrir(modal) {
      const contador = modal.querySelector("#mp-contador");
      modal.querySelector("#mp-lista").addEventListener("change", () => {
        const n = modal.querySelectorAll('input[name="cpfs"]:checked').length;
        contador.textContent = n ? `· ${n} selecionado(s)` : "";
      });
      modal.querySelector("#mp-busca").addEventListener("input", (e) => {
        const termo = e.target.value.trim().toLowerCase();
        modal.querySelectorAll("#mp-lista label").forEach((l) => l.classList.toggle("oculto", !l.dataset.nome.includes(termo)));
      });
      ligarFormulario(modal.querySelector("form"), async (d) => {
        const prova = await api("POST", "/api/exames", { tipo: d.get("tipo"), data: d.get("data"), local: d.get("local"), cpfs: d.getAll("cpfs") });
        fecharModal();
        toast(`Prova nº ${prova.id} marcada para ${partesData(prova.data)?.completa || prova.data}. ${prova.avisados} aluno(s) avisado(s).`);
        location.hash = "#/provas";
        await recarregar();
      });
    },
  });
}

function modalApagarProva(id) {
  const exame = estado.exames.find((e) => e.id === id);
  const p = partesData(exame?.data);
  confirmarExclusao({
    titulo: "Apagar prova?",
    texto: `A prova <strong>nº ${id}</strong> (${exame?.tipo === "pratica" ? "prática" : "teórica"}, ${p ? p.completa : ""}) será removida.
      ${exame?.alunos.length ? `Os ${exame.alunos.length} aluno(s) vinculados ficarão sem prova marcada.` : ""}`,
    rotulo: "Apagar prova",
    async acao() {
      await api("DELETE", `/api/exames/${id}`);
      toast(`Prova nº ${id} apagada.`);
      await recarregar();
    },
  });
}

/* --- Recepcionistas --- */
function paginaEquipe(el) {
  el.innerHTML = `
    <section class="cartao" style="max-width:560px">
      <div class="cartao-cab"><h2>Novo recepcionista</h2></div>
      <div class="cartao-corpo">
        <form class="form-grade" id="form-recep" novalidate>
          <div class="campo"><label for="nr-nome">Nome completo</label><input id="nr-nome" name="nome" required autocomplete="off"></div>
          <div class="campo"><label for="nr-cpf">CPF</label><input id="nr-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" required></div>
          <div class="campo"><label for="nr-senha">Senha de acesso</label><input id="nr-senha" name="senha" type="password" autocomplete="new-password" minlength="6" required>
            <small>Mínimo de 6 caracteres. A senha é guardada criptografada (bcrypt).</small></div>
          <div class="form-erro oculto"></div>
          <div><button type="submit" class="btn btn-primario">Cadastrar recepcionista</button></div>
        </form>
      </div>
    </section>`;
  const form = document.getElementById("form-recep");
  mascaraCPF(form.querySelector("#nr-cpf"));
  ligarFormulario(form, async (d) => {
    const r = await api("POST", "/api/recepcionistas", { nome: d.get("nome"), cpf: d.get("cpf"), senha: d.get("senha") });
    form.reset();
    toast(`Recepcionista <strong>${esc(r.nome)}</strong> cadastrado. Já pode entrar com o CPF e a senha.`);
  });
}

/* ---------- Portais (aluno e instrutor) ---------- */

function cabecalhoPortal(papel) {
  return `
    <header class="portal-topo"><div class="interno">
      <div class="marca"><span class="marca-icone">${icone("volante")}</span> Auto Escola</div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="selo" style="background:#ffffff1a;color:#fff">${papel}</span>
        <button class="btn btn-fantasma" id="btn-sair">${icone("sair")} Sair</button>
      </div>
    </div></header>`;
}

function tabelaAulas(aulas, { mostrarAluno = false, mostrarInstrutor = true } = {}) {
  if (!aulas.length) return `<p class="vazio">Nenhuma aula por aqui.</p>`;
  return `<div class="tabela-wrap"><table>
    <thead><tr><th>Data</th><th>Horário</th>${mostrarAluno ? "<th>Aluno</th>" : ""}${mostrarInstrutor ? '<th class="m-oculto">Instrutor</th>' : ""}<th class="m-oculto">Veículo</th><th class="m-oculto">Cat.</th><th>Status</th></tr></thead>
    <tbody>${aulas.map((a) => {
      const p = partesData(a.data);
      return `<tr style="cursor:default">
        <td><strong>${a.data === hojeISO() ? "Hoje" : p.curta}</strong> <span class="mono" style="font-size:12px">${p.semana}</span></td>
        <td class="mono">${a.hora_inicio}–${a.hora_fim}</td>
        ${mostrarAluno ? `<td><strong>${esc(a.aluno_nome)}</strong></td>` : ""}
        ${mostrarInstrutor ? `<td class="m-oculto">${esc(a.instrutor_nome)}</td>` : ""}
        <td class="m-oculto">${a.veiculo_modelo ? `${esc(a.veiculo_modelo)} <span class="mono" style="font-size:12px">${esc(formatarPlaca(a.veiculo_placa))}</span>` : "—"}</td>
        <td class="m-oculto"><span class="cat">${esc(a.categoria)}</span></td>
        <td>${seloStatusAula(a.status)}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

/* --- Aluno --- */
async function telaAluno(aba = "jornada") {
  let a;
  try {
    a = await api("GET", "/api/portal/aluno");
  } catch (erro) {
    toast(esc(erro.message), "erro");
    return;
  }
  estado.usuario = a;
  document.title = "Minha área · Auto Escola";

  app.innerHTML = `
    ${cabecalhoPortal("Aluno")}
    <section class="portal-hero"><div class="interno">
      <h1>Olá, ${esc(a.nome.split(" ")[0])}!</h1>
      <p>Categoria ${esc(NOME_CATEGORIA[a.categoria] || a.categoria)} · Instrutor(a): ${esc(a.instrutor_nome || "a definir")}</p>
      <div class="portal-abas" role="tablist">
        <button role="tab" data-aba="jornada" aria-selected="${aba === "jornada"}">${icone("aula")} Minha jornada</button>
        <button role="tab" data-aba="exames" aria-selected="${aba === "exames"}">${icone("guia")} Guia exames</button>
        <button role="tab" data-aba="guia" aria-selected="${aba === "guia"}">${icone("guia")} Guia prova prática</button>
      </div>
    </div></section>
    <main class="portal-conteudo" id="conteudo-portal"></main>`;

  document.getElementById("btn-sair").addEventListener("click", sair);
  app.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => {
    app.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-selected", x === b));
    desenharAbaAluno(b.dataset.aba, a);
  }));
  desenharAbaAluno(aba, a);
}

function desenharAbaAluno(aba, a) {
  const el = document.getElementById("conteudo-portal");
  const realizadas = a.aulas.filter((x) => x.status === "Realizada").length;
  const agendadas = a.aulas.filter((x) => x.status === "Agendada" && x.data >= hojeISO());
  const restantes = Math.max(0, a.carga_obrigatoria - realizadas);
  const pct = Math.min(100, Math.round((realizadas / a.carga_obrigatoria) * 100));
  const apto = realizadas >= a.carga_obrigatoria;

  if (aba === "guia") {
    el.innerHTML = guiaDetran({ apto, realizadas, total: a.carga_obrigatoria });
    return;
  }
  if (aba === "exames") {
    el.innerHTML = guiaExames();
    return;
  }

  const p = partesData(a.exame_data);
  const dias = p ? diasAte(p.data) : null;
  let contagem = "";
  if (dias !== null) {
    contagem = dias > 1 ? `Faltam <strong>${dias} dias</strong>` : dias === 1 ? "<strong>É amanhã!</strong>" : dias === 0 ? "<strong>É hoje!</strong> Boa prova." : "Prova já realizada";
  }
  const situacao = a.aprovacao === "aprovado" ? "Aprovado(a) 🏆" : apto ? "Apto(a) para o exame" : a.status === "Concluido" ? "Concluído" : "Em formação";

  el.innerHTML = `
    <section class="cartao cartao-progresso">
      <div class="topo-prog">
        <div><h2>Carga horária de aulas práticas</h2><p class="grafico-sub">${realizadas} de ${a.carga_obrigatoria} aulas obrigatórias para a categoria ${esc(a.categoria)}</p></div>
        <span class="pct">${pct}%</span>
      </div>
      <div class="progresso" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      <dl class="numeros">
        <div><dt>Realizadas</dt><dd>${realizadas}</dd></div>
        <div><dt>Agendadas</dt><dd>${agendadas.length}</dd></div>
        <div><dt>Restantes</dt><dd>${restantes}</dd></div>
        <div><dt>Situação</dt><dd style="font-size:15px;margin-top:6px">${situacao}</dd></div>
      </dl>
    </section>

    <div class="portal-grade">
      <section class="cartao">
        ${a.exame_id ? `
        <div class="destaque-prova">
          ${blocoData(a.exame_data)}
          <div>
            ${seloTipo(a.exame_tipo)} ${seloAprovacao(a.aprovacao)}
            <h2>Prova ${a.exame_tipo === "pratica" ? "prática" : "teórica"}</h2>
            <div class="prova-hora">${icone("relogio")} ${p ? p.completa : esc(a.exame_data)}</div>
            ${a.exame_local ? `<div class="prova-hora" style="margin-top:4px">${icone("aula")} ${esc(a.exame_local)}</div>` : ""}
            <p class="contagem" style="margin-top:8px">${contagem}</p>
          </div>
        </div>` : `
        <div class="sem-prova">
          <div class="estat-icone cinza">${icone("prova")}</div>
          <div><strong style="color:var(--texto)">Nenhuma prova marcada</strong><br>Quando sua prova for agendada, você recebe um aviso no WhatsApp. Veja como agendar no <button class="link" id="ir-guia">Guia prova prática</button>.</div>
        </div>`}
      </section>
      <section class="cartao">
        <div class="cartao-cab"><h2>Próxima aula</h2></div>
        <div class="cartao-corpo">
          ${agendadas[0] ? `<div class="pessoa"><span class="avatar grande">${esc(partesData(agendadas[0].data).dia)}</span>
            <div style="font-size:17px">${agendadas[0].data === hojeISO() ? "Hoje" : `${partesData(agendadas[0].data).semana}, ${partesData(agendadas[0].data).curta}`}
            <small>${agendadas[0].hora_inicio}–${agendadas[0].hora_fim} · ${esc(agendadas[0].instrutor_nome)}${agendadas[0].veiculo_modelo ? ` · ${esc(agendadas[0].veiculo_modelo)}` : ""}</small></div></div>`
          : `<p class="mono">Nenhuma aula agendada. Procure a recepção para marcar.</p>`}
        </div>
      </section>
    </div>

    <section class="cartao">
      <div class="cartao-cab"><h2>Minhas aulas</h2><span class="grafico-sub">${a.aulas.length} no total</span></div>
      ${tabelaAulas([...a.aulas].reverse())}
    </section>`;

  document.getElementById("ir-guia")?.addEventListener("click", () => app.querySelector('[data-aba="guia"]').click());
}

// Passo a passo para o aluno marcar a prova prática. Sem `progresso` (recepção e
// instrutor), o primeiro passo fica genérico em vez de mostrar as aulas do aluno.
function guiaDetran(progresso = null) {
  const apto = progresso?.apto ?? false;
  const passos = [
    ["Conclua a carga horária na auto escola",
      progresso
        ? `Todas as aulas práticas obrigatórias precisam estar realizadas e lançadas pela recepção. Você já fez <strong>${progresso.realizadas} de ${progresso.total}</strong>.`
        : "Todas as aulas práticas obrigatórias da categoria precisam estar realizadas e lançadas pela recepção no sistema.",
      progresso
        ? "Confira o total de aulas realizadas na aba “Minha jornada”."
        : "O aluno acompanha as aulas realizadas na aba “Minha jornada” do portal dele."],
    ["Entre no portal do DETRAN com a conta GOV.BR",
      "Acesse o site do DETRAN do seu estado e clique em “Entrar com gov.br”, usando seu CPF e a senha do portal federal.",
      "A conta precisa ser nível Prata ou Ouro. Se for Bronze, faça a validação facial ou pelo banco no app gov.br."],
    ["Emita a taxa do exame prático",
      "No painel do cidadão, vá em Habilitação › 1ª Habilitação / Adição de Categoria › Agendamento de Exame Prático e emita a taxa pendente.",
      "Pagamentos por PIX costumam ser compensados em poucos minutos."],
    ["Escolha o posto, a data e o horário",
      "Com a taxa compensada, o calendário de vagas é liberado. Escolha a unidade mais próxima, confirme o agendamento e <strong>imprima a requisição do exame prático</strong>.",
      "A requisição impressa é obrigatória no dia da prova. Guarde também o número do protocolo."],
    ["Avise a auto escola",
      "Envie a confirmação para a recepção, para reservarmos o veículo da sua categoria e o instrutor para o dia do exame.",
      "No dia, leve a <strong>requisição impressa</strong> e a <strong>identidade</strong>, vá de <strong>sapato fechado</strong> (chinelo e sandália não são aceitos) e chegue 30 minutos antes."],
  ];
  return guiaPassoAPasso({
    titulo: "Agendamento oficial pelo DETRAN",
    texto: "Depois de cumprir a carga mínima de aulas práticas, você mesmo agenda o exame prático pelo portal do DETRAN, usando sua conta GOV.BR (nível Prata ou Ouro).",
    link: "https://www.detran.pe.gov.br/prova-pratica-reteste",
    passos,
    primeiroFeito: apto,
  });
}

// Passo a passo para marcar o exame médico e o psicológico (primeira etapa da habilitação).
function guiaExames() {
  const passos = [
    ["Abra o processo de habilitação",
      "O exame médico e o psicológico são a primeira etapa da 1ª habilitação. Antes de agendar, o processo (RENACH) precisa estar aberto no DETRAN, com a taxa paga.",
      "Na dúvida se o processo já foi aberto, fale com a recepção da auto escola."],
    ["Acesse a página de exames do DETRAN-PE",
      "Entre na página de exames psico-médicos do DETRAN-PE pelo botão acima e escolha a opção de agendamento, informando o CPF do candidato.",
      "Use somente o site oficial do DETRAN para agendar."],
    ["Escolha a clínica, a data e o horário",
      "Selecione uma clínica credenciada pelo DETRAN perto de você e um horário livre. Os dois exames costumam ser feitos na mesma clínica e no mesmo dia.",
      "Depois de confirmar, <strong>imprima a requisição dos exames</strong>: ela é obrigatória no dia. Guarde também o número do protocolo."],
    ["Compareça aos exames",
      "No médico são avaliados visão, audição e pressão. No psicológico, testes de atenção, memória e raciocínio, além de uma entrevista.",
      "Leve a <strong>requisição impressa</strong> e a <strong>identidade</strong> e, se usar, óculos ou lentes. Durma bem na noite anterior e chegue com 15 minutos de antecedência."],
    ["Confira o resultado e avise a auto escola",
      "A clínica lança o resultado no sistema do DETRAN. Com “apto” nos dois exames, você segue para as aulas e para a prova teórica.",
      "Se o resultado for “inapto temporário”, a clínica informa o que fazer e quando refazer o exame."],
  ];
  return guiaPassoAPasso({
    titulo: "Exame médico e psicológico",
    texto: "Antes das aulas e das provas, todo candidato à CNH faz o exame médico e o psicológico em uma clínica credenciada pelo DETRAN. O agendamento é feito pelo portal do DETRAN-PE.",
    link: "https://www.detran.pe.gov.br/exames-psico-medicos",
    passos,
  });
}

function guiaPassoAPasso({ titulo, texto, link, passos, primeiroFeito = false }) {
  return `
    <section class="banner-gov">
      <div><h2>${titulo}</h2><p>${texto}</p></div>
      <a class="btn" href="${link}" target="_blank" rel="noopener noreferrer">${icone("externo")} Acessar DETRAN-PE</a>
    </section>
    <div class="passos">
      ${passos.map(([tituloPasso, textoPasso, dicaPasso], n) => `
        <article class="cartao passo ${n === 0 && primeiroFeito ? "feito" : ""}">
          <div class="passo-num">${n === 0 && primeiroFeito ? "✓" : n + 1}</div>
          <div><h3>${tituloPasso}</h3><p>${textoPasso}</p><div class="dica">${dicaPasso}</div></div>
        </article>`).join("")}
    </div>`;
}

/* --- Instrutor --- */
async function telaInstrutor(aba = "agenda") {
  let i;
  try {
    i = await api("GET", "/api/portal/instrutor");
  } catch (erro) {
    toast(esc(erro.message), "erro");
    return;
  }
  estado.usuario = i;
  const hoje = hojeISO();
  const proximas = i.aulas.filter((a) => a.data >= hoje && a.status === "Agendada");
  const aulasHoje = proximas.filter((a) => a.data === hoje);
  const comProva = i.alunos.filter((a) => a.exame_id);
  const realizadasPorAluno = (id) => i.aulas.filter((a) => a.aluno_id === id && a.status === "Realizada").length;
  document.title = "Minha agenda · Auto Escola";

  app.innerHTML = `
    ${cabecalhoPortal("Instrutor")}
    <section class="portal-hero"><div class="interno">
      <h1>Olá, ${esc(i.nome.split(" ")[0])}!</h1>
      <p>${aulasHoje.length ? `Você tem ${aulasHoje.length} aula(s) hoje.` : "Nenhuma aula hoje."} ${i.alunos.length} aluno(s), ${comProva.length} com prova marcada.</p>
      <div class="portal-abas" role="tablist">
        <button role="tab" data-aba="agenda" aria-selected="${aba === "agenda"}">${icone("aula")} Minha agenda</button>
        <button role="tab" data-aba="exames" aria-selected="${aba === "exames"}">${icone("guia")} Guia exames</button>
        <button role="tab" data-aba="guia" aria-selected="${aba === "guia"}">${icone("guia")} Guia prova prática</button>
      </div>
    </div></section>
    <main class="portal-conteudo" id="conteudo-portal"></main>`;

  const agenda = `
      <section class="cartao">
        <div class="cartao-cab"><h2>Próximas aulas</h2><span class="grafico-sub">${proximas.length} agendada(s)</span></div>
        ${tabelaAulas(proximas, { mostrarAluno: true, mostrarInstrutor: false })}
      </section>
      <section class="cartao">
        <div class="cartao-cab"><h2>Meus alunos</h2></div>
        ${i.alunos.length ? `<div class="tabela-wrap"><table>
          <thead><tr><th>Aluno</th><th>Cat.</th><th class="m-oculto">Aulas</th><th class="m-oculto">Prova</th><th>Resultado</th></tr></thead>
          <tbody>${i.alunos.map((a) => {
            const p = partesData(a.exame_data);
            return `<tr style="cursor:default">
              <td><div class="pessoa"><span class="avatar">${esc(iniciais(a.nome))}</span>${esc(a.nome)}</div></td>
              <td><span class="cat">${esc(a.categoria)}</span></td>
              <td class="m-oculto">${barraProgresso(realizadasPorAluno(a.id), a.carga_obrigatoria)}</td>
              <td class="m-oculto">${a.exame_id ? `${seloTipo(a.exame_tipo)} <span class="mono">${p ? p.completa : ""}</span>` : `<span class="mono">Sem prova</span>`}</td>
              <td>${a.exame_id ? seloAprovacao(a.aprovacao) : "—"}</td>
            </tr>`;
          }).join("")}</tbody></table></div>` : `<p class="vazio">Sem alunos.</p>`}
      </section>`;

  const desenharAba = (qual) => {
    document.getElementById("conteudo-portal").innerHTML = qual === "guia" ? guiaDetran() : qual === "exames" ? guiaExames() : agenda;
  };
  document.getElementById("btn-sair").addEventListener("click", sair);
  app.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => {
    app.querySelectorAll("[data-aba]").forEach((x) => x.setAttribute("aria-selected", x === b));
    desenharAba(b.dataset.aba);
  }));
  desenharAba(aba);
}

/* ---------- Início ---------- */

(async function iniciar() {
  try {
    const status = await api("GET", "/api/status");
    estado.demo = status.demo;
    if (status.recepcionista) {
      estado.perfil = "recepcionista";
      estado.usuario = status.recepcionista;
      return abrirSistema();
    }
    if (status.aluno) {
      estado.perfil = "aluno";
      return telaAluno();
    }
    if (status.instrutor) {
      estado.perfil = "instrutor";
      return telaInstrutor();
    }
  } catch {
    toast("Não foi possível conectar à API. Inicie o servidor com: python src/api.py --demo", "erro");
  }
  telaLogin();
})();
