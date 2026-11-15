import { apiClient } from '../services/apiClient';
import { decimalInputToPaiseMinor, paiseMinorToDecimal } from '../utils/money';
import { Account, CreateAccountDto } from './types';

export function normalizeAccount(raw: any): Account {
  if (!raw) return raw;

  let balance = typeof raw.balance === 'number' ? raw.balance : 0;
  let currentBalanceMinor = '0';

  if (raw.currentBalanceMinor !== undefined && raw.currentBalanceMinor !== null) {
    currentBalanceMinor = String(raw.currentBalanceMinor);
    balance = paiseMinorToDecimal(raw.currentBalanceMinor);
  } else if (raw.balanceMinor !== undefined && raw.balanceMinor !== null) {
    currentBalanceMinor = String(raw.balanceMinor);
    balance = paiseMinorToDecimal(raw.balanceMinor);
  } else if (raw.balance !== undefined && raw.balance !== null) {
    currentBalanceMinor = decimalInputToPaiseMinor(raw.balance);
  }

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    balance,
    currentBalanceMinor,
    balanceMinor: currentBalanceMinor,
    currency: raw.currency || 'INR',
    isDefault: Boolean(raw.isDefault),
    institution: raw.institution || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const accountsApi = {
  async getAccounts(): Promise<Account[]> {
    const res = await apiClient.request<{ accounts: any[] }>('/accounts', {
      method: 'GET',
    });
    const list = res?.accounts ?? [];
    return list.map(normalizeAccount);
  },

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const initialBalanceMinor =
      dto.initialBalanceMinor ||
      (dto.initialBalance !== undefined
        ? decimalInputToPaiseMinor(dto.initialBalance)
        : undefined);

    const body: Record<string, unknown> = {
      name: dto.name.trim(),
      type: dto.type,
      currency: dto.currency || 'INR',
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(initialBalanceMinor !== undefined
        ? {
            openingBalanceMinor: initialBalanceMinor,
          }
        : {}),
    };

    const res = await apiClient.request<{ account: any }>('/accounts', {
      method: 'POST',
      body,
    });
    return normalizeAccount(res.account);
  },
};
