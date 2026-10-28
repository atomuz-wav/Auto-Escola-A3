"""API web da Auto Escola: serve o front end (pasta frontend/) e expoe os repositorios em JSON

Uso:
    python src/api.py          -> usa o MySQL configurado em config/config.yml
    python src/api.py --demo   -> usa SQLite com dados de exemplo (nao precisa de MySQL)
"""

import os
import re
import sys
from datetime import date
from functools import wraps
from flask import Flask, jsonify, request, session, send_from_directory

if "--demo" in sys.argv:
    os.environ["AUTOESCOLA_DEMO"] = "1"

from config.Database import Database
from utils.Validador import Validador
from service.TwilioService import TwilioService
from repository.AlunoRepository import AlunoRepository
from repository.InstrutorRepository import InstrutorRepository
from repository.RecepcionistaRepository import RecepcionistaRepository
from repository.ExameRepository import ExameRepository
from repository.VeiculoRepository import VeiculoRepository
from repository.AulaRepository import AulaRepository

PASTA_FRONTEND = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend"))

app = Flask(__name__, static_folder=PASTA_FRONTEND, static_url_path="")
app.secret_key = os.environ.get("AUTOESCOLA_SECRET", os.urandom(24))

validador = Validador()

CATEGORIAS = ("A", "B", "AB", "C", "D", "E")
STATUS_ALUNO = ("Ativo", "Concluido", "Inativo")
STATUS_INSTRUTOR = ("Ativo", "Inativo")
STATUS_VEICULO = ("Disponivel", "Em uso", "Manutencao")
# Aulas praticas obrigatorias por categoria (as demais usam 20)
CARGA_HORARIA = {"A": 15, "AB": 40}


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def dados_requisicao():
    return request.get_json(silent=True) or {}


def somente_digitos(texto):
    return validador.somente_digitos(str(texto or ""))


def cpf_ok(cpf):
    return cpf.isnumeric() and validador.cpf_valido(cpf)


def nome_ok(nome):
    return bool(nome) and nome.replace(" ", "").isalpha()


def email_ok(email):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email or ""))


def data_ok(texto):
    try:
        date.fromisoformat(texto)
        return True
    except (TypeError, ValueError):
        return False


def hora_ok(texto):
    return bool(re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", texto or ""))


def normalizar_categorias(texto):
    """'b, a' -> 'A,B' mantendo a ordem de CATEGORIAS; None se tiver categoria invalida"""
    itens = {c.strip().upper() for c in str(texto or "").split(",") if c.strip()}
    if not itens or not itens <= set(CATEGORIAS):
        return None
    return ",".join(c for c in CATEGORIAS if c in itens)


def carga_obrigatoria(categoria):
    return CARGA_HORARIA.get(categoria, 20)


def enviar_whatsapp(numero, mensagem):
    """Envia (ou simula, no modo demo) e nunca derruba a requisicao"""
    try:
        TwilioService().enviar_whatsapp(numero, mensagem)
        return True
    except Exception as e:
        print(f"Falha ao enviar WhatsApp: {e}")
        return False


def requer_recepcionista(funcao):
    @wraps(funcao)
    def verificar(*args, **kwargs):
        if not session.get("recepcionista"):
            return erro("Faça login como recepcionista", 401)
        return funcao(*args, **kwargs)
    return verificar


@app.get("/")
def index():
    return send_from_directory(PASTA_FRONTEND, "index.html")


@app.get("/api/status")
def status():
    return jsonify({
        "demo": Database.modo_demo(),
        "recepcionista": session.get("recepcionista"),
        "aluno": session.get("aluno"),
        "instrutor": session.get("instrutor"),
    })


# ---------- Login ----------

@app.post("/api/login/recepcionista")
def login_recepcionista():
    dados = dados_requisicao()
    cpf = somente_digitos(dados.get("cpf"))
    senha = dados.get("senha") or ""

    if not cpf_ok(cpf) or not senha:
        return erro("Informe um CPF válido e a senha")

    repository = RecepcionistaRepository()
    if not repository.login(cpf, senha):
        return erro("CPF ou senha incorretos", 401)

    registro = repository.buscar_por_cpf(cpf)
    session.clear()
    session["recepcionista"] = {"cpf": cpf, "nome": registro[2] if registro else "Recepcionista"}
    return jsonify(session["recepcionista"])


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.post("/api/login/aluno")
def login_aluno():
    """Aluno entra com o CPF ou com o e-mail"""
    identificador = (dados_requisicao().get("cpf") or "").strip()
    repository = AlunoRepository()

    cpf = repository.buscar_cpf_por_email(identificador) if "@" in identificador else somente_digitos(identificador)
    aluno = repository.buscar_dados(cpf) if cpf and cpf_ok(cpf) else None

    if not aluno:
        return erro("Aluno não encontrado", 404)

    session.clear()
    session["aluno"] = cpf
    return jsonify(aluno)


@app.post("/api/login/instrutor")
def login_instrutor():
    cpf = somente_digitos(dados_requisicao().get("cpf"))
    instrutor = InstrutorRepository().buscar_por_cpf(cpf) if cpf_ok(cpf) else None

    if not instrutor:
        return erro("Instrutor não encontrado", 404)

    session.clear()
    session["instrutor"] = cpf
    return jsonify({"cpf": cpf, "nome": instrutor[2]})


# ---------- Portais (aluno e instrutor) ----------

@app.get("/api/portal/aluno")
def portal_aluno():
    cpf = session.get("aluno")
    aluno = AlunoRepository().buscar_dados(cpf) if cpf else None
    if not aluno:
        return erro("Faça login como aluno", 401)

    aluno["aulas"] = AulaRepository().listar(aluno_id=aluno["id"])
    aluno["carga_obrigatoria"] = carga_obrigatoria(aluno["categoria"])
    return jsonify(aluno)


@app.get("/api/portal/instrutor")
def portal_instrutor():
    cpf = session.get("instrutor")
    instrutor = InstrutorRepository().buscar_por_cpf(cpf) if cpf else None
    if not instrutor:
        return erro("Faça login como instrutor", 401)

    alunos = [a for a in AlunoRepository().listar_todos() if a["instrutor_id"] == instrutor[0]]
    for aluno in alunos:
        aluno["carga_obrigatoria"] = carga_obrigatoria(aluno["categoria"])

    return jsonify({
        "id": instrutor[0], "cpf": instrutor[1], "nome": instrutor[2],
        "alunos": alunos,
        "aulas": AulaRepository().listar(instrutor_id=instrutor[0]),
    })


# ---------- Alunos ----------

def validar_aluno(dados, cpf_atual=None):
    """Valida os campos de cadastro/edicao; retorna (campos, mensagem_de_erro)"""
    campos = {
        "nome": (dados.get("nome") or "").strip(),
        "celular": somente_digitos(dados.get("celular")),
        "email": (dados.get("email") or "").strip().lower(),
        "categoria": dados.get("categoria") or "B",
        "status": dados.get("status") or "Ativo",
        "instrutor_id": dados.get("instrutor_id"),
    }

    if not nome_ok(campos["nome"]):
        return campos, "O nome deve conter apenas letras"
    if campos["celular"].startswith("55") and len(campos["celular"]) in (12, 13):
        campos["celular"] = campos["celular"][2:]
    if len(campos["celular"]) not in (10, 11):
        return campos, "Celular inválido: informe DDD + número"
    if not email_ok(campos["email"]):
        return campos, "E-mail inválido"
    dono_email = AlunoRepository().buscar_cpf_por_email(campos["email"])
    if dono_email and dono_email != cpf_atual:
        return campos, "Esse e-mail já pertence a outro aluno"
    if campos["categoria"] not in CATEGORIAS:
        return campos, "Categoria inválida"
    if campos["status"] not in STATUS_ALUNO:
        return campos, "Status inválido"
    if not any(i["id"] == campos["instrutor_id"] for i in InstrutorRepository().listar_todos()):
        return campos, "Selecione um instrutor válido"
    return campos, None


@app.get("/api/alunos")
@requer_recepcionista
def listar_alunos():
    alunos = AlunoRepository().listar_todos()
    aulas = AulaRepository().listar()
    for aluno in alunos:
        aluno["aulas_realizadas"] = sum(1 for a in aulas if a["aluno_id"] == aluno["id"] and a["status"] == "Realizada")
        aluno["carga_obrigatoria"] = carga_obrigatoria(aluno["categoria"])
    return jsonify(alunos)


@app.get("/api/alunos/<cpf>")
@requer_recepcionista
def consultar_aluno(cpf):
    aluno = AlunoRepository().buscar_dados(somente_digitos(cpf))
    if not aluno:
        return erro("Aluno não encontrado", 404)

    aluno["aulas"] = AulaRepository().listar(aluno_id=aluno["id"])
    aluno["carga_obrigatoria"] = carga_obrigatoria(aluno["categoria"])
    return jsonify(aluno)


@app.post("/api/alunos")
@requer_recepcionista
def cadastrar_aluno():
    dados = dados_requisicao()
    cpf = somente_digitos(dados.get("cpf"))
    if not cpf_ok(cpf):
        return erro("CPF inválido")

    campos, mensagem = validar_aluno(dados)
    if mensagem:
        return erro(mensagem)

    repository = AlunoRepository()
    if repository.buscar_dados(cpf):
        return erro("Já existe um aluno com esse CPF", 409)

    numero = "55" + campos["celular"]
    repository.salvar(cpf, campos["nome"], campos["instrutor_id"], numero)
    if not repository.buscar_dados(cpf):
        return erro("Não foi possível salvar o aluno no banco de dados", 500)
    repository.completar_cadastro(cpf, campos["email"], campos["categoria"], campos["status"], date.today().isoformat())
    aluno = repository.buscar_dados(cpf)

    msg = f"Olá {campos['nome']},estamos muito felizes de receber você ,seu professor será {aluno['instrutor_nome']}"
    aluno["whatsapp_enviado"] = enviar_whatsapp(numero, msg)
    return jsonify(aluno), 201


@app.put("/api/alunos/<cpf>")
@requer_recepcionista
def editar_aluno(cpf):
    cpf = somente_digitos(cpf)
    repository = AlunoRepository()
    if not repository.buscar_dados(cpf):
        return erro("Aluno não encontrado", 404)

    campos, mensagem = validar_aluno(dados_requisicao(), cpf_atual=cpf)
    if mensagem:
        return erro(mensagem)

    repository.atualizar(cpf, campos["nome"], "55" + campos["celular"], campos["email"],
                         campos["categoria"], campos["status"], campos["instrutor_id"])
    return jsonify(repository.buscar_dados(cpf))


@app.delete("/api/alunos/<cpf>")
@requer_recepcionista
def excluir_aluno(cpf):
    cpf = somente_digitos(cpf)
    repository = AlunoRepository()
    aluno = repository.buscar_dados(cpf)
    if not aluno:
        return erro("Aluno não encontrado", 404)

    # No MySQL as aulas saem pelo ON DELETE CASCADE; aqui garante para bancos antigos
    Database.cursor_execute_commit("delete from aula where aluno_id = %s", (aluno["id"],))
    repository.deletar(cpf)
    return jsonify({"ok": True})


# ---------- Instrutores ----------

def validar_instrutor(dados):
    campos = {
        "nome": (dados.get("nome") or "").strip(),
        "telefone": somente_digitos(dados.get("telefone")),
        "categorias": normalizar_categorias(dados.get("categorias")),
        "status": dados.get("status") or "Ativo",
    }
    if not nome_ok(campos["nome"]):
        return campos, "O nome deve conter apenas letras"
    if campos["telefone"] and len(campos["telefone"]) not in (10, 11):
        return campos, "Telefone inválido: informe DDD + número"
    if not campos["categorias"]:
        return campos, "Selecione ao menos uma categoria habilitada"
    if campos["status"] not in STATUS_INSTRUTOR:
        return campos, "Status inválido"
    return campos, None


@app.get("/api/instrutores")
@requer_recepcionista
def listar_instrutores():
    return jsonify(InstrutorRepository().listar_todos())


@app.get("/api/instrutores/<cpf>")
@requer_recepcionista
def consultar_instrutor(cpf):
    cpf = somente_digitos(cpf)
    instrutor = next((i for i in InstrutorRepository().listar_todos() if i["cpf"] == cpf), None)
    if not instrutor:
        return erro("Instrutor não encontrado", 404)

    instrutor["alunos"] = [a for a in AlunoRepository().listar_todos() if a["instrutor_id"] == instrutor["id"]]
    return jsonify(instrutor)


@app.post("/api/instrutores")
@requer_recepcionista
def cadastrar_instrutor():
    dados = dados_requisicao()
    cpf = somente_digitos(dados.get("cpf"))
    if not cpf_ok(cpf):
        return erro("CPF inválido")

    campos, mensagem = validar_instrutor(dados)
    if mensagem:
        return erro(mensagem)

    repository = InstrutorRepository()
    if repository.buscar_por_cpf(cpf):
        return erro("Já existe um instrutor com esse CPF", 409)

    repository.salvar(cpf, campos["nome"])
    if not repository.buscar_por_cpf(cpf):
        return erro("Não foi possível salvar o instrutor no banco de dados", 500)
    repository.completar_cadastro(cpf, campos["telefone"] or None, campos["categorias"], campos["status"])
    return jsonify({"cpf": cpf, "nome": campos["nome"]}), 201


@app.put("/api/instrutores/<cpf>")
@requer_recepcionista
def editar_instrutor(cpf):
    cpf = somente_digitos(cpf)
    repository = InstrutorRepository()
    if not repository.buscar_por_cpf(cpf):
        return erro("Instrutor não encontrado", 404)

    campos, mensagem = validar_instrutor(dados_requisicao())
    if mensagem:
        return erro(mensagem)

    repository.atualizar(cpf, campos["nome"], campos["telefone"] or None, campos["categorias"], campos["status"])
    return jsonify({"cpf": cpf, "nome": campos["nome"]})


@app.delete("/api/instrutores/<cpf>")
@requer_recepcionista
def excluir_instrutor(cpf):
    cpf = somente_digitos(cpf)
    repository = InstrutorRepository()
    if not repository.buscar_por_cpf(cpf):
        return erro("Instrutor não encontrado", 404)

    repository.deletar(cpf)
    return jsonify({"ok": True})


# ---------- Veículos ----------

def validar_veiculo(dados, id_atual=None):
    campos = {
        "placa": re.sub(r"[^A-Z0-9]", "", str(dados.get("placa") or "").upper()),
        "modelo": (dados.get("modelo") or "").strip(),
        "categoria": dados.get("categoria") or "B",
        "status": dados.get("status") or "Disponivel",
    }
    # Placa antiga (ABC1234) ou Mercosul (ABC1D23)
    if not re.fullmatch(r"[A-Z]{3}\d[A-Z0-9]\d{2}", campos["placa"]):
        return campos, "Placa inválida (use ABC-1234 ou ABC1D23)"
    existente = VeiculoRepository().buscar_por_placa(campos["placa"])
    if existente and existente["id"] != id_atual:
        return campos, "Já existe um veículo com essa placa"
    if len(campos["modelo"]) < 2:
        return campos, "Informe o modelo do veículo"
    if campos["categoria"] not in CATEGORIAS:
        return campos, "Categoria inválida"
    if campos["status"] not in STATUS_VEICULO:
        return campos, "Status inválido"
    return campos, None


@app.get("/api/veiculos")
@requer_recepcionista
def listar_veiculos():
    return jsonify(VeiculoRepository().listar_todos())


@app.post("/api/veiculos")
@requer_recepcionista
def cadastrar_veiculo():
    campos, mensagem = validar_veiculo(dados_requisicao())
    if mensagem:
        return erro(mensagem)

    repository = VeiculoRepository()
    repository.salvar(campos["placa"], campos["modelo"], campos["categoria"], campos["status"])
    veiculo = repository.buscar_por_placa(campos["placa"])
    if not veiculo:
        return erro("Não foi possível salvar o veículo no banco de dados", 500)
    return jsonify(veiculo), 201


@app.put("/api/veiculos/<int:id_veiculo>")
@requer_recepcionista
def editar_veiculo(id_veiculo):
    repository = VeiculoRepository()
    if not repository.buscar_por_id(id_veiculo):
        return erro("Veículo não encontrado", 404)

    campos, mensagem = validar_veiculo(dados_requisicao(), id_atual=id_veiculo)
    if mensagem:
        return erro(mensagem)

    repository.atualizar(id_veiculo, campos["placa"], campos["modelo"], campos["categoria"], campos["status"])
    return jsonify(repository.buscar_por_id(id_veiculo))


@app.delete("/api/veiculos/<int:id_veiculo>")
@requer_recepcionista
def excluir_veiculo(id_veiculo):
    repository = VeiculoRepository()
    if not repository.buscar_por_id(id_veiculo):
        return erro("Veículo não encontrado", 404)

    repository.deletar(id_veiculo)
    return jsonify({"ok": True})


# ---------- Aulas práticas ----------

@app.get("/api/aulas")
@requer_recepcionista
def listar_aulas():
    inicio = request.args.get("inicio") or None
    fim = request.args.get("fim") or None
    return jsonify(AulaRepository().listar(data_inicio=inicio, data_fim=fim))


@app.post("/api/aulas")
@requer_recepcionista
def agendar_aula():
    dados = dados_requisicao()
    cpf_aluno = somente_digitos(dados.get("aluno_cpf"))
    instrutor_id = dados.get("instrutor_id")
    veiculo_id = dados.get("veiculo_id") or None
    categoria = dados.get("categoria")
    data = dados.get("data")
    inicio, fim = dados.get("hora_inicio"), dados.get("hora_fim")

    aluno = AlunoRepository().buscar_dados(cpf_aluno) if cpf_aluno else None
    if not aluno:
        return erro("Selecione o aluno")
    if aluno["status"] != "Ativo":
        return erro("Só é possível agendar aulas para alunos ativos")

    instrutor = next((i for i in InstrutorRepository().listar_todos() if i["id"] == instrutor_id), None)
    if not instrutor:
        return erro("Selecione o instrutor")
    if instrutor["status"] != "Ativo":
        return erro("Esse instrutor está inativo")
    if categoria not in CATEGORIAS:
        return erro("Categoria inválida")
    if categoria not in instrutor["categorias"].split(","):
        return erro(f"{instrutor['nome']} não é habilitado(a) na categoria {categoria}")

    if veiculo_id is not None:
        veiculo = VeiculoRepository().buscar_por_id(veiculo_id)
        if not veiculo:
            return erro("Veículo não encontrado")
        if veiculo["status"] == "Manutencao":
            return erro("Esse veículo está em manutenção")

    if not data_ok(data):
        return erro("Informe a data da aula")
    if not (hora_ok(inicio) and hora_ok(fim)) or fim <= inicio:
        return erro("Informe um horário válido (o fim deve ser depois do início)")

    repository = AulaRepository()
    if repository.conflito("instrutor_id", instrutor_id, data, inicio, fim):
        return erro("O instrutor já tem uma aula nesse horário", 409)
    if repository.conflito("aluno_id", aluno["id"], data, inicio, fim):
        return erro("O aluno já tem uma aula nesse horário", 409)
    if veiculo_id is not None and repository.conflito("veiculo_id", veiculo_id, data, inicio, fim):
        return erro("O veículo já está reservado nesse horário", 409)

    repository.salvar(aluno["id"], instrutor_id, veiculo_id, categoria, data, inicio, fim, "Agendada")

    data_br = "/".join(reversed(data.split("-")))
    msg = f"Olá {aluno['nome']}, sua aula prática foi agendada para {data_br} das {inicio} às {fim} com {instrutor['nome']}."
    return jsonify({"ok": True, "whatsapp_enviado": enviar_whatsapp(aluno["numero_cel"], msg)}), 201


@app.patch("/api/aulas/<int:id_aula>")
@requer_recepcionista
def alterar_status_aula(id_aula):
    repository = AulaRepository()
    if not repository.buscar_por_id(id_aula):
        return erro("Aula não encontrada", 404)
    if not repository.atualizar_status(id_aula, dados_requisicao().get("status")):
        return erro("Status inválido")
    return jsonify(repository.buscar_por_id(id_aula))


@app.delete("/api/aulas/<int:id_aula>")
@requer_recepcionista
def excluir_aula(id_aula):
    repository = AulaRepository()
    if not repository.buscar_por_id(id_aula):
        return erro("Aula não encontrada", 404)
    repository.deletar(id_aula)
    return jsonify({"ok": True})


# ---------- Recepcionistas ----------

@app.post("/api/recepcionistas")
@requer_recepcionista
def cadastrar_recepcionista():
    dados = dados_requisicao()
    nome = (dados.get("nome") or "").strip()
    cpf = somente_digitos(dados.get("cpf"))
    senha = dados.get("senha") or ""

    if not nome_ok(nome):
        return erro("O nome deve conter apenas letras")
    if not cpf_ok(cpf):
        return erro("CPF inválido")
    if len(senha) < 6:
        return erro("A senha deve ter pelo menos 6 caracteres")

    repository = RecepcionistaRepository()
    if repository.buscar_por_cpf(cpf):
        return erro("Já existe um recepcionista com esse CPF", 409)

    repository.salvar(cpf, nome, senha)
    if not repository.buscar_por_cpf(cpf):
        return erro("Não foi possível salvar o recepcionista no banco de dados", 500)
    return jsonify({"cpf": cpf, "nome": nome}), 201


# ---------- Provas ----------

@app.get("/api/exames")
@requer_recepcionista
def listar_exames():
    return jsonify(ExameRepository().listar_todos())


@app.post("/api/exames")
@requer_recepcionista
def marcar_exame():
    dados = dados_requisicao()
    tipo = dados.get("tipo")
    data = (dados.get("data") or "").replace("T", " ")[:16]
    local = (dados.get("local") or "").strip()[:100] or None
    cpfs = [somente_digitos(c) for c in dados.get("cpfs") or []]

    if tipo not in ("pratica", "teorica"):
        return erro("Escolha o tipo da prova")
    if len(data) != 16:
        return erro("Informe a data e o horário da prova")
    if not cpfs:
        return erro("Selecione pelo menos um aluno")

    aluno_repository = AlunoRepository()
    if any(not aluno_repository.buscar_dados(cpf) for cpf in cpfs):
        return erro("Um dos alunos selecionados não foi encontrado", 404)

    exame_repository = ExameRepository()
    # pegar_id busca pela data, entao duas provas no mesmo horario se confundiriam
    if any(e["data"] == data for e in exame_repository.listar_todos()):
        return erro("Já existe uma prova marcada nesse horário", 409)

    exame_repository.save(tipo, data)
    id_prova = exame_repository.pegar_id(data)
    exame_repository.setar_local(id_prova, local)

    enviados = 0
    for cpf in cpfs:
        try:
            aluno_repository.vincular_prova(cpf, id_prova)
            enviados += 1
        except Exception as e:
            print(f"Falha ao avisar aluno {cpf}: {e}")

    return jsonify({"id": id_prova, "tipo": tipo, "data": data, "avisados": enviados}), 201


@app.put("/api/exames/<int:id_exame>/resultado")
@requer_recepcionista
def lancar_resultado(id_exame):
    dados = dados_requisicao()
    cpf = somente_digitos(dados.get("cpf"))
    aprovacao = dados.get("aprovacao")

    repository = AlunoRepository()
    aluno = repository.buscar_dados(cpf)
    if not aluno or aluno["exame_id"] != id_exame:
        return erro("Esse aluno não está nessa prova", 404)
    if repository.setar_aprovacao(aprovacao, aluno["id"]) is False:
        return erro("Resultado inválido")
    return jsonify(repository.buscar_dados(cpf))


@app.delete("/api/exames/<int:id_exame>")
@requer_recepcionista
def deletar_exame(id_exame):
    if not any(e["id"] == id_exame for e in ExameRepository().listar_todos()):
        return erro("Prova não encontrada", 404)

    # Desvincula os alunos antes (no MySQL sem ON DELETE SET NULL a FK impediria o delete)
    Database.cursor_execute_commit("update aluno set exame_id = NULL, aprovacao = 'N/C' where exame_id = %s", (id_exame,))
    ExameRepository().deletar_prova(id_exame)
    return jsonify({"ok": True})


# ---------- WhatsApp simulado ----------

@app.get("/api/whatsapp")
@requer_recepcionista
def mensagens_simuladas():
    return jsonify(TwilioService.mensagens_simuladas[-20:])


if __name__ == "__main__":
    if Database.modo_demo():
        from config.Demo import preparar_banco_demo
        preparar_banco_demo()
        print("MODO DEMO: usando database/demo.db (SQLite). WhatsApp será apenas simulado.")

    porta = int(os.environ.get("PORT", 8000))
    app.run(host="127.0.0.1", port=porta, debug=False)
