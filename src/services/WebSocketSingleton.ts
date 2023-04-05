import chokidar from "chokidar";
// import * as ws from 'ws';

export class WebSocketSingleton{
    private static UpdateMosaique:UpdateMosaique | null = null;
    private constructor(){}

    public static getInstance(){
        if(this.UpdateMosaique == null){
            this.UpdateMosaique = new UpdateMosaique();
        }

        return this.UpdateMosaique;
    }
}

class UpdateMosaique{
    public shouldUpdate = false;
}

class FileWatcher{

    private watcher:chokidar.FSWatcher | null = null;

    constructor(){}

    public watchFile(path:string, trigger:() => void){
        if(this.watcher == null){
            this.watcher = chokidar.watch(path);
            this.watcher.on("change", () => {
                trigger();
            });
        }
    }

    public async endWatchFile(){
        await this.watcher?.close();
    }
}