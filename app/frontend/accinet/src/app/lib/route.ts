import axios from 'axios'

const environment = ["dev","deploy"];

const client = axios.create({ baseURL:'http://127.0.0.1:8000/'});
type route_parameters = {
    source:string;
    destination:string;
    mode:string;
}

export async function getRoute({ source, destination, mode }: route_parameters) {
    const res = 
    await client.get("/routes", {params: {origin: source,destination,mode,},});

    return res.data;
}


