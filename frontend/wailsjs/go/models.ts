export namespace engine {
	
	export class ProbeResult {
	    url: string;
	    fileName: string;
	    contentType: string;
	    totalSize: number;
	    acceptRanges: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ProbeResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.fileName = source["fileName"];
	        this.contentType = source["contentType"];
	        this.totalSize = source["totalSize"];
	        this.acceptRanges = source["acceptRanges"];
	    }
	}

}

export namespace models {
	
	export class Category {
	    id: string;
	    name: string;
	    extensions: string[];
	    defaultPath: string;
	    icon: string;
	
	    static createFrom(source: any = {}) {
	        return new Category(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.extensions = source["extensions"];
	        this.defaultPath = source["defaultPath"];
	        this.icon = source["icon"];
	    }
	}
	export class ChunkState {
	    id: number;
	    startByte: number;
	    currentPos: number;
	    endByte: number;
	    active: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ChunkState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.startByte = source["startByte"];
	        this.currentPos = source["currentPos"];
	        this.endByte = source["endByte"];
	        this.active = source["active"];
	    }
	}
	export class DownloadItem {
	    id: string;
	    url: string;
	    fileName: string;
	    savePath: string;
	    categoryId: string;
	    queueId: string;
	    totalSize: number;
	    downloaded: number;
	    speedBps: number;
	    acceptRanges: boolean;
	    status: string;
	    maxConns: number;
	    chunks: ChunkState[];
	    headers?: Record<string, string>;
	    errorMessage?: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    completedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new DownloadItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.fileName = source["fileName"];
	        this.savePath = source["savePath"];
	        this.categoryId = source["categoryId"];
	        this.queueId = source["queueId"];
	        this.totalSize = source["totalSize"];
	        this.downloaded = source["downloaded"];
	        this.speedBps = source["speedBps"];
	        this.acceptRanges = source["acceptRanges"];
	        this.status = source["status"];
	        this.maxConns = source["maxConns"];
	        this.chunks = this.convertValues(source["chunks"], ChunkState);
	        this.headers = source["headers"];
	        this.errorMessage = source["errorMessage"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.completedAt = this.convertValues(source["completedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace storage {
	
	export class AppSettings {
	    defaultDownloadDir: string;
	    defaultMaxConns: number;
	    speedLimitBps: number;
	    maxConcurrentTasks: number;
	    shutdownWhenDone: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.defaultDownloadDir = source["defaultDownloadDir"];
	        this.defaultMaxConns = source["defaultMaxConns"];
	        this.speedLimitBps = source["speedLimitBps"];
	        this.maxConcurrentTasks = source["maxConcurrentTasks"];
	        this.shutdownWhenDone = source["shutdownWhenDone"];
	    }
	}

}

