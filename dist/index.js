var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import multer from "multer";
import fetch, { FormData } from "node-fetch";
import { SETTINGS } from "./settings.js";
import { storage } from "./multer/utils.js";
import { WebSocketSingleton } from "./services/WebSocketSingleton.js";
import { PixelService } from "./services/PixelService.js";
import { copyFile, readFile, writeFile } from "node:fs/promises";
const NBR_PIXEL = 574;
const app = expressWs(express()).app;
const port = 8000;
const upload = multer({ storage: storage });
app.use(cors());
app.get("/progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let progressStr = yield readFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", { encoding: "utf-8" });
    let progress = JSON.parse(progressStr);
    res.json({
        success: true,
        progress: {
            from: progress.from,
            to: progress.to,
            percentage: (progress.from / progress.to) * 100
        },
    });
}));
app.get("/reset-locally", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield copyFile(SETTINGS.ROOT_PROJECT + "/files/pixelated.png", SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspectivel.png");
    yield writeFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", "");
    yield writeFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", JSON.stringify({ from: 0, to: NBR_PIXEL }));
    res.json({ msg: "success" });
}));
app.get("/hi", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: "hi" });
}));
app.post("/store/image", upload.single("photo"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let progressStr = yield readFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", { encoding: "utf-8" });
    let progress = JSON.parse(progressStr);
    if (progress.from >= progress.to) {
        res.json({
            success: true,
            msg: "completed"
        });
        return;
    }
    let filename = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
    let crop = JSON.parse(req.body.crop);
    let name = req.body.name;
    if (crop.unit == "px") {
        res.status(400);
        res.json({
            success: false,
            msg: "wrong unit"
        });
        return;
    }
    if (!filename) {
        res.status(400);
        res.json({
            success: false,
            msg: "filename undefined"
        });
        return;
    }
    let success = true;
    try {
        let coordinateColor = yield PixelService.getNextColorAndCoordinate();
        if (name != "") {
            let formData = new FormData();
            formData.append("coordinateName", JSON.stringify({
                coordinate: {
                    x: coordinateColor.coordinate.x,
                    y: coordinateColor.coordinate.y,
                },
                name: name,
            }));
            formData.append("authorization", JSON.stringify(SETTINGS.KEY));
            let res = yield fetch("http://palabre.be/pixel-perspective/coordinate/store.php", {
                method: "POST",
                headers: {
                    "Authorization": SETTINGS.KEY,
                },
                body: formData
            });
            let json = yield res.json();
            if (json.success == false) {
                throw new Error();
            }
        }
        yield writeFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", JSON.stringify(coordinateColor.coordinate));
        yield PixelService.CropResizeAddColor(filename, crop, coordinateColor.color);
        yield PixelService.setImgOnMosaique(filename, coordinateColor.coordinate.x, coordinateColor.coordinate.y);
        progress.from++;
        yield writeFile(SETTINGS.ROOT_PROJECT + "/files/progress.json", JSON.stringify(progress));
        yield PixelService.SetUpdateJson(filename, {
            x: coordinateColor.coordinate.x,
            y: coordinateColor.coordinate.y,
        });
    }
    catch (e) {
        success = false;
    }
    try {
        let resImage = yield fetch("http://localhost:8000/images/pixelPerspective.png");
        let blobImg = yield resImage.blob();
        let formDataImg = new FormData();
        formDataImg.append("pixel_perspective", blobImg, "pixelperspective.png");
        formDataImg.append("authorization", JSON.stringify(SETTINGS.KEY));
        formDataImg.append("progress", JSON.stringify(progress));
        yield fetch("http://palabre.be/pixel-perspective/photo/store.php", {
            method: "POST",
            headers: {
                "Authorization": SETTINGS.KEY,
            },
            body: formDataImg
        });
    }
    catch (e) {
        console.log("err in catch send image");
    }
    res.json({ success: success });
}));
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("ok");
}));
app.ws("/echo", (ws, res) => {
    ws.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        if (WebSocketSingleton.getInstance().shouldUpdate) {
            console.log("need update");
            WebSocketSingleton.getInstance().shouldUpdate = false;
            ws.send(yield readFile(SETTINGS.ROOT_PROJECT + "/files/update.json", { encoding: "utf-8" }));
        }
    }));
    ws.on("open", () => {
        console.log("connected");
    });
    ws.on("close", () => {
        console.log("disconnected");
    });
});
app.use(express.static(SETTINGS.ROOT_PROJECT + "/public/"));
app.listen(port, () => {
    console.log("listening to port " + port.toString());
});
