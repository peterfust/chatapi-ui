// src/JsonViewer.tsx
import React, { useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ApiResponse, TestRequest } from "../models";
import { getToken, runTestRequest } from "../hooks/useApi";
import { twilight } from "react-syntax-highlighter/dist/cjs/styles/prism";

const DEFFAULT_RESPONSE = {
  status: 200,
  body: { action: "click 'try' to see the result" },
};
interface JsonViewerProps {
  testRequest?: TestRequest;
  inEditDocument: (newDocument: unknown) => void;
  clean: boolean;
}
const JsonViewer: React.FC<JsonViewerProps> = ({
  testRequest,
  inEditDocument,
  clean,
}) => {
  const [testResponse, setTestResponse] =
    useState<ApiResponse>(DEFFAULT_RESPONSE);
  const [inEditMode, setInEditMode] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editText, setEditText] = useState<string>("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  const handleRunApi = async (testRequest: TestRequest): Promise<void> => {
    try {
      const response = await runTestRequest(getToken(), testRequest);
      setTestResponse(response);
    } catch (e) {
      const error = e as { message: string };
      setTestResponse({
        status: 500,
        body: { code: "500", message: "Server error - " + error.message },
      } as ApiResponse);
    }
  };

  const textFromTestRequest = (testRequest?: TestRequest): string => {
    if (!testRequest) return "{\n}";
    return JSON.stringify(testRequest?.llmResponse?.json_document, null, 2);
  };
  const countNewlines = (str: string): number => str.split("\n").length - 1;
  const countLinesFromTestRequest = (testRequest?: TestRequest): number => {
    if (!testRequest) return 2;
    return countNewlines(textFromTestRequest(testRequest)) + 1;
  };

  const handleDoubleClickToEdit = (): void => {
    if (inEditMode) {
      if (testRequest && testRequest.llmResponse) {
        if (textAreaRef.current?.value) {
          try {
            const json = JSON.parse(textAreaRef.current.value);
            testRequest.llmResponse.json_document = json;
            inEditDocument(json);
          } catch (e) {
            console.log("Error occured : " + e);
            return;
          }
        }
      }
    } else {
      setEditText(textFromTestRequest(testRequest));
    }
    setInEditMode(!inEditMode);
  };

  const canTry = (testRequest?: TestRequest): boolean => {
    const llmResponse = testRequest?.llmResponse;
    if (llmResponse) {
      return !!(
        llmResponse.api_name &&
        llmResponse.http_method &&
        llmResponse.http_basepath
      );
    } else {
      return false;
    }
  };

  const isValidRequest = (testRequest?: TestRequest): boolean => {
    return !!testRequest?.isValidRequest && !!testRequest?.llmResponse;
  };

  const body_as_string = (response: ApiResponse) => {
    if (clean) {
      if (testResponse !== DEFFAULT_RESPONSE) {
        setTestResponse(DEFFAULT_RESPONSE);
      }
      return JSON.stringify(DEFFAULT_RESPONSE.body, null, 2);
    }
    if (!response?.body) {
      return "{}";
    }
    let body = testResponse.body as object;
    if (testResponse.status < 200 || testResponse.status >= 300) {
      body = { http_status: testResponse.status, ...body };
    }
    return JSON.stringify(body, null, 2);
  };

  return (
    <>
      <div
        className="json-viewer"
        onDoubleClickCapture={handleDoubleClickToEdit}
      >
        <div className="json-viewer-header">
          {isValidRequest(testRequest) ? (
            <>
              Request for: {testRequest?.llmResponse?.api_name}
              {" - "}
              {testRequest?.llmResponse?.operation_summary}
              <br></br>
              {canTry(testRequest) && (
                <>
                  <button onClick={() => handleRunApi(testRequest!)}>
                    Try
                  </button>{" "}
                </>
              )}
              {testRequest?.llmResponse?.http_method}{" "}
              {testRequest?.llmResponse?.http_basepath}
            </>
          ) : (
            "Response: empty, start chatting with me"
          )}
        </div>
        {!inEditMode ? (
          <SyntaxHighlighter language="json" style={twilight}>
            {JSON.stringify(testRequest?.llmResponse?.json_document, null, 2)}
          </SyntaxHighlighter>
        ) : (
          <textarea
            ref={textAreaRef}
            rows={countLinesFromTestRequest(testRequest)}
          >
            {textFromTestRequest(testRequest)}
          </textarea>
        )}
      </div>
      <div className="json-result-viewer">
        <SyntaxHighlighter
          language="json"
          style={twilight}
          wrapLines={true}
          wrapLongLines={true}
        >
          {clean
            ? body_as_string(DEFFAULT_RESPONSE)
            : body_as_string(testResponse)}
        </SyntaxHighlighter>
      </div>
    </>
  );
};

export default JsonViewer;
