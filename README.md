# StreamMaster SaaS · Plataforma Multi-Tenant White-Label de Revenda de Streaming

Plataforma Web SaaS Multi-Tenant de alto desempenho para gestão e revenda de acessos a aplicativos de streaming (OTT / IPTV / VOD), com tema **Dark Neon Cinema**, isolamento estrito de 3 níveis, integração REST direta com instâncias **Baserow** e motor transacional de créditos com recargas via PIX.

---

## 🏛️ Hierarquia Multi-Tenant dos 3 Níveis

1. **Nível 1 · Super Admin (Dono da Plataforma SaaS)**
   - Gerenciamento global de Donos de Aplicativo (Inquilinos).
   - Configura para cada Dono: Nome do App, Logo, Cor Primária de Destaque, Slug da URL, Credenciais do Baserow (URL, Token, Tabela de Usuários) e Status da Assinatura.
   - Visão global de faturamento, quantidade de revendedores e total de clientes finais ativos na rede.
   - Botão **"Acessar como Dono"** (Impersonation) para suporte instantâneo.

2. **Nível 2 · Dono do Aplicativo (Master / Inquilino)**
   - O painel carrega 100% a **marca personalizada dele** (Nome, Logo e Cores).
   - Não tem acesso aos dados de outros Donos de App.
   - Gerencia a sua própria rede de **Revendedores** (criação, bloqueio e ajuste de saldo de créditos).
   - Cria e gerencia clientes diretamente no seu Baserow sem consumir créditos.
   - Define o preço dos pacotes de créditos e configura a **Chave PIX** para recebimento.

3. **Nível 3 · Revendedor (Parceiro do Dono)**
   - Interface 100% white-label (vê apenas a marca do seu Dono de App).
   - Card em destaque: `⭐ SEU SALDO: X CRÉDITOS` com botão de compra rápida via PIX.
   - Visualiza e renova exclusivamente os **clientes que ele mesmo criou** (`RevendedorId`).
   - Consumo atômico: 1 mês (30 dias) = 1 crédito; 3 meses = 3 créditos; 6 meses = 6 créditos; 1 ano = 12 créditos.
   - Geração de testes rápidos (2h ou 4h) com verificação de cota diária sem custo de créditos.
   - Botão rápido para envio de mensagem formatada no **WhatsApp** com dados de login e link de download do app oficial.

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js**: v18+ ou v20+
- **NPM** ou **Yarn**

### Passo a Passo

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Configurar Variáveis de Ambiente:**
   Crie ou edite o arquivo `.env`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/streammaster_db?schema=public"
   # Para usar SQLite local de teste:
   # DATABASE_URL="file:./dev.db"
   ```

3. **Executar Migrações do Banco de Dados (Opcional se usando Prisma com PostgreSQL):**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Iniciar o Servidor em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

---

## 🔑 Contas de Demonstração Pré-Configuradas

Para testar imediatamente todos os 3 níveis, você pode usar os botões de **"Acesso Rápido"** na tela de login ou inserir as credenciais:

| Nível | Papel | Email | Senha | Destaques |
|---|---|---|---|---|
| **1** | Super Admin Dono | `awina1051@gmail.com` | `12345678` | Dono da plataforma e infraestrutura SaaS |
| **2** | Dono (CINEFP TV) | `roberto@cinefp.com` | `123` | Marca Ciano (`#00E5FF`), 2 revendedores |
| **2** | Dono (VIP PLAY) | `carla@vipplay.tv` | `123` | Marca Dourada (`#FFC107`), Baserow 1166 |
| **3** | Revendedor Lucas | `lucas@revendacine.com` | `123` | Pertence ao CINEFP TV, 26 créditos |
| **3** | Revendedor Marcos | `marcos@streamtv.com` | `123` | Pertence ao CINEFP TV, 7 créditos |

> Dica: Você também pode alternar entre qualquer perfil instantaneamente pelo menu suspenso **"Trocar Perfil"** no topo da tela.

---

## 📡 Configuração Oficial do Baserow Master (Super Admin)

As seguintes tabelas e credenciais do desenvolvedor foram integradas ao sistema:
- **URL Base:** `http://31.220.72.235:8080/`
- **Token do Super Admin:** `Mu9bhoLo59fRYoyNOgSjFaxb6sjqT9sj`
- **Tabela Tenant (Inquilinos):** `1575`
- **Tabela Revendedor (Parceiros):** `1574`
- **Tabela Usuários (Clientes Finais do Streaming):** `889`

### Estrutura de Campos da Tabela Usuários (889):
- `ID`: Device ID do aparelho (ex: `05e859593bcb0110`)
- `Nome`: Nome do cliente final
- `Email`: Email ou login de acesso
- `Senha`: Senha do aplicativo
- `Status`: `Ativo`, `Grátis`, `Vencido` ou `Teste`
- `Vencimento`: Data de vencimento no formato `YYYY-MM-DD`
- `Limite`: Limite de telas simultâneas (padrão 1)
- `RevendedorId`: UUID do Revendedor que cadastrou o cliente
- `CriadoPor`: Nome do revendedor ou `"DONO"`

No Painel do Super Admin, você pode clicar no botão **"Testar Conexão das 3 Tabelas"** para verificar em tempo real o status e a latência de resposta de cada uma das tabelas `1575`, `1574` e `889`.
