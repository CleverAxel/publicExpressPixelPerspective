import * as url from 'url';
export const SETTINGS = {
    URL: "http://localhost:8000/",
    ROOT_PROJECT: url.fileURLToPath(new URL('.', import.meta.url)) + "/../",
    SIZE_IMG_WANTED: 72,
    KEY: "",
};
