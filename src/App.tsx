// src/App.tsx
import React from "react";
import "./App.css"; // Import your CSS file
import Chatbot from "./components/chatbot/Chatbot";
import { getToken, sendMessage } from "./components/hooks/useApi";
import { LLMResponse } from "./components/models";

const sendExternalMessage = async (
  apiName: string,
  text: string,
  json?: unknown
): Promise<LLMResponse> => {
  return await sendMessage(getToken(), "1", apiName, text, json);
};

const App: React.FC = () => {
  return (
    <div className="App">
      <Chatbot sendExternalMessage={sendExternalMessage} />
    </div>
  );
};

export default App;
