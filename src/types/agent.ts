export type Agent = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  experience: number;
  specialization?: string | null;
  performanceScore: number;
};
