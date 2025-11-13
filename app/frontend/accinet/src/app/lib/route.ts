import axios, { AxiosResponse } from "axios";

export type RouteParameters = {
    origin: string;
    destination: string;
    mode: string;
};

export interface RouteDetails {
    distance: string;
    duration: string;
    polyline: string;
    summary: string;
}

type RoutesResponse = RouteDetails[];

const client = axios.create({
    baseURL: "http://127.0.0.1:8000/",
    timeout: 10000,
});

export async function getRoute({
    origin,
    destination,
    mode,
}: RouteParameters): Promise<RoutesResponse> {
    try {
        const res: AxiosResponse<RoutesResponse> = await client.get("/routes", {
            params: { origin, destination, mode },
        });

        const routes = res.data;

        if (!routes || routes.length === 0) {
            throw new Error("No routes found by the server.");
        }

        console.log(`Received ${routes.length} route(s) from backend.`);
        return routes;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error(`API Error - Status ${status}:`, data);
            throw new Error(`Failed to fetch route data. Server returned status: ${status}`);
        } else {
            console.error("Unexpected network error:", error);
            throw new Error("An unknown error occurred while fetching the route.");
        }
    }
}
