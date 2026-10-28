"""Modulo responsavel por fazer a manipulação da tabela Exame no BD"""

from config.Database import Database

class ExameRepository:
    """Possui os metodos para a manipulação no BD"""

    def save(self, tipo = None, data = None):
        """Salva os exames"""

        if tipo in ("teorica", "pratica"):
            query = "Insert into exame(tipo, data_exame) values(%s, %s)"
            values = (tipo, data)

            Database.cursor_execute_commit(query, values)

            print(f"Exame marcado com sucesso")
            
    def pegar_id(self, data_exame = None):
        """Pega o id de uma prova"""

        query = "select id from exame where data_exame = %s"
        values = (data_exame,)
        resultado = Database.cursor_execute_fetchone(query, values)

        return resultado[0]
    
    def deletar_prova(self, id_exame = None):
        """Deleta uma prova"""

        query = "delete from exame where id = %s"
        values = (id_exame,)

        Database.cursor_execute_commit(query, values)
        print("Prova deletada")

    def buscar_por_data(self, data = None):
        """Busca uma prova pela data"""

        query = "select * from exame where data_exame = %s"
        values = (data,)
        resultado = Database.cursor_execute_commit(query, values)

        return resultado

    def setar_local(self, id_exame = None, local = None):
        """Define o local da prova"""

        query = "update exame set local = %s where id = %s"
        Database.cursor_execute_commit(query, (local, id_exame))

    def listar_todos(self):
        """Lista todas as provas com os alunos de cada uma e o resultado deles"""

        query = "select exame.id, exame.tipo, exame.data_exame, exame.local, aluno.nome, aluno.CPF, aluno.aprovacao from exame left join aluno on aluno.exame_id = exame.id order by exame.data_exame, aluno.nome"
        resultado = Database.cursor_execute_fetchall(query, ())

        if not isinstance(resultado, list):
            return []

        exames = {}
        for id_exame, tipo, data, local, nome_aluno, cpf_aluno, aprovacao in resultado:
            exame = exames.setdefault(id_exame, {"id": id_exame, "tipo": tipo, "data": data, "local": local, "alunos": []})
            if nome_aluno:
                exame["alunos"].append({"nome": nome_aluno, "cpf": cpf_aluno, "aprovacao": aprovacao})

        return list(exames.values())
