var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Jimp from "jimp";
import { readFile, writeFile } from "node:fs/promises";
import rgb2hex from 'rgb2hex';
import { SETTINGS } from "../settings.js";
import { ColorActionName } from "../jimp/enum.js";
import { WebSocketSingleton } from "./WebSocketSingleton.js";
export class PixelService {
    static setImgOnMosaique(filename, x, y) {
        return new Promise((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png")
                .then((image) => __awaiter(this, void 0, void 0, function* () {
                image.composite(yield this.getImg(filename), x, y)
                    .write(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png");
                resolve();
            }));
        });
    }
    static SetUpdateJson(filename, coordinate) {
        return __awaiter(this, void 0, void 0, function* () {
            let update = {
                update: {
                    photo: SETTINGS.URL + "images/" + filename,
                    coordinate: coordinate,
                }
            };
            yield writeFile(SETTINGS.ROOT_PROJECT + "/files/update.json", JSON.stringify(update));
            WebSocketSingleton.getInstance().shouldUpdate = true;
        });
    }
    static getImg(filename) {
        return new Promise((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/" + filename)
                .then((image) => {
                resolve(image);
            });
        });
    }
    static getNextColorAndCoordinate() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let data = yield readFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", { encoding: 'utf8' });
            let coordinate = data == "" ? { x: 0, y: 0 } : JSON.parse(data);
            if (coordinate.x != 0 && coordinate.y != 0) {
                coordinate.x += SETTINGS.SIZE_IMG_WANTED;
            }
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png")
                .then((image) => __awaiter(this, void 0, void 0, function* () {
                let width = image.getWidth();
                let height = image.getHeight();
                let isNewColorFound = false;
                let color;
                let firstY = true;
                let firstX = true;
                let y = 0;
                let x = 0;
                for (y = coordinate.y; y < height; y += SETTINGS.SIZE_IMG_WANTED) {
                    for (x = y == coordinate.y ? coordinate.x : 0; x < width; x += SETTINGS.SIZE_IMG_WANTED) {
                        color = Jimp.intToRGBA(image.getPixelColor(x, y));
                        if (color.r != 255 && color.g != 255 && color.b != 255) {
                            isNewColorFound = true;
                            break;
                        }
                    }
                    if (isNewColorFound)
                        break;
                }
                coordinate.x = x;
                coordinate.y = y;
                resolve({
                    coordinate: {
                        x: x,
                        y: y,
                    },
                    color: rgb2hex(`rgb(${color.r},${color.g},${color.b})`).hex
                });
            }));
        }));
    }
    static CropResizeAddColor(filename, cropWanted, color) {
        return new Promise((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/" + filename)
                .then((image) => {
                let width = image.getWidth();
                let height = image.getHeight();
                let positionCrop = {
                    x: Math.floor((width / 100) * cropWanted.x),
                    y: Math.floor((height / 100) * cropWanted.y),
                };
                let sizeCrop = {
                    w: Math.floor((width / 100) * cropWanted.width),
                    h: Math.floor((height / 100) * cropWanted.height),
                };
                image.crop(positionCrop.x, positionCrop.y, sizeCrop.w, sizeCrop.h)
                    .resize(SETTINGS.SIZE_IMG_WANTED, SETTINGS.SIZE_IMG_WANTED)
                    .color([
                    { apply: ColorActionName.MIX, params: [color, 50] }
                ])
                    .write(SETTINGS.ROOT_PROJECT + "/public/images/" + filename);
                resolve(filename);
            });
        });
    }
}
