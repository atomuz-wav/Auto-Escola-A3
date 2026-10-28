"""Confere se o computador está pronto para rodar o sistema com MySQL (não altera nada no banco)

Uso: python src/verificar_mysql.py
"""

import sys

# Colunas que o sistema usa em cada tabela (database/schema.sql)
COLUNAS_ESPERADAS = {
    "instrutor": {"id", "CPF", "nome", "telefone", "categorias", "status"},
    "recepcionista": {"id", "CPF", "nome", "senha"},
    "exame": {"id", "tipo", "data_exame", "local"},
    "aluno": {"id", "CPF", "nome", "aprovacao", "exame_id", "instrutor_id", "numero_cel",
              "email", "categoria", "status", "data_cadastro"},
    "veiculo": {"id", "placa", "modelo", "categoria", "status"},
    "aula": {"id", "aluno_id", "instrutor_id", "veiculo_id", "categoria", "data",
             "hora_inicio", "hora_fim", "status"},
}

# Ordem das primeiras colunas de aluno: AlunoRepository.buscar_por_cpf lê por posição
ORDEM_ALUNO = ["id", "CPF", "nome", "aprovacao", "exame_id", "instrutor_id", "numero_cel"]

problemas = []


def ok(texto):
    print(f"  [OK]    {texto}")


def falha(texto, solucao):
    print(f"  [FALHA] {texto}\n          -> {solucao}")
    problemas.append(texto)


def aviso(texto):
    print(f"  [AVISO] {texto}")


print("\n1. Python e bibliotecas")
if sys.version_info >= (3, 10):
    ok(f"Python {sys.version.split()[0]}")
else:
    falha(f"Python {sys.version.split()[0]} é antigo demais", "instale o Python 3.10 ou mais novo")

faltando = []
for modulo, pacote in [("flask", "Flask"), ("yaml", "PyYAML"), ("bcrypt", "bcrypt"),
                       ("twilio", "twilio"), ("mysql.connector", "mysql-connector-python")]:
    try:
        __import__(modulo)
    except Exception:
        faltando.append(pacote)
if faltando:
    falha(f"bibliotecas faltando ou quebradas: {', '.join(faltando)}", "rode: pip install -r requirements.txt")
    print("\nCorrija as bibliotecas e rode de novo.")
    sys.exit(1)
ok("bibliotecas instaladas")

import mysql.connector
from config.Database import Database

print("\n2. Configuração (src/config/config.yml)")
try:
    config = Database.carregar_config()["database"]
    ok(f"banco '{config['name']}' em {config['host']}:{config['port']}, usuário '{config['username']}'")
except Exception as e:
    falha(f"não foi possível ler o config.yml ({e})", "copie src/config/config.example.yml para src/config/config.yml e preencha seus dados")
    sys.exit(1)

print("\n3. Conexão com o MySQL")
try:
    conexao = mysql.connector.connect(host=config["host"], port=config["port"], user=config["username"],
                                      password=config["password"], database=config["name"])
    cursor = conexao.cursor()
    cursor.execute("select version()")
    ok(f"conectado ao MySQL {cursor.fetchone()[0]}")
except mysql.connector.Error as e:
    if e.errno == 1049:
        falha(f"o banco '{config['name']}' não existe", "rode: mysql -u root -p < database/schema.sql")
    elif e.errno == 1045:
        falha("usuário ou senha recusados pelo MySQL", "ajuste username e password em src/config/config.yml")
    else:
        falha(f"não conectou ({e})", "confira se o MySQL está ligado e se host/porta do config.yml estão certos")
    print(f"\nResultado: {len(problemas)} problema(s) encontrado(s).")
    sys.exit(1)

print("\n4. Tabelas e colunas")
cursor.execute("select table_name, column_name from information_schema.columns where table_schema = %s order by ordinal_position", (config["name"],))
colunas_banco = {}
for tabela, coluna in cursor.fetchall():
    colunas_banco.setdefault(tabela.lower(), []).append(coluna)

precisa_migrar = False
for tabela, esperadas in COLUNAS_ESPERADAS.items():
    existentes = colunas_banco.get(tabela)
    if existentes is None:
        falha(f"tabela '{tabela}' não existe", "rode: mysql -u root -p auto_escola < database/migracao_v2.sql")
        precisa_migrar = True
        continue
    minusculas = {c.lower() for c in existentes}
    ausentes = sorted(c for c in esperadas if c.lower() not in minusculas)
    if ausentes:
        falha(f"tabela '{tabela}' sem as colunas: {', '.join(ausentes)}",
              "rode: mysql -u root -p auto_escola < database/migracao_v2.sql")
        precisa_migrar = True
    else:
        ok(f"tabela '{tabela}'")

if "aluno" in colunas_banco:
    primeiras = [c.lower() for c in colunas_banco["aluno"][:len(ORDEM_ALUNO)]]
    if primeiras != [c.lower() for c in ORDEM_ALUNO]:
        aviso(f"ordem das colunas de aluno diferente do esperado ({', '.join(colunas_banco['aluno'][:7])}); "
              "a consulta de aluno da versão de terminal (main.py) pode mostrar campos trocados")

if precisa_migrar:
    print("\n   Atenção: a migração é para bancos criados no formato do schema antigo.")
    print("   Se ela der erro, mande a saída de 'SHOW CREATE TABLE aluno;' para a equipe.")

print("\n5. Dados")
if "recepcionista" in colunas_banco:
    cursor.execute("select count(*) from recepcionista")
    total = cursor.fetchone()[0]
    if total:
        ok(f"{total} recepcionista(s) cadastrado(s)")
    else:
        falha("nenhum recepcionista cadastrado: ninguém consegue entrar na recepção",
              "crie o primeiro pelo terminal: python src/criar_recepcionista.py")
if "aluno" in colunas_banco and "email" in {c.lower() for c in colunas_banco["aluno"]}:
    cursor.execute("select count(*) from aluno where email is null or email = ''")
    sem_email = cursor.fetchone()[0]
    if sem_email:
        aviso(f"{sem_email} aluno(s) sem e-mail: o e-mail será pedido na próxima edição de cada um")

cursor.close()
conexao.close()

print(f"\nResultado: {'tudo pronto! Rode: python src/api.py' if not problemas else f'{len(problemas)} problema(s) encontrado(s).'}\n")
sys.exit(1 if problemas else 0)
