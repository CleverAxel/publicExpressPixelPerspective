import Jimp from "jimp";
import { readFile, writeFile } from "node:fs/promises";
import { ICoordinateColor } from "../interfaces/ICoordinateColor.js";
import { RGBA } from "../jimp/interface.js";
import rgb2hex from 'rgb2hex';
import { CoordinateType } from "../models/CoordinateModel.js";
import { CropType } from "../models/CropModel.js";
import { SETTINGS } from "../settings.js";
import { ColorActionName } from "../jimp/enum.js";
import { ICoordinate } from "../interfaces/ICoordinate.js";
import { WebSocketSingleton } from "./WebSocketSingleton.js";

export class PixelService{

    public static setImgOnMosaique(filename:string, x:number, y:number){
        return new Promise<void>((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png")
            .then(async (image) => {
                image.composite(await this.getImg(filename), x, y)
                .write(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png");
                resolve();
            })
        });
    }

    public static async SetUpdateJson(filename:string, coordinate:ICoordinate){
        let update = {
            update : {
                photo : SETTINGS.URL + "images/" + filename,
                coordinate : coordinate,
            }
        }
        await writeFile(SETTINGS.ROOT_PROJECT + "/files/update.json", JSON.stringify(update));
        WebSocketSingleton.getInstance().shouldUpdate = true;
    }

    private static getImg(filename:string){
        return new Promise<Jimp>((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/" + filename)
            .then((image) => {
                resolve(image);
            });
        })
    }

    public static getNextColorAndCoordinate(){
        return new Promise<ICoordinateColor>(async (resolve, reject) => {
            let data = await readFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", { encoding: 'utf8' });
            let coordinate:CoordinateType = data == "" ? {x : 0, y : 0} : JSON.parse(data);
            
            //je le fais avancer d'une case si les coordonnées ont été init par currentCoord.json
            if(coordinate.x != 0 && coordinate.y != 0){
                coordinate.x += SETTINGS.SIZE_IMG_WANTED;
            }


            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/pixelPerspective.png")
            .then(async (image) => {
                let width = image.getWidth();
                let height = image.getHeight();

                let isNewColorFound = false;
                let color!: RGBA;

                let firstY = true;
                let firstX = true;
                let y = 0;
                let x = 0;
                for(y = coordinate.y; y < height; y += SETTINGS.SIZE_IMG_WANTED){
                    //si on est sur la même ligne Y alors continue sur X récup depuis currentCoord.json 
                    //sinon si on a changé de ligne alors remet X à 0
                    for(x = y == coordinate.y ? coordinate.x : 0; x < width; x += SETTINGS.SIZE_IMG_WANTED){
                        color = Jimp.intToRGBA(image.getPixelColor(x, y));
                        
                        if(color.r != 255 && color.g != 255 && color.b != 255){
                            isNewColorFound = true;
                            break;
                        }
                        
                    }
                    if(isNewColorFound) break;
                }
                coordinate.x = x;
                coordinate.y = y;
                // await writeFile(SETTINGS.ROOT_PROJECT + "/files/currentCoord.json", JSON.stringify(coordinate));
                
                resolve({
                    coordinate : {
                        x : x,
                        y : y,
                    },
                    color : rgb2hex(`rgb(${color.r},${color.g},${color.b})`).hex
                })
            });
        })        
    }

    public static CropResizeAddColor (filename:string, cropWanted:CropType, color:string) {
        return new Promise<string>((resolve, reject) => {
            Jimp.read(SETTINGS.ROOT_PROJECT + "/public/images/" + filename)
            .then((image) => {
                let width = image.getWidth();
                let height = image.getHeight();
        
                let positionCrop = {
                    x : Math.floor((width / 100) * cropWanted.x),
                    y : Math.floor((height / 100) * cropWanted.y),
                };
                let sizeCrop = {
                    w : Math.floor((width / 100) * cropWanted.width),
                    h : Math.floor((height / 100) * cropWanted.height),
                }
        
                image.crop(positionCrop.x, positionCrop.y, sizeCrop.w, sizeCrop.h)
                .resize(SETTINGS.SIZE_IMG_WANTED, SETTINGS.SIZE_IMG_WANTED)
                .color([
                    {apply : ColorActionName.MIX, params : [color, 50]}
                ])
                .write(SETTINGS.ROOT_PROJECT + "/public/images/" + filename);

                resolve(filename);
            });
        });
    }
}