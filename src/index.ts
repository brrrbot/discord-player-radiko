import { BaseExtractor, ExtractorExecutionContext, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, GuildQueueHistory, QueryType, SearchQueryType, Track, TrackSource } from "discord-player";
import { execSync } from "node:child_process";
import { Readable } from "node:stream";
import YTDlpWrap from "yt-dlp-wrap";

export enum format {
    /** Best audio option available */
    BESTAUDIO = "bestaudio",
    /** AAC in MP4 container, most commonly used */
    M4A = ".m4a",
    /** Lightweight and efficient format */
    WEBM = ".webm",
    /** Not native format, but can be re-encoded by yt-dlp */
    MP3 = ".mp3",
    /** HLS playlists */
    M3U8 = ".m3u8",
    /** Segments (for radio/TV-like streams, very common for Radiko) */
    TS = ".ts",
    /** MPEG-DASH manifest with seperate audio/video tracks */
    DASH = ".dash"
}

export enum device {
    /** Website with every stream provider */
    PC_HTML5 = "pc_html5",
    /** Old mobile app */
    aSmartPhone5 = "aSmartPhone5",
    /** Old mobile app */
    aSmartPhone6 = "aSmartPhone6",
    /** Old mobile app */
    aSmartPhone6a = "aSmartPhone6a",
    /** Old mobile app */
    aSmartPhone7 = "aSmartPhone7",
    /** Old mobile app */
    aSmartPhone7a = "aSmartPhone7a",
    /** Old website */
    PC_1 = "pc_1",
    /** Current mobile site */
    MobileWebTrial = "MobileWebTrial",
    /** Current mobile app */
    aSmartPhone8 = "aSmartPhone8",
    /** Embedded players on stations' websites */
    EXTERNAL = "xExternalWebStations",
}

/** Optional configs for RadikoExtractors */
export interface RadikoExtractorOptions {
    /** 
     * Option to use pip install yt-dlp & yt-dlp-rajiko. 
     * If omitted, use yt-dlp.exe
     */
    usePip?: boolean;

    /** 
     * Path to yt-dlp.
     * @default yt-dlp (System PATH)
     */
    ytdlpPath?: string;

    /**
     * Audio formats to use.
     * @default bestaudio The best audio format available
     */
    format?: format,

    /**
     * Device used to extract streams
     * @default aSmartPhone7a
     */
    device?: device;

    /** 
     * Returns only results from key stations
     * @default false
     */
    key_station_only?: boolean,

    /**
     * Enabled streams that does not work with ffmpeg
     * @default false
     */
    no_stream_blacklist?: boolean,

    /**
     * Downloads stream as while (Will be slower)
     * @default false
     */
    no_as_live_chunks?: boolean,
}

export class RadikoExtractor extends BaseExtractor<RadikoExtractorOptions> {
    public static identifier: string = "radiko";
    private ytdlp: YTDlpWrap;

    /** Reference to live streams to destroy on deactivate() */
    private activeStream = new Set<Readable>();

    // Constructor for config options
    constructor(context: ExtractorExecutionContext, options?: RadikoExtractorOptions) {
        super(context, options);
        this.ytdlp = new YTDlpWrap(this.options?.ytdlpPath);
    }

    private buildArgs(url: string, mode: "info" | "stream" = "info"): string[] {
        const args: string[] = [url];

        if (mode === "info") {
            args.push(
                url,
                "-J",
                "-N", "30",
                "--embed-metadata",
                "--embed-thumbnail",
                "-o", "%(title)s %(timestamp+32400>%Y-%m-%d_%H%M)s [%(id)s].%(ext)s",
            );
        }

        if (mode === "stream") {
            args.push("-f", this.options.format ?? format.BESTAUDIO);
            args.push("-o", "-")
        }

        // Add user options if provided
        if (this.options?.device) args.push("--extractor-args", `rajiko:device=${this.options.device}`);
        if (this.options?.key_station_only) args.push("--extractor-args", "rajiko:key_station_only");
        if (this.options?.no_as_live_chunks) args.push("--extractor-args", "rajiko:no_as_live_chunks");
        if (this.options?.no_stream_blacklist) args.push("--extractor-args", "rajiko:no_stream_blacklist");

        return args;
    }

    public createBridgeQuery = (track: Track) =>
        `${track.title} by ${track.author} official audio`;

    // This method is called when extractor is loaded into discord-player's registry
    async activate(): Promise<void> {
        try {
            const ytdlpBinary = this.options.usePip ? "yt-dlp" : (this.options.ytdlpPath ?? "yt-dlp");
            this.ytdlp = new YTDlpWrap(ytdlpBinary);
            execSync(`${ytdlpBinary} --version`, { stdio: "ignore" });
            try {
                const output = execSync("pip show yt-dlp-rajiko").toString().trim();
                if (output) {
                    console.log("yt-dlp-rajiko is installed");
                } else {
                    console.warn("yt-dlp-rajiko is not installed");
                }
            } catch {
                console.warn("yt-dlp-rajiko does not appear to be installed. Some Radiko streams may fail.");
            }
            console.log(`Using yt-dlp binary: ${ytdlpBinary}`);
        } catch (err) {
            console.error("yt-dlp is not installed or not found in PATH. Please install it.");
            throw err;
        }

        // Register protocols
        this.protocols = ["radiko", "radiko_live"];
    }

    // This method is called when extractor is remove from discord-player's registry
    async deactivate(): Promise<void> {
        this.protocols = [];
        for (const s of this.activeStream) {
            try { s.destroy(); } catch { }
        }
        this.activeStream.clear();
    }

    // This method is called when discord-player wants metadata, return false to direct to another extractor
    async validate(query: string, type?: SearchQueryType | null): Promise<boolean> {
        const isRadikoUrl = /radiko\.jp/.test(query);
        if (isRadikoUrl) return true;

        // Technically we do not need this
        if (type === this.identifier || type === `ext:${this.identifier}`) {
            return true;
        }

        if (type === QueryType.AUTO) return false // Technically we do not need this too

        return false;
    }

    // This method is called when discord-player wants a search result
    async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        if (!context.protocol) context.protocol = "radiko";
        const isRadikoUrl = /radiko\.jp/.test(query);

        if (context.protocol === "radiko_live") {
            try {
                const url = `https://radiko.jp/#${query}`;
                const args = this.buildArgs(url, "info");
                const result = await this.ytdlp.execPromise(args);
                const data = JSON.parse(result);

                const track: Track = new Track(this.context.player, {
                    source: this.identifier as TrackSource,
                    title: data.title ?? "Unknown Stream",
                    url: data.original_url,
                    author: data.uploader ?? "Radiko",
                    duration: "Live",
                    live: data.is_live ?? true,
                    thumbnail: data.thumbnail ?? null,
                    requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                    description: data.description ?? "",
                });
                return {
                    playlist: null,
                    tracks: [track],
                };
            } catch (error) {
                console.error("Error while getting Livestream: ", error);
            }
        }

        try {
            if (isRadikoUrl) {
                const args = this.buildArgs(query, "info");
                const result = await this.ytdlp.execPromise(args);
                const firstJson = result.split("\n")[0];
                const data = JSON.parse(firstJson);

                const track: Track = new Track(this.context.player, {
                    source: this.identifier as TrackSource,
                    title: data.title ?? "Unknown Stream",
                    url: query,
                    author: data.uploader ?? "Radiko",
                    duration: data.is_live ? "Live" : `${data.duration / 60} mins`,
                    live: data.is_live ?? true,
                    thumbnail: data.thumbnail ?? null,
                    requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                    description: data.description ?? "",
                });
                return {
                    playlist: null,
                    tracks: [track],
                };
            } else {
                const url = `https://radiko.jp/#!/search/live?key=${query}&filter=past`;
                const args = this.buildArgs(url, "info");
                const result = await this.ytdlp.execPromise(args);
                const resultJson = JSON.parse(result.split("\n")[0]);
                const data = resultJson.entries[0];

                const track: Track = new Track(this.context.player, {
                    source: this.identifier as TrackSource,
                    title: data.title ?? "Unknown Stream",
                    url: data.original_url,
                    author: data.uploader ?? "Radiko",
                    duration: `${data.duration / 60} mins`,
                    live: data.is_live ?? true,
                    thumbnail: data.thumbnail ?? null,
                    requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                    description: data.description ?? "",
                });
                return {
                    playlist: null,
                    tracks: [track],
                };
            }
        } catch (error) {
            console.error("Error retrieving data from Radiko: ", error);
            return {
                playlist: null,
                tracks: [],
            }
        }
    }

    // This method is called when discord-player wants to stream a track
    async stream(track: Track): Promise<ExtractorStreamable> {
        const args = this.buildArgs(track.url, "stream");
        const stream = this.ytdlp.execStream(args);
        this.activeStream.add(stream);
        stream.on("close", () => this.activeStream.delete(stream));

        return {
            stream,
            $fmt: "arbitrary",
        }
    }

    // This method is called to get tracks for autoplay mode
    async getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo> {
        // Return null for now as Radiko doesnt expose "related" tracks
        return { playlist: null, tracks: [] };
    }
}