export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
}

export interface ChatSession {
  id: string;
  createdAt: Date;
  messages: Message[];
}
