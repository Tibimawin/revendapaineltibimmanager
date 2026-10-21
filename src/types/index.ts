export type UserRole = 'SUPER_ADMIN' | 'TENANT_OWNER' | 'RESELLER';

export type TenantStatus = 'ATIVO' | 'BLOQUEADO';
export type ResellerStatus = 'ATIVO' | 'BLOQUEADO';
export type ClientStatus = 'Premium' | 'Ativo' | 'Grátis' | 'Vencido' | 'Teste';

export interface Tenant {
  id: string;
  nomeDono: string;
  email: string;
  senha?: string;
  whatsapp: string;
  nomeApp: string;
  slug: string;
  logoUrl: string;
  corPrimaria: string;
  baserowUrl: string;
  baserowToken: string;
  baserowTableUsuarios: string;
  chavePix: string;
  valorCreditoUnitario: number;
  appDownloadUrl: string;
  status: TenantStatus;
  vencimentoAssinatura: string;
  dataCriacao: string;
}

export interface Reseller {
  id: string;
  tenantId: string;
  nome: string;
  email: string;
  senha?: string;
  whatsapp: string;
  saldoCreditos: number;
  cotaTestesDiarios: number;
  testesUsadosHoje: number;
  status: ResellerStatus;
  dataCriacao: string;
}

export interface BaserowClient {
  id: string | number; // Baserow row ID
  ID?: string | null; // Device ID do aparelho (atribuído pelo aparelho do usuário na primeira conexão, nulo ao criar)
  DeviceId?: string | null;
  Nome: string; // Nome do cliente final
  Email: string; // Email ou login de acesso
  Senha: string; // Senha do app
  Status: ClientStatus; // "Premium" para assinantes, "Teste", "Grátis", "Vencido"
  Vencimento: string; // Formato ISO completo: 2026-10-28T06:45:39.809Z
  DataCriacao?: string; // Formato ISO completo: 2026-10-28T06:45:39.809Z
  Limite: number; // Telas simultâneas (padrão 1)
  RevendedorId: string; // UUID do revendedor criador
  CriadoPor: string; // Nome do revendedor ou "DONO"
  Telefone?: string | null; // Telefone/WhatsApp internacional
  WhatsApp?: string | null;
  tenantId: string;
  dataCriacao?: string;
}

export interface CreditTransaction {
  id: string;
  tenantId: string;
  revendedorId: string;
  revendedorNome: string;
  tipo: 'ADICAO' | 'SUBTRACAO' | 'CONSUMO_NOVO' | 'CONSUMO_RENOVACAO';
  quantidade: number;
  descricao: string;
  dataCriacao: string;
}

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenant?: Tenant;
  reseller?: Reseller;
  impersonatedBy?: {
    userId: string;
    role: UserRole;
    name: string;
  };
}

