import multer from "multer";
import { SETTINGS } from "../settings.js";

export const storage = multer.diskStorage({
   destination : (req, file, cb) => {
    cb(null, SETTINGS.ROOT_PROJECT + "/public/images");
   },

   filename(req, file, cb) {
    const uniqueSuffix = Date.now().toString();
    cb(null, uniqueSuffix + "." + file.originalname.split(".").reverse()[0])
   },
})