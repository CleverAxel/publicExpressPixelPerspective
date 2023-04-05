var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import chokidar from "chokidar";
export class WebSocketSingleton {
    constructor() { }
    static getInstance() {
        if (this.UpdateMosaique == null) {
            this.UpdateMosaique = new UpdateMosaique();
        }
        return this.UpdateMosaique;
    }
}
WebSocketSingleton.UpdateMosaique = null;
class UpdateMosaique {
    constructor() {
        this.shouldUpdate = false;
    }
}
class FileWatcher {
    constructor() {
        this.watcher = null;
    }
    watchFile(path, trigger) {
        if (this.watcher == null) {
            this.watcher = chokidar.watch(path);
            this.watcher.on("change", () => {
                trigger();
            });
        }
    }
    endWatchFile() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.watcher) === null || _a === void 0 ? void 0 : _a.close());
        });
    }
}
