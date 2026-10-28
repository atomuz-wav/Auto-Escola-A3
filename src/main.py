"""Classe para execução da aplicação"""

import time
import os
from utils.Validador import Validador
from service.TwilioService import TwilioService
from repository.AlunoRepository import AlunoRepository
from repository.InstrutorRepository import InstrutorRepository
from repository.RecepcionistaRepository import RecepcionistaRepository
from repository.ExameRepository import ExameRepository

#Faz login
def login(escolha = int):

    match(escolha):
        case 1:
            recepcionista = RecepcionistaRepository()
            
            cpf_Recepc = str(input("Insira o CPF do Recpcionista"))
            senha_Recepc = str(input("Insira a senha"))

            resultado = recepcionista.login(cpf_Recepc, senha_Recepc)

            if resultado == True:
                return True
            else:
                return False
    
#Faz cadastro
def cadastro(escolha = None):
    """Opção para cadastrar novos usuarios"""

    validador = Validador()

    match escolha:
        case 1:
            nome_aluno = validador.verificar_nome(str(input("Digite o nome do aluno")))
            cpf_aluno = validador.verificar_cpf(str(input("Digite o cpf do aluno")))
            id_instrutor = int(input("Digite o id do instrutor"))
            num_brasil = "55"
            numero_cel_aluno = validador.verificar_numero(str(input("Digite o numero do aluno")))
            num_aluno = num_brasil + numero_cel_aluno

            repository = AlunoRepository()
            twilio_service = TwilioService()

            repository.salvar(cpf_aluno, nome_aluno, id_instrutor, num_aluno)

            nome_instrutor = repository.pegar_nome_instrutor(cpf_aluno)

            msg = f"Olá {nome_aluno},estamos muito felizes de receber você ,seu professor será {nome_instrutor}"
            twilio_service.enviar_whatsapp(num_aluno, msg)

        case 2:
            nome_recepcionista = validador.verificar_nome(str(input("Digite o nome do recepcionista")))
            cpf_recepcionista = validador.verificar_cpf(str(input("Digite o cpf do recepcionista")))
            senha = str(input("Digite a senha"))
            recepcionista = RecepcionistaRepository()

            recepcionista.salvar(cpf_recepcionista, nome_recepcionista, senha)

        case 3:
            nome_instrutor = validador.verificar_nome(str(input("Digite o nome do instrutor")))
            cpf_insturtor = validador.verificar_cpf(str(input("Digite o cpf do instrutor")))
            instrutor = InstrutorRepository()

            instrutor.salvar(cpf_insturtor, nome_instrutor)

def main():
    """programa principal"""

    validador = Validador()

    print(">>>>LOGIN<<<<")
    print("Recepcionista[1]")
    print("Aluno[2]")
    print("Instrutor[3]")
    escolha = int(input())

    match escolha:
        case 1:
            while True:
                recepcionista = RecepcionistaRepository()
                            
                cpf_Recepc = str(input("Insira o CPF do Recpcionista"))
                senha_Recepc = str(input("Insira a senha"))
    
                resultado = recepcionista.login(cpf_Recepc, senha_Recepc)
    
                if resultado == True:
                  print("Login realizado")
                  time.sleep(3)
                  break
                else:
                  os.system('cls')
                  print("Login invalido")

            while True:
                os.system('cls')
                print("Consultar aluno[1]")
                print("Consultar instrutor[2]")
                print("Marcar prova[3]")
                print("deletar prova[4]")
                print("Cadastro[5]")

                escolha = int(input("Digite um numero"))

                match escolha:
                    case 1:
                        os.system('cls')
                        print(">>>>>CONSULTAR ALUNO<<<<<<<<<")
                        cpf_aluno = validador.verificar_cpf(str(input("Digite o cpf do aluno")))
                        aluno_repository = AlunoRepository()
                        aluno_repository.buscar_por_cpf(cpf_aluno)

                    case 2:
                        os.system('cls')
                        print("Buscar instrutor")
                        instrutor_repository = InstrutorRepository()
                        cpf_instru = validador.verificar_cpf(str(input("Digite o cpf do instrutor")))

                        instrutor = instrutor_repository.buscar_por_cpf(cpf_instru)

                        print(f"{instrutor}")

                    case 3:
                        os.system('cls')
                        print(">>>>>>>MARCAR PROVA<<<<<<<<")
                        exame_repository = ExameRepository()
                        aluno_repository = AlunoRepository()

                        data_prova = input("Insira a data da prova")
                        print("pratica[1]")
                        print("teorica[2]")
                        setar_tipo = input("Diga o tipo")
                        escolha = int(input()) 

                        if escolha == 1:
                            setar_tipo = "pratica"
                        else:
                            setar_tipo = "teorica"

                        exame_repository.save(setar_tipo, data_prova)
                        id_prova = exame_repository.pegar_id(data_prova)

                        print(f"id da prova: {id_prova}")

                        quant_alunos = int(input("Insira a quantidade de alunos que farão a prova "))

                        aluno_repository.setar_id_provas(quant_alunos, id_prova)

                    case 4:
                        os.system('cls')
                        print("Apagar exame")
                        exame_repository = ExameRepository()
                        id_prova = int(input("Digite o id do exame"))
                        exame_repository.deletar_prova(id_prova)

                    case 5:
                        os.system('cls')
                        print("Aluno[1]")
                        print("Recepcionista[2]")
                        print("Instrutor[3]")
                        escolha = int(input("Digite um numero"))
                        cadastro(escolha)

                continuidade = str(input("Deseja continuar ? [S/N]"))
                if continuidade == "N":
                    break
        
        case 2:
            os.system('cls')
            while True:
                
                aluno_repository = AlunoRepository()
                
                cpf_aluno = str(input("Digite o cpf do aluno"))

                exames = aluno_repository.pegar_exame(cpf_aluno)
                
                if not exames == False:
                    print("Aluno achado")
                    time.sleep(3)
                    break
                else:
                    print("Aluno não existe")
            
            os.system('cls')
            print(f"{exames}")

            instrutor = aluno_repository.pegar_nome_instrutor(cpf_aluno)
            print(f"Professor: {instrutor}")


        case 3:
            os.system('cls')
            while True:    
                instrutor_repository = InstrutorRepository()
                cpf_instru = str(input("Digite o cpf do instrutor"))
                resultado = instrutor_repository.pegar_alunos(cpf_instru)

                if not resultado == False:
                    print("Instrutor achado")
                    time.sleep(3)
                    break
                else:
                    print("Instrutor não existe")

            os.system('cls')
            if resultado == None:
                print("Sem alunos")
            else:
                print(f"{resultado}")    

"""inicia o programa"""
main()