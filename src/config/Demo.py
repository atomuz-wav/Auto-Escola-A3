"""Cria o banco SQLite do modo demonstracao com dados de exemplo"""

import os
import sqlite3
from datetime import date, timedelta
from config.Database import CAMINHO_DEMO
from service.TwilioService import TwilioService
from repository.AlunoRepository import AlunoRepository
from repository.InstrutorRepository import InstrutorRepository
from repository.RecepcionistaRepository import RecepcionistaRepository
from repository.ExameRepository import ExameRepository
from repository.VeiculoRepository import VeiculoRepository
from repository.AulaRepository import AulaRepository

# Mesmo schema de database/schema.sql, na sintaxe do SQLite
SCHEMA_SQLITE = """
CREATE TABLE instrutor (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    CPF        VARCHAR(11)  NOT NULL UNIQUE,
    nome       VARCHAR(100) NOT NULL,
    telefone   VARCHAR(15)  NULL,
    categorias VARCHAR(20)  NOT NULL DEFAULT 'B',
    status     VARCHAR(10)  NOT NULL DEFAULT 'Ativo'
);
CREATE TABLE recepcionista (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    CPF   VARCHAR(11)  NOT NULL UNIQUE,
    nome  VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL
);
CREATE TABLE exame (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo       VARCHAR(10)  NOT NULL,
    data_exame VARCHAR(16)  NOT NULL,
    local      VARCHAR(100) NULL
);
CREATE TABLE aluno (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    CPF           VARCHAR(11)  NOT NULL UNIQUE,
    nome          VARCHAR(100) NOT NULL,
    aprovacao     VARCHAR(20)  NOT NULL DEFAULT 'N/C',
    exame_id      INTEGER NULL REFERENCES exame(id)     ON DELETE SET NULL,
    instrutor_id  INTEGER NULL REFERENCES instrutor(id) ON DELETE SET NULL,
    numero_cel    VARCHAR(15)  NULL,
    email         VARCHAR(120) NULL,
    categoria     VARCHAR(2)   NOT NULL DEFAULT 'B',
    status        VARCHAR(10)  NOT NULL DEFAULT 'Ativo',
    data_cadastro VARCHAR(10)  NULL
);
CREATE TABLE veiculo (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    placa     VARCHAR(8)  NOT NULL UNIQUE,
    modelo    VARCHAR(60) NOT NULL,
    categoria VARCHAR(2)  NOT NULL DEFAULT 'B',
    status    VARCHAR(12) NOT NULL DEFAULT 'Disponivel'
);
CREATE TABLE aula (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id     INTEGER NOT NULL REFERENCES aluno(id)     ON DELETE CASCADE,
    instrutor_id INTEGER NOT NULL REFERENCES instrutor(id) ON DELETE CASCADE,
    veiculo_id   INTEGER NULL     REFERENCES veiculo(id)   ON DELETE SET NULL,
    categoria    VARCHAR(2)  NOT NULL,
    data         VARCHAR(10) NOT NULL,
    hora_inicio  VARCHAR(5)  NOT NULL,
    hora_fim     VARCHAR(5)  NOT NULL,
    status       VARCHAR(10) NOT NULL DEFAULT 'Agendada'
);
"""


def dia(deslocamento):
    """Data relativa a hoje no formato AAAA-MM-DD"""
    return (date.today() + timedelta(days=deslocamento)).isoformat()


def preparar_banco_demo():
    """Cria database/demo.db na primeira execucao"""

    if os.path.exists(CAMINHO_DEMO):
        return

    os.makedirs(os.path.dirname(CAMINHO_DEMO), exist_ok=True)
    conexao = sqlite3.connect(CAMINHO_DEMO)
    conexao.executescript(SCHEMA_SQLITE)
    conexao.close()

    # Credenciais de teste do modo demo (tambem listadas no README)
    RecepcionistaRepository().salvar("12345678909", "Ana Recepcao", "demo123")

    instrutores = InstrutorRepository()
    for cpf, nome, telefone, categorias in [
        ("11122233344", "Carlos Mendes", "81997001111", "A,B,AB"),
        ("22233344455", "Juliana Rocha", "81997002222", "B,C,D"),
        ("33344455566", "Roberto Lima", "81997003333", "A"),
    ]:
        instrutores.salvar(cpf, nome)
        instrutores.completar_cadastro(cpf, telefone, categorias, "Ativo")

    alunos = AlunoRepository()
    for cpf, nome, instrutor, celular, email, categoria, status, cadastro in [
        ("52998224725", "Mariana Souza", 1, "5581999990001", "mariana@email.com", "B", "Ativo", dia(-60)),
        ("39053344705", "Pedro Henrique", 1, "5581999990002", "pedro@email.com", "AB", "Ativo", dia(-45)),
        ("16899535009", "Lucas Ferreira", 2, "5581999990003", "lucas@email.com", "B", "Ativo", dia(-30)),
        ("71428793860", "Beatriz Alves", 2, "5581999990004", "beatriz@email.com", "C", "Ativo", dia(-12)),
        ("87748248800", "Rafael Costa", 3, "5581999990005", "rafael@email.com", "A", "Ativo", dia(-20)),
        ("45317828791", "Camila Nunes", 1, "5581999990006", "camila@email.com", "B", "Concluido", dia(-120)),
    ]:
        alunos.salvar(cpf, nome, instrutor, celular)
        alunos.completar_cadastro(cpf, email, categoria, status, cadastro)

    veiculos = VeiculoRepository()
    for placa, modelo, categoria, status in [
        ("PBB1A23", "Chevrolet Onix", "B", "Disponivel"),
        ("PBC2B34", "Fiat Argo", "B", "Disponivel"),
        ("PBD3C45", "Volkswagen Gol", "B", "Em uso"),
        ("PBE4D56", "Honda CG 160", "A", "Disponivel"),
        ("PBF5E67", "Yamaha Factor", "A", "Disponivel"),
        ("PBG6F78", "Mercedes-Benz Atego", "C", "Manutencao"),
    ]:
        veiculos.salvar(placa, modelo, categoria, status)

    aulas = AulaRepository()
    # (aluno_id, instrutor_id, veiculo_id, categoria, quantas aulas ja feitas, horario)
    for aluno_id, instrutor_id, veiculo_id, categoria, feitas, hora in [
        (1, 1, 1, "B", 16, "08:00"),
        (2, 1, 4, "A", 9, "10:00"),
        (3, 2, 2, "B", 7, "09:00"),
        (4, 2, 6, "C", 2, "14:00"),
        (5, 3, 5, "A", 11, "15:00"),
        (6, 1, 1, "B", 20, "16:00"),
    ]:
        fim = f"{int(hora[:2]) + 1:02d}{hora[2:]}"
        for n in range(feitas):
            status = "Falta" if n == 3 and aluno_id == 3 else "Realizada"
            aulas.salvar(aluno_id, instrutor_id, veiculo_id, categoria, dia(-2 * (feitas - n)), hora, fim, status)
        if aluno_id != 6:
            aulas.salvar(aluno_id, instrutor_id, veiculo_id, categoria, dia(0), hora, fim, "Agendada")
            aulas.salvar(aluno_id, instrutor_id, veiculo_id, categoria, dia(2), hora, fim, "Agendada")

    exames = ExameRepository()
    data_teorica = f"{dia(15)} 09:00"
    data_pratica = f"{dia(22)} 14:30"
    data_passada = f"{dia(-10)} 08:00"
    for tipo, data, local in [
        ("teorica", data_teorica, "DETRAN-PE · Sede Recife"),
        ("pratica", data_pratica, "Posto DETRAN Boa Viagem"),
        ("pratica", data_passada, "Posto DETRAN Boa Viagem"),
    ]:
        exames.save(tipo, data)
        exames.setar_local(exames.pegar_id(data), local)

    alunos.vincular_prova("52998224725", exames.pegar_id(data_teorica))
    alunos.vincular_prova("16899535009", exames.pegar_id(data_teorica))
    alunos.vincular_prova("39053344705", exames.pegar_id(data_pratica))
    alunos.vincular_prova("45317828791", exames.pegar_id(data_passada))
    alunos.setar_aprovacao("aprovado", 6)

    TwilioService.mensagens_simuladas.clear()
