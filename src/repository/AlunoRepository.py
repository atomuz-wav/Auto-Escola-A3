"""Modulo responsavel por fazer a manipulação da tabela Aluno no BD"""

from utils.Validador import Validador
from config.Database import Database
from service.TwilioService import TwilioService

class AlunoRepository:
    """Possui os metodos para a manipulação no BD"""

    validador = Validador()

    def salvar(self, cpf = None, nome = None, instrutor_id = None, numero_cel_aluno = None):
        """Salva os dados do aluno"""

        cpf_verificado = self.validador.verificar_cpf(cpf)
        nome_verificado = self.validador.verificar_nome(nome)
        numero_verificado = self.validador.verificar_numero(numero_cel_aluno)
        aprovacao = "N/C"
        
        query = "Insert into aluno(CPF, nome, aprovacao, instrutor_id, numero_cel) values(%s, %s, %s, %s, %s)"
        values = (cpf_verificado, nome_verificado, aprovacao, instrutor_id, numero_verificado)

        Database.cursor_execute_commit(query, values)
        
        print(f"Aluno: {nome} cadastrado com sucesso")

    def setar_aprovacao(self, aprovacao = None, id_aluno = None):
        """Colocar aprovação/reprovação no aluno"""

        if aprovacao not in ("aprovado", "desaprovado", "N/C"):
            return False

        query = "update aluno set aprovacao = %s where id = %s"
        values = (aprovacao, id_aluno)

        return Database.cursor_execute_commit(query, values)

    def pegar_exame(self, cpf = None):
        """Pesquisa exames de um aluno"""

        # Colunas explicitas: com "select *" os indices mudam quando a tabela ganha colunas
        query = "select aluno.nome, exame.tipo, exame.data_exame from aluno left join exame on aluno.exame_id = exame.id where aluno.CPF = %s"
        values = (cpf,)
        
        resultado = Database.cursor_execute_fetchone(query, values)

        if not resultado:
            return False

        nome = resultado[0]
        tipo = resultado[1]
        data = resultado[2]

        if not (tipo and data):
            return "Nenhum exame marcado"
        else:
            info = nome + "---" + tipo + "---" + data

            return info

    def pegar_numero(self, cpf = None):
        """Pega numero do aluno"""

        query = "select numero_cel from aluno where CPF = %s"
        values = (cpf,)
        resultado = Database.cursor_execute_fetchone(query, values)

        return resultado[0]

    def pegar_nome_instrutor(self, cpf = None):
        """Pega nome do instrutor do aluno"""

        query = "select instrutor.nome from aluno inner join instrutor on aluno.instrutor_id = instrutor.id where aluno.CPF = %s"
        values = (cpf,)

        resultado = Database.cursor_execute_fetchone(query, values)

        return resultado

    def setar_id_provas(self, quant_alunos = None, id_prova = None):
        """Relaciona as provas"""

        twilio_service = TwilioService()

        for i in range(1, quant_alunos + 1):
            cpf_aluno = input("Insira o cpf do aluno: ")
            query = "update aluno set exame_id = %s where CPF = %s"
            values = (id_prova, cpf_aluno)

            Database.cursor_execute_commit(query, values)

            numero_aluno = self.pegar_numero(cpf_aluno)
            msg = "Olá, Acabou de ser agendada sua prova, visite o aplicativo para mais informações"
            twilio_service.enviar_whatsapp(numero_aluno, msg)

    def setar_instrutor(self, id_instrutor = None, id_aluno = None):
        """Coloca o instrutor do aluno"""

        query = "update aluno set instrutor_id = %s where id = %s"
        values = (id_instrutor, id_aluno)
        Database.cursor_execute_commit(query, values)

    def buscar_por_cpf(self, cpf = None):
        """Busca aluno por CPF"""

        query = "select * from aluno where CPF = %s"
        values = (cpf,)
        resultado = Database.cursor_execute_fetchone(query, values)

        cpf_aluno = resultado[1]
        nome_aluno = resultado[2]
        aprovacao = resultado[3]
        exame_id = resultado[4]
        instrutor_id = resultado[5]
        numero = resultado[6]

        if exame_id == None:
            exame_id = "N/C"

        print("cpf: ",cpf_aluno," nome: ",nome_aluno," aprovação: ",aprovacao," exame id: ",exame_id," instrutor id: ",instrutor_id," numero: ",numero)

        return True
    COLUNAS_DADOS = "aluno.id, aluno.CPF, aluno.nome, aluno.aprovacao, aluno.exame_id, aluno.instrutor_id, aluno.numero_cel, aluno.email, aluno.categoria, aluno.status, aluno.data_cadastro, instrutor.nome, exame.tipo, exame.data_exame, exame.local"
    JOIN_DADOS = "from aluno left join instrutor on aluno.instrutor_id = instrutor.id left join exame on aluno.exame_id = exame.id"

    def _montar_dados(self, linha):
        """Transforma uma linha do select de COLUNAS_DADOS em dicionario"""

        chaves = ("id", "cpf", "nome", "aprovacao", "exame_id", "instrutor_id", "numero_cel", "email", "categoria",
                  "status", "data_cadastro", "instrutor_nome", "exame_tipo", "exame_data", "exame_local")
        return dict(zip(chaves, linha))

    def buscar_dados(self, cpf = None):
        """Busca aluno por CPF e retorna os dados (ou None)"""

        query = f"select {self.COLUNAS_DADOS} {self.JOIN_DADOS} where aluno.CPF = %s"
        resultado = Database.cursor_execute_fetchone(query, (cpf,))

        return self._montar_dados(resultado) if resultado else None

    def buscar_cpf_por_email(self, email = None):
        """Retorna o CPF do aluno com esse e-mail (ou None)"""

        query = "select CPF from aluno where lower(email) = lower(%s)"
        resultado = Database.cursor_execute_fetchone(query, (email,))

        return resultado[0] if resultado else None

    def vincular_prova(self, cpf = None, id_prova = None):
        """Relaciona uma prova a um aluno e avisa por WhatsApp (versao sem input do setar_id_provas)"""

        # Prova nova: o resultado da anterior deixa de valer
        query = "update aluno set exame_id = %s, aprovacao = 'N/C' where CPF = %s"
        values = (id_prova, cpf)
        Database.cursor_execute_commit(query, values)

        numero_aluno = self.pegar_numero(cpf)
        msg = "Olá, Acabou de ser agendada sua prova, visite o aplicativo para mais informações"
        TwilioService().enviar_whatsapp(numero_aluno, msg)

    def completar_cadastro(self, cpf = None, email = None, categoria = None, status = None, data_cadastro = None):
        """Preenche os campos que o salvar original nao recebe"""

        query = "update aluno set email = %s, categoria = %s, status = %s, data_cadastro = %s where CPF = %s"
        values = (email, categoria, status, data_cadastro, cpf)
        Database.cursor_execute_commit(query, values)

    def atualizar(self, cpf = None, nome = None, numero_cel = None, email = None, categoria = None, status = None, instrutor_id = None):
        """Atualiza os dados de um aluno (o CPF nao muda)"""

        query = "update aluno set nome = %s, numero_cel = %s, email = %s, categoria = %s, status = %s, instrutor_id = %s where CPF = %s"
        values = (nome, numero_cel, email, categoria, status, instrutor_id, cpf)
        Database.cursor_execute_commit(query, values)

    def deletar(self, cpf = None):
        """Remove um aluno (as aulas dele sao apagadas junto)"""

        query = "delete from aluno where CPF = %s"
        Database.cursor_execute_commit(query, (cpf,))

    def listar_todos(self):
        """Lista todos os alunos"""

        query = f"select {self.COLUNAS_DADOS} {self.JOIN_DADOS} order by aluno.nome"
        resultado = Database.cursor_execute_fetchall(query, ())

        if not isinstance(resultado, list):
            return []

        return [self._montar_dados(linha) for linha in resultado]
