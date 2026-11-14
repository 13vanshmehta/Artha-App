export interface MockUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  phone: string;
  avatar?: string;
  currency: string;
  joinedDate: string;
}

export const mockUser: MockUser = {
  id: 'usr_001',
  name: 'Vansh Mehta',
  displayName: 'Vansh Mehta',
  email: 'vansh@example.com',
  phone: '+91 98765 43210',
  currency: 'INR',
  joinedDate: 'November 2026',
};
