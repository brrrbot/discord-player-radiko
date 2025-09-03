
import { BaseExtractor, ExtractorExecutionContext, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, GuildQueueHistory, QueryType, SearchQueryType, Track } from "discord-player";
import { Readable } from "node:stream";
import YTDlpWrap from "yt-dlp-wrap";

enum format {
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

enum device {
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

    /** Precomputed args shared by handle() & stream() */
    // private baseArgs: string[] = [];
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
            args.push("-f", this.options.format ?? format.M4A);
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
        const player = this.context.player;
        const opts = this.options ?? {};

        // Register protocols
        this.protocols = ["radiko"];
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
        if (type && type !== QueryType.AUTO) return false;
        return /radiko\.jp/.test(query);
    }

    // This method is called when discord-player wants a search result
    async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        try {
            const args = this.buildArgs(query, "info");
            const result = await this.ytdlp.execPromise(args);
            const firstJson = result.split("\n")[0];
            const data = JSON.parse(firstJson);

            const track: Track = new Track(this.context.player, {
                title: data.title ?? "Unknown Stream",
                url: data.url ?? query,
                author: data.uploader ?? "Radiko",
                duration: data.is_live ? 0 : (data.duration ?? 0).toString(),
                live: data.is_live ?? true,
                thumbnail: data.thumbnail ?? null,
                requestedBy: typeof context.requestedBy === "string" ? null : context.requestedBy,
                description: data.description ?? "",
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