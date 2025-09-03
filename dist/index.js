"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadikoExtractor = exports.device = exports.format = void 0;
const discord_player_1 = require("discord-player");
const yt_dlp_wrap_1 = __importDefault(require("yt-dlp-wrap"));
const node_child_process_1 = require("node:child_process");
var format;
(function (format) {
    /** Best audio option available */
    format["BESTAUDIO"] = "bestaudio";
    /** AAC in MP4 container, most commonly used */
    format["M4A"] = ".m4a";
    /** Lightweight and efficient format */
    format["WEBM"] = ".webm";
    /** Not native format, but can be re-encoded by yt-dlp */
    format["MP3"] = ".mp3";
    /** HLS playlists */
    format["M3U8"] = ".m3u8";
    /** Segments (for radio/TV-like streams, very common for Radiko) */
    format["TS"] = ".ts";
    /** MPEG-DASH manifest with seperate audio/video tracks */
    format["DASH"] = ".dash";
})(format || (exports.format = format = {}));
var device;
(function (device) {
    /** Website with every stream provider */
    device["PC_HTML5"] = "pc_html5";
    /** Old mobile app */
    device["aSmartPhone5"] = "aSmartPhone5";
    /** Old mobile app */
    device["aSmartPhone6"] = "aSmartPhone6";
    /** Old mobile app */
    device["aSmartPhone6a"] = "aSmartPhone6a";
    /** Old mobile app */
    device["aSmartPhone7"] = "aSmartPhone7";
    /** Old mobile app */
    device["aSmartPhone7a"] = "aSmartPhone7a";
    /** Old website */
    device["PC_1"] = "pc_1";
    /** Current mobile site */
    device["MobileWebTrial"] = "MobileWebTrial";
    /** Current mobile app */
    device["aSmartPhone8"] = "aSmartPhone8";
    /** Embedded players on stations' websites */
    device["EXTERNAL"] = "xExternalWebStations";
})(device || (exports.device = device = {}));
class RadikoExtractor extends discord_player_1.BaseExtractor {
    // Constructor for config options
    constructor(context, options) {
        var _a;
        super(context, options);
        /** Precomputed args shared by handle() & stream() */
        // private baseArgs: string[] = [];
        /** Reference to live streams to destroy on deactivate() */
        this.activeStream = new Set();
        this.createBridgeQuery = (track) => `${track.title} by ${track.author} official audio`;
        this.ytdlp = new yt_dlp_wrap_1.default((_a = this.options) === null || _a === void 0 ? void 0 : _a.ytdlpPath);
    }
    buildArgs(url, mode = "info") {
        var _a, _b, _c, _d, _e;
        const args = [url];
        if (mode === "info") {
            args.push(url, "-J", "-N", "30", "--embed-metadata", "--embed-thumbnail", "-o", "%(title)s %(timestamp+32400>%Y-%m-%d_%H%M)s [%(id)s].%(ext)s");
        }
        if (mode === "stream") {
            args.push("-f", (_a = this.options.format) !== null && _a !== void 0 ? _a : format.BESTAUDIO);
            args.push("-o", "-");
        }
        // Add user options if provided
        if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.device)
            args.push("--extractor-args", `rajiko:device=${this.options.device}`);
        if ((_c = this.options) === null || _c === void 0 ? void 0 : _c.key_station_only)
            args.push("--extractor-args", "rajiko:key_station_only");
        if ((_d = this.options) === null || _d === void 0 ? void 0 : _d.no_as_live_chunks)
            args.push("--extractor-args", "rajiko:no_as_live_chunks");
        if ((_e = this.options) === null || _e === void 0 ? void 0 : _e.no_stream_blacklist)
            args.push("--extractor-args", "rajiko:no_stream_blacklist");
        return args;
    }
    buildTracksFromYtDlp(json, requestedBy) {
        var _a;
        const entries = (_a = json.entries) !== null && _a !== void 0 ? _a : [json];
        return entries.map((item) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return new discord_player_1.Track(this.context.player, {
                title: (_a = item.title) !== null && _a !== void 0 ? _a : "Unknown Title",
                url: (_c = (_b = item.url) !== null && _b !== void 0 ? _b : item.webpage_url) !== null && _c !== void 0 ? _c : "",
                author: (_d = item.uploader) !== null && _d !== void 0 ? _d : "Radiko",
                duration: item.is_live ? "Currently Live" : ((_e = item.duration) !== null && _e !== void 0 ? _e : 0).toString(),
                thumbnail: (_f = item.thumbnail) !== null && _f !== void 0 ? _f : null,
                requestedBy: typeof requestedBy === "string" ? null : requestedBy,
                description: (_g = item.description) !== null && _g !== void 0 ? _g : "",
                engine: this.identifier,
            });
        });
    }
    // This method is called when extractor is loaded into discord-player's registry
    async activate() {
        var _a;
        try {
            const ytdlpBinary = this.options.usePip ? "yt-dlp" : ((_a = this.options.ytdlpPath) !== null && _a !== void 0 ? _a : "yt-dlp");
            this.ytdlp = new yt_dlp_wrap_1.default(ytdlpBinary);
            (0, node_child_process_1.execSync)(`${ytdlpBinary} --version`, { stdio: "ignore" });
            try {
                const output = (0, node_child_process_1.execSync)("pip show yt-dlp-rajiko").toString().trim();
                if (output) {
                    console.log("yt-dlp-rajiko is installed");
                }
                else {
                    console.warn("yt-dlp-rajiko is not installed");
                }
            }
            catch {
                console.warn("yt-dlp-rajiko does not appear to be installed. Some Radiko streams may fail.");
            }
            console.log(`Using yt-dlp binary: ${ytdlpBinary}`);
        }
        catch (err) {
            console.error("yt-dlp is not installed or not found in PATH. Please install it.");
            throw err;
        }
        // Register protocols
        this.protocols = ["radikoSearchByKeyWords", "radikoSearchByPerson", "radikoSearchByUrl"];
    }
    // This method is called when extractor is remove from discord-player's registry
    async deactivate() {
        this.protocols = [];
        for (const s of this.activeStream) {
            try {
                s.destroy();
            }
            catch { }
        }
        this.activeStream.clear();
    }
    // This method is called when discord-player wants metadata, return false to direct to another extractor
    async validate(query, type) {
        if (type && type !== discord_player_1.QueryType.AUTO)
            return false;
        return /radiko\.jp/.test(query);
    }
    // This method is called when discord-player wants a search result
    async handle(query, context) {
        if (!context.protocol)
            context.protocol = "radikoSearchByKeyWords";
        try {
            switch (context.protocol) {
                case "radikoSearchByKeyWords": {
                    const today = new Date();
                    const pastDate = new Date(today);
                    pastDate.setDate(today.getDate() - 30);
                    const start_day = pastDate.toISOString().slice(0, 10);
                    const url = `https://radiko.jp/#!/search/live?key=${encodeURIComponent(query)}&start_day=${start_day}`;
                    const args = this.buildArgs(url, "info");
                    const result = await this.ytdlp.execPromise(args);
                    const playlistJsonLine = result
                        .split("\n")
                        .find(line => line.includes('"_type": "playlist"'));
                    if (!playlistJsonLine)
                        return { playlist: null, tracks: [] };
                    const data = JSON.parse(playlistJsonLine);
                    const tracks = this.buildTracksFromYtDlp(data, context.requestedBy);
                    return { playlist: null, tracks };
                }
                case "radikoSearchSakuna": {
                    const today = new Date();
                    const pastDate = new Date(today);
                    pastDate.setDate(today.getDate() - 30);
                    const start_day = pastDate.toISOString().slice(0, 10);
                    const url = `https://radiko.jp/#!/search/live?key=結城さくな&start_day=${start_day}&area_id=JP13`;
                    const args = this.buildArgs(url, "info");
                    const result = await this.ytdlp.execPromise(args);
                    const playlistJsonLine = result
                        .split("\n")
                        .find(line => line.includes('"_type": "playlist"'));
                    if (!playlistJsonLine)
                        return { playlist: null, tracks: [] };
                    const data = JSON.parse(playlistJsonLine);
                    const tracks = this.buildTracksFromYtDlp(data, context.requestedBy);
                    return { playlist: null, tracks };
                }
                case "radikoSearchByUrl": {
                    const args = this.buildArgs(query, "info");
                    const result = await this.ytdlp.execPromise(args);
                    const firstJson = result.split("\n")[0];
                    const data = JSON.parse(firstJson);
                    const tracks = this.buildTracksFromYtDlp(data, context.requestedBy);
                    return { playlist: null, tracks };
                }
                default: return { playlist: null, tracks: [] };
            }
        }
        catch (error) {
            console.error("Error retrieving data from Radiko: ", error);
            return { playlist: null, tracks: [] };
        }
    }
    // This method is called when discord-player wants to stream a track
    async stream(track) {
        const args = this.buildArgs(track.url, "stream");
        const stream = this.ytdlp.execStream(args);
        this.activeStream.add(stream);
        stream.on("close", () => this.activeStream.delete(stream));
        return {
            stream,
            $fmt: "arbitrary",
        };
    }
    // This method is called to get tracks for autoplay mode
    async getRelatedTracks(track, history) {
        // Return null for now as Radiko doesnt expose "related" tracks
        return { playlist: null, tracks: [] };
    }
}
exports.RadikoExtractor = RadikoExtractor;
RadikoExtractor.identifier = "radiko";
