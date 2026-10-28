-- Schema do banco auto_escola (MySQL)
-- Reconstruido a partir das queries dos repositorios em src/repository.
-- Uso: mysql -u root -p < database/schema.sql
-- Banco ja existente da versao anterior: use database/migracao_v2.sql

CREATE DATABASE IF NOT EXISTS auto_escola CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auto_escola;

CREATE TABLE IF NOT EXISTS instrutor (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    CPF        VARCHAR(11)  NOT NULL UNIQUE,
    nome       VARCHAR(100) NOT NULL,
    telefone   VARCHAR(15)  NULL,
    categorias VARCHAR(20)  NOT NULL DEFAULT 'B',
    status     VARCHAR(10)  NOT NULL DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS recepcionista (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    CPF   VARCHAR(11)  NOT NULL UNIQUE,
    nome  VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- data_exame fica como texto (AAAA-MM-DD HH:MM) porque AlunoRepository.pegar_exame
-- concatena o valor com strings
CREATE TABLE IF NOT EXISTS exame (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    tipo       VARCHAR(10)  NOT NULL,
    data_exame VARCHAR(16)  NOT NULL,
    local      VARCHAR(100) NULL
);

-- A ordem das colunas importa: AlunoRepository acessa os resultados por indice,
-- por isso as colunas novas ficam no final
CREATE TABLE IF NOT EXISTS aluno (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    CPF           VARCHAR(11)  NOT NULL UNIQUE,
    nome          VARCHAR(100) NOT NULL,
    aprovacao     VARCHAR(20)  NOT NULL DEFAULT 'N/C',
    exame_id      INT NULL,
    instrutor_id  INT NULL,
    numero_cel    VARCHAR(15)  NULL,
    email         VARCHAR(120) NULL,
    categoria     VARCHAR(2)   NOT NULL DEFAULT 'B',
    status        VARCHAR(10)  NOT NULL DEFAULT 'Ativo',
    data_cadastro VARCHAR(10)  NULL,
    FOREIGN KEY (exame_id)     REFERENCES exame(id)     ON DELETE SET NULL,
    FOREIGN KEY (instrutor_id) REFERENCES instrutor(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS veiculo (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    placa     VARCHAR(8)   NOT NULL UNIQUE,
    modelo    VARCHAR(60)  NOT NULL,
    categoria VARCHAR(2)   NOT NULL DEFAULT 'B',
    status    VARCHAR(12)  NOT NULL DEFAULT 'Disponivel'
);

CREATE TABLE IF NOT EXISTS aula (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id     INT NOT NULL,
    instrutor_id INT NOT NULL,
    veiculo_id   INT NULL,
    categoria    VARCHAR(2)  NOT NULL,
    data         VARCHAR(10) NOT NULL,
    hora_inicio  VARCHAR(5)  NOT NULL,
    hora_fim     VARCHAR(5)  NOT NULL,
    status       VARCHAR(10) NOT NULL DEFAULT 'Agendada',
    FOREIGN KEY (aluno_id)     REFERENCES aluno(id)     ON DELETE CASCADE,
    FOREIGN KEY (instrutor_id) REFERENCES instrutor(id) ON DELETE CASCADE,
    FOREIGN KEY (veiculo_id)   REFERENCES veiculo(id)   ON DELETE SET NULL
);
