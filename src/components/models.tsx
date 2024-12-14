export interface ChatSession {
  items: ChatLine[];
}

export enum ChatLineType {
  HUMAN,
  BOT,
}
export interface ChatLine {
  type: ChatLineType;
  text: string;
  createdAt: string;
}

export interface LLMRequest {
  question: string;
}

export interface LLMResponse {
  user_question: string;
  llm_response: LlmResponseDetails;
}

export interface LlmResponseDetails {
  llm_comment?: string;
  http_method?: string;
  http_basepath?: string;
  operation_summary?: string;
  operation_scopes?: string[];
  api_name?: string;
  json_document?: unknown;
}

export interface Message {
  id: string;
  no: number;
  text: string;
  sender: "user" | "bot";
  testRequest?: TestRequest;
}

export interface TestRequest {
  isValidRequest: boolean;
  llmResponse?: LlmResponseDetails;
}

export interface ISession {
  id: string;
  maxUserMessages: number;
  maxBotMessages: number;
  messages: Message[];
  currentTestRequestId?: string;
  idToIndex: { [key: string]: number };
}

export interface ApiResponse {
  status: number;
  body?: unknown;
}

export enum SessionChangeAction {
  SEND_USER,
  SEND_BOT,
  RESET,
  START,
  SELECT_MESSAGE,
  NONE,
}
