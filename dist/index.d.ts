import { BaseExtractor, ExtractorExecutionContext, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, GuildQueueHistory, SearchQueryType, Track } from "discord-player";
export declare enum format {
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
export declare enum device {
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
    EXTERNAL = "xExternalWebStations"
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
    format?: format;
    /**
     * Device used to extract streams
     * @default aSmartPhone7a
     */
    device?: device;
    /**
     * Returns only results from key stations
     * @default false
     */
    key_station_only?: boolean;
    /**
     * Enabled streams that does not work with ffmpeg
     * @default false
     */
    no_stream_blacklist?: boolean;
    /**
     * Downloads stream as while (Will be slower)
     * @default false
     */
    no_as_live_chunks?: boolean;
}
export declare class RadikoExtractor extends BaseExtractor<RadikoExtractorOptions> {
    static identifier: string;
    private ytdlp;
    /** Reference to live streams to destroy on deactivate() */
    private activeStream;
    constructor(context: ExtractorExecutionContext, options?: RadikoExtractorOptions);
    private buildArgs;
    createBridgeQuery: (track: Track) => string;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null): Promise<boolean>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    stream(track: Track): Promise<ExtractorStreamable>;
    getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
}
