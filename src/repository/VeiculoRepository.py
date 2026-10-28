"""Modulo responsavel por fazer a manipulação da tabela Veiculo no BD"""

from config.Database import Database

class VeiculoRepository:
    """Possui os metodos para a manipulação no BD"""

    CHAVES = ("id", "placa", "modelo", "categoria", "status")

    def salvar(self, placa = None, modelo = None, categoria = None, status = None):
        """Salva um veiculo"""

        query = "Insert into veiculo(placa, modelo, categoria, status) values(%s, %s, %s, %s)"
        values = (placa, modelo, categoria, status)
        Database.cursor_execute_commit(query, values)

        print(f"Veiculo: {placa} cadastrado com sucesso")

    def buscar_por_id(self, id_veiculo = None):
        """Busca um veiculo pelo id"""

        query = "select id, placa, modelo, categoria, status from veiculo where id = %s"
        resultado = Database.cursor_execute_fetchone(query, (id_veiculo,))

        return dict(zip(self.CHAVES, resultado)) if resultado else None

    def buscar_por_placa(self, placa = None):
        """Busca um veiculo pela placa"""

        query = "select id, placa, modelo, categoria, status from veiculo where placa = %s"
        resultado = Database.cursor_execute_fetchone(query, (placa,))

        return dict(zip(self.CHAVES, resultado)) if resultado else None

    def atualizar(self, id_veiculo = None, placa = None, modelo = None, categoria = None, status = None):
        """Atualiza um veiculo"""

        query = "update veiculo set placa = %s, modelo = %s, categoria = %s, status = %s where id = %s"
        values = (placa, modelo, categoria, status, id_veiculo)
        Database.cursor_execute_commit(query, values)

    def deletar(self, id_veiculo = None):
        """Remove um veiculo (as aulas ficam sem veiculo)"""

        Database.cursor_execute_commit("update aula set veiculo_id = NULL where veiculo_id = %s", (id_veiculo,))
        Database.cursor_execute_commit("delete from veiculo where id = %s", (id_veiculo,))

    def listar_todos(self):
        """Lista todos os veiculos"""

        query = "select id, placa, modelo, categoria, status from veiculo order by modelo"
        resultado = Database.cursor_execute_fetchall(query, ())

        if not isinstance(resultado, list):
            return []

        return [dict(zip(self.CHAVES, linha)) for linha in resultado]
