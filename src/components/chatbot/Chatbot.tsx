// src/Chatbot.tsx
import React, { useEffect, useRef, useState } from "react";
import "./Chatbot.css";
import JsonViewer from "../json/JsonViewer";
import ReactMarkdown from "react-markdown";
import {
  LLMResponse,
  Message,
  SessionChangeAction,
  TestRequest,
} from "../models";
import { BlinkingDots } from "./BlinkingDots";
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";
import { Session } from "./Session";
import { getToken, useApis } from "../hooks/useApi";

interface ChatbotProps {
  sendExternalMessage: (
    apiName: string,
    text: string,
    json?: unknown
  ) => Promise<LLMResponse>;
}

const DEFAULT_MESSAGE = "";

const Chatbot: React.FC<ChatbotProps> = ({ sendExternalMessage }) => {
  const { data, isLoading } = useApis(getToken());
  const [session, setSession] = useState<Session>(() => {
    return Session.fromLocalStorage();
  });

  const [inputValue, setInputValue] = useState(DEFAULT_MESSAGE);
  const [messageSent, setMessageSent] = useState<string>("false");
  const [lastAction, setLastAction] = useState<SessionChangeAction>(
    SessionChangeAction.START
  );
  const [selectedAPI, setSelectedAPI] = useState<string>("");

  const textAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea
  const messagesRef = useRef<HTMLDivElement>(null); // Ref for the textarea

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return;

    setLastAction(SessionChangeAction.SEND_USER);
    setSession(session.addUserQuestion(inputValue));

    setInputValue("");
    setMessageSent("true4711");
    if (textAreaRef.current) {
      const textLength = textAreaRef.current.value.length;
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(textLength, textLength);
    }
    const botResponse = await sendExternalMessage(
      selectedAPI,
      inputValue,
      session.getCurrentTestRequest()?.llmResponse?.json_document
    );
    setLastAction(SessionChangeAction.SEND_BOT);
    setSession(session.addBotAnswer(botResponse.llm_response));

    Session.toLocalStorage(session);
    setInputValue("");
    setMessageSent("false");
  };

  const handleSendMessageFromButton = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    event.stopPropagation();
    handleSendMessage();
  };

  useEffect(() => {
    Session.toLocalStorage(session);
    scrollToBottom();
  }, [session]);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      if (lastAction !== SessionChangeAction.SELECT_MESSAGE) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
      setLastAction(SessionChangeAction.NONE);
    }
  };
  useEffect(() => {
    if (textAreaRef.current) {
      const textLength = textAreaRef.current.value.length;
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(textLength, textLength); // Set cursor to the end
    }
    scrollToBottom();
  }, []);
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (messageSent === "true") {
      setMessageSent("false");
      event.target.value = "";
    }
    if (event.target.value === "\n") {
      event.target.value = "";
    }
    setInputValue(event.target.value);
    updateInputHeight(0);
  };

  const updateInputHeight = (manual: number): void => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto"; // Reset the height to auto
      textAreaRef.current.style.height = `${
        textAreaRef.current.scrollHeight - 20 + manual
      }px`; // Set height based on content
    }
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter") {
      if (event.altKey) {
        // skip
        setInputValue(inputValue + "\n");
        updateInputHeight(24);
      } else {
        await handleSendMessage();
      }
    }
  };

  const reformatText = (msg: Message): string => {
    if (!msg?.text) return "";
    const newText = msg.text.replace(/\n(?=[^ -]+)/g, "\n\n");
    if (msg.sender === "bot") {
      return `${msg.no}] ${newText}`;
    } else {
      return newText;
    }
  };
  const handleResetHistory = (
    event: React.MouseEvent<HTMLImageElement, MouseEvent>
  ): void => {
    event.stopPropagation();
    setLastAction(SessionChangeAction.RESET);
    setSession(new Session());
    setInputValue(DEFAULT_MESSAGE);
    setMessageSent("false");
  };

  const testCaseForIndex = (index: number): TestRequest | undefined => {
    return session.botMessageByIndex(index)?.testRequest;
  };

  const selectTestRequestFromMessage = (
    event: React.MouseEvent<HTMLImageElement, MouseEvent>,
    index: number
  ): void => {
    const newTestRequestId = session.botMessageByIndex(index)?.id;
    setLastAction(SessionChangeAction.SELECT_MESSAGE);
    session.useTestRequest(newTestRequestId);
    setSession(new Session(session.sessionData));
    event.stopPropagation();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTestRequestFromId = (_id?: string): TestRequest | undefined => {
    return session.getCurrentTestRequest();
  };

  const inEditDocument = (json: unknown): void => {
    const llmResponse = session.getCurrentTestRequest()?.llmResponse;
    if (llmResponse) {
      llmResponse.json_document = json;
    }
    setSession(new Session(session.sessionData));
  };

  return (
    <div className="app-container">
      <div className="chatbot-container">
        <div className="chatbot-header">
          <div className="chatbot-logo-container">
            <img
              className="chatbot-logo"
              src="LLM-TAPIR-logo.png"
              alt="Chatbot Logo"
              onClick={handleResetHistory}
            />
          </div>
          <div className="chatbot-title">LLM-TAPIR Chat</div>{" "}
          <div>
            <select
              value={selectedAPI}
              onChange={(e) => setSelectedAPI(e.target.value)}
              className="api-select"
            >
              <option key={-1} value="" disabled>
                {isLoading ? "loading..." : "choose your API"}
              </option>
              {data?.map((apiName, index) => (
                <option
                  key={index}
                  value={apiName}
                  selected={apiName === selectedAPI}
                >
                  {apiName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chatbot-messages" ref={messagesRef}>
          {session.sessionData.messages.map((msg, index) => (
            <div
              key={index}
              className={`chatbot-message ${msg.sender}-message`}
              onClick={(
                event: React.MouseEvent<HTMLImageElement, MouseEvent>
              ) => selectTestRequestFromMessage(event, index)}
            >
              <ReactMarkdown>{reformatText(msg)}</ReactMarkdown>
              {testCaseForIndex(index)?.isValidRequest === false &&
                msg &&
                msg.sender === "bot" && (
                  <ExclamationTriangleIcon className="warning-sign"></ExclamationTriangleIcon>
                )}
            </div>
          ))}
          {messageSent === "true4711" ? (
            <div className={`chatbot-message bot-message-blinking`}>
              <BlinkingDots
                isRunning={messageSent}
                onStartBlinking={() => scrollToBottom()}
                onStopBlinking={() => scrollToBottom()}
              ></BlinkingDots>
            </div>
          ) : (
            <></>
          )}
        </div>
        <div className="input-area">
          <textarea
            ref={textAreaRef} // Attach the ref here
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="input-field"
            placeholder="Type a message..."
            rows={1} // Starts with a single row
          />
          <button
            disabled={selectedAPI === undefined || selectedAPI === ""}
            onClick={handleSendMessageFromButton}
            className="send-button"
          >
            Send
          </button>
        </div>
      </div>
      <JsonViewer
        testRequest={getTestRequestFromId(
          session.sessionData.currentTestRequestId
        )}
        inEditDocument={inEditDocument}
        clean={session.sessionData.messages.length == 0}
      />
    </div>
  );
};

export default Chatbot;
