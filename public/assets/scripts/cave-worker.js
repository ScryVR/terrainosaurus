self.addEventListener("message", ({ data }) => {
    if (data.action === "caveMeBro") {
        console.log("Starting cave worker");
        postMessage({
            message: "bla from cave worker"
        });
    }
});
export {};
