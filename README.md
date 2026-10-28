# Auto-Escola

Sistema de gestão de auto escola: alunos, instrutores, recepcionistas, frota de veículos, aulas práticas e provas do DETRAN, com aviso por WhatsApp (Twilio).

- **Back end:** Python (`src/`): repositórios + MySQL
- **API web:** Flask (`src/api.py`)
- **Front end:** HTML, CSS e JavaScript puro (`frontend/`)
- **Versão terminal original:** `src/main.py`

## Como rodar

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Modo demonstração (sem MySQL)

Usa SQLite (`database/demo.db`, criado automaticamente com dados de exemplo) e **simula** o WhatsApp: as mensagens aparecem na tela em vez de serem enviadas.

```bash
python src/api.py --demo
```

Abra http://localhost:8000.

Credenciais de teste do modo demo:

| Perfil        | CPF            | Senha   |
|---------------|----------------|---------|
| Recepcionista | 123.456.789-09 | demo123 |
| Aluno         | 529.982.247-25 ou mariana@email.com | — |
| Instrutor     | 111.222.333-44 | —       |

Para recomeçar com os dados de exemplo, apague `database/demo.db` e rode de novo.

### Modo normal (MySQL)

Testado com MySQL 8.4.

1. Copie `src/config/config.example.yml` para `src/config/config.yml` e preencha a senha do MySQL e as credenciais do Twilio
   (o `config.yml` não vai para o git porque guarda senhas e tokens)
2. Crie o banco: `mysql -u root -p < database/schema.sql`
   (banco já criado com a versão anterior? rode `mysql -u root -p auto_escola < database/migracao_v2.sql`)
3. Crie o primeiro recepcionista: `python src/criar_recepcionista.py`
   (os próximos podem ser criados pela tela **Recepção**)
4. Confira se está tudo certo: `python src/verificar_mysql.py`
   (ele só lê o banco e diz exatamente o que falta, se faltar algo)
5. Rode `python src/api.py` e abra http://localhost:8000 (aqui o WhatsApp é enviado de verdade pelo Twilio)

## Telas

- **Login:** Recepção (CPF + senha), Aluno (CPF ou e-mail) ou Instrutor (CPF)
- **Recepção**
  - Painel: indicadores (alunos ativos, aulas hoje, provas da semana, ocupação da frota) e gráficos (aulas por categoria, por dia da semana e por instrutor; resultados das provas)
  - Alunos: cadastrar, editar e excluir (e-mail, categoria de CNH, status), progresso da carga horária
  - Instrutores: cadastrar, editar e excluir (telefone, categorias habilitadas, status)
  - Frota: cadastrar, editar e excluir veículos (placa, modelo, categoria, status)
  - Aulas práticas: agendar (bloqueia conflito de horário de instrutor, aluno e veículo), filtrar por período, mudar status (agendada, realizada, falta, cancelada) e excluir
  - Provas: marcar com local, lançar resultado por aluno (aprovado/reprovado) e apagar
  - Cadastro de recepcionistas
- **Aluno:** progresso da carga horária, próxima aula, prova marcada, histórico de aulas e guia passo a passo para agendar o exame no DETRAN pelo GOV.BR
- **Instrutor:** próximas aulas e lista de alunos com progresso e resultado

Carga horária usada no progresso: 15 aulas (categoria A), 40 (AB) e 20 (demais), definida em `CARGA_HORARIA` em `src/api.py`.

## Testes

```bash
cd src && python -m pytest ../tests --ignore=../tests/test_twilio_service.py
```

Os testes de repositório precisam de um MySQL com o banco `auto_escola`. O `test_twilio_service.py` envia uma mensagem real de WhatsApp.
