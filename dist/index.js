"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadikoExtractor = void 0;
const discord_player_1 = require("discord-player");
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
})(format || (format = {}));
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
})(device || (device = {}));
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
    // This method is called when extractor is loaded into discord-player's registry
    async activate() {
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
        console.log(type);
        if (type && type !== discord_player_1.QueryType.AUTO)
            return false;
        //return /radiko\.jp/.test(query);
        return true;
    }
    // This method is called when discord-player wants a search result
    async handle(query, context) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const args = this.buildArgs(query, "info");
            const result = await this.ytdlp.execPromise(args);
            const firstJson = result.split("\n")[0];
            const data = JSON.parse(firstJson);
            console.log("Data: ", data);
            const track = new discord_player_1.Track(this.context.player, {
                title: (_a = data.title) !== null && _a !== void 0 ? _a : "Unknown Stream",
                url: query,
                author: (_b = data.uploader) !== null && _b !== void 0 ? _b : "Radiko",
                duration: data.is_live ? 0 : ((_c = data.duration) !== null && _c !== void 0 ? _c : 0).toString(),
                live: (_d = data.is_live) !== null && _d !== void 0 ? _d : true,
                thumbnail: (_e = data.thumbnail) !== null && _e !== void 0 ? _e : null,
                requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                description: (_f = data.description) !== null && _f !== void 0 ? _f : "",
                engine: this.identifier,
                metadata: {
                    raw: {
                        title: data.title,
                        url: data.url,
                        uploader: data.uploader,
                        duration: data.duration,
                        thumbnail: data.thumbnail,
                        is_live: data.is_live,
                    },
                },
            });
            return {
                playlist: null,
                tracks: [track],
            };
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
        console.log("args: ", args);
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
