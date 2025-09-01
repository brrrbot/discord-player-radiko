"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_player_1 = require("discord-player");
class RadikoExtractor extends discord_player_1.BaseExtractor {
    constructor() {
        super(...arguments);
        this.createBridgeQuery = (track) => `${track.title} by ${track.author} official audio`;
    }
    // This method is called when extractor is loaded into discord-player's registry
    async activate() {
    }
    // This method is called when extractor is remove from discord-player's registry
    async deactivate() {
    }
    // This method is called when discord-player wants metadata, return false to direct to another extractor
    async validate(query, type) {
        return false;
    }
    // This method is called when discord-player wants a search result
    async handle(query, context) {
    }
    // This method is called when discord-player wants to stream a track
    async stream(info) {
    }
    // This method is called to get tracks for autoplay mode
    async getRelatedTracks(track, history) {
    }
}
RadikoExtractor.identifier = "radiko"; // Unique ID for extractor
