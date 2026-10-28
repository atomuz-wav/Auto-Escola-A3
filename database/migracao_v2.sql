-- Atualiza um banco auto_escola criado com a versao anterior do schema.sql
-- Uso: mysql -u root -p auto_escola < database/migracao_v2.sql

ALTER TABLE instrutor
    ADD COLUMN telefone   VARCHAR(15) NULL,
    ADD COLUMN categorias VARCHAR(20) NOT NULL DEFAULT 'B',
    ADD COLUMN status     VARCHAR(10) NOT NULL DEFAULT 'Ativo';

ALTER TABLE exame
    ADD COLUMN local VARCHAR(100) NULL;

ALTER TABLE aluno
    ADD COLUMN email         VARCHAR(120) NULL,
    ADD COLUMN categoria     VARCHAR(2)   NOT NULL DEFAULT 'B',
    ADD COLUMN status        VARCHAR(10)  NOT NULL DEFAULT 'Ativo',
    ADD COLUMN data_cadastro VARCHAR(10)  NULL;

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
