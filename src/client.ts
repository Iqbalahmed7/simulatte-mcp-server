const API_URL = process.env.SIMULATTE_API_URL ?? "https://app.simulatte.io/api";
const API_KEY = process.env.SIMULATTE_API_KEY;

if (!API_KEY) {
  console.error(
    "Missing SIMULATTE_API_KEY environment variable. " +
      "Get one at https://app.simulatte.io/settings/api-keys"
  );
  process.exit(1);
}

export class SimulatteClient {
  constructor(
    private apiKey: string = API_KEY!,
    private baseUrl: string = API_URL
  ) {}

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Simulatte API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Simulatte API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}
