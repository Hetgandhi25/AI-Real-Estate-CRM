export type ConversationMessage = {
  from: string;
  text: string;
  timestamp?: string;
};

export type Conversation = {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; email: string; phone?: string } | null;
  messages: ConversationMessage[];
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};
