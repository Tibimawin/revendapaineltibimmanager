import { Tenant, Reseller, BaserowClient, CreditTransaction } from '../types';

// Array vazio: sem dados fictícios de demonstração.
// Todos os dados são sincronizados em tempo real com as tabelas reais do Baserow:
// Tenant: Tabela 1575
// Revendedor: Tabela 1574
// Usuários: Tabela 889
export const INITIAL_TENANTS: Tenant[] = [];

export const INITIAL_RESELLERS: Reseller[] = [];

export const INITIAL_CLIENTS: BaserowClient[] = [];

export const INITIAL_TRANSACTIONS: CreditTransaction[] = [];
