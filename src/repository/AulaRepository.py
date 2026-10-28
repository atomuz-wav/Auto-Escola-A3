"""Modulo responsavel por fazer a manipulação da tabela Aula no BD"""

from config.Database import Database

class AulaRepository:
    """Possui os metodos para a manipulação no BD"""

    STATUS = ("Agendada", "Realizada", "Cancelada", "Falta")

    CONSULTA = ("select aula.id, aula.aluno_id, aluno.nome, aluno.CPF, aula.instrutor_id, instrutor.nome, "
                "aula.veiculo_id, veiculo.modelo, veiculo.placa, aula.categoria, aula.data, aula.hora_inicio, aula.hora_fim, aula.status "
                "from aula inner join aluno on aula.aluno_id = aluno.id "
                "inner join instrutor on aula.instrutor_id = instrutor.id "
                "left join veiculo on aula.veiculo_id = veiculo.id")

    CHAVES = ("id", "aluno_id", "aluno_nome", "aluno_cpf", "instrutor_id", "instrutor_nome", "veiculo_id",
              "veiculo_modelo", "veiculo_placa", "categoria", "data", "hora_inicio", "hora_fim", "status")

    def salvar(self, aluno_id = None, instrutor_id = None, veiculo_id = None, categoria = None, data = None, hora_inicio = None, hora_fim = None, status = "Agendada"):
        """Agenda uma aula pratica"""

        query = "Insert into aula(aluno_id, instrutor_id, veiculo_id, categoria, data, hora_inicio, hora_fim, status) values(%s, %s, %s, %s, %s, %s, %s, %s)"
        values = (aluno_id, instrutor_id, veiculo_id, categoria, data, hora_inicio, hora_fim, status)
        Database.cursor_execute_commit(query, values)

        print("Aula agendada com sucesso")

    def conflito(self, coluna = None, id_registro = None, data = None, hora_inicio = None, hora_fim = None):
        """Retorna True se o instrutor/veiculo/aluno ja tem aula que se sobrepoe a esse horario"""

        if coluna not in ("instrutor_id", "veiculo_id", "aluno_id"):
            return False

        query = (f"select count(*) from aula where {coluna} = %s and data = %s and status <> 'Cancelada' "
                 "and not (%s <= hora_inicio or %s >= hora_fim)")
        resultado = Database.cursor_execute_fetchone(query, (id_registro, data, hora_fim, hora_inicio))

        return bool(resultado and resultado[0])

    def atualizar_status(self, id_aula = None, status = None):
        """Muda o status de uma aula"""

        if status not in self.STATUS:
            return False

        Database.cursor_execute_commit("update aula set status = %s where id = %s", (status, id_aula))
        return True

    def deletar(self, id_aula = None):
        """Remove uma aula"""

        Database.cursor_execute_commit("delete from aula where id = %s", (id_aula,))

    def buscar_por_id(self, id_aula = None):
        """Busca uma aula pelo id"""

        resultado = Database.cursor_execute_fetchone(self.CONSULTA + " where aula.id = %s", (id_aula,))
        return dict(zip(self.CHAVES, resultado)) if resultado else None

    def listar(self, data_inicio = None, data_fim = None, aluno_id = None, instrutor_id = None):
        """Lista aulas, com filtros opcionais de periodo, aluno e instrutor"""

        filtros, values = [], []
        if data_inicio:
            filtros.append("aula.data >= %s"); values.append(data_inicio)
        if data_fim:
            filtros.append("aula.data <= %s"); values.append(data_fim)
        if aluno_id:
            filtros.append("aula.aluno_id = %s"); values.append(aluno_id)
        if instrutor_id:
            filtros.append("aula.instrutor_id = %s"); values.append(instrutor_id)

        query = self.CONSULTA
        if filtros:
            query += " where " + " and ".join(filtros)
        query += " order by aula.data, aula.hora_inicio"

        resultado = Database.cursor_execute_fetchall(query, tuple(values))

        if not isinstance(resultado, list):
            return []

        return [dict(zip(self.CHAVES, linha)) for linha in resultado]
