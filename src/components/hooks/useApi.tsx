// hooks/useApiData.ts
import useSWR, { mutate } from "swr";
import { useNavigate } from "react-router-dom";
import {
  ApiResponse,
  ChatSession,
  LLMResponse,
  LlmResponseDetails,
  TestRequest,
} from "../models";

let VITE_API_KEY: string = "";

export const getToken = (): string => {
  if (VITE_API_KEY) return VITE_API_KEY;
  if (!import.meta.env.VITE_API_KEY) {
    const apiKey = window.prompt("VITE_API_KEY=");
    if (apiKey) {
      VITE_API_KEY = apiKey;
      return VITE_API_KEY;
    }
  }
  return import.meta.env.VITE_API_KEY;
};

function reload(): Promise<null> {
  window.location.reload();
  return Promise.resolve(null);
}
const fetcherWithToken = (token: string | null) => (url: string) =>
  token != null
    ? fetch(`${import.meta.env.VITE_API_URL}${url}`, {
        headers: {
          Authorization: "Bearer " + token, // Replace YOUR_ACCESS_TOKEN with your actual token
          "Content-Type": "application/json",
        },
      })
        .then(async (res) => {
          if (res.ok) {
            //console.log("fetcherWithToken res.ok");
            return res.json();
          } else if (res.status === 401) {
            //console.log("fetcherWithToken reload()");
            return reload();
          } else if (res.status === 403) {
            //console.log("fetcherWithToken /not-authorized");
            const navigate = useNavigate();
            void navigate("/not-authorized");
          }
        })
        .catch((error) => {
          console.log(error);
        })
    : reload();
//Promise.resolve(null)

export function useSession(id: string) {
  const fetcher = fetcherWithToken("none");
  return useSWR<ChatSession[]>(`/sessions/${id}`, fetcher);
}

interface RequestBody {
  api_name: string;
  question: string;
  json_document?: unknown;
}

interface RunRequestBody {
  path: string;
  http_method?: string;
  json_data?: unknown;
}

const responseBody = async (response?: Response): Promise<unknown> => {
  if (!response) return {};
  try {
    return (await response.json()) ?? {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return {};
  }
};

export function useApis(token: string) {
  const fetcher = fetcherWithToken(token);
  return useSWR<string[]>(`/apis`, fetcher);
}

export async function runTestRequest(
  token: string,
  testRequest: TestRequest
): Promise<ApiResponse> {
  const body = {
    path: testRequest.llmResponse?.http_basepath,
    http_method: testRequest.llmResponse?.http_method,
    json_data: testRequest.llmResponse?.json_document,
    scopes: testRequest.llmResponse?.operation_scopes,
  } as RunRequestBody;

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/run-api-request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    return {
      status: response.status,
      body: await responseBody(response),
    } as ApiResponse;
  }
  if (response.status === 204) {
    return {
      status: response.status,
    } as ApiResponse;
  } else {
    return {
      status: response.status,
      body: await responseBody(response),
    } as ApiResponse;
  }
}

export async function sendMessage(
  token: string,
  sessionId: string,
  apiName: string,
  text: string,
  json?: unknown
): Promise<LLMResponse> {
  try {
    //console.log(import.meta.env.VITE_API_URL);
    const body = {
      api_name: apiName,
      question: text,
    } as RequestBody;
    if (json) {
      body.json_document = json;
    }
    const response = await fetch(`${import.meta.env.VITE_API_URL}/questions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }
    void mutate(`/sessions/${sessionId}`);
    return JSON.parse(await response.text()) as LLMResponse;
  } catch (error) {
    console.log(error);
    return {
      user_question: text,
      llm_response: {
        llm_comment: "An error occurred " + error,
      } as LlmResponseDetails,
    } as LLMResponse;
  }
}
