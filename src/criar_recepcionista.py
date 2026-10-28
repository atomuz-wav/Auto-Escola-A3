"""Cria um recepcionista pelo terminal (necessário para o primeiro acesso, quando o banco está vazio)

Uso: python src/criar_recepcionista.py
"""

from getpass import getpass
from utils.Validador import Validador
from repository.RecepcionistaRepository import RecepcionistaRepository

validador = Validador()

nome = input("Nome do recepcionista: ").strip()
cpf = validador.somente_digitos(input("CPF: "))
senha = getpass("Senha (mínimo 6 caracteres, não aparece na tela): ")

if not nome.replace(" ", "").isalpha():
    print("Nome inválido: use apenas letras")
elif not validador.cpf_valido(cpf):
    print("CPF inválido")
elif len(senha) < 6:
    print("A senha deve ter pelo menos 6 caracteres")
elif senha != getpass("Repita a senha: "):
    print("As senhas não conferem")
else:
    repository = RecepcionistaRepository()
    if repository.buscar_por_cpf(cpf):
        print("Já existe um recepcionista com esse CPF")
    else:
        repository.salvar(cpf, nome, senha)
        if repository.buscar_por_cpf(cpf):
            print("Pronto! Entre na tela de Recepção com esse CPF e senha.")
        else:
            print("Não foi possível salvar: confira a conexão com o banco (python src/verificar_mysql.py)")
