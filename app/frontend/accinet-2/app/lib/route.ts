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

export async function getRoute({
    origin,
    destination,
    mode,
}: RouteParameters): Promise<RoutesResponse> {
    try {
        // Call our internal Next.js API route
        const params = new URLSearchParams({
            origin: origin,
            destination: destination,
            mode: mode || 'driving',
        });

        const response = await fetch(`/api/routes?${params.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned status ${response.status}`);
        }

        const routes = await response.json();

        if (!routes || routes.length === 0) {
            throw new Error("No routes found.");
        }

        console.log(`Received ${routes.length} route(s) from internal API.`);
        return routes;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        } else {
            console.error("Unexpected error:", error);
            throw new Error("An unknown error occurred while fetching the route.");
        }
    }
}
