"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yt_dlp_wrap_1 = __importDefault(require("yt-dlp-wrap"));
const ytdlp = new yt_dlp_wrap_1.default();
/**
 * Function to get information of Radiko stream
 * @param url URL to Radiko stream
 * @returns Information on stream in JSON format
 */
async function getRadikoInfo(url) {
    try {
        const result = await ytdlp.execPromise([url, "-J"]);
        const data = JSON.parse(result);
        console.log(data);
    }
    catch (error) {
        console.error("yt-dlp error: ", error);
    }
}
getRadikoInfo("https://radiko.jp/#!/ts/QRR/20250827013000");
