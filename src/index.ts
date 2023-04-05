import cors from "cors";
import { CropType } from "./models/CropModel.js";
import express, { Request, Response } from "express";
import expressWs from "express-ws";
import { ICoordinateColor } from "./interfaces/ICoordinateColor.js";
import multer from "multer";
import fetch, { FormData } from "node-fetch";
import { SETTINGS } from "./settings.js";
import { storage } from "./multer/utils.js";
import { WebSocketSingleton } from "./services/WebSocketSingleton.js";
import { PixelService } from "./services/PixelService.js";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { ProgressType } from "./models/ProgressModel.js";
//https://www.typescriptlang.org/docs/handbook/esm-node.html

const NBR_PIXEL = 574;
const app = expressWs(express()).app;
const port = 8000;
const upload = multer({storage : storage});
app.use(cors());

app.get("/progress", async (req:Request, res:Response) => {
    let progressStr:string = await readFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", {encoding : "utf-8"});
    let progress:ProgressType = JSON.parse(progressStr);

    res.json({
        success : true,
        progress : {
            from : progress.from,
            to : progress.to,
            percentage : (progress.from / progress.to) * 100
        },
    })
});

app.get("/reset-locally", async (req:Request, res:Response) => {
    await copyFile(SETTINGS.ROOT_PROJECT + "/files/pixelated.png", SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspectivel.png");
    await writeFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", "");
    await writeFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", JSON.stringify({from : 0, to : NBR_PIXEL}));
    res.json({msg : "success"});
});

app.get("/hi", async (req:Request, res:Response) => {
    res.json({message : "hi"});
})

app.post("/store/image", upload.single("photo"), async (req:Request, res:Response) => {
    let progressStr:string = await readFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", {encoding : "utf-8"});
    let progress:ProgressType = JSON.parse(progressStr);

    if(progress.from >= progress.to){
        res.json({
            success : true,
            msg : "completed"  
        });
        return;
    }

    let filename = req.file?.filename;
    let crop:CropType = JSON.parse(req.body.crop);
    let name:string = req.body.name;
    
    if(crop.unit == "px"){
        res.status(400);
        res.json({
            success : false,
            msg : "wrong unit"  
        });
        return;
    }

    if(!filename){
        res.status(400);
        res.json({
            success : false,
            msg : "filename undefined"  
        });
        return;
    }
    let success = true;
    try{
        let coordinateColor:ICoordinateColor = await PixelService.getNextColorAndCoordinate();

        //si aucun nom spécifié pas besoin de l'ajouter dans la DB
        if(name != ""){
            let formData = new FormData();
            formData.append("coordinateName", JSON.stringify({
                    coordinate : {
                        x : coordinateColor.coordinate.x,
                        y : coordinateColor.coordinate.y,
                    },
                    name : name,
                }));
            formData.append("authorization", JSON.stringify(SETTINGS.KEY));
            let res = await fetch("http://palabre.be/pixel-perspective/coordinate/store.php", {
                method : "POST",
                headers : {
                    "Authorization" : SETTINGS.KEY,
                },
                body : formData});
            let json:any = await res.json();
            
            if(json.success == false){            
                throw new Error();
            }
        }


        await writeFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", JSON.stringify(coordinateColor.coordinate));
        await PixelService.CropResizeAddColor(filename, crop, coordinateColor.color);
        await PixelService.setImgOnMosaique(filename, coordinateColor.coordinate.x, coordinateColor.coordinate.y);
        progress.from++;
        await writeFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", JSON.stringify(progress));
        await PixelService.SetUpdateJson(filename, {
            x : coordinateColor.coordinate.x,
            y : coordinateColor.coordinate.y,
        });

    }catch(e){
        success = false;
    }

    try{



        let resImage = await fetch("http://localhost:8000/images/pixelPerspective.png");
        let blobImg = await resImage.blob();
        let formDataImg = new FormData();
        formDataImg.append("pixel_perspective", blobImg, "pixelperspective.png");
        formDataImg.append("authorization", JSON.stringify(SETTINGS.KEY));
        formDataImg.append("progress", JSON.stringify(progress));
        await fetch("http://palabre.be/pixel-perspective/photo/store.php", {
            method : "POST",
                headers : {
                    "Authorization" : SETTINGS.KEY,
                },
                body : formDataImg
            });
    }catch(e){
        console.log("err in catch send image")
    }

    res.json({success: success});
});


app.get("/", async (req:Request, res:Response) => {
    res.send("ok");
})


app.ws("/echo", (ws, res) => {
    ws.on("message", async (message) => {
        if(WebSocketSingleton.getInstance().shouldUpdate){
            console.log("need update");
            WebSocketSingleton.getInstance().shouldUpdate = false;
            ws.send(await readFile(SETTINGS.ROOT_PROJECT + "/files/update.json", {encoding : "utf-8"}));
        }
    });

    ws.on("open", () => {
        console.log("connected");   
    })

    ws.on("close", () => {
        console.log("disconnected");
    });
});


// app.use(express.static(__dirname + "/../public"));
app.use(express.static(SETTINGS.ROOT_PROJECT + "/public/"));
// app.use(express.static("./../public/"));

app.listen(port, () => {
    console.log("listening to port " + port.toString());
})

