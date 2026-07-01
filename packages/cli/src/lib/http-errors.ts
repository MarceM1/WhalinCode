type ErrorResponse = {
    json: () => Promise<unknown>;
    status: number;
    statusText: string;
};

export async function getErrorMessage(response: ErrorResponse) {
    try {
        const data = (await response.json()) as { error?: string };

        if (typeof data.error === 'string' && data.error.length > 0) {
            return data.error;
        }
    } catch {
        // Ignora error payloads invalidos y cae en el status text de abajo
    }

    return response.statusText || `Request failed with status ${response.status}`;
}
