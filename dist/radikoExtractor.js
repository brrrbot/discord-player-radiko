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
    format["BESTAUDIO"] = "bestaudio";
    format["M4A"] = ".m4a";
    format["WEBM"] = ".webm";
    format["TS"] = ".ts";
})(format || (exports.format = format = {}));
var device;
(function (device) {
    device["PC_HTML5"] = "pc_html5";
    device["aSmartPhone5"] = "aSmartPhone5";
    device["aSmartPhone6"] = "aSmartPhone6";
    device["aSmartPhone6a"] = "aSmartPhone6a";
    device["aSmartPhone7"] = "aSmartPhone7";
    device["aSmartPhone7a"] = "aSmartPhone7a";
    device["PC_1"] = "pc_1";
    device["MobileWebTrial"] = "MobileWebTrial";
    device["aSmartPhone8"] = "aSmartPhone8";
    device["EXTERNAL"] = "xExternalWebStations";
})(device || (exports.device = device = {}));
class RadikoExtractor extends discord_player_1.BaseExtractor {
    constructor() {
        super(...arguments);
        this.ytdlp = null;
        this.activeStream = null;
        this.createBridgeQuery = (track) => `${track.title} by ${track.author} official audio`;
    }
    buildArgs(url, mode) {
        var _a, _b, _c;
        const args = [url];
        if (mode === "info") {
            args.push("-J", "-N", "30", "--embed-metadata", "--embed-thumbnail", "-o", "%(title)s %(timestamp+32400>%Y-%m-%d_%H%M)s [%(id)s].%(ext)s");
        }
        if (mode === "stream") {
            args.push("-f", (_a = this.options.format) !== null && _a !== void 0 ? _a : format.BESTAUDIO);
            args.push("-o", "-");
        }
        if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.device)
            args.push("--extractor-args", `rajiko:device=${this.options.device}`);
        if ((_c = this.options) === null || _c === void 0 ? void 0 : _c.key_station_only)
            args.push("--extractor-args", "rajiko:key_station_only");
        return args;
    }
    async activate() {
        var _a, _b;
        try {
            const ytdlpBinary = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.usePip) ? "yt-dlp" : ((_b = this.options.ytdlpPath) !== null && _b !== void 0 ? _b : "yt-dlp");
            this.ytdlp = new yt_dlp_wrap_1.default(ytdlpBinary);
            this.protocols = ["radiko", "radiko_live"];
            try {
                const output = (0, node_child_process_1.execSync)("pip show yt-dlp-rajiko").toString().trim();
                if (!output)
                    console.warn("yt-dlp-rajiko is not installed");
            }
            catch {
                console.warn("yt-dlp-rajiko does not appear to be installed.");
            }
        }
        catch (error) {
            console.error("[RadikoExtractor] Error while registering RadikoExtractor: ", error);
            throw error;
        }
    }
    async deactivate() {
        var _a;
        this.protocols = [];
        if (this.activeStream) {
            for (const s of this.activeStream) {
                try {
                    s.destroy();
                }
                catch { }
                ;
            }
        }
        (_a = this.activeStream) === null || _a === void 0 ? void 0 : _a.clear();
    }
    async validate(query, type) {
        if (typeof query !== "string")
            return false;
        return /radiko\.jp/.test(query);
    }
    async handle(query, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        const isRadikoUrl = /radiko.jp\./.test(query);
        if (context.protocol === "radiko_live") {
            const url = `https://radiko.jp/#${query}`;
            const args = this.buildArgs(url, "info");
            const result = await ((_a = this.ytdlp) === null || _a === void 0 ? void 0 : _a.execPromise(args));
            if (!result)
                throw new Error("[RadikoExtractor] Failed to find Radiko stream.");
            const data = JSON.parse(result.split("\n")[0]);
            if (!data)
                throw new Error("[RadikoExtractor] Failed to get stream information.");
            const track = new discord_player_1.Track(this.context.player, {
                title: (_b = data.title) !== null && _b !== void 0 ? _b : "UNKNOWN TITLE",
                author: (_c = data.author) !== null && _c !== void 0 ? _c : "UNKNOWN AUTHOR",
                description: (_d = data.description) !== null && _d !== void 0 ? _d : "UNKNOWN DESCRIPTION",
                url: data.original_url,
                duration: "LIVE",
                live: data.is_live,
                thumbnail: (_e = data.thumbnail) !== null && _e !== void 0 ? _e : null,
                requestedBy: (_f = context.requestedBy) !== null && _f !== void 0 ? _f : null,
                source: "radiko",
            });
            return this.createResponse(null, [track]);
        }
        if (isRadikoUrl) {
            const args = this.buildArgs(query, "info");
            const result = await ((_g = this.ytdlp) === null || _g === void 0 ? void 0 : _g.execPromise(args));
            if (!result)
                throw new Error("[RadikoExtractor] Failed to find Radiko stream.");
            const data = JSON.parse(result.split("\n")[0]);
            if (!data)
                throw new Error("[RadikoExtractor] Failed to get stream information.");
            const track = new discord_player_1.Track(this.context.player, {
                title: (_h = data.title) !== null && _h !== void 0 ? _h : "UNKNOWN TITLE",
                author: (_j = data.author) !== null && _j !== void 0 ? _j : "UNKNOWN AUTHOR",
                description: (_k = data.description) !== null && _k !== void 0 ? _k : "UNKNOWN DESCRIPTION",
                url: query,
                duration: (_m = (((_l = data.duration) !== null && _l !== void 0 ? _l : 0) * 1000).toString()) !== null && _m !== void 0 ? _m : "UNKNOWN DURATION",
                live: data.is_live,
                thumbnail: (_o = data.thumbnail) !== null && _o !== void 0 ? _o : null,
                requestedBy: (_p = context.requestedBy) !== null && _p !== void 0 ? _p : null,
                source: "radiko",
            });
            return this.createResponse(null, [track]);
        }
        else {
            const url = `https://radiko.jp/#!/search/live?key=${query}&filter=past`;
            const args = this.buildArgs(url, "info");
            const result = await ((_q = this.ytdlp) === null || _q === void 0 ? void 0 : _q.execPromise(args));
            if (!result)
                throw new Error("[RadikoExtractor] Failed to find Radiko stream.");
            const data = JSON.parse(result.split("\n")[0]).entries[0];
            if (!data)
                throw new Error("[RadikoExtractor] Failed to get stream information.");
            const track = new discord_player_1.Track(this.context.player, {
                title: (_r = data.title) !== null && _r !== void 0 ? _r : "UNKNOWN TITLE",
                author: (_s = data.author) !== null && _s !== void 0 ? _s : "UNKNOWN AUTHOR",
                description: (_t = data.description) !== null && _t !== void 0 ? _t : "UNKNOWN DESCRIPTION",
                url: data.original_url,
                duration: (_v = (((_u = data.duration) !== null && _u !== void 0 ? _u : 0) * 1000).toString()) !== null && _v !== void 0 ? _v : "UNKNOWN DURATION",
                live: data.is_live,
                thumbnail: (_w = data.thumbnail) !== null && _w !== void 0 ? _w : null,
                requestedBy: (_x = context.requestedBy) !== null && _x !== void 0 ? _x : null,
                source: "radiko",
            });
            return this.createResponse(null, [track]);
        }
    }
    async stream(track) {
        var _a, _b;
        const args = this.buildArgs(track.url, "stream");
        const stream = (_a = this.ytdlp) === null || _a === void 0 ? void 0 : _a.execStream(args);
        if (!stream)
            throw new Error("[RadikoExtractor] Unable to get stream of track.");
        if (!this.activeStream)
            this.activeStream = new Set;
        (_b = this.activeStream) === null || _b === void 0 ? void 0 : _b.add(stream);
        stream.on("close", () => { var _a; return (_a = this.activeStream) === null || _a === void 0 ? void 0 : _a.delete(stream); });
        return stream;
    }
    async getRelatedTracks(track, history) {
        // return null for now > return latest stream station live stream in the future.
        return this.createResponse(null, []);
    }
}
exports.RadikoExtractor = RadikoExtractor;
RadikoExtractor.identifier = "radiko";
