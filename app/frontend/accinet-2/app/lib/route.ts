import axios, { AxiosResponse } from "axios";

export type RouteParameters = {
    origin: string;
    destination: string;
    mode: string;
};

export interface RouteCondition {
    lat: number;
    lon: number;
    // New simplified format from backend (sampled conditions)
    weathercode?: number;
    temperature?: number;
    road_type?: string;
    road_name?: string;
    // Legacy format (for backward compatibility)
    weather?: {
        current_weather?: {
            temperature?: number;
            weathercode?: number;
            windspeed?: number;
        };
        error?: string;
    };
    road?: {
        surface: string;
        road_type: string;
        condition: string;
        name: string;
    };
}

export interface RouteDetails {
    distance: string;
    duration: string;
    polyline: string;
    summary: string;
    values?: number[]; // Optional array of values (0.0-1.0) for each coordinate point
    conditions?: RouteCondition[]; // Weather and road conditions for each coordinate
}

type RoutesResponse = RouteDetails[];

const client = axios.create({
    baseURL: "http://127.0.0.1:8000/",
    timeout: 60000, // 60 seconds - routes with conditions may take longer
});

export async function getRoute({
    origin,
    destination,
    mode,
}: RouteParameters): Promise<RoutesResponse> {
    try {
        const res: AxiosResponse<RoutesResponse | { error: string }> = await client.get("/routes", {
            params: { origin, destination, mode },
        });

        // Check if response contains an error
        if (res.data && typeof res.data === 'object' && 'error' in res.data) {
            const errorData = res.data as { error: string };
            throw new Error(errorData.error || 'Server returned an error');
        }

        const routes = res.data as RoutesResponse;

        if (!routes || routes.length === 0) {
            throw new Error("No routes found by the server.");
        }

        console.log(`Received ${routes.length} route(s) from backend.`);
        return routes;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Network error (no response received)
            if (!error.response) {
                if (error.code === 'ECONNABORTED') {
                    throw new Error('Request timed out. The server may be processing a large route. Please try again.');
                } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                    throw new Error('Network error. Please check if the backend server is running at http://127.0.0.1:8000');
                } else {
                    throw new Error(`Network error: ${error.message}`);
                }
            }
            
            // HTTP error response
            const status = error.response.status;
            const data = error.response.data;
            console.error(`API Error - Status ${status}:`, data);
            
            // Try to extract error message from response
            const errorMessage = typeof data === 'object' && data !== null && 'error' in data
                ? (data as { error: string }).error
                : `Server returned status ${status}`;
            
            throw new Error(`Failed to fetch route data: ${errorMessage}`);
        } else if (error instanceof Error) {
            // Re-throw our custom errors
            throw error;
        } else {
            console.error("Unexpected network error:", error);
            throw new Error("An unknown error occurred while fetching the route.");
        }
    }
}

