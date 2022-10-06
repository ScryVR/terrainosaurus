import { IVertex } from "./interfaces";

type andy = any

type DataType = { vertices: IVertex[], action: string}

self.addEventListener("message", ({ data }: { data: DataType }) => {
    if (data.action === "caveMeBro") {
        console.log("Starting cave worker");
        postMessage({
            message: "bla from cave worker"
        });
    }
})
