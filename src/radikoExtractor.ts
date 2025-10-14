import { BaseExtractor, ExtractorInfo, ExtractorSearchContext, ExtractorStreamable, GuildQueueHistory, SearchQueryType, Track, TrackSource } from "discord-player";
import { execSync } from "node:child_process";
import { Readable } from "node:stream";
import YTDlpWrap from "yt-dlp-wrap";

export enum format {
    BESTAUDIO = "bestaudio",
    M4A = ".m4a",
    WEBM = ".webm",
    TS = ".ts",
}

export enum device {
    PC_HTML5 = "pc_html5",
    aSmartPhone5 = "aSmartPhone5",
    aSmartPhone6 = "aSmartPhone6",
    aSmartPhone6a = "aSmartPhone6a",
    aSmartPhone7 = "aSmartPhone7",
    aSmartPhone7a = "aSmartPhone7a",
    PC_1 = "pc_1",
    MobileWebTrial = "MobileWebTrial",
    aSmartPhone8 = "aSmartPhone8",
    EXTERNAL = "xExternalWebStations",
}

export interface RadikoExtractorOptions {
    usePip?: boolean;
    ytdlpPath?: string;
    format: format;
    device?: device;
    key_station_only?: boolean;
}

export class RadikoExtractor extends BaseExtractor<RadikoExtractorOptions> {
    public static identifier: string = "radiko";

    private ytdlp: YTDlpWrap | null = null;
    private activeStream: Set<Readable> | null = null;

    private buildArgs(url: string, mode: "info" | "stream"): string[] {
        const args: string[] = [url];

        if (mode === "info") {
            args.push(
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

        if (this.options?.device) args.push("--extractor-args", `rajiko:device=${this.options.device}`);
        if (this.options?.key_station_only) args.push("--extractor-args", "rajiko:key_station_only");

        return args;
    }

    public createBridgeQuery = (track: Track) => `${track.title} by ${track.author} official audio`;

    async activate(): Promise<void> {
        try {
            const ytdlpBinary = this.options?.usePip ? "yt-dlp" : (this.options.ytdlpPath ?? "yt-dlp");
            this.ytdlp = new YTDlpWrap(ytdlpBinary);
            this.protocols = ["radiko", "radiko_live"];

            try {
                const output = execSync("pip show yt-dlp-rajiko").toString().trim();
                if (!output) console.warn("yt-dlp-rajiko is not installed");
            } catch {
                console.warn("yt-dlp-rajiko does not appear to be installed.");
            }
        } catch (error) {
            console.error("[RadikoExtractor] Error while registering RadikoExtractor: ", error);
            throw error;
        }
    }

    async deactivate(): Promise<void> {
        this.protocols = [];
        
        if (this.activeStream) {
            for (const s of this.activeStream) {
                try { s.destroy() } catch { };
            }
        }
        this.activeStream?.clear();
    }

    async validate(query: string, type?: SearchQueryType | null): Promise<boolean> {
        if (typeof query !== "string") return false;
        return /radiko\.jp/.test(query);
    }

    async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        const isRadikoUrl = /radiko.jp\./.test(query);

        if (context.protocol === "radiko_live") {
            const url = `https://radiko.jp/#${query}`;
            const args = this.buildArgs(url, "info");

            const result = await this.ytdlp?.execPromise(args);
            if (!result) throw new Error("[RadikoExtractor] Failed to find Radiko stream.");

            const data = JSON.parse(result.split("\n")[0]);
            if (!data) throw new Error("[RadikoExtractor] Failed to get stream information.");

            const track: Track = new Track(this.context.player, {
                title: data.title ?? "UNKNOWN TITLE",
                author: data.author ?? "UNKNOWN AUTHOR",
                description: data.description ?? "UNKNOWN DESCRIPTION",
                url: data.original_url,
                duration: "LIVE",
                live: data.is_live,
                thumbnail: data.thumbnail ?? null,
                requestedBy: context.requestedBy ?? null,
                source: "radiko" as TrackSource,
            });

            return this.createResponse(null, [track]);
        }

        if (isRadikoUrl) {
            const args = this.buildArgs(query, "info");

            const result = await this.ytdlp?.execPromise(args);
            if (!result) throw new Error("[RadikoExtractor] Failed to find Radiko stream.");

            const data = JSON.parse(result.split("\n")[0]);
            if (!data) throw new Error("[RadikoExtractor] Failed to get stream information.");

            const track: Track = new Track(this.context.player, {
                title: data.title ?? "UNKNOWN TITLE",
                author: data.author ?? "UNKNOWN AUTHOR",
                description: data.description ?? "UNKNOWN DESCRIPTION",
                url: query,
                duration: ((data.duration ?? 0) * 1000).toString() ?? "UNKNOWN DURATION",
                live: data.is_live,
                thumbnail: data.thumbnail ?? null,
                requestedBy: context.requestedBy ?? null,
                source: "radiko" as TrackSource,
            });

            return this.createResponse(null, [track]);
        } else {
            const url = `https://radiko.jp/#!/search/live?key=${query}&filter=past`;
            const args = this.buildArgs(url, "info");

            const result = await this.ytdlp?.execPromise(args);
            if (!result) throw new Error("[RadikoExtractor] Failed to find Radiko stream.");

            const data = JSON.parse(result.split("\n")[0]).entries[0];
            if (!data) throw new Error("[RadikoExtractor] Failed to get stream information.");

            const track: Track = new Track(this.context.player, {
                title: data.title ?? "UNKNOWN TITLE",
                author: data.author ?? "UNKNOWN AUTHOR",
                description: data.description ?? "UNKNOWN DESCRIPTION",
                url: data.original_url,
                duration: ((data.duration ?? 0) * 1000).toString() ?? "UNKNOWN DURATION",
                live: data.is_live,
                thumbnail: data.thumbnail ?? null,
                requestedBy: context.requestedBy ?? null,
                source: "radiko" as TrackSource,
            });

            return this.createResponse(null, [track]);
        }
    }

    async stream(track: Track): Promise<ExtractorStreamable> {
        const args = this.buildArgs(track.url, "stream");

        const stream = this.ytdlp?.execStream(args);
        if (!stream) throw new Error("[RadikoExtractor] Unable to get stream of track.");

        if (!this.activeStream) this.activeStream = new Set<Readable>;
        this.activeStream?.add(stream);
        stream.on("close", () => this.activeStream?.delete(stream));

        return stream;
    }

    async getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo> {
        // return null for now > return latest stream station live stream in the future.
        return this.createResponse(null, []);
    }
}