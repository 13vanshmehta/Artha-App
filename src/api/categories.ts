import { apiClient } from '../services/apiClient';
import { Category, CreateCategoryDto } from './types';

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.request<{ categories: Category[] }>('/categories', {
      method: 'GET',
    });
    return res?.categories ?? [];
  },

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const res = await apiClient.request<{ category: Category }>('/categories', {
      method: 'POST',
      body: dto,
    });
    return res.category;
  },
};
