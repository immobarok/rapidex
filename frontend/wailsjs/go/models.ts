export namespace engine {
	
	export class AddDownloadOptions {
	    url: string;
	    fileName: string;
	    savePath: string;
	    categoryId: string;
	    queueId: string;
	    description: string;
	    referer: string;
	    maxConns: number;
	    startNow: boolean;
	    headers: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new AddDownloadOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.fileName = source["fileName"];
	        this.savePath = source["savePath"];
	        this.categoryId = source["categoryId"];
	        this.queueId = source["queueId"];
	        this.description = source["description"];
	        this.referer = source["referer"];
	        this.maxConns = source["maxConns"];
	        this.startNow = source["startNow"];
	        this.headers = source["headers"];
	    }
	}
	export class BatchOptions {
	    pattern: string;
	    from: number;
	    to: number;
	    wildcardLen: number;
	    savePath: string;
	    categoryId: string;
	    queueId: string;
	    startNow: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BatchOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pattern = source["pattern"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.wildcardLen = source["wildcardLen"];
	        this.savePath = source["savePath"];
	        this.categoryId = source["categoryId"];
	        this.queueId = source["queueId"];
	        this.startNow = source["startNow"];
	    }
	}
	export class ProbeResult {
	    url: string;
	    fileName: string;
	    contentType: string;
	    totalSize: number;
	    acceptRanges: boolean;
	    isWebPage: boolean;
	
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
	        this.isWebPage = source["isWebPage"];
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
	    retries: number;
	    info: string;
	
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
	        this.retries = source["retries"];
	        this.info = source["info"];
	    }
	}
	export class DownloadItem {
	    id: string;
	    url: string;
	    originalUrl: string;
	    fileName: string;
	    savePath: string;
	    categoryId: string;
	    queueId: string;
	    queuePosition: number;
	    description: string;
	    referer: string;
	    totalSize: number;
	    downloaded: number;
	    speedBps: number;
	    speedLimitBps: number;
	    acceptRanges: boolean;
	    status: string;
	    maxConns: number;
	    chunks: ChunkState[];
	    headers?: Record<string, string>;
	    errorMessage?: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    lastTryAt?: any;
	    // Go type: time
	    completedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new DownloadItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.originalUrl = source["originalUrl"];
	        this.fileName = source["fileName"];
	        this.savePath = source["savePath"];
	        this.categoryId = source["categoryId"];
	        this.queueId = source["queueId"];
	        this.queuePosition = source["queuePosition"];
	        this.description = source["description"];
	        this.referer = source["referer"];
	        this.totalSize = source["totalSize"];
	        this.downloaded = source["downloaded"];
	        this.speedBps = source["speedBps"];
	        this.speedLimitBps = source["speedLimitBps"];
	        this.acceptRanges = source["acceptRanges"];
	        this.status = source["status"];
	        this.maxConns = source["maxConns"];
	        this.chunks = this.convertValues(source["chunks"], ChunkState);
	        this.headers = source["headers"];
	        this.errorMessage = source["errorMessage"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.lastTryAt = this.convertValues(source["lastTryAt"], null);
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
	export class QueueSchedule {
	    startEnabled: boolean;
	    startTime: string;
	    stopEnabled: boolean;
	    stopTime: string;
	    days: number[];
	
	    static createFrom(source: any = {}) {
	        return new QueueSchedule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startEnabled = source["startEnabled"];
	        this.startTime = source["startTime"];
	        this.stopEnabled = source["stopEnabled"];
	        this.stopTime = source["stopTime"];
	        this.days = source["days"];
	    }
	}
	export class QueueConfig {
	    id: string;
	    name: string;
	    maxConcurrent: number;
	    afterDone: string;
	    schedule: QueueSchedule;
	    running: boolean;
	    builtin: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueueConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.maxConcurrent = source["maxConcurrent"];
	        this.afterDone = source["afterDone"];
	        this.schedule = this.convertValues(source["schedule"], QueueSchedule);
	        this.running = source["running"];
	        this.builtin = source["builtin"];
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
	
	export class SiteLogin {
	    pattern: string;
	    username: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new SiteLogin(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pattern = source["pattern"];
	        this.username = source["username"];
	        this.password = source["password"];
	    }
	}
	export class ProxySettings {
	    mode: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new ProxySettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.url = source["url"];
	    }
	}
	export class AppSettings {
	    defaultDownloadDir: string;
	    categoryDirs: Record<string, string>;
	    defaultMaxConns: number;
	    speedLimitBps: number;
	    maxRetries: number;
	    retryDelaySec: number;
	    showFileInfoDialog: boolean;
	    showProgressDialog: boolean;
	    showCompleteDialog: boolean;
	    monitorClipboard: boolean;
	    browserIntegration: boolean;
	    duplicateAction: string;
	    proxy: ProxySettings;
	    siteLogins: SiteLogin[];
	    catchExtensions: string[];
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.defaultDownloadDir = source["defaultDownloadDir"];
	        this.categoryDirs = source["categoryDirs"];
	        this.defaultMaxConns = source["defaultMaxConns"];
	        this.speedLimitBps = source["speedLimitBps"];
	        this.maxRetries = source["maxRetries"];
	        this.retryDelaySec = source["retryDelaySec"];
	        this.showFileInfoDialog = source["showFileInfoDialog"];
	        this.showProgressDialog = source["showProgressDialog"];
	        this.showCompleteDialog = source["showCompleteDialog"];
	        this.monitorClipboard = source["monitorClipboard"];
	        this.browserIntegration = source["browserIntegration"];
	        this.duplicateAction = source["duplicateAction"];
	        this.proxy = this.convertValues(source["proxy"], ProxySettings);
	        this.siteLogins = this.convertValues(source["siteLogins"], SiteLogin);
	        this.catchExtensions = source["catchExtensions"];
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

