import axios,{AxiosResponse} from 'axios'

const environment = ["dev","deploy"];

export type RouteParameters = {
    origin:string;
    destination:string;
    mode:string;
}
export interface RouteDetails{
    distance:string;
    duration:string;
    polyline:string;
    summary:string;
}
type RoutesResponse = RouteDetails[];

const client = axios.create({ baseURL: 'http://127.0.0.1:8000/',timeout:10000});

export async function getRoute({origin,destination,mode}:RouteParameters): Promise<RouteDetails>{
    try {
        // Axios call is typed using the FullRoutesResponse array
        const res: AxiosResponse<RoutesResponse> = await client.get("/routes", {
            params: {
                origin: origin,
                destination,
                mode
            },
        });

        const routes = res.data;

        if (!routes || routes.length === 0) {
            throw new Error("No routes found by the server.");
        }

        // Return only the first (best) route object, as it contains the distance, 
        // duration, and polyline for the primary suggestion.
        return routes[0];

    } catch (error) {
        // Use the Axios type guard to handle specific Axios errors
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error(`API Error - Status ${status}:`, data);
            throw new Error(`Failed to fetch route data. Server returned status: ${status}`);
        } else {
            console.error("An unexpected network error occurred:", error);
            throw new Error("An unknown error occurred while fetching the route.");
        }
    }
}