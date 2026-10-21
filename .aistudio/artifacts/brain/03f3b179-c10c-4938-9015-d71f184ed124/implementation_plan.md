# Plataforma SaaS Multi-Tenant de Revenda de Streaming White-Label

Plataforma completa em 3 níveis hierárquicos (Super Admin, Dono do Aplicativo e Revendedor) para gestão e revenda de acessos a aplicativos de streaming (OTT / IPTV / VOD), com tema Dark Neon Cinema, suporte a marcas personalizadas (White-Label), integração REST dinâmica ao Baserow e motor transacional de créditos.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas na etapa inicial de alinhamento:**
> - **Conexão Baserow Híbrida**: Conexão REST real direta à API do Baserow (`http://31.220.72.235:8080/api/database/rows/table/{TABLE_ID}/`) com fallback inteligente em memória/local para garantir operação e testes sem falhas de conectividade externa.
> - **Identidade Visual**: Dark Neon Cinema (`#0A0F1D` com acentos Ciano `#00E5FF` e Dourado VIP `#FFC107`), tipografia limpa (*Plus Jakarta Sans* e numerais tabulares *JetBrains Mono*).
> - **Dados de Exemplo (Seed)**: A plataforma já iniciará populada com contas e dados para os 3 níveis (Super Admin, 2 Donos de App com marcas distintas ex: "CINEFP TV" e "VIP PLAY", e múltiplos Revendedores com clientes ativos e créditos).

---

### 1. Overview & Core Concept

- **O Que a Plataforma Faz**:
  Um sistema SaaS unificado onde o desenvolvedor da plataforma (Super Admin) gerencia múltiplos clientes empresariais (Donos de Aplicativos / Inquilinos). Cada Dono possui seu portal exclusivo com sua logo, nome e cor primária, podendo cadastrar revendedores parceiros e vender créditos. Os revendedores gerenciam seus clientes finais diretamente no Baserow do Dono correspondente, consumindo créditos por tempo de assinatura (+30, 90, 180 ou 365 dias) ou gerando testes grátis temporários (2h ou 4h), com envio rápido de dados formatados no WhatsApp.

- **Público-Alvo & Perfis de Acesso**:
  1. **Nível 1 - Super Admin (Desenvolvedor)**: Dono da infraestrutura SaaS. Configura novos Donos, gerencia assinaturas dos inquilinos, tokens de API Baserow e monitora a receita global.
  2. **Nível 2 - Dono do Aplicativo (Master / Inquilino)**: Opera com sua marca própria White-Label. Cadastra revendedores, gerencia estoque de créditos dos parceiros, configura chave PIX e cadastra clientes diretos sem custo de créditos.
  3. **Nível 3 - Revendedor (Parceiro)**: Vê apenas a marca do seu Dono de App. Consulta saldo de créditos, gera clientes ou testes rápidos, renova clientes existentes e solicita recarga de créditos via PIX diretamente ao seu Dono.

---

### 2. User Experience & Visual Design

#### Fluxos de Usuário Principais:
1. **Login Inteligente e Roteamento por Perfil**:
   - Tela de login com estética streaming premium.
   - Suporte a detecção de tenant por parâmetro de URL (ex: `?app=cinefp`) ou login direto por credenciais.
   - Troca rápida de contexto / demonstração ("Demo Switcher") no topo ou rodapé para alternar instantaneamente entre Super Admin, Dono do App (CINEFP / VIP PLAY) e Revendedor.

2. **Visão Super Admin**:
   - Painel com métricas da rede: Total de Donos, Total de Revendedores, Clientes Totais no ecossistema, Assinaturas a Vencer.
   - Gerenciamento de Tenants: Cadastro com Nome, Email, Senha, WhatsApp, Nome do App, Logo, Cor Primária, Baserow URL, Token e ID da Tabela.
   - Recurso de "Acessar como Dono" (Impersonation) para suporte técnico direto.

3. **Visão Dono do Aplicativo (White-Label)**:
   - Header dinâmico exibindo a Logo e o Nome do App do Dono com acento na cor configurada (`corPrimaria`).
   - Módulo "Meus Revendedores": listagem, cadastro, bloqueio/desbloqueio e modal de adição/remoção de créditos.
   - Módulo "Clientes Diretos": criação e visualização no Baserow sem custo de créditos.
   - Configurações da Chave PIX e Pacotes de Créditos para os revendedores.

4. **Visão Revendedor**:
   - Card de Saldo em destaque: `⭐ SEU SALDO: X CRÉDITOS` com botão de compra rápida via PIX com QR Code / Copia e Cola da chave do Dono.
   - Tabela de Clientes filtrada estritamente por `RevendedorId` com busca em tempo real e filtros de status (`Todos`, `Ativo`, `A Vencer`, `Vencido`, `Teste`).
   - Modais para: "Novo Cliente" (seleção de plano 1, 3, 6 ou 12 meses com cálculo de créditos), "Gerar Teste Grátis (2h/4h)" e "Renovar Cliente (+30 dias com cálculo inteligente a partir do vencimento)".
   - Ação rápida WhatsApp: botão que abre link direto `https://wa.me/{numero}?text={mensagem}` com mensagem formatada profissional com dados de acesso (Device ID/Login, Senha, Validade e Link do App).

#### Direção Visual & Design System:
- **Tema**: Dark Neon Cinema (`#0A0F1D` com superfícies em `#11192C` e `#182238`, bordas sutis `rgba(255, 255, 255, 0.08)` e efeito de profundidade).
- **Cores de Acento**: Ciano Elétrico (`#00E5FF`) padrão, Dourado VIP (`#FFC107`) para créditos e status VIP, Verde Esmeralda (`#10B981`) para ativos, Vermelho Coral (`#EF4444`) para vencidos.
- **Tipografia**: *Plus Jakarta Sans* para títulos e controles; numerais com `tabular-nums font-mono` para alinhamento em tabelas financeiras e contadores.
- **Zero-Pill Discipline**: Metadados limpos com separadores tipográficos (`·`), sem cápsulas de badges redundantes; botões com feedback tátil e micro-transições $\le 180\text{ms}$.

---

### 3. Key Product Decisions & Trade-Offs

- **Isolamento de Tenants e Revendedores**:
  - *Abordagem*: Cada revendedor é explicitamente vinculado a um `tenantId`. O backend autentica o usuário via JWT e injeta o `tenantId` em todas as rotas e queries.
  - *Justificativa*: Garante segurança estrita onde revendedores nunca têm acesso a dados de outros inquilinos ou outros revendedores.
- **Cliente Baserow Dinâmico com Fallback Resiliente**:
  - *Abordagem*: O backend cria clientes HTTP específicos com a `baserowUrl` e `baserowToken` do Tenant ativo. Se a requisição à instância remota falhar (por exemplo, firewall ou instância desligada), o sistema aciona fallback inteligente com dados locais espelhados, mantendo a aplicação 100% navegável e testável.
- **Transação Atômica de Créditos**:
  - *Abordagem*: Antes de qualquer gravação de cliente pelo revendedor, verifica saldo (`saldoCreditos >= creditosNecessarios`). A dedução de créditos ocorre de forma atômica no banco do SaaS antes de confirmar o registro no Baserow.
- **Regra de Renovação Inteligente**:
  - *Abordagem*: Se o cliente tem vencimento futuro (ex: faltam 7 dias), a nova data é `vencimentoAtual + 30 dias`. Se já estiver vencido, a nova data é `hoje + 30 dias`.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACES DO USUÁRIO                           │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │   Super Admin    │  │    Dono do App       │  │    Revendedor    │  │
│  │   (Plataforma)   │  │ (Marca White-Label)  │  │(Saldo & Clientes)│  │
│  └─────────┬────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
└────────────┼──────────────────────┼───────────────────────┼────────────┘
             │                      │                       │
             ▼                      ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE AUTENTICAÇÃO E SESSÃO                     │
│           JWT Token: { userId, role, tenantId, nome, appBrand }        │
│           Middleware de Segurança & Isolamento Multi-Tenant            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             ▼                                             ▼
┌─────────────────────────┐               ┌──────────────────────────────┐
│  SAAS DATABASE (Local)  │               │    BASEROW REST CLIENT       │
│  • Tenants (Inquilinos) │               │  • Instância do Dono:        │
│  • Revendedores         │               │    http://31.220.72.235:8080 │
│  • Histórico de Créditos│               │  • Tabela /rows/table/{ID}/  │
│  • Pacotes & Planos     │               │  • Fallback com Cache Local  │
└─────────────────────────┘               └──────────────────────────────┘
```

#### Estrutura de Modelos de Dados:

1. **Tenant (Dono do Aplicativo)**:
   - `id`, `nomeDono`, `email`, `senha`, `whatsapp`, `nomeApp`, `logoUrl`, `corPrimaria`, `baserowUrl`, `baserowToken`, `baserowTableUsuarios`, `chavePix`, `status` ("ATIVO" | "BLOQUEADO"), `vencimentoAssinatura`, `dataCriacao`.

2. **Revendedor**:
   - `id`, `tenantId`, `nome`, `email`, `senha`, `whatsapp`, `saldoCreditos`, `cotaTestesDiarios`, `testesUsadosHoje`, `status` ("ATIVO" | "BLOQUEADO"), `dataCriacao`.

3. **Cliente Baserow (`Usuarios`)**:
   - `id`, `Nome`, `Email`, `Senha`, `Status` ("Ativo" | "Grátis" | "Vencido" | "Teste"), `Vencimento` (YYYY-MM-DD), `Limite` (Telas), `RevendedorId`, `CriadoPor`, `tenantId`.

4. **TransacaoCreditos**:
   - `id`, `tenantId`, `revendedorId`, `tipo` ("ADICAO" | "CONSUMO_ASSINATURA" | "RENOVACAO"), `quantidade`, `descricao`, `data`.

#### Rotas da API Backend (Express):
- `POST /api/auth/login`: autenticação com retorno de perfil e tenant.
- `GET /api/auth/me`: dados do usuário ativo com token.
- `GET /api/superadmin/tenants`: lista de tenants com métricas.
- `POST /api/superadmin/tenants`: cadastro/edição de tenant e credenciais Baserow.
- `POST /api/superadmin/impersonate`: login como Dono para suporte.
- `GET /api/tenant/resellers`: lista de revendedores do tenant.
- `POST /api/tenant/resellers`: criação de revendedor.
- `POST /api/tenant/resellers/:id/credits`: recarga ou ajuste de saldo de créditos.
- `GET /api/reseller/clients`: listagem de clientes filtrados pelo revendedor no Baserow do tenant.
- `POST /api/reseller/clients`: criação de cliente com desconto atômico de créditos.
- `POST /api/reseller/clients/test`: geração de teste de 2h ou 4h sem gastar créditos.
- `POST /api/reseller/clients/:id/renew`: renovação inteligente (+30/90/180/365 dias).
- `GET /api/reseller/pix-info`: dados PIX do Dono para recarga.
