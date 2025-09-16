# Discord Player Radiko
```
# Im writing it like this because i like it c:

# Installation:
npm i discord-player-radiko

# Usage: (also import device & format if you plan to have custom options)
import { RadikoExtractor } from "discord-player-radiko";
or
const { RadikoExtractor } = require "discord-player-radiko";

register the extractor:
player.extractors.register(RadikoExtractor, {...options});

# Configuration Options
| Option                | Type      | Default         | Description                                         |
| --------------------- | --------- | --------------- | --------------------------------------------------- |
| `usePip`              | `boolean` | false           | Use pip-installed `yt-dlp` instead of system binary |
| `ytdlpPath`           | `string`  | "yt-dlp"        | Path to yt-dlp binary                               |
| `format`              | `format`  | bestaudio       | Preferred audio format                              |
| `device`              | `device`  | aSmartPhone7a   | Device emulation for stream extraction              |
| `key_station_only`    | `boolean` | false           | Restrict results to key stations                    |
| `no_stream_blacklist` | `boolean` | false           | Enable streams that may not work with ffmpeg        |
| `no_as_live_chunks`   | `boolean` | false           | Download streams while playing (slower)             |

# Supported Protocols
radikoSearchByKeyWords – Search by keywords
radikoSearchByUrl – Search directly via Radiko URL

Note:
please ensure that you have yt-dlp and yt-dlp-rajiko installed
```
