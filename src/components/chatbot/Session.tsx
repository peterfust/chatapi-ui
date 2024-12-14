import {
  ISession as SessionData,
  Message,
  TestRequest,
  LlmResponseDetails,
} from "../models";
import { v4 as uuidv4 } from "uuid";

export class Session {
  public readonly sessionData: SessionData;

  public static toString(session?: Session): string {
    if (!session) return "undefined";
    return JSON.stringify(session.sessionData);
  }
  public static fromString(sessionString?: string | null): Session {
    if (sessionString === undefined) return new Session();
    if (sessionString === null) return new Session();
    if (sessionString === "undefined") return new Session();
    try {
      return new Session(JSON.parse(sessionString));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return new Session();
    }
  }

  public static fromLocalStorage(): Session {
    //console.log("load session from storage");
    return Session.fromString(localStorage.getItem("session"));
  }

  public static toLocalStorage(session?: Session) {
    if (!session) {
      localStorage.setItem("session", "");
      return;
    }
    localStorage.setItem("session", JSON.stringify(session.sessionData));
    //console.log(session.sessionData);
    //console.log("write session to storage");
  }

  constructor(sessionData?: SessionData) {
    this.sessionData = sessionData ? sessionData : this.emptySession();
  }
  private emptySession(): SessionData {
    return {
      id: uuidv4(),
      maxUserMessages: 0,
      maxBotMessages: 0,
      messages: [],
      currentTestRequestId: undefined,
      idToIndex: {},
    } as SessionData;
  }

  public addUserQuestion(text: string): Session {
    const newMessage = {
      id: uuidv4(),
      no: ++this.sessionData.maxUserMessages,
      sender: "user",
      text: text,
    } as Message;
    this.sessionData.messages = [...this.sessionData.messages, newMessage];
    this.sessionData.idToIndex[newMessage.id] =
      this.sessionData.messages.length - 1;
    return new Session(this.sessionData);
  }

  private isJsonResponse(json?: unknown): boolean {
    if (!json) return false;
    if (typeof json === "string") {
      return json.trim() === "";
    }
    const jsonString = JSON.stringify(json);
    if (jsonString === "{}") return false;
    return true;
  }
  public addBotAnswer(llmResponseDetails: LlmResponseDetails): Session {
    const response = {
      isValidRequest: this.isJsonResponse(llmResponseDetails?.json_document),
      llmResponse: llmResponseDetails,
    } as TestRequest;
    const newMessage = {
      id: uuidv4(),
      no: ++this.sessionData.maxBotMessages,
      sender: "bot",
      text: response?.llmResponse?.llm_comment,
      testRequest: response,
    } as Message;
    this.sessionData.messages = [...this.sessionData.messages, newMessage];
    this.sessionData.idToIndex[newMessage.id] =
      this.sessionData.messages.length - 1;
    if (newMessage.testRequest?.isValidRequest) {
      this.sessionData.currentTestRequestId = newMessage.id;
    } else {
      this.useTestRequest(newMessage.id);
    }
    return new Session(this.sessionData);
  }
  private lastValidBotMessage(): Message | undefined {
    let index = this.sessionData.messages.length - 1;
    while (index >= 0) {
      const message = this.sessionData.messages[index];
      if (message.sender === "bot" && message.testRequest?.isValidRequest) {
        return message;
      }
      index--;
    }
    return undefined;
  }
  private lastBotMessage(): Message | undefined {
    let index = this.sessionData.messages.length - 1;
    while (index >= 0) {
      const message = this.sessionData.messages[index];
      if (message.sender === "bot") {
        return message;
      }
      index--;
    }
    return undefined;
  }
  private setLastValidMessage = (): TestRequest | undefined => {
    const lastValidMessage = this.lastValidBotMessage();
    if (lastValidMessage) {
      this.sessionData.currentTestRequestId = lastValidMessage.id;
      return lastValidMessage.testRequest;
    } else {
      return undefined;
    }
  };

  public useTestRequest(messageId?: string): TestRequest | undefined {
    if (!messageId) return this.setLastValidMessage();
    const index = this.sessionData.idToIndex[messageId];
    // select last valid
    //const botMessage = this.lastValidBotMessageByIndex(index);
    // select only
    const botMessage = this.botMessageByIndex(index);
    if (botMessage) {
      this.sessionData.currentTestRequestId = botMessage.id;
      return botMessage.testRequest;
    } else {
      //return this.setLastValidMessage();
      return undefined;
    }
  }

  public lastValidBotMessageByIndex(index: number): Message | undefined {
    if (index < 0) return undefined;
    const botMessage = this.botMessageByIndex(index);
    if (botMessage && botMessage.testRequest?.isValidRequest) {
      return botMessage;
    } else {
      return this.lastValidBotMessageByIndex(index - 2);
    }
  }
  public botMessageByIndex(
    index: number,
    retries: number = 0
  ): Message | undefined {
    if (index === undefined) return undefined;
    if (index >= 0 && index < this.sessionData.messages.length) {
      const message = this.sessionData.messages[index];
      if (message.sender === "user") {
        if (retries > 0) return undefined;
        return this.botMessageByIndex(index + 1, retries + 1);
      } else {
        return message;
      }
    } else {
      return undefined;
    }
  }
  public getCurrentTestRequest(): TestRequest | undefined {
    if (!this.sessionData.currentTestRequestId)
      return this.lastBotMessage()?.testRequest;
    return this.sessionData.messages[
      this.sessionData.idToIndex[this.sessionData.currentTestRequestId]
    ]?.testRequest;
  }
  public getMessages(): Message[] {
    return this.sessionData.messages;
  }
}
