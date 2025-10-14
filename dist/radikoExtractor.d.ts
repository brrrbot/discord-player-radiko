import { BaseExtractor, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, GuildQueueHistory, SearchQueryType, Track } from "discord-player";
export declare enum format {
    BESTAUDIO = "bestaudio",
    M4A = ".m4a",
    WEBM = ".webm",
    TS = ".ts"
}
export declare enum device {
    PC_HTML5 = "pc_html5",
    aSmartPhone5 = "aSmartPhone5",
    aSmartPhone6 = "aSmartPhone6",
    aSmartPhone6a = "aSmartPhone6a",
    aSmartPhone7 = "aSmartPhone7",
    aSmartPhone7a = "aSmartPhone7a",
    PC_1 = "pc_1",
    MobileWebTrial = "MobileWebTrial",
    aSmartPhone8 = "aSmartPhone8",
    EXTERNAL = "xExternalWebStations"
}
export interface RadikoExtractorOptions {
    usePip?: boolean;
    ytdlpPath?: string;
    format: format;
    device?: device;
    key_station_only?: boolean;
}
export declare class RadikoExtractor extends BaseExtractor<RadikoExtractorOptions> {
    static identifier: string;
    private ytdlp;
    private activeStream;
    private buildArgs;
    createBridgeQuery: (track: Track) => string;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string, type?: SearchQueryType | null): Promise<boolean>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    stream(track: Track): Promise<ExtractorStreamable>;
    getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo>;
}
