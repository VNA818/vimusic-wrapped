let SQL = undefined;
let DB = undefined;

export const initParser = async () => {
    const config = {
        locateFile: filename => `./scripts/${filename}`
      }
    SQL = await initSqlJs(config);
}

export const parseDB = async (file) => {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = function() {
            const Uints = new Uint8Array(reader.result);
            DB = new SQL.Database(Uints);
            res();
        }
        reader.readAsArrayBuffer(file);
    })
}

const all = (stmt) => {
    const data = [];
    while (stmt.step()) {
        data.push(stmt.getAsObject());
    }
    return(data);
}

export const getData = (year = undefined) => {
    const db = DB;
    const data = {
        topArtists: [],
        topPlayed: [],
        topDay: {},
        totalTime: 0,
    };

    let start = new Date(0).getTime();
    let end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    end = end.getTime();
    if(year) {
        start = year.getTime();
        const endDate = new Date(year);
        endDate.setFullYear(year.getFullYear(), 11, 31);
        endDate.setHours(11, 59, 59, 59);
        end = endDate.getTime();

        const yearExists = db.prepare("SELECT Event.id FROM Event WHERE Event.timestamp >= $start AND Event.timestamp <= $end LIMIT 1;");
        yearExists.bind({ $start: start, $end: end });
        if(all(yearExists).length === 0) {
            return undefined;
        };
    }

    const topArtists = db.prepare("SELECT Artist.name, Artist.thumbnailUrl, SUM(Event.playTime) as totPlay FROM Event, Song, SongArtistMap, Artist WHERE Event.songId = Song.id AND SongArtistMap.songId = Song.id AND Artist.id = SongArtistMap.artistId AND Event.timestamp >= $start AND Event.timestamp <= $end GROUP BY Artist.name ORDER BY totPlay DESC LIMIT 5;");
    topArtists.bind({ $start: start, $end: end });
    data.topArtists = all(topArtists);

    if(year) {
        const topPlayed = db.prepare("SELECT Song.title, Song.thumbnailUrl, Song.artistsText, SUM(Event.playTime) as totalPlayTimeMs FROM Song, Event WHERE Event.songId = Song.id AND Event.timestamp >= $start AND Event.timestamp <= $end GROUP BY Song.id ORDER BY totalPlayTimeMs DESC LIMIT 5;");
        topPlayed.bind({ $start: start, $end: end });
        data.topPlayed = all(topPlayed);
    } else {
        const topPlayed = db.prepare("SELECT Song.title, Song.thumbnailUrl, Song.artistsText, Song.totalPlayTimeMs FROM Song ORDER BY Song.totalPlayTimeMs DESC LIMIT 5;");
        data.topPlayed = all(topPlayed);
    }

    if(year) {
        const totalTime = db.prepare("SELECT SUM(Event.playTime) as totPlay FROM Event WHERE Event.timestamp >= $start AND Event.timestamp <= $end;");
        totalTime.bind({ $start: start, $end: end });
        data.totalTime = all(totalTime)[0].totPlay;
    } else {
        const totalTime = db.prepare("SELECT SUM(Song.totalPlayTimeMs) as totPlay FROM Song;");
        data.totalTime = all(totalTime)[0].totPlay;
    }

    const events = db.prepare("SELECT Event.timestamp, Event.playTime FROM Event WHERE Event.timestamp >= $start AND Event.timestamp <= $end;");
    events.bind({ $start: start, $end: end });
    const dayPlaytime = {};
    let max = {
        day: "",
        val: 0
    };
    for(const event of all(events)) {
        const day = new Intl.DateTimeFormat("en", {
            dateStyle: "full",
          }).format(new Date(event.timestamp));
        dayPlaytime[day] = (dayPlaytime[day] ?? 0) + event.playTime;
        if(dayPlaytime[day] > max.val) {
            max.val = dayPlaytime[day];
            max.day = day;
        }
    }
    data.topDay = max;

    return data;
}

export const msToHours = (ms) => {
    return (ms / 3600000).toFixed(1);
}