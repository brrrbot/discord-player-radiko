"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadikoExtractor = exports.device = exports.format = void 0;
const discord_player_1 = require("discord-player");
const node_child_process_1 = require("node:child_process");
const yt_dlp_wrap_1 = __importDefault(require("yt-dlp-wrap"));
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
        this.protocols = ["radiko"];
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
        const isRadikoUrl = /radiko\.jp/.test(query);
        if (isRadikoUrl)
            return true;
        // Technically we do not need this
        if (type === this.identifier || type === `ext:${this.identifier}`) {
            return true;
        }
        if (type === discord_player_1.QueryType.AUTO)
            return false; // Technically we do not need this too
        return false;
    }
    // This method is called when discord-player wants a search result
    async handle(query, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const isRadikoUrl = /radiko\.jp/.test(query);
        try {
            if (isRadikoUrl) {
                const args = this.buildArgs(query, "info");
                const result = await this.ytdlp.execPromise(args);
                const firstJson = result.split("\n")[0];
                const data = JSON.parse(firstJson);
                const track = new discord_player_1.Track(this.context.player, {
                    source: this.identifier,
                    title: (_a = data.title) !== null && _a !== void 0 ? _a : "Unknown Stream",
                    url: query,
                    author: (_b = data.uploader) !== null && _b !== void 0 ? _b : "Radiko",
                    duration: data.is_live ? 0 : ((_c = data.duration) !== null && _c !== void 0 ? _c : 0).toString(),
                    live: (_d = data.is_live) !== null && _d !== void 0 ? _d : true,
                    thumbnail: (_e = data.thumbnail) !== null && _e !== void 0 ? _e : null,
                    requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                    description: (_f = data.description) !== null && _f !== void 0 ? _f : "",
                });
                return {
                    playlist: null,
                    tracks: [track],
                };
            }
            else {
                const url = `https://radiko.jp/#!/search/live?key=${query}&filter=past`;
                const args = this.buildArgs(url, "info");
                const result = await this.ytdlp.execPromise(args);
                const resultJson = JSON.parse(result.split("\n")[0]);
                const data = resultJson.entries[0];
                const track = new discord_player_1.Track(this.context.player, {
                    source: this.identifier,
                    title: (_g = data.title) !== null && _g !== void 0 ? _g : "Unknown Stream",
                    url: data.original_url,
                    author: (_h = data.uploader) !== null && _h !== void 0 ? _h : "Radiko",
                    duration: data.is_live ? 0 : ((_j = data.duration) !== null && _j !== void 0 ? _j : 0).toString(),
                    live: (_k = data.is_live) !== null && _k !== void 0 ? _k : true,
                    thumbnail: (_l = data.thumbnail) !== null && _l !== void 0 ? _l : null,
                    requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                    description: (_m = data.description) !== null && _m !== void 0 ? _m : "",
                });
                return {
                    playlist: null,
                    tracks: [track],
                };
            }
        }
        catch (error) {
            console.error("Error retrieving data from Radiko: ", error);
            return {
                playlist: null,
                tracks: [],
            };
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
